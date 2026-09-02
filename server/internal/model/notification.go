package model

import "time"

type Notification struct {
	ID        int64     `json:"id" gorm:"primaryKey"`
	TenantID  int64     `json:"tenant_id" gorm:"not null;index"`
	UserID    int64     `json:"user_id" gorm:"not null"`
	Title     string    `json:"title" gorm:"not null"`
	Content   string    `json:"content" gorm:"not null;default:''"`
	Type      string    `json:"type" gorm:"not null;default:system"`
	RefType   string    `json:"ref_type" gorm:"not null;default:''"`
	RefID     int64     `json:"ref_id" gorm:"not null;default:0"`
	IsRead    bool      `json:"is_read" gorm:"not null;default:false"`
	CreatedAt time.Time `json:"created_at"`
}

func (Notification) TableName() string {
	return "notifications"
}
