package model

import "time"

type FileRecord struct {
	ID          int64     `json:"id" gorm:"primaryKey"`
	TenantID    int64     `json:"tenant_id" gorm:"not null;index"`
	FileName    string    `json:"file_name" gorm:"not null"`
	StorageKey  string    `json:"storage_key" gorm:"uniqueIndex;not null"`
	FileSize    int64     `json:"file_size" gorm:"not null"`
	ContentType string    `json:"content_type"`
	UploadedBy  int64     `json:"uploaded_by" gorm:"not null"`
	CreatedAt   time.Time `json:"created_at"`
}

func (FileRecord) TableName() string {
	return "files"
}
