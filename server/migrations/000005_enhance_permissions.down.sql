-- 删除新增的权限码
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN ('sample:export', 'system:manage', 'user:create', 'user:edit', 'user:delete', 'role:read', 'role:create', 'role:edit', 'role:delete')
);
DELETE FROM permissions WHERE code IN ('sample:export', 'system:manage', 'user:create', 'user:edit', 'user:delete', 'role:read', 'role:create', 'role:edit', 'role:delete');

-- 恢复 user:read 为 user:manage
UPDATE permissions SET code = 'user:manage', action = 'manage', type = 'api', parent_id = 0, sort = 0, description = '' WHERE code = 'user:read';

-- 清除所有现有权限的增强字段
UPDATE permissions SET type = 'api', parent_id = 0, sort = 0, description = '';

DROP INDEX IF EXISTS idx_permissions_type;
DROP INDEX IF EXISTS idx_permissions_parent;

ALTER TABLE permissions DROP COLUMN IF EXISTS description;
ALTER TABLE permissions DROP COLUMN IF EXISTS sort;
ALTER TABLE permissions DROP COLUMN IF EXISTS parent_id;
ALTER TABLE permissions DROP COLUMN IF EXISTS type;
