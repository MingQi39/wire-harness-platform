package model

import "time"

const (
	StandardAssetTypeInstrument = "instrument"
	StandardAssetTypeMaterial   = "material"
)

type StandardAssetStockRecord struct {
	ID             int64      `json:"id" gorm:"primaryKey"`
	TenantID       int64      `json:"tenant_id" gorm:"not null;index"`
	AssetType      string     `json:"asset_type" gorm:"column:asset_type;not null"`
	AssetID        int64      `json:"asset_id" gorm:"column:asset_id;not null;index"`
	AssetName      string     `json:"asset_name" gorm:"column:asset_name;not null"`
	StockStatus    string     `json:"stock_status" gorm:"column:stock_status;not null;default:实验室外"`
	StockOutDate   time.Time  `json:"stock_out_date" gorm:"column:stock_out_date;not null"`
	StockOutPerson string     `json:"stock_out_person" gorm:"column:stock_out_person;not null"`
	StockOutRemark string     `json:"stock_out_remark" gorm:"column:stock_out_remark;not null"`
	StockInDate    *time.Time `json:"stock_in_date" gorm:"column:stock_in_date"`
	StockInPerson  string     `json:"stock_in_person" gorm:"column:stock_in_person;not null"`
	StockInRemark  string     `json:"stock_in_remark" gorm:"column:stock_in_remark;not null"`
	CreatedBy      int64      `json:"created_by" gorm:"column:created_by;not null;default:0"`
	UpdatedBy      int64      `json:"updated_by" gorm:"column:updated_by;not null;default:0"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (StandardAssetStockRecord) TableName() string {
	return "standard_asset_stock_records"
}
