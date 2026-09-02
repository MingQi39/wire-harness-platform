package tx

import (
	"context"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

type ctxKey struct{ name string }

var ctxKeyTx = ctxKey{"tx"}

func CtxWithTx(ctx context.Context, tx *gorm.DB) context.Context {
	return context.WithValue(ctx, ctxKeyTx, tx)
}

func GetDB(ctx context.Context, fallback *gorm.DB) *gorm.DB {
	if tx, ok := ctx.Value(ctxKeyTx).(*gorm.DB); ok {
		return tx
	}
	return fallback.WithContext(ctx)
}

type TxManager struct {
	db     *gorm.DB
	logger *zap.Logger
}

func NewTxManager(db *gorm.DB, logger *zap.Logger) *TxManager {
	return &TxManager{db: db, logger: logger}
}

func (t *TxManager) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	traceID := response.TraceIDFromCtx(ctx)

	return t.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txCtx := CtxWithTx(ctx, tx)

		if err := fn(txCtx); err != nil {
			t.logger.Warn("transaction rolled back",
				zap.String("trace_id", traceID),
				zap.Error(err),
			)
			return err
		}
		return nil
	})
}

func (t *TxManager) ReadOnly(ctx context.Context, fn func(ctx context.Context) error) error {
	return t.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SET TRANSACTION READ ONLY").Error; err != nil {
			return err
		}
		txCtx := CtxWithTx(ctx, tx)
		return fn(txCtx)
	})
}
