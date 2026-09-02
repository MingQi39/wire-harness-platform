package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/rand"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
)

// ListCache 业务列表缓存，适用于变更低频的查询结果。
// TTL 自动添加 ±20% 随机偏移防雪崩。
type ListCache struct {
	cache     *Cache
	rdb       *redis.Client
	keyPrefix string
	baseTTL   time.Duration
}

func NewListCache(rdb *redis.Client, keyPrefix string, baseTTL time.Duration) *ListCache {
	return &ListCache{
		cache:     New(rdb),
		rdb:       rdb,
		keyPrefix: keyPrefix,
		baseTTL:   baseTTL,
	}
}

func (lc *ListCache) jitteredTTL() time.Duration {
	jitter := float64(lc.baseTTL) * 0.2 * (rand.Float64()*2 - 1) //nolint:gosec
	return lc.baseTTL + time.Duration(jitter)
}

// HashKey 对查询参数生成稳定的缓存 key 后缀
func HashKey(parts ...interface{}) string {
	h := sha256.New()
	for _, p := range parts {
		fmt.Fprintf(h, "%v|", p)
	}
	return hex.EncodeToString(h.Sum(nil))[:16]
}

// AuthzKey 描述会影响列表可见性的授权维度，当前按用户维度隔离缓存键。
func AuthzKey(ctx context.Context) string {
	return fmt.Sprintf("user=%d", auth.CurrentUserID(ctx))
}

func (lc *ListCache) key(tenantID int64, queryHash string) string {
	return fmt.Sprintf("%s%d:%s", lc.keyPrefix, tenantID, queryHash)
}

// Get 尝试从缓存读取列表结果，miss 时返回 redis.Nil
func (lc *ListCache) Get(ctx context.Context, tenantID int64, queryHash string, dest interface{}) error {
	return lc.cache.Get(ctx, lc.key(tenantID, queryHash), dest)
}

// Set 写入缓存（TTL 含随机偏移）
func (lc *ListCache) Set(ctx context.Context, tenantID int64, queryHash string, value interface{}) error {
	return lc.cache.Set(ctx, lc.key(tenantID, queryHash), value, lc.jitteredTTL())
}

// InvalidateTenant 通过 SCAN + DEL 失效指定租户的全部列表缓存
func (lc *ListCache) InvalidateTenant(ctx context.Context, tenantID int64) error {
	pattern := fmt.Sprintf("%s%d:*", lc.keyPrefix, tenantID)
	var cursor uint64
	for {
		keys, next, err := lc.rdb.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			if err := lc.rdb.Del(ctx, keys...).Err(); err != nil {
				return err
			}
		}
		cursor = next
		if cursor == 0 {
			break
		}
	}
	return nil
}
