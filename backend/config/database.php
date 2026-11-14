<?php
// Aaroha LMS - Database Configuration
// Compatible with MySQL 8.0+ / MariaDB via phpMyAdmin on Hostinger Shared Hosting,
// with transparent SQLite support for local development & testing.

class Database {
    // Default Hostinger MySQL settings (override via env.php, environment, or direct update)
    private static $host = 'localhost';
    private static $db_name = 'lms_db';
    private static $username = 'root';
    private static $password = '';
    private static $charset = 'utf8mb4';
    private static $pdo = null;

    public static function getConnection() {
        if (self::$pdo === null) {
            // Load credentials from optional env.php file if present
            $envConfig = [];
            $candidates = [
                __DIR__ . '/env.php',
                dirname(__DIR__, 2) . '/env.php',
                dirname(__DIR__, 3) . '/env.php',
            ];
            foreach ($candidates as $candidate) {
                if (file_exists($candidate)) {
                    $envConfig = require $candidate;
                    break;
                }
            }

            $driver = $envConfig['DB_DRIVER'] ?? getenv('DB_DRIVER') ?: 'mysql';
            $sqliteCandidates = [
                $envConfig['DB_SQLITE_PATH'] ?? null,
                getenv('DB_SQLITE_PATH') ?: null,
                __DIR__ . '/lms.sqlite',
                __DIR__ . '/../lms.sqlite',
                __DIR__ . '/../../database/lms.sqlite',
                dirname(__DIR__, 2) . '/database/lms.sqlite',
            ];
            $resolvedSqlite = null;
            foreach ($sqliteCandidates as $cand) {
                if (!empty($cand) && file_exists($cand)) {
                    $resolvedSqlite = $cand;
                    break;
                }
            }
            $sqlitePath = $resolvedSqlite ?: (__DIR__ . '/lms.sqlite');

            if ($driver === 'sqlite' || (!empty($resolvedSqlite) && $driver !== 'mysql')) {
                try {
                    self::$pdo = new PDO("sqlite:{$resolvedSqlite}", null, null, [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    ]);
                    self::$pdo->exec("PRAGMA foreign_keys = ON;");
                    return self::$pdo;
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'error' => 'SQLite database connection failed: ' . $e->getMessage()
                    ]);
                    exit;
                }
            }

            $host = $envConfig['DB_HOST'] ?? getenv('DB_HOST') ?: self::$host;
            $db_name = $envConfig['DB_NAME'] ?? getenv('DB_NAME') ?: self::$db_name;
            $username = $envConfig['DB_USER'] ?? getenv('DB_USER') ?: self::$username;
            $password = $envConfig['DB_PASS'] ?? (getenv('DB_PASS') !== false ? getenv('DB_PASS') : self::$password);
            $charset = self::$charset;

            $dsn = "mysql:host={$host};dbname={$db_name};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$pdo = new PDO($dsn, $username, $password, $options);
                self::$pdo->exec("SET NAMES {$charset} COLLATE utf8mb4_unicode_ci");

