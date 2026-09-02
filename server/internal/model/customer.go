package model

import "time"

type Customer struct {
	ID                int64     `json:"id" gorm:"primaryKey"`
	TenantID          int64     `json:"tenant_id" gorm:"not null;index"`
	CustomerName      string    `json:"customer_name" gorm:"column:customer_name;not null"`
	CustomerAddress   string    `json:"customer_address" gorm:"column:customer_address;not null"`
	CertOrgNameZh     string    `json:"cert_org_name_zh" gorm:"column:cert_org_name_zh;not null"`
	CertOrgNameEn     string    `json:"cert_org_name_en" gorm:"column:cert_org_name_en;not null"`
	CertAddressZh     string    `json:"cert_address_zh" gorm:"column:cert_address_zh;not null"`
	CertAddressEn     string    `json:"cert_address_en" gorm:"column:cert_address_en;not null"`
	Contact           string    `json:"contact" gorm:"not null"`
	Email             string    `json:"email" gorm:"not null"`
	CreatedBy         int64     `json:"created_by"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (Customer) TableName() string {
	return "customers"
}
