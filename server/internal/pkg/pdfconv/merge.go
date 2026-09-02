package pdfconv

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"sync"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/font"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

var (
	cjkFontOnce sync.Once
	cjkFontName string
)

// MergePDFs 将多个 PDF 字节流按顺序合并为一个 PDF。
func MergePDFs(pdfs ...[]byte) ([]byte, error) {
	readers := make([]io.ReadSeeker, 0, len(pdfs))
	for _, p := range pdfs {
		readers = append(readers, bytes.NewReader(p))
	}

	var buf bytes.Buffer
	conf := model.NewDefaultConfiguration()
	if err := api.MergeRaw(readers, &buf, false, conf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// PageCount 返回 PDF 的实际页数。
func PageCount(pdf []byte) (int, error) {
	count, err := api.PageCount(bytes.NewReader(pdf), model.NewDefaultConfiguration())
	if err != nil {
		return 0, err
	}
	return count, nil
}

// MergePDFsWithPageNumbers 合并多个 PDF 后在每页底部添加全局连续页码。
func MergePDFsWithPageNumbers(pdfs ...[]byte) ([]byte, error) {
	merged, err := MergePDFs(pdfs...)
	if err != nil {
		return nil, fmt.Errorf("merge PDFs: %w", err)
	}
	return AddPageNumbers(merged)
}

// AddPageNumbers 在 PDF 每页右下角添加全局连续页码。
func AddPageNumbers(pdfData []byte) ([]byte, error) {
	// position:br = 右下角锚点。
	// offset x y：对于 br 锚点，x 为正向右（出页面），x 为负向左（入页面）；
	// 使用 -10 将文字向左移入页面 10pt，15 为底部上移量。
	desc := "fontname:Helvetica, points:8, position:br, offset:-10 15, scalefactor:1 abs, rotation:0, opacity:1, fillcolor:#333333"
	text := "- %p / %P -"
	if fontName := ensureCJKFontName(); fontName != "" {
		desc = fmt.Sprintf("fontname:%s, points:9, position:br, offset:-10 15, scalefactor:1 abs, rotation:0, opacity:1, fillcolor:#333333", fontName)
		text = "第 %p 页 共 %P 页"
	}

	out, err := addPageNumbersWithDescriptor(pdfData, text, desc)
	if err == nil || text == "- %p / %P -" {
		return out, err
	}
	return addPageNumbersWithDescriptor(pdfData, "- %p / %P -", "fontname:Helvetica, points:8, position:br, offset:-10 15, scalefactor:1 abs, rotation:0, opacity:1, fillcolor:#333333")
}

func addPageNumbersWithDescriptor(pdfData []byte, text string, desc string) ([]byte, error) {
	onTop := true
	update := false
	wm, err := api.TextWatermark(text, desc, onTop, update, types.POINTS)
	if err != nil {
		return nil, fmt.Errorf("create page number stamp: %w", err)
	}

	var out bytes.Buffer
	conf := model.NewDefaultConfiguration()
	if err := api.AddWatermarks(bytes.NewReader(pdfData), &out, nil, wm, conf); err != nil {
		return nil, fmt.Errorf("add page numbers: %w", err)
	}
	return out.Bytes(), nil
}

func ensureCJKFontName() string {
	cjkFontOnce.Do(func() {
		cjkFontName = installFirstAvailableCJKFont()
	})
	return cjkFontName
}

func installFirstAvailableCJKFont() string {
	var candidates []string
	switch runtime.GOOS {
	case "darwin":
		homeDir, _ := os.UserHomeDir()
		candidates = []string{
			filepath.Join(homeDir, "Library/Fonts/SimSun.ttf"),
			filepath.Join(homeDir, "Library/Fonts/SimHei.ttf"),
			filepath.Join(homeDir, "Library/Fonts/msyh.ttc"),
			"/Library/Fonts/SimSun.ttf",
			"/Library/Fonts/SimHei.ttf",
			"/Library/Fonts/msyh.ttc",
			"/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
			"/System/Library/Fonts/STHeiti Medium.ttc",
			"/System/Library/Fonts/PingFang.ttc",
		}
	case "linux":
		candidates = []string{
			// Prefer SimSun/SimHei (installed from bundled .gob files) for
			// visual consistency with templates designed in Excel.
			"/usr/share/fonts/truetype/windows/simsun.ttc",
			"/usr/share/fonts/truetype/windows/simhei.ttf",
			"/usr/share/fonts/truetype/wps-office/simsun.ttc",
			"/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
			"/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
			"/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
			"/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
		}
	}
	for _, path := range candidates {
		if _, err := os.Stat(path); err != nil {
			continue
		}
		before := make(map[string]struct{}, len(font.UserFontNames()))
		for _, name := range font.UserFontNames() {
			before[name] = struct{}{}
		}
		if err := api.InstallFonts([]string{path}); err != nil {
			continue
		}
		for _, name := range font.UserFontNames() {
			if _, ok := before[name]; !ok {
				return name
			}
		}
		names := font.UserFontNames()
		if len(names) > 0 {
			return names[0]
		}
	}
	return ""
}
