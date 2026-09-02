package model

import "time"

type Standard struct {
	ID                  int64      `json:"id" gorm:"primaryKey"`
	TenantID            int64      `json:"tenant_id" gorm:"not null;index"`
	Status              string     `json:"status" gorm:"not null"`
	CnasPassed          string     `json:"cnas_passed" gorm:"column:cnas_passed;not null"`
	Established         string     `json:"established" gorm:"not null"`
	MethodCode          string     `json:"method_code" gorm:"column:method_code;not null"`
	MethodName          string     `json:"method_name" gorm:"column:method_name;not null"`
	MethodNameEn        string     `json:"method_name_en" gorm:"column:method_name_en;not null"`
	Capability          string     `json:"capability" gorm:"not null"`
	PublishDate         *time.Time `json:"publish_date" gorm:"column:publish_date"`
	ImplementationDate  *time.Time `json:"implementation_date" gorm:"column:implementation_date"`
	AuthorizedSignatory string     `json:"authorized_signatory" gorm:"column:authorized_signatory;not null"`
	Embedding           string     `json:"-" gorm:"column:embedding;not null;default:''"`
	CreatedBy           int64      `json:"created_by"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

func (Standard) TableName() string {
	return "standards"
}
