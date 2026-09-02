package tenant

import (
	"context"

	"gorm.io/gorm"
)

type ctxKeyTenantID struct{}

func CtxWithTenantID(ctx context.Context, tenantID int64) context.Context {
	return context.WithValue(ctx, ctxKeyTenantID{}, tenantID)
}

func IDFromCtx(ctx context.Context) int64 {
	if v, ok := ctx.Value(ctxKeyTenantID{}).(int64); ok {
		return v
	}
	return 0
}

// Scope returns a GORM scope that filters by tenant_id from the context.
func Scope(ctx context.Context) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		tenantID := IDFromCtx(ctx)
		if tenantID > 0 {
			return db.Where("tenant_id = ?", tenantID)
		}
		// Fail-closed: no tenant context means no results for business queries
		return db.Where("1 = 0")
	}
}

// ScopeTable returns a GORM scope that filters by tenant_id on a specific table.
func ScopeTable(ctx context.Context, table string) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		tenantID := IDFromCtx(ctx)
		if tenantID > 0 {
			return db.Where(table+".tenant_id = ?", tenantID)
		}
		return db.Where("1 = 0")
	}
}
