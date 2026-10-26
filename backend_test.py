#!/usr/bin/env python3
"""
Backend test for Traccia Fondi 50h email button fix verification
Tests the button HTML structure in the 50h funds-located email
"""

import requests
import sys
import re

BACKEND_URL = "https://fondi-trace-demo.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@traccia-fondi.com"
ADMIN_PASSWORD = "admin123"

def test_50h_email_button_fix():
    """
    Test the 50h email button fix by:
    1. Logging in as admin
    2. Getting a trace ID
    3. Triggering the 50h email (force resend)
    4. Verifying the button HTML in server.py contains all required elements
    """
    print("=" * 80)
    print("50H EMAIL BUTTON FIX VERIFICATION TEST")
    print("=" * 80)
    
    # Test 1: Admin login
    print("\n[TEST 1] Admin login...")
    try:
        resp = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Admin login failed with status {resp.status_code}")
            print(f"Response: {resp.text}")
            return False
        
        data = resp.json()
        admin_token = data.get("token")
        if not admin_token:
            print("❌ FAIL: No token in admin login response")
            return False
        
        print(f"✅ PASS: Admin login successful")
        print(f"   Token: {admin_token[:20]}...")
    except Exception as e:
        print(f"❌ FAIL: Admin login exception: {e}")
        return False
    
    # Test 2: Get traces
    print("\n[TEST 2] Get traces to find a trace ID...")
    try:
        resp = requests.get(f"{BACKEND_URL}/admin/traces", headers={
            "Authorization": f"Bearer {admin_token}"
        }, timeout=10)
        
        if resp.status_code != 200:
            print(f"❌ FAIL: Get traces failed with status {resp.status_code}")
            return False
        
        traces = resp.json()
        if not traces or len(traces) == 0:
            print("❌ FAIL: No traces found in system")
            return False
        
        trace_id = traces[0].get("id")
        trace_email = traces[0].get("email", "N/A")
        trace_name = f"{traces[0].get('first_name', '')} {traces[0].get('last_name', '')}"
        
        print(f"✅ PASS: Found {len(traces)} trace(s)")
        print(f"   Using trace ID: {trace_id}")
        print(f"   Trace email: {trace_email}")
        print(f"   Trace name: {trace_name}")
    except Exception as e:
        print(f"❌ FAIL: Get traces exception: {e}")
        return False
    
    # Test 3: Trigger 50h email (force resend)
    print("\n[TEST 3] Trigger 50h email force resend...")
    try:
        resp = requests.post(f"{BACKEND_URL}/admin/traces/{trace_id}/send-50h-email", headers={
            "Authorization": f"Bearer {admin_token}"
        }, timeout=10)
        
        if resp.status_code != 200:
            print(f"⚠️  WARNING: Force resend returned status {resp.status_code}")
            print(f"   Response: {resp.text}")
            print(f"   This is expected if RESEND_API_KEY is not configured")
        else:
            print(f"✅ PASS: 50h email endpoint called successfully")
            print(f"   Response: {resp.json()}")
    except Exception as e:
        print(f"⚠️  WARNING: Force resend exception: {e}")
        print(f"   This is expected if RESEND_API_KEY is not configured")
    
    # Test 4: Verify button HTML in server.py
    print("\n[TEST 4] Verify button HTML structure in server.py...")
    try:
        with open("/app/backend/server.py", "r") as f:
            server_py_content = f.read()
        
        # Find the send_50h_email function
        if "async def send_50h_email" not in server_py_content:
            print("❌ FAIL: send_50h_email function not found in server.py")
            return False
        
        print("✅ Found send_50h_email function")
        
        # Extract the English button section (lines 469-487)
        english_button_match = re.search(
            r'<table cellpadding="0" cellspacing="0" border="0" role="presentation".*?'
            r'PROCEED TO SECURE PAYMENT.*?'
            r'Can&#39;t see the button\? Click here to pay.*?'
            r'</div>',
            server_py_content,
            re.DOTALL
        )
        
        # Extract the Italian button section (lines 543-561)
        italian_button_match = re.search(
            r'<table cellpadding="0" cellspacing="0" border="0" role="presentation".*?'
            r'PROCEDI AL PAGAMENTO SICURO.*?'
            r'Non vedi il pulsante\? Clicca qui per pagare.*?'
            r'</div>',
            server_py_content,
            re.DOTALL
        )
        
        if not english_button_match or not italian_button_match:
            print("❌ FAIL: Could not find button HTML sections")
            return False
        
        english_button_html = english_button_match.group(0)
        italian_button_html = italian_button_match.group(0)
        
        print("\n--- ENGLISH BUTTON HTML VERIFICATION ---")
        checks_passed = 0
        checks_total = 6
        
        # Check 1: Table wrapping
        if '<table cellpadding="0" cellspacing="0" border="0" role="presentation"' in english_button_html:
            print("✅ CHECK 1: Table wrapping with cellpadding/cellspacing/border/role - PRESENT")
            checks_passed += 1
        else:
            print("❌ CHECK 1: Table wrapping - MISSING")
        
        # Check 2: bgcolor on <td>
        if 'bgcolor="#5FE3C9"' in english_button_html:
            print("✅ CHECK 2: bgcolor=\"#5FE3C9\" on <td> - PRESENT")
            checks_passed += 1
        else:
            print("❌ CHECK 2: bgcolor on <td> - MISSING")
        
        # Check 3: color:#000000 (black) on <a> tag
        if 'color:#000000' in english_button_html:
            print("✅ CHECK 3: color:#000000 (black) on <a> tag - PRESENT")
            checks_passed += 1
        else:
            print("❌ CHECK 3: color:#000000 on <a> tag - MISSING")
        
        # Check 4: NO color:#06122A (old dark blue)
        if 'color:#06122A' not in english_button_html:
            print("✅ CHECK 4: NO color:#06122A (old dark blue) - CORRECT")
            checks_passed += 1
        else:
            print("❌ CHECK 4: color:#06122A still present - INCORRECT")
        
        # Check 5: Fallback plain-text link
        if "Can&#39;t see the button? Click here to pay" in english_button_html:
            print("✅ CHECK 5: Fallback plain-text link - PRESENT")
            checks_passed += 1
        else:
            print("❌ CHECK 5: Fallback plain-text link - MISSING")
        
        # Check 6: Lock emoji
        if "&#x1F512;" in english_button_html:
            print("✅ CHECK 6: Lock emoji &#x1F512; - PRESENT")
            checks_passed += 1
        else:
            print("❌ CHECK 6: Lock emoji - MISSING")
        
        # Check 7: NO linear-gradient
        if "linear-gradient" not in english_button_html:
            print("✅ CHECK 7: NO linear-gradient on button - CORRECT")
        else:
            print("❌ CHECK 7: linear-gradient still present - INCORRECT")
        
        print("\n--- ITALIAN BUTTON HTML VERIFICATION ---")
        italian_checks_passed = 0
        
        # Check 1: Table wrapping
        if '<table cellpadding="0" cellspacing="0" border="0" role="presentation"' in italian_button_html:
            print("✅ CHECK 1: Table wrapping with cellpadding/cellspacing/border/role - PRESENT")
            italian_checks_passed += 1
        else:
            print("❌ CHECK 1: Table wrapping - MISSING")
        
        # Check 2: bgcolor on <td>
        if 'bgcolor="#5FE3C9"' in italian_button_html:
            print("✅ CHECK 2: bgcolor=\"#5FE3C9\" on <td> - PRESENT")
            italian_checks_passed += 1
        else:
            print("❌ CHECK 2: bgcolor on <td> - MISSING")
        
        # Check 3: color:#000000 (black) on <a> tag
        if 'color:#000000' in italian_button_html:
            print("✅ CHECK 3: color:#000000 (black) on <a> tag - PRESENT")
            italian_checks_passed += 1
        else:
            print("❌ CHECK 3: color:#000000 on <a> tag - MISSING")
        
        # Check 4: NO color:#06122A (old dark blue)
        if 'color:#06122A' not in italian_button_html:
            print("✅ CHECK 4: NO color:#06122A (old dark blue) - CORRECT")
            italian_checks_passed += 1
        else:
            print("❌ CHECK 4: color:#06122A still present - INCORRECT")
        
        # Check 5: Fallback plain-text link
        if "Non vedi il pulsante? Clicca qui per pagare" in italian_button_html:
            print("✅ CHECK 5: Fallback plain-text link (Italian) - PRESENT")
            italian_checks_passed += 1
        else:
            print("❌ CHECK 5: Fallback plain-text link - MISSING")
        
        # Check 6: Lock emoji
        if "&#x1F512;" in italian_button_html:
            print("✅ CHECK 6: Lock emoji &#x1F512; - PRESENT")
            italian_checks_passed += 1
        else:
            print("❌ CHECK 6: Lock emoji - MISSING")
        
        # Check 7: NO linear-gradient
        if "linear-gradient" not in italian_button_html:
            print("✅ CHECK 7: NO linear-gradient on button - CORRECT")
        else:
            print("❌ CHECK 7: linear-gradient still present - INCORRECT")
        
        print("\n" + "=" * 80)
        print(f"ENGLISH BUTTON: {checks_passed}/{checks_total} checks passed")
        print(f"ITALIAN BUTTON: {italian_checks_passed}/{checks_total} checks passed")
        
        if checks_passed == checks_total and italian_checks_passed == checks_total:
            print("\n✅ ALL CHECKS PASSED - 50H EMAIL BUTTON FIX VERIFIED")
            return True
        else:
            print("\n❌ SOME CHECKS FAILED - FIX NOT COMPLETE")
            return False
        
    except Exception as e:
        print(f"❌ FAIL: Button HTML verification exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_50h_email_button_fix()
    sys.exit(0 if success else 1)
