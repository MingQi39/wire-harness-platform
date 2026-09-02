package handler

import (
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/hmq/wire-harness-platform/internal/dto"
	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
	"github.com/hmq/wire-harness-platform/internal/pkg/ginx"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
	"github.com/hmq/wire-harness-platform/internal/service"
)

type HarnessLedgerHandler struct {
	svc *service.HarnessLedgerService
}

func NewHarnessLedgerHandler(svc *service.HarnessLedgerService) *HarnessLedgerHandler {
	return &HarnessLedgerHandler{svc: svc}
}

func (h *HarnessLedgerHandler) ListProjects(c *gin.Context) {
	keyword := c.Query("keyword")
	page := service.ParsePage(c.DefaultQuery("page", "1"), 1)
	pageSize := service.ParsePage(c.DefaultQuery("page_size", "20"), 20)
	data, err := h.svc.ListProjects(c.Request.Context(), keyword, page, pageSize)
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, data)
}

func (h *HarnessLedgerHandler) CreateProject(c *gin.Context) {
	req, ok := ginx.BindJSON[dto.CreateHarnessProjectReq](c)
	if !ok {
		return
	}
	data, err := h.svc.CreateProject(c.Request.Context(), *req)
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, data)
}

func (h *HarnessLedgerHandler) GetProject(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	data, err := h.svc.GetProject(c.Request.Context(), id)
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, data)
}

func (h *HarnessLedgerHandler) UpdateProject(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	req, ok := ginx.BindJSON[dto.UpdateHarnessProjectReq](c)
	if !ok {
		return
	}
	if err := h.svc.UpdateProject(c.Request.Context(), id, *req); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, nil)
}

func (h *HarnessLedgerHandler) DeleteProject(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	if err := h.svc.DeleteProject(c.Request.Context(), id); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, nil)
}

func (h *HarnessLedgerHandler) UploadAttachment(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		response.Fail(c, err)
		return
	}
	f, err := file.Open()
	if err != nil {
		response.Fail(c, err)
		return
	}
	defer f.Close()
	if err := h.svc.SaveAttachment(c.Request.Context(), id, file.Filename, f); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, gin.H{"filename": file.Filename})
}

func (h *HarnessLedgerHandler) DownloadAttachment(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	path, ct, err := h.svc.OpenAttachment(c.Request.Context(), id)
	if err != nil {
		response.Fail(c, err)
		return
	}
	c.Header("Content-Type", ct)
	c.Header("Content-Disposition", "attachment; filename="+filepathBase(path))
	c.File(path)
}

func (h *HarnessLedgerHandler) ListItems(c *gin.Context) {
	projectID, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	data, err := h.svc.ListItems(c.Request.Context(), projectID)
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, data)
}

func (h *HarnessLedgerHandler) CreateItem(c *gin.Context) {
	projectID, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	req, ok := ginx.BindJSON[dto.CreateHarnessItemReq](c)
	if !ok {
		return
	}
	data, err := h.svc.CreateItem(c.Request.Context(), projectID, *req)
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, data)
}

func (h *HarnessLedgerHandler) GetItem(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	data, err := h.svc.GetItem(c.Request.Context(), id)
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, data)
}

func (h *HarnessLedgerHandler) UpdateItem(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	req, ok := ginx.BindJSON[dto.UpdateHarnessItemReq](c)
	if !ok {
		return
	}
	if err := h.svc.UpdateItem(c.Request.Context(), id, *req); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, nil)
}

func (h *HarnessLedgerHandler) DeleteItem(c *gin.Context) {
	id, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	if err := h.svc.DeleteItem(c.Request.Context(), id); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, nil)
}

func (h *HarnessLedgerHandler) ImportItems(c *gin.Context) {
	projectID, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		response.Fail(c, err)
		return
	}
	f, err := file.Open()
	if err != nil {
		response.Fail(c, err)
		return
	}
	defer f.Close()
	count, err := h.svc.ImportItemsCSV(c.Request.Context(), projectID, f)
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, gin.H{"imported": count})
}

func (h *HarnessLedgerHandler) ExportItems(c *gin.Context) {
	projectID, err := parseIDParam(c, "id")
	if err != nil {
		return
	}
	ids, err := parseIDsQuery(c.Query("ids"))
	if err != nil {
		response.Fail(c, err)
		return
	}
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=harness-items.csv")
	c.Writer.Write([]byte{0xEF, 0xBB, 0xBF})
	if err := h.svc.ExportItemsCSV(c.Request.Context(), projectID, ids, c.Writer); err != nil {
		response.Fail(c, err)
		return
	}
}

func (h *HarnessLedgerHandler) ImportTemplate(c *gin.Context) {
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=harness-import-template.csv")
	c.Writer.Write([]byte{0xEF, 0xBB, 0xBF})
	_ = service.ImportTemplateCSV(c.Writer)
}

func parseIDParam(c *gin.Context, name string) (int64, error) {
	id, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil || id <= 0 {
		response.AbortJSON(c, http.StatusBadRequest, response.Response{Code: 40000, Message: "无效的 id"})
		return 0, err
	}
	return id, nil
}

func parseIDsQuery(raw string) ([]int64, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, apperror.WrapBizError("请选择要导出的线束")
	}
	parts := strings.Split(raw, ",")
	ids := make([]int64, 0, len(parts))
	seen := make(map[int64]struct{}, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		id, err := strconv.ParseInt(part, 10, 64)
		if err != nil || id <= 0 {
			return nil, apperror.WrapBizError("无效的导出 id")
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return nil, apperror.WrapBizError("请选择要导出的线束")
	}
	return ids, nil
}

func filepathBase(path string) string {
	for i := len(path) - 1; i >= 0; i-- {
		if path[i] == os.PathSeparator || path[i] == '/' {
			return path[i+1:]
		}
	}
	return path
}
