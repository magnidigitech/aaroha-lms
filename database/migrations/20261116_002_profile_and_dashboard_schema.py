# Schema migration for role-based dashboards and user profile settings
import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lms.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

def add_col_if_missing(table, col, col_type):
    cur.execute(f"PRAGMA table_info({table})")
    cols = [r[1] for r in cur.fetchall()]
    if col not in cols:
        print(f"Adding {col} to {table}...")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        conn.commit()
    else:
        print(f"{table}.{col} already exists")

add_col_if_missing('users', 'display_name', 'TEXT NULL')
add_col_if_missing('users', 'phone', 'TEXT NULL')
add_col_if_missing('users', 'timezone', "TEXT DEFAULT 'Asia/Kolkata'")
add_col_if_missing('users', 'preferred_language', "TEXT DEFAULT 'en'")
add_col_if_missing('users', 'notification_preferences_json', 'TEXT NULL')
add_col_if_missing('users', 'security_settings_json', 'TEXT NULL')
add_col_if_missing('users', 'authorized_roles_json', 'TEXT NULL')

add_col_if_missing('student_profiles', 'skills', 'TEXT NULL')
add_col_if_missing('student_profiles', 'career_interests', 'TEXT NULL')
add_col_if_missing('student_profiles', 'resume_url', 'TEXT NULL')
add_col_if_missing('student_profiles', 'portfolio_url', 'TEXT NULL')
add_col_if_missing('student_profiles', 'github_url', 'TEXT NULL')
add_col_if_missing('student_profiles', 'work_experience', 'TEXT NULL')

add_col_if_missing('faculty_profiles', 'bio', 'TEXT NULL')
add_col_if_missing('faculty_profiles', 'qualifications', 'TEXT NULL')
add_col_if_missing('faculty_profiles', 'professional_links_json', 'TEXT NULL')

print("Migration script executed successfully.")
conn.close()
