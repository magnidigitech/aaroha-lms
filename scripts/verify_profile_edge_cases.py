import urllib.request
import urllib.error
import json
import sqlite3
import os

BASE_URL = 'http://127.0.0.1:8000/api'
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'lms.sqlite'))

def request(path, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(f'{BASE_URL}{path}', data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def test_user_without_profile():
    print("Testing User WITHOUT an existing professional profile record...")
    # Insert a user directly into users table with NO corresponding faculty_profiles or student_profiles row
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    pwd_hash = cur.execute("SELECT password_hash FROM users WHERE email = 'admin@aaroha-inc.com'").fetchone()[0]
    cur.execute("DELETE FROM users WHERE email = 'new_faculty@aaroha-inc.com'")
    cur.execute("""
        INSERT INTO users (email, password_hash, full_name, role, status, created_at, updated_at)
        VALUES ('new_faculty@aaroha-inc.com', ?, 'Prof. Newbie', 'faculty', 'active', datetime('now'), datetime('now'))
    """, (pwd_hash,))
    new_user_id = cur.lastrowid
    # Ensure NO faculty_profiles record exists
    cur.execute("DELETE FROM faculty_profiles WHERE user_id = ?", (new_user_id,))
    conn.commit()
    conn.close()

    # Login as this new faculty
    status, res = request('/auth/login', 'POST', {'email': 'new_faculty@aaroha-inc.com', 'password': 'password123'})
    assert status == 200, f"Login failed: {res}"
    token = res['token']

    # 1. GET profile must succeed with 200 and return a valid empty form state
    status, res = request('/user/profile', 'GET', token=token)
    assert status == 200, f"GET profile for user without profile failed: {status} {res}"
    assert res['success'] is True
    p = res['profile']
    assert p['id'] == new_user_id
    assert p['role'] == 'faculty'
    rp = p['role_profile']
    assert rp['type'] == 'faculty'
    assert rp['bio'] == ''
    assert rp['qualifications'] == ''
    assert rp['website_url'] == ''
    print("  ✓ User without profile returned valid empty form state (HTTP 200)")

    # 2. Save profile (UPSERT creates the faculty_profiles record)
    save_data = {
        'full_name': 'Prof. Newbie Updated',
        'display_name': 'Dr. Newbie',
        'phone': '9998887776',
        'role_profile': {
            'bio': 'Assistant Professor of Machine Learning.',
            'qualifications': 'M.S. in Computer Science',
            'expertise': 'Deep Learning, NLP',
            'experience_years': '4',
            'website_url': 'https://newbie-faculty.org',
            'linkedin_url': 'https://linkedin.com/in/newbie-faculty'
        }
    }
    status, res = request('/user/profile', 'PUT', save_data, token=token)
    assert status == 200, f"Save profile failed: {status} {res}"
    assert res['success'] is True
    print("  ✓ User without initial profile created and saved new professional profile (HTTP 200)")

    # 3. Reload profile to verify persistence
    status, res = request('/user/profile', 'GET', token=token)
    assert status == 200
    p2 = res['profile']
    assert p2['full_name'] == 'Prof. Newbie Updated'
    assert p2['display_name'] == 'Dr. Newbie'
    rp2 = p2['role_profile']
    assert rp2['bio'] == 'Assistant Professor of Machine Learning.'
    assert rp2['qualifications'] == 'M.S. in Computer Science'
    assert rp2['website_url'] == 'https://newbie-faculty.org'
    print("  ✓ Newly created profile reloaded and verified persistence (HTTP 200)")

    # Clean up test user
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM faculty_profiles WHERE user_id = ?", (new_user_id,))
    cur.execute("DELETE FROM users WHERE id = ?", (new_user_id,))
    conn.commit()
    conn.close()
    print("  ✓ Cleanup complete")

def test_student_without_profile():
    print("Testing Student WITHOUT an existing student profile record...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    pwd_hash = cur.execute("SELECT password_hash FROM users WHERE email = 'admin@aaroha-inc.com'").fetchone()[0]
    cur.execute("DELETE FROM users WHERE email = 'new_student@aaroha-inc.com'")
    cur.execute("""
        INSERT INTO users (email, password_hash, full_name, role, status, created_at, updated_at)
        VALUES ('new_student@aaroha-inc.com', ?, 'Fresh Student', 'student', 'active', datetime('now'), datetime('now'))
    """, (pwd_hash,))
    new_user_id = cur.lastrowid
    cur.execute("DELETE FROM student_profiles WHERE user_id = ?", (new_user_id,))
    conn.commit()
    conn.close()

    status, res = request('/auth/login', 'POST', {'email': 'new_student@aaroha-inc.com', 'password': 'password123'})
    assert status == 200
    token = res['token']

    status, res = request('/user/profile', 'GET', token=token)
    assert status == 200
    assert res['profile']['role_profile']['type'] == 'student'
    assert res['profile']['role_profile']['skills'] == ''
    print("  ✓ Student without profile returned valid empty form state (HTTP 200)")

    save_data = {
        'full_name': 'Fresh Student Enrolled',
        'role_profile': {
            'education': 'Bachelor of Engineering in CS',
            'skills': 'Python, SQL',
            'career_interests': 'Data Science'
        }
    }
    status, res = request('/user/profile', 'PUT', save_data, token=token)
    assert status == 200

    status, res = request('/user/profile', 'GET', token=token)
    assert status == 200
    assert res['profile']['role_profile']['skills'] == 'Python, SQL'
    print("  ✓ Student profile created, saved and reloaded with persistence (HTTP 200)")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM student_profiles WHERE user_id = ?", (new_user_id,))
    cur.execute("DELETE FROM users WHERE id = ?", (new_user_id,))
    conn.commit()
    conn.close()

if __name__ == '__main__':
    test_user_without_profile()
    test_student_without_profile()
    print("\nALL EDGE-CASE TESTS PASSED!")
