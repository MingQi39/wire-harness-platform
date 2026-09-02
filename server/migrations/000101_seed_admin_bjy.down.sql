DELETE FROM user_roles
WHERE user_id IN (SELECT id FROM users WHERE username = 'bjy');

DELETE FROM users WHERE username = 'bjy';
