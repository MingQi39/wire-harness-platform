package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/hmq/wire-harness-platform/internal/model"
)

type HarnessLedgerRepository struct {
	db *gorm.DB
}

func NewHarnessLedgerRepository(db *gorm.DB) *HarnessLedgerRepository {
	return &HarnessLedgerRepository{db: db}
}

func (r *HarnessLedgerRepository) ListProjects(ctx context.Context, tenantID int64, keyword string, page, pageSize int) ([]model.HarnessProject, int64, error) {
	q := r.db.WithContext(ctx).Model(&model.HarnessProject{}).Where("tenant_id = ?", tenantID)
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("project_name ILIKE ? OR platform_model ILIKE ?", like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []model.HarnessProject
	offset := (page - 1) * pageSize
	err := q.Order("id DESC").Offset(offset).Limit(pageSize).Find(&rows).Error
	return rows, total, err
}

func (r *HarnessLedgerRepository) GetProject(ctx context.Context, tenantID, id int64) (*model.HarnessProject, error) {
	var row model.HarnessProject
	err := r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, id).First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *HarnessLedgerRepository) CreateProject(ctx context.Context, row *model.HarnessProject) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *HarnessLedgerRepository) UpdateProject(ctx context.Context, tenantID int64, row *model.HarnessProject) error {
	return r.db.WithContext(ctx).
		Model(&model.HarnessProject{}).
		Where("tenant_id = ? AND id = ?", tenantID, row.ID).
		Updates(map[string]interface{}{
			"project_name":   row.ProjectName,
			"platform_model": row.PlatformModel,
			"circuit_count":  row.CircuitCount,
			"switch_count":   row.SwitchCount,
		}).Error
}

func (r *HarnessLedgerRepository) DeleteProject(ctx context.Context, tenantID, id int64) error {
	return r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, id).Delete(&model.HarnessProject{}).Error
}

func (r *HarnessLedgerRepository) ListItems(ctx context.Context, tenantID, projectID int64) ([]model.HarnessItem, error) {
	var rows []model.HarnessItem
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND project_id = ?", tenantID, projectID).
		Order("sort_order ASC, id ASC").
		Find(&rows).Error
	return rows, err
}

func (r *HarnessLedgerRepository) GetItem(ctx context.Context, tenantID, id int64) (*model.HarnessItem, error) {
	var row model.HarnessItem
	err := r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, id).First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *HarnessLedgerRepository) CreateItem(ctx context.Context, row *model.HarnessItem) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *HarnessLedgerRepository) CreateItems(ctx context.Context, rows []model.HarnessItem) error {
	if len(rows) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&rows).Error
}

func (r *HarnessLedgerRepository) UpdateItem(ctx context.Context, tenantID int64, row *model.HarnessItem) error {
	return r.db.WithContext(ctx).
		Model(&model.HarnessItem{}).
		Where("tenant_id = ? AND id = ?", tenantID, row.ID).
		Updates(map[string]interface{}{
			"harness_name":       row.HarnessName,
			"harness_no":         row.HarnessNo,
			"purpose":            row.Purpose,
			"status":             row.Status,
			"responsible_person": row.ResponsiblePerson,
		}).Error
}

func (r *HarnessLedgerRepository) DeleteItem(ctx context.Context, tenantID, id int64) error {
	return r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, id).Delete(&model.HarnessItem{}).Error
}

func (r *HarnessLedgerRepository) ListItemsByIDs(ctx context.Context, tenantID int64, ids []int64) ([]model.HarnessItem, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var rows []model.HarnessItem
	err := r.db.WithContext(ctx).Where("tenant_id = ? AND id IN ?", tenantID, ids).Find(&rows).Error
	return rows, err
}

func (r *HarnessLedgerRepository) ApplyLifecycleUpdates(ctx context.Context, updates []model.HarnessItem, logs []model.HarnessOperationLog) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, item := range updates {
			if err := tx.Model(&model.HarnessItem{}).
				Where("tenant_id = ? AND id = ?", item.TenantID, item.ID).
				Updates(map[string]interface{}{
					"status":             item.Status,
					"lifecycle_status":   item.LifecycleStatus,
					"stored_at":          item.StoredAt,
					"stored_by":          item.StoredBy,
					"outbound_at":        item.OutboundAt,
					"outbound_by":        item.OutboundBy,
					"scrapped_at":        item.ScrappedAt,
					"scrap_confirmed_by": item.ScrapConfirmedBy,
				}).Error; err != nil {
				return err
			}
		}
		if len(logs) > 0 {
			if err := tx.Create(&logs).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *HarnessLedgerRepository) ListOperationLogs(ctx context.Context, tenantID, itemID int64) ([]model.HarnessOperationLog, error) {
	var rows []model.HarnessOperationLog
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND harness_item_id = ?", tenantID, itemID).
		Order("created_at DESC, id DESC").
		Find(&rows).Error
	return rows, err
}

type HarnessDashboardStats struct {
	ProjectCount   int64
	ItemCount      int64
	StatusInUse    int64
	StatusIdle     int64
	StatusScrapped int64
}

type HarnessRecentProject struct {
	ID            int64
	ProjectName   string
	PlatformModel string
	ItemCount     int64
}

func (r *HarnessLedgerRepository) DashboardStats(ctx context.Context, tenantID int64) (*HarnessDashboardStats, error) {
	stats := &HarnessDashboardStats{}
	db := r.db.WithContext(ctx)

	if err := db.Model(&model.HarnessProject{}).Where("tenant_id = ?", tenantID).Count(&stats.ProjectCount).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&model.HarnessItem{}).Where("tenant_id = ?", tenantID).Count(&stats.ItemCount).Error; err != nil {
		return nil, err
	}

	type statusCount struct {
		Status string
		Count  int64
	}
	var statusRows []statusCount
	if err := db.Model(&model.HarnessItem{}).
		Select("status, COUNT(*) AS count").
		Where("tenant_id = ?", tenantID).
		Group("status").
		Scan(&statusRows).Error; err != nil {
		return nil, err
	}
	for _, row := range statusRows {
		switch row.Status {
		case model.HarnessStatusInUse:
			stats.StatusInUse = row.Count
		case model.HarnessStatusIdle:
			stats.StatusIdle = row.Count
		case model.HarnessStatusScrapped:
			stats.StatusScrapped = row.Count
		}
	}

	return stats, nil
}

func (r *HarnessLedgerRepository) ListRecentProjects(ctx context.Context, tenantID int64, limit int) ([]HarnessRecentProject, error) {
	if limit <= 0 {
		limit = 5
	}
	var rows []HarnessRecentProject
	err := r.db.WithContext(ctx).
		Table("harness_projects p").
		Select(`p.id, p.project_name, p.platform_model, COUNT(i.id) AS item_count`).
		Joins("LEFT JOIN harness_items i ON i.project_id = p.id AND i.tenant_id = p.tenant_id").
		Where("p.tenant_id = ?", tenantID).
		Group("p.id, p.project_name, p.platform_model").
		Order("p.id DESC").
		Limit(limit).
		Scan(&rows).Error
	return rows, err
}
