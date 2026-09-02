package model

import "time"

type CertificateModificationRecord struct {
	ID                 int64     `json:"id" gorm:"primaryKey"`
	TenantID           int64     `json:"tenant_id" gorm:"not null;index"`
	CommissionOrderID  int64     `json:"commission_order_id" gorm:"not null;index"`
	EquipmentLineIndex int       `json:"equipment_line_index" gorm:"not null"`
	Content            string    `json:"content" gorm:"not null"`
	// Modifier 历史展示字段，迁移期保留作为 modifier_user_id 不可用时的兜底。
	// 新写入路径与 ModifierUserID 同时维护；读取路径优先按 ModifierUserID 解析显示名。
	Modifier        string    `json:"modifier" gorm:"not null"`
	ModifierUserID  int64     `json:"modifier_user_id" gorm:"not null;default:0"`
	ModifyDate      time.Time `json:"modify_date" gorm:"not null"`
	CreatedAt       time.Time `json:"created_at"`
}

func (CertificateModificationRecord) TableName() string {
	return "certificate_modification_records"
}
