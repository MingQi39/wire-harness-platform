package auth

import (
	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

// BizErrorDecryptPasswordFailed 密码解密失败时返回的统一业务错误；附带可操作的排查说明（生产环境为运维向简述）。
func BizErrorDecryptPasswordFailed() *apperror.AppError {
	e := apperror.WrapBizError("密码解密失败")
	if response.IsDebugSafe() {
		e.Detail = "请确认后端 PASSWORD_ENCRYPT_KEY 与前端 VITE_PASSWORD_ENCRYPT_KEY 为同一 hex 值（未设置时双方应均使用内置默认密钥）。"
	} else {
		e.Detail = "常见于前后端「密码传输加密密钥」不一致或客户端构建与当前环境不匹配。若近期变更过部署或客户端，请核对密钥配置；仍失败请联系管理员。"
	}
	return e
}
