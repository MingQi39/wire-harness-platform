package auth

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

// 默认 AES-128 密钥（32 位 hex = 16 字节），前后端需保持一致。
// 生产环境建议通过 PASSWORD_ENCRYPT_KEY 环境变量覆盖。
const defaultEncryptKeyHex = "b98d14225ca0a153cbf1df41462c5727"

var encryptKey []byte

const goModModule = "github.com/hmq/wire-harness-platform"

// loadServerDotenv 在 init 中尽早加载与 lims-server 同级的 .env，使 `go run` 前未 `source` 时
// 与 `make dev` 一致。仅当 go.mod 声明为本模块时加载，避免在目录树中误读其它 Go 项目里的 .env。
// godotenv 不覆盖已存在的环境变量；若已显式 export 则仍以进程环境为准。
func loadServerDotenv() {
	wd, err := os.Getwd()
	if err != nil {
		return
	}
	dir := wd
	for range 10 {
		gm := filepath.Join(dir, "go.mod")
		if isFile(gm) && goModIsLims(gm) {
			tryLoadEnv(filepath.Join(dir, ".env"))
			return
		}
		gsub := filepath.Join(dir, "lims-server", "go.mod")
		if isFile(gsub) && goModIsLims(gsub) {
			tryLoadEnv(filepath.Join(dir, "lims-server", ".env"))
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return
		}
		dir = parent
	}
}

func isFile(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

func goModIsLims(gomod string) bool {
	b, err := os.ReadFile(gomod)
	if err != nil {
		return false
	}
	// 仅取前几行，避免大文件
	s := string(b)
	if len(s) > 4000 {
		s = s[:4000]
	}
	for _, line := range strings.Split(s, "\n") {
		t := strings.TrimSpace(line)
		if strings.HasPrefix(t, "//") || t == "" {
			continue
		}
		if strings.HasPrefix(t, "module ") {
			mod := strings.TrimSpace(strings.TrimPrefix(t, "module"))
			return mod == goModModule
		}
	}
	return false
}

func tryLoadEnv(p string) {
	if isFile(p) {
		_ = godotenv.Load(p)
	}
}

func init() {
	loadServerDotenv()

	keyHex := os.Getenv("PASSWORD_ENCRYPT_KEY")
	appEnv := os.Getenv("APP_ENV")

	if keyHex == "" {
		if appEnv == "production" || appEnv == "staging" {
			panic("PASSWORD_ENCRYPT_KEY must be set in production/staging and must differ from the default")
		}
		keyHex = defaultEncryptKeyHex
	}
	if keyHex == defaultEncryptKeyHex && (appEnv == "production" || appEnv == "staging") {
		panic("PASSWORD_ENCRYPT_KEY must not use the default value in production/staging")
	}

	var err error
	encryptKey, err = hex.DecodeString(keyHex)
	if err != nil || (len(encryptKey) != 16 && len(encryptKey) != 24 && len(encryptKey) != 32) {
		if appEnv == "production" || appEnv == "staging" {
			panic("PASSWORD_ENCRYPT_KEY is invalid: must be a valid hex string of 32/48/64 chars (16/24/32 bytes)")
		}
		encryptKey, _ = hex.DecodeString(defaultEncryptKeyHex)
	}
}

// EncryptKeyFingerprint 返回当前进程用于密码传输的 AES 密钥指纹（SHA256 十六进制全小写）。
// 不包含密钥本身，仅供前端启动时比对，避免 PASSWORD_ENCRYPT_KEY 与 VITE_PASSWORD_ENCRYPT_KEY 不一致。
func EncryptKeyFingerprint() string {
	sum := sha256.Sum256(encryptKey)
	return hex.EncodeToString(sum[:])
}

// DecryptPassword 解密前端 AES-CBC 加密后 base64 编码的密码。
// 密文格式: base64( IV(16bytes) + AES-CBC-PKCS7(plaintext) )
func DecryptPassword(encrypted string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return "", errors.New("密码解密失败: 无效的 base64 编码")
	}
	if len(data) < aes.BlockSize*2 {
		return "", errors.New("密码解密失败: 密文长度不足")
	}

	block, err := aes.NewCipher(encryptKey)
	if err != nil {
		return "", errors.New("密码解密失败: AES 初始化错误")
	}

	iv := data[:aes.BlockSize]
	ciphertext := make([]byte, len(data)-aes.BlockSize)
	copy(ciphertext, data[aes.BlockSize:])

	if len(ciphertext)%aes.BlockSize != 0 {
		return "", errors.New("密码解密失败: 密文块对齐错误")
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(ciphertext, ciphertext)

	padding := int(ciphertext[len(ciphertext)-1])
	if padding < 1 || padding > aes.BlockSize {
		return "", errors.New("密码解密失败")
	}
	for i := len(ciphertext) - padding; i < len(ciphertext); i++ {
		if ciphertext[i] != byte(padding) {
			return "", errors.New("密码解密失败")
		}
	}

	return string(ciphertext[:len(ciphertext)-padding]), nil
}
