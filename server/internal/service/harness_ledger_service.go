package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"go.uber.org/zap"

	"github.com/hmq/wire-harness-platform/internal/dto"
	"github.com/hmq/wire-harness-platform/internal/model"
	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/tenant"
	"github.com/hmq/wire-harness-platform/internal/repository"
)

type HarnessLedgerService struct {
	repo       *repository.HarnessLedgerRepository
	uploadRoot string
	logger     *zap.Logger
}

func NewHarnessLedgerService(repo *repository.HarnessLedgerRepository, uploadRoot string, logger *zap.Logger) *HarnessLedgerService {
	if uploadRoot == "" {
		uploadRoot = "./uploads"
	}
	return &HarnessLedgerService{repo: repo, uploadRoot: uploadRoot, logger: logger}
}

func (s *HarnessLedgerService) ListProjects(ctx context.Context, keyword string, page, pageSize int) (*dto.PaginatedHarnessProjects, error) {
	tenantID := tenant.IDFromCtx(ctx)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 200 {
		pageSize = 20
	}
	rows, total, err := s.repo.ListProjects(ctx, tenantID, keyword, page, pageSize)
	if err != nil {
		return nil, err
	}
	items := make([]dto.HarnessProjectListItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, projectToListItem(row))
	}
	return &dto.PaginatedHarnessProjects{Items: items, Total: total, Page: page, PageSize: pageSize}, nil
}

func (s *HarnessLedgerService) GetProject(ctx context.Context, id int64) (*dto.HarnessProjectDetail, error) {
	tenantID := tenant.IDFromCtx(ctx)
	row, err := s.repo.GetProject(ctx, tenantID, id)
	if err != nil {
		return nil, apperror.WrapNotFound(err, "项目不存在")
	}
	detail := &dto.HarnessProjectDetail{
		HarnessProjectListItem: projectToListItem(*row),
	}
	if row.AttachmentPath != "" {
		detail.AttachmentURL = fmt.Sprintf("/api/v1/harness-projects/%d/attachment", row.ID)
	}
	return detail, nil
}

func (s *HarnessLedgerService) CreateProject(ctx context.Context, req dto.CreateHarnessProjectReq) (*dto.HarnessProjectListItem, error) {
	tenantID := tenant.IDFromCtx(ctx)
	row := &model.HarnessProject{
		TenantID:      tenantID,
		ProjectName:   strings.TrimSpace(req.ProjectName),
		PlatformModel: strings.TrimSpace(req.PlatformModel),
		CircuitCount:  req.CircuitCount,
		SwitchCount:   req.SwitchCount,
	}
	if row.ProjectName == "" {
		return nil, apperror.WrapBizError("项目名称不能为空")
	}
	if err := s.repo.CreateProject(ctx, row); err != nil {
		return nil, err
	}
	item := projectToListItem(*row)
	return &item, nil
}

func (s *HarnessLedgerService) UpdateProject(ctx context.Context, id int64, req dto.UpdateHarnessProjectReq) error {
	tenantID := tenant.IDFromCtx(ctx)
	if _, err := s.repo.GetProject(ctx, tenantID, id); err != nil {
		return apperror.WrapNotFound(err, "项目不存在")
	}
	row := &model.HarnessProject{
		ID:            id,
		ProjectName:   strings.TrimSpace(req.ProjectName),
		PlatformModel: strings.TrimSpace(req.PlatformModel),
		CircuitCount:  req.CircuitCount,
		SwitchCount:   req.SwitchCount,
	}
	if row.ProjectName == "" {
		return apperror.WrapBizError("项目名称不能为空")
	}
	return s.repo.UpdateProject(ctx, tenantID, row)
}

func (s *HarnessLedgerService) DeleteProject(ctx context.Context, id int64) error {
	tenantID := tenant.IDFromCtx(ctx)
	return s.repo.DeleteProject(ctx, tenantID, id)
}

func (s *HarnessLedgerService) SaveAttachment(ctx context.Context, projectID int64, filename string, src io.Reader) error {
	tenantID := tenant.IDFromCtx(ctx)
	project, err := s.repo.GetProject(ctx, tenantID, projectID)
	if err != nil {
		return apperror.WrapNotFound(err, "项目不存在")
	}
	ext := strings.ToLower(filepath.Ext(filename))
	allowed := map[string]bool{".doc": true, ".docx": true, ".xls": true, ".xlsx": true, ".pdf": true}
	if !allowed[ext] {
		return apperror.WrapBizError("附件仅支持 Word、Excel、PDF")
	}
	dir := filepath.Join(s.uploadRoot, "harness", fmt.Sprintf("%d", tenantID), fmt.Sprintf("%d", projectID))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	safeName := filepath.Base(filename)
	dest := filepath.Join(dir, safeName)
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	if _, err := io.Copy(f, src); err != nil {
		return err
	}
	project.AttachmentName = safeName
	project.AttachmentPath = dest
	return s.repo.UpdateProject(ctx, tenantID, project)
}

