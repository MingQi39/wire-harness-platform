package model

import "time"

type HarnessProject struct {
	ID             int64     `gorm:"primaryKey"`
	TenantID       int64     `gorm:"column:tenant_id;not null"`
	ProjectName    string    `gorm:"column:project_name"`
	PlatformModel  string    `gorm:"column:platform_model"`
	CircuitCount   int       `gorm:"column:circuit_count"`
	SwitchCount    int       `gorm:"column:switch_count"`
	AttachmentName string    `gorm:"column:attachment_name"`
	AttachmentPath string    `gorm:"column:attachment_path"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (HarnessProject) TableName() string { return "harness_projects" }

type HarnessItem struct {
	ID                int64      `gorm:"primaryKey"`
	TenantID          int64      `gorm:"column:tenant_id;not null"`
	ProjectID         int64      `gorm:"column:project_id;not null"`
	HarnessName       string     `gorm:"column:harness_name"`
	HarnessNo         string     `gorm:"column:harness_no"`
	Purpose           string     `gorm:"column:purpose"`
	Status            string     `gorm:"column:status"`
	ResponsiblePerson string     `gorm:"column:responsible_person"`
	LifecycleStatus   string     `gorm:"column:lifecycle_status"`
	StoredAt          *time.Time `gorm:"column:stored_at"`
	StoredBy          string     `gorm:"column:stored_by"`
	OutboundAt        *time.Time `gorm:"column:outbound_at"`
	OutboundBy        string     `gorm:"column:outbound_by"`
	ScrappedAt        *time.Time `gorm:"column:scrapped_at"`
	ScrapConfirmedBy  string     `gorm:"column:scrap_confirmed_by"`
	SortOrder         int        `gorm:"column:sort_order"`
	CreatedAt         time.Time  `gorm:"column:created_at"`
	UpdatedAt         time.Time  `gorm:"column:updated_at"`
}

func (HarnessItem) TableName() string { return "harness_items" }

type HarnessOperationLog struct {
	ID             int64     `gorm:"primaryKey"`
	TenantID       int64     `gorm:"column:tenant_id;not null"`
	HarnessItemID  int64     `gorm:"column:harness_item_id;not null"`
	Action         string    `gorm:"column:action"`
	OperatorName   string    `gorm:"column:operator_name"`
	OperatorUserID *int64    `gorm:"column:operator_user_id"`
	Remark         string    `gorm:"column:remark"`
	CreatedAt      time.Time `gorm:"column:created_at"`
}

func (HarnessOperationLog) TableName() string { return "harness_operation_logs" }

const (
	HarnessStatusInUse    = "in_use"
	HarnessStatusIdle     = "idle"
	HarnessStatusScrapped = "scrapped"

	LifecyclePending  = "pending"
	LifecycleInStock  = "in_stock"
	LifecycleOutStock = "out_stock"
	LifecycleScrapped = "scrapped"

	OpStockIn     = "stock_in"
	OpStockOut    = "stock_out"
	OpScrap       = "scrap"
	OpLabelPrint  = "label_print"
)
