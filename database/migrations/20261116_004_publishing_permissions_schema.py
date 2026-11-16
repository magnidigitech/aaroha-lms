import sqlite3
import os
import json

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lms.sqlite')
print(f"Connecting to SQLite database: {db_path}")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

def add_column_if_not_exists(table, col_name, col_type):
    cur.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cur.fetchall()]
    if col_name not in columns:
        print(f"Adding column '{col_name}' ({col_type}) to table '{table}'...")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
    else:
        print(f"Column '{col_name}' already exists in table '{table}'.")

# 1. Update learning_materials table
add_column_if_not_exists('learning_materials', 'destination', "TEXT NOT NULL DEFAULT 'private_lms'")
add_column_if_not_exists('learning_materials', 'status', "TEXT NOT NULL DEFAULT 'published'")
add_column_if_not_exists('learning_materials', 'approval_status', "TEXT NOT NULL DEFAULT 'approved'")
add_column_if_not_exists('learning_materials', 'approved_by', "INTEGER NULL")
add_column_if_not_exists('learning_materials', 'approved_at', "DATETIME NULL")
add_column_if_not_exists('learning_materials', 'review_notes', "TEXT NULL")
add_column_if_not_exists('learning_materials', 'audience_type', "TEXT NOT NULL DEFAULT 'course_enrolled'")
add_column_if_not_exists('learning_materials', 'audience_id', "INTEGER NULL")
add_column_if_not_exists('learning_materials', 'recipient_count', "INTEGER NOT NULL DEFAULT 0")
add_column_if_not_exists('learning_materials', 'live_version_data', "TEXT NULL")
add_column_if_not_exists('learning_materials', 'notify_audience', "INTEGER NOT NULL DEFAULT 0")
add_column_if_not_exists('learning_materials', 'notification_status', "TEXT NOT NULL DEFAULT 'none'")
add_column_if_not_exists('learning_materials', 'notified_at', "DATETIME NULL")

# 2. Update announcements table
add_column_if_not_exists('announcements', 'destination', "TEXT NOT NULL DEFAULT 'private_lms'")
add_column_if_not_exists('announcements', 'approval_status', "TEXT NOT NULL DEFAULT 'approved'")
add_column_if_not_exists('announcements', 'scheduled_at', "DATETIME NULL")
add_column_if_not_exists('announcements', 'notify_audience', "INTEGER NOT NULL DEFAULT 1")
add_column_if_not_exists('announcements', 'notification_status', "TEXT NOT NULL DEFAULT 'queued'")
add_column_if_not_exists('announcements', 'notified_at', "DATETIME NULL")
add_column_if_not_exists('announcements', 'recipient_count', "INTEGER NOT NULL DEFAULT 0")
add_column_if_not_exists('announcements', 'live_version_data', "TEXT NULL")

# 3. Create public_website_content table for showcases, articles, free resources, news
cur.execute("""
CREATE TABLE IF NOT EXISTS public_website_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL, -- 'article', 'project_showcase', 'resource', 'news_event', 'testimonial'
    summary TEXT NULL,
    body TEXT NULL,
    author_id INTEGER NOT NULL,
    destination TEXT NOT NULL DEFAULT 'public_website',
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_review', 'scheduled', 'published', 'archived'
    approval_status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_review', 'approved', 'changes_requested', 'rejected'
    reviewed_by INTEGER NULL,
    reviewed_at DATETIME NULL,
    review_notes TEXT NULL,
    consent_given INTEGER NOT NULL DEFAULT 1,
    media_url TEXT NULL,
    external_url TEXT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    live_version_data TEXT NULL,
    scheduled_at DATETIME NULL,
    published_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
)
""")

# 4. Seed realistic content demonstrating all states and destinations
# First, populate audience_id and recipient_count for existing learning materials
cur.execute("SELECT id, course_id, batch_id FROM learning_materials")
mats = cur.fetchall()
for m_id, c_id, b_id in mats:
    aud_type = 'batch_enrolled' if b_id else 'course_enrolled'
    aud_id = b_id if b_id else c_id
    # Calculate recipient count
    if b_id:
        cnt = cur.execute("SELECT COUNT(*) FROM batch_enrollments WHERE batch_id = ? AND status = 'active'", (b_id,)).fetchone()[0]
    elif c_id:
        cnt = cur.execute("SELECT COUNT(*) FROM enrollments WHERE course_id = ? AND status = 'active'", (c_id,)).fetchone()[0]
    else:
        cnt = 0
    cur.execute("""
        UPDATE learning_materials 
        SET destination = 'private_lms', status = 'published', approval_status = 'approved',
            audience_type = ?, audience_id = ?, recipient_count = ?
        WHERE id = ?
    """, (aud_type, aud_id, cnt, m_id))

