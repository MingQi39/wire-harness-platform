package permutil

import (
	"context"
	"slices"

	"github.com/hmq/wire-harness-platform/internal/pkg/cache"
	"github.com/hmq/wire-harness-platform/internal/repository"
)

// UserHasCode 与路由 RequirePermission 使用同一套缓存+DB 回源逻辑，供无法挂中间件的路由（如通知 SSE）使用。
func UserHasCode(ctx context.Context, userID int64, code string, pc *cache.PermissionCache, ur *repository.UserRepository) (bool, error) {
	if userID <= 0 {
		return false, nil
	}
	if IsDeveloperPermissionBypass(userID, code) {
		return true, nil
	}
	if IsDeveloperOnlyPermission(code) {
		return false, nil
	}
	perms, err := pc.GetUserPermissions(ctx, userID)
	if err != nil || perms == nil {
		user, dbErr := ur.GetByID(ctx, userID)
		if dbErr != nil {
			return false, dbErr
		}
		perms = CodesFromUser(user)
		_ = pc.SetUserPermissions(ctx, userID, perms)
	}
	if code == TaskReadCode {
		return slices.Contains(perms, TaskReadCode) || PermissionCodesImplyTaskRead(perms), nil
	}
	return slices.Contains(perms, code), nil
}
