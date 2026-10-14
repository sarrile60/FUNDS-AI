#!/usr/bin/env python3
"""
Traccia Fondi Backend API Test - Orphan Traces Bug Fix Verification
====================================================================

Bug to verify: Traces started without a registered account (user_id = null, orphan traces) 
were NOT showing in the admin Users tab. Only registered users appeared there.

Test steps:
1. Login as admin and get access codes
2. Create an orphan trace (without authentication)
3. Get all traces and verify the orphan trace exists
4. Get registered users and verify guest entry appears for the orphan trace
"""

import requests
import json
import random
from typing import Dict, Any, Tuple, List

# API Base URL
BASE_URL = "https://ba6608eb-6e97-459e-a2cf-7ed6913f7c68.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@traccia-fondi.com"
ADMIN_PASSWORD = "admin123"


def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "="*80)
    print(title)
    print("="*80)


def admin_login() -> Tuple[bool, str, str]:
    """
    Step 1: Login as admin
    Returns: (success, token, error_message)
    """
    print_section("STEP 1: Admin Login")
    
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
                print(f"✅ Admin login successful")
                print(f"Token: {token[:20]}...")
                return True, token, ""
            else:
                error_msg = "❌ No token in response"
                print(error_msg)
                return False, "", error_msg
        else:
            error_msg = f"❌ Login failed with status {response.status_code}: {response.text}"
            print(error_msg)
            return False, "", error_msg
            
    except Exception as e:
        error_msg = f"❌ Exception during login: {str(e)}"
        print(error_msg)
        return False, "", error_msg


def get_access_codes(token: str) -> Tuple[bool, List[str], str]:
    """
    Get available access codes
    Returns: (success, access_codes_list, error_message)
    """
    print_section("STEP 2: Get Access Codes")
    
    endpoint = f"{BASE_URL}/admin/access-codes"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"GET {endpoint}")
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            codes = response.json()
            code_list = [c.get("code") for c in codes if c.get("code")]
            print(f"✅ Retrieved {len(code_list)} access codes")
            if code_list:
                print(f"Available codes: {', '.join(code_list[:5])}")
            return True, code_list, ""
        else:
            error_msg = f"❌ Failed to get access codes with status {response.status_code}"
            print(error_msg)
            return False, [], error_msg
            
    except Exception as e:
        error_msg = f"❌ Exception during get access codes: {str(e)}"
        print(error_msg)
        return False, [], error_msg


