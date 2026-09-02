package pdfconv

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/xuri/excelize/v2"
)

// Converter xlsx → pdf 转换器接口
type Converter interface {
	Convert(ctx context.Context, xlsxPath string) (pdfPath string, err error)
	Available() bool
}

type BatchConverter interface {
	ConvertMany(ctx context.Context, xlsxPaths []string) ([]string, error)
}

// LibreOfficeConverter 通过 LibreOffice headless 将 xlsx 转换为 pdf。
// 转换仍使用 soffice --convert-to pdf（导出参数不变）；UserInstallation 目录复用，
// 并按次数回收 profile、对排队做背压，避免内存泄漏与全员超时。
type LibreOfficeConverter struct {
	bin                  string
	timeout              time.Duration
	profileOnce          sync.Once
	pool                 *profilePool
	profileErr           error
	cacheFingerprintOnce sync.Once
	cacheFingerprint     string
}

type fontSubstitutionPair struct {
	ReplaceFont    string
	SubstituteFont string
	OnScreenOnly   bool
	Always         bool
}

const (
	// 生产环境可通过以下环境变量显式锁定模板关键字体，避免跨环境随机回退导致版式漂移。
	envLibreOfficePreferredSongtiFont  = "LIBREOFFICE_PREFERRED_SONGTI_FONT"
	envLibreOfficePreferredHeiFont     = "LIBREOFFICE_PREFERRED_HEI_FONT"
	envLibreOfficePreferredTimesFont   = "LIBREOFFICE_PREFERRED_TIMES_FONT"
	envLibreOfficePreferredCalibriFont = "LIBREOFFICE_PREFERRED_CALIBRI_FONT"
)

func NewLibreOfficeConverter(bin string, timeout time.Duration) *LibreOfficeConverter {
	bin = resolveLibreOfficeBin(bin)
	if timeout <= 0 {
		timeout = 10 * time.Minute
	}
	ensureTemplateOriginalFontsInstalled()
	c := &LibreOfficeConverter{bin: bin, timeout: timeout}
	c.warmUpProfiles()
	return c
}

// CacheFingerprint 返回影响 LibreOffice 排版输出的运行时指纹。
// 该值用于上层 PDF 缓存键，避免线上字体环境变化后仍命中旧缓存。
func (c *LibreOfficeConverter) CacheFingerprint() string {
	if c == nil {
		return ""
	}
	c.cacheFingerprintOnce.Do(func() {
		c.cacheFingerprint = buildLibreOfficeCacheFingerprint(c.bin)
	})
	return c.cacheFingerprint
}

func resolveLibreOfficeBin(bin string) string {
	bin = strings.TrimSpace(bin)
	if bin == "" {
		bin = "libreoffice"
	}
	if _, err := exec.LookPath(bin); err == nil {
		return bin
	}
	// macOS Homebrew commonly exposes LibreOffice as `soffice` rather than
	// `libreoffice`; keep explicit custom paths untouched, but make the default
	// local development setup work out of the box.
	if bin == "libreoffice" {
		for _, candidate := range []string{
			"soffice",
			"/Applications/LibreOffice.app/Contents/MacOS/soffice",
			"/opt/homebrew/bin/soffice",
			"/usr/local/bin/soffice",
		} {
			if filepath.IsAbs(candidate) {
				if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
					return candidate
				}
				continue
			}
			if _, err := exec.LookPath(candidate); err == nil {
				return candidate
			}
		}
	}
	return bin
}

func (c *LibreOfficeConverter) Convert(ctx context.Context, xlsxPath string) (string, error) {
	paths, err := c.ConvertMany(ctx, []string{xlsxPath})
	if err != nil {
		return "", err
	}
	if len(paths) != 1 {
		return "", fmt.Errorf("libreoffice convert returned %d files, want 1", len(paths))
	}
	return paths[0], nil
}

