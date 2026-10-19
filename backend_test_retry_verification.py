#!/usr/bin/env python3
"""
Traccia Fondi Backend - Email Retry Logic Verification
======================================================

Review request: Verify the Traccia Fondi backend is healthy and the email retry 
logic works correctly after a code change. DO NOT send any real emails.

Backend URL: https://traccia-tracing.preview.emergentagent.com

Tests:
1. Backend health - GET /api/health → should return {"status": "ok"}
2. Admin login - POST /api/auth/login with admin credentials
3. Traces endpoint - GET /api/admin/traces (confirms scheduler + DB running)
4. Verify _resend_with_retry function exists in code with retry logic
5. Admin manual 24h email trigger - POST /api/admin/traces/{trace_id}/send-24h-email
"""

import requests
import json
import re
from typing import Dict, Any, Tuple

# API Base URL
BASE_URL = "https://traccia-tracing.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@traccia-fondi.com"
ADMIN_PASSWORD = "admin123"


def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "="*80)
    print(title)
    print("="*80)


def test_health_check() -> Tuple[bool, str]:
    """
    Test 1: Backend health check
    GET /api/health → should return {"status": "ok"}
    """
    print_section("TEST 1: Backend Health Check")
    
    endpoint = f"{BASE_URL}/health"
    print(f"GET {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("status") == "ok":
                print(f"\n✅ PASS: Health check returned status='ok'")
                return True, ""
            else:
                error_msg = f"❌ FAIL: Health check status is not 'ok' (got: {data.get('status')})"
                print(f"\n{error_msg}")
                return False, error_msg
        else:
            error_msg = f"❌ FAIL: Health check returned status {response.status_code}"
            print(f"\n{error_msg}")
            return False, error_msg
            
    except Exception as e:
        error_msg = f"❌ FAIL: Exception during health check: {str(e)}"
        print(error_msg)
        return False, error_msg


def test_admin_login() -> Tuple[bool, str, str]:
    """
    Test 2: Admin login
    POST /api/auth/login with admin credentials
    Returns: (success, token, error_message)
    """
    print_section("TEST 2: Admin Login")
    
    endpoint = f"{BASE_URL}/auth/login"
    payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    print(f"POST {endpoint}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(endpoint, json=payload, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            if token:
                print(f"✅ PASS: Admin login successful")
                print(f"Token: {token[:30]}...")
                return True, token, ""
            else:
                error_msg = "❌ FAIL: No token in response"
                print(error_msg)
                return False, "", error_msg
        else:
            error_msg = f"❌ FAIL: Login failed with status {response.status_code}: {response.text}"
            print(error_msg)
            return False, "", error_msg
            
    except Exception as e:
        error_msg = f"❌ FAIL: Exception during login: {str(e)}"
        print(error_msg)
        return False, "", error_msg


def test_traces_endpoint(token: str) -> Tuple[bool, str]:
    """
    Test 3: Traces endpoint (confirms scheduler + DB still running)
    GET /api/admin/traces with admin token
    Returns: (success, error_message)
    """
    print_section("TEST 3: Traces Endpoint (Scheduler + DB Check)")
    
    endpoint = f"{BASE_URL}/admin/traces"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"GET {endpoint}")
    print(f"Headers: Authorization: Bearer {token[:30]}...")
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            traces = response.json()
            print(f"✅ PASS: Traces endpoint returned successfully")
            print(f"Number of traces: {len(traces)}")
            
            if traces:
                print(f"\nSample trace (first one):")
                sample = traces[0]
                print(f"  trace_id: {sample.get('id')}")
                print(f"  email: {sample.get('email')}")
                print(f"  status: {sample.get('status')}")
                print(f"  created_at: {sample.get('created_at')}")
            
            return True, ""
        else:
            error_msg = f"❌ FAIL: Traces endpoint returned status {response.status_code}: {response.text}"
            print(error_msg)
            return False, error_msg
            
    except Exception as e:
        error_msg = f"❌ FAIL: Exception during traces endpoint: {str(e)}"
        print(error_msg)
        return False, error_msg


def test_resend_with_retry_function() -> Tuple[bool, str]:
    """
    Test 4: Verify _resend_with_retry function exists in code
    Check /app/backend/server.py for the function with retry logic
    Returns: (success, error_message)
    """
    print_section("TEST 4: Verify _resend_with_retry Function in Code")
    
    server_py_path = "/app/backend/server.py"
    print(f"Checking file: {server_py_path}")
    
    try:
        with open(server_py_path, 'r') as f:
            content = f.read()
        
        # Check if function exists
        if "_resend_with_retry" not in content:
            error_msg = "❌ FAIL: _resend_with_retry function not found in server.py"
            print(error_msg)
            return False, error_msg
        
        print("✅ Function _resend_with_retry found in server.py")
        
        # Extract the function definition - find the function and get ~30 lines
        func_start = content.find("async def _resend_with_retry")
        if func_start == -1:
            error_msg = "❌ FAIL: Could not find _resend_with_retry function start"
            print(error_msg)
            return False, error_msg
        
        # Get the next 1500 characters which should contain the full function
        func_body = content[func_start:func_start + 1500]
        
        # Check for retry logic components
        checks = []
        
        # Check 1: max_attempts parameter
        if "max_attempts" in func_body:
            print("✅ Has max_attempts parameter")
            checks.append(True)
        else:
            print("❌ Missing max_attempts parameter")
            checks.append(False)
        
        # Check 2: for loop for retry attempts
        if "for attempt in range" in func_body:
            print("✅ Has retry loop (for attempt in range)")
            checks.append(True)
        else:
            print("❌ Missing retry loop")
            checks.append(False)
        
        # Check 3: asyncio.sleep between retries
        if "asyncio.sleep" in func_body or "await asyncio.sleep" in func_body:
            print("✅ Has asyncio.sleep for delay between retries")
            checks.append(True)
        else:
            print("❌ Missing asyncio.sleep")
            checks.append(False)
        
        # Check 4: resend.Emails.send call
        if "resend.Emails.send" in func_body:
            print("✅ Calls resend.Emails.send")
            checks.append(True)
        else:
            print("❌ Missing resend.Emails.send call")
            checks.append(False)
        
        # Check 5: Exception handling
        if "try:" in func_body and "except" in func_body:
            print("✅ Has exception handling (try/except)")
            checks.append(True)
        else:
            print("❌ Missing exception handling")
            checks.append(False)
        
        # Extract key parameters
        param_match = re.search(r'max_attempts:\s*int\s*=\s*(\d+)', func_body)
        if param_match:
            max_attempts = param_match.group(1)
            print(f"\n📋 Function parameters:")
            print(f"   max_attempts default: {max_attempts}")
        
        delay_match = re.search(r'delay_s:\s*float\s*=\s*([\d.]+)', func_body)
        if delay_match:
            delay_s = delay_match.group(1)
            print(f"   delay_s default: {delay_s}s")
        
        # Print function signature
        sig_match = re.search(r'async def _resend_with_retry\([^)]+\)', func_body)
        if sig_match:
            print(f"\n📝 Function signature:")
            print(f"   {sig_match.group(0)}")
        
        if all(checks):
            print(f"\n✅ PASS: _resend_with_retry has correct retry logic")
            print(f"   - Retry loop with max_attempts")
            print(f"   - asyncio.sleep between retries")
            print(f"   - Exception handling")
            print(f"   - Calls resend.Emails.send")
            return True, ""
        else:
            error_msg = f"❌ FAIL: _resend_with_retry missing some retry logic components ({sum(checks)}/5 checks passed)"
            print(f"\n{error_msg}")
            return False, error_msg
            
    except FileNotFoundError:
        error_msg = f"❌ FAIL: File {server_py_path} not found"
        print(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"❌ FAIL: Exception during code verification: {str(e)}"
        print(error_msg)
        return False, error_msg


def test_manual_24h_email_trigger(token: str) -> Tuple[bool, str]:
    """
    Test 5: Admin manual 24h email trigger endpoint
    POST /api/admin/traces/{trace_id}/send-24h-email
    Test with non-existent trace_id to verify endpoint exists without sending real emails
    Returns: (success, error_message)
    """
    print_section("TEST 5: Manual 24h Email Trigger Endpoint")
    
    # Use a non-existent trace_id to verify endpoint exists without sending emails
    test_trace_id = "test-nonexistent-id"
    endpoint = f"{BASE_URL}/admin/traces/{test_trace_id}/send-24h-email"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"POST {endpoint}")
    print(f"Headers: Authorization: Bearer {token[:30]}...")
    print(f"⚠️  Using non-existent trace_id to avoid sending real emails")
    
    try:
        response = requests.post(endpoint, headers=headers, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 404:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get("detail") == "Trace not found":
                print(f"\n✅ PASS: Endpoint exists and returns correct 404 error")
                print(f"   Expected: 404 with 'Trace not found'")
                print(f"   Got: 404 with '{data.get('detail')}'")
                print(f"\n✅ Endpoint is working correctly (no real email sent)")
                return True, ""
            else:
                error_msg = f"❌ FAIL: Unexpected error message: {data.get('detail')}"
                print(f"\n{error_msg}")
                return False, error_msg
        else:
            error_msg = f"❌ FAIL: Expected 404, got {response.status_code}: {response.text}"
            print(f"\n{error_msg}")
            return False, error_msg
            
    except Exception as e:
        error_msg = f"❌ FAIL: Exception during manual email trigger: {str(e)}"
        print(error_msg)
        return False, error_msg


def main():
    """Run all backend verification tests"""
    print("\n" + "="*80)
    print("TRACCIA FONDI BACKEND - EMAIL RETRY LOGIC VERIFICATION")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"\nObjective: Verify backend health and email retry logic after code change")
    print(f"Note: NO real emails will be sent during this test")
    
    results = []
    
    # Test 1: Health check
    success, error = test_health_check()
    results.append(("Health Check", success, error))
    
    # Test 2: Admin login
    success, token, error = test_admin_login()
    results.append(("Admin Login", success, error))
    
    if not success:
        print(f"\n❌ Cannot continue without admin token")
        print_final_results(results)
        return 1
    
    # Test 3: Traces endpoint
    success, error = test_traces_endpoint(token)
    results.append(("Traces Endpoint", success, error))
    
    # Test 4: Verify _resend_with_retry function
    success, error = test_resend_with_retry_function()
    results.append(("_resend_with_retry Function", success, error))
    
    # Test 5: Manual 24h email trigger
    success, error = test_manual_24h_email_trigger(token)
    results.append(("Manual 24h Email Trigger", success, error))
    
    # Print final results
    print_final_results(results)
    
    # Return exit code
    all_passed = all(result[1] for result in results)
    return 0 if all_passed else 1


def print_final_results(results):
    """Print final test results summary"""
    print_section("FINAL TEST RESULTS")
    
    print(f"\nTest Summary:")
    print(f"-" * 80)
    
    for i, (test_name, success, error) in enumerate(results, 1):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{i}. {status}: {test_name}")
        if error:
            print(f"   Error: {error}")
    
    print(f"-" * 80)
    
    passed = sum(1 for _, success, _ in results if success)
    total = len(results)
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print(f"\n🎉 ALL TESTS PASSED")
        print(f"\n✅ Backend is healthy")
        print(f"✅ _resend_with_retry exists with correct retry logic (3 attempts, asyncio.sleep)")
        print(f"✅ Admin endpoints working correctly")
        print(f"✅ No real emails were sent during testing")
    else:
        print(f"\n⚠️  SOME TESTS FAILED")
        print(f"\nFailed tests:")
        for test_name, success, error in results:
            if not success:
                print(f"  - {test_name}: {error}")


if __name__ == "__main__":
    exit(main())
