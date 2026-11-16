import sqlite3
import os

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

# 1. Update users table for account-level lifecycle & blocking
add_column_if_not_exists('users', 'status', "TEXT NOT NULL DEFAULT 'active'")
add_column_if_not_exists('users', 'is_archived', "INTEGER NOT NULL DEFAULT 0")
add_column_if_not_exists('users', 'deactivated_at', "DATETIME NULL")
add_column_if_not_exists('users', 'deactivation_reason', "TEXT NULL")
add_column_if_not_exists('users', 'archived_at', "DATETIME NULL")
add_column_if_not_exists('users', 'archival_reason', "TEXT NULL")
add_column_if_not_exists('users', 'deleted_at', "DATETIME NULL")

# 2. Update student_profiles table
add_column_if_not_exists('student_profiles', 'archived_at', "DATETIME NULL")
add_column_if_not_exists('student_profiles', 'archival_reason', "TEXT NULL")
add_column_if_not_exists('student_profiles', 'archived_enrolment_resolution', "TEXT NULL")
add_column_if_not_exists('student_profiles', 'withdrawn_at', "DATETIME NULL")
add_column_if_not_exists('student_profiles', 'withdrawal_reason', "TEXT NULL")

# 3. Update faculty_profiles table
add_column_if_not_exists('faculty_profiles', 'archived_at', "DATETIME NULL")
add_column_if_not_exists('faculty_profiles', 'archival_reason', "TEXT NULL")
add_column_if_not_exists('faculty_profiles', 'reassignment_notes', "TEXT NULL")

# 4. Update batches table
add_column_if_not_exists('batches', 'archived_at', "DATETIME NULL")
add_column_if_not_exists('batches', 'deleted_at', "DATETIME NULL")

# 5. Update tasks table for assessment closure controls
add_column_if_not_exists('tasks', 'status', "TEXT NOT NULL DEFAULT 'published'")
add_column_if_not_exists('tasks', 'closed_at', "DATETIME NULL")
add_column_if_not_exists('tasks', 'closure_reason', "TEXT NULL")

# 6. Update certificates table for reissue tracking
add_column_if_not_exists('certificates', 'reissued_at', "DATETIME NULL")
add_column_if_not_exists('certificates', 'reissue_reason', "TEXT NULL")
add_column_if_not_exists('certificates', 'previous_certificate_code', "TEXT NULL")

conn.commit()
print("Migration 20261116_005 completed successfully!")
conn.close()
