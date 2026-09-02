package model

import "time"

// WeeklyReport 周报记录
type WeeklyReport struct {
	ID          int64     `json:"id" gorm:"primaryKey"`
	TenantID    int64     `json:"tenant_id" gorm:"not null;index"`
	WeekStart   time.Time `json:"week_start" gorm:"not null"`
	WeekEnd     time.Time `json:"week_end" gorm:"not null"`
	Content     string    `json:"content" gorm:"type:text;not null"`
	GeneratedAt time.Time `json:"generated_at" gorm:"not null"`
}

func (WeeklyReport) TableName() string {
	return "weekly_reports"
}
