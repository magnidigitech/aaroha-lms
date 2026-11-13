#!/usr/bin/env python3
import os
import sqlite3
import json

def init_db():
    db_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(db_dir, 'lms.sqlite')
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")

    # Schema
    cur.executescript("""
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
        is_published INTEGER NOT NULL DEFAULT 1,
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
    """)

    # Seed data
    pw_hash = '$2y$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' # 'password123'
    cur.executemany("INSERT INTO users (id, full_name, email, password_hash, role, title, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        (1, 'Dr. Aris Thorne', 'admin@aaroha-inc.com', pw_hash, 'admin', 'Director of Curriculum & Distributed Systems Faculty', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'),
        (2, 'Elena Rostova', 'elena.rostova@enterprise.io', pw_hash, 'student', 'Senior Systems Architect', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'),
        (3, 'Unenrolled Learner', 'learner@enterprise.io', pw_hash, 'student', 'Junior Systems Engineer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80')
    ])

    cur.executemany("INSERT INTO courses (id, title, slug, category, level, duration, partner_type, rating, reviews_count, badge_text, description, thumbnail_url, skills, what_you_will_learn, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (
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
            json.dumps(['Distributed Systems', 'Raft Consensus Protocol']),
            json.dumps(['Architect zero-trust multi-region ingress gateways']),
            1,
            1
        ),
        (
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
            json.dumps(['GPU Kernel Optimization']),
            json.dumps(['Compress and quantize transformer weights']),
            1,
            1
        ),
        (
            3,
            'Enterprise Cyber Defense & Zero-Day Threat Modeling',
            'enterprise-cyber-defense',
            'Cybersecurity',
            'Advanced Level',
            '10 Weeks',
            'Specialization',
            4.88,
            '1.4K',
            'New',
            'Master application security and infrastructure defense against zero-day attack vectors.',
            'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
            json.dumps(['STRIDE Threat Modeling', 'Zero-Trust']),
            json.dumps(['Execute enterprise-wide threat assessments']),
            1,
            1
        )
    ])

    cur.executemany("INSERT INTO modules (id, course_id, title, estimated_time, description, sequence_order) VALUES (?, ?, ?, ?, ?, ?)", [
        (101, 1, 'Module 1: Global Edge Routing & Zero-Trust Boundaries', '5 hours to complete', 'Explore ingress topology and Anycast BGP routing.', 1),
        (102, 1, 'Module 2: Distributed Consensus & State Storage', '6 hours to complete', 'Master Raft leader election and commit log safety.', 2),
        (103, 1, 'Module 3: Event Sourcing & High-Throughput Streaming', '5 hours to complete', 'Build change-data-capture pipelines and Kafka stream processors.', 3),
        (201, 2, 'Module 1: Kernel Optimization & Quantization Dynamics', '6 hours to complete', 'Analyze post-training quantization.', 1),
        (301, 3, 'Module 1: Threat Modeling & Supply-Chain Attestation', '6 hours to complete', 'Understand STRIDE risk modeling.', 1)
    ])

    cur.executemany("INSERT INTO lessons (id, module_id, title, content_type, duration, content_body, media_url, sequence_order, is_free_preview) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (1001, 101, 'Multi-Region Anycast Topology & BGP Ingress Routing', 'video', '22 min', 'An in-depth analysis of global edge ingress networks.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1),
        (1002, 101, 'Mutual TLS (mTLS) & Ephemeral Identity in Microservices', 'article', '14 min read', 'Perimeter-only security models fail once an adversary establishes lateral mobility.', None, 2, 0),
        (1003, 102, 'Raft Consensus Protocol & Split-Brain Mitigation', 'video', '28 min', 'Stateful services require unambiguous truth. We unpack the Raft consensus algorithm with secure streaming video.', 'https://www.youtube.com/embed/R2-9sDYtOt4', 1, 0),
        (1004, 102, 'LSM Trees vs B-Trees in Modern Storage Engines', 'article', '18 min read', 'Choosing between Log-Structured Merge trees and traditional B+Trees.', None, 2, 0),
        (1005, 103, 'Transactional Outbox Pattern & CDC Stream Pipelines', 'article', '16 min read', 'Dual-write operations between a relational database and a message broker.', None, 1, 0),
        (2001, 201, 'FP16, INT8 & INT4 Quantization Dynamics', 'video', '25 min', 'Techniques for compressing deep neural network weights.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1),
        (3001, 301, 'STRIDE Threat Modeling for Cloud-Native Microservices', 'video', '24 min', 'Deconstructing real-world attack vectors against containerized microservices.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, 1)
    ])

    cur.executemany("INSERT INTO tasks (id, module_id, title, instructions, task_type, max_score, passing_score, is_mandatory) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        (2001, 101, 'Assignment 1: Ingress Gateway Resiliency & Failover Specification', 'Draft an architectural RFC detailing a dual-region active-active ingress routing plan.', 'text_response', 100, 75, 1),
        (2002, 102, 'Assignment 2: Database Partitioning & Benchmark Artifact', 'Submit your benchmark repository link or technical report demonstrating a sharded database cluster.', 'file_upload', 100, 80, 1)
    ])

    cur.executemany("INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)", [
        (501, 2, 1, 'active')
    ])

    cur.executemany("INSERT INTO lesson_progress (id, enrollment_id, lesson_id, is_completed, completed_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)", [
        (601, 501, 1001, 1),
        (602, 501, 1002, 1)
    ])

    conn.commit()
    conn.close()
    print(f"SQLite database initialized successfully at: {db_path} ({os.path.getsize(db_path)} bytes)")

if __name__ == '__main__':
    init_db()
