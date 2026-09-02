package model

import "time"

// EquipmentSampleEvent 样品出入库 / 状态与指派变更事件（可追溯）
type EquipmentSampleEvent struct {
	ID                      int64     `json:"id" gorm:"primaryKey"`
	TenantID                int64     `json:"tenant_id" gorm:"column:tenant_id;not null;index"`
	CommissionOrderID       int64     `json:"commission_order_id" gorm:"column:commission_order_id;not null;index"`
	LineID                  string    `json:"line_id" gorm:"column:line_id"`
	LineIndex               int       `json:"line_index" gorm:"column:line_index"`
	DeviceName              string    `json:"device_name" gorm:"column:device_name"`
	EventType               string    `json:"event_type" gorm:"column:event_type;not null"`
	SampleStatus            string    `json:"sample_status" gorm:"column:sample_status"`
	PrevSampleStatus        string    `json:"prev_sample_status" gorm:"column:prev_sample_status"`
	AssigneeUserID          int64     `json:"assignee_user_id" gorm:"column:assignee_user_id"`
	AssigneeDisplayName     string    `json:"assignee_display_name" gorm:"column:assignee_display_name"`
	PrevAssigneeUserID      int64     `json:"prev_assignee_user_id" gorm:"column:prev_assignee_user_id"`
	PrevAssigneeDisplayName string    `json:"prev_assignee_display_name" gorm:"column:prev_assignee_display_name"`
	ActorUserID             int64     `json:"actor_user_id" gorm:"column:actor_user_id"`
	ActorUserName           string    `json:"actor_user_name" gorm:"column:actor_user_name"`
	Summary                 string    `json:"summary" gorm:"column:summary"`
	CreatedAt               time.Time `json:"created_at" gorm:"column:created_at"`
}

func (EquipmentSampleEvent) TableName() string {
	return "commission_order_equipment_sample_events"
}
