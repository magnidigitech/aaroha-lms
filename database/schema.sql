-- Aaroha LMS Database Schema & Seed Data
-- Optimized for MySQL 8.0+ / MariaDB via phpMyAdmin on Hostinger Shared Hosting
-- Target Domain: lms.aaroha-inc.com
-- Roles: 'admin' and 'student' (Guests are unauthenticated visitors)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table (Admin and Student)
DROP TABLE IF EXISTS task_submissions;
DROP TABLE IF EXISTS lesson_progress;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
    title VARCHAR(150) NULL,
    avatar VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Courses Table
CREATE TABLE courses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(191) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL DEFAULT 'Cloud Architecture',
    level VARCHAR(60) NOT NULL DEFAULT 'Advanced Level',
    duration VARCHAR(60) NOT NULL DEFAULT '8 Weeks',
    partner_type VARCHAR(60) NOT NULL DEFAULT 'Specialization',
    rating DECIMAL(3,2) NOT NULL DEFAULT 4.90,
    reviews_count VARCHAR(50) NOT NULL DEFAULT '2.8K',
    badge_text VARCHAR(50) NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    skills TEXT NULL,
    what_you_will_learn TEXT NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_course_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Modules Table
CREATE TABLE modules (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    estimated_time VARCHAR(60) NULL DEFAULT '5 hours to complete',
    description TEXT NULL,
    sequence_order INT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_module_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Lessons Table (Content: Video, Article, Resource)
CREATE TABLE lessons (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_type ENUM('video', 'article', 'resource') NOT NULL DEFAULT 'article',
    duration VARCHAR(50) NOT NULL DEFAULT '15 min',
    content_body LONGTEXT,
    media_url VARCHAR(500),
    sequence_order INT UNSIGNED NOT NULL DEFAULT 1,
    is_free_preview TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lesson_module FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tasks Table (Module Evaluated Projects)
CREATE TABLE tasks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    task_type ENUM('text_response', 'file_upload', 'quiz') NOT NULL DEFAULT 'text_response',
    max_score INT UNSIGNED NOT NULL DEFAULT 100,
    passing_score INT UNSIGNED NOT NULL DEFAULT 75,
    is_mandatory TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_module FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Enrollments Table
CREATE TABLE enrollments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    status ENUM('active', 'completed', 'dropped') NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uk_user_course (user_id, course_id),
    CONSTRAINT fk_enroll_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_enroll_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Lesson Progress Table
CREATE TABLE lesson_progress (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT UNSIGNED NOT NULL,
    lesson_id INT UNSIGNED NOT NULL,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uk_enroll_lesson (enrollment_id, lesson_id),
    CONSTRAINT fk_prog_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    CONSTRAINT fk_prog_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Task Submissions Table
CREATE TABLE task_submissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id INT UNSIGNED NOT NULL,
    enrollment_id INT UNSIGNED NOT NULL,
    submission_text TEXT,
    attachment_url VARCHAR(500),
    status ENUM('submitted', 'under_review', 'passed', 'failed', 'resubmit_required') NOT NULL DEFAULT 'submitted',
    score INT UNSIGNED NULL DEFAULT NULL,
    feedback TEXT,
    graded_by INT UNSIGNED NULL DEFAULT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_sub_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_grader FOREIGN KEY (graded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- PRODUCTION SEED DATA (Ready for Immediate Testing)
-- -------------------------------------------------------------

-- Seed Users (Bcrypt hashed password 'password123')
INSERT INTO users (id, full_name, email, password_hash, role, title, avatar) VALUES
(1, 'Dr. Aris Thorne', 'admin@aaroha-inc.com', '$2y$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'Director of Curriculum & Distributed Systems Faculty', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'),
(2, 'Elena Rostova', 'elena.rostova@enterprise.io', '$2y$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student', 'Senior Systems Architect', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80');

-- Seed Courses
INSERT INTO courses (id, title, slug, category, level, duration, partner_type, rating, reviews_count, badge_text, description, thumbnail_url, skills, what_you_will_learn, is_published, created_by) VALUES
(1, 'Distributed Cloud Architecture & High-Throughput Systems', 'distributed-cloud-architecture', 'Cloud Architecture', 'Advanced Level', '8 Weeks', 'Specialization', 4.90, '2.8K', 'Recently updated', 'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets, Raft consensus, and transactional integrity.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', '["Distributed Systems", "Raft Consensus Protocol", "BGP Anycast Routing", "mTLS & Zero-Trust", "Storage Engines (LSM & B-Trees)", "Kafka & CDC Event Streaming"]', '["Architect zero-trust multi-region ingress gateways utilizing Anycast BGP and Envoy proxy mesh routing", "Implement fault-tolerant distributed state machines using Raft consensus and split-brain mitigation invariants", "Tune write-heavy storage engines by comparing Log-Structured Merge (LSM) trees with InnoDB B+Trees", "Eliminate dual-write vulnerabilities with Change Data Capture (CDC) pipelines and transactional outbox patterns"]', 1, 1),
(2, 'Applied Machine Learning Engineering & Model Serving', 'applied-ml-engineering', 'Applied AI', 'Advanced Level', '6 Weeks', 'Professional Certificate', 4.95, '1.9K', 'Top AI program', 'Bridge the gap between model weights and production inference. Build low-latency GPU serving pipelines, dynamic batching, AWQ quantization, and drift monitoring.', 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1200&q=80', '["GPU Kernel Optimization", "INT8 & 4-Bit AWQ Quantization", "vLLM & Continuous Batching", "Triton Inference Server", "Concept Drift Monitoring", "CUDA Memory Bounds"]', '["Compress and quantize transformer weights (AWQ / GPTQ) without degrading downstream domain perplexity", "Deploy vLLM and TensorRT-LLM inference engines with paged attention and continuous request batching", "Implement real-time feature drift detection using Kolmogorov-Smirnov and Population Stability Index metrics", "Design high-throughput asynchronous inference pipelines with zero memory fragmentation on NVIDIA clusters"]', 1, 1),
(3, 'Enterprise Cyber Defense & Zero-Day Threat Modeling', 'enterprise-cyber-defense', 'Cybersecurity', 'Advanced Level', '10 Weeks', 'Specialization', 4.88, '1.4K', 'New', 'Master application security and infrastructure defense: threat modeling, memory-safe migration, cryptographic supply-chain security, and real-time incident triage.', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80', '["STRIDE Threat Modeling", "Memory Safety & Rust Interop", "Software Supply Chain Security (SLSA)", "eBPF Runtime Introspection", "Incident Forensics & Mitigation", "Zero-Trust Cryptography"]', '["Execute enterprise-wide threat assessments using STRIDE and MITRE ATT&CK frameworks", "Secure the CI/CD pipeline against supply-chain attacks using Sigstore cosign and SLSA Level 3 attestations", "Instrument kernel-level security telemetry with eBPF to detect lateral process injection in real time", "Conduct post-breach forensics and deploy cryptographic boundary isolations under active compromise"]', 1, 1);

-- Seed Modules
INSERT INTO modules (id, course_id, title, estimated_time, description, sequence_order) VALUES
(101, 1, 'Module 1: Global Edge Routing & Zero-Trust Boundaries', '5 hours to complete', 'Explore ingress topology, Anycast BGP routing, and mTLS cryptography inside production Kubernetes clusters.', 1),
(102, 1, 'Module 2: Distributed Consensus & State Storage', '6 hours to complete', 'Master Raft leader election, commit log safety, and high-performance LSM storage engine compaction.', 2),
(103, 1, 'Module 3: Event Sourcing & High-Throughput Streaming', '5 hours to complete', 'Build change-data-capture pipelines and Kafka stream processors for guaranteed delivery semantics.', 3),
(201, 2, 'Module 1: Kernel Optimization & Quantization Dynamics', '6 hours to complete', 'Analyze post-training quantization, INT8 calibration, and memory-bandwidth bound operations.', 1),
(301, 3, 'Module 1: Threat Modeling & Supply-Chain Attestation', '6 hours to complete', 'Understand STRIDE risk modeling and cryptographic artifact signing with Sigstore cosign.', 1);

-- Seed Lessons
INSERT INTO lessons (id, module_id, title, content_type, duration, content_body, media_url, sequence_order, is_free_preview) VALUES
(1001, 101, 'Multi-Region Anycast Topology & BGP Ingress Routing', 'video', '22 min', 'An in-depth analysis of global edge ingress networks. We evaluate how Anycast DNS and BGP route optimization direct user packets to the nearest Point of Presence (PoP), mitigating latency before requests reach internal mesh clusters. We examine real packet capture profiles and failure mode recovery when an undersea transit link experiences degradation.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1),
(1002, 101, 'Mutual TLS (mTLS) & Ephemeral Identity in Microservices', 'article', '14 min read', 'Perimeter-only security models fail once an adversary establishes lateral mobility inside your cluster. In this lesson, we specify zero-trust service-to-service communication using SPIFFE/SPIRE identity standards. We examine x509 certificate rotation pipelines, hardware security module (HSM) key isolation, and how Envoy sidecars negotiate cryptographic handshakes without introducing CPU bottlenecks.', NULL, 2, 0),
(1003, 102, 'Raft Consensus Protocol & Split-Brain Mitigation', 'video', '28 min', 'Stateful services require unambiguous truth. We unpack the Raft consensus algorithm: leader election, log replication, safety invariants, and commit index advancement. We inspect how network partitions induce partitioned quorums and why strict majority voting guarantees no two nodes can commit contradictory log entries.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 0),
(1004, 102, 'LSM Trees vs B-Trees in Modern Storage Engines', 'article', '18 min read', 'Choosing between Log-Structured Merge (LSM) trees (RocksDB, Cassandra) and traditional B+Trees (InnoDB, PostgreSQL) dictates write amplification and read amplification. We examine memtable flushes, write-ahead logs (WAL), Bloom filter tuning, and tiered compaction strategies under sustained write pressures.', NULL, 2, 0),
(1005, 103, 'Transactional Outbox Pattern & CDC Stream Pipelines', 'article', '16 min read', 'Dual-write operations between a relational database and a message broker are vulnerable to split-second failures that cause data inconsistency. We implement the Transactional Outbox Pattern using Change Data Capture (CDC) via Debezium and Kafka, guaranteeing at-least-once message delivery with exactly-once consumer semantics.', NULL, 1, 0),
(2001, 201, 'FP16, INT8 & INT4 Quantization Dynamics', 'video', '25 min', 'Techniques for compressing deep neural network weights without sacrificing perplexity or evaluation benchmarks. We dive into post-training quantization (PTQ) vs quantization-aware training (QAT), weight-activation calibration, and GPU memory bandwidth limitations.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1),
(3001, 301, 'STRIDE Threat Modeling for Cloud-Native Microservices', 'video', '24 min', 'Deconstructing real-world attack vectors against containerized microservices. We apply STRIDE threat modeling to data flow diagrams, identifying unauthenticated gRPC endpoints, insecure deserialization risks, and privilege escalation vulnerabilities.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1);

-- Seed Tasks
INSERT INTO tasks (id, module_id, title, instructions, task_type, max_score, passing_score, is_mandatory) VALUES
(2001, 101, 'Assignment 1: Ingress Gateway Resiliency & Failover Specification', 'Draft an architectural RFC detailing a dual-region active-active ingress routing plan. Specify: 1) Health check probe frequencies and dead-man switches; 2) State synchronization strategy for TLS session resumption tickets; 3) Circuit breaking rules to prevent cascading brownouts during regional evacuation.', 'text_response', 100, 75, 1),
(2002, 102, 'Assignment 2: Database Partitioning & Benchmark Artifact', 'Submit your benchmark repository link or technical report demonstrating a sharded database cluster with composite partition keys. Include P95/P99 latency measurements under a simulated 20,000 write ops/sec load profile.', 'file_upload', 100, 80, 1),
(2003, 103, 'Assignment 3: Capstone Distributed Architecture Defense', 'Synthesize Modules 1, 2, and 3 into a comprehensive architectural defense. Defend your choice of storage engines, consensus mechanisms, and egress rate limits against an unpredictable 10x traffic spike.', 'text_response', 100, 80, 1),
(3001, 201, 'Assignment 1: Quantization Benchmarking Analysis', 'Submit a quantitative comparison of perplexity versus throughput across FP16, INT8, and 4-bit AWQ implementations on an NVIDIA A10G/L4 GPU profile.', 'text_response', 100, 70, 1),
(4001, 301, 'Assignment 1: Supply Chain Security Audit & Policy Gate', 'Analyze an attached container build manifest and author a Kyverno admission policy that enforces cryptographic signature verification and SBOM presence before deployment to production.', 'text_response', 100, 80, 1);

-- Seed Enrollment
INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at) VALUES
(501, 2, 1, 'active', '2026-10-15 10:00:00');

-- Seed Lesson Progress
INSERT INTO lesson_progress (id, enrollment_id, lesson_id, is_completed, completed_at) VALUES
(601, 501, 1001, 1, '2026-10-16 14:30:00'),
(602, 501, 1002, 1, '2026-10-17 09:15:00');

-- Seed Task Submissions
INSERT INTO task_submissions (id, task_id, enrollment_id, submission_text, attachment_url, status, score, feedback, graded_by, submitted_at, graded_at) VALUES
(701, 2001, 501, 'For the active-active multi-region ingress configuration, we establish BGP Anycast routes with Route Health Injection (RHI) to ensure traffic withdraws cleanly within 3 seconds of health check failure. TLS session tickets are secured using a distributed Redis cluster with asymmetric session encryption keys rotated hourly via HashiCorp Vault. Rate-limiting is enforced at the Envoy edge using token bucket algorithms with a maximum burst capacity of 150% baseline.', 'https://aaroha-inc.com/artifacts/rfc-ingress-failover-v1.pdf', 'passed', 96, 'Rigorous architectural breakdown. The BGP withdrawal timeframe and Redis session key rotation meet enterprise production standards.', 1, '2026-10-18 16:20:00', '2026-10-19 11:00:00'),
(702, 2002, 501, 'Benchmarking report attached demonstrating horizontal sharding across 4 shards using MurmurHash3 for composite key distribution. Under 20k writes/sec, P95 latency remained under 4.2ms, and P99 stayed bounded at 11.8ms.', 'https://aaroha-inc.com/artifacts/sharding-benchmark-metrics.zip', 'under_review', NULL, NULL, NULL, '2026-10-22 19:45:00', NULL);

SET FOREIGN_KEY_CHECKS = 1;
