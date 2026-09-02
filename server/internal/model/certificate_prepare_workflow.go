package model

import "time"

// CertificatePrepareWorkflow 证书编制审核流程（委托单 × 设备行 唯一）
type CertificatePrepareWorkflow struct {
	ID                    int64     `json:"id" gorm:"primaryKey"`
	TenantID              int64     `json:"tenant_id" gorm:"not null;index"`
	CommissionOrderID     int64     `json:"commission_order_id" gorm:"not null;index"`
	EquipmentLineIndex    int       `json:"equipment_line_index" gorm:"not null"`
	Step                  int16     `json:"step" gorm:"not null"`
	Status                string    `json:"status" gorm:"not null"`
	PreparerUserID        int64     `json:"preparer_user_id" gorm:"not null"`
	CurrentAssigneeUserID int64     `json:"current_assignee_user_id" gorm:"not null;index"`
	ReviewerUserID        *int64    `json:"reviewer_user_id"`
	ReviewerUserName      string    `json:"reviewer_user_name"`
	ApproverUserID        *int64    `json:"approver_user_id"`
	ApproverUserName      string    `json:"approver_user_name"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

func (CertificatePrepareWorkflow) TableName() string {
	return "certificate_prepare_workflows"
}

// CertificatePrepareWorkflowEvent 证书编制流程时间线
type CertificatePrepareWorkflowEvent struct {
	ID               int64     `json:"id" gorm:"primaryKey"`
	TenantID         int64     `json:"tenant_id" gorm:"not null;index"`
	WorkflowID       int64     `json:"workflow_id" gorm:"not null;index"`
	Kind             string    `json:"kind" gorm:"not null"`
	ActorUserID      int64     `json:"actor_user_id" gorm:"not null"`
	ActorUserName    string    `json:"actor_user_name" gorm:"not null"`
	AssigneeUserID   *int64    `json:"assignee_user_id"`
	AssigneeUserName string    `json:"assignee_user_name"`
	CreatedAt        time.Time `json:"created_at"`
}

func (CertificatePrepareWorkflowEvent) TableName() string {
	return "certificate_prepare_workflow_events"
}
