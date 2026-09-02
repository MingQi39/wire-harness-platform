package dbutil

import "strings"

// escapeLike 转义 PostgreSQL LIKE / ILIKE 模式中的特殊字符（%、_、\），
// 防止用户输入改变匹配语义。
func escapeLike(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}

// WrapLike 返回 "%<escaped>%" 形式的模糊匹配值。
func WrapLike(s string) string {
	return "%" + escapeLike(s) + "%"
}