// NormalizeXLSX 通过 LibreOffice 重新保存 xlsx，修正部分 Excelize 可读但 Microsoft Excel 不打开的包结构。
func (c *LibreOfficeConverter) NormalizeXLSX(ctx context.Context, xlsxPath string, outDir string) (string, error) {
	absPath, err := filepath.Abs(xlsxPath)
	if err != nil {
		return "", fmt.Errorf("resolve path: %w", err)
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return "", fmt.Errorf("create normalize output dir: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, c.convertTimeout([]string{absPath}))
	defer cancel()

	userInstDir, releaseProfile, err := c.acquireProfile(ctx)
	if err != nil {
		return "", err
	}
	defer releaseProfile()

	args := []string{
		"--headless",
		"--norestore",
		"--nolockcheck",
		"--nofirststartwizard",
		"--convert-to", "xlsx",
		"--outdir", outDir,
		fmt.Sprintf("-env:UserInstallation=file://%s", userInstDir),
		absPath,
	}
	convertStart := time.Now()
	output, err := c.runLibreOfficeCommand(ctx, args, libreOfficeCommandEnv())
	if err != nil {
		if strings.TrimSpace(os.Getenv("HOME")) != "" {
			legacyOutput, legacyErr := c.runLibreOfficeCommand(ctx, args, libreOfficeLegacyTmpHomeEnv())
			if legacyErr == nil {
				output = legacyOutput
				err = nil
			} else {
				return "", fmt.Errorf("libreoffice normalize failed: primary output=%s; legacy output=%s; primary err=%w; legacy err=%v",
					string(output), string(legacyOutput), err, legacyErr)
			}
		} else {
			return "", fmt.Errorf("libreoffice normalize failed: %w, output: %s", err, string(output))
		}
	}
	log.Printf("pdfconv: libreoffice normalize ok duration_ms=%d", time.Since(convertStart).Milliseconds())

	baseName := strings.TrimSuffix(filepath.Base(absPath), filepath.Ext(absPath))
	outPath := filepath.Join(outDir, baseName+".xlsx")
	if _, err := os.Stat(outPath); err != nil {
		return "", fmt.Errorf("normalized xlsx output not found at %s: %w", outPath, err)
	}
	return outPath, nil
}

func (c *LibreOfficeConverter) ConvertMany(ctx context.Context, xlsxPaths []string) ([]string, error) {
	if len(xlsxPaths) == 0 {
		return nil, nil
	}
	absPaths := make([]string, 0, len(xlsxPaths))
	outDir := ""
	for _, xlsxPath := range xlsxPaths {
		absPath, err := filepath.Abs(xlsxPath)
		if err != nil {
			return nil, fmt.Errorf("resolve path: %w", err)
		}
		if outDir == "" {
			outDir = filepath.Dir(absPath)
		} else if filepath.Dir(absPath) != outDir {
			return nil, fmt.Errorf("libreoffice batch convert requires same output directory")
		}
		absPaths = append(absPaths, absPath)
	}

	ctx, cancel := context.WithTimeout(ctx, c.convertTimeout(absPaths))
	defer cancel()

	userInstDir, releaseProfile, err := c.acquireProfile(ctx)
	if err != nil {
		return nil, err
	}
	defer releaseProfile()

	args := []string{
		"--headless",
		"--norestore",
		"--nolockcheck",
		"--nofirststartwizard",
		"--convert-to", "pdf",
		"--outdir", outDir,
		fmt.Sprintf("-env:UserInstallation=file://%s", userInstDir),
	}
	args = append(args, absPaths...)
	convertStart := time.Now()
	output, err := c.runLibreOfficeCommand(ctx, args, libreOfficeCommandEnv())
	if err != nil {
		cleanupConvertedPDFOutputs(absPaths, outDir)
		// 兼容兜底：保留用户 HOME（用于读取字体）失败时，回退到历史 HOME=/tmp 方案，避免影响旧部署。
		if strings.TrimSpace(os.Getenv("HOME")) != "" {
			legacyOutput, legacyErr := c.runLibreOfficeCommand(ctx, args, libreOfficeLegacyTmpHomeEnv())
			if legacyErr == nil {
				output = legacyOutput
				err = nil
			} else {
				cleanupConvertedPDFOutputs(absPaths, outDir)
				log.Printf("pdfconv: libreoffice convert failed files=%d duration_ms=%d err=%v",
					len(absPaths), time.Since(convertStart).Milliseconds(), err)
				return nil, fmt.Errorf("libreoffice convert failed: primary output=%s; legacy output=%s; primary err=%w; legacy err=%v",
					string(output), string(legacyOutput), err, legacyErr)
			}
		} else {
			log.Printf("pdfconv: libreoffice convert failed files=%d duration_ms=%d err=%v",
				len(absPaths), time.Since(convertStart).Milliseconds(), err)
			return nil, fmt.Errorf("libreoffice convert failed: %w, output: %s", err, string(output))
		}
	}
	log.Printf("pdfconv: libreoffice convert ok files=%d duration_ms=%d",
		len(absPaths), time.Since(convertStart).Milliseconds())

	pdfPaths := make([]string, 0, len(absPaths))
	for _, absPath := range absPaths {
		baseName := strings.TrimSuffix(filepath.Base(absPath), filepath.Ext(absPath))
		pdfPath := filepath.Join(outDir, baseName+".pdf")
		if _, err := os.Stat(pdfPath); err != nil {
			return nil, fmt.Errorf("pdf output not found at %s: %w", pdfPath, err)
		}
		pdfPaths = append(pdfPaths, pdfPath)
	}

	return pdfPaths, nil
}

func (c *LibreOfficeConverter) runLibreOfficeCommand(ctx context.Context, args []string, env []string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, c.bin, args...)
	cmd.Env = env
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		if cmd.Process != nil {
			return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		}
		return nil
	}
	return cmd.CombinedOutput()
}

func cleanupConvertedPDFOutputs(absPaths []string, outDir string) {
	for _, absPath := range absPaths {
		baseName := strings.TrimSuffix(filepath.Base(absPath), filepath.Ext(absPath))
		_ = os.Remove(filepath.Join(outDir, baseName+".pdf"))
	}
}

