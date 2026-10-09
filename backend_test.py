#!/usr/bin/env python3
"""
Regression test for tier ranges in _located_amount_for function.
Tests that POST /api/trace/start returns located_amount values within expected ranges.
"""

import requests
import sys
from typing import List, Dict, Tuple

# Backend URL from frontend/.env
BASE_URL = "https://nifty-hermann-10.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@traccia-fondi.com"
ADMIN_PASSWORD = "admin123"

# Test access code
TEST_CODE = "RANGETEST"
TEST_DESTINATION = "Test"

# Expected ranges for each tier (from TIER_HIGH_END in server.py)
TIER_RANGES = {
    "5000_20000": (130000, 150000),
    "20000_50000": (275000, 305000),
    "50000_100000": (355000, 385000),
    "100000_plus": (430000, 470000),
}

# Test results storage
test_results = {
    "passed": [],
    "failed": [],
    "warnings": [],
}


def log_pass(msg: str):
    """Log a passing test."""
    print(f"✅ {msg}")
    test_results["passed"].append(msg)


def log_fail(msg: str):
    """Log a failing test."""
    print(f"❌ {msg}")
    test_results["failed"].append(msg)


def log_warn(msg: str):
    """Log a warning."""
    print(f"⚠️  {msg}")
    test_results["warnings"].append(msg)


