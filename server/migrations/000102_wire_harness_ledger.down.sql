DROP TABLE IF EXISTS harness_items;
DROP TABLE IF EXISTS harness_projects;

CREATE TABLE harness_orders (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT NOT NULL REFERENCES tenants(id),
    order_no    VARCHAR(64) NOT NULL,
    customer_name VARCHAR(255) NOT NULL DEFAULT '',
    time_requirement VARCHAR(255) DEFAULT '',
    status      VARCHAR(64) NOT NULL DEFAULT 'draft',
    remark      TEXT DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_harness_orders_tenant_no ON harness_orders (tenant_id, order_no);
CREATE INDEX idx_harness_orders_tenant ON harness_orders (tenant_id);

CREATE TABLE harness_order_lines (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    harness_order_id BIGINT NOT NULL REFERENCES harness_orders(id) ON DELETE CASCADE,
    device_name     VARCHAR(255) NOT NULL DEFAULT '',
    device_model    VARCHAR(255) DEFAULT '',
    serial_no       VARCHAR(255) DEFAULT '',
    management_no   VARCHAR(255) DEFAULT '',
    manufacturer    VARCHAR(255) DEFAULT '',
    sample_status   VARCHAR(64) DEFAULT '',
    assign_status   VARCHAR(64) DEFAULT '',
    responsible     VARCHAR(255) DEFAULT '',
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_harness_order_lines_order ON harness_order_lines (harness_order_id);
