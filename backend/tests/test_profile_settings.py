import urllib.request
import urllib.error
import json

BASE_URL = 'http://127.0.0.1:8000/api'

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

def login(email, password):
    status, res = request('/auth/login', 'POST', {'email': email, 'password': password})
    assert status == 200, f"Login failed for {email}: {res}"
    return res['token']

def test_admin_flow():
    print("Testing Admin Profile Flow...")
    token = login('admin@aaroha-inc.com', 'password123')
    
    # 1. GET profile
    status, res = request('/user/profile', 'GET', token=token)
    assert status == 200, f"Admin GET profile failed: {res}"
    assert res['success'] is True
    p = res['profile']
    assert p['role'] == 'super_admin'
    assert p['role_profile']['type'] == 'staff'
    print("  ✓ Admin GET profile verified")

    # 2. PUT profile
    update_data = {
        'full_name': 'Super Admin User',
        'display_name': 'Chief Admin',
        'phone': '9876543210',
        'timezone': 'Asia/Kolkata',
        'preferred_language': 'en',
        'role_profile': {
            'job_title': 'Executive Systems Director',
            'department': 'Global Academic Operations'
        }
    }
    status, res = request('/user/profile', 'PUT', update_data, token=token)
    assert status == 200, f"Admin PUT profile failed: {res}"
    assert res['success'] is True
    print("  ✓ Admin PUT profile verified")

    # 3. Verify persistence
    status, res = request('/user/profile', 'GET', token=token)
    p = res['profile']
    assert p['full_name'] == 'Super Admin User'
    assert p['display_name'] == 'Chief Admin'
    assert p['phone'] == '9876543210'
    print("  ✓ Admin persistence verified")

def test_faculty_flow():
    print("Testing Faculty Profile Flow...")
    token = login('elena.rostova@enterprise.io', 'password123')
    
    # 1. GET profile
    status, res = request('/user/profile', 'GET', token=token)
    assert status == 200, f"Faculty GET profile failed: {res}"
    assert res['profile']['role'] == 'faculty'
    assert res['profile']['role_profile']['type'] == 'faculty'
    assert 'associations' in res['profile']['account_info']
    print("  ✓ Faculty GET profile & teaching associations verified")

    # 2. PUT profile with professional info, links, availability
    update_data = {
        'full_name': 'Dr. Elena Rostova',
        'display_name': 'Prof. Rostova',
        'phone': '9123456780',
        'role_profile': {
            'bio': 'Distinguished Professor of Distributed Systems & Cloud Computing.',
            'qualifications': 'Ph.D. in Computer Science (MIT), IEEE Fellow',
            'expertise': 'Distributed Consensus, Cloud Native Infrastructure, Raft, Go',
            'experience_years': '14',
            'website_url': 'https://elena-rostova.edu',
            'linkedin_url': 'https://linkedin.com/in/elena-rostova',
            'github_url': 'https://github.com/elena-rostova',
            'availability': {
                'preferred_days': ['Tuesday', 'Thursday'],
                'preferred_slots': ['10:00-12:00', '16:00-18:00'],
                'max_hours_per_week': 12
            }
        }
    }
    status, res = request('/user/profile', 'PUT', update_data, token=token)
    assert status == 200, f"Faculty PUT profile failed: {res}"
    assert res['success'] is True
    print("  ✓ Faculty PUT profile verified")

    # 3. Verify persistence
    status, res = request('/user/profile', 'GET', token=token)
    p = res['profile']
    rp = p['role_profile']
    assert p['full_name'] == 'Dr. Elena Rostova'
    assert rp['bio'] == 'Distinguished Professor of Distributed Systems & Cloud Computing.'
    assert rp['qualifications'] == 'Ph.D. in Computer Science (MIT), IEEE Fellow'
    assert rp['experience_years'] == '14'
    assert rp['website_url'] == 'https://elena-rostova.edu'
    print("  ✓ Faculty profile persistence verified")

