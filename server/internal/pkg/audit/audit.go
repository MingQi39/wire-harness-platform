package audit

import (
	"context"
	"encoding/json"

	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/pkg/response"
	"github.com/hmq/wire-harness-platform/internal/pkg/tenant"
	"github.com/hmq/wire-harness-platform/internal/pkg/tx"
)

type Record struct {
	TraceID        string
	UserID         int64
	UserName       string
	Action         string
	ResourceType   string
	ResourceID     int64
	Before         interface{}
	After          interface{}
	IPAddr         string
	UserAgent      string
	Remark         string
	MenuName       string
	ButtonName     string
	APIMethod      string
	APIPath        string
	PermissionCode string
}

type Logger interface {
	Log(ctx context.Context, record Record) error
	LogBatch(ctx context.Context, records []Record) error
}

type auditLogger struct {
	db *gorm.DB
}

func NewAuditLogger(db *gorm.DB) Logger {
	return &auditLogger{db: db}
}

func (a *auditLogger) Log(ctx context.Context, record Record) error {
	if record.TraceID == "" {
		record.TraceID = response.TraceIDFromCtx(ctx)
	}

	tenantID := tenant.IDFromCtx(ctx)
	db := tx.GetDB(ctx, a.db)

	beforeJSON, err := json.Marshal(record.Before)
	if err != nil {
		fallback, _ := json.Marshal(map[string]string{"_marshal_error": err.Error()})
		beforeJSON = fallback
	}
	afterJSON, err := json.Marshal(record.After)
	if err != nil {
		fallback, _ := json.Marshal(map[string]string{"_marshal_error": err.Error()})
		afterJSON = fallback
	}

	return db.Exec(`
		INSERT INTO audit_logs (tenant_id, trace_id, user_id, user_name, action,
			resource_type, resource_id, before_data, after_data, ip_addr, user_agent, remark,
			menu_name, button_name, api_method, api_path, permission_code)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		tenantID, record.TraceID, record.UserID, record.UserName, record.Action,
		record.ResourceType, record.ResourceID, string(beforeJSON), string(afterJSON),
		record.IPAddr, record.UserAgent, record.Remark,
		record.MenuName, record.ButtonName, record.APIMethod, record.APIPath, record.PermissionCode,
	).Error
}

func (a *auditLogger) LogBatch(ctx context.Context, records []Record) error {
	for _, r := range records {
		if err := a.Log(ctx, r); err != nil {
			return err
		}
	}
	return nil
}
