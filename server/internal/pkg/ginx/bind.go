package ginx

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

// ParamID 解析路由 :id 参数，失败时自动响应 400 并返回 false。
func ParamID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, apperror.WrapError(apperror.ErrBadRequest, "id 参数无效"))
		return 0, false
	}
	return id, true
}

// BindJSON 绑定 JSON body 到目标结构体，失败时自动响应 400 并返回 false。
func BindJSON[T any](c *gin.Context) (*T, bool) {
	var req T
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, apperror.WrapError(apperror.ErrBadRequest, formatBindError(err, req)))
		return nil, false
	}
	return &req, true
}

// BindQuery 绑定 Query 参数到目标结构体，失败时自动响应 400 并返回 false。
func BindQuery[T any](c *gin.Context) (*T, bool) {
	var req T
	if err := c.ShouldBindQuery(&req); err != nil {
		response.Fail(c, apperror.WrapError(apperror.ErrBadRequest, formatBindError(err, req)))
		return nil, false
	}
	return &req, true
}

// UpdatedAtQuery 解析必填 updated_at；删除/更新类写操作必须携带乐观锁 token。
func UpdatedAtQuery(c *gin.Context) (*time.Time, bool) {
	raw := strings.TrimSpace(c.Query("updated_at"))
	if raw == "" {
		response.Fail(c, apperror.WrapError(apperror.ErrBadRequest, "updated_at 不能为空"))
		return nil, false
	}
	t, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		response.Fail(c, apperror.WrapError(apperror.ErrBadRequest, "updated_at 格式无效"))
		return nil, false
	}
	return &t, true
}

func formatBindError(err error, sample any) string {
	var syntaxErr *json.SyntaxError
	if errors.As(err, &syntaxErr) {
		return "JSON 格式错误"
	}

	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		fieldName := normalizeJSONFieldPath(typeErr.Field)
		if fieldName == "" {
			fieldName = "字段"
		}
		return fmt.Sprintf("%s 类型错误", fieldName)
	}

	var validationErrs validator.ValidationErrors
	if errors.As(err, &validationErrs) {
		fieldMap := make(map[string]string)
		collectFieldNames(reflect.TypeOf(sample), fieldMap)
		messages := make([]string, 0, len(validationErrs))
		for _, fe := range validationErrs {
			fieldName := fieldMap[fe.Field()]
			if fieldName == "" {
				fieldName = toSnakeCase(fe.Field())
			}
			messages = append(messages, validationMessage(fieldName, fe))
		}
		if len(messages) > 0 {
			return strings.Join(messages, "；")
		}
	}

	return "请求参数格式错误"
}

func validationMessage(fieldName string, fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s 为必填项", fieldName)
	case "min":
		switch fe.Kind() {
		case reflect.String:
			return fmt.Sprintf("%s 长度至少 %s 位", fieldName, fe.Param())
		case reflect.Slice, reflect.Array, reflect.Map:
			return fmt.Sprintf("%s 至少包含 %s 项", fieldName, fe.Param())
		default:
			return fmt.Sprintf("%s 不能小于 %s", fieldName, fe.Param())
		}
	case "max":
		switch fe.Kind() {
		case reflect.String:
			return fmt.Sprintf("%s 长度不能超过 %s 位", fieldName, fe.Param())
		case reflect.Slice, reflect.Array, reflect.Map:
			return fmt.Sprintf("%s 最多包含 %s 项", fieldName, fe.Param())
		default:
			return fmt.Sprintf("%s 不能大于 %s", fieldName, fe.Param())
		}
	case "oneof":
		return fmt.Sprintf("%s 仅支持 %s", fieldName, strings.ReplaceAll(fe.Param(), " ", "/"))
	case "email":
		return fmt.Sprintf("%s 格式不正确", fieldName)
	case "gt":
		return fmt.Sprintf("%s 必须大于 %s", fieldName, fe.Param())
	default:
		return fmt.Sprintf("%s 参数不合法", fieldName)
	}
}

func collectFieldNames(t reflect.Type, fields map[string]string) {
	for t.Kind() == reflect.Pointer {
		t = t.Elem()
	}
	if t.Kind() != reflect.Struct {
		return
	}
	for i := range t.NumField() {
		f := t.Field(i)
		if f.Anonymous {
			collectFieldNames(f.Type, fields)
			continue
		}
		name := firstNonEmptyTagName(f.Tag.Get("json"), f.Tag.Get("form"))
		if name == "-" {
			continue
		}
		if name == "" {
			name = toSnakeCase(f.Name)
		}
		fields[f.Name] = name
	}
}

func firstNonEmptyTagName(tags ...string) string {
	for _, tag := range tags {
		if tag == "" {
			continue
		}
		parts := strings.Split(tag, ",")
		if len(parts) == 0 {
			continue
		}
		if parts[0] != "" {
			return parts[0]
		}
	}
	return ""
}

func normalizeJSONFieldPath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	segs := strings.Split(path, ".")
	for i := range segs {
		segs[i] = toSnakeCase(segs[i])
	}
	return strings.Join(segs, ".")
}

func toSnakeCase(s string) string {
	if s == "" {
		return ""
	}
	var b strings.Builder
	for i, r := range s {
		if unicode.IsUpper(r) {
			if i > 0 {
				b.WriteByte('_')
			}
			b.WriteRune(unicode.ToLower(r))
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}