func (c *LibreOfficeConverter) convertTimeout(absPaths []string) time.Duration {
	timeout := c.timeout
	if len(absPaths) > 1 {
		timeout += time.Duration(len(absPaths)-1) * 90 * time.Second
	}
	var totalBytes int64
	for _, p := range absPaths {
		if st, err := os.Stat(p); err == nil {
			totalBytes += st.Size()
		}
	}
	if totalBytes > 0 {
		// 大文件按体积增加容忍时间，避免超大 PDF 任务在 LibreOffice 阶段被过早超时中断。
		extraBySize := (totalBytes / (20 * 1024 * 1024)) * int64(time.Minute)
		timeout += time.Duration(extraBySize)
	}
	if timeout < c.timeout {
		return c.timeout
	}
	return timeout
}

func (c *LibreOfficeConverter) acquireProfile(ctx context.Context) (string, func(), error) {
	c.profileOnce.Do(func() {
		poolSize := resolveProfilePoolSize()
		restartAfter := resolveLibreOfficeRestartAfter()
		maxQueue := resolveLibreOfficeMaxQueueSize(poolSize)
		baseDir := filepath.Join(os.TempDir(), fmt.Sprintf("lims-lo-profile-%d", os.Getpid()))
		pool, err := newProfilePool(profilePoolConfig{
			Size:         poolSize,
			BaseDir:      baseDir,
			RestartAfter: restartAfter,
			MaxQueueSize: maxQueue,
			// 使用独立用户配置目录；字体替换规则与改造前一致，不改变 PDF 导出内容。
			Prepare: func(dir string) error {
				if err := os.MkdirAll(dir, 0o755); err != nil {
					return err
				}
				writeFontSubstitution(dir)
				return nil
			},
		})
		if err != nil {
			c.profileErr = err
			return
		}
		c.pool = pool
		log.Printf("pdfconv: LibreOffice profile pool ready size=%d restart_after=%d max_queue=%d",
			poolSize, restartAfter, maxQueue)
	})
	if c.profileErr != nil {
		return "", nil, c.profileErr
	}
	if c.pool == nil {
		return "", nil, fmt.Errorf("LibreOffice 配置池未初始化")
	}
	slot, wait, err := acquireProfileTimed(ctx, c.pool)
	if err != nil {
		if errors.Is(err, ErrLibreOfficeQueueFull) {
			log.Printf("pdfconv: libreoffice queue full waiting=%dms", wait.Milliseconds())
		}
		return "", nil, err
	}
	if wait > 50*time.Millisecond {
		log.Printf("pdfconv: libreoffice profile queue_wait_ms=%d", wait.Milliseconds())
	}
	return slot.dir, func() { c.pool.Release(slot) }, nil
}

func resolveProfilePoolSize() int {
	if raw := strings.TrimSpace(os.Getenv("LIBREOFFICE_PROFILE_POOL_SIZE")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			if n > 16 {
				return 16
			}
			return n
		}
	}
	n := runtime.NumCPU() / 2
	if n < 2 {
		return 2
	}
	if n > 8 {
		return 8
	}
	return n
}

func (c *LibreOfficeConverter) warmUpProfiles() {
	if !c.Available() {
		return
	}
	tmpDir, err := os.MkdirTemp("", "lims-lo-warm-*")
	if err != nil {
		return
	}
	defer os.RemoveAll(tmpDir)

	for i := 0; i < 2; i++ {
		f := excelize.NewFile()
		if err := f.SetCellValue("Sheet1", "A1", "warmup"); err != nil {
			_ = f.Close()
			return
		}
		xlsxPath := filepath.Join(tmpDir, fmt.Sprintf("warmup_%d.xlsx", i))
		if err := f.SaveAs(xlsxPath); err != nil {
			_ = f.Close()
			return
		}
		_ = f.Close()
		ctx, cancel := context.WithTimeout(context.Background(), c.timeout)
		_, _ = c.Convert(ctx, xlsxPath)
		cancel()
	}
}

func libreOfficeCommandEnv() []string {
	env := os.Environ()
	if extraFontPath := strings.TrimSpace(strings.Join(discoverAdditionalLibreOfficeFontDirs(), string(os.PathListSeparator))); extraFontPath != "" {
		env = mergePathListEnv(env, "SAL_FONTPATH", extraFontPath)
	}
	// 保留当前 HOME，确保 LibreOffice 可读取用户字体目录（如 macOS 的 ~/Library/Fonts）。
	// 仅在 HOME 缺失时回退到临时目录，避免在极简容器环境中启动失败。
	if strings.TrimSpace(os.Getenv("HOME")) != "" {
		return env
	}
	return libreOfficeLegacyTmpHomeEnv()
}

func libreOfficeLegacyTmpHomeEnv() []string {
	env := os.Environ()
	if extraFontPath := strings.TrimSpace(strings.Join(discoverAdditionalLibreOfficeFontDirs(), string(os.PathListSeparator))); extraFontPath != "" {
		env = mergePathListEnv(env, "SAL_FONTPATH", extraFontPath)
	}
	return mergeKVEnv(env, "HOME", os.TempDir())
}

