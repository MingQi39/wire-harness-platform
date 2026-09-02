package auth

import "context"

// RevokeSessionsForAuthzChange 在角色或权限变更后递增用户会话版本，
// 使已签发的 access / refresh token 立即失效，用户需重新登录或刷新。
func RevokeSessionsForAuthzChange(ctx context.Context, rs *RefreshStore, userIDs []int64) error {
	if rs == nil || len(userIDs) == 0 {
		return nil
	}
	return rs.RevokeAllForUsers(ctx, userIDs)
}