# Insert sample materials for testing workflows:
# A. A draft material
cur.execute("""
    INSERT OR IGNORE INTO learning_materials 
    (id, title, description, material_type, file_url, course_id, batch_id, destination, status, approval_status, audience_type, audience_id, uploaded_by, recipient_count)
    VALUES (101, 'Advanced Raft Optimization Notes', 'Draft notes on Raft leader lease optimizations', 'pdf', '/materials/raft_notes_draft.pdf', 1, 1, 'private_lms', 'draft', 'draft', 'batch_enrolled', 1, 2, 7)
""")

# B. A scheduled material
cur.execute("""
    INSERT OR IGNORE INTO learning_materials 
    (id, title, description, material_type, file_url, course_id, batch_id, destination, status, approval_status, audience_type, audience_id, uploaded_by, scheduled_release_at, recipient_count)
    VALUES (102, 'Next Week Distributed Systems Quiz Solution', 'Solutions to upcoming exam', 'pdf', '/materials/quiz_sol.pdf', 1, 1, 'private_lms', 'scheduled', 'approved', 'batch_enrolled', 1, 2, '2026-11-25 10:00:00', 7)
""")

# C. A material submitted by faculty for public website review
cur.execute("""
    INSERT OR IGNORE INTO learning_materials 
    (id, title, description, material_type, file_url, course_id, destination, status, approval_status, audience_type, audience_id, uploaded_by, recipient_count)
    VALUES (103, 'Aaroha Open Source Raft Architecture Guide', 'Public whitepaper explaining distributed consensus', 'pdf', '/materials/raft_whitepaper.pdf', 1, 'public_website', 'pending_review', 'pending_review', 'course_enrolled', 1, 2, 0)
""")

# Seed public showcases and articles
public_content_samples = [
    (
        1,
        'Building Distributed KV Stores with Raft Consensus',
        'building-distributed-kv-stores-with-raft',
        'article',
        'An in-depth guide on implementing fault-tolerant distributed key-value storage in Go by Aaroha Fellow Elena Rostova.',
        'Distributed systems require robust consensus mechanisms. In this technical walkthrough, we explore Raft log replication and leader election in production cloud environments...',
        2, # Elena Rostova (faculty)
        'public_website',
        'published',
        'approved',
        1, # Aris Thorne (admin)
        '2026-11-15 14:00:00',
        'Approved for technical blog series.',
        1,
        '/images/articles/raft-kv.png',
        1,
        '2026-11-15 14:00:00'
    ),
    (
        2,
        'Student Showcase: High-Throughput Order Matching Engine',
        'showcase-high-throughput-matching-engine',
        'project_showcase',
        'Aarav Patel built an in-memory limit order book handling 150,000 orders per second with lock-free ring buffers.',
        'Capstone project demonstration featuring end-to-end performance benchmarks, WebSocket live stream architecture, and latency histograms under peak market simulations.',
        7, # Aarav Patel (student author with consent)
        'public_website',
        'published',
        'approved',
        1, # Admin approved
        '2026-11-14 10:00:00',
        'Consent verified. Verified showcase entry.',
        1,
        '/images/showcases/order-matching.png',
        1,
        '2026-11-14 10:00:00'
    ),
    (
        3,
        'Next-Gen Cloud Microservices Architecture Case Study',
        'cloud-microservices-case-study',
        'article',
        'Submitted draft examining zero-trust service meshes with Envoy and Istio.',
        'Full case study detailing canary deployments, mutual TLS verification, and distributed tracing across hybrid cloud clusters.',
        2, # Faculty author
        'public_website',
        'pending_review',
        'pending_review',
        None,
        None,
        None,
        1,
        '/images/articles/microservices.png',
        0,
        None
    ),
    (
        4,
        'Open Distributed Systems Syllabus and Reading List',
        'open-distributed-systems-syllabus',
        'resource',
        'Curated public resource list of seminal papers in distributed systems, consensus algorithms, and cloud storage.',
        'Readings include Lamport timestamps, Paxos Made Simple, Raft paper, Spanner, and DynamoDB architecture analysis.',
        1, # Admin
        'public_website',
        'published',
        'approved',
        1,
        '2026-11-10 12:00:00',
        'Public reference guide.',
        1,
        '/images/resources/syllabus.png',
        1,
        '2026-11-10 12:00:00'
    )
]

for item in public_content_samples:
    cur.execute("""
        INSERT OR REPLACE INTO public_website_content
        (id, title, slug, content_type, summary, body, author_id, destination, status, approval_status, reviewed_by, reviewed_at, review_notes, consent_given, media_url, is_featured, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, item)

conn.commit()
print("Migration 20261116_004 completed successfully!")
conn.close()
