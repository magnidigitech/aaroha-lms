#!/usr/bin/env python3
"""
Migration: 20261116_add_access_duration_and_uploads.py
Adds per-enrolment access duration, extension audit history, and direct file upload support.
Safe, idempotent migration for SQLite (local dev) and generates matching SQL for MySQL.
"""

import sqlite3
import os
import calendar
from datetime import datetime

def add_months_calendar(dt, months):
    """Accurate calendar arithmetic with month-end clipping."""
    total_months = dt.month - 1 + months
    year = dt.year + total_months // 12
    month = total_months % 12 + 1
    max_days = calendar.monthrange(year, month)[1]
    day = min(dt.day, max_days)
    return dt.replace(year=year, month=month, day=day)

def run_migration():
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lms.sqlite')
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. Inspect existing columns in courses
    cur.execute("PRAGMA table_info(courses);")
    course_cols = [row[1] for row in cur.fetchall()]

    if 'access_duration_type' not in course_cols:
        print("Adding access_duration_type to courses...")
        cur.execute("ALTER TABLE courses ADD COLUMN access_duration_type TEXT DEFAULT 'preset';")
    if 'access_duration_value' not in course_cols:
        print("Adding access_duration_value to courses...")
        cur.execute("ALTER TABLE courses ADD COLUMN access_duration_value INTEGER DEFAULT 6;")
    if 'access_duration_unit' not in course_cols:
        print("Adding access_duration_unit to courses...")
        cur.execute("ALTER TABLE courses ADD COLUMN access_duration_unit TEXT DEFAULT 'months';")

    # Set default values for existing courses
    cur.execute("""
        UPDATE courses 
        SET access_duration_type = 'preset', access_duration_value = 6, access_duration_unit = 'months'
        WHERE access_duration_value IS NULL OR access_duration_value = 0
    """)

    # 2. Inspect existing columns in enrollments
    cur.execute("PRAGMA table_info(enrollments);")
    enr_cols = [row[1] for row in cur.fetchall()]

    if 'access_start_at' not in enr_cols:
        print("Adding access_start_at to enrollments...")
        cur.execute("ALTER TABLE enrollments ADD COLUMN access_start_at DATETIME DEFAULT NULL;")
    if 'access_duration_applied' not in enr_cols:
        print("Adding access_duration_applied to enrollments...")
        cur.execute("ALTER TABLE enrollments ADD COLUMN access_duration_applied TEXT DEFAULT '6 Months';")
    if 'access_status' not in enr_cols:
        print("Adding access_status to enrollments...")
        cur.execute("ALTER TABLE enrollments ADD COLUMN access_status TEXT DEFAULT 'active';")

    # 3. Create enrollment_access_extensions table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS enrollment_access_extensions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL,
        previous_expires_at DATETIME NOT NULL,
        new_expires_at DATETIME NOT NULL,
        extension_days INTEGER NOT NULL,
        reason TEXT NOT NULL,
        extended_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id) ON DELETE CASCADE,
        FOREIGN KEY (extended_by) REFERENCES users (id) ON DELETE RESTRICT
    );
    """)

    # 4. Create uploaded_files table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS uploaded_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_key TEXT NOT NULL UNIQUE,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        category TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'private',
        storage_path TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
    );
    """)

    # 5. Add upload/source columns to existing content tables
    cur.execute("PRAGMA table_info(learning_materials);")
    mat_cols = [row[1] for row in cur.fetchall()]
    if 'source_type' not in mat_cols:
        cur.execute("ALTER TABLE learning_materials ADD COLUMN source_type TEXT DEFAULT 'url';")
    if 'storage_key' not in mat_cols:
        cur.execute("ALTER TABLE learning_materials ADD COLUMN storage_key TEXT DEFAULT NULL;")

    cur.execute("PRAGMA table_info(lessons);")
    lesson_cols = [row[1] for row in cur.fetchall()]
    if 'source_type' not in lesson_cols:
        cur.execute("ALTER TABLE lessons ADD COLUMN source_type TEXT DEFAULT 'url';")
    if 'storage_key' not in lesson_cols:
        cur.execute("ALTER TABLE lessons ADD COLUMN storage_key TEXT DEFAULT NULL;")

    cur.execute("PRAGMA table_info(tasks);")
    task_cols = [row[1] for row in cur.fetchall()]
    if 'attachment_url' not in task_cols:
        cur.execute("ALTER TABLE tasks ADD COLUMN attachment_url TEXT DEFAULT NULL;")
    if 'source_type' not in task_cols:
        cur.execute("ALTER TABLE tasks ADD COLUMN source_type TEXT DEFAULT 'url';")
    if 'storage_key' not in task_cols:
        cur.execute("ALTER TABLE tasks ADD COLUMN storage_key TEXT DEFAULT NULL;")

    cur.execute("PRAGMA table_info(task_submissions);")
    sub_cols = [row[1] for row in cur.fetchall()]
    if 'source_type' not in sub_cols:
        cur.execute("ALTER TABLE task_submissions ADD COLUMN source_type TEXT DEFAULT 'url';")
    if 'storage_key' not in sub_cols:
        cur.execute("ALTER TABLE task_submissions ADD COLUMN storage_key TEXT DEFAULT NULL;")
    if 'file_name' not in sub_cols:
        cur.execute("ALTER TABLE task_submissions ADD COLUMN file_name TEXT DEFAULT NULL;")
    if 'file_size' not in sub_cols:
        cur.execute("ALTER TABLE task_submissions ADD COLUMN file_size INTEGER DEFAULT NULL;")

    cur.execute("PRAGMA table_info(class_sessions);")
    cs_cols = [row[1] for row in cur.fetchall()]
    if 'recording_source_type' not in cs_cols:
        cur.execute("ALTER TABLE class_sessions ADD COLUMN recording_source_type TEXT DEFAULT 'url';")
    if 'recording_storage_key' not in cs_cols:
        cur.execute("ALTER TABLE class_sessions ADD COLUMN recording_storage_key TEXT DEFAULT NULL;")

    # 6. Backfill existing enrollments with reviewed calendar arithmetic
    cur.execute("SELECT id, user_id, course_id, status, enrolled_at, expires_at FROM enrollments;")
    existing_enrs = cur.fetchall()
    print(f"Auditing and backfilling {len(existing_enrs)} existing enrolments...")

    now = datetime.now()
    for row in existing_enrs:
        enr_id, u_id, c_id, status, enrolled_at_str, current_expires_at = row
        
        # Parse enrollment timestamp
        try:
            enrolled_at_dt = datetime.strptime(enrolled_at_str, "%Y-%m-%d %H:%M:%S")
        except Exception:
            enrolled_at_dt = now

        # Compute calculated expires_at using 6 months calendar arithmetic from enrollment activation
        calculated_expiry = add_months_calendar(enrolled_at_dt, 6)
        calculated_expiry_str = calculated_expiry.strftime("%Y-%m-%d 23:59:59")
        access_start_str = enrolled_at_dt.strftime("%Y-%m-%d %H:%M:%S")

        is_currently_expired = (now > calculated_expiry)
        enr_access_status = 'expired' if is_currently_expired else ('completed' if status == 'completed' else 'active')

        # Only update expires_at if it was null
        if not current_expires_at:
            cur.execute("""
                UPDATE enrollments
                SET access_start_at = ?,
                    expires_at = ?,
                    access_duration_applied = '6 Months',
                    access_status = ?
                WHERE id = ?
            """, (access_start_str, calculated_expiry_str, enr_access_status, enr_id))
            print(f"  Enrolment {enr_id} (Course {c_id}): access_start={access_start_str}, expires_at={calculated_expiry_str}, status={enr_access_status}")
        else:
            cur.execute("""
                UPDATE enrollments
                SET access_start_at = coalesce(access_start_at, ?),
                    access_duration_applied = coalesce(access_duration_applied, '6 Months'),
                    access_status = ?
                WHERE id = ?
            """, (access_start_str, enr_access_status, enr_id))

    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == '__main__':
    run_migration()

