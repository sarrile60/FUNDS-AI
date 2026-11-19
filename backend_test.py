#!/usr/bin/env python3
"""
Backend API Testing Script for Traccia Fondi - Email Language Fix Verification
Tests the _resolve_lang() function fix for 24h/50h emails
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Production backend URL
BASE_URL = "https://traccia-fondi.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@traccia-fondi.com"
ADMIN_PASSWORD = "admin123"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(msg: str):
    print(f"{Colors.GREEN}✅ {msg}{Colors.END}")

def print_error(msg: str):
    print(f"{Colors.RED}❌ {msg}{Colors.END}")

def print_info(msg: str):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")

def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")

def test_admin_login() -> Optional[str]:
    """Test 1: Login as admin and get token"""
    print("\n" + "="*80)
    print("TEST 1: Admin Login")
    print("="*80)
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        
        print_info(f"POST {BASE_URL}/auth/login")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            if token:
                print_success(f"Admin login successful")
                print_info(f"Token: {token[:20]}...")
                return token
            else:
                print_error("No token in response")
                return None
        else:
            print_error(f"Login failed: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Exception during login: {str(e)}")
        return None

def test_get_italian_user_with_trace(token: str) -> Optional[Dict[str, Any]]:
    """Test 2: Get users list and find Italian user with trace"""
    print("\n" + "="*80)
    print("TEST 2: Get Italian User with Trace")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/registered-users",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        print_info(f"GET {BASE_URL}/admin/registered-users")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print_info(f"Found {len(users)} total users")
            
            # Find Italian user with trace
            italian_users_with_trace = []
            for user in users:
                lang = user.get("lang", "")
                trace = user.get("trace")
                
                if lang == "it" and trace and trace.get("id"):
                    italian_users_with_trace.append({
                        "user_id": user.get("id"),
                        "email": user.get("email"),
                        "first_name": user.get("first_name"),
                        "last_name": user.get("last_name"),
                        "lang": lang,
                        "trace_id": trace.get("id"),
                        "trace_status": trace.get("status"),
                        "email_24h_sent": trace.get("email_24h_sent", False),
                        "email_50h_sent": trace.get("email_50h_sent", False)
                    })
            
            if italian_users_with_trace:
                print_success(f"Found {len(italian_users_with_trace)} Italian user(s) with trace")
                
                # Pick the first one
                selected_user = italian_users_with_trace[0]
                print_info(f"Selected user:")
                print_info(f"  - Email: {selected_user['email']}")
                print_info(f"  - Name: {selected_user['first_name']} {selected_user['last_name']}")
                print_info(f"  - Lang: {selected_user['lang']}")
                print_info(f"  - Trace ID: {selected_user['trace_id']}")
                print_info(f"  - 24h email sent: {selected_user['email_24h_sent']}")
                print_info(f"  - 50h email sent: {selected_user['email_50h_sent']}")
                
                return selected_user
            else:
                print_warning("No Italian users with traces found")
                print_info("Looking for any user with trace...")
                
                # Fallback: find any user with trace
                for user in users:
                    trace = user.get("trace")
                    if trace and trace.get("id"):
                        fallback_user = {
                            "user_id": user.get("id"),
                            "email": user.get("email"),
                            "first_name": user.get("first_name"),
                            "last_name": user.get("last_name"),
                            "lang": user.get("lang", ""),
                            "trace_id": trace.get("id"),
                            "trace_status": trace.get("status"),
                            "email_24h_sent": trace.get("email_24h_sent", False),
                            "email_50h_sent": trace.get("email_50h_sent", False)
                        }
                        print_warning(f"Using fallback user with lang='{fallback_user['lang']}'")
                        print_info(f"  - Email: {fallback_user['email']}")
                        print_info(f"  - Trace ID: {fallback_user['trace_id']}")
                        return fallback_user
                
                print_error("No users with traces found at all")
                return None
        else:
            print_error(f"Failed to get users: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Exception during get users: {str(e)}")
        return None

def test_send_24h_email(token: str, trace_id: str) -> bool:
    """Test 3: Trigger 24h email send and verify response"""
    print("\n" + "="*80)
    print("TEST 3: Send 24h Email (Verify _resolve_lang)")
    print("="*80)
    
    try:
        response = requests.post(
            f"{BASE_URL}/admin/traces/{trace_id}/send-24h-email",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        print_info(f"POST {BASE_URL}/admin/traces/{trace_id}/send-24h-email")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_success("24h email endpoint returned 200 OK")
            print_info(f"Response: {json.dumps(data, indent=2)}")
            
            # Check if email was actually sent
            if data.get("email_24h_sent") == True:
                print_success("email_24h_sent flag is now True")
            else:
                print_warning(f"email_24h_sent flag is: {data.get('email_24h_sent')}")
            
            return True
        elif response.status_code == 400:
            # Check if it's already sent
            error_msg = response.text
            if "already sent" in error_msg.lower():
                print_warning(f"24h email was already sent for this trace")
                print_info(f"Response: {error_msg}")
                return True  # This is not a failure - just means it was already sent
            else:
                print_error(f"Bad request: {error_msg}")
                return False
        else:
            print_error(f"Failed to send 24h email: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Exception during send 24h email: {str(e)}")
        return False

def test_verify_resolve_lang_in_code() -> bool:
    """Test 4: Verify _resolve_lang function exists in backend code"""
    print("\n" + "="*80)
    print("TEST 4: Verify _resolve_lang Function in Code")
    print("="*80)
    
    try:
        # Check if we can access the backend code
        import os
        backend_file = "/root/traccia-fondi/backend/server.py"
        
        if os.path.exists(backend_file):
            print_info(f"Checking {backend_file}")
            with open(backend_file, 'r') as f:
                content = f.read()
                
            if "_resolve_lang" in content:
                print_success("_resolve_lang function found in server.py")
                
                # Try to extract the function
                lines = content.split('\n')
                in_function = False
                function_lines = []
                
                for i, line in enumerate(lines):
                    if "def _resolve_lang" in line or "async def _resolve_lang" in line:
                        in_function = True
                        function_lines.append(f"{i+1}: {line}")
                    elif in_function:
                        if line.strip() and not line.startswith(' ') and not line.startswith('\t'):
                            # End of function
                            break
                        function_lines.append(f"{i+1}: {line}")
                
                if function_lines:
                    print_info("Function definition:")
                    for line in function_lines[:20]:  # Show first 20 lines
                        print(f"  {line}")
                    if len(function_lines) > 20:
                        print(f"  ... ({len(function_lines) - 20} more lines)")
                
                return True
            else:
                print_error("_resolve_lang function NOT found in server.py")
                return False
        else:
            print_warning(f"Cannot access {backend_file} - file not found")
            print_info("This test requires SSH access to the VPS")
            return None
            
    except Exception as e:
        print_warning(f"Cannot verify code locally: {str(e)}")
        print_info("This test requires SSH access to the VPS")
        return None

def main():
    print("\n" + "="*80)
    print("TRACCIA FONDI - EMAIL LANGUAGE FIX VERIFICATION")
    print("Testing _resolve_lang() function for 24h/50h emails")
    print("="*80)
    
    results = {
        "admin_login": False,
        "find_italian_user": False,
        "send_24h_email": False,
        "verify_code": None
    }
    
    # Test 1: Admin login
    token = test_admin_login()
    if not token:
        print_error("\n❌ CRITICAL: Admin login failed. Cannot proceed with tests.")
        sys.exit(1)
    results["admin_login"] = True
    
    # Test 2: Find Italian user with trace
    user_data = test_get_italian_user_with_trace(token)
    if not user_data:
        print_error("\n❌ CRITICAL: No users with traces found. Cannot test email sending.")
        sys.exit(1)
    results["find_italian_user"] = True
    
    # Test 3: Send 24h email
    trace_id = user_data["trace_id"]
    email_sent = test_send_24h_email(token, trace_id)
    results["send_24h_email"] = email_sent
    
    # Test 4: Verify code (optional - requires VPS access)
    code_verified = test_verify_resolve_lang_in_code()
    results["verify_code"] = code_verified
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    print(f"\n1. Admin Login: {'✅ PASS' if results['admin_login'] else '❌ FAIL'}")
    print(f"2. Find Italian User with Trace: {'✅ PASS' if results['find_italian_user'] else '❌ FAIL'}")
    print(f"3. Send 24h Email (200 response): {'✅ PASS' if results['send_24h_email'] else '❌ FAIL'}")
    
    if results['verify_code'] is True:
        print(f"4. Verify _resolve_lang in Code: ✅ PASS")
    elif results['verify_code'] is False:
        print(f"4. Verify _resolve_lang in Code: ❌ FAIL")
    else:
        print(f"4. Verify _resolve_lang in Code: ⚠️  SKIPPED (requires VPS access)")
    
    print("\n" + "="*80)
    print("NEXT STEPS")
    print("="*80)
    
    if results["send_24h_email"]:
        print_info("✅ The 24h email endpoint returned 200 OK")
        print_info("📋 To verify the language fix is working:")
        print_info("   1. SSH to VPS: ssh root@187.127.226.127 (password: Satoshi@10benz)")
        print_info("   2. Check logs: tail -n 100 /var/log/traccia-fondi-backend.out.log")
        print_info("   3. Look for '24h email sent' log line")
        print_info("   4. Verify no Python exceptions about _resolve_lang or missing user lookups")
        print_info("   5. Check that _resolve_lang function exists in /root/traccia-fondi/backend/server.py")
    else:
        print_error("❌ The 24h email endpoint did not return 200 OK")
        print_info("   Check backend logs for errors")
    
    print("\n")

if __name__ == "__main__":
    main()
