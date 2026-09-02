package model

import "time"

type Tenant struct {
	ID           int64      `json:"id" gorm:"primaryKey"`
	Name         string     `json:"name" gorm:"not null"`
	Code         string     `json:"code" gorm:"uniqueIndex;not null"`
	// IndustryType 行业类型，创建后不可变更。
	// 变更行业需重建租户或手动重置 system_configs 中所有行业配置。
	IndustryType string `json:"industry_type" gorm:"not null;default:'metrology'"`
	Plan         string     `json:"plan" gorm:"default:standard"`
	DBStrategy   string     `json:"db_strategy" gorm:"default:shared"`
	SchemaName   string     `json:"schema_name"`
	MaxUsers     int        `json:"max_users" gorm:"default:50"`
	MaxStorage   int64      `json:"max_storage" gorm:"default:10737418240"`
	Status       string     `json:"status" gorm:"default:active"`
	ExpiredAt    *time.Time `json:"expired_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

const (
	IndustryMetrology = "metrology"
	IndustryTesting   = "testing"
)

func (Tenant) TableName() string {
	return "tenants"
}
