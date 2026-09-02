package dto

import "time"

type LoginReq struct {
	// TenantCode 可选：不传时按用户名在全库匹配租户；多企业同登录名且密码均匹配时需传此字段消歧。
	TenantCode string `json:"tenant_code" binding:"omitempty"`
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
}

type LoginResp struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token,omitempty"`
	Permissions  []string `json:"permissions,omitempty"`
	UserName     string   `json:"user_name,omitempty"`
	UserID       int64    `json:"user_id"`
	TenantID     int64    `json:"tenant_id"`
	IndustryType string   `json:"industry_type"`
}

// RefreshReq Electron 等无法携带 Cookie 的客户端通过 body 传递 refresh token
type RefreshReq struct {
	RefreshToken string `json:"refresh_token"`
}

type RegisterReq struct {
	TenantCode string `json:"tenant_code" binding:"required"`
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
	Name       string `json:"name" binding:"required"`
	Email      string `json:"email" binding:"omitempty,email"`
}

type ChangePasswordReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

type VerifyPasswordReq struct {
	Password string `json:"password" binding:"required"`
}

type UpdateProfileReq struct {
	Name      *string    `json:"name" binding:"omitempty"`
	Email     *string    `json:"email" binding:"omitempty,email"`
	UpdatedAt *time.Time `json:"updated_at" binding:"required"`
}

type ProfileResp struct {
	ID              int64     `json:"id"`
	Username        string    `json:"username"`
	Name            string    `json:"name"`
	Email           string    `json:"email"`
	SignatureFileID *int64    `json:"signature_file_id"`
	Roles           []string  `json:"roles"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type ErrorReportReq struct {
	TraceID   string `json:"trace_id"`
	Type      string `json:"type"`
	Message   string `json:"message"`
	Stack     string `json:"stack"`
	URL       string `json:"url"`
	UserAgent string `json:"user_agent"`
	Timestamp string `json:"timestamp"`
}
