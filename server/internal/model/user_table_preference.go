package model

import "time"

// UserTablePreference 用户表格列偏好（按租户 + 用户 + table_key 唯一）
type UserTablePreference struct {
	ID            int64     `json:"id" gorm:"primaryKey"`
	TenantID      int64     `json:"tenant_id" gorm:"not null;index"`
	UserID        int64     `json:"user_id" gorm:"not null;index"`
	TableKey      string    `json:"table_key" gorm:"not null"`
	Preferences   []byte    `json:"preferences" gorm:"type:jsonb;not null"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (UserTablePreference) TableName() string {
	return "user_table_preferences"
}
