package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/hmq/wire-harness-platform/internal/pkg/roles"
)

// ErrAccessTokenRevoked 表示该 access 对应的会话版本已失效（改密、改角色、吊销会话后 IncrTokenVersion）
var ErrAccessTokenRevoked = errors.New("access token session revoked")

type Claims struct {
	TenantID int64    `json:"tenant_id"`
	UserID   int64    `json:"user_id"`
	UserName string   `json:"user_name"`
	Roles    []string `json:"roles"`
	// TokenVersion 与 refresh token 使用同一 Redis 计数（rt_ver:{userID}），用于在吊销会话后使已签发的 access 立即失效
	TokenVersion int64 `json:"tv"`
	jwt.RegisteredClaims
}

type ctxKeyUserID struct{}
type ctxKeyUserName struct{}
type ctxKeyJWTRoles struct{}

func CtxWithUser(ctx context.Context, userID int64, userName string) context.Context {
	ctx = context.WithValue(ctx, ctxKeyUserID{}, userID)
	ctx = context.WithValue(ctx, ctxKeyUserName{}, userName)
	return ctx
}

// CtxWithJWTRoles 将登录态 JWT 中的角色名写入 context。
// 敏感变更会 bump 会话版本使旧 JWT 失效；重新登录后此处与 DB 一致。证书编制等场景仍可按 JWT 角色分支。
func CtxWithJWTRoles(ctx context.Context, roleNames []string) context.Context {
	if roleNames == nil {
		roleNames = []string{}
	}
	return context.WithValue(ctx, ctxKeyJWTRoles{}, roleNames)
}

// CurrentJWTRoles 返回 JWT 声明中的角色名；未设置时返回 nil
func CurrentJWTRoles(ctx context.Context) []string {
	v, _ := ctx.Value(ctxKeyJWTRoles{}).([]string)
	return v
}

func CurrentUserID(ctx context.Context) int64 {
	switch v := ctx.Value(ctxKeyUserID{}).(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case int32:
		return int64(v)
	case uint32:
		return int64(v)
	case uint64:
		return int64(v)
	case float64:
		return int64(v)
	default:
		return 0
	}
}

// HasFullAccessRole 检查当前 JWT 角色中是否包含特权角色
func HasFullAccessRole(ctx context.Context) bool {
	for _, r := range CurrentJWTRoles(ctx) {
		if roles.IsFullAccessRole(r) {
			return true
		}
	}
	return false
}

func CurrentUserName(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeyUserName{}).(string); ok {
		return v
	}
	return ""
}

func GenerateAccessToken(tenantID, userID int64, userName string, roles []string, tokenVersion int64, secret string, ttl time.Duration) (string, error) {
	claims := Claims{
		TenantID:     tenantID,
		UserID:       userID,
		UserName:     userName,
		Roles:        roles,
		TokenVersion: tokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "lims",
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

// ValidateAccessTokenSession 校验 access 中的 tv 是否仍不小于 Redis 中当前会话版本（小于则已被吊销）
func ValidateAccessTokenSession(ctx context.Context, c *Claims, rs *RefreshStore) error {
	if c == nil {
		return errors.New("claims required")
	}
	if rs == nil {
		return errors.New("refresh store required")
	}
	cur, err := rs.GetTokenVersion(ctx, c.UserID)
	if err != nil {
		return fmt.Errorf("get token version: %w", err)
	}
	if c.TokenVersion < cur {
		return ErrAccessTokenRevoked
	}
	return nil
}

type RefreshClaims struct {
	TokenVersion int64 `json:"tv"`
	jwt.RegisteredClaims
}

func GenerateRefreshToken(userID int64, tokenVersion int64, secret string, ttl time.Duration) (tokenStr string, jti string, err error) {
	jti = uuid.New().String()
	claims := RefreshClaims{
		TokenVersion: tokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   fmt.Sprintf("%d", userID),
			Issuer:    "lims",
		},
	}
	tokenStr, err = jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	return
}

func ParseRefreshToken(tokenStr, secret string) (*RefreshClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &RefreshClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*RefreshClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid refresh token")
}

func ParseAccessToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func ValidatePassword(password string) error {
	if password == "" {
		return errors.New("请输入密码")
	}
	return nil
}