func writeFontSubstitution(profileDir string) {
	pairs := buildDefaultFontSubstitutionPairs()
	if len(pairs) == 0 {
		return
	}
	userDir := filepath.Join(profileDir, "user")
	if err := os.MkdirAll(userDir, 0o755); err != nil {
		return
	}
	content := buildFontSubstitutionRegistryContent(pairs)
	_ = os.WriteFile(filepath.Join(userDir, "registrymodifications.xcu"), []byte(content), 0o644)
}

func buildDefaultFontSubstitutionPairs() []fontSubstitutionPair {
	out := make([]fontSubstitutionPair, 0, 20)

	// 证书模板主用「宋体」「黑体」「Times New Roman」。
	// 对「宋体」族别名始终显式绑定到优先字体（优先 SimSun），避免 LibreOffice 在不同环境回退到 Arial Unicode MS 等字重偏差字体。
	if songtiTarget := resolveSongtiPreferredFont(); songtiTarget != "" {
		out = appendAlwaysFontSubstitutionPairs(out, songtiTarget, []string{
			"宋体", "宋体-简", "Songti SC", "华文宋体", "SimSun", "NSimSun", "Arial Unicode MS",
		})
	}

	if heiTarget := resolveHeiPreferredFont(); heiTarget != "" {
		out = appendAlwaysFontSubstitutionPairs(out, heiTarget, []string{
			"黑体", "SimHei", "Microsoft YaHei", "微软雅黑", "Heiti SC", "STHeiti",
		})
	}

	if timesTarget := resolveTimesPreferredFont(); timesTarget != "" {
		out = appendAlwaysFontSubstitutionPairs(out, timesTarget, []string{
			"Times New Roman", "TimesNewRomanPSMT", "Times New Roman PS", "Times",
		})
	}

	// Calibri → Carlito（等宽）或 Liberation Sans。
	// 模版英文正文常用 Calibri；Carlito 是专为 Calibri 等宽设计的开源字体，
	// 字符宽度完全一致，不会导致英文折行或 ShrinkToFit 极小字问题。
	if calibriTarget := resolveCalibriPreferredFont(); calibriTarget != "" {
		out = appendAlwaysFontSubstitutionPairs(out, calibriTarget, []string{
			"Calibri", "Calibri Regular",
		})
	}

	// Arial → Liberation Sans（等宽）。Arial 与 Calibri 度量不同，需分别映射，
	// 避免 Arial → Carlito 产生视觉差异。
	if arialTarget := resolveArialPreferredFont(); arialTarget != "" {
		out = appendAlwaysFontSubstitutionPairs(out, arialTarget, []string{
			"Arial", "ArialMT",
		})
	}

	return dedupeFontSubstitutionPairs(out)
}

func appendAlwaysFontSubstitutionPairs(
	out []fontSubstitutionPair,
	substituteFont string,
	replaceFonts []string,
) []fontSubstitutionPair {
	substituteFont = strings.TrimSpace(substituteFont)
	if substituteFont == "" {
		return out
	}
	for _, src := range replaceFonts {
		src = strings.TrimSpace(src)
		if src == "" || strings.EqualFold(src, substituteFont) {
			continue
		}
		out = append(out, fontSubstitutionPair{
			ReplaceFont:    src,
			SubstituteFont: substituteFont,
			OnScreenOnly:   false,
			Always:         true,
		})
	}
	return out
}

func preferredFontNameFromEnv(envKey string) string {
	return strings.TrimSpace(os.Getenv(envKey))
}

func resolveSongtiPreferredFont() string {
	if preferred := preferredFontNameFromEnv(envLibreOfficePreferredSongtiFont); preferred != "" {
		return preferred
	}
	if hasSimSunRegularInstalled() {
		return "SimSun"
	}
	return resolveSongtiSubstituteFont()
}

func resolveHeiPreferredFont() string {
	if preferred := preferredFontNameFromEnv(envLibreOfficePreferredHeiFont); preferred != "" {
		return preferred
	}
	if hasSimHeiInstalled() {
		return "SimHei"
	}
	return resolveHeiSubstituteFont()
}

func resolveTimesPreferredFont() string {
	if preferred := preferredFontNameFromEnv(envLibreOfficePreferredTimesFont); preferred != "" {
		return preferred
	}
	if hasTimesNewRomanInstalled() {
		return "Times New Roman"
	}
	return resolveTimesNewRomanSubstituteFont()
}

func resolveCalibriPreferredFont() string {
	if preferred := preferredFontNameFromEnv(envLibreOfficePreferredCalibriFont); preferred != "" {
		return preferred
	}
	if hasCalibriInstalled() {
		return "Calibri"
	}
	return resolveCalibriSubstituteFont()
}

