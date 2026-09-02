-- 租户增加行业类型字段
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry_type VARCHAR(32) NOT NULL DEFAULT 'metrology';

CREATE TABLE IF NOT EXISTS system_configs (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    BIGINT NOT NULL REFERENCES tenants(id),
    config_key   TEXT NOT NULL,
    config_value TEXT NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    created_by   BIGINT NOT NULL DEFAULT 0,
    updated_by   BIGINT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, config_key)
);

CREATE INDEX IF NOT EXISTS idx_system_configs_tenant ON system_configs (tenant_id);

-- 初始化行业相关的系统配置种子数据（每个租户都需要）
-- enabled_modules: 控制前端模块可见性
-- subject_field_schema: 控制样品/仪器表单的动态字段
INSERT INTO system_configs (tenant_id, config_key, config_value, description, updated_by, created_at, updated_at)
SELECT t.id,
       'enabled_modules',
       CASE t.industry_type
           WHEN 'testing' THEN '["subject","task","output","retention","sampling","test_standard"]'
           ELSE '["subject","task","output","standard_device","uncertainty"]'
       END,
       '启用的功能模块列表',
       0,
       NOW(),
       NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM system_configs sc
    WHERE sc.tenant_id = t.id AND sc.config_key = 'enabled_modules'
);

INSERT INTO system_configs (tenant_id, config_key, config_value, description, updated_by, created_at, updated_at)
SELECT t.id,
       'subject_field_schema',
       CASE t.industry_type
           WHEN 'testing' THEN '[{"key":"model","label":"型号规格","type":"string","required":false},{"key":"batch_no","label":"批次号","type":"string","required":true},{"key":"quantity","label":"样品数量","type":"number","required":true},{"key":"manufacturer","label":"生产厂家","type":"string","required":false},{"key":"sampling_method","label":"取样方式","type":"string","required":false},{"key":"retention","label":"留样要求","type":"string","required":false}]'
           ELSE '[{"key":"model","label":"型号规格","type":"string","required":true},{"key":"serial_number","label":"出厂编号","type":"string","required":true},{"key":"manufacturer","label":"制造商","type":"string","required":true},{"key":"range","label":"量程/测量范围","type":"string","required":true},{"key":"accuracy_class","label":"精度等级/准确度等级","type":"string","required":false}]'
       END,
       '样品/仪器动态字段定义',
       0,
       NOW(),
       NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM system_configs sc
    WHERE sc.tenant_id = t.id AND sc.config_key = 'subject_field_schema'
);

INSERT INTO system_configs (tenant_id, config_key, config_value, description, updated_by, created_at, updated_at)
SELECT t.id,
       'subject_types',
       CASE t.industry_type
           WHEN 'testing' THEN '[{"label":"食品","value":"food"},{"label":"环境","value":"environment"},{"label":"材料","value":"material"},{"label":"化工","value":"chemical"},{"label":"医药","value":"pharmaceutical"}]'
           ELSE '[{"label":"长度","value":"length"},{"label":"力学","value":"force"},{"label":"热工","value":"thermal"},{"label":"电学","value":"electric"},{"label":"化学","value":"chemical"},{"label":"光学","value":"optical"},{"label":"声学","value":"acoustic"},{"label":"时间频率","value":"time_frequency"}]'
       END,
       '样品/仪器类型选项',
       0,
       NOW(),
       NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM system_configs sc
    WHERE sc.tenant_id = t.id AND sc.config_key = 'subject_types'
);

-- 行业术语映射表（前端 useLabel 使用，后端统一维护）
INSERT INTO system_configs (tenant_id, config_key, config_value, description, updated_by, created_at, updated_at)
SELECT t.id,
       'industry_labels',
       CASE t.industry_type
           WHEN 'testing' THEN '{"subject":"样品","subject_code":"样品编号","subject_name":"样品名称","subject_plural":"样品列表","task":"检测","task_verb":"检测","task_record":"检测记录","output":"报告","output_full":"检测报告","output_verb":"出报告","method":"检测标准","method_code":"标准编号","source":"委托单位","client":"委托方","received_at":"收样日期","completed_at":"出报告日期","status.pending":"待检","status.testing":"检测中","status.completed":"已出报告","status.rejected":"已退回","nav_subject":"样品管理","nav_task":"检测管理","nav_output":"报告管理","nav_standard_device":"标准器管理","nav_uncertainty":"不确定度评定","standard_device":"标准器","uncertainty":"不确定度","retention":"留样","sampling":"抽样","test_standard":"检测标准"}'
           ELSE '{"subject":"仪器","subject_code":"仪器编号","subject_name":"仪器名称","subject_plural":"仪器列表","task":"校准/检定","task_verb":"校准","task_record":"校准记录","output":"证书","output_full":"校准证书","output_verb":"出证","method":"检定规程","method_code":"规程编号","source":"送检单位","client":"委托方","received_at":"收件日期","completed_at":"出证日期","status.pending":"待检","status.testing":"校准中","status.completed":"已出证","status.rejected":"已退回","nav_subject":"仪器管理","nav_task":"校准管理","nav_output":"证书管理","nav_standard_device":"标准器管理","nav_uncertainty":"不确定度评定","standard_device":"标准器","uncertainty":"不确定度"}'
       END,
       '行业术语映射表',
       0,
       NOW(),
       NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM system_configs sc
    WHERE sc.tenant_id = t.id AND sc.config_key = 'industry_labels'
);

-- 侧边栏菜单结构（前端动态渲染，可按租户自定义）
INSERT INTO system_configs (tenant_id, config_key, config_value, description, updated_by, created_at, updated_at)
SELECT t.id,
       'menu_config',
       CASE t.industry_type
           WHEN 'testing' THEN '[{"key":"/","icon":"dashboard","label":"工作台"},{"key":"/samples","icon":"experiment","label":"样品管理","labelKey":"nav_subject","auth":"sample:read","module":"subject"},{"key":"/system","icon":"setting","label":"系统管理","auth":"system:manage","children":[{"key":"/system/users","icon":"team","label":"用户管理","auth":"user:read"},{"key":"/system/roles","icon":"safety","label":"角色管理","auth":"role:read"},{"key":"/system/audit","icon":"file-search","label":"审计日志","auth":"audit:read"},{"key":"/system/config","icon":"tool","label":"系统配置","auth":"config:read"}]}]'
           ELSE '[{"key":"/","icon":"dashboard","label":"工作台"},{"key":"/samples","icon":"experiment","label":"仪器管理","labelKey":"nav_subject","auth":"sample:read","module":"subject"},{"key":"/system","icon":"setting","label":"系统管理","auth":"system:manage","children":[{"key":"/system/users","icon":"team","label":"用户管理","auth":"user:read"},{"key":"/system/roles","icon":"safety","label":"角色管理","auth":"role:read"},{"key":"/system/audit","icon":"file-search","label":"审计日志","auth":"audit:read"},{"key":"/system/config","icon":"tool","label":"系统配置","auth":"config:read"}]}]'
       END,
       '侧边栏菜单结构',
       0,
       NOW(),
       NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM system_configs sc
    WHERE sc.tenant_id = t.id AND sc.config_key = 'menu_config'
);
