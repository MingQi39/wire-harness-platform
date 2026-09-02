package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/hmq/wire-harness-platform/internal/pkg/response"
)

var (
	buildVersion = "dev"
	buildCommit  = "unknown"
	buildDate    = "unknown"
)

func SetBuildInfo(version, commit, date string) {
	if version != "" {
		buildVersion = version
	}
	if commit != "" {
		buildCommit = commit
	}
	if date != "" {
		buildDate = date
	}
}

type VersionResp struct {
	Version string `json:"version"`
}

// VersionHandler godoc
//
//	@Summary		获取系统版本
//	@Description	获取系统构建版本号（commit/日期仅内部调试可见）
//	@Tags			系统
//	@Produce		json
//	@Success		200	{object}	response.Response{data=VersionResp}
//	@Router			/version [get]
func VersionHandler(c *gin.Context) {
	response.Success(c, VersionResp{
		Version: buildVersion,
	})
}
