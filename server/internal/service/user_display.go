package service

import (
	"context"
	"strings"

	"github.com/hmq/wire-harness-platform/internal/model"
	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/repository"
)

func normalizeUserDisplayText(raw string) string {
	return strings.TrimSpace(raw)
}

// systemUserDisplayName 历史兼容格式：姓名与用户名不同时返回「姓名 (username)」。
// 新写入的操作人展示优先用 preferredUserDisplayName。
func systemUserDisplayName(u *model.User) string {
	if u == nil {
		return ""
	}
	name := strings.TrimSpace(u.Name)
	username := strings.TrimSpace(u.Username)
	if name != "" && username != "" && !strings.EqualFold(name, username) {
		return name + " (" + username + ")"
	}
	if name != "" {
		return name
	}
	return username
}

// preferredUserDisplayName 统一优先姓名，姓名为空时回落用户名（与前端 formatUserOptionLabel 一致）。
func preferredUserDisplayName(u *model.User) string {
	if u == nil {
		return ""
	}
	if name := strings.TrimSpace(u.Name); name != "" {
		return name
	}
	return strings.TrimSpace(u.Username)
}

// stripLegacyUserDisplayName 兼容 JWT/历史快照「姓名 (username)」展示串，统一取姓名。
func stripLegacyUserDisplayName(raw string) string {
	text := strings.TrimSpace(raw)
	if text == "" {
		return ""
	}
	if i := strings.LastIndex(text, " ("); i > 0 && strings.HasSuffix(text, ")") {
		name := strings.TrimSpace(text[:i])
		if name != "" {
			return name
		}
	}
	if i := strings.LastIndex(text, "（"); i > 0 && strings.HasSuffix(text, "）") {
		name := strings.TrimSpace(text[:i])
		if name != "" {
			return name
		}
	}
	return text
}

// currentActorDisplayName 优先从 DB 读取最新姓名，避免改名后 JWT 快照仍写入旧用户名。
func currentActorDisplayName(ctx context.Context, userRepo *repository.UserRepository) string {
	uid := auth.CurrentUserID(ctx)
	if userRepo != nil && uid > 0 {
		if u, err := userRepo.GetByID(ctx, uid); err == nil {
			if name := preferredUserDisplayName(u); name != "" {
				return name
			}
		}
	}
	return stripLegacyUserDisplayName(auth.CurrentUserName(ctx))
}
