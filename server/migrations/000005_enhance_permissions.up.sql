-- 增强权限表：添加树形结构和分类字段
ALTER TABLE permissions ADD COLUMN type TEXT NOT NULL DEFAULT 'api';
ALTER TABLE permissions ADD COLUMN parent_id BIGINT NOT NULL DEFAULT 0;
ALTER TABLE permissions ADD COLUMN sort INT NOT NULL DEFAULT 0;
ALTER TABLE permissions ADD COLUMN description TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_permissions_parent ON permissions (parent_id);
CREATE INDEX idx_permissions_type ON permissions (type);

-- 更新现有权限的 type / parent_id / sort / description
-- 顶级菜单权限
UPDATE permissions SET type = 'menu', parent_id = 0, sort = 1, description = '样品管理模块' WHERE code = 'sample:read';
UPDATE permissions SET type = 'button', sort = 1, description = '创建新样品' WHERE code = 'sample:create';
UPDATE permissions SET type = 'button', sort = 2, description = '编辑样品信息' WHERE code = 'sample:edit';
UPDATE permissions SET type = 'button', sort = 3, description = '删除样品' WHERE code = 'sample:delete';

UPDATE permissions SET type = 'menu', parent_id = 0, sort = 2, description = '实验管理模块' WHERE code = 'experiment:read';
UPDATE permissions SET type = 'button', sort = 1, description = '创建新实验' WHERE code = 'experiment:create';
UPDATE permissions SET type = 'button', sort = 2, description = '编辑实验信息' WHERE code = 'experiment:edit';
UPDATE permissions SET type = 'button', sort = 3, description = '删除实验' WHERE code = 'experiment:delete';
UPDATE permissions SET type = 'button', sort = 4, description = '审核实验' WHERE code = 'experiment:approve';

UPDATE permissions SET type = 'menu', parent_id = 0, sort = 3, description = '报告管理模块' WHERE code = 'report:read';
UPDATE permissions SET type = 'button', sort = 1, description = '导出报告' WHERE code = 'report:export';

-- 将旧的 user:manage 改为 menu 类型
UPDATE permissions SET type = 'menu', parent_id = 0, sort = 4, code = 'user:read', action = 'read', description = '用户管理模块' WHERE code = 'user:manage';

-- 设置按钮权限的 parent_id（指向各自菜单权限）
UPDATE permissions SET parent_id = (SELECT id FROM permissions WHERE code = 'sample:read') WHERE resource = 'sample' AND type = 'button';
UPDATE permissions SET parent_id = (SELECT id FROM permissions WHERE code = 'experiment:read') WHERE resource = 'experiment' AND type = 'button';
UPDATE permissions SET parent_id = (SELECT id FROM permissions WHERE code = 'report:read') WHERE resource = 'report' AND type = 'button';

-- 新增权限码
INSERT INTO permissions (code, name, resource, action, type, parent_id, sort, description) VALUES
    ('sample:export', '导出样品', 'sample', 'export', 'button', (SELECT id FROM permissions WHERE code = 'sample:read'), 4, '导出样品数据'),
    ('system:manage', '系统管理', 'system', 'manage', 'menu', 0, 5, '系统管理模块'),
    ('user:create', '创建用户', 'user', 'create', 'button', (SELECT id FROM permissions WHERE code = 'user:read'), 1, '创建新用户'),
    ('user:edit', '编辑用户', 'user', 'edit', 'button', (SELECT id FROM permissions WHERE code = 'user:read'), 2, '编辑用户信息'),
    ('user:delete', '删除用户', 'user', 'delete', 'button', (SELECT id FROM permissions WHERE code = 'user:read'), 3, '删除用户'),
    ('role:read', '查看角色', 'role', 'read', 'menu', 0, 6, '角色管理模块'),
    ('role:create', '创建角色', 'role', 'create', 'button', 0, 1, '创建新角色'),
    ('role:edit', '编辑角色', 'role', 'edit', 'button', 0, 2, '编辑角色信息'),
    ('role:delete', '删除角色', 'role', 'delete', 'button', 0, 3, '删除角色');

-- 设置 user:read 的 parent_id 指向 system:manage
UPDATE permissions SET parent_id = (SELECT id FROM permissions WHERE code = 'system:manage') WHERE code = 'user:read';

-- 设置角色管理权限的 parent_id
UPDATE permissions SET parent_id = (SELECT id FROM permissions WHERE code = 'system:manage') WHERE code = 'role:read';
UPDATE permissions SET parent_id = (SELECT id FROM permissions WHERE code = 'role:read') WHERE resource = 'role' AND type = 'button';

-- 将新增权限赋予 admin 角色（按角色名，避免写死 id=1）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.code IN ('sample:export', 'system:manage', 'user:create', 'user:edit', 'user:delete', 'role:read', 'role:create', 'role:edit', 'role:delete')
ON CONFLICT DO NOTHING;
