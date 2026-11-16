import os
import sqlite3

def apply():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'lms.sqlite'))
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")

    # 1. Update faculty_profiles
    existing_cols = [r[1] for r in cur.execute("PRAGMA table_info(faculty_profiles)").fetchall()]
    if 'invitation_token' not in existing_cols:
        cur.execute("ALTER TABLE faculty_profiles ADD COLUMN invitation_token TEXT DEFAULT NULL;")
        print("Added invitation_token to faculty_profiles")
    if 'invitation_expires_at' not in existing_cols:
        cur.execute("ALTER TABLE faculty_profiles ADD COLUMN invitation_expires_at DATETIME DEFAULT NULL;")
        print("Added invitation_expires_at to faculty_profiles")
    if 'invitation_accepted_at' not in existing_cols:
        cur.execute("ALTER TABLE faculty_profiles ADD COLUMN invitation_accepted_at DATETIME DEFAULT NULL;")
        print("Added invitation_accepted_at to faculty_profiles")

    # 2. Create password_resets table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)
    print("Ensured password_resets table exists")

    conn.commit()
    conn.close()
    print("Auth migrations successfully applied to lms.sqlite")

if __name__ == '__main__':
    apply()
