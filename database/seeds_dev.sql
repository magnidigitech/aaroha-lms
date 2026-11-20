-- Aaroha LMS Clean Database Baseline
-- No dummy courses, dummy batches, dummy tasks or dummy users

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO users (id, full_name, email, password_hash, role, title, avatar, status, is_archived, authorized_roles_json)
VALUES (1, 'Aaroha Admin', 'admin@aaroha-inc.com', '$2y$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'super_admin', 'System Administrator', '/avatars/3d/memo_1.png', 'active', 0, '["super_admin","admin"]')
ON DUPLICATE KEY UPDATE full_name = 'Aaroha Admin', title = 'System Administrator', role = 'super_admin';

SET FOREIGN_KEY_CHECKS = 1;