def admin_login() -> str:
    """Login as admin and return token."""
    print("\n=== SETUP: Admin Login ===")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10
    )
    if resp.status_code != 200:
        log_fail(f"Admin login failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    token = data.get("token")
    if not token:
        log_fail("Admin login response missing token")
        sys.exit(1)
    
    log_pass(f"Admin login successful")
    return token


def create_access_code(token: str) -> str:
    """Create test access code. Returns code ID."""
    print("\n=== SETUP: Create Access Code ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check if code already exists
    resp = requests.get(f"{BASE_URL}/admin/access-codes", headers=headers, timeout=10)
    if resp.status_code == 200:
        codes = resp.json()
        for code in codes:
            if code.get("code") == TEST_CODE:
                log_pass(f"Access code '{TEST_CODE}' already exists (id: {code['id']})")
                return code["id"]
    
    # Create new code
    resp = requests.post(
        f"{BASE_URL}/admin/access-codes",
        headers=headers,
        json={
            "code": TEST_CODE,
            "destination_name": TEST_DESTINATION,
            "destination_url": ""
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        log_fail(f"Failed to create access code: {resp.status_code} - {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    code_id = data.get("id")
    log_pass(f"Created access code '{TEST_CODE}' (id: {code_id})")
    return code_id


def test_tier_ranges(token: str) -> Dict[str, List[float]]:
    """
    Test all 4 tiers with 5 calls each.
    Returns dict mapping tier -> list of located_amount values.
    """
    print("\n=== TIER RANGE REGRESSION TEST ===")
    results = {}
    trace_ids = []
    
    for tier in TIER_RANGES.keys():
        print(f"\n--- Testing tier: {tier} ---")
        tier_values = []
        lo, hi = TIER_RANGES[tier]
        
        for i in range(5):
            email = f"range-test-{tier}-{i}@example.com"
            
            # Call /api/trace/start
            resp = requests.post(
                f"{BASE_URL}/trace/start",
                json={
                    "first_name": "Range",
                    "last_name": f"Test{i}",
                    "email": email,
                    "access_code": TEST_CODE,
                    "amount_tier": tier
                },
                timeout=10
            )
            
            if resp.status_code != 200:
                log_fail(f"  Call {i+1}/5 failed: {resp.status_code} - {resp.text}")
                continue
            
            data = resp.json()
            located = data.get("located_amount")
            trace_id = data.get("trace_id")
            
            if trace_id:
                trace_ids.append(trace_id)
            
            if located is None:
                log_fail(f"  Call {i+1}/5: Response missing 'located_amount'")
                continue
            
            tier_values.append(located)
            
            # Check if value is in range
            if lo <= located <= hi:
                print(f"  ✓ Call {i+1}/5: {located:,.2f} (in range [{lo:,} - {hi:,}])")
            else:
                log_fail(f"  Call {i+1}/5: {located:,.2f} OUT OF RANGE [{lo:,} - {hi:,}]")
        
        results[tier] = tier_values
    
    return results, trace_ids


def validate_tier_results(results: Dict[str, List[float]]):
    """Validate that tier results meet all success criteria."""
    print("\n=== VALIDATION ===")
    
    for tier, values in results.items():
        lo, hi = TIER_RANGES[tier]
        print(f"\n--- Tier: {tier} ---")
        print(f"  Expected range: [{lo:,} - {hi:,}]")
        print(f"  Sample values: {[f'{v:,.2f}' for v in values[:3]]}")
        
        if len(values) != 5:
            log_fail(f"  Expected 5 values, got {len(values)}")
            continue
        
        # Check 1: All values in range
        out_of_range = [v for v in values if not (lo <= v <= hi)]
        if out_of_range:
            log_fail(f"  {len(out_of_range)} values out of range: {out_of_range}")
        else:
            log_pass(f"  All 5 values within range [{lo:,} - {hi:,}]")
        
        # Check 2: Randomization (at least 3 distinct values)
        distinct = len(set(values))
        if distinct < 3:
            log_fail(f"  Only {distinct} distinct values (expected ≥3): {values}")
        else:
            log_pass(f"  Randomization OK: {distinct} distinct values out of 5")
        
        # Check 3: Values have cents (not round integers)
        round_values = [v for v in values if v == int(v)]
        if round_values:
            log_fail(f"  {len(round_values)} values are round integers (no cents): {round_values}")
        else:
            log_pass(f"  All values have cents (float precision)")


def cleanup_test_data(token: str, trace_ids: List[str]):
    """Delete all test traces and access code."""
    print("\n=== CLEANUP ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Delete traces
    deleted_count = 0
    for trace_id in trace_ids:
        resp = requests.delete(
            f"{BASE_URL}/admin/traces/{trace_id}",
            headers=headers,
            timeout=10
        )
        if resp.status_code == 200:
            deleted_count += 1
    
    if deleted_count == len(trace_ids):
        log_pass(f"Deleted {deleted_count} test traces")
    else:
        log_warn(f"Deleted {deleted_count}/{len(trace_ids)} test traces")
    
    # Delete access code
    # First, get all codes to find RANGETEST
    resp = requests.get(f"{BASE_URL}/admin/access-codes", headers=headers, timeout=10)
    if resp.status_code == 200:
        codes = resp.json()
        for code in codes:
            if code.get("code") == TEST_CODE:
                code_id = code["id"]
                resp = requests.delete(
                    f"{BASE_URL}/admin/access-codes/{code_id}",
                    headers=headers,
                    timeout=10
                )
                if resp.status_code == 200:
                    log_pass(f"Deleted access code '{TEST_CODE}'")
                else:
                    log_warn(f"Failed to delete access code: {resp.status_code}")
                break
    else:
        log_warn(f"Failed to list access codes for cleanup: {resp.status_code}")


def main():
    """Run the complete regression test."""
    print("=" * 70)
    print("TIER RANGE REGRESSION TEST")
    print("Testing _located_amount_for() via POST /api/trace/start")
    print("=" * 70)
    
    try:
        # Setup
        token = admin_login()
        create_access_code(token)
        
        # Test
        results, trace_ids = test_tier_ranges(token)
        
        # Validate
        validate_tier_results(results)
        
        # Cleanup
        cleanup_test_data(token, trace_ids)
        
        # Summary
        print("\n" + "=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        print(f"✅ Passed: {len(test_results['passed'])}")
        print(f"❌ Failed: {len(test_results['failed'])}")
        print(f"⚠️  Warnings: {len(test_results['warnings'])}")
        
        if test_results['failed']:
            print("\nFAILURES:")
            for fail in test_results['failed']:
                print(f"  - {fail}")
            sys.exit(1)
        else:
            print("\n🎉 ALL TESTS PASSED!")
            sys.exit(0)
    
    except Exception as e:
        log_fail(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
