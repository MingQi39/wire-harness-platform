ALTER TABLE harness_items
    ADD COLUMN IF NOT EXISTS stored_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS stored_by VARCHAR(128) DEFAULT '',
    ADD COLUMN IF NOT EXISTS outbound_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS outbound_by VARCHAR(128) DEFAULT '',
    ADD COLUMN IF NOT EXISTS scrapped_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scrap_confirmed_by VARCHAR(128) DEFAULT '',
    ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'pending';

UPDATE harness_items SET lifecycle_status = 'in_stock' WHERE status = 'in_use' AND lifecycle_status = 'pending';
UPDATE harness_items SET lifecycle_status = 'scrapped' WHERE status = 'scrapped' AND lifecycle_status = 'pending';

CREATE TABLE IF NOT EXISTS harness_operation_logs (
    id               BIGSERIAL PRIMARY KEY,
    tenant_id        BIGINT NOT NULL REFERENCES tenants(id),
    harness_item_id  BIGINT NOT NULL REFERENCES harness_items(id) ON DELETE CASCADE,
    action           VARCHAR(32) NOT NULL,
    operator_name    VARCHAR(128) DEFAULT '',
    operator_user_id BIGINT,
    remark           TEXT DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_harness_op_logs_item ON harness_operation_logs (harness_item_id);
