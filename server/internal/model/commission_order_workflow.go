package model

import "time"

// CommissionOrderWorkflow 委托单审核流程状态（与 commission_orders 1:1）
type CommissionOrderWorkflow struct {
	ID                        int64     `json:"id" gorm:"primaryKey"`
	TenantID                  int64     `json:"tenant_id" gorm:"not null;index"`
	CommissionOrderID         int64     `json:"commission_order_id" gorm:"not null;uniqueIndex"`
	Step                      int16     `json:"step" gorm:"not null"`
	Status                    string    `json:"status" gorm:"not null"`
	CurrentAssigneeUserID     int64     `json:"current_assignee_user_id" gorm:"not null;index"`
	FirstRoundCompletedBy     int64     `json:"first_round_completed_by" gorm:"not null"`
	SecondAssigneeUserID      int64     `json:"second_assignee_user_id" gorm:"not null"`
	CreatedAt                 time.Time `json:"created_at"`
	UpdatedAt                 time.Time `json:"updated_at"`
}

func (CommissionOrderWorkflow) TableName() string {
	return "commission_order_workflows"
}

// CommissionOrderWorkflowEvent 流程时间线事件
type CommissionOrderWorkflowEvent struct {
	ID                 int64     `json:"id" gorm:"primaryKey"`
	TenantID           int64     `json:"tenant_id" gorm:"not null;index"`
	WorkflowID         int64     `json:"workflow_id" gorm:"not null;index"`
	Kind               string    `json:"kind" gorm:"not null"`
	ActorUserID        int64     `json:"actor_user_id" gorm:"not null"`
	ActorUserName      string    `json:"actor_user_name" gorm:"not null"`
	Opinion            string    `json:"opinion" gorm:"type:text"`
	AssigneeUserID     *int64    `json:"assignee_user_id"`
	AssigneeUserName   string    `json:"assignee_user_name"`
	CreatedAt          time.Time `json:"created_at"`
}

func (CommissionOrderWorkflowEvent) TableName() string {
	return "commission_order_workflow_events"
}
