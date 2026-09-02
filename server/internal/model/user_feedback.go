package model

import "time"

type UserFeedback struct {
	ID                int64     `json:"id" gorm:"primaryKey"`
	TenantID          int64     `json:"tenant_id" gorm:"not null;index"`
	UserID            int64     `json:"user_id" gorm:"not null;index"`
	UserName          string    `json:"user_name" gorm:"not null;default:''"`
	MenuKey           string    `json:"menu_key" gorm:"not null;default:''"`
	MenuLabel         string    `json:"menu_label" gorm:"not null;default:''"`
	FeedbackType      string    `json:"feedback_type" gorm:"not null;default:bug"`
	Content           string    `json:"content" gorm:"not null;default:''"`
	AttachmentFileIDs string    `json:"attachment_file_ids" gorm:"column:attachment_file_ids;type:jsonb;not null;default:'[]'"`
	CurrentPath       string    `json:"current_path" gorm:"not null;default:''"`
	AppVersion        string    `json:"app_version" gorm:"not null;default:''"`
	ClientInfo        string    `json:"client_info" gorm:"not null;default:''"`
	Status                         string     `json:"status" gorm:"not null;default:pending"`
	DeveloperReply                 string     `json:"developer_reply" gorm:"not null;default:''"`
	DeveloperReplyAttachmentFileIDs string    `json:"developer_reply_attachment_file_ids" gorm:"column:developer_reply_attachment_file_ids;type:jsonb;not null;default:'[]'"`
	DeveloperRepliedAt             *time.Time `json:"developer_replied_at"`
	CreatedAt                      time.Time  `json:"created_at"`
	UpdatedAt                      time.Time  `json:"updated_at"`
}

func (UserFeedback) TableName() string {
	return "user_feedbacks"
}
