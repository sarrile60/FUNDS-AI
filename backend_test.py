#!/usr/bin/env python3
"""
Comprehensive backend API test for Traccia Fondi
Tests all new features: registration, login, user profile, trace management, admin endpoints
"""

import requests
import sys
import json
from typing import Dict, Any, Optional

# Backend URL from review request
BASE_URL = "https://ba6608eb-6e97-459e-a2cf-7ed6913f7c68.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@traccia-fondi.com"
ADMIN_PASSWORD = "admin123"

# Test user data
TEST_USER = {
    "first_name": "Mario",
    "last_name": "Rossi",
    "email": "mario.rossi.test@example.com",
    "password": "test123",
    "phone": "+39 333 1234567",
    "date_of_birth": "1980-05-15",
    "lang": "it"
}

# Test results
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

# Store tokens and IDs for later tests
test_data = {
    "user_token": None,
    "admin_token": None,
    "access_code": "TEST01",
    "trace_id": None
}


def log_test(name: str, passed: bool, details: str = ""):
    """Log test result."""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details
    })
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1


def test_health():
    """Test 1: Health check endpoint."""
    print("\n=== Test 1: Health Check ===")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=10)
        
        if resp.status_code != 200:
            log_test("Health check", False, f"Expected 200, got {resp.status_code}")
            return
        
        data = resp.json()
        if data.get("status") == "ok":
            log_test("Health check", True, f"Response: {json.dumps(data)}")
        else:
            log_test("Health check", False, f"Expected status='ok', got {data}")
    
    except Exception as e:
        log_test("Health check", False, f"Exception: {e}")


