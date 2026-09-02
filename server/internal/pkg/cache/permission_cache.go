package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	permKeyPrefix  = "lims:perm:"
	defaultPermTTL = 30 * time.Minute
)

type PermissionCache struct {
	cache *Cache
	rdb   *redis.Client
	ttl   time.Duration
}

func NewPermissionCache(rdb *redis.Client) *PermissionCache {
	return &PermissionCache{
		cache: New(rdb),
		rdb:   rdb,
		ttl:   defaultPermTTL,
	}
}

func userPermKey(userID int64) string {
	return fmt.Sprintf("%s%d", permKeyPrefix, userID)
}

func (pc *PermissionCache) GetUserPermissions(ctx context.Context, userID int64) ([]string, error) {
	var perms []string
	err := pc.cache.Get(ctx, userPermKey(userID), &perms)
	if err != nil {
		return nil, err
	}
	return perms, nil
}

func (pc *PermissionCache) SetUserPermissions(ctx context.Context, userID int64, perms []string) error {
	return pc.cache.Set(ctx, userPermKey(userID), perms, pc.ttl)
}

func (pc *PermissionCache) InvalidateUser(ctx context.Context, userID int64) error {
	return pc.cache.Del(ctx, userPermKey(userID))
}

// InvalidateUsers 批量失效多个用户的权限缓存
func (pc *PermissionCache) InvalidateUsers(ctx context.Context, userIDs []int64) error {
	if len(userIDs) == 0 {
		return nil
	}
	keys := make([]string, len(userIDs))
	for i, uid := range userIDs {
		keys[i] = userPermKey(uid)
	}
	return pc.cache.Del(ctx, keys...)
}
