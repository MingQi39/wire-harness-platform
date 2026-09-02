package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	refreshKeyPrefix    = "refresh:"
	tokenVersionPrefix  = "rt_ver:"
)

type RefreshStore struct {
	rdb *redis.Client
}

func NewRefreshStore(rdb *redis.Client) *RefreshStore {
	return &RefreshStore{rdb: rdb}
}

func (s *RefreshStore) Store(ctx context.Context, jti string, userID int64, ttl time.Duration) error {
	return s.rdb.Set(ctx, refreshKeyPrefix+jti, userID, ttl).Err()
}

func (s *RefreshStore) Exists(ctx context.Context, jti string) (bool, error) {
	n, err := s.rdb.Exists(ctx, refreshKeyPrefix+jti).Result()
	return n > 0, err
}

// ConsumeIfExists atomically checks and deletes a refresh token jti.
// Returns (userID, true, nil) if the token existed and was consumed.
func (s *RefreshStore) ConsumeIfExists(ctx context.Context, jti string) (int64, bool, error) {
	val, err := s.rdb.GetDel(ctx, refreshKeyPrefix+jti).Int64()
	if err == redis.Nil {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return val, true, nil
}

// Revoke 吊销单个 refresh token
func (s *RefreshStore) Revoke(ctx context.Context, jti string) error {
	return s.rdb.Del(ctx, refreshKeyPrefix+jti).Err()
}

// GetTokenVersion 获取用户当前的 token 版本号，用于批量吊销判断
func (s *RefreshStore) GetTokenVersion(ctx context.Context, userID int64) (int64, error) {
	val, err := s.rdb.Get(ctx, fmt.Sprintf("%s%d", tokenVersionPrefix, userID)).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}

// IncrTokenVersion 递增用户 token 版本号，使所有旧 refresh token 失效
func (s *RefreshStore) IncrTokenVersion(ctx context.Context, userID int64) (int64, error) {
	return s.rdb.Incr(ctx, fmt.Sprintf("%s%d", tokenVersionPrefix, userID)).Result()
}

// RevokeAllForUser 通过递增版本号使该用户所有 refresh token 失效
func (s *RefreshStore) RevokeAllForUser(ctx context.Context, userID int64) error {
	_, err := s.IncrTokenVersion(ctx, userID)
	return err
}

// RevokeAllForUsers 对多个用户递增会话版本（去重、跳过非法 id），一次 Pipeline 减少往返。
func (s *RefreshStore) RevokeAllForUsers(ctx context.Context, userIDs []int64) error {
	if len(userIDs) == 0 {
		return nil
	}
	seen := make(map[int64]struct{}, len(userIDs))
	unique := make([]int64, 0, len(userIDs))
	for _, id := range userIDs {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		unique = append(unique, id)
	}
	if len(unique) == 0 {
		return nil
	}
	_, err := s.rdb.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		for _, id := range unique {
			pipe.Incr(ctx, fmt.Sprintf("%s%d", tokenVersionPrefix, id))
		}
		return nil
	})
	return err
}
