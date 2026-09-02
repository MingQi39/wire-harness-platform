DELETE FROM system_configs WHERE config_key IN ('enabled_modules', 'subject_field_schema', 'subject_types', 'industry_labels', 'menu_config');
ALTER TABLE tenants DROP COLUMN IF EXISTS industry_type;
