-- 租户表
CREATE TABLE tenants (
    id           BIGSERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    code         TEXT UNIQUE NOT NULL,
    plan         TEXT DEFAULT 'standard',
    db_strategy  TEXT DEFAULT 'shared',
    schema_name  TEXT,
    max_users    INT DEFAULT 50,
    max_storage  BIGINT DEFAULT 10737418240,
    status       TEXT DEFAULT 'active',
    expired_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_code ON tenants (code);
CREATE INDEX idx_tenants_status ON tenants (status);

-- 用户表
CREATE TABLE users (
    id         BIGSERIAL PRIMARY KEY,
    tenant_id  BIGINT NOT NULL REFERENCES tenants(id),
    username   TEXT NOT NULL,
    password   TEXT NOT NULL,
    name       TEXT NOT NULL,
    email      TEXT,
    status     TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, username)
);

CREATE INDEX idx_users_tenant ON users (tenant_id);
CREATE INDEX idx_users_tenant_status ON users (tenant_id, status);

-- 角色表（全局共享）
CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 权限表（全局共享）
CREATE TABLE permissions (
    id       BIGSERIAL PRIMARY KEY,
    code     TEXT UNIQUE NOT NULL,
    name     TEXT NOT NULL,
    resource TEXT NOT NULL,
    action   TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id       BIGINT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Seed: default tenant
INSERT INTO tenants (name, code) VALUES ('默认租户', 'default');

-- Seed: roles
INSERT INTO roles (name, display_name, description) VALUES ('admin', '系统管理员', '系统管理员');
INSERT INTO roles (name, display_name, description) VALUES ('lab_manager', '实验室主管', '实验室主管');
INSERT INTO roles (name, display_name, description) VALUES ('analyst', '分析员', '分析员');
INSERT INTO roles (name, display_name, description) VALUES ('reviewer', '审核员', '审核员');

-- Seed: permissions
INSERT INTO permissions (code, name, resource, action) VALUES
    ('sample:create', '创建样品', 'sample', 'create'),
    ('sample:read',   '查看样品', 'sample', 'read'),
    ('sample:edit',   '编辑样品', 'sample', 'update'),
    ('sample:delete', '删除样品', 'sample', 'delete'),
    ('experiment:create', '创建实验', 'experiment', 'create'),
    ('experiment:read',   '查看实验', 'experiment', 'read'),
    ('experiment:edit',   '编辑实验', 'experiment', 'update'),
    ('experiment:delete', '删除实验', 'experiment', 'delete'),
    ('experiment:approve', '审核实验', 'experiment', 'approve'),
    ('report:read',   '查看报告', 'report', 'read'),
    ('report:export', '导出报告', 'report', 'export'),
    ('user:manage',   '管理用户', 'user', 'manage');

-- Grant all permissions to admin role（按角色名，避免写死 id=1）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