// resolveArialPreferredFont 返回 Arial 的等宽替换字体。
// Liberation Sans 是专为 Arial/Helvetica 等宽设计的开源字体，Debian 由 fonts-liberation 提供。
func resolveArialPreferredFont() string {
	candidates := []struct {
		Name  string
		Paths []string
	}{
		{Name: "Arial", Paths: arialProbePaths()},
		{
			Name: "Liberation Sans",
			Paths: []string{
				"/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
				"/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
				"/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
			},
		},
		{
			Name: "Nimbus Sans",
			Paths: []string{
				"/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf",
				"/usr/share/fonts/type1/urw-base35/NimbusSans-Regular.t1",
			},
		},
		{
			Name: "DejaVu Sans",
			Paths: []string{
				"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
			},
		},
	}
	for _, c := range candidates {
		if hasAnyExistingPath(c.Paths) {
			return c.Name
		}
	}
	return ""
}

func buildFontSubstitutionRegistryContent(pairs []fontSubstitutionPair) string {
	var b strings.Builder
	b.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
	b.WriteString("<oor:items xmlns:oor=\"http://openoffice.org/2001/registry\" xmlns:xs=\"http://www.w3.org/2001/XMLSchema\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">\n")
	b.WriteString("  <item oor:path=\"/org.openoffice.Office.Common/Font/Substitution\">\n")
	b.WriteString("    <prop oor:name=\"Replacement\" oor:op=\"fuse\"><value>true</value></prop>\n")
	b.WriteString("  </item>\n")
	b.WriteString("  <item oor:path=\"/org.openoffice.Office.Common/Font/Substitution/FontPairs\">\n")
	for i, p := range pairs {
		replaceFont := escapeRegistryXML(strings.TrimSpace(p.ReplaceFont))
		substituteFont := escapeRegistryXML(strings.TrimSpace(p.SubstituteFont))
		if replaceFont == "" || substituteFont == "" {
			continue
		}
		nodeName := fmt.Sprintf("%02d", i)
		b.WriteString(fmt.Sprintf("    <node oor:name=\"%s\" oor:op=\"replace\">\n", nodeName))
		b.WriteString(fmt.Sprintf("      <prop oor:name=\"ReplaceFont\" oor:op=\"fuse\"><value>%s</value></prop>\n", replaceFont))
		b.WriteString(fmt.Sprintf("      <prop oor:name=\"SubstituteFont\" oor:op=\"fuse\"><value>%s</value></prop>\n", substituteFont))
		b.WriteString(fmt.Sprintf("      <prop oor:name=\"OnScreenOnly\" oor:op=\"fuse\"><value>%t</value></prop>\n", p.OnScreenOnly))
		b.WriteString(fmt.Sprintf("      <prop oor:name=\"Always\" oor:op=\"fuse\"><value>%t</value></prop>\n", p.Always))
		b.WriteString("    </node>\n")
	}
	b.WriteString("  </item>\n")
	b.WriteString("</oor:items>\n")
	return b.String()
}

func dedupeFontSubstitutionPairs(in []fontSubstitutionPair) []fontSubstitutionPair {
	seen := make(map[string]struct{}, len(in))
	out := make([]fontSubstitutionPair, 0, len(in))
	for _, pair := range in {
		replaceFont := strings.TrimSpace(pair.ReplaceFont)
		substituteFont := strings.TrimSpace(pair.SubstituteFont)
		if replaceFont == "" || substituteFont == "" {
			continue
		}
		key := strings.ToLower(replaceFont) + "->" + strings.ToLower(substituteFont)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		pair.ReplaceFont = replaceFont
		pair.SubstituteFont = substituteFont
		out = append(out, pair)
	}
	return out
}

func escapeRegistryXML(raw string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		"\"", "&quot;",
		"'", "&apos;",
	)
	return replacer.Replace(raw)
}

func hasTimesNewRomanInstalled() bool {
	return hasAnyExistingPath(timesNewRomanProbePaths())
}

func hasSimHeiInstalled() bool {
	return hasAnyExistingPath(simHeiProbePaths())
}

func hasCalibriInstalled() bool {
	return hasAnyExistingPath(calibriProbePaths())
}

func hasSimSunFamilyInstalled() bool {
	return hasSimSunRegularInstalled()
}

func hasSimSunRegularInstalled() bool {
	return hasAnyExistingPath(simSunRegularProbePaths())
}

func hasSimSunBoldInstalled() bool {
	return hasAnyExistingPath(simSunBoldProbePaths())
}

func resolveTimesNewRomanSubstituteFont() string {
	candidates := []struct {
		Name  string
		Paths []string
	}{
		{
			Name:  "Times New Roman",
			Paths: timesNewRomanProbePaths(),
		},
		{
			Name: "Liberation Serif",
			Paths: []string{
				"/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
				"/usr/share/fonts/liberation/LiberationSerif-Regular.ttf",
				"/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf",
			},
		},
		{
			Name: "Nimbus Roman",
			Paths: []string{
				"/usr/share/fonts/opentype/urw-base35/NimbusRoman-Regular.otf",
				"/usr/share/fonts/type1/urw-base35/NimbusRoman-Regular.t1",
			},
		},
		{
			Name: "DejaVu Serif",
			Paths: []string{
				"/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
			},
		},
	}
	for _, c := range candidates {
		if hasAnyExistingPath(c.Paths) {
			return c.Name
		}
	}
	return ""
}