def test_registration():
    """Test 2: User registration."""
    print("\n=== Test 2: User Registration ===")
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/register",
            json=TEST_USER,
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("User registration", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        data = resp.json()
        
        # Check token
        if not data.get("token"):
            log_test("User registration", False, "Missing token in response")
            return
        
        # Check user object
        user = data.get("user")
        if not user:
            log_test("User registration", False, "Missing user object in response")
            return
        
        # Verify no password in response
        if "password" in user or "password_hash" in user:
            log_test("User registration", False, "Password exposed in response")
            return
        
        # Verify user fields
        if (user.get("first_name") == TEST_USER["first_name"] and
            user.get("last_name") == TEST_USER["last_name"] and
            user.get("email") == TEST_USER["email"] and
            user.get("phone") == TEST_USER["phone"] and
            user.get("date_of_birth") == TEST_USER["date_of_birth"]):
            
            test_data["user_token"] = data["token"]
            log_test("User registration", True, f"User created with ID: {user.get('id')}")
        else:
            log_test("User registration", False, f"User data mismatch: {user}")
    
    except Exception as e:
        log_test("User registration", False, f"Exception: {e}")


def test_login():
    """Test 3: User login."""
    print("\n=== Test 3: User Login ===")
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            },
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("User login", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        data = resp.json()
        
        if data.get("token"):
            test_data["user_token"] = data["token"]
            log_test("User login", True, f"Login successful, token received")
        else:
            log_test("User login", False, "Missing token in response")
    
    except Exception as e:
        log_test("User login", False, f"Exception: {e}")


def test_user_profile():
    """Test 4: Get user profile."""
    print("\n=== Test 4: Get User Profile ===")
    
    if not test_data["user_token"]:
        log_test("Get user profile", False, "No user token available (previous test failed)")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/users/me",
            headers={"Authorization": f"Bearer {test_data['user_token']}"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Get user profile", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        user = resp.json()
        
        # Verify user fields
        if (user.get("first_name") == TEST_USER["first_name"] and
            user.get("last_name") == TEST_USER["last_name"] and
            user.get("email") == TEST_USER["email"] and
            user.get("phone") == TEST_USER["phone"] and
            user.get("date_of_birth") == TEST_USER["date_of_birth"]):
            
            log_test("Get user profile", True, f"Profile retrieved successfully")
        else:
            log_test("Get user profile", False, f"Profile data mismatch: {user}")
    
    except Exception as e:
        log_test("Get user profile", False, f"Exception: {e}")


def test_user_trace_empty():
    """Test 5: Get user trace (no trace yet)."""
    print("\n=== Test 5: Get User Trace (No Trace Yet) ===")
    
    if not test_data["user_token"]:
        log_test("Get user trace (empty)", False, "No user token available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/users/trace",
            headers={"Authorization": f"Bearer {test_data['user_token']}"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Get user trace (empty)", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        trace = resp.json()
        
        if trace is None:
            log_test("Get user trace (empty)", True, "No trace found (expected)")
        else:
            log_test("Get user trace (empty)", False, f"Expected null, got: {trace}")
    
    except Exception as e:
        log_test("Get user trace (empty)", False, f"Exception: {e}")


def test_admin_login():
    """Test 6a: Admin login."""
    print("\n=== Test 6a: Admin Login ===")
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            },
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Admin login", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        data = resp.json()
        
        if data.get("token"):
            test_data["admin_token"] = data["token"]
            log_test("Admin login", True, "Admin login successful")
        else:
            log_test("Admin login", False, "Missing token in response")
    
    except Exception as e:
        log_test("Admin login", False, f"Exception: {e}")


def test_create_access_code():
    """Test 6b: Create access code."""
    print("\n=== Test 6b: Create Access Code ===")
    
    if not test_data["admin_token"]:
        log_test("Create access code", False, "No admin token available")
        return
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/access-codes",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={
                "code": test_data["access_code"],
                "destination_name": "Test Wallet",
                "destination_url": "test-wallet.com"
            },
            timeout=10
        )
        
        # Accept both 200 (created) and 400 (already exists)
        if resp.status_code == 200:
            data = resp.json()
            log_test("Create access code", True, f"Access code created: {data.get('code')}")
        elif resp.status_code == 400 and "already exists" in resp.text:
            log_test("Create access code", True, f"Access code already exists (OK)")
        else:
            log_test("Create access code", False, f"Expected 200, got {resp.status_code}: {resp.text}")
    
    except Exception as e:
        log_test("Create access code", False, f"Exception: {e}")


def test_start_trace():
    """Test 7: Start trace with auth."""
    print("\n=== Test 7: Start Trace with Auth ===")
    
    if not test_data["user_token"]:
        log_test("Start trace", False, "No user token available")
        return
    
    try:
        resp = requests.post(
            f"{BASE_URL}/trace/start",
            headers={"Authorization": f"Bearer {test_data['user_token']}"},
            json={
                "first_name": TEST_USER["first_name"],
                "last_name": TEST_USER["last_name"],
                "email": TEST_USER["email"],
                "access_code": test_data["access_code"],
                "amount_tier": "20000_50000"
            },
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Start trace", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        data = resp.json()
        
        # Check required fields
        if (data.get("trace_id") and
            data.get("located_amount") and
            data.get("created_at")):
            
            test_data["trace_id"] = data["trace_id"]
            log_test("Start trace", True, 
                    f"Trace created: ID={data['trace_id']}, Amount={data['located_amount']}")
        else:
            log_test("Start trace", False, f"Missing required fields in response: {data}")
    
    except Exception as e:
        log_test("Start trace", False, f"Exception: {e}")


def test_user_trace_exists():
    """Test 8: Get user trace (trace exists)."""
    print("\n=== Test 8: Get User Trace (Trace Exists) ===")
    
    if not test_data["user_token"]:
        log_test("Get user trace (exists)", False, "No user token available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/users/trace",
            headers={"Authorization": f"Bearer {test_data['user_token']}"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Get user trace (exists)", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        trace = resp.json()
        
        if trace is None:
            log_test("Get user trace (exists)", False, "Expected trace object, got null")
            return
        
        # Verify trace fields
        if (trace.get("email") == TEST_USER["email"] and
            "email_24h_sent" in trace and
            "email_50h_sent" in trace and
            "user_id" in trace):
            
            log_test("Get user trace (exists)", True, 
                    f"Trace retrieved: email_24h_sent={trace['email_24h_sent']}, email_50h_sent={trace['email_50h_sent']}")
        else:
            log_test("Get user trace (exists)", False, f"Trace data incomplete: {trace}")
    
    except Exception as e:
        log_test("Get user trace (exists)", False, f"Exception: {e}")


def test_admin_registered_users():
    """Test 9: Admin registered users list."""
    print("\n=== Test 9: Admin Registered Users List ===")
    
    if not test_data["admin_token"]:
        log_test("Admin registered users", False, "No admin token available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/registered-users",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Admin registered users", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        users = resp.json()
        
        if not isinstance(users, list):
            log_test("Admin registered users", False, f"Expected array, got: {type(users)}")
            return
        
        # Find our test user
        test_user_found = False
        for user in users:
            if user.get("email") == TEST_USER["email"]:
                test_user_found = True
                
                # Check trace info
                trace = user.get("trace")
                if trace and trace.get("id") == test_data["trace_id"]:
                    log_test("Admin registered users", True, 
                            f"User found with trace info: {len(users)} total users")
                else:
                    log_test("Admin registered users", False, 
                            f"User found but trace info missing or incorrect")
                break
        
        if not test_user_found:
            log_test("Admin registered users", False, 
                    f"Test user not found in list of {len(users)} users")
    
    except Exception as e:
        log_test("Admin registered users", False, f"Exception: {e}")


def test_duplicate_registration():
    """Test 10: Duplicate registration check."""
    print("\n=== Test 10: Duplicate Registration Check ===")
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/register",
            json=TEST_USER,
            timeout=10
        )
        
        if resp.status_code == 400:
            log_test("Duplicate registration check", True, 
                    f"Correctly rejected duplicate: {resp.text}")
        else:
            log_test("Duplicate registration check", False, 
                    f"Expected 400, got {resp.status_code}")
    
    except Exception as e:
        log_test("Duplicate registration check", False, f"Exception: {e}")


def test_duplicate_trace():
    """Test 11: Duplicate trace check."""
    print("\n=== Test 11: Duplicate Trace Check ===")
    
    if not test_data["user_token"]:
        log_test("Duplicate trace check", False, "No user token available")
        return
    
    try:
        resp = requests.post(
            f"{BASE_URL}/trace/start",
            headers={"Authorization": f"Bearer {test_data['user_token']}"},
            json={
                "first_name": TEST_USER["first_name"],
                "last_name": TEST_USER["last_name"],
                "email": TEST_USER["email"],
                "access_code": test_data["access_code"],
                "amount_tier": "20000_50000"
            },
            timeout=10
        )
        
        if resp.status_code == 400 and "already have an active trace" in resp.text:
            log_test("Duplicate trace check", True, 
                    f"Correctly rejected duplicate trace: {resp.text}")
        else:
            log_test("Duplicate trace check", False, 
                    f"Expected 400 with 'already have an active trace', got {resp.status_code}: {resp.text}")
    
    except Exception as e:
        log_test("Duplicate trace check", False, f"Exception: {e}")


def test_get_all_traces():
    """Test 12: Get all traces (admin)."""
    print("\n=== Test 12: Get All Traces ===")
    
    if not test_data["admin_token"]:
        log_test("Get all traces", False, "No admin token available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/traces",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Get all traces", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        traces = resp.json()
        
        if not isinstance(traces, list):
            log_test("Get all traces", False, f"Expected array, got: {type(traces)}")
            return
        
        # Find a trace with fee_paid=false or null
        unpaid_trace = None
        for trace in traces:
            if not trace.get("fee_paid"):
                unpaid_trace = trace
                test_data["unpaid_trace_id"] = trace.get("id")
                break
        
        if unpaid_trace:
            log_test("Get all traces", True, 
                    f"Found {len(traces)} traces, unpaid trace ID: {test_data['unpaid_trace_id']}")
        else:
            # If no unpaid trace found, use the test user's trace
            test_data["unpaid_trace_id"] = test_data.get("trace_id")
            log_test("Get all traces", True, 
                    f"Found {len(traces)} traces, using test trace ID: {test_data['unpaid_trace_id']}")
    
    except Exception as e:
        log_test("Get all traces", False, f"Exception: {e}")


def test_mark_fee_paid():
    """Test 13: Mark fee as paid."""
    print("\n=== Test 13: Mark Fee as Paid ===")
    
    if not test_data["admin_token"]:
        log_test("Mark fee paid", False, "No admin token available")
        return
    
    trace_id = test_data.get("unpaid_trace_id") or test_data.get("trace_id")
    if not trace_id:
        log_test("Mark fee paid", False, "No trace ID available")
        return
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/traces/{trace_id}/mark-fee-paid",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Mark fee paid", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        trace = resp.json()
        
        if trace.get("fee_paid") == True:
            log_test("Mark fee paid", True, 
                    f"Fee marked as paid for trace {trace_id}, fee_paid_at: {trace.get('fee_paid_at')}")
        else:
            log_test("Mark fee paid", False, 
                    f"Expected fee_paid=true, got: {trace.get('fee_paid')}")
    
    except Exception as e:
        log_test("Mark fee paid", False, f"Exception: {e}")


def test_verify_fee_paid():
    """Test 14: Verify fee paid is set."""
    print("\n=== Test 14: Verify Fee Paid is Set ===")
    
    if not test_data["admin_token"]:
        log_test("Verify fee paid", False, "No admin token available")
        return
    
    trace_id = test_data.get("unpaid_trace_id") or test_data.get("trace_id")
    if not trace_id:
        log_test("Verify fee paid", False, "No trace ID available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/traces/{trace_id}",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Verify fee paid", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        trace = resp.json()
        
        if trace.get("fee_paid") == True:
            log_test("Verify fee paid", True, 
                    f"Fee paid verified: fee_paid=true, fee_paid_at={trace.get('fee_paid_at')}")
        else:
            log_test("Verify fee paid", False, 
                    f"Expected fee_paid=true, got: {trace.get('fee_paid')}")
    
    except Exception as e:
        log_test("Verify fee paid", False, f"Exception: {e}")


def test_registered_users_with_fee_info():
    """Test 15: Get registered users with fee_paid field."""
    print("\n=== Test 15: Get Registered Users with Fee Info ===")
    
    if not test_data["admin_token"]:
        log_test("Registered users with fee info", False, "No admin token available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/registered-users",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Registered users with fee info", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        users = resp.json()
        
        if not isinstance(users, list):
            log_test("Registered users with fee info", False, f"Expected array, got: {type(users)}")
            return
        
        # Find our test user and verify fee_paid field
        test_user_found = False
        for user in users:
            if user.get("email") == TEST_USER["email"]:
                test_user_found = True
                trace = user.get("trace")
                
                if trace and "fee_paid" in trace:
                    test_data["test_user_id"] = user.get("id")
                    log_test("Registered users with fee info", True, 
                            f"User found with trace.fee_paid field: {trace.get('fee_paid')}")
                else:
                    log_test("Registered users with fee info", False, 
                            f"User found but trace.fee_paid field missing")
                break
        
        if not test_user_found:
            log_test("Registered users with fee info", False, 
                    f"Test user not found in list of {len(users)} users")
    
    except Exception as e:
        log_test("Registered users with fee info", False, f"Exception: {e}")


def test_edit_registered_user():
    """Test 16: Edit registered user."""
    print("\n=== Test 16: Edit Registered User ===")
    
    if not test_data["admin_token"]:
        log_test("Edit registered user", False, "No admin token available")
        return
    
    user_id = test_data.get("test_user_id")
    if not user_id:
        log_test("Edit registered user", False, "No test user ID available")
        return
    
    try:
        resp = requests.put(
            f"{BASE_URL}/admin/registered-users/{user_id}",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            json={
                "first_name": "Mario Updated",
                "located_amount": 250000.00
            },
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Edit registered user", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        user = resp.json()
        
        if user.get("first_name") == "Mario Updated":
            log_test("Edit registered user", True, 
                    f"User updated: first_name={user.get('first_name')}, located_amount will be verified in next test")
        else:
            log_test("Edit registered user", False, 
                    f"Expected first_name='Mario Updated', got: {user.get('first_name')}")
    
    except Exception as e:
        log_test("Edit registered user", False, f"Exception: {e}")


def test_verify_located_amount_updated():
    """Test 17: Verify located amount updated on trace."""
    print("\n=== Test 17: Verify Located Amount Updated ===")
    
    if not test_data["admin_token"]:
        log_test("Verify located amount", False, "No admin token available")
        return
    
    user_id = test_data.get("test_user_id")
    if not user_id:
        log_test("Verify located amount", False, "No test user ID available")
        return
    
    try:
        # Get all traces and find the one for our test user
        resp = requests.get(
            f"{BASE_URL}/admin/traces",
            headers={"Authorization": f"Bearer {test_data['admin_token']}"},
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("Verify located amount", False, f"Expected 200, got {resp.status_code}: {resp.text}")
            return
        
        traces = resp.json()
        
        # Find trace for test user
        test_trace = None
        for trace in traces:
            if trace.get("user_id") == user_id:
                test_trace = trace
                break
        
        if not test_trace:
            log_test("Verify located amount", False, f"Trace not found for user {user_id}")
            return
        
        located_amount = test_trace.get("located_amount")
        if located_amount == 250000.00:
            log_test("Verify located amount", True, 
                    f"Located amount updated correctly: {located_amount}")
        else:
            log_test("Verify located amount", False, 
                    f"Expected located_amount=250000.00, got: {located_amount}")
    
    except Exception as e:
        log_test("Verify located amount", False, f"Exception: {e}")


def print_summary():
    """Print test summary."""
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Total tests: {test_results['passed'] + test_results['failed']}")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    
    if test_results["failed"] > 0:
        print("\nFailed tests:")
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"  - {test['name']}")
                if test["details"]:
                    print(f"    {test['details']}")
    
    print("=" * 70)


def main():
    """Run all tests."""
    print("=" * 70)
    print("TRACCIA FONDI BACKEND API TEST")
    print(f"Base URL: {BASE_URL}")
    print("=" * 70)
    
    try:
        # Run tests in order
        test_health()
        test_registration()
        test_login()
        test_user_profile()
        test_user_trace_empty()
        test_admin_login()
        test_create_access_code()
        test_start_trace()
        test_user_trace_exists()
        test_admin_registered_users()
        test_duplicate_registration()
        test_duplicate_trace()
        
        # NEW TESTS for fee management features
        test_get_all_traces()
        test_mark_fee_paid()
        test_verify_fee_paid()
        test_registered_users_with_fee_info()
        test_edit_registered_user()
        test_verify_located_amount_updated()
        
        # Print summary
        print_summary()
        
        # Exit with appropriate code
        if test_results["failed"] > 0:
            sys.exit(1)
        else:
            print("\n🎉 ALL TESTS PASSED!")
            sys.exit(0)
    
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
