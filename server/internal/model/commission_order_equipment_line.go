package model

import "time"

type CommissionOrderEquipmentLine struct {
	ID                  int64     `json:"id" gorm:"primaryKey"`
	TenantID            int64     `json:"tenant_id" gorm:"not null;index"`
	CommissionOrderID   int64     `json:"commission_order_id" gorm:"not null;index"`
	LineIndex           int       `json:"line_index" gorm:"not null"`
	LineID              string    `json:"line_id"`
	DeviceName          string    `json:"device_name"`
	DeviceModel         string    `json:"device_model"`
	FactoryNumber       string    `json:"factory_number"`
	ManageNumber        string    `json:"manage_number"`
	Manufacturer        string    `json:"manufacturer"`
	SampleStatus        string    `json:"sample_status"`
	Attachment          string    `json:"attachment"`
	AssignmentStatus    string    `json:"assignment_status"`
	AssigneeUserID      int64     `json:"assignee_user_id"`
	AssigneeDisplayName string    `json:"assignee_display_name"`
	CertificatePrepare  string    `json:"certificate_prepare" gorm:"type:jsonb"`
	LineData            string    `json:"line_data" gorm:"type:jsonb"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

func (CommissionOrderEquipmentLine) TableName() string {
	return "commission_order_equipment_lines"
}