func resolveSongtiSubstituteFont() string {
	candidates := []struct {
		Name  string
		Paths []string
	}{
		{
			Name:  "SimSun",
			Paths: simSunRegularProbePaths(),
		},
		{
			Name: "宋体-简",
			Paths: []string{
				"/System/Library/Fonts/Supplemental/Songti.ttc",
			},
		},
		{
			Name: "Songti SC",
			Paths: []string{
				"/System/Library/Fonts/Supplemental/Songti.ttc",
			},
		},
		{
			Name: "华文宋体",
			Paths: []string{
				"/System/Library/Fonts/Supplemental/Songti.ttc",
			},
		},
		{
			Name: "Noto Serif CJK SC",
			Paths: []string{
				"/usr/share/fonts/truetype/noto/NotoSerifCJK-Regular.ttc",
				"/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
			},
		},
		{
			Name: "Source Han Serif SC",
			Paths: []string{
				"/usr/share/fonts/opentype/source-han-serif/SourceHanSerifSC-Regular.otf",
				"/usr/share/fonts/opentype/adobe-source-han-serif/SourceHanSerifSC-Regular.otf",
			},
		},
		{
			Name: "PingFang SC",
			Paths: []string{
				"/System/Library/Fonts/PingFang.ttc",
			},
		},
	}
	for _, c := range candidates {
		if hasAnyExistingPath(c.Paths) {
			return c.Name
		}
	}
	return ""
}

func resolveHeiSubstituteFont() string {
	candidates := []struct {
		Name  string
		Paths []string
	}{
		{
			Name:  "SimHei",
			Paths: simHeiProbePaths(),
		},
		{
			Name: "Microsoft YaHei",
			Paths: []string{
				"/usr/share/fonts/truetype/msyh/msyh.ttc",
				"/usr/share/fonts/truetype/wps-office/msyh.ttc",
				"/mnt/c/Windows/Fonts/msyh.ttc",
			},
		},
		{
			Name: "Noto Sans CJK SC",
			Paths: []string{
				"/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
				"/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
			},
		},
		{
			Name: "Source Han Sans SC",
			Paths: []string{
				"/usr/share/fonts/opentype/source-han-sans/SourceHanSansSC-Regular.otf",
				"/usr/share/fonts/opentype/adobe-source-han-sans/SourceHanSansSC-Regular.otf",
			},
		},
		{
			Name: "PingFang SC",
			Paths: []string{
				"/System/Library/Fonts/PingFang.ttc",
			},
		},
	}
	for _, c := range candidates {
		if hasAnyExistingPath(c.Paths) {
			return c.Name
		}
	}
	return ""
}

func resolveCalibriSubstituteFont() string {
	candidates := []struct {
		Name  string
		Paths []string
	}{
		{
			Name:  "Calibri",
			Paths: calibriProbePaths(),
		},
		{
			// Carlito 是专为 Calibri 等宽设计的开源字体（Google Croscore 系列），
			// 字符宽度与 Calibri 完全一致，可防止英文折行/ShrinkToFit 极小字问题。
			// Debian: apt install fonts-crosextra-carlito
			Name: "Carlito",
			Paths: []string{
				"/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf",
				"/usr/share/fonts/truetype/crosextra/carlito.ttf",
				"/usr/share/fonts/opentype/crosextra/Carlito-Regular.ttf",
			},
		},
		{
			Name:  "Arial",
			Paths: arialProbePaths(),
		},
		{
			Name: "Liberation Sans",
			Paths: []string{
				"/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
				"/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
				"/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
			},
		},
		{
			Name: "Nimbus Sans",
			Paths: []string{
				"/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf",
				"/usr/share/fonts/type1/urw-base35/NimbusSans-Regular.t1",
			},
		},
		{
			Name: "DejaVu Sans",
			Paths: []string{
				"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
			},
		},
	}
	for _, c := range candidates {
		if hasAnyExistingPath(c.Paths) {
			return c.Name
		}
	}
	return ""
}

func timesNewRomanProbePaths() []string {
	return []string{
		"~/Library/Fonts/Times New Roman.ttf",
		"~/Library/Fonts/Times New Roman Bold.ttf",
		"/Library/Fonts/Times New Roman.ttf",
		"/Library/Fonts/Times New Roman Bold.ttf",
		"/System/Library/Fonts/Supplemental/Times New Roman.ttf",
		"/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
		"/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman.ttf",
		"/usr/share/fonts/truetype/msttcorefonts/times.ttf",
		"/usr/share/fonts/truetype/mscorefonts/Times_New_Roman.ttf",
		"/mnt/c/Windows/Fonts/times.ttf",
	}
}

func calibriProbePaths() []string {
	return []string{
		"~/Library/Fonts/Calibri.ttf",
		"~/Library/Fonts/Calibri Regular.ttf",
		"/Library/Fonts/Calibri.ttf",
		"/Library/Fonts/Calibri Regular.ttf",
		"/System/Library/Fonts/Supplemental/Calibri.ttf",
		"/usr/share/fonts/truetype/msttcorefonts/calibri.ttf",
		"/usr/share/fonts/truetype/mscorefonts/calibri.ttf",
		"/mnt/c/Windows/Fonts/calibri.ttf",
	}
}

