-- Aaroha LMS Clean Database Baseline
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO users (id, full_name, email, password_hash, role, title, avatar, status, is_archived, authorized_roles_json)
VALUES 
(1, 'Aaroha Admin', 'admin@aaroha-inc.com', '$2y$12$fC/ALkID7616YWIOvrOYxO6kECCip3LILoAPJ4nVVYQFxAQtQQy5y', 'super_admin', 'System Administrator', '/avatars/3d/memo_1.png', 'active', 0, '["super_admin","admin"]'),
(4, 'Ryu', 'ryu@aaroha.in', '$2y$12$fC/ALkID7616YWIOvrOYxO6kECCip3LILoAPJ4nVVYQFxAQtQQy5y', 'super_admin', 'Platform Architect', '/avatars/3d/memo_13.png', 'active', 0, '["super_admin","admin","faculty","student"]')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), status = 'active';

INSERT INTO student_profiles (user_id, student_id_code, account_status, admission_status, enrollment_status)
VALUES (4, 'STU-2026-0004', 'active', 'admitted', 'enrolled')
ON DUPLICATE KEY UPDATE account_status = 'active';

INSERT INTO courses (id, title, slug, category, level, duration, partner_type, rating, reviews_count, badge_text, description, thumbnail_url, skills, created_by, is_published, is_deleted)
VALUES
(1, 'NLP', 'nlp-specialization', 'Applied AI', 'Advanced Level', '8 Weeks', 'Specialization', 4.90, '0', 'New', 'Natural Language Processing fundamentals and advanced architectures.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', '["Transformers", "Attention", "BERT"]', 1, 1, 0),
(2, 'Distributed Cloud Architecture & High-Throughput Systems', 'distributed-cloud-architecture', 'Cloud Architecture', 'Advanced Level', '10 Weeks', 'Specialization', 4.90, '28', 'Recently updated', 'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', '["Distributed Systems", "Raft Consensus", "Cloud Architecture"]', 1, 1, 0),
(3, 'Applied Machine Learning Engineering & Model Serving', 'applied-ml-engineering', 'Applied AI', 'Advanced Level', '6 Weeks', 'Professional Certificate', 4.95, '19', 'Top AI program', 'Bridge the gap between model weights and production inference.', 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1200&q=80', '["PyTorch", "Model Serving", "MLOps"]', 1, 1, 0),
(4, 'Enterprise Cyber Defense & Zero-Day Threat Modeling', 'enterprise-cyber-defense', 'Cybersecurity', 'Advanced Level', '8 Weeks', 'Specialization', 4.88, '14', 'New', 'Proactive threat modeling, attack surface reduction, and intrusion detection.', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80', '["Threat Modeling", "Zero-Day Analysis", "SIEM"]', 1, 1, 0),
(5, 'ddd', 'ddd-masters', 'Applied AI', 'Advanced Level', '12 Weeks', "Master's Program", 4.90, '2.8K', 'new', 'Advanced engineering program track.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', '["Systems Design"]', 1, 1, 0),
(6, 'SS', 'ss-degree-track', 'Cloud Architecture', 'Advanced Level', '12 Weeks', 'Degree Track', 4.80, '2.8K', 'new', 'Specialized degree track for scalable engineering.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', '["High Throughput"]', 1, 1, 0)
ON DUPLICATE KEY UPDATE title = VALUES(title), category = VALUES(category);

SET FOREIGN_KEY_CHECKS = 1;

