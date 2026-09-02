package model

import "time"

type OriginalRecordTemplateGroup struct {
	ID        int64     `json:"id" gorm:"primaryKey"`
	TenantID  int64     `json:"tenant_id" gorm:"not null;index"`
	Name      string    `json:"name" gorm:"not null"`
	SortOrder int       `json:"sort_order" gorm:"not null;default:0"`
	CreatedBy int64     `json:"created_by" gorm:"not null;default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Subgroups []OriginalRecordTemplateSubgroup `json:"subgroups,omitempty" gorm:"foreignKey:GroupID"`
}

func (OriginalRecordTemplateGroup) TableName() string {
	return "original_record_template_groups"
}

// OriginalRecordTemplateSubgroup 第二级"子分组"。
// 与第一级分组同表语义（命名 + 排序 + 创建人 + 乐观锁），交互上前端也复用同一套渲染/能力。
type OriginalRecordTemplateSubgroup struct {
	ID        int64     `json:"id" gorm:"primaryKey"`
	TenantID  int64     `json:"tenant_id" gorm:"not null;index"`
	GroupID   int64     `json:"group_id" gorm:"not null;index"`
	Name      string    `json:"name" gorm:"not null"`
	SortOrder int       `json:"sort_order" gorm:"not null;default:0"`
	CreatedBy int64     `json:"created_by" gorm:"not null;default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Templates []OriginalRecordTemplate `json:"templates,omitempty" gorm:"foreignKey:SubgroupID"`
}

func (OriginalRecordTemplateSubgroup) TableName() string {
	return "original_record_template_subgroups"
}

type OriginalRecordTemplate struct {
	ID                int64     `json:"id" gorm:"primaryKey"`
	TenantID          int64     `json:"tenant_id" gorm:"not null;index"`
	SubgroupID        int64     `json:"subgroup_id" gorm:"not null;index"`
	Name              string    `json:"name" gorm:"not null"`
	TemplateCode      string    `json:"template_code" gorm:"not null"`
	Version           string    `json:"version" gorm:"not null;default:''"`
	Status            string    `json:"status" gorm:"not null;default:'启用'"`
	CertCoverDescType string    `json:"cert_cover_desc_type" gorm:"column:cert_cover_desc_type;not null;default:''"`
	ExcelFileID       *int64    `json:"excel_file_id" gorm:"index"`
	CreatedBy         int64     `json:"created_by" gorm:"not null;default:0"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	ExcelFile   *FileRecord                        `json:"-" gorm:"foreignKey:ExcelFileID"`
	Subgroup    *OriginalRecordTemplateSubgroup    `json:"-" gorm:"foreignKey:SubgroupID"`
	Methods     []OriginalRecordTemplateMethod     `json:"methods,omitempty" gorm:"foreignKey:TemplateID"`
	Instruments []OriginalRecordTemplateInstrument `json:"instruments,omitempty" gorm:"foreignKey:TemplateID"`
}

func (OriginalRecordTemplate) TableName() string {
	return "original_record_templates"
}

type OriginalRecordTemplateMethod struct {
	ID         int64  `json:"id" gorm:"primaryKey"`
	TemplateID int64  `json:"template_id" gorm:"not null;index"`
	MethodCode string `json:"method_code" gorm:"not null"`
	MethodName string `json:"method_name" gorm:"type:text;not null"`
}

func (OriginalRecordTemplateMethod) TableName() string {
	return "original_record_template_methods"
}

type OriginalRecordTemplateInstrument struct {
	ID               int64      `json:"id" gorm:"primaryKey"`
	TemplateID       int64      `json:"template_id" gorm:"not null;index"`
	SourceType       string     `json:"source_type" gorm:"column:source_type;not null;default:'instrument'"`
	Name             string     `json:"name" gorm:"not null"`
	ManageCode       string     `json:"manage_code" gorm:"not null;default:''"`
	FactoryCode      string     `json:"factory_code" gorm:"not null;default:''"`
	Model            string     `json:"model" gorm:"not null;default:''"`
	TraceDate        *time.Time `json:"trace_date" gorm:"column:trace_date"`
	ValidUntil       *time.Time `json:"valid_until" gorm:"column:valid_until"`
	TechnicalSpecs   string     `json:"technical_specs" gorm:"column:technical_specs;type:text;not null;default:''"`
	MeasurementRange string     `json:"measurement_range" gorm:"column:measurement_range;not null;default:''"`
	CertificateNo    string     `json:"certificate_no" gorm:"column:certificate_no;not null;default:''"`
	TraceOrg         string     `json:"trace_org" gorm:"column:trace_org;not null;default:''"`
	CalibrationUnit  string     `json:"calibration_unit" gorm:"column:calibration_unit;not null;default:''"`
}

func (OriginalRecordTemplateInstrument) TableName() string {
	return "original_record_template_instruments"
}