def create_orphan_trace(access_code: str) -> Tuple[bool, str, Dict[Any, Any], str]:
    """
    Step 3: Create an orphan trace (without authentication)
    Returns: (success, trace_id, trace_data, error_message)
    """
    print_section("STEP 3: Create Orphan Trace (No Authentication)")
    
    endpoint = f"{BASE_URL}/trace/start"
    
    # Generate unique test data
    random_num = random.randint(10000, 99999)
    payload = {
        "first_name": "Orphan",
        "last_name": f"Test{random_num}",
        "email": f"orphan.test{random_num}@example.com",
        "amount_tier": "20000_50000",
        "access_code": access_code
    }
    
    print(f"POST {endpoint}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print(f"⚠️  NO Authorization header (creating orphan trace)")
    
    try:
        # NO Authorization header - this creates an orphan trace
        response = requests.post(endpoint, json=payload, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            trace_id = data.get("trace_id")
            print(f"✅ Orphan trace created successfully")
            print(f"Trace ID: {trace_id}")
            print(f"Email: {payload['email']}")
            print(f"Name: {payload['first_name']} {payload['last_name']}")
            return True, trace_id, payload, ""
        else:
            error_msg = f"❌ Failed to create trace with status {response.status_code}: {response.text}"
            print(error_msg)
            return False, "", {}, error_msg
            
    except Exception as e:
        error_msg = f"❌ Exception during create trace: {str(e)}"
        print(error_msg)
        return False, "", {}, error_msg


def verify_orphan_trace_in_traces(token: str, expected_trace_id: str, expected_email: str) -> Tuple[bool, str]:
    """
    Step 4: Verify the orphan trace exists in /admin/traces with user_id = null
    Returns: (success, error_message)
    """
    print_section("STEP 4: Verify Orphan Trace in /admin/traces")
    
    endpoint = f"{BASE_URL}/admin/traces"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"GET {endpoint}")
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            traces = response.json()
            print(f"✅ Retrieved {len(traces)} traces")
            
            # Find our orphan trace
            orphan_trace = None
            for trace in traces:
                if trace.get("id") == expected_trace_id or trace.get("email") == expected_email:
                    orphan_trace = trace
                    break
            
            if orphan_trace:
                print(f"\n🔍 Found Orphan Trace:")
                print(f"   trace_id: {orphan_trace.get('id')}")
                print(f"   email: {orphan_trace.get('email')}")
                print(f"   first_name: {orphan_trace.get('first_name')}")
                print(f"   last_name: {orphan_trace.get('last_name')}")
                print(f"   user_id: {orphan_trace.get('user_id')}")
                
                if orphan_trace.get('user_id') is None:
                    print(f"\n✅ VERIFIED: user_id is null (orphan trace)")
                    return True, ""
                else:
                    error_msg = f"❌ FAILED: user_id is NOT null (value: {orphan_trace.get('user_id')})"
                    print(f"\n{error_msg}")
                    return False, error_msg
            else:
                error_msg = f"❌ Orphan trace not found in traces list"
                print(f"\n{error_msg}")
                return False, error_msg
        else:
            error_msg = f"❌ Failed to get traces with status {response.status_code}"
            print(error_msg)
            return False, error_msg
            
    except Exception as e:
        error_msg = f"❌ Exception during get traces: {str(e)}"
        print(error_msg)
        return False, error_msg


def verify_guest_entry_in_registered_users(token: str, expected_email: str, expected_first_name: str, expected_last_name: str) -> Tuple[bool, str]:
    """
    Step 5: Verify the orphan trace appears as a guest entry in /admin/registered-users
    Returns: (success, error_message)
    """
    print_section("STEP 5: Verify Guest Entry in /admin/registered-users")
    
    endpoint = f"{BASE_URL}/admin/registered-users"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"GET {endpoint}")
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Retrieved {len(users)} entries from registered-users endpoint")
            
            # Find guest entries
            guest_entries = [u for u in users if u.get("type") == "guest"]
            print(f"\n📊 Found {len(guest_entries)} guest entries (type='guest')")
            
            # Find our specific guest entry
            our_guest = None
            for guest in guest_entries:
                if guest.get("email") == expected_email:
                    our_guest = guest
                    break
            
            if our_guest:
                print(f"\n🔍 Found Our Guest Entry:")
                print(f"   type: {our_guest.get('type')}")
                print(f"   email: {our_guest.get('email')}")
                print(f"   first_name: {our_guest.get('first_name')}")
                print(f"   last_name: {our_guest.get('last_name')}")
                print(f"   has trace object: {our_guest.get('trace') is not None}")
                
                # Verify required fields
                checks = []
                
                if our_guest.get('type') == 'guest':
                    print(f"   ✅ type = 'guest'")
                    checks.append(True)
                else:
                    print(f"   ❌ type != 'guest' (value: {our_guest.get('type')})")
                    checks.append(False)
                
                if our_guest.get('first_name') == expected_first_name:
                    print(f"   ✅ first_name matches")
                    checks.append(True)
                else:
                    print(f"   ❌ first_name mismatch (expected: {expected_first_name}, got: {our_guest.get('first_name')})")
                    checks.append(False)
                
                if our_guest.get('last_name') == expected_last_name:
                    print(f"   ✅ last_name matches")
                    checks.append(True)
                else:
                    print(f"   ❌ last_name mismatch (expected: {expected_last_name}, got: {our_guest.get('last_name')})")
                    checks.append(False)
                
                if our_guest.get('email') == expected_email:
                    print(f"   ✅ email matches")
                    checks.append(True)
                else:
                    print(f"   ❌ email mismatch")
                    checks.append(False)
                
                if our_guest.get('trace') is not None:
                    print(f"   ✅ trace object present")
                    trace = our_guest.get('trace')
                    print(f"      trace_id: {trace.get('id')}")
                    print(f"      status: {trace.get('status')}")
                    print(f"      located_amount: {trace.get('located_amount')}")
                    checks.append(True)
                else:
                    print(f"   ❌ trace object missing")
                    checks.append(False)
                
                if all(checks):
                    print(f"\n✅ ALL CHECKS PASSED: Guest entry is correct")
                    return True, ""
                else:
                    error_msg = f"❌ Some checks failed for guest entry"
                    print(f"\n{error_msg}")
                    return False, error_msg
            else:
                error_msg = f"❌ Guest entry with email {expected_email} not found"
                print(f"\n{error_msg}")
                
                if guest_entries:
                    print(f"\nAvailable guest entries:")
                    for i, guest in enumerate(guest_entries[:3], 1):
                        print(f"   Guest #{i}: {guest.get('email')}")
                
                return False, error_msg
        else:
            error_msg = f"❌ Failed to get registered users with status {response.status_code}"
            print(error_msg)
            return False, error_msg
            
    except Exception as e:
        error_msg = f"❌ Exception during get registered users: {str(e)}"
        print(error_msg)
        return False, error_msg


