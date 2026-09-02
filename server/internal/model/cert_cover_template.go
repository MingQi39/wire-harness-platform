package model

import "time"

// CertCoverTemplate 证书封面 Excel 模版
type CertCoverTemplate struct {
	ID                 int64     `json:"id" gorm:"primaryKey"`
	TenantID           int64     `json:"tenant_id" gorm:"not null;index"`
	Name               string    `json:"name" gorm:"not null"`
	ExcelFileID        int64     `json:"excel_file_id" gorm:"not null;index"`
	PublishDate        time.Time `json:"publish_date" gorm:"not null"`
	ImplementationDate time.Time `json:"implementation_date" gorm:"not null"`
	Version            string    `json:"version" gorm:"not null"`
	Status             string    `json:"status" gorm:"not null"`
	LocalFilePath      string    `json:"local_file_path" gorm:"not null;default:''"`
	CreatedBy          int64     `json:"created_by" gorm:"not null;default:0"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	ExcelFile FileRecord `json:"-" gorm:"foreignKey:ExcelFileID"`
}

func (CertCoverTemplate) TableName() string {
	return "cert_cover_templates"
}
