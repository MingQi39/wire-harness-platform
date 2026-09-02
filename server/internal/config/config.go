package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	App             AppConfig
	DB              DatabaseConfig
	Redis           RedisConfig
	JWT             JWTConfig
	Server          ServerConfig
	Log             LogConfig
	CORS            CORSConfig
	Upload          UploadConfig
	ElectronUpdates ElectronUpdatesConfig
	Worker          WorkerConfig
	Feishu          FeishuConfig
	Auth            AuthConfig
}

type WorkerConfig struct {
	Concurrency           int
	PDFEngine             string // "libreoffice" (default) or "chromedp"
	LibreOfficeBin        string
	PDFRenderTimeout      time.Duration
	CertPDFPrewarmEnabled bool // 证书编制保存后异步预热 PDF 缓存（需单独启动 worker 子命令）
}

type AppConfig struct {
	Name       string
	Env        string // development / staging / production
	DeployMode string // cloud / onprem；私有化部署允许容器内数据库使用非 TLS 连接
	Version    string
}

type UploadConfig struct {
	Dir string // 仅在 StorageBackend=local 时使用

	StorageBackend   string // "local" 或 "s3"（Cloudflare R2 兼容 S3 协议）
	S3Endpoint       string
	S3Region         string
	S3Bucket         string
	S3AccessKey      string
	S3SecretKey      string
	S3ForcePathStyle bool   // R2/MinIO=true；阿里云 OSS S3 兼容接口通常为 false
	S3PublicURL      string // 可选：R2 公开访问域名，用于生成直链
}

type ElectronUpdatesConfig struct {
	S3Endpoint       string
	S3Region         string
	S3Bucket         string
	S3AccessKey      string
	S3SecretKey      string
	S3ForcePathStyle bool
}

func (c ElectronUpdatesConfig) Enabled() bool {
	return strings.TrimSpace(c.S3Endpoint) != "" &&
		strings.TrimSpace(c.S3Bucket) != "" &&
		strings.TrimSpace(c.S3AccessKey) != "" &&
		strings.TrimSpace(c.S3SecretKey) != ""
}

type ServerConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

type DatabaseConfig struct {
	// ConnURL 非空时（环境变量 DATABASE_URL），GORM 与 migrate 优先使用该连接串，忽略下方分字段配置。
	// 适用于 Supabase、云 RDS 等托管方提供的 postgres:// URI。
	ConnURL      string
	Host         string
	Port         string
	User         string
	Password     string
	DBName       string
	SSLMode      string
	MaxOpenConns int
	MaxIdleConns int
	ReplicaDSNs  []string // read replica DSNs for read-write separation
}

// DSN 返回 GORM postgres 驱动可用的连接串（libpq 键值对或 postgres:// URI）。
func (d DatabaseConfig) DSN() string {
	if d.ConnURL != "" {
		return d.ConnURL
	}
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.DBName, d.SSLMode,
	)
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

func (r RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%s", r.Host, r.Port)
}

type JWTConfig struct {
	Secret        string
	RefreshSecret string
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
}

type LogConfig struct {
	Level string
}

type CORSConfig struct {
	AllowedOrigins []string
}

type FeishuConfig struct {
	AppID      string
	AppSecret  string
	ChatID     string
	WebBaseURL string
}

type AuthConfig struct {
	RegisterEnabled bool
}