func arialProbePaths() []string {
	return []string{
		"~/Library/Fonts/Arial.ttf",
		"/Library/Fonts/Arial.ttf",
		"/System/Library/Fonts/Supplemental/Arial.ttf",
		"/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
		"/usr/share/fonts/truetype/msttcorefonts/arial.ttf",
		"/usr/share/fonts/truetype/mscorefonts/Arial.ttf",
		"/mnt/c/Windows/Fonts/arial.ttf",
	}
}

func simSunRegularProbePaths() []string {
	return []string{
		"~/Library/Fonts/SimSun.ttf",
		"~/Library/Fonts/SimSun.ttc",
		"~/Library/Fonts/NSimSun.ttf",
		"/Library/Fonts/SimSun.ttf",
		"/Library/Fonts/SimSun.ttc",
		"/Library/Fonts/NSimSun.ttf",
		"/usr/share/fonts/truetype/wps-office/simsun.ttc",
		"/usr/share/fonts/truetype/simsun/simsun.ttc",
		"/usr/share/fonts/truetype/windows/simsun.ttc",
		"/usr/share/fonts/truetype/msyh/SimSun.ttf",
		"/mnt/c/Windows/Fonts/simsun.ttc",
		"/mnt/c/Windows/Fonts/NSimSun.ttf",
	}
}

func simHeiProbePaths() []string {
	return []string{
		"~/Library/Fonts/SimHei.ttf",
		"/Library/Fonts/SimHei.ttf",
		"/usr/share/fonts/truetype/wps-office/simhei.ttf",
		"/usr/share/fonts/truetype/windows/simhei.ttf",
		"/usr/share/fonts/truetype/msyh/SimHei.ttf",
		"/mnt/c/Windows/Fonts/simhei.ttf",
		"/Applications/Microsoft Word.app/Contents/Resources/DFonts/simhei.ttf",
		"/Applications/Microsoft Excel.app/Contents/Resources/DFonts/simhei.ttf",
	}
}

func simSunBoldProbePaths() []string {
	return []string{
		"~/Library/Fonts/simsunb.ttf",
		"/Library/Fonts/simsunb.ttf",
		"/usr/share/fonts/truetype/windows/simsunb.ttf",
		"/mnt/c/Windows/Fonts/simsunb.ttf",
	}
}

func discoverAdditionalLibreOfficeFontDirs() []string {
	var dirs []string
	if raw := strings.TrimSpace(os.Getenv("LIBREOFFICE_EXTRA_FONT_DIRS")); raw != "" {
		for _, seg := range strings.Split(raw, string(os.PathListSeparator)) {
			seg = strings.TrimSpace(seg)
			if seg == "" {
				continue
			}
			dirs = append(dirs, expandHomePath(seg))
		}
	}
	if runtime.GOOS == "darwin" {
		dirs = append(dirs, officeDFontsDirs()...)
	}
	return dedupeExistingDirs(dirs)
}

func mergePathListEnv(env []string, key string, value string) []string {
	if strings.TrimSpace(key) == "" || strings.TrimSpace(value) == "" {
		return env
	}
	prefix := key + "="
	for i, item := range env {
		if !strings.HasPrefix(item, prefix) {
			continue
		}
		oldVal := strings.TrimSpace(strings.TrimPrefix(item, prefix))
		if oldVal == "" {
			env[i] = prefix + value
			return env
		}
		combined := oldVal + string(os.PathListSeparator) + value
		env[i] = prefix + combined
		return env
	}
	return append(env, prefix+value)
}

func mergeKVEnv(env []string, key string, value string) []string {
	if strings.TrimSpace(key) == "" {
		return env
	}
	prefix := key + "="
	for i, item := range env {
		if strings.HasPrefix(item, prefix) {
			env[i] = prefix + value
			return env
		}
	}
	return append(env, prefix+value)
}

func dedupeExistingDirs(in []string) []string {
	seen := make(map[string]struct{}, len(in))
	out := make([]string, 0, len(in))
	for _, raw := range in {
		path := strings.TrimSpace(raw)
		if path == "" {
			continue
		}
		st, err := os.Stat(path)
		if err != nil || !st.IsDir() {
			continue
		}
		if _, ok := seen[path]; ok {
			continue
		}
		seen[path] = struct{}{}
		out = append(out, path)
	}
	return out
}

