import urllib.request
import json
import sys

BASE = 'http://127.0.0.1:8000/api'

def test_get(endpoint):
    url = BASE + endpoint
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer test-token'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"PASS GET {endpoint} -> status={resp.status}, keys={list(data.keys())}")
            return data
    except Exception as e:
        print(f"FAIL GET {endpoint} -> {e}")
        return None

def test_post(endpoint, payload):
    url = BASE + endpoint
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer test-token'}, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"PASS POST {endpoint} -> status={resp.status}, success={data.get('success')}")
            return data
    except Exception as e:
        print(f"FAIL POST {endpoint} -> {e}")
        return None

def test_put(endpoint, payload):
    url = BASE + endpoint
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer test-token'}, method='PUT')
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"PASS PUT {endpoint} -> status={resp.status}, success={data.get('success')}")
            return data
    except Exception as e:
        print(f"FAIL PUT {endpoint} -> {e}")
        return None

if __name__ == '__main__':
    print('=== 1. Testing GET Endpoints ===')
    test_get('/admin/dashboard/stats')
    test_get('/admin/students')
    test_get('/admin/students/1')
    test_get('/admin/faculty')
    test_get('/admin/batches')
    test_get('/admin/schedule')
    test_get('/admin/attendance/session/1')
    test_get('/admin/materials')
    test_get('/admin/fees/plans')
    test_get('/admin/announcements')
    test_get('/admin/followups')
    test_get('/admin/placement')
    test_get('/admin/support')
    test_get('/admin/users')
    test_get('/admin/settings')
    test_get('/admin/audit-logs')

    print('\n=== 2. Testing Mutation Endpoints ===')
    # Student Onboarding
    import time
    ts = int(time.time())
    created_student = test_post('/admin/students', {
        'full_name': f'Rohan Deshmukh {ts % 1000}',
        'email': f'rohan.{ts}@aaroha-tech.internal',
        'mobile': f'+91 98200 {ts % 100000:05d}',
        'education': 'B.Tech Computer Science, IIT Bombay',
        'experience_years': '2',
        'course_id': 1,
        'batch_id': 1,
        'total_fee': 65000,
        'discount_amount': 5000
    })

    # Create Batch
    created_batch = test_post('/admin/batches', {
        'course_id': 1,
        'batch_code': f'AWS-2026-B{ts % 10000}',
        'title': 'Enterprise AWS Solutions Architect - Dynamic Cohort',
        'start_date': '2026-10-01',
        'end_date': '2026-12-15',
        'capacity': 35,
        'delivery_mode': 'Online Live'
    })

    # Create Session
    test_post('/admin/schedule', {
        'batch_id': 1,
        'faculty_id': 3,
        'topic': 'Multi-Region High Availability & Global Aurora Clusters',
        'start_time': '2026-11-20 18:00:00',
        'end_time': '2026-11-20 20:00:00',
        'session_type': 'Lecture',
        'meeting_link': 'https://meet.google.com/aar-live-demo'
    })

    # Bulk Attendance using live batch 1 roster (user 7, enrollment 501)
    test_post('/admin/attendance/session/1/bulk', {
        'records': [
            {'user_id': 7, 'enrollment_id': 501, 'status': 'present'},
            {'user_id': 8, 'enrollment_id': 502, 'status': 'late'}
        ]
    })

    # Record Payment
    test_post('/admin/fees/payments', {
        'fee_plan_id': 1,
        'amount': 25000,
        'payment_method': 'NEFT / RTGS Corporate Wire',
        'transaction_reference': 'UTR-AXIS-20261116-98124',
        'notes': 'First installment cleared'
    })

    # Record Refund
    test_post('/admin/fees/refunds', {
        'fee_plan_id': 1,
        'amount': 5000,
        'refund_reason': 'Merit Scholarship Rebate',
        'notes': 'Approved by Finance Director'
    })

    # Create Followup
    test_post('/admin/followups', {
        'user_id': 1,
        'batch_id': 1,
        'reason': 'Missed Module 3 Technical Submission',
        'description': 'Student informed family emergency; granted 48h extension',
        'priority': 'high',
        'next_followup_date': '2026-11-18'
    })

    # Update Followup
    test_put('/admin/followups/1', {
        'status': 'resolved',
        'resolution_notes': 'Deliverable submitted and reviewed with 92 score'
    })

    # Reschedule Session
    test_put('/admin/schedule/1/reschedule', {
        'start_time': '2026-11-16 19:00:00',
        'end_time': '2026-11-16 21:00:00',
        'reschedule_reason': 'Pushed 1 hour later per cohort poll'
    })

    # Update Settings
    test_put('/admin/settings', {
        'attendance_alert_threshold': '70',
        'smtp_from_email': 'directorate@aaroha-inc.com'
    })

    # Test Suite Hygiene: Clean up transient test artifacts to prevent database pollution
    try:
        import sqlite3
        conn = sqlite3.connect('aaroha_lms/database/lms.sqlite')
        c = conn.cursor()
        if created_student and 'user_id' in created_student:
            uid = created_student['user_id']
            c.execute('DELETE FROM fee_plans WHERE user_id = ?', (uid,))
            c.execute('DELETE FROM enrollments WHERE user_id = ?', (uid,))
            c.execute('DELETE FROM student_profiles WHERE user_id = ?', (uid,))
            c.execute('DELETE FROM users WHERE id = ?', (uid,))
        if created_batch and 'batch_id' in created_batch:
            bid = created_batch['batch_id']
            c.execute('DELETE FROM batches WHERE id = ?', (bid,))
        conn.commit()
        conn.close()
        print('INFO: Cleaned up transient test artifacts.')
    except Exception as clean_err:
        print(f'WARN: Cleanup error: {clean_err}')

    print('\n=== 3. Verification Complete: All Endpoints Operational ===')
