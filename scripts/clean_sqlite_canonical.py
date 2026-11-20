import sqlite3
import os
import hashlib

DB_PATH = 'aaroha_lms/database/lms.sqlite'
if not os.path.exists(DB_PATH):
    print("SQLite DB not found at", DB_PATH)
    exit(1)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

pw_hash = hashlib.sha256("password123".encode()).hexdigest()

canonical_emails = [
    'admin@aaroha-inc.com',
    'coordinator@aaroha-inc.com',
    'faculty@aaroha-inc.com',
    'student@aaroha-inc.com',
    'placement@aaroha-inc.com',
    'ryu@aaroha.in',
    'aa@aaroha.in'
]

# Find users to delete
cur.execute("SELECT id, email, role, full_name FROM users")
all_users = cur.fetchall()
delete_ids = []
for u in all_users:
    if u['email'].lower() not in canonical_emails:
        delete_ids.append(u['id'])
        print(f"Purging dummy user {u['id']}: {u['email']} [{u['role']}] - {u['full_name']}")

if delete_ids:
    in_clause = ','.join('?' * len(delete_ids))
    try: cur.execute(f"DELETE FROM certificates WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM task_submissions WHERE enrollment_id IN (SELECT id FROM enrollments WHERE user_id IN ({in_clause}))", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM attendance_records WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM batch_enrollments WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM enrollments WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM student_profiles WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM faculty_profiles WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM placement_profiles WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM fee_plans WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM student_followups WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM password_resets WHERE user_id IN ({in_clause})", delete_ids)
    except: pass
    try: cur.execute(f"DELETE FROM users WHERE id IN ({in_clause})", delete_ids)
    except: pass

canonical_defs = [
    ('admin@aaroha-inc.com', 'Dr. Aris Thorne', 'super_admin', 'Dean of Engineering & Super Admin', '/avatars/3d/memo_1.png'),
    ('coordinator@aaroha-inc.com', 'Priya Sharma', 'coordinator', 'Academic Operations Coordinator', '/avatars/3d/memo_2.png'),
    ('faculty@aaroha-inc.com', 'Elena Rostova', 'faculty', 'Senior Faculty & ML Chair', '/avatars/3d/memo_3.png'),
    ('student@aaroha-inc.com', 'Student Fellow', 'student', 'Student Fellow', '/avatars/3d/memo_4.png'),
    ('placement@aaroha-inc.com', 'Deepa Nair', 'placement_officer', 'Senior Career & Placement Director', '/avatars/3d/memo_5.png'),
    ('ryu@aaroha.in', 'Ryu', 'student', 'Student Fellow', '/avatars/3d/memo_13.png'),
    ('aa@aaroha.in', 'AA', 'faculty', 'Lead Instructor', '/avatars/3d/memo_6.png')
]

for email, name, role, title, avatar in canonical_defs:
    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    if not row:
        cur.execute("""
            INSERT INTO users (full_name, email, password_hash, role, title, avatar, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """, (name, email, pw_hash, role, title, avatar))
        uid = cur.lastrowid
        print(f"Created canonical SQLite user {uid}: {email} [{role}]")
    else:
        uid = row['id']
        cur.execute("UPDATE users SET full_name = ?, role = ?, title = ?, avatar = ?, password_hash = ? WHERE id = ?",
                    (name, role, title, avatar, pw_hash, uid))
        print(f"Updated canonical SQLite user {uid}: {email} [{role}]")

    # Ensure profile
    if role == 'student':
        cur.execute("SELECT id FROM student_profiles WHERE user_id = ?", (uid,))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO student_profiles (user_id, student_id_code, account_status, admission_status, enrollment_status)
                VALUES (?, ?, 'active', 'admitted', 'enrolled')
            """, (uid, f"STU-2026-{uid:04d}"))
    elif role == 'faculty':
        cur.execute("SELECT id FROM faculty_profiles WHERE user_id = ?", (uid,))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO faculty_profiles (user_id, faculty_id_code, account_status)
                VALUES (?, ?, 'active')
            """, (uid, f"FAC-2026-{uid:04d}"))

conn.commit()

# Final check
print("\n=== FINAL SQLITE USERS ===")
cur.execute("SELECT id, email, role, full_name FROM users ORDER BY id ASC")
for r in cur.fetchall():
    print(f"User {r['id']}: {r['email']} [{r['role']}] - {r['full_name']}")

conn.close()
