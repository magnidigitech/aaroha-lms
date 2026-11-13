<?php
// Initialize SQLite database for local development and test execution
$dbPath = __DIR__ . '/lms.sqlite';
if (file_exists($dbPath)) {
    unlink($dbPath);
}

$pdo = new PDO("sqlite:{$dbPath}");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("PRAGMA foreign_keys = ON;");

// Create schema
$pdo->exec("
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    title TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Cloud Architecture',
    level TEXT NOT NULL DEFAULT 'Advanced Level',
    duration TEXT NOT NULL DEFAULT '8 Weeks',
    partner_type TEXT NOT NULL DEFAULT 'Specialization',
    rating REAL NOT NULL DEFAULT 4.90,
    reviews_count TEXT NOT NULL DEFAULT '2.8K',
    badge_text TEXT,
    description TEXT,
    thumbnail_url TEXT,
    skills TEXT,
    what_you_will_learn TEXT,
    prerequisites TEXT,
    about TEXT,
    instructor_name TEXT,
    instructor_title TEXT,
    instructor_department TEXT,
    instructor_bio TEXT,
    instructor_avatar TEXT,
    is_published INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE TABLE modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    estimated_time TEXT DEFAULT '5 hours to complete',
    description TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

CREATE TABLE lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'article',
    duration TEXT NOT NULL DEFAULT '15 min',
    content_body TEXT,
    media_url TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    is_free_preview INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    instructions TEXT NOT NULL,
    task_type TEXT NOT NULL DEFAULT 'text_response',
    max_score INTEGER NOT NULL DEFAULT 100,
    passing_score INTEGER NOT NULL DEFAULT 75,
    is_mandatory INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
);

CREATE TABLE enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    expires_at DATETIME,
    UNIQUE (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

CREATE TABLE lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    completed_at DATETIME,
    UNIQUE (enrollment_id, lesson_id),
    FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
);

CREATE TABLE task_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    enrollment_id INTEGER NOT NULL,
    submission_text TEXT,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    score INTEGER,
    feedback TEXT,
    graded_by INTEGER,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    graded_at DATETIME,
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    certificate_code TEXT NOT NULL UNIQUE,
    course_id INTEGER NOT NULL,
    user_id INTEGER,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT,
    course_title TEXT NOT NULL,
    issuer_id INTEGER,
    issuer_name TEXT NOT NULL,
    issuer_title TEXT,
    grade TEXT NOT NULL DEFAULT 'Verified Completion',
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (issuer_id) REFERENCES users (id) ON DELETE SET NULL
);
");

// Insert seed data
// Users
$pwHash = password_hash('password123', PASSWORD_BCRYPT);
$insUser = $pdo->prepare("INSERT INTO users (id, full_name, email, password_hash, role, title, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)");
$insUser->execute([1, 'Dr. Aris Thorne', 'admin@aaroha-inc.com', $pwHash, 'admin', 'Director of Curriculum', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80']);
$insUser->execute([2, 'Elena Rostova', 'elena.rostova@enterprise.io', $pwHash, 'student', 'Senior Systems Architect', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80']);
$insUser->execute([3, 'Unenrolled Learner', 'learner@enterprise.io', $pwHash, 'student', 'Junior Engineer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80']);

// Courses
$insCourse = $pdo->prepare("INSERT INTO courses (id, title, slug, category, level, duration, partner_type, rating, reviews_count, badge_text, description, thumbnail_url, skills, what_you_will_learn, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$insCourse->execute([
    1,
    'Distributed Cloud Architecture & High-Throughput Systems',
    'distributed-cloud-architecture',
    'Cloud Architecture',
    'Advanced Level',
    '8 Weeks',
    'Specialization',
    4.90,
    '2.8K',
    'Recently updated',
    'Design fault-tolerant, multi-region distributed systems capable of sustaining 100k+ QPS with strict P99 latency budgets.',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    json_encode(['Distributed Systems', 'Raft Consensus Protocol']),
    json_encode(['Architect zero-trust multi-region ingress gateways']),
    1,
    1
]);

$insCourse->execute([
    2,
    'Applied Machine Learning Engineering & Model Serving',
    'applied-ml-engineering',
    'Applied AI',
    'Advanced Level',
    '6 Weeks',
    'Professional Certificate',
    4.95,
    '1.9K',
    'Top AI program',
    'Bridge the gap between model weights and production inference.',
    'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1200&q=80',
    json_encode(['GPU Kernel Optimization']),
    json_encode(['Compress and quantize transformer weights']),
    1,
    1
]);

// Modules
$insMod = $pdo->prepare("INSERT INTO modules (id, course_id, title, estimated_time, description, sequence_order) VALUES (?, ?, ?, ?, ?, ?)");
$insMod->execute([101, 1, 'Module 1: Global Edge Routing & Zero-Trust Boundaries', '5 hours to complete', 'Explore ingress topology and Anycast BGP routing.', 1]);
$insMod->execute([102, 1, 'Module 2: Distributed Consensus & State Storage', '6 hours to complete', 'Master Raft leader election and commit log safety.', 2]);
$insMod->execute([201, 2, 'Module 1: Kernel Optimization & Quantization Dynamics', '6 hours to complete', 'Analyze post-training quantization.', 1]);

// Lessons
$insLesson = $pdo->prepare("INSERT INTO lessons (id, module_id, title, content_type, duration, content_body, media_url, sequence_order, is_free_preview) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

// Lesson 1001: Free preview video
$insLesson->execute([1001, 101, 'Multi-Region Anycast Topology & BGP Ingress Routing', 'video', '22 min', 'An in-depth analysis of global edge ingress networks.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1]);

// Lesson 1002: Enrolled article
$insLesson->execute([1002, 101, 'Mutual TLS (mTLS) & Ephemeral Identity in Microservices', 'article', '14 min read', 'Perimeter-only security models fail once an adversary establishes lateral mobility.', null, 2, 0]);

// Lesson 1003: Enrolled video (Stanford Raft Consensus Protocol lecture)
$insLesson->execute([1003, 102, 'Raft Consensus Protocol & Split-Brain Mitigation', 'video', '28 min', 'Stateful services require unambiguous truth. We unpack the Raft consensus algorithm with secure streaming video.', 'https://www.youtube.com/embed/R2-9sDYtOt4', 1, 0]);

// Lesson 2001: Course 2 enrolled video (User 2 is NOT enrolled here)
$insLesson->execute([2001, 201, 'FP16, INT8 & INT4 Quantization Dynamics', 'video', '25 min', 'Techniques for compressing deep neural network weights.', '0de41d3a-4d1d-498b-b731-bcc31a59ffc2', 1, 0]);

// Enrollments: User 2 is enrolled in Course 1 only!
$insEnroll = $pdo->prepare("INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)");
$insEnroll->execute([501, 2, 1, 'active']);

echo "SQLite database initialized successfully at $dbPath\n";

