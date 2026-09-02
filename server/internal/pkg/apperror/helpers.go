package apperror

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

// WrapNotFound 将 gorm.ErrRecordNotFound 转为 ErrNotFound，并把 fmt 文案写入 Detail（便于前端区分「委托单不存在」与泛化的「资源不存在」）。
func WrapNotFound(err error, msgFmt string, args ...interface{}) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		detail := fmt.Sprintf(msgFmt, args...)
		return WrapError(ErrNotFound, detail)
	}
	return fmt.Errorf(msgFmt+": %w", append(args, err)...)
}

// IsForeignKeyViolation 判断 err 是否为 PostgreSQL 外键约束违反（SQLSTATE 23503）。
func IsForeignKeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23503"
}

// IsUniqueViolation 判断 err 是否为唯一约束违反（GORM 翻译错误或 PostgreSQL SQLSTATE 23505）。
func IsUniqueViolation(err error) bool {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