func buildLibreOfficeCacheFingerprint(bin string) string {
	fontDirs := discoverAdditionalLibreOfficeFontDirs()
	sort.Strings(fontDirs)

	pairs := buildDefaultFontSubstitutionPairs()
	pairSegments := make([]string, 0, len(pairs))
	for _, pair := range pairs {
		replaceFont := strings.TrimSpace(pair.ReplaceFont)
		substituteFont := strings.TrimSpace(pair.SubstituteFont)
		if replaceFont == "" || substituteFont == "" {
			continue
		}
		pairSegments = append(pairSegments, strings.ToLower(replaceFont)+"->"+substituteFont)
	}
	sort.Strings(pairSegments)

	parts := []string{
		"bin=" + strings.TrimSpace(bin),
		"home_set=" + strconv.FormatBool(strings.TrimSpace(os.Getenv("HOME")) != ""),
		"extra_font_dirs_raw=" + strings.TrimSpace(os.Getenv("LIBREOFFICE_EXTRA_FONT_DIRS")),
		"extra_font_dirs=" + strings.Join(fontDirs, ","),
		"preferred_songti_env=" + preferredFontNameFromEnv(envLibreOfficePreferredSongtiFont),
		"preferred_hei_env=" + preferredFontNameFromEnv(envLibreOfficePreferredHeiFont),
		"preferred_times_env=" + preferredFontNameFromEnv(envLibreOfficePreferredTimesFont),
		"preferred_calibri_env=" + preferredFontNameFromEnv(envLibreOfficePreferredCalibriFont),
		"has_times_new_roman=" + strconv.FormatBool(hasTimesNewRomanInstalled()),
		"has_simhei=" + strconv.FormatBool(hasSimHeiInstalled()),
		"has_calibri=" + strconv.FormatBool(hasCalibriInstalled()),
		"has_carlito=" + strconv.FormatBool(hasAnyExistingPath([]string{
			"/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf",
			"/usr/share/fonts/truetype/crosextra/carlito.ttf",
		})),
		"has_liberation_sans=" + strconv.FormatBool(hasAnyExistingPath([]string{
			"/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
			"/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
		})),
		"has_liberation_serif=" + strconv.FormatBool(hasAnyExistingPath([]string{
			"/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
			"/usr/share/fonts/liberation/LiberationSerif-Regular.ttf",
		})),
		"songti_preferred=" + strings.TrimSpace(resolveSongtiPreferredFont()),
		"hei_preferred=" + strings.TrimSpace(resolveHeiPreferredFont()),
		"times_preferred=" + strings.TrimSpace(resolveTimesPreferredFont()),
		"calibri_preferred=" + strings.TrimSpace(resolveCalibriPreferredFont()),
		"arial_preferred=" + strings.TrimSpace(resolveArialPreferredFont()),
		"has_simsun_regular=" + strconv.FormatBool(hasSimSunRegularInstalled()),
		"has_simsun_bold=" + strconv.FormatBool(hasSimSunBoldInstalled()),
		"substitution_pairs=" + strings.Join(pairSegments, ","),
	}
	return strings.Join(parts, "|")
}

func officeDFontsDirs() []string {
	return []string{
		"/Applications/Microsoft Word.app/Contents/Resources/DFonts",
		"/Applications/Microsoft Excel.app/Contents/Resources/DFonts",
		"/Applications/Microsoft PowerPoint.app/Contents/Resources/DFonts",
	}
}

func ensureTemplateOriginalFontsInstalled() {
	if runtime.GOOS != "darwin" {
		return
	}
	// SimSun 常规体 + 粗体均已可用则无需动作，避免重复 IO。
	if hasSimSunRegularInstalled() && hasSimSunBoldInstalled() {
		return
	}
	home, err := os.UserHomeDir()
	if err != nil || strings.TrimSpace(home) == "" {
		return
	}
	targetDir := filepath.Join(home, "Library", "Fonts")
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return
	}
	sources := []string{
		"/Applications/Microsoft Word.app/Contents/Resources/DFonts/Simsun.ttc",
		"/Applications/Microsoft Word.app/Contents/Resources/DFonts/simsunb.ttf",
		"/Applications/Microsoft Excel.app/Contents/Resources/DFonts/Simsun.ttc",
		"/Applications/Microsoft Excel.app/Contents/Resources/DFonts/simsunb.ttf",
	}
	for _, raw := range sources {
		src := strings.TrimSpace(raw)
		if src == "" {
			continue
		}
		st, err := os.Stat(src)
		if err != nil || st.IsDir() {
			continue
		}
		dst := filepath.Join(targetDir, filepath.Base(src))
		dstInfo, derr := os.Stat(dst)
		if derr == nil && !dstInfo.IsDir() && dstInfo.Size() == st.Size() {
			continue
		}
		_ = copyFileBestEffort(src, dst)
	}
}

func copyFileBestEffort(src string, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func hasAnyExistingPath(paths []string) bool {
	for _, raw := range paths {
		path := expandHomePath(strings.TrimSpace(raw))
		if path == "" {
			continue
		}
		if st, err := os.Stat(path); err == nil && !st.IsDir() {
			return true
		}
	}
	return false
}

func expandHomePath(raw string) string {
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "~/") {
		home, err := os.UserHomeDir()
		if err != nil || strings.TrimSpace(home) == "" {
			return raw
		}
		return filepath.Join(home, strings.TrimPrefix(raw, "~/"))
	}
	return raw
}

// Available 检查 LibreOffice 是否可用
func (c *LibreOfficeConverter) Available() bool {
	_, err := exec.LookPath(c.bin)
	return err == nil
}
