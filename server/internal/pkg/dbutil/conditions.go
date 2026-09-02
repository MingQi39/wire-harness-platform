package dbutil

import "gorm.io/gorm"

// Condition 有序的 WHERE 子句，避免 map 遍历产生不确定 SQL 日志。
type Condition struct {
	Query string
	Arg   interface{}
}

// ApplyConditions 将有序 Condition 切片应用到 *gorm.DB。
func ApplyConditions(db *gorm.DB, conds []Condition) *gorm.DB {
	for _, c := range conds {
		db = db.Where(c.Query, c.Arg)
	}
	return db
}
