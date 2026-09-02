package model

import "time"

type AuditLog struct {
	ID             int64     `json:"id" gorm:"primaryKey"`
	TenantID       int64     `json:"tenant_id" gorm:"not null;index"`
	TraceID        string    `json:"trace_id" gorm:"index;not null"`
	UserID         int64     `json:"user_id" gorm:"not null"`
	UserName       string    `json:"user_name" gorm:"not null"`
	Action         string    `json:"action" gorm:"not null"`
	ResourceType   string    `json:"resource_type" gorm:"not null"`
	ResourceID     int64     `json:"resource_id" gorm:"not null"`
	BeforeData     string    `json:"before_data" gorm:"type:jsonb"`
	AfterData      string    `json:"after_data" gorm:"type:jsonb"`
	IPAddr         string    `json:"ip_addr"`
	UserAgent      string    `json:"user_agent"`
	Remark         string    `json:"remark"`
	MenuName       string    `json:"menu_name"`
	ButtonName     string    `json:"button_name"`
	APIMethod      string    `json:"api_method"`
	APIPath        string    `json:"api_path"`
	PermissionCode string    `json:"permission_code"`
	CreatedAt      time.Time `json:"created_at"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}