def test_student_flow():
    print("Testing Student Profile Flow...")
    token = login('aarav.patel@student.aaroha-inc.com', 'password123')
    
    # 1. GET profile
    status, res = request('/user/profile', 'GET', token=token)
    assert status == 200, f"Student GET profile failed: {res}"
    assert res['profile']['role'] == 'student'
    assert res['profile']['role_profile']['type'] == 'student'
    assert 'associations' in res['profile']['account_info']
    print("  ✓ Student GET profile & academic enrolments verified")

    # 2. PUT profile with education, skills, resume, github
    update_data = {
        'full_name': 'Aarav Patel',
        'display_name': 'Aarav P.',
        'phone': '9811122233',
        'role_profile': {
            'education': 'B.Tech in Artificial Intelligence, IIT Hyderabad',
            'experience_years': '2',
            'skills': 'Kubernetes, Go, Python, React, PostgreSQL',
            'career_interests': 'Cloud Infrastructure & SRE',
            'resume_url': 'https://storage.aaroha-inc.com/resumes/aarav_patel.pdf',
            'github_url': 'https://github.com/aaravpatel',
            'portfolio_url': 'https://aaravpatel.dev',
            'work_experience': 'Software Engineering Intern at CloudWorks (6 months)'
        }
    }
    status, res = request('/user/profile', 'PUT', update_data, token=token)
    assert status == 200, f"Student PUT profile failed: {res}"
    assert res['success'] is True
    print("  ✓ Student PUT profile verified")

    # 3. Verify persistence
    status, res = request('/user/profile', 'GET', token=token)
    p = res['profile']
    rp = p['role_profile']
    assert p['full_name'] == 'Aarav Patel'
    assert rp['education'] == 'B.Tech in Artificial Intelligence, IIT Hyderabad'
    assert rp['skills'] == 'Kubernetes, Go, Python, React, PostgreSQL'
    assert rp['resume_url'] == 'https://storage.aaroha-inc.com/resumes/aarav_patel.pdf'
    assert rp['github_url'] == 'https://github.com/aaravpatel'
    print("  ✓ Student profile persistence verified")

def test_security_and_validation():
    print("Testing Security Boundaries & Validation Gates...")
    token = login('admin@aaroha-inc.com', 'password123')

    # 1. Direct Email Change Rejection
    status, res = request('/user/profile', 'PUT', {'email': 'hacker@evil.com'}, token=token)
    assert status == 400, f"Expected 400 on email change, got {status}: {res}"
    print("  ✓ Direct email modification rejected (HTTP 400)")

    # 2. Blank Full Name Rejection
    status, res = request('/user/profile', 'PUT', {'full_name': '   '}, token=token)
    assert status == 400, f"Expected 400 on empty full name, got {status}: {res}"
    print("  ✓ Blank full name rejected (HTTP 400)")

    # 3. Invalid URL in Role Profile
    status, res = request('/user/profile', 'PUT', {
        'role_profile': {'portfolio_url': 'javascript:alert(1)'}
    }, token=token)
    assert status == 400, f"Expected 400 on invalid URL, got {status}: {res}"
    print("  ✓ Malformed URL rejected (HTTP 400)")

    # 4. Password Change - Mismatched Confirmation
    status, res = request('/user/change-password', 'POST', {
        'current_password': 'password123',
        'new_password': 'newpassword456',
        'confirm_password': 'mismatchpassword'
    }, token=token)
    assert status == 400, f"Expected 400 on password mismatch, got {status}: {res}"
    print("  ✓ Password confirmation mismatch rejected (HTTP 400)")

    # 5. Password Change - Incorrect Current Password
    status, res = request('/user/change-password', 'POST', {
        'current_password': 'wrongpassword',
        'new_password': 'newpassword456',
        'confirm_password': 'newpassword456'
    }, token=token)
    assert status == 401, f"Expected 401 on wrong password, got {status}: {res}"
    print("  ✓ Wrong current password rejected (HTTP 401)")

    # 6. Session Termination
    status, res = request('/user/sessions/logout-other', 'POST', token=token)
    assert status == 200, f"Expected 200 on logout other sessions, got {status}: {res}"
    assert res['success'] is True
    print("  ✓ Session termination verified (HTTP 200)")

if __name__ == '__main__':
    test_admin_flow()
    test_faculty_flow()
    test_student_flow()
    test_security_and_validation()
    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")

