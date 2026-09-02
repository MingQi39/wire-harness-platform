package model

import "time"

type LaboratoryLocation struct {
	ID               int64     `json:"id" gorm:"primaryKey"`
	TenantID         int64     `json:"tenant_id" gorm:"not null;index"`
	LaboratoryNo     string    `json:"laboratory_no" gorm:"column:laboratory_no;not null"`
	Department       string    `json:"department" gorm:"column:department;not null"`
	LaboratoryName   string    `json:"laboratory_name" gorm:"column:laboratory_name;not null"`
	LaboratoryNameEn string    `json:"laboratory_name_en" gorm:"column:laboratory_name_en;not null"`
	Remark           string    `json:"remark" gorm:"column:remark;not null;default:''"`
	CreatedBy        int64     `json:"created_by"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (LaboratoryLocation) TableName() string {
	return "laboratory_locations"
}
