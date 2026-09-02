package model

import "time"

type StandardInstrument struct {
	ID               int64                            `json:"id" gorm:"primaryKey"`
	TenantID         int64                            `json:"tenant_id" gorm:"not null;index"`
	Name             string                           `json:"name" gorm:"not null"`
	Model            string                           `json:"model" gorm:"not null"`
	MeasurementRange string                           `json:"measurement_range" gorm:"column:measurement_range;not null"`
	SerialNo         string                           `json:"serial_no" gorm:"column:serial_no;not null"`
	ManagementNo     string                           `json:"management_no" gorm:"column:management_no;not null"`
	TechnicalSpecs   string                           `json:"technical_specs" gorm:"column:technical_specs;not null"`
	ManagementStatus string                           `json:"management_status" gorm:"column:management_status;not null"`
	Manufacturer     string                           `json:"manufacturer" gorm:"not null"`
	StockStatus      string                           `json:"stock_status" gorm:"column:stock_status;not null;default:实验室内"`
	StockOutPerson   string                           `json:"stock_out_person" gorm:"column:stock_out_person;not null"`
	StockOutDate     *time.Time                       `json:"stock_out_date" gorm:"column:stock_out_date"`
	StockInPerson    string                           `json:"stock_in_person" gorm:"column:stock_in_person;not null"`
	StockInDate      *time.Time                       `json:"stock_in_date" gorm:"column:stock_in_date"`
	StockRemark      string                           `json:"stock_remark" gorm:"column:stock_remark;not null"`
	CreatedBy        int64                            `json:"created_by"`
	CreatedAt        time.Time                        `json:"created_at"`
	UpdatedAt        time.Time                        `json:"updated_at"`
	TraceHistory     []StandardInstrumentTraceHistory `json:"trace_history,omitempty" gorm:"foreignKey:InstrumentID"`
}

func (StandardInstrument) TableName() string {
	return "standard_instruments"
}

type StandardInstrumentTraceHistory struct {
	ID               int64     `json:"historyId" gorm:"primaryKey"`
	TenantID         int64     `json:"tenant_id" gorm:"not null;index"`
	InstrumentID     int64     `json:"instrument_id" gorm:"column:instrument_id;not null;index"`
	Name             string    `json:"name" gorm:"not null"`
	Model            string    `json:"model" gorm:"not null"`
	MeasurementRange string    `json:"measurement_range" gorm:"column:measurement_range;not null"`
	SerialNo         string    `json:"serial_no" gorm:"column:serial_no;not null"`
	ManagementNo     string    `json:"management_no" gorm:"column:management_no;not null"`
	TechnicalSpecs   string    `json:"technical_specs" gorm:"column:technical_specs;not null"`
	ManagementStatus string    `json:"management_status" gorm:"column:management_status;not null"`
	Manufacturer     string    `json:"manufacturer" gorm:"not null"`
	TraceDate        time.Time `json:"trace_date" gorm:"column:trace_date;not null"`
	TraceCycleMonths int       `json:"trace_cycle_months" gorm:"column:trace_cycle_months;not null"`
	ValidUntil       time.Time `json:"valid_until" gorm:"column:valid_until;not null"`
	CertificateNo    string    `json:"certificate_no" gorm:"column:certificate_no;not null"`
	TraceOrg         string    `json:"trace_org" gorm:"column:trace_org;not null"`
	TraceMethod      string    `json:"trace_method" gorm:"column:trace_method;not null"`
	DepartmentID     int64     `json:"department_id" gorm:"column:department_id;not null;default:0"`
	Department       string    `json:"department" gorm:"not null"`
	TraceFee         string    `json:"trace_fee" gorm:"column:trace_fee;not null"`
	TraceResult      string    `json:"trace_result" gorm:"column:trace_result;not null"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (StandardInstrumentTraceHistory) TableName() string {
	return "standard_instrument_trace_histories"
}
