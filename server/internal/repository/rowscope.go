package repository

import (
	"context"

	"gorm.io/gorm"
)

// ApplySelfCreatedByOrLegacy 历史保留：当前已取消数据范围过滤，仅保留内置开发者可见性过滤。
func ApplySelfCreatedByOrLegacy(ctx context.Context, db *gorm.DB, col string) *gorm.DB {
	return applyBuiltInDeveloperUserVisibility(ctx, db, col)
}

// ApplySelfCreatedByOrLegacyWrite 写路径：内置开发者仅可修改自己创建数据；其余用户不可修改内置开发者数据。
func ApplySelfCreatedByOrLegacyWrite(ctx context.Context, db *gorm.DB, col string) *gorm.DB {
	return applyBuiltInDeveloperUserWriteScope(ctx, db, col)
}

// ApplySelfCreatedByStrict 历史保留：当前已取消数据范围过滤，仅保留内置开发者可见性过滤。
func ApplySelfCreatedByStrict(ctx context.Context, db *gorm.DB, col string) *gorm.DB {
	return applyBuiltInDeveloperUserVisibility(ctx, db, col)
}

// ApplySelfCreatedByStrictWrite 写路径：内置开发者仅可修改自己创建数据；其余用户不可修改内置开发者数据。
func ApplySelfCreatedByStrictWrite(ctx context.Context, db *gorm.DB, col string) *gorm.DB {
	return applyBuiltInDeveloperUserWriteScope(ctx, db, col)
}

// ApplySelfUploadedBy files.uploaded_by
func ApplySelfUploadedBy(ctx context.Context, db *gorm.DB) *gorm.DB {
	return ApplySelfCreatedByStrict(ctx, db, "uploaded_by")
}

// ApplySelfUploadedByWrite files.uploaded_by 写路径约束。
func ApplySelfUploadedByWrite(ctx context.Context, db *gorm.DB) *gorm.DB {
	return ApplySelfCreatedByStrictWrite(ctx, db, "uploaded_by")
}

// ApplySelfAuditUser audit_logs.user_id（操作人）
func ApplySelfAuditUser(ctx context.Context, db *gorm.DB) *gorm.DB {
	return ApplySelfCreatedByStrict(ctx, db, "user_id")
}

// ApplySelfAuditUserWrite audit_logs.user_id（操作人）写路径约束。
func ApplySelfAuditUserWrite(ctx context.Context, db *gorm.DB) *gorm.DB {
	return ApplySelfCreatedByStrictWrite(ctx, db, "user_id")
}

// ApplySelfUserTable 历史保留：当前已取消数据范围过滤。
func ApplySelfUserTable(ctx context.Context, db *gorm.DB) *gorm.DB {
	return db
}

// ApplyTablePrefUser 历史保留：当前已取消数据范围过滤。
func ApplyTablePrefUser(ctx context.Context, db *gorm.DB, userID int64) *gorm.DB {
	return db
}

// ApplySystemConfigListSelf 历史保留：当前已取消数据范围过滤，仅保留内置开发者可见性过滤。
func ApplySystemConfigListSelf(ctx context.Context, db *gorm.DB) *gorm.DB {
	return applyBuiltInDeveloperUserVisibility(ctx, db, "created_by")
}
