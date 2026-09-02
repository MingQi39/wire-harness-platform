package service

import (
	"context"
	"time"

	"github.com/hmq/wire-harness-platform/internal/dto"
	"github.com/hmq/wire-harness-platform/internal/model"
	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/auth"
	"github.com/hmq/wire-harness-platform/internal/pkg/tenant"
	"github.com/hmq/wire-harness-platform/internal/repository"
)

type HarnessManagementService struct {
	repo *repository.HarnessLedgerRepository
}

func NewHarnessManagementService(repo *repository.HarnessLedgerRepository) *HarnessManagementService {
	return &HarnessManagementService{repo: repo}
}

func (s *HarnessManagementService) ListItemsByProject(ctx context.Context, projectID int64) ([]dto.HarnessManagementItem, error) {
	tenantID := tenant.IDFromCtx(ctx)
	if _, err := s.repo.GetProject(ctx, tenantID, projectID); err != nil {
		return nil, apperror.ErrNotFound
	}
	rows, err := s.repo.ListItems(ctx, tenantID, projectID)
	if err != nil {
		return nil, err
	}
	items := make([]dto.HarnessManagementItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, itemToManagement(row))
	}
	return items, nil
}

func (s *HarnessManagementService) StockIn(ctx context.Context, ids []int64) error {
	return s.applyAction(ctx, ids, model.OpStockIn, func(item *model.HarnessItem, now time.Time, operator string) error {
		if item.LifecycleStatus == model.LifecycleScrapped {
			return apperror.WrapBizError("已报废线束不能入库")
		}
		if item.LifecycleStatus == model.LifecycleInStock {
			return apperror.WrapBizError("线束已在库：" + item.HarnessNo)
		}
		item.LifecycleStatus = model.LifecycleInStock
		item.Status = model.HarnessStatusInUse
		item.StoredAt = &now
		item.StoredBy = operator
		return nil
	})
}

func (s *HarnessManagementService) StockOut(ctx context.Context, ids []int64) error {
	return s.applyAction(ctx, ids, model.OpStockOut, func(item *model.HarnessItem, now time.Time, operator string) error {
		if item.LifecycleStatus != model.LifecycleInStock {
			return apperror.WrapBizError("仅已入库线束可出库：" + item.HarnessNo)
		}
		item.LifecycleStatus = model.LifecycleOutStock
		item.OutboundAt = &now
		item.OutboundBy = operator
		return nil
	})
}

func (s *HarnessManagementService) Scrap(ctx context.Context, ids []int64) error {
	return s.applyAction(ctx, ids, model.OpScrap, func(item *model.HarnessItem, now time.Time, operator string) error {
		if item.LifecycleStatus == model.LifecycleScrapped {
			return apperror.WrapBizError("线束已报废：" + item.HarnessNo)
		}
		item.LifecycleStatus = model.LifecycleScrapped
		item.Status = model.HarnessStatusScrapped
		item.ScrappedAt = &now
		item.ScrapConfirmedBy = operator
		return nil
	})
}

func (s *HarnessManagementService) ListOperationLogs(ctx context.Context, itemID int64) ([]dto.HarnessOperationLogItem, error) {
	tenantID := tenant.IDFromCtx(ctx)
	if _, err := s.repo.GetItem(ctx, tenantID, itemID); err != nil {
		return nil, apperror.ErrNotFound
	}
	rows, err := s.repo.ListOperationLogs(ctx, tenantID, itemID)
	if err != nil {
		return nil, err
	}
	items := make([]dto.HarnessOperationLogItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, dto.HarnessOperationLogItem{
			ID:           row.ID,
			Action:       row.Action,
			ActionLabel:  operationActionLabel(row.Action),
			OperatorName: row.OperatorName,
			Remark:       row.Remark,
			CreatedAt:    formatDateTime(row.CreatedAt),
		})
	}
	return items, nil
}

func (s *HarnessManagementService) applyAction(
	ctx context.Context,
	ids []int64,
	action string,
	mutate func(item *model.HarnessItem, now time.Time, operator string) error,
) error {
	tenantID := tenant.IDFromCtx(ctx)
	rows, err := s.loadAndValidateIDs(ctx, tenantID, ids)
	if err != nil {
		return err
	}
	operator := auth.CurrentUserName(ctx)
	userID := auth.CurrentUserID(ctx)
	now := time.Now()
	updates := make([]model.HarnessItem, 0, len(rows))
	logs := make([]model.HarnessOperationLog, 0, len(rows))

	for i := range rows {
		item := rows[i]
		if err := mutate(&item, now, operator); err != nil {
			return err
		}
		updates = append(updates, item)
		uid := userID
		logs = append(logs, model.HarnessOperationLog{
			TenantID:       tenantID,
			HarnessItemID:  item.ID,
			Action:         action,
			OperatorName:   operator,
			OperatorUserID: &uid,
			CreatedAt:      now,
		})
	}
	return s.repo.ApplyLifecycleUpdates(ctx, updates, logs)
}

func (s *HarnessManagementService) loadAndValidateIDs(ctx context.Context, tenantID int64, ids []int64) ([]model.HarnessItem, error) {
	if len(ids) == 0 {
		return nil, apperror.WrapBizError("请选择至少一条线束")
	}
	rows, err := s.repo.ListItemsByIDs(ctx, tenantID, ids)
	if err != nil {
		return nil, err
	}
	if len(rows) != len(ids) {
		return nil, apperror.ErrNotFound
	}
	return rows, nil
}

func itemToManagement(row model.HarnessItem) dto.HarnessManagementItem {
	return dto.HarnessManagementItem{
		ID:               row.ID,
		ProjectID:        row.ProjectID,
		HarnessName:      row.HarnessName,
		HarnessNo:        row.HarnessNo,
		Purpose:          row.Purpose,
		StoredAt:         formatTimePtr(row.StoredAt),
		StoredBy:         row.StoredBy,
		OutboundAt:       formatTimePtr(row.OutboundAt),
		OutboundBy:       row.OutboundBy,
		ScrappedAt:       formatTimePtr(row.ScrappedAt),
		ScrapConfirmedBy: row.ScrapConfirmedBy,
		LifecycleStatus:  row.LifecycleStatus,
	}
}

func operationActionLabel(action string) string {
	switch action {
	case model.OpStockIn:
		return "线束入库"
	case model.OpStockOut:
		return "线束出库"
	case model.OpScrap:
		return "线束报废"
	case model.OpLabelPrint:
		return "标签打印"
	default:
		return action
	}
}

func formatTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := formatDateTime(*t)
	return &s
}

func formatDateTime(t time.Time) string {
	return t.In(time.Local).Format("2006-01-02 15:04:05")
}