func (s *HarnessLedgerService) OpenAttachment(ctx context.Context, projectID int64) (string, string, error) {
	tenantID := tenant.IDFromCtx(ctx)
	project, err := s.repo.GetProject(ctx, tenantID, projectID)
	if err != nil {
		return "", "", apperror.WrapNotFound(err, "项目不存在")
	}
	if project.AttachmentPath == "" {
		return "", "", apperror.WrapBizError("暂无附件")
	}
	ct := mime.TypeByExtension(filepath.Ext(project.AttachmentName))
	if ct == "" {
		ct = "application/octet-stream"
	}
	return project.AttachmentPath, ct, nil
}

func (s *HarnessLedgerService) ListItems(ctx context.Context, projectID int64) ([]dto.HarnessItemListItem, error) {
	tenantID := tenant.IDFromCtx(ctx)
	if _, err := s.repo.GetProject(ctx, tenantID, projectID); err != nil {
		return nil, apperror.WrapNotFound(err, "项目不存在")
	}
	rows, err := s.repo.ListItems(ctx, tenantID, projectID)
	if err != nil {
		return nil, err
	}
	items := make([]dto.HarnessItemListItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, itemToDTO(row))
	}
	return items, nil
}

func (s *HarnessLedgerService) GetItem(ctx context.Context, id int64) (*dto.HarnessItemListItem, error) {
	tenantID := tenant.IDFromCtx(ctx)
	row, err := s.repo.GetItem(ctx, tenantID, id)
	if err != nil {
		return nil, apperror.WrapNotFound(err, "线束不存在")
	}
	item := itemToDTO(*row)
	return &item, nil
}

func (s *HarnessLedgerService) CreateItem(ctx context.Context, projectID int64, req dto.CreateHarnessItemReq) (*dto.HarnessItemListItem, error) {
	tenantID := tenant.IDFromCtx(ctx)
	if _, err := s.repo.GetProject(ctx, tenantID, projectID); err != nil {
		return nil, apperror.WrapNotFound(err, "项目不存在")
	}
	status, err := normalizeStatus(req.Status)
	if err != nil {
		return nil, err
	}
	row := &model.HarnessItem{
		TenantID:          tenantID,
		ProjectID:         projectID,
		HarnessName:       strings.TrimSpace(req.HarnessName),
		HarnessNo:         strings.TrimSpace(req.HarnessNo),
		Purpose:           strings.TrimSpace(req.Purpose),
		Status:            status,
		ResponsiblePerson: strings.TrimSpace(req.ResponsiblePerson),
	}
	if row.HarnessName == "" {
		return nil, apperror.WrapBizError("线束名称不能为空")
	}
	if err := s.repo.CreateItem(ctx, row); err != nil {
		return nil, err
	}
	item := itemToDTO(*row)
	return &item, nil
}

func (s *HarnessLedgerService) UpdateItem(ctx context.Context, id int64, req dto.UpdateHarnessItemReq) error {
	tenantID := tenant.IDFromCtx(ctx)
	status, err := normalizeStatus(req.Status)
	if err != nil {
		return err
	}
	if _, err := s.repo.GetItem(ctx, tenantID, id); err != nil {
		return apperror.WrapNotFound(err, "线束不存在")
	}
	row := &model.HarnessItem{
		ID:                id,
		HarnessName:       strings.TrimSpace(req.HarnessName),
		HarnessNo:         strings.TrimSpace(req.HarnessNo),
		Purpose:           strings.TrimSpace(req.Purpose),
		Status:            status,
		ResponsiblePerson: strings.TrimSpace(req.ResponsiblePerson),
	}
	if row.HarnessName == "" {
		return apperror.WrapBizError("线束名称不能为空")
	}
	return s.repo.UpdateItem(ctx, tenantID, row)
}

func (s *HarnessLedgerService) DeleteItem(ctx context.Context, id int64) error {
	tenantID := tenant.IDFromCtx(ctx)
	return s.repo.DeleteItem(ctx, tenantID, id)
}

