package dto

type HarnessManagementItem struct {
	ID                    int64   `json:"id"`
	ProjectID             int64   `json:"project_id"`
	HarnessName           string  `json:"harness_name"`
	HarnessNo             string  `json:"harness_no"`
	Purpose               string  `json:"purpose"`
	Status                string  `json:"status"`
	StatusLabel           string  `json:"status_label"`
	ResponsiblePerson     string  `json:"responsible_person"`
	StoredAt              *string `json:"stored_at"`
	StoredBy              string  `json:"stored_by"`
	OutboundAt            *string `json:"outbound_at"`
	OutboundBy            string  `json:"outbound_by"`
	ScrappedAt            *string `json:"scrapped_at"`
	ScrapConfirmedBy      string  `json:"scrap_confirmed_by"`
	LifecycleStatus       string  `json:"lifecycle_status"`
	LifecycleStatusLabel  string  `json:"lifecycle_status_label"`
}

type HarnessOperationLogItem struct {
	ID           int64  `json:"id"`
	Action       string `json:"action"`
	ActionLabel  string `json:"action_label"`
	OperatorName string `json:"operator_name"`
	Remark       string `json:"remark"`
	CreatedAt    string `json:"created_at"`
}

type BatchHarnessActionReq struct {
	IDs []int64 `json:"ids" binding:"required,min=1"`
}
