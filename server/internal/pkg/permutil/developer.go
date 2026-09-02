package permutil

import (
	"os"
	"strconv"
	"strings"
	"sync"
)

const defaultDeveloperUserID int64 = 199839
const toolLogViewerUserID int64 = 199839

const (
	envLIMSDeveloperUserIDs = "LIMS_DEVELOPER_USER_IDS"
	// 兼容单 id；与 LIMS_DEVELOPER_USER_IDS 同时存在时以 IDS 为准
	envLIMSDeveloperUserID = "LIMS_DEVELOPER_USER_ID"
)

// 按环境变量指纹缓存 map；命中时仅 2×Getenv + map 查；重建时复用本次已读 raw 直接生成 map
var builtInDevCache = struct {
	mu   sync.RWMutex
	fp   string
	byID map[int64]struct{}
}{}

// IsDeveloperOnlyPermission 审计/系统配置/工具日志/检测报告提取等：仅内置开发者使用，不参与角色分配
func IsDeveloperOnlyPermission(permCode string) bool {
	switch permCode {
	case "audit:read", "config:read", "config:edit", "tool_log:read", "feedback:read", "report_extract:use":
		return true
	default:
		return false
	}
}

// IsBuiltInDeveloperUser 判断 userId 是否属于环境变量配置的内置开发者名单
func IsBuiltInDeveloperUser(userID int64) bool {
	_, ok := builtInDeveloperIDSet()[userID]
	return ok
}

func IsToolLogViewerUser(userID int64) bool {
	return userID == toolLogViewerUserID
}

// IsDeveloperPermissionBypass 路由层：开发者专用权限不走角色配置，按固定用户/白名单直接判断。
func IsDeveloperPermissionBypass(userID int64, permCode string) bool {
	if permCode == "tool_log:read" || permCode == "feedback:read" {
		return IsToolLogViewerUser(userID)
	}
	return IsBuiltInDeveloperUser(userID) && IsDeveloperOnlyPermission(permCode)
}

func builtInDeveloperIDSet() map[int64]struct{} {
	rawIDs := os.Getenv(envLIMSDeveloperUserIDs)
	rawSingle := os.Getenv(envLIMSDeveloperUserID)
	fp := fingerprintBuiltInEnv(rawIDs, rawSingle)
	builtInDevCache.mu.RLock()
	if builtInDevCache.fp == fp && builtInDevCache.byID != nil {
		m := builtInDevCache.byID
		builtInDevCache.mu.RUnlock()
		return m
	}
	builtInDevCache.mu.RUnlock()

	builtInDevCache.mu.Lock()
	defer builtInDevCache.mu.Unlock()
	if builtInDevCache.fp == fp && builtInDevCache.byID != nil {
		return builtInDevCache.byID
	}
	m := parseBuiltInIDSet(rawIDs, rawSingle)
	builtInDevCache.fp = fp
	builtInDevCache.byID = m
	return m
}

func fingerprintBuiltInEnv(rawIDs, rawSingle string) string {
	return rawIDs + "\x00" + rawSingle
}

// parseBuiltInIDSet 由 raw 字面值直接生成成员集合（不再次 Getenv）
func parseBuiltInIDSet(rawIDs, rawSingle string) map[int64]struct{} {
	if m := parseCommaSeparatedIDSet(rawIDs); m != nil {
		return m
	}
	if v := parseSingleID(rawSingle); v > 0 {
		return map[int64]struct{}{v: {}}
	}
	return map[int64]struct{}{defaultDeveloperUserID: {}}
}

// parseCommaSeparatedIDSet 解析逗号分隔正整数，去重；无有效项时返回 nil
// 用 IndexByte 逐段解析，避免 strings.Split 为各段分配切片；map 预分配为逗号数上界+1
func parseCommaSeparatedIDSet(s string) map[int64]struct{} {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	m := make(map[int64]struct{}, strings.Count(s, ",")+1)
	rest := s
	for {
		var part string
		if i := strings.IndexByte(rest, ','); i >= 0 {
			part, rest = rest[:i], rest[i+1:]
		} else {
			part, rest = rest, ""
		}
		p := strings.TrimSpace(part)
		if p != "" {
			if v, err := strconv.ParseInt(p, 10, 64); err == nil && v > 0 {
				if _, ok := m[v]; !ok {
					m[v] = struct{}{}
				}
			}
		}
		if rest == "" {
			break
		}
	}
	if len(m) == 0 {
		return nil
	}
	return m
}

func parseSingleID(s string) int64 {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil || v <= 0 {
		return 0
	}
	return v
}
