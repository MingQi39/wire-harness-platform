package dto

type HarnessProjectListItem struct {
	ID              int64  `json:"id"`
	ProjectName     string `json:"project_name"`
	PlatformModel   string `json:"platform_model"`
	CircuitCount    int    `json:"circuit_count"`
	SwitchCount     int    `json:"switch_count"`
	AttachmentName  string `json:"attachment_name"`
	HasAttachment   bool   `json:"has_attachment"`
}

type HarnessProjectDetail struct {
	HarnessProjectListItem
	AttachmentURL string `json:"attachment_url,omitempty"`
}

type CreateHarnessProjectReq struct {
	ProjectName   string `json:"project_name" binding:"required"`
	PlatformModel string `json:"platform_model"`
	CircuitCount  int    `json:"circuit_count"`
	SwitchCount   int    `json:"switch_count"`
}

type UpdateHarnessProjectReq struct {
	ProjectName   string `json:"project_name" binding:"required"`
	PlatformModel string `json:"platform_model"`
	CircuitCount  int    `json:"circuit_count"`
	SwitchCount   int    `json:"switch_count"`
}

type HarnessItemListItem struct {
	ID                int64  `json:"id"`
	ProjectID         int64  `json:"project_id"`
	HarnessName       string `json:"harness_name"`
	HarnessNo         string `json:"harness_no"`
	Purpose           string `json:"purpose"`
	Status            string `json:"status"`
	StatusLabel       string `json:"status_label"`
	ResponsiblePerson string `json:"responsible_person"`
}

type CreateHarnessItemReq struct {
	HarnessName       string `json:"harness_name" binding:"required"`
	HarnessNo         string `json:"harness_no"`
	Purpose           string `json:"purpose"`
	Status            string `json:"status"`
	ResponsiblePerson string `json:"responsible_person"`
}

type UpdateHarnessItemReq struct {
	HarnessName       string `json:"harness_name" binding:"required"`
	HarnessNo         string `json:"harness_no"`
	Purpose           string `json:"purpose"`
	Status            string `json:"status"`
	ResponsiblePerson string `json:"responsible_person"`
}

type PaginatedHarnessProjects struct {
	Items    []HarnessProjectListItem `json:"items"`
	Total    int64                    `json:"total"`
	Page     int                      `json:"page"`
	PageSize int                      `json:"page_size"`
}
