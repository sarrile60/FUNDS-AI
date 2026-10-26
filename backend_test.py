#!/usr/bin/env python3
"""
Backend API Testing for Traccia Fondi - Agent Portal Uniswap V4 Feature
========================================================================
Tests the agent portal endpoints after fix for missing @api.get decorator
on /admin/agents/{agent_id}/password endpoint.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://fondi-trace-demo.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Admin credentials
ADMIN_EMAIL = "admin@traccia-fondi.com"
ADMIN_PASSWORD = "admin123"

# Test results tracking
test_results = []


def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {
        "test": test_name,
        "passed": passed,
        "details": details
    }
    test_results.append(result)
    print(f"{status}: {test_name}")
    if details:
        print(f"  Details: {details}")
    print()


def test_1_admin_login() -> Optional[str]:
    """TEST 1: Admin login to get admin token"""
    print("=" * 80)
    print("TEST 1: Admin Login")
    print("=" * 80)
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            if token:
                log_test("Admin Login", True, f"Token received: {token[:20]}...")
                return token
            else:
                log_test("Admin Login", False, "No token in response")
                return None
        else:
            log_test("Admin Login", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("Admin Login", False, f"Exception: {str(e)}")
        return None


def test_2_get_agents(admin_token: str) -> Optional[list]:
    """TEST 2: GET /api/admin/agents - Get list of agents"""
    print("=" * 80)
    print("TEST 2: GET /api/admin/agents - Get Agent List")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/agents",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            agents = response.json()
            if isinstance(agents, list):
                log_test("GET /api/admin/agents", True, f"Retrieved {len(agents)} agents")
                for i, agent in enumerate(agents[:3]):  # Show first 3
                    print(f"  Agent {i+1}: id={agent.get('id')}, username={agent.get('username')}")
                return agents
            else:
                log_test("GET /api/admin/agents", False, "Response is not a list")
                return None
        else:
            log_test("GET /api/admin/agents", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/admin/agents", False, f"Exception: {str(e)}")
        return None


def test_3_get_agent_password(admin_token: str, agent_id: str) -> Optional[str]:
    """TEST 3: GET /api/admin/agents/{agent_id}/password - Get agent password (FIXED ENDPOINT)"""
    print("=" * 80)
    print(f"TEST 3: GET /api/admin/agents/{agent_id}/password - Get Agent Password (FIXED)")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/agents/{agent_id}/password",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            password = data.get("password")
            if password:
                log_test("GET /api/admin/agents/{agent_id}/password", True, 
                        f"Password retrieved: {password}")
                return password
            else:
                log_test("GET /api/admin/agents/{agent_id}/password", False, 
                        "No password in response")
                return None
        elif response.status_code == 404:
            log_test("GET /api/admin/agents/{agent_id}/password", False, 
                    f"Agent not found (404)")
            return None
        else:
            log_test("GET /api/admin/agents/{agent_id}/password", False, 
                    f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/admin/agents/{agent_id}/password", False, f"Exception: {str(e)}")
        return None


def test_4_agent_login(username: str, password: str) -> Optional[str]:
    """TEST 4: POST /api/agent/login - Agent login with credentials"""
    print("=" * 80)
    print(f"TEST 4: POST /api/agent/login - Agent Login (username: {username})")
    print("=" * 80)
    
    try:
        response = requests.post(
            f"{API_BASE}/agent/login",
            json={"username": username, "password": password},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            agent = data.get("agent")
            if token and agent:
                log_test("POST /api/agent/login", True, 
                        f"Agent token received: {token[:20]}..., agent_id: {agent.get('id')}")
                return token
            else:
                log_test("POST /api/agent/login", False, "Missing token or agent in response")
                return None
        elif response.status_code == 401:
            log_test("POST /api/agent/login", False, "Invalid credentials (401)")
            return None
        else:
            log_test("POST /api/agent/login", False, 
                    f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("POST /api/agent/login", False, f"Exception: {str(e)}")
        return None


def test_5_agent_my_clients(agent_token: str) -> Optional[list]:
    """TEST 5: GET /api/agent/my-clients - Get agent's clients with Uniswap fields"""
    print("=" * 80)
    print("TEST 5: GET /api/agent/my-clients - Get Agent's Clients")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/agent/my-clients",
            headers={"Authorization": f"Bearer {agent_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            clients = response.json()
            if isinstance(clients, list):
                # Check for Uniswap fields in response
                has_uniswap_fields = True
                missing_fields = []
                
                if len(clients) > 0:
                    first_client = clients[0]
                    required_fields = [
                        "uniswap_account_created",
                        "uniswap_username",
                        "uniswap_account_created_at"
                    ]
                    
                    for field in required_fields:
                        if field not in first_client:
                            has_uniswap_fields = False
                            missing_fields.append(field)
                    
                    if has_uniswap_fields:
                        log_test("GET /api/agent/my-clients - Uniswap fields present", True,
                                f"Retrieved {len(clients)} clients with all Uniswap fields")
                        # Show first client details
                        print(f"  First client: {first_client.get('first_name')} {first_client.get('last_name')}")
                        print(f"    - uniswap_account_created: {first_client.get('uniswap_account_created')}")
                        print(f"    - uniswap_username: {first_client.get('uniswap_username')}")
                        print(f"    - uniswap_account_created_at: {first_client.get('uniswap_account_created_at')}")
                    else:
                        log_test("GET /api/agent/my-clients - Uniswap fields present", False,
                                f"Missing fields: {', '.join(missing_fields)}")
                else:
                    log_test("GET /api/agent/my-clients", True, 
                            "No clients assigned to agent (empty list is valid)")
                
                return clients
            else:
                log_test("GET /api/agent/my-clients", False, "Response is not a list")
                return None
        elif response.status_code == 403:
            log_test("GET /api/agent/my-clients", False, "Forbidden (403) - auth error")
            return None
        else:
            log_test("GET /api/agent/my-clients", False, 
                    f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/agent/my-clients", False, f"Exception: {str(e)}")
        return None


def test_6_mark_fee_paid(admin_token: str, trace_id: str) -> bool:
    """TEST 6: POST /api/admin/traces/{trace_id}/mark-fee-paid - Mark fee as paid"""
    print("=" * 80)
    print(f"TEST 6: POST /api/admin/traces/{trace_id}/mark-fee-paid - Mark Fee Paid")
    print("=" * 80)
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/traces/{trace_id}/mark-fee-paid",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("fee_paid") == True:
                log_test("POST /api/admin/traces/{trace_id}/mark-fee-paid", True,
                        f"Fee marked as paid at {data.get('fee_paid_at')}")
                return True
            else:
                log_test("POST /api/admin/traces/{trace_id}/mark-fee-paid", False,
                        "fee_paid not set to true in response")
                return False
        elif response.status_code == 404:
            log_test("POST /api/admin/traces/{trace_id}/mark-fee-paid", False,
                    "Trace not found (404)")
            return False
        else:
            log_test("POST /api/admin/traces/{trace_id}/mark-fee-paid", False,
                    f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("POST /api/admin/traces/{trace_id}/mark-fee-paid", False, f"Exception: {str(e)}")
        return False


def test_7_create_uniswap_account(agent_token: str, trace_id: str) -> Dict[str, Any]:
    """TEST 7: POST /api/agent/traces/{trace_id}/create-uniswap-account - Create Uniswap account"""
    print("=" * 80)
    print(f"TEST 7: POST /api/agent/traces/{trace_id}/create-uniswap-account - Create Uniswap Account")
    print("=" * 80)
    
    try:
        # Use test data as specified in review request
        body = {
            "username": "testuser123",
            "password": "testpass123",
            "eur_amount": "5000.00",
            "total_fees": "500.00",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31"
        }
        
        response = requests.post(
            f"{API_BASE}/agent/traces/{trace_id}/create-uniswap-account",
            headers={"Authorization": f"Bearer {agent_token}"},
            json=body,
            timeout=20
        )
        
        # According to review request:
        # - 200/201 (success) OR 502 (external uniswapv4.com unreachable) are ACCEPTABLE
        # - NOT 404 (endpoint missing) or 403 (auth error) or 400 (validation error)
        
        if response.status_code in (200, 201):
            data = response.json()
            log_test("POST /api/agent/traces/{trace_id}/create-uniswap-account", True,
                    f"SUCCESS (200/201): {data.get('message', 'Account created')}")
            return {"status": "success", "code": response.status_code, "data": data}
        elif response.status_code == 502:
            # 502 is acceptable - external service unreachable
            log_test("POST /api/agent/traces/{trace_id}/create-uniswap-account", True,
                    f"ACCEPTABLE (502): External uniswapv4.com unreachable - {response.text[:200]}")
            return {"status": "acceptable_502", "code": 502, "message": response.text[:200]}
        elif response.status_code == 404:
            log_test("POST /api/agent/traces/{trace_id}/create-uniswap-account", False,
                    "FAIL (404): Endpoint missing or trace not found")
            return {"status": "fail", "code": 404, "message": response.text[:200]}
        elif response.status_code == 403:
            log_test("POST /api/agent/traces/{trace_id}/create-uniswap-account", False,
                    "FAIL (403): Auth error")
            return {"status": "fail", "code": 403, "message": response.text[:200]}
        elif response.status_code == 400:
            log_test("POST /api/agent/traces/{trace_id}/create-uniswap-account", False,
                    f"FAIL (400): Validation error - {response.text[:200]}")
            return {"status": "fail", "code": 400, "message": response.text[:200]}
        elif response.status_code == 409:
            # 409 Conflict - account already exists (this is for double-creation test)
            log_test("POST /api/agent/traces/{trace_id}/create-uniswap-account", True,
                    f"EXPECTED (409): Account already exists - {response.text[:200]}")
            return {"status": "conflict", "code": 409, "message": response.text[:200]}
        else:
            log_test("POST /api/agent/traces/{trace_id}/create-uniswap-account", False,
                    f"UNEXPECTED Status {response.status_code}: {response.text[:200]}")
            return {"status": "unexpected", "code": response.status_code, "message": response.text[:200]}
    except Exception as e:
        log_test("POST /api/agent/traces/{trace_id}/create-uniswap-account", False, 
                f"Exception: {str(e)}")
        return {"status": "exception", "message": str(e)}


def test_8_verify_uniswap_created(admin_token: str, trace_id: str) -> bool:
    """TEST 8: GET /api/admin/traces - Verify trace has uniswap_account_created=true"""
    print("=" * 80)
    print(f"TEST 8: Verify trace {trace_id} has uniswap_account_created=true")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/traces",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            traces = response.json()
            target_trace = None
            for trace in traces:
                if trace.get("id") == trace_id:
                    target_trace = trace
                    break
            
            if target_trace:
                uniswap_created = target_trace.get("uniswap_account_created", False)
                if uniswap_created:
                    log_test("Verify uniswap_account_created=true", True,
                            f"Trace has uniswap_account_created=true, username={target_trace.get('uniswap_username')}")
                    return True
                else:
                    log_test("Verify uniswap_account_created=true", False,
                            "Trace has uniswap_account_created=false")
                    return False
            else:
                log_test("Verify uniswap_account_created=true", False,
                        f"Trace {trace_id} not found in traces list")
                return False
        else:
            log_test("Verify uniswap_account_created=true", False,
                    f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Verify uniswap_account_created=true", False, f"Exception: {str(e)}")
        return False


def test_9_double_creation_prevention(agent_token: str, trace_id: str) -> bool:
    """TEST 9: Try creating Uniswap account again - expect 409 Conflict"""
    print("=" * 80)
    print(f"TEST 9: Double-creation prevention - Try creating account again")
    print("=" * 80)
    
    try:
        body = {
            "username": "testuser123",
            "password": "testpass123",
            "eur_amount": "5000.00",
            "total_fees": "500.00",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31"
        }
        
        response = requests.post(
            f"{API_BASE}/agent/traces/{trace_id}/create-uniswap-account",
            headers={"Authorization": f"Bearer {agent_token}"},
            json=body,
            timeout=20
        )
        
        if response.status_code == 409:
            log_test("Double-creation prevention (expect 409)", True,
                    f"Correctly returned 409 Conflict: {response.text[:200]}")
            return True
        else:
            log_test("Double-creation prevention (expect 409)", False,
                    f"Expected 409, got {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Double-creation prevention (expect 409)", False, f"Exception: {str(e)}")
        return False


def get_trace_with_fee_not_paid(admin_token: str) -> Optional[str]:
    """Helper: Get a trace that doesn't have fee_paid=true"""
    try:
        response = requests.get(
            f"{API_BASE}/admin/traces",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            traces = response.json()
            for trace in traces:
                if not trace.get("fee_paid", False):
                    print(f"Found trace without fee_paid: {trace.get('id')}")
                    return trace.get("id")
            print("No traces found without fee_paid=true")
            return None
        else:
            print(f"Failed to get traces: {response.status_code}")
            return None
    except Exception as e:
        print(f"Exception getting traces: {e}")
        return None


def main():
    """Main test execution"""
    print("\n" + "=" * 80)
    print("AGENT PORTAL UNISWAP V4 FEATURE TESTING")
    print("Testing after fix: @api.get('/admin/agents/{agent_id}/password') decorator added")
    print("=" * 80 + "\n")
    
    # TEST 1: Admin login
    admin_token = test_1_admin_login()
    if not admin_token:
        print("\n❌ CRITICAL: Admin login failed. Cannot continue tests.")
        sys.exit(1)
    
    # TEST 2: Get agents list
    agents = test_2_get_agents(admin_token)
    if not agents or len(agents) == 0:
        print("\n⚠️ WARNING: No agents found. Creating test agent or using existing one.")
        # For now, we'll continue with what we have
    
    # Select first agent for testing
    agent_id = None
    agent_username = None
    agent_password = None
    
    if agents and len(agents) > 0:
        agent_id = agents[0].get("id")
        agent_username = agents[0].get("username")
        
        # TEST 3: Get agent password (FIXED ENDPOINT)
        agent_password = test_3_get_agent_password(admin_token, agent_id)
        
        if not agent_password:
            print("\n❌ CRITICAL: Could not retrieve agent password. Cannot continue agent tests.")
            print_summary()
            sys.exit(1)
    else:
        print("\n❌ CRITICAL: No agents available for testing.")
        print_summary()
        sys.exit(1)
    
    # TEST 4: Agent login
    agent_token = test_4_agent_login(agent_username, agent_password)
    if not agent_token:
        print("\n❌ CRITICAL: Agent login failed. Cannot continue agent tests.")
        print_summary()
        sys.exit(1)
    
    # TEST 5: Get agent's clients (check for Uniswap fields)
    clients = test_5_agent_my_clients(agent_token)
    
    # Find a trace to test Uniswap account creation
    trace_id = None
    if clients and len(clients) > 0:
        # Find a client with a trace that doesn't have Uniswap account yet
        for client in clients:
            if client.get("trace_id") and not client.get("uniswap_account_created"):
                trace_id = client.get("trace_id")
                print(f"\nFound trace for Uniswap testing: {trace_id}")
                break
    
    if not trace_id:
        # Get any trace without fee_paid
        print("\nNo suitable trace found in agent's clients. Looking for any trace...")
        trace_id = get_trace_with_fee_not_paid(admin_token)
    
    if not trace_id:
        print("\n⚠️ WARNING: No suitable trace found for Uniswap account creation test.")
        print("Skipping tests 6-9 (Uniswap account creation tests)")
        print_summary()
        return
    
    # TEST 6: Mark fee as paid (prerequisite for Uniswap account creation)
    fee_marked = test_6_mark_fee_paid(admin_token, trace_id)
    if not fee_marked:
        print("\n⚠️ WARNING: Could not mark fee as paid. Uniswap creation may fail.")
    
    # TEST 7: Create Uniswap account
    create_result = test_7_create_uniswap_account(agent_token, trace_id)
    
    # TEST 8: Verify account was created (only if TEST 7 succeeded)
    if create_result.get("status") == "success":
        test_8_verify_uniswap_created(admin_token, trace_id)
        
        # TEST 9: Double-creation prevention
        test_9_double_creation_prevention(agent_token, trace_id)
    elif create_result.get("status") == "acceptable_502":
        print("\n⚠️ NOTE: Uniswap account creation returned 502 (external service unreachable).")
        print("This is ACCEPTABLE per review request. Skipping verification tests.")
    else:
        print("\n⚠️ WARNING: Uniswap account creation failed. Skipping verification tests.")
    
    # Print summary
    print_summary()


def print_summary():
    """Print test summary"""
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for r in test_results if r["passed"])
    failed = sum(1 for r in test_results if not r["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {(passed/total*100) if total > 0 else 0:.1f}%\n")
    
    if failed > 0:
        print("Failed Tests:")
        for r in test_results:
            if not r["passed"]:
                print(f"  ❌ {r['test']}")
                if r["details"]:
                    print(f"     {r['details']}")
        print()
    
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
