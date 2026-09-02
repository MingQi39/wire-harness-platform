package model

import "time"

type SystemConfig struct {
	ID          int64     `json:"id" gorm:"primaryKey"`
	TenantID    int64     `json:"tenant_id" gorm:"not null"`
	ConfigKey   string    `json:"config_key" gorm:"not null"`
	ConfigValue string    `json:"config_value" gorm:"not null;default:''"`
	Description string    `json:"description" gorm:"not null;default:''"`
	CreatedBy   int64     `json:"created_by" gorm:"not null;default:0"`
	UpdatedBy   int64     `json:"updated_by" gorm:"not null;default:0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (SystemConfig) TableName() string {
	return "system_configs"
}
