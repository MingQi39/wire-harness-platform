package service

import (
	"context"

	"github.com/hmq/wire-harness-platform/internal/dto"
	"github.com/hmq/wire-harness-platform/internal/pkg/tenant"
	"github.com/hmq/wire-harness-platform/internal/repository"
)

type DashboardService struct {
	repo *repository.HarnessLedgerRepository
}

func NewDashboardService(repo *repository.HarnessLedgerRepository) *DashboardService {
	return &DashboardService{repo: repo}
}

func (s *DashboardService) GetStats(ctx context.Context) (*dto.DashboardStatsResp, error) {
	tenantID := tenant.IDFromCtx(ctx)

	stats, err := s.repo.DashboardStats(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	projects, err := s.repo.ListRecentProjects(ctx, tenantID, 5)
	if err != nil {
		return nil, err
	}

	recentProjects := make([]dto.DashboardRecentProject, 0, len(projects))
	for _, row := range projects {
		recentProjects = append(recentProjects, dto.DashboardRecentProject{
			ID:            row.ID,
			ProjectName:   row.ProjectName,
			PlatformModel: row.PlatformModel,
			ItemCount:     row.ItemCount,
		})
	}

	return &dto.DashboardStatsResp{
		ProjectCount: stats.ProjectCount,
		ItemCount:    stats.ItemCount,
		Status: dto.DashboardStatusStats{
			InUse:    stats.StatusInUse,
			Idle:     stats.StatusIdle,
			Scrapped: stats.StatusScrapped,
		},
		RecentProjects: recentProjects,
	}, nil
}
