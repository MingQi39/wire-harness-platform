package logx

import (
	"context"

	"go.uber.org/zap"

	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

// FieldsFromCtx 从 context 提取标准关联字段，供结构化日志使用。
func FieldsFromCtx(ctx context.Context) []zap.Field {
	return []zap.Field{
		zap.String("trace_id", response.TraceIDFromCtx(ctx)),
		zap.Int64("user_id", auth.CurrentUserID(ctx)),
	}
}

// LoggerFromCtx 返回带 trace_id / user_id 的 logger 副本；原始 logger 为 nil 时返回 Nop。
func LoggerFromCtx(logger *zap.Logger, ctx context.Context) *zap.Logger {
	if logger == nil {
		return zap.NewNop()
	}
	return logger.With(FieldsFromCtx(ctx)...)
}

// LogError 标准化错误日志，自动附加 trace_id 和 user_id。
func LogError(logger *zap.Logger, ctx context.Context, msg string, err error, extra ...zap.Field) {
	fields := make([]zap.Field, 0, len(extra)+3)
	fields = append(fields,
		zap.String("trace_id", response.TraceIDFromCtx(ctx)),
		zap.Int64("user_id", auth.CurrentUserID(ctx)),
		zap.Error(err),
	)
	fields = append(fields, extra...)
	logger.Error(msg, fields...)
}

// LogWarn 标准化 warn 日志，自动附加 trace_id 和 user_id。
func LogWarn(logger *zap.Logger, ctx context.Context, msg string, extra ...zap.Field) {
	fields := make([]zap.Field, 0, len(extra)+2)
	fields = append(fields, FieldsFromCtx(ctx)...)
	fields = append(fields, extra...)
	logger.Warn(msg, fields...)
}

// LogInfo 标准化 info 日志，自动附加 trace_id 和 user_id。
func LogInfo(logger *zap.Logger, ctx context.Context, msg string, extra ...zap.Field) {
	fields := make([]zap.Field, 0, len(extra)+2)
	fields = append(fields, FieldsFromCtx(ctx)...)
	fields = append(fields, extra...)
	logger.Info(msg, fields...)
}
