package handler

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/hmq/wire-harness-platform/internal/dto"
	"github.com/hmq/wire-harness-platform/internal/pkg/ginx"
	"github.com/hmq/wire-harness-platform/internal/pkg/response"
	"github.com/hmq/wire-harness-platform/internal/service"
)

type HarnessManagementHandler struct {
	svc *service.HarnessManagementService
}

func NewHarnessManagementHandler(svc *service.HarnessManagementService) *HarnessManagementHandler {
	return &HarnessManagementHandler{svc: svc}
}

func (h *HarnessManagementHandler) ListItems(c *gin.Context) {
	projectID, err := parseIDParam(c, "projectId")
	if err != nil {
		return
	}
	data, err := h.svc.ListItemsByProject(c.Request.Context(), projectID)
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, data)
}

func (h *HarnessManagementHandler) StockIn(c *gin.Context) {
	h.batchAction(c, h.svc.StockIn)
}

func (h *HarnessManagementHandler) StockOut(c *gin.Context) {
	h.batchAction(c, h.svc.StockOut)
}

func (h *HarnessManagementHandler) Scrap(c *gin.Context) {
	h.batchAction(c, h.svc.Scrap)
}

func (h *HarnessManagementHandler) ListOperationLogs(c *gin.Context) {
	itemID, err := parseIDParam(c, "itemId")
	if err != nil {
		return
	}
	data, err := h.svc.ListOperationLogs(c.Request.Context(), itemID)
	if err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, data)
}

func (h *HarnessManagementHandler) batchAction(c *gin.Context, fn func(ctx context.Context, ids []int64) error) {
	req, ok := ginx.BindJSON[dto.BatchHarnessActionReq](c)
	if !ok {
		return
	}
	if err := fn(c.Request.Context(), req.IDs); err != nil {
		response.Fail(c, err)
		return
	}
	response.Success(c, nil)
}
