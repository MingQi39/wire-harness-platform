package model

import "time"

type Sample struct {
	ID              int64     `json:"id" gorm:"primaryKey"`
	TenantID        int64     `json:"tenant_id" gorm:"not null;index"`
	SampleName      string    `json:"sample_name" gorm:"column:sample_name;not null"`
	SampleAddress   string    `json:"sample_address" gorm:"column:sample_address;not null"`
	SampleType      string    `json:"sample_type" gorm:"column:sample_type;not null"`
	Spec            string    `json:"spec" gorm:"not null"`
	Manufacturer    string    `json:"manufacturer" gorm:"not null"`
	BatchNo         string    `json:"batch_no" gorm:"column:batch_no;not null"`
	Contact         string    `json:"contact" gorm:"not null"`
	Remark          string    `json:"remark" gorm:"not null"`
	CreatedBy       int64     `json:"created_by"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (Sample) TableName() string {
	return "samples"
}
