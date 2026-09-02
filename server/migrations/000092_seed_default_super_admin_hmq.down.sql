-- 回滚 000092：仅删除该迁移自动种下且仍保持初始特征的 hmq 账号，避免误删既有用户。
DO $$
DECLARE
    v_default_tenant_id BIGINT;
    v_deleted_count     BIGINT := 0;
BEGIN
    SELECT id INTO v_default_tenant_id
    FROM tenants
    WHERE code = 'default'
    LIMIT 1;

    IF v_default_tenant_id IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM user_roles
    WHERE user_id = 199839
      AND EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = 199839
            AND u.tenant_id = v_default_tenant_id
            AND u.username = 'hmq'
            AND u.password = '$2a$12$dfDRssUSHBg9wFvAlAmXaOOkVEqP07P39UU5r7KsjnZHmXhn0oQ2O'
            AND u.name = 'hmq'
            AND COALESCE(u.email, '') = ''
      );

    DELETE FROM users
    WHERE id = 199839
      AND tenant_id = v_default_tenant_id
      AND username = 'hmq'
      AND password = '$2a$12$dfDRssUSHBg9wFvAlAmXaOOkVEqP07P39UU5r7KsjnZHmXhn0oQ2O'
      AND name = 'hmq'
      AND COALESCE(email, '') = '';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        PERFORM setval(
            pg_get_serial_sequence('users', 'id'),
            COALESCE((SELECT MAX(id) FROM users), 1),
            (SELECT EXISTS (SELECT 1 FROM users))
        );
    END IF;
END $$;