func Load() *Config {
	var replicaDSNs []string
	if v := getEnv("DB_REPLICA_DSNS", ""); v != "" {
		replicaDSNs = strings.Split(v, ",")
	}

	appEnv := getEnv("APP_ENV", "development")

	return &Config{
		App: AppConfig{
			Name:       getEnv("APP_NAME", "lims"),
			Env:        appEnv,
			DeployMode: getEnv("DEPLOY_MODE", "cloud"),
			Version:    getEnv("APP_VERSION", "dev"),
		},
		Upload: UploadConfig{
			Dir:              getEnv("UPLOAD_DIR", "./uploads"),
			StorageBackend:   getEnv("STORAGE_BACKEND", "local"),
			S3Endpoint:       getEnv("S3_ENDPOINT", ""),
			S3Region:         getEnv("S3_REGION", "auto"),
			S3Bucket:         getEnv("S3_BUCKET", ""),
			S3AccessKey:      getEnv("S3_ACCESS_KEY", ""),
			S3SecretKey:      getEnv("S3_SECRET_KEY", ""),
			S3ForcePathStyle: getEnvBool("S3_FORCE_PATH_STYLE", true),
			S3PublicURL:      getEnv("S3_PUBLIC_URL", ""),
		},
		ElectronUpdates: ElectronUpdatesConfig{
			S3Endpoint: getEnv("ELECTRON_UPDATES_S3_ENDPOINT", getEnv("LIMS_RELEASE_S3_ENDPOINT", "")),
			S3Region:   getEnv("ELECTRON_UPDATES_S3_REGION", getEnv("LIMS_RELEASE_S3_REGION", "auto")),
			S3Bucket:   getEnv("ELECTRON_UPDATES_S3_BUCKET", ""),
			S3AccessKey: getEnv(
				"ELECTRON_UPDATES_S3_ACCESS_KEY",
				getEnv("LIMS_RELEASE_ACCESS_KEY_ID", getEnv("LIMS_RELEASE_ACCESS_KEY", "")),
			),
			S3SecretKey: getEnv(
				"ELECTRON_UPDATES_S3_SECRET_KEY",
				getEnv("LIMS_RELEASE_SECRET_ACCESS_KEY", getEnv("LIMS_RELEASE_SECRET_KEY", "")),
			),
			S3ForcePathStyle: getEnvBool("ELECTRON_UPDATES_S3_FORCE_PATH_STYLE", true),
		},
		Server: ServerConfig{
			Port:        getEnv("APP_PORT", "8080"),
			ReadTimeout: getEnvDuration("SERVER_READ_TIMEOUT", 15*time.Second),
			// /report-extract/preview 等长耗时接口需要更长写超时，避免处理完成后响应被提前切断。
			WriteTimeout: getEnvDuration("SERVER_WRITE_TIMEOUT", 180*time.Second),
			IdleTimeout:  getEnvDuration("SERVER_IDLE_TIMEOUT", 60*time.Second),
		},
		DB: DatabaseConfig{
			ConnURL:      getEnv("DATABASE_URL", ""),
			Host:         getEnv("DB_HOST", "localhost"),
			Port:         getEnv("DB_PORT", "5432"),
			User:         getEnv("DB_USER", "postgres"),
			Password:     getEnv("DB_PASSWORD", "postgres"),
			DBName:       getEnv("DB_NAME", "lims"),
			SSLMode:      getEnv("DB_SSL_MODE", "disable"),
			MaxOpenConns: getEnvInt("DB_MAX_OPEN_CONNS", 50),
			MaxIdleConns: getEnvInt("DB_MAX_IDLE_CONNS", 20),
			ReplicaDSNs:  replicaDSNs,
		},
		Redis: RedisConfig{
			// 默认 127.0.0.1：避免部分环境将 localhost 解析为 ::1 而本机仅监听 IPv4 时连接失败
			Host:     getEnv("REDIS_HOST", "127.0.0.1"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:        getEnv("JWT_SECRET", "change-me-in-production"),
			RefreshSecret: getEnv("JWT_REFRESH_SECRET", "change-me-refresh-secret"),
			AccessTTL:     15 * time.Minute,
			RefreshTTL:    7 * 24 * time.Hour,
		},
		Log: LogConfig{
			Level: getEnv("LOG_LEVEL", "info"),
		},
		CORS: CORSConfig{
			// 含 5174：Vite 在 5173 被占时会自动换端口；含 127.0.0.1：与「页面 localhost、接口 127.0.0.1」的跨源场景
			AllowedOrigins: trimSlice(strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"), ",")),
		},
		Worker: WorkerConfig{
			Concurrency:           getEnvInt("ASYNQ_CONCURRENCY", 2),
			PDFEngine:             getEnv("PDF_ENGINE", "libreoffice"),
			LibreOfficeBin:        getEnv("LIBREOFFICE_BIN", "libreoffice"),
			PDFRenderTimeout:      time.Duration(getEnvInt("PDF_RENDER_TIMEOUT", 600)) * time.Second,
			CertPDFPrewarmEnabled: getEnvBool("CERT_PDF_PREWARM_ENABLED", true),
		},
		Feishu: FeishuConfig{
			AppID:      getEnv("FEISHU_APP_ID", ""),
			AppSecret:  getEnv("FEISHU_APP_SECRET", ""),
			ChatID:     getEnv("FEISHU_CHAT_ID", ""),
			WebBaseURL: getEnv("WEB_BASE_URL", ""),
		},
		Auth: AuthConfig{
			RegisterEnabled: authRegisterEnabled(appEnv),
		},
	}
}

func authRegisterEnabled(appEnv string) bool {
	if v := strings.TrimSpace(os.Getenv("AUTH_REGISTER_ENABLED")); v != "" {
		return getEnvBool("AUTH_REGISTER_ENABLED", false)
	}
	return appEnv == "development"
}

// Validate checks critical configuration for production/staging safety.
func (c *Config) Validate() error {
	if c.App.Env == "production" || c.App.Env == "staging" {
		isOnPrem := strings.EqualFold(strings.TrimSpace(c.App.DeployMode), "onprem")
		if c.JWT.Secret == "change-me-in-production" || len(c.JWT.Secret) < 32 {
			return fmt.Errorf("JWT_SECRET must be set to a secure value (>=32 chars) in production")
		}
		if c.JWT.RefreshSecret == "change-me-refresh-secret" || len(c.JWT.RefreshSecret) < 32 {
			return fmt.Errorf("JWT_REFRESH_SECRET must be set to a secure value (>=32 chars) in production")
		}
		if c.DB.ConnURL != "" {
			if !isOnPrem && strings.Contains(c.DB.ConnURL, "sslmode=disable") {
				return fmt.Errorf("DATABASE_URL contains sslmode=disable, which is unsafe in production; use sslmode=require or verify-full")
			}
		} else if !isOnPrem && c.DB.SSLMode == "disable" {
			return fmt.Errorf("DB_SSL_MODE should not be 'disable' in production; set to 'require' or 'verify-full'")
		}
		pek := os.Getenv("PASSWORD_ENCRYPT_KEY")
		if pek == "" {
			return fmt.Errorf("PASSWORD_ENCRYPT_KEY must be set in production")
		}
		if pek == "b98d14225ca0a153cbf1df41462c5727" {
			return fmt.Errorf("PASSWORD_ENCRYPT_KEY must not use the default value in production")
		}
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func trimSlice(ss []string) []string {
	out := make([]string, 0, len(ss))
	for _, s := range ss {
		if v := strings.TrimSpace(s); v != "" {
			out = append(out, v)
		}
	}
	return out
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	if d, err := time.ParseDuration(v); err == nil {
		return d
	}
	// 兼容纯数字（按秒解释）
	if sec, err := strconv.Atoi(v); err == nil && sec >= 0 {
		return time.Duration(sec) * time.Second
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if v == "" {
		return fallback
	}
	switch v {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}
