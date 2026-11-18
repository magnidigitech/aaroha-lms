#!/usr/bin/env python3
"""
Aaroha LMS - SQLite Schema Synchronization Script
Safely applies missing columns to SQLite database (lms.sqlite) to ensure 100% parity with MySQL and PHP backend.
"""

import os
import sqlite3

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'lms.sqlite'))

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    migrations = {
        'users': [
            ("display_name", "TEXT NULL"),
            ("phone", "TEXT NULL"),
            ("timezone", "TEXT DEFAULT 'Asia/Kolkata'"),
            ("preferred_language", "TEXT DEFAULT 'en'"),
            ("notification_preferences_json", "TEXT NULL"),
            ("security_settings_json", "TEXT NULL"),
            ("authorized_roles_json", "TEXT NULL"),
            ("status", "TEXT DEFAULT 'active'"),
            ("is_archived", "INTEGER DEFAULT 0"),
            ("deleted_at", "DATETIME NULL"),
            ("archived_at", "DATETIME NULL"),
            ("archival_reason", "TEXT NULL")
        ],
        'student_profiles': [
            ("skills", "TEXT NULL"),
            ("resume_url", "TEXT NULL"),
            ("portfolio_url", "TEXT NULL"),
            ("github_url", "TEXT NULL"),
            ("work_experience", "TEXT NULL"),
            ("career_interests", "TEXT NULL")
        ],
        'faculty_profiles': [
            ("bio", "TEXT NULL"),
            ("qualifications", "TEXT NULL"),
            ("professional_links_json", "TEXT NULL"),
            ("experience_years", "TEXT NULL")
        ],
        'lessons': [
            ("storage_key", "TEXT NULL")
        ],
        'task_submissions': [
            ("storage_key", "TEXT NULL"),
            ("source_type", "TEXT DEFAULT 'file'"),
            ("file_name", "TEXT NULL"),
            ("file_size", "INTEGER NULL")
        ],
        'learning_materials': [
            ("audience_id", "INTEGER NULL"),
            ("approved_at", "DATETIME NULL"),
            ("notified_at", "DATETIME NULL"),
            ("recipient_count", "INTEGER DEFAULT 0"),
            ("notify_audience", "INTEGER DEFAULT 0"),
            ("destination", "TEXT NULL"),
            ("live_version_data", "TEXT NULL"),
            ("approved_by", "INTEGER NULL"),
            ("status", "TEXT DEFAULT 'active'"),
            ("approval_status", "TEXT DEFAULT 'approved'"),
            ("audience_type", "TEXT DEFAULT 'all'"),
            ("notification_status", "TEXT DEFAULT 'pending'"),
            ("review_notes", "TEXT NULL")
        ],
        'announcements': [
            ("notified_at", "DATETIME NULL"),
            ("recipient_count", "INTEGER DEFAULT 0"),
            ("notify_audience", "INTEGER DEFAULT 0"),
            ("destination", "TEXT NULL"),
            ("live_version_data", "TEXT NULL"),
            ("approval_status", "TEXT DEFAULT 'approved'"),
            ("notification_status", "TEXT DEFAULT 'pending'"),
            ("scheduled_at", "DATETIME NULL")
        ]
    }

    added_count = 0
    for table, columns in migrations.items():
        existing_cols = [r[1] for r in cur.execute(f"PRAGMA table_info({table})").fetchall()]
        for col_name, col_def in columns:
            if col_name not in existing_cols:
                sql = f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}"
                cur.execute(sql)
                print(f"[+] Added column {table}.{col_name}")
                added_count += 1

    conn.commit()
    conn.close()
    print(f"[*] Migration completed. Added {added_count} missing columns to {DB_PATH}.")

if __name__ == '__main__':
    migrate()