func (s *HarnessLedgerService) ImportItemsCSV(ctx context.Context, projectID int64, r io.Reader) (int, error) {
	tenantID := tenant.IDFromCtx(ctx)
	if _, err := s.repo.GetProject(ctx, tenantID, projectID); err != nil {
		return 0, apperror.WrapNotFound(err, "项目不存在")
	}
	reader := csv.NewReader(r)
	reader.FieldsPerRecord = -1
	records, err := reader.ReadAll()
	if err != nil {
		return 0, apperror.WrapBizError("CSV 解析失败")
	}
	if len(records) <= 1 {
		return 0, apperror.WrapBizError("CSV 无数据行")
	}
	var rows []model.HarnessItem
	for i, rec := range records[1:] {
		if len(rec) == 0 || strings.TrimSpace(strings.Join(rec, "")) == "" {
			continue
		}
		get := func(idx int) string {
			if idx < len(rec) {
				return strings.TrimSpace(rec[idx])
			}
			return ""
		}
		status, err := normalizeStatusLabel(get(3))
		if err != nil {
			return 0, apperror.WrapBizError(fmt.Sprintf("第 %d 行状态无效", i+2))
		}
		name := get(0)
		if name == "" {
			return 0, apperror.WrapBizError(fmt.Sprintf("第 %d 行线束名称不能为空", i+2))
		}
		rows = append(rows, model.HarnessItem{
			TenantID:          tenantID,
			ProjectID:         projectID,
			HarnessName:       name,
			HarnessNo:         get(1),
			Purpose:           get(2),
			Status:            status,
			ResponsiblePerson: get(4),
			SortOrder:         i + 1,
		})
	}
	if err := s.repo.CreateItems(ctx, rows); err != nil {
		return 0, err
	}
	return len(rows), nil
}

func (s *HarnessLedgerService) ExportItemsCSV(ctx context.Context, projectID int64, ids []int64, w io.Writer) error {
	if len(ids) == 0 {
		return apperror.WrapBizError("请选择要导出的线束")
	}
	tenantID := tenant.IDFromCtx(ctx)
	if _, err := s.repo.GetProject(ctx, tenantID, projectID); err != nil {
		return apperror.WrapNotFound(err, "项目不存在")
	}
	rows, err := s.repo.ListItemsByIDs(ctx, tenantID, ids)
	if err != nil {
		return err
	}
	filtered := make([]model.HarnessItem, 0, len(rows))
	for _, row := range rows {
		if row.ProjectID == projectID {
			filtered = append(filtered, row)
		}
	}
	if len(filtered) == 0 {
		return apperror.WrapBizError("未找到可导出的线束")
	}
	if len(filtered) != len(ids) {
		return apperror.ErrNotFound
	}
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"线束名称", "线束编号", "线束用途", "线束状态", "责任人"})
	for _, row := range filtered {
		dtoItem := itemToDTO(row)
		_ = cw.Write([]string{dtoItem.HarnessName, dtoItem.HarnessNo, dtoItem.Purpose, dtoItem.StatusLabel, dtoItem.ResponsiblePerson})
	}
	cw.Flush()
	return cw.Error()
}

func ImportTemplateCSV(w io.Writer) error {
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"线束名称", "线束编号", "线束用途", "线束状态", "责任人"})
	_ = cw.Write([]string{"示例线束", "WH-001", "主控连接", "在用", "张三"})
	cw.Flush()
	return cw.Error()
}

func projectToListItem(row model.HarnessProject) dto.HarnessProjectListItem {
	return dto.HarnessProjectListItem{
		ID:             row.ID,
		ProjectName:    row.ProjectName,
		PlatformModel:  row.PlatformModel,
		CircuitCount:   row.CircuitCount,
		SwitchCount:    row.SwitchCount,
		AttachmentName: row.AttachmentName,
		HasAttachment:  row.AttachmentPath != "",
	}
}

func itemToDTO(row model.HarnessItem) dto.HarnessItemListItem {
	return dto.HarnessItemListItem{
		ID:                row.ID,
		ProjectID:         row.ProjectID,
		HarnessName:       row.HarnessName,
		HarnessNo:         row.HarnessNo,
		Purpose:           row.Purpose,
		Status:            row.Status,
		StatusLabel:       statusLabel(row.Status),
		ResponsiblePerson: row.ResponsiblePerson,
	}
}

func statusLabel(status string) string {
	switch status {
	case model.HarnessStatusInUse:
		return "在用"
	case model.HarnessStatusIdle:
		return "空闲"
	case model.HarnessStatusScrapped:
		return "报废"
	default:
		return status
	}
}

func normalizeStatus(status string) (string, error) {
	status = strings.TrimSpace(status)
	if status == "" {
		return model.HarnessStatusIdle, nil
	}
	switch status {
	case model.HarnessStatusInUse, model.HarnessStatusIdle, model.HarnessStatusScrapped:
		return status, nil
	case "在用":
		return model.HarnessStatusInUse, nil
	case "空闲":
		return model.HarnessStatusIdle, nil
	case "报废":
		return model.HarnessStatusScrapped, nil
	default:
		return "", apperror.WrapBizError("线束状态须为：在用、空闲、报废")
	}
}

func normalizeStatusLabel(label string) (string, error) {
	return normalizeStatus(label)
}

func ParsePage(s string, def int) int {
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 {
		return def
	}
	return n
}
