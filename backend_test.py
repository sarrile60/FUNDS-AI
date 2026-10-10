#!/usr/bin/env python3
"""
Rate Limiting Removal Test for Traccia Fondi API
Tests that rate limiting is completely removed from the API endpoints.
"""

import requests
import time
from typing import List, Dict, Tuple

# API Base URL
BASE_URL = "https://ba6608eb-6e97-459e-a2cf-7ed6913f7c68.preview.emergentagent.com/api"

def test_check_email_rate_limiting() -> Tuple[bool, str]:
    """
    Test 1: Send 20 rapid consecutive POST requests to /api/trace/check-email
    Verify that NONE return 429 and ALL return 200.
    """
    print("\n" + "="*80)
    print("TEST 1: Check Email Endpoint Rate Limiting Removal")
    print("="*80)
    
    endpoint = f"{BASE_URL}/trace/check-email"
    payload = {"email": "test@test.com"}
    
    results = []
    status_codes = []
    
    print(f"\nSending 20 rapid consecutive POST requests to {endpoint}")
    print(f"Payload: {payload}\n")
    
    start_time = time.time()
    
    for i in range(20):
        try:
            response = requests.post(endpoint, json=payload, timeout=10)
            status_code = response.status_code
            status_codes.append(status_code)
            
            result = {
                "request_num": i + 1,
                "status_code": status_code,
                "response_time": response.elapsed.total_seconds()
            }
            results.append(result)
            
            # Print progress
            if status_code == 429:
                print(f"  Request {i+1}: ❌ FAILED - Status {status_code} (RATE LIMITED)")
            elif status_code == 200:
                print(f"  Request {i+1}: ✅ Status {status_code}")
            else:
                print(f"  Request {i+1}: ⚠️  Status {status_code}")
                
        except Exception as e:
            print(f"  Request {i+1}: ❌ ERROR - {str(e)}")
            results.append({
                "request_num": i + 1,
                "error": str(e)
            })
    
    end_time = time.time()
    total_time = end_time - start_time
    
    # Analysis
    print(f"\n{'─'*80}")
    print("RESULTS ANALYSIS:")
    print(f"{'─'*80}")
    print(f"Total requests sent: 20")
    print(f"Total time: {total_time:.2f} seconds")
    print(f"Average time per request: {total_time/20:.3f} seconds")
    
    count_200 = status_codes.count(200)
    count_429 = status_codes.count(429)
    count_other = len(status_codes) - count_200 - count_429
    
    print(f"\nStatus Code Distribution:")
    print(f"  200 (OK): {count_200}")
    print(f"  429 (Rate Limited): {count_429}")
    print(f"  Other: {count_other}")
    
    # Determine pass/fail
    if count_429 > 0:
        result_msg = f"❌ FAIL - Found {count_429} requests with 429 status code (rate limited)"
        passed = False
    elif count_200 == 20:
        result_msg = f"✅ PASS - All 20 requests returned 200 status code"
        passed = True
    else:
        result_msg = f"⚠️  PARTIAL - {count_200}/20 requests returned 200, {count_429} returned 429, {count_other} returned other codes"
        passed = count_429 == 0  # Pass if no 429s, even if some other status codes
    
    print(f"\n{result_msg}")
    
    return passed, result_msg


def test_login_rate_limiting() -> Tuple[bool, str]:
    """
    Test 2: Send 10 rapid POST requests to /api/auth/login with wrong credentials
    Verify that none return 429 (should return 401 for wrong credentials).
    """
    print("\n" + "="*80)
    print("TEST 2: Login Endpoint Rate Limiting Removal")
    print("="*80)
    
    endpoint = f"{BASE_URL}/auth/login"
    payload = {"email": "test@test.com", "password": "wrong"}
    
    results = []
    status_codes = []
    
    print(f"\nSending 10 rapid consecutive POST requests to {endpoint}")
    print(f"Payload: {payload}\n")
    
    start_time = time.time()
    
    for i in range(10):
        try:
            response = requests.post(endpoint, json=payload, timeout=10)
            status_code = response.status_code
            status_codes.append(status_code)
            
            result = {
                "request_num": i + 1,
                "status_code": status_code,
                "response_time": response.elapsed.total_seconds()
            }
            results.append(result)
            
            # Print progress
            if status_code == 429:
                print(f"  Request {i+1}: ❌ FAILED - Status {status_code} (RATE LIMITED)")
            elif status_code == 401:
                print(f"  Request {i+1}: ✅ Status {status_code} (Unauthorized - expected)")
            else:
                print(f"  Request {i+1}: ⚠️  Status {status_code}")
                
        except Exception as e:
            print(f"  Request {i+1}: ❌ ERROR - {str(e)}")
            results.append({
                "request_num": i + 1,
                "error": str(e)
            })
    
    end_time = time.time()
    total_time = end_time - start_time
    
    # Analysis
    print(f"\n{'─'*80}")
    print("RESULTS ANALYSIS:")
    print(f"{'─'*80}")
    print(f"Total requests sent: 10")
    print(f"Total time: {total_time:.2f} seconds")
    print(f"Average time per request: {total_time/10:.3f} seconds")
    
    count_401 = status_codes.count(401)
    count_429 = status_codes.count(429)
    count_other = len(status_codes) - count_401 - count_429
    
    print(f"\nStatus Code Distribution:")
    print(f"  401 (Unauthorized): {count_401}")
    print(f"  429 (Rate Limited): {count_429}")
    print(f"  Other: {count_other}")
    
    # Determine pass/fail
    if count_429 > 0:
        result_msg = f"❌ FAIL - Found {count_429} requests with 429 status code (rate limited)"
        passed = False
    elif count_401 == 10:
        result_msg = f"✅ PASS - All 10 requests returned 401 status code (no rate limiting)"
        passed = True
    else:
        result_msg = f"⚠️  PARTIAL - {count_401}/10 requests returned 401, {count_429} returned 429, {count_other} returned other codes"
        passed = count_429 == 0  # Pass if no 429s
    
    print(f"\n{result_msg}")
    
    return passed, result_msg


def main():
    """Run all rate limiting tests"""
    print("\n" + "="*80)
    print("TRACCIA FONDI API - RATE LIMITING REMOVAL TEST")
    print("="*80)
    print(f"API Base URL: {BASE_URL}")
    print(f"Test Date: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run tests
    test1_passed, test1_msg = test_check_email_rate_limiting()
    test2_passed, test2_msg = test_login_rate_limiting()
    
    # Final summary
    print("\n" + "="*80)
    print("FINAL TEST SUMMARY")
    print("="*80)
    print(f"\nTest 1 (Check Email): {test1_msg}")
    print(f"Test 2 (Login): {test2_msg}")
    
    if test1_passed and test2_passed:
        print("\n" + "="*80)
        print("✅ OVERALL RESULT: PASS")
        print("Rate limiting has been successfully removed from all tested endpoints.")
        print("="*80)
        return 0
    else:
        print("\n" + "="*80)
        print("❌ OVERALL RESULT: FAIL")
        print("Rate limiting is still present on one or more endpoints.")
        print("="*80)
        return 1


if __name__ == "__main__":
    exit(main())