                // Auto-provision MySQL schema & seeds if database is empty
                try {
                    $tableCheck = self::$pdo->query("SHOW TABLES LIKE 'courses'")->fetch();
                    if (!$tableCheck) {
                        $schemaFiles = [
                            __DIR__ . '/schema.sql',
                            __DIR__ . '/../../database/schema.sql',
                            dirname(__DIR__, 2) . '/database/schema.sql'
                        ];
                        $seedFiles = [
                            __DIR__ . '/seeds_dev.sql',
                            __DIR__ . '/../../database/seeds_dev.sql',
                            dirname(__DIR__, 2) . '/database/seeds_dev.sql'
                        ];
                        foreach ($schemaFiles as $sf) {
                            if (file_exists($sf)) {
                                self::$pdo->exec(file_get_contents($sf));
                                break;
                            }
                        }
                        foreach ($seedFiles as $sf) {
                            if (file_exists($sf)) {
                                self::$pdo->exec(file_get_contents($sf));
                                break;
                            }
                        }
                    } else {
                        // Non-destructive column migrations for courses
                        try {
                            $cols = self::$pdo->query("SHOW COLUMNS FROM courses")->fetchAll(PDO::FETCH_COLUMN);
                            $colSet = array_flip($cols);
                            if (!isset($colSet['prerequisites'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN prerequisites TEXT NULL");
                            }
                            if (!isset($colSet['about'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN about TEXT NULL");
                            }
                            if (!isset($colSet['instructor_name'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_name VARCHAR(150) NULL");
                            }
                            if (!isset($colSet['instructor_title'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_title VARCHAR(150) NULL");
                            }
                            if (!isset($colSet['instructor_department'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_department VARCHAR(150) NULL");
                            }
                            if (!isset($colSet['instructor_bio'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_bio TEXT NULL");
                            }
                            if (!isset($colSet['instructor_avatar'])) {
                                self::$pdo->exec("ALTER TABLE courses ADD COLUMN instructor_avatar VARCHAR(500) NULL");
                            }

                            // Non-destructive table creation for certificates
                            self::$pdo->exec("CREATE TABLE IF NOT EXISTS certificates (
                                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                                certificate_code VARCHAR(100) NOT NULL UNIQUE,
                                course_id INT UNSIGNED NOT NULL,
                                user_id INT UNSIGNED NULL,
                                recipient_name VARCHAR(200) NOT NULL,
                                recipient_email VARCHAR(200) NULL,
                                course_title VARCHAR(255) NOT NULL,
                                issuer_id INT UNSIGNED NULL,
                                issuer_name VARCHAR(200) NOT NULL,
                                issuer_title VARCHAR(200) NULL,
                                grade VARCHAR(150) NOT NULL DEFAULT 'Verified Completion',
                                issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )");

                            // Self-heal: ensure image and avatar columns can hold full base64 data URIs
                            @self::$pdo->exec("ALTER TABLE courses MODIFY COLUMN thumbnail_url LONGTEXT NULL");
                            @self::$pdo->exec("ALTER TABLE courses MODIFY COLUMN instructor_avatar LONGTEXT NULL");

                            // Create degrees table
                            self::$pdo->exec("CREATE TABLE IF NOT EXISTS degrees (
                                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                                title VARCHAR(255) NOT NULL,
                                slug VARCHAR(255) NOT NULL UNIQUE,
                                degree_type VARCHAR(100) NOT NULL,
                                duration VARCHAR(100) NOT NULL,
                                level VARCHAR(100) NOT NULL,
                                accreditation VARCHAR(255) NOT NULL,
                                course_id INT UNSIGNED NULL,
                                faculty_name VARCHAR(200) NOT NULL,
                                faculty_title VARCHAR(200) NULL,
                                faculty_avatar LONGTEXT NULL,
                                description TEXT NOT NULL,
                                modules_count VARCHAR(100) NULL,
                                evaluated_projects_count VARCHAR(100) NULL,
                                credential_awarded VARCHAR(255) NULL,
                                skills LONGTEXT NULL,
                                highlights LONGTEXT NULL,
                                is_published TINYINT(1) DEFAULT 1,
                                is_deleted TINYINT(1) DEFAULT 0,
                                created_by INT UNSIGNED NULL,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )");

                            // Seed Core Degrees 1, 2, 3 if empty
                            $degCount = (int)self::$pdo->query("SELECT COUNT(*) FROM degrees WHERE is_deleted = 0")->fetchColumn();
                            if ($degCount === 0) {
                                $stmtDeg = self::$pdo->prepare("
                                    INSERT INTO degrees 
                                    (id, title, slug, degree_type, duration, level, accreditation, course_id, faculty_name, faculty_title, faculty_avatar, description, modules_count, evaluated_projects_count, credential_awarded, skills, highlights, is_published, is_deleted, created_by)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1)
                                ");
                                $stmtDeg->execute([
                                    1,
                                    'Master of Science in Distributed Cloud Architecture & High-Throughput Systems',
                                    'distributed-cloud-architecture',
                                    'Master of Science (M.S. Equivalent)',
                                    '12 Months · 36 ECTS Credits',
                                    'Graduate / Principal Level',
                                    'Aaroha Institute of Technology & Systems Directorate',
                                    1,
                                    'Faculty Member',
                                    'Chair of Distributed Infrastructure',
                                    '/avatars/3d/memo_1.png',
                                    'An advanced graduate curriculum focused on multi-region consensus engines, kernel-bypass networking, Raft leader election invariants, and LSM-tree storage internals sustaining 100k+ QPS with strict P99 latency budgets.',
                                    '3 In-Depth Specialization Semesters',
                                    '3 Production RFC Architectural Defenses',
                                    'Official Master of Science Degree & Accredited Parchment',
                                    json_encode(['Raft Consensus Protocol', 'BGP Anycast Edge Routing', 'LSM Storage Compaction (RocksDB)', 'Zero-Trust mTLS Architecture', 'Transactional Outbox & CDC']),
                                    json_encode(['100% online with asynchronous laboratory benchmarks', 'Mandatory evaluated capstone evaluated by systems faculty', 'Permanent verifiable cryptographic degree credential on graduation'])
                                ]);
                                $stmtDeg->execute([
                                    2,
                                    'Master of Engineering in Applied Machine Learning & Model Serving Infrastructure',
                                    'applied-ml-engineering',
                                    'Master of Engineering (M.Eng. Equivalent)',
                                    '10 Months · 32 ECTS Credits',
                                    'Graduate / Staff ML Engineer',
                                    'Accelerated Computing Directorate, Aaroha Institute',
                                    2,
                                    'Faculty Member',
                                    'ML Systems Engineer & Faculty Chair',
                                    '/avatars/3d/memo_3.png',
                                    'Bridging the gap between neural weights and production GPU runtimes. Specialize in low-latency transformer inference, continuous request batching, INT8/AWQ quantization, and Triton model serving.',
                                    '2 Core Semesters + Accelerated Lab',
                                    '2 Evaluated GPU Throughput Benchmarks',
                                    'Master of Engineering in Applied ML Systems',
                                    json_encode(['vLLM & Continuous Batching', 'AWQ & GPTQ Quantization', 'Triton Multi-Model Inference', 'CUDA Memory Bounds', 'Concept Drift Telemetry']),
                                    json_encode(['Hands-on profiling with production GPU execution graphs', 'Faculty evaluation of sub-50ms P99 inference SLAs', 'Dual-accreditation with industry systems laboratories'])
                                ]);
                                $stmtDeg->execute([
                                    3,
                                    'Post-Graduate Diploma in Enterprise Cyber Defense & Zero-Trust Architecture',
                                    'enterprise-cyber-defense',
                                    'Post-Graduate Diploma (P.G. Dip)',
                                    '8 Months · 24 ECTS Credits',
                                    'Advanced Specialist',
                                    'Center for Cyber Resilience, Aaroha Institute',
                                    3,
                                    'Faculty Member',
                                    'Security Architect & Red Team Fellow',
                                    '/avatars/3d/memo_14.png',
                                    'Master application defense, supply-chain attestation, memory safety transitions, and real-time incident triage using eBPF kernel telemetry, SLSA Level 3 attestations, and STRIDE threat modeling.',
                                    '2 Specialist Semesters',
                                    '2 Cryptographic Supply Chain Audits',
                                    'Accredited Post-Graduate Diploma in Cyber Defense',
                                    json_encode(['STRIDE Threat Modeling', 'eBPF Kernel Telemetry', 'Sigstore Cosign Attestations', 'mTLS Identity Mesh (SPIFFE)', 'Zero-Day Incident Forensics']),
                                    json_encode(['Real-world simulated adversary scenarios and red-team defenses', 'Automated admission controller policy authoring (Kyverno)', 'Tamper-evident verification backed by Aaroha Certificate Authority'])
                                ]);
                            }

                            // Ensure Core Course 1 (Distributed Cloud Architecture) is active and provisioned
                            $c1 = self::$pdo->query("SELECT id, is_deleted, is_published FROM courses WHERE id = 1")->fetch();
                            if (!$c1) {
                                self::$pdo->exec("INSERT INTO courses (id, title, slug, category, level, duration, partner_type, rating, reviews_count, badge_text, description, thumbnail_url, skills, what_you_will_learn, is_published, is_deleted, created_by) VALUES
                                (1, 'Distributed Cloud Architecture & High-Throughput Systems', 'distributed-cloud-architecture', 'Cloud Architecture', 'Advanced Level', '8 Weeks', 'Specialization', 4.90, '2.8K', 'Recently updated', 'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets, Raft consensus, and transactional integrity.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', '[\"Distributed Systems\", \"Raft Consensus Protocol\", \"BGP Anycast Routing\", \"mTLS & Zero-Trust\", \"Storage Engines (LSM & B-Trees)\", \"Kafka & CDC Event Streaming\"]', '[\"Architect zero-trust multi-region ingress gateways utilizing Anycast BGP and Envoy proxy mesh routing\", \"Implement fault-tolerant distributed state machines using Raft consensus and split-brain mitigation invariants\", \"Tune write-heavy storage engines by comparing Log-Structured Merge (LSM) trees with InnoDB B+Trees\", \"Eliminate dual-write vulnerabilities with Change Data Capture (CDC) pipelines and transactional outbox patterns\"]', 1, 0, 1)");
                            } elseif ((int)$c1['is_deleted'] === 1 || (int)$c1['is_published'] === 0) {
                                self::$pdo->exec("UPDATE courses SET is_deleted = 0, is_published = 1 WHERE id = 1");
                            }

                            // Ensure Modules 101, 102, 103 for Course 1
                            $m101 = self::$pdo->query("SELECT id FROM modules WHERE id = 101")->fetch();
                            if (!$m101) {
                                self::$pdo->exec("INSERT INTO modules (id, course_id, title, estimated_time, description, sequence_order, is_deleted) VALUES
                                (101, 1, 'Module 1: Global Edge Routing & Zero-Trust Boundaries', '5 hours to complete', 'Explore ingress topology, Anycast BGP routing, and mTLS cryptography inside production Kubernetes clusters.', 1, 0),
                                (102, 1, 'Module 2: Distributed Consensus & State Storage', '6 hours to complete', 'Master Raft leader election, commit log safety, and high-performance LSM storage engine compaction.', 2, 0),
                                (103, 1, 'Module 3: Event Sourcing & High-Throughput Streaming', '5 hours to complete', 'Build change-data-capture pipelines and Kafka stream processors for guaranteed delivery semantics.', 3, 0)");
                            } else {
                                self::$pdo->exec("UPDATE modules SET is_deleted = 0 WHERE id IN (101, 102, 103)");
                            }

                            // Ensure Lessons 1001-1005 for Course 1
                            $l1001 = self::$pdo->query("SELECT id FROM lessons WHERE id = 1001")->fetch();
                            if (!$l1001) {
                                self::$pdo->exec("INSERT INTO lessons (id, module_id, title, content_type, video_provider, duration, content_body, media_url, sequence_order, is_free_preview, is_published, is_deleted) VALUES
                                (1001, 101, 'Multi-Region Anycast Topology & BGP Ingress Routing', 'video', 'youtube', '22 min', 'An in-depth analysis of global edge ingress networks. We evaluate how Anycast DNS and BGP route optimization direct user packets to the nearest Point of Presence (PoP), mitigating latency before requests reach internal mesh clusters. We examine real packet capture profiles and failure mode recovery when an undersea transit link experiences degradation.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1, 1, 0),
                                (1002, 101, 'Mutual TLS (mTLS) & Ephemeral Identity in Microservices', 'article', NULL, '14 min read', 'Perimeter-only security models fail once an adversary establishes lateral mobility inside your cluster. In this lesson, we specify zero-trust service-to-service communication using SPIFFE/SPIRE identity standards. We examine x509 certificate rotation pipelines, hardware security module (HSM) key isolation, and how Envoy sidecars negotiate cryptographic handshakes without introducing CPU bottlenecks.', NULL, 2, 0, 1, 0),
                                (1003, 102, 'Raft Consensus Protocol & Split-Brain Mitigation', 'video', 'youtube', '28 min', 'Stateful services require unambiguous truth. We unpack the Raft consensus algorithm: leader election, log replication, safety invariants, and commit index advancement. We inspect how network partitions induce partitioned quorums and why strict majority voting guarantees no two nodes can commit contradictory log entries.', 'https://www.youtube.com/embed/R2-9sDYtOt4', 1, 0, 1, 0),
                                (1004, 102, 'LSM Trees vs B-Trees in Modern Storage Engines', 'article', NULL, '18 min read', 'Choosing between Log-Structured Merge (LSM) trees (RocksDB, Cassandra) and traditional B+Trees (InnoDB, PostgreSQL) dictates write amplification and read amplification. We examine memtable flushes, write-ahead logs (WAL), Bloom filter tuning, and tiered compaction strategies under sustained write pressures.', NULL, 2, 0, 1, 0),
                                (1005, 103, 'Transactional Outbox Pattern & CDC Stream Pipelines', 'article', NULL, '16 min read', 'Dual-write operations between a relational database and a message broker are vulnerable to split-second failures that cause data inconsistency. We implement the Transactional Outbox Pattern using Change Data Capture (CDC) via Debezium and Kafka, guaranteeing at-least-once message delivery with exactly-once consumer semantics.', NULL, 1, 0, 1, 0)");
                            } else {
                                self::$pdo->exec("UPDATE lessons SET is_deleted = 0, is_published = 1 WHERE id IN (1001, 1002, 1003, 1004, 1005)");
                            }

                            // Ensure Tasks 2001-2003 for Course 1
                            $t2001 = self::$pdo->query("SELECT id FROM tasks WHERE id = 2001")->fetch();
                            if (!$t2001) {
                                self::$pdo->exec("INSERT INTO tasks (id, module_id, title, instructions, task_type, max_score, passing_score, is_mandatory, is_deleted) VALUES
                                (2001, 101, 'Assignment 1: Ingress Gateway Resiliency & Failover Specification', 'Draft an architectural RFC detailing a dual-region active-active ingress routing plan. Specify: 1) Health check probe frequencies and dead-man switches; 2) State synchronization strategy for TLS session resumption tickets; 3) Circuit breaking rules to prevent cascading brownouts during regional evacuation.', 'text_response', 100, 75, 1, 0),
                                (2002, 102, 'Assignment 2: Database Partitioning & Benchmark Artifact', 'Submit your benchmark repository link or technical report demonstrating a sharded database cluster with composite partition keys. Include P95/P99 latency measurements under a simulated 20,000 write ops/sec load profile.', 'file_upload', 100, 80, 1, 0),
                                (2003, 103, 'Assignment 3: Capstone Distributed Architecture Defense', 'Synthesize Modules 1, 2, and 3 into a comprehensive architectural defense. Defend your choice of storage engines, consensus mechanisms, and egress rate limits against an unpredictable 10x traffic spike.', 'text_response', 100, 80, 1, 0)");
                            } else {
                                self::$pdo->exec("UPDATE tasks SET is_deleted = 0 WHERE id IN (2001, 2002, 2003)");
                            }
                        } catch (Exception $colErr) {}
                    }
                } catch (Exception $initErr) {}
            } catch (PDOException $e) {
                // If local sqlite file exists, seamlessly fallback to maintain 100% operational uptime
                if ($resolvedSqlite && file_exists($resolvedSqlite)) {
                    try {
                        self::$pdo = new PDO("sqlite:{$resolvedSqlite}", null, null, [
                            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        ]);
                        self::$pdo->exec("PRAGMA foreign_keys = ON;");
                        self::$pdo->exec("CREATE TABLE IF NOT EXISTS certificates (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            certificate_code TEXT NOT NULL UNIQUE,
                            course_id INTEGER NOT NULL,
                            user_id INTEGER NULL,
                            recipient_name TEXT NOT NULL,
                            recipient_email TEXT NULL,
                            course_title TEXT NOT NULL,
                            issuer_id INTEGER NULL,
                            issuer_name TEXT NOT NULL,
                            issuer_title TEXT NULL,
                            grade TEXT NOT NULL DEFAULT 'Verified Completion',
                            issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );");
                        return self::$pdo;
                    } catch (PDOException $sqle) {}
                }

                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Database connection failed: ' . $e->getMessage()
                ]);
                exit;
            }
        }
        return self::$pdo;
    }

    public static function setConnection(?PDO $pdo): void {
        self::$pdo = $pdo;
    }
}
