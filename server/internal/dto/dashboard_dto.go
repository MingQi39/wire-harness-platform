package dto

type DashboardStatsResp struct {
	ProjectCount   int64                    `json:"project_count"`
	ItemCount      int64                    `json:"item_count"`
	Status         DashboardStatusStats     `json:"status"`
	RecentProjects []DashboardRecentProject `json:"recent_projects"`
}

type DashboardStatusStats struct {
	InUse    int64 `json:"in_use"`
	Idle     int64 `json:"idle"`
	Scrapped int64 `json:"scrapped"`
}

type DashboardRecentProject struct {
	ID            int64  `json:"id"`
	ProjectName   string `json:"project_name"`
	PlatformModel string `json:"platform_model"`
	ItemCount     int64  `json:"item_count"`
}
