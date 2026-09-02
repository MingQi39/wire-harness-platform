package model

import "time"

type SampleExtensionInfo struct {
	ID                int64     `json:"id" gorm:"primaryKey"`
	TenantID          int64     `json:"tenant_id" gorm:"not null;index"`
	SampleID          int64     `json:"sample_id" gorm:"not null;index"`
	Description       string    `json:"description" gorm:"not null;default:''"`
	StorageLocation   string    `json:"storage_location" gorm:"not null;default:''"`
	StorageCondition  string    `json:"storage_condition" gorm:"not null;default:''"`
	Quantity          string    `json:"quantity" gorm:"not null;default:''"`
	Unit              string    `json:"unit" gorm:"not null;default:''"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (SampleExtensionInfo) TableName() string {
	return "sample_extension_infos"
}
