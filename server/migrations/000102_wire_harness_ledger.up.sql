DROP TABLE IF EXISTS harness_order_lines;
DROP TABLE IF EXISTS harness_orders;

CREATE TABLE harness_projects (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    project_name    VARCHAR(255) NOT NULL DEFAULT '',
    platform_model  VARCHAR(255) NOT NULL DEFAULT '',
    circuit_count   INT NOT NULL DEFAULT 0,
    switch_count    INT NOT NULL DEFAULT 0,
    attachment_name VARCHAR(512) DEFAULT '',
    attachment_path VARCHAR(1024) DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_harness_projects_tenant ON harness_projects (tenant_id);
CREATE INDEX idx_harness_projects_name ON harness_projects (tenant_id, project_name);

CREATE TABLE harness_items (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT NOT NULL REFERENCES tenants(id),
    project_id          BIGINT NOT NULL REFERENCES harness_projects(id) ON DELETE CASCADE,
    harness_name        VARCHAR(255) NOT NULL DEFAULT '',
    harness_no          VARCHAR(128) NOT NULL DEFAULT '',
    purpose             VARCHAR(512) DEFAULT '',
    status              VARCHAR(32) NOT NULL DEFAULT 'idle',
    responsible_person  VARCHAR(128) DEFAULT '',
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT harness_items_status_check CHECK (status IN ('in_use', 'idle', 'scrapped'))
);
CREATE INDEX idx_harness_items_project ON harness_items (project_id);
CREATE UNIQUE INDEX idx_harness_items_tenant_no ON harness_items (tenant_id, harness_no) WHERE harness_no <> '';
