package model

import "time"

type StandardMaterial struct {
	ID               int64      `json:"id" gorm:"primaryKey"`
	TenantID         int64      `json:"tenant_id" gorm:"not null;index"`
	ManagementNo     string     `json:"management_no" gorm:"column:management_no;not null"`
	Name             string     `json:"name" gorm:"not null"`
	Model            string     `json:"model" gorm:"not null"`
	MeasurementRange string     `json:"measurement_range" gorm:"column:measurement_range;not null"`
	BatchNo          string     `json:"batch_no" gorm:"column:batch_no;not null"`
	TechnicalSpecs   string     `json:"technical_specs" gorm:"column:technical_specs;not null"`
	StandardValue    string     `json:"standard_value" gorm:"column:standard_value;not null"`
	Manufacturer     string     `json:"manufacturer" gorm:"not null"`
	ValueDate        time.Time  `json:"value_date" gorm:"column:value_date;not null"`
	TraceCycleMonths int        `json:"trace_cycle_months" gorm:"column:trace_cycle_months;not null"`
	ValidUntil       time.Time  `json:"valid_until" gorm:"column:valid_until;not null"`
	CertificateNo    string     `json:"certificate_no" gorm:"column:certificate_no;not null"`
	CalibrationUnit  string     `json:"calibration_unit" gorm:"column:calibration_unit;not null"`
	DepartmentID     int64      `json:"department_id" gorm:"column:department_id;not null;default:0"`
	Department       string     `json:"department" gorm:"not null"`
	Quantity         int        `json:"quantity" gorm:"not null;default:0"`
	StockStatus      string     `json:"stock_status" gorm:"column:stock_status;not null;default:实验室内"`
	StockOutPerson   string     `json:"stock_out_person" gorm:"column:stock_out_person;not null"`
	StockOutDate     *time.Time `json:"stock_out_date" gorm:"column:stock_out_date"`
	StockInPerson    string     `json:"stock_in_person" gorm:"column:stock_in_person;not null"`
	StockInDate      *time.Time `json:"stock_in_date" gorm:"column:stock_in_date"`
	StockRemark      string     `json:"stock_remark" gorm:"column:stock_remark;not null"`
	CreatedBy        int64      `json:"created_by"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (StandardMaterial) TableName() string {
	return "standard_materials"
}
