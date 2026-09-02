package model

import "time"

type CustomerBillingInfo struct {
	ID              int64     `json:"id" gorm:"primaryKey"`
	TenantID        int64     `json:"tenant_id" gorm:"not null;index"`
	CustomerID      int64     `json:"customer_id" gorm:"not null;index"`
	InvoiceTitle    string    `json:"invoice_title" gorm:"not null;default:''"`
	TaxNo           string    `json:"tax_no" gorm:"not null;default:''"`
	BankName        string    `json:"bank_name" gorm:"not null;default:''"`
	BankAccount     string    `json:"bank_account" gorm:"not null;default:''"`
	BillingAddress  string    `json:"billing_address" gorm:"not null;default:''"`
	BillingPhone    string    `json:"billing_phone" gorm:"not null;default:''"`
	InvoiceCategory string    `json:"invoice_category" gorm:"not null;default:''"`
	RecipientEmail  string    `json:"recipient_email" gorm:"not null;default:''"`
	Remark          string    `json:"remark" gorm:"not null;default:''"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (CustomerBillingInfo) TableName() string {
	return "customer_billing_infos"
}
