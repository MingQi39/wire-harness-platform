package model

import "time"

type AsyncTask struct {
	ID          string     `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	TenantID    int64      `json:"tenant_id" gorm:"not null;index"`
	TraceID     string     `json:"trace_id" gorm:"not null"`
	Type        string     `json:"type" gorm:"not null"`
	Status      string     `json:"status" gorm:"default:PENDING;not null"`
	Priority    int        `json:"priority" gorm:"default:0"`
	Payload     string     `json:"payload" gorm:"type:jsonb;not null"`
	Result      string     `json:"result" gorm:"type:jsonb"`
	Error       string     `json:"error"`
	RetryCount  int        `json:"retry_count" gorm:"default:0"`
	MaxRetry    int        `json:"max_retry" gorm:"default:3"`
	ScheduledAt *time.Time `json:"scheduled_at"`
	LockedBy    string     `json:"locked_by"`
	LockedAt    *time.Time `json:"locked_at"`
	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`
	CreatedBy   int64      `json:"created_by" gorm:"not null"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (AsyncTask) TableName() string {
	return "async_tasks"
}
