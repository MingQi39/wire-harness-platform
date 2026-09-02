DROP TABLE IF EXISTS harness_operation_logs;
ALTER TABLE harness_items
    DROP COLUMN IF EXISTS stored_at,
    DROP COLUMN IF EXISTS stored_by,
    DROP COLUMN IF EXISTS outbound_at,
    DROP COLUMN IF EXISTS outbound_by,
    DROP COLUMN IF EXISTS scrapped_at,
    DROP COLUMN IF EXISTS scrap_confirmed_by,
    DROP COLUMN IF EXISTS lifecycle_status;
