package apperror

import "fmt"

type AppError struct {
	HTTPStatus int    `json:"-"`
	Code       int    `json:"code"`
	Message    string `json:"message"`
	Detail     string `json:"detail,omitempty"`
}

func (e *AppError) Error() string {
	if e.Detail != "" {
		return fmt.Sprintf("%s: %s", e.Message, e.Detail)
	}
	return e.Message
}

func (e *AppError) Is(target error) bool {
	t, ok := target.(*AppError)
	return ok && e.Code == t.Code
}

var (
	ErrBadRequest      = &AppError{HTTPStatus: 400, Code: 40000, Message: "请求参数错误"}
	ErrValidation      = &AppError{HTTPStatus: 400, Code: 40001, Message: "参数校验失败"}
	// ErrLoginTenantAmbiguous 同登录名在多租户下无法唯一确定账号
	ErrLoginTenantAmbiguous = &AppError{HTTPStatus: 400, Code: 40002, Message: "该登录名在多个企业中存在且无法唯一识别，请联系管理员或指定企业编码"}
	ErrUnauthorized    = &AppError{HTTPStatus: 401, Code: 40100, Message: "未登录或登录已过期"}
	ErrInvalidToken    = &AppError{HTTPStatus: 401, Code: 40101, Message: "Token 无效"}
	// ErrInvalidLoginCredentials 登录时用户名或密码不匹配（与 WrapBizError 区分：使用真实 HTTP 401）
	ErrInvalidLoginCredentials = &AppError{HTTPStatus: 401, Code: 40102, Message: "用户名或密码错误"}
	// ErrAccountDisabled 账号存在但被停用
	ErrAccountDisabled = &AppError{HTTPStatus: 403, Code: 40301, Message: "账号已被禁用"}
	ErrForbidden       = &AppError{HTTPStatus: 403, Code: 40300, Message: "没有操作权限"}
	ErrNotFound        = &AppError{HTTPStatus: 404, Code: 40400, Message: "资源不存在"}
	ErrConflict        = &AppError{HTTPStatus: 409, Code: 40900, Message: "资源冲突"}
	ErrTooManyRequests = &AppError{HTTPStatus: 429, Code: 42900, Message: "请求过于频繁"}
	ErrInternal        = &AppError{HTTPStatus: 500, Code: 50000, Message: "服务器内部错误"}
	ErrServiceUnavail  = &AppError{HTTPStatus: 503, Code: 50300, Message: "服务暂时不可用"}
)

// WrapBizError 包装业务校验错误，HTTP 固定 200，错误信息通过 code + message 传递给前端
func WrapBizError(detail string) *AppError {
	return &AppError{HTTPStatus: 200, Code: 40000, Message: detail}
}

func WrapError(base *AppError, detail string) *AppError {
	return &AppError{
		HTTPStatus: base.HTTPStatus,
		Code:       base.Code,
		Message:    base.Message,
		Detail:     detail,
	}
}
