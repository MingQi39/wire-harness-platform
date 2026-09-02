package model

import "time"

// CommissionOrder 委托单主表
type CommissionOrder struct {
	ID                    int64     `json:"id" gorm:"primaryKey"`
	TenantID              int64     `json:"tenant_id" gorm:"not null;index"`
	NumberMode            string    `json:"number_mode" gorm:"column:number_mode;not null"`
	OrderNumber           string    `json:"order_number" gorm:"column:order_number;not null"`
	CustomerID            int64     `json:"customer_id" gorm:"column:customer_id;not null;index"`
	CreatorDisplay        string    `json:"creator_display" gorm:"column:creator_display;not null"`
	BizCreatedAt          time.Time `json:"biz_created_at" gorm:"column:biz_created_at;not null"`
	BusinessStaffUserID   int64     `json:"business_staff_user_id" gorm:"column:business_staff_user_id;not null;index"`
	ServiceRequirements   string    `json:"service_requirements" gorm:"column:service_requirements;type:jsonb;not null;default:'{}'"`
	OtherRequirementsHTML string    `json:"other_requirements_html" gorm:"column:other_requirements_html;not null;default:''"`
	ImageFileIDs          string    `json:"image_file_ids" gorm:"column:image_file_ids;type:jsonb;not null"`
	AttachmentFileIDs     string    `json:"attachment_file_ids" gorm:"column:attachment_file_ids;type:jsonb;not null"`
	EquipmentLines        string    `json:"equipment_lines" gorm:"column:equipment_lines;type:jsonb;not null;default:'[]'"`
	CreatedBy             int64     `json:"created_by"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

func (CommissionOrder) TableName() string {
	return "commission_orders"
}
