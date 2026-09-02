package response

import (
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
)

// bestAppErrorForFail 从错误链中提取用于 JSON 响应的 *apperror.AppError。
// 背景：handlers 常用 fmt.Errorf("上下文: %w", apperror.WrapError(...))；
// Go 的 errors.As 会与全局哨兵 ErrNotFound 通过 Code 匹配到「无 Detail」的那份，
// 导致客户端只看到 message、detail 字段缺失。
func bestAppErrorForFail(err error) *apperror.AppError {
	var lastAny *apperror.AppError
	var lastWithDetail *apperror.AppError
	for e := err; e != nil; e = errors.Unwrap(e) {
		if ae, ok := e.(*apperror.AppError); ok {
			lastAny = ae
			if ae.Detail != "" {
				lastWithDetail = ae
			}
		}
	}
	if lastWithDetail != nil {
		return lastWithDetail
	}
	return lastAny
}

// IsDebugSafe 仅当 APP_ENV 显式设置为 development 时才允许返回内部错误详情
func IsDebugSafe() bool {
	return strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV"))) == "development"
}

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Detail  string      `json:"detail,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	TraceID string      `json:"trace_id,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "ok",
		Data:    data,
		TraceID: TraceIDFromCtx(c.Request.Context()),
	})
}

func SuccessWithPage(c *gin.Context, list interface{}, total int64, page, pageSize int) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "ok",
		Data: gin.H{
			"list":      list,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
		TraceID: TraceIDFromCtx(c.Request.Context()),
	})
}

func Fail(c *gin.Context, err error) {
	traceID := TraceIDFromCtx(c.Request.Context())

	appErr := bestAppErrorForFail(err)
	if appErr != nil {
		c.JSON(appErr.HTTPStatus, Response{
			Code:    appErr.Code,
			Message: appErr.Message,
			Detail:  appErr.Detail,
			TraceID: traceID,
		})
		return
	}
	resp := Response{
		Code:    50000,
		Message: "服务器内部错误",
		TraceID: traceID,
	}
	if IsDebugSafe() {
		resp.Detail = err.Error()
	}
	c.JSON(http.StatusInternalServerError, resp)
}

// AbortJSON 终止请求并返回 JSON；自动补全 trace_id（若调用方未设置）。
func AbortJSON(c *gin.Context, httpStatus int, resp Response) {
	if resp.TraceID == "" {
		resp.TraceID = TraceIDFromCtx(c.Request.Context())
	}
	c.AbortWithStatusJSON(httpStatus, resp)
}
