CREATE TABLE audit_logs (
    id            BIGSERIAL,
    tenant_id     BIGINT      NOT NULL,
    trace_id      TEXT        NOT NULL,
    user_id       BIGINT      NOT NULL,
    user_name     TEXT        NOT NULL,
    action        TEXT        NOT NULL,
    resource_type TEXT        NOT NULL,
    resource_id   BIGINT      NOT NULL,
    before_data   JSONB,
    after_data    JSONB,
    ip_addr       TEXT,
    user_agent    TEXT,
    remark        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial monthly partitions
CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE INDEX idx_audit_trace ON audit_logs (trace_id);
CREATE INDEX idx_audit_tenant_time ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_tenant_user ON audit_logs (tenant_id, user_id, created_at DESC);
CREATE INDEX idx_audit_tenant_resource ON audit_logs (tenant_id, resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_before ON audit_logs USING GIN (before_data jsonb_path_ops);
CREATE INDEX idx_audit_after ON audit_logs USING GIN (after_data jsonb_path_ops);