def main():
    """Run the orphan traces bug fix verification test"""
    print("\n" + "="*80)
    print("TRACCIA FONDI API - ORPHAN TRACES BUG FIX VERIFICATION")
    print("="*80)
    print(f"API Base URL: {BASE_URL}")
    print(f"\nBug Description:")
    print(f"  Traces without registered accounts (user_id=null) were NOT showing")
    print(f"  in admin Users tab. Only registered users appeared.")
    print(f"\nExpected Fix:")
    print(f"  The /api/admin/registered-users endpoint should return guest entries")
    print(f"  (type='guest') for orphan traces, making them visible in the Users tab.")
    
    # Step 1: Admin login
    success, token, error = admin_login()
    if not success:
        print(f"\n❌ TEST FAILED: Could not login as admin")
        return 1
    
    # Step 2: Get access codes
    success, access_codes, error = get_access_codes(token)
    if not success or not access_codes:
        print(f"\n❌ TEST FAILED: Could not retrieve access codes")
        return 1
    
    # Use the first available access code
    access_code = access_codes[0]
    print(f"\nUsing access code: {access_code}")
    
    # Step 3: Create orphan trace
    success, trace_id, trace_data, error = create_orphan_trace(access_code)
    if not success:
        print(f"\n❌ TEST FAILED: Could not create orphan trace")
        return 1
    
    # Step 4: Verify orphan trace in /admin/traces
    success, error = verify_orphan_trace_in_traces(token, trace_id, trace_data.get("email"))
    if not success:
        print(f"\n❌ TEST FAILED: Orphan trace verification failed")
        return 1
    
    # Step 5: Verify guest entry in /admin/registered-users
    success, error = verify_guest_entry_in_registered_users(
        token, 
        trace_data.get("email"),
        trace_data.get("first_name"),
        trace_data.get("last_name")
    )
    if not success:
        print(f"\n❌ TEST FAILED: Guest entry verification failed")
        return 1
    
    # Final verdict
    print_section("FINAL TEST RESULT")
    
    print(f"✅ PASS: Orphan trace bug fix VERIFIED")
    print(f"\nTest Summary:")
    print(f"  1. ✅ Created orphan trace without authentication")
    print(f"  2. ✅ Verified trace has user_id = null in /admin/traces")
    print(f"  3. ✅ Verified guest entry (type='guest') appears in /admin/registered-users")
    print(f"  4. ✅ Guest entry has all required fields (first_name, last_name, email, trace)")
    print(f"\n🎉 Bug fix is working correctly!")
    print(f"   Orphan traces are now visible in the admin Users tab as guest entries.")
    
    return 0


if __name__ == "__main__":
    exit(main())
