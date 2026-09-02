package model

import "time"

type CompanyInfo struct {
	ID                      int64     `json:"id" gorm:"primaryKey"`
	TenantID                int64     `json:"tenant_id" gorm:"not null;uniqueIndex"`
	CompanyName             string    `json:"company_name" gorm:"column:company_name;not null;default:''"`
	UnifiedSocialCreditCode string    `json:"unified_social_credit_code" gorm:"column:unified_social_credit_code;not null;default:''"`
	Address                 string    `json:"address" gorm:"column:address;not null;default:''"`
	Phone                   string    `json:"phone" gorm:"column:phone;not null;default:''"`
	Email                   string    `json:"email" gorm:"column:email;not null;default:''"`
	Website                 string    `json:"website" gorm:"column:website;not null;default:''"`
	LegalRepresentative     string    `json:"legal_representative" gorm:"column:legal_representative;not null;default:''"`
	ContactPerson           string    `json:"contact_person" gorm:"column:contact_person;not null;default:''"`
	Remark                  string    `json:"remark" gorm:"column:remark;not null;default:''"`
	StampFileID             *int64    `json:"stamp_file_id" gorm:"column:stamp_file_id;index"`
	CreatedBy               int64     `json:"created_by"`
	UpdatedBy               int64     `json:"updated_by"`
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

func (CompanyInfo) TableName() string {
	return "company_infos"
}
