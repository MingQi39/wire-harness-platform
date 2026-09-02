-- 线束平台默认管理员 bjy（密码 qwer.123，bcrypt cost=12）
-- 新库首次 migrate 时写入；与 LIMS 默认超管 hmq 独立。
DO $$
DECLARE
    v_default_tenant_id BIGINT;
    v_role_id           BIGINT;
    v_password_hash     TEXT := '$2a$12$dfDRssUSHBg9wFvAlAmXaOOkVEqP07P39UU5r7KsjnZHmXhn0oQ2O';
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE username = 'bjy') THEN
        RETURN;
    END IF;

    SELECT id INTO v_default_tenant_id
    FROM tenants
    WHERE code = 'default'
    LIMIT 1;

    IF v_default_tenant_id IS NULL THEN
        RETURN;
    END IF;

    SELECT id INTO v_role_id
    FROM roles
    WHERE name = 'admin'
    LIMIT 1;

    INSERT INTO users (tenant_id, username, password, name, email, status)
    VALUES (
        v_default_tenant_id,
        'bjy',
        v_password_hash,
        'bjy',
        '',
        'active'
    )
    ON CONFLICT DO NOTHING;

    IF v_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, v_role_id
        FROM users u
        WHERE u.tenant_id = v_default_tenant_id AND u.username = 'bjy'
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
