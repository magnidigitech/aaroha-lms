#!/usr/bin/env python3
"""
Test Suite: Course Card Badge Preset, Live Preview, and Server Validation
Verifies the complete lifecycle:
1. Existing course legacy badge styling preservation.
2. Creating a course with a purple "New" badge.
3. Reloading catalogue and verifying purple badge persistence.
4. Updating course badge colour to green.
5. Reloading catalogue and confirming updated colour persists.
6. Server-side validation rejecting invalid badge colour presets (HTTP 400).
7. Hiding badge when badge_text is blank.
8. Neutral default for new courses when colour is omitted.
"""

import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def request_json(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return e.code, parsed

def run_tests():
    print("=== Testing Aaroha LMS Course Card Badge Feature ===")

    # 1. Authenticate as Admin
    print("\n1. Authenticating as Administrator...")
    status, res = request_json("/auth/login", method="POST", data={
        "email": "admin@aaroha-inc.com",
        "password": "password123"
    })
    assert status == 200, f"Login failed: status {status}, {res}"
    token = res.get("token")
    assert token, "Admin JWT token not found in login response"
    print("✓ Administrator authenticated successfully.")

    # 2. Check existing catalog courses
    print("\n2. Checking existing catalog courses for legacy badge preservation...")
    status, res = request_json("/courses", method="GET", token=token)
    assert status == 200, f"Failed to list courses: {status}, {res}"
    courses = res.get("courses", [])
    assert len(courses) >= 1, "Catalog should have at least 1 course"
    c1 = next((c for c in courses if c["id"] == 1), None)
    assert c1 is not None, "Course 1 must exist"
    print(f"✓ Course 1 legacy badge: text='{c1.get('badge_text')}', color={c1.get('badge_color')}")
    assert c1.get("badge_color") is None or c1.get("badge_color") == "", "Legacy course badge_color should be null to preserve existing style"

    # 3. Create course with purple "New" badge
    print("\n3. Creating new course with purple 'New' badge...")
    new_course_data = {
        "title": "Autonomous Agent Architecture & Swarm Protocols",
        "slug": "autonomous-agent-architecture",
        "category": "Applied AI",
        "level": "Advanced Level",
        "duration": "8 Weeks",
        "partner_type": "Specialization",
        "badge_text": "New",
        "badge_color": "purple",
        "description": "Architect autonomous multi-agent swarms with Byzantine consensus and deterministic state replication.",
        "skills": ["Multi-Agent Systems", "Autonomous Loops", "Consensus"],
        "is_published": True
    }
    status, res = request_json("/courses", method="POST", data=new_course_data, token=token)
    assert status == 200 or status == 201, f"Create course failed: {status}, {res}"
    created_id = res.get("course_id") or (res.get("course", {}).get("id"))
    assert created_id, f"Created course ID missing: {res}"
    print(f"✓ Course created with ID: {created_id}")

    # 4. Reload catalogue and verify purple "New" badge persists
    print("\n4. Reloading catalogue to verify purple 'New' badge...")
    status, res = request_json(f"/courses/{created_id}", method="GET", token=token)
    assert status == 200, f"Failed to get course: {status}, {res}"
    course_item = res.get("course") or res
    assert course_item.get("badge_text") == "New", f"Expected badge_text 'New', got {course_item.get('badge_text')}"
    assert course_item.get("badge_color") == "purple", f"Expected badge_color 'purple', got {course_item.get('badge_color')}"
    print(f"✓ Catalogue verified: badge_text='{course_item.get('badge_text')}', badge_color='{course_item.get('badge_color')}'")

    # 5. Change course badge color to green
    print("\n5. Updating course badge colour to 'green'...")
    update_data = {
        "badge_color": "green"
    }
    status, res = request_json(f"/courses/{created_id}", method="PUT", data=update_data, token=token)
    assert status == 200, f"Failed to update course: {status}, {res}"
    print("✓ Course updated with green badge colour.")

    # 6. Reload catalogue and confirm updated green colour persists
    print("\n6. Reloading catalogue to confirm updated 'green' colour persists...")
    status, res = request_json(f"/courses/{created_id}", method="GET", token=token)
    assert status == 200, f"Failed to get course after update: {status}, {res}"
    updated_course = res.get("course") or res
    assert updated_course.get("badge_text") == "New", f"Expected badge_text 'New', got {updated_course.get('badge_text')}"
    assert updated_course.get("badge_color") == "green", f"Expected badge_color 'green', got {updated_course.get('badge_color')}"
    print(f"✓ Updated colour confirmed in catalogue: badge_text='{updated_course.get('badge_text')}', badge_color='{updated_course.get('badge_color')}'")

    # 7. Test Server-Side Validation: Invalid badge colour rejection (HTTP 400)
    print("\n7. Testing server-side validation against invalid badge colour presets...")
    status, res = request_json(f"/courses/{created_id}", method="PUT", data={"badge_color": "neon_fuchsia_9000"}, token=token)
    assert status == 400, f"Expected HTTP 400 for invalid preset, got {status}: {res}"
    print(f"✓ Server correctly rejected invalid preset on update (HTTP 400): {res.get('error')}")

    status, res = request_json("/courses", method="POST", data={
        "title": "Invalid Color Test Course",
        "badge_color": "invalid_rainbow",
        "badge_text": "Experimental"
    }, token=token)
    assert status == 400, f"Expected HTTP 400 for invalid preset on create, got {status}: {res}"
    print(f"✓ Server correctly rejected invalid preset on create (HTTP 400): {res.get('error')}")

    # 8. Test hiding badge when badge text is blank
    print("\n8. Testing badge hiding when badge_text is blank...")
    status, res = request_json(f"/courses/{created_id}", method="PUT", data={"badge_text": ""}, token=token)
    assert status == 200, f"Failed to update course: {status}, {res}"
    status, res = request_json(f"/courses/{created_id}", method="GET", token=token)
    assert status == 200
    cleared_course = res.get("course") or res
    assert cleared_course.get("badge_text") == "", f"Expected empty badge_text, got {cleared_course.get('badge_text')}"
    print("✓ Badge text blanked successfully (badge hidden in catalog).")

    # 9. Test Neutral default for new courses when colour is omitted
    print("\n9. Testing Neutral default for new courses...")
    status, res = request_json("/courses", method="POST", data={
        "title": "Default Neutral Badge Course",
        "slug": "default-neutral-course",
        "badge_text": "Popular",
        "is_published": True
    }, token=token)
    assert status in (200, 201), f"Create failed: {status}, {res}"
    cid2 = res.get("course_id") or res.get("course", {}).get("id")
    status, res = request_json(f"/courses/{cid2}", method="GET", token=token)
    c2 = res.get("course") or res
    assert c2.get("badge_color") == "neutral", f"Expected neutral default, got {c2.get('badge_color')}"
    print(f"✓ New course correctly defaulted to badge_color='neutral'.")

    # Clean up test courses
    print("\n10. Cleaning up test courses...")
    request_json(f"/courses/{created_id}", method="DELETE", token=token)
    request_json(f"/courses/{cid2}", method="DELETE", token=token)
    print("✓ Cleanup completed.")

    print("\n🎉 ALL COURSE CARD BADGE TESTS PASSED (100% SUCCESS)!")

if __name__ == "__main__":
    run_tests()
