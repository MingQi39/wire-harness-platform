package model

import "time"

type User struct {
	ID              int64     `json:"id" gorm:"primaryKey"`
	TenantID        int64     `json:"tenant_id" gorm:"not null;index"`
	Username        string    `json:"username" gorm:"not null"`
	Password        string    `json:"-" gorm:"not null"`
	Name            string    `json:"name" gorm:"not null"`
	Email           string    `json:"email"`
	Status          string    `json:"status" gorm:"default:active"`
	SignatureFileID *int64    `json:"signature_file_id" gorm:"index"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	Roles           []Role    `json:"roles" gorm:"many2many:user_roles;"`
}

type Role struct {
	ID          int64        `json:"id" gorm:"primaryKey"`
	Name        string       `json:"name" gorm:"uniqueIndex;not null"`
	DisplayName string       `json:"display_name" gorm:"not null;default:''"`
	Description string       `json:"description"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
	Permissions []Permission `json:"permissions" gorm:"many2many:role_permissions;"`
}

type Permission struct {
	ID          int64     `json:"id" gorm:"primaryKey"`
	Code        string    `json:"code" gorm:"uniqueIndex;not null"`
	Name        string    `json:"name" gorm:"not null"`
	Resource    string    `json:"resource" gorm:"not null"`
	Action      string    `json:"action" gorm:"not null"`
	Type        string    `json:"type" gorm:"not null;default:api"`
	ParentID    int64     `json:"parent_id" gorm:"not null;default:0;index"`
	Sort        int       `json:"sort" gorm:"not null;default:0"`
	Description string    `json:"description" gorm:"not null;default:''"`
	CreatedAt   time.Time `json:"created_at"`
}
