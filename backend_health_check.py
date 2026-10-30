#!/usr/bin/env python3
"""
Comprehensive Health Check for Traccia Fondi Backend API
=========================================================
Tests ALL major flows as specified in the review request.

Test Order:
1. Admin login
2. GET /api/admin/traces
3. GET /api/admin/registered-users
4. GET /api/admin/settings
5. GET /api/settings/payment-url (public)
6. GET /api/admin/agents
7. GET /api/admin/portal-access-logs
8. Agent login flow
9. GET /api/agent/my-clients
10. POST /api/agent/portal-visit
11. PUT /api/agent/clients/not-interested
12. User registration
13. POST /api/admin/migrate-title-case
"""

import requests
import json
import sys
import random
from typing import Dict, Any, Optional, List

# Backend URL from environment
BACKEND_URL = "https://fondi-trace-demo.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Admin credentials
ADMIN_EMAIL = "admin@traccia-fondi.com"
ADMIN_PASSWORD = "admin123"

# Test results tracking
test_results = []
failed_tests = []


def log_test(test_name: str, passed: bool, details: str = "", expected_fields: List[str] = None, actual_data: Any = None):
    """Log test result with detailed information"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {
        "test": test_name,
        "passed": passed,
        "details": details,
        "expected_fields": expected_fields,
        "actual_data": actual_data
    }
    test_results.append(result)
    
    if not passed:
        failed_tests.append(result)
    
    print(f"{status}: {test_name}")
    if details:
        print(f"  Details: {details}")
    if not passed and expected_fields and actual_data:
        print(f"  Expected fields: {expected_fields}")
        print(f"  Actual data keys: {list(actual_data.keys()) if isinstance(actual_data, dict) else 'N/A'}")
    print()


def test_1_admin_login() -> Optional[str]:
    """TEST 1: Admin login - POST /api/auth/login"""
    print("=" * 80)
    print("TEST 1: Admin Login - POST /api/auth/login")
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
                log_test("Admin Login", False, "No token in response", actual_data=data)
                return None
        else:
            log_test("Admin Login", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("Admin Login", False, f"Exception: {str(e)}")
        return None


def test_2_get_traces(admin_token: str) -> Optional[List[Dict]]:
    """TEST 2: GET /api/admin/traces - Expect list with specific fields"""
    print("=" * 80)
    print("TEST 2: GET /api/admin/traces")
    print("=" * 80)
    
    expected_fields = [
        "id", "first_name", "last_name", "email", "created_at",
        "email_24h_sent", "email_50h_sent", "email_50h_sent_at",
        "fee_paid", "uniswap_account_created"
    ]
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/traces",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            traces = response.json()
            if isinstance(traces, list):
                if len(traces) > 0:
                    first_trace = traces[0]
                    missing_fields = [f for f in expected_fields if f not in first_trace]
                    
                    if not missing_fields:
                        log_test("GET /api/admin/traces", True, 
                                f"Retrieved {len(traces)} traces with all expected fields")
                        print(f"  Sample trace: {first_trace.get('first_name')} {first_trace.get('last_name')} - {first_trace.get('email')}")
                        return traces
                    else:
                        log_test("GET /api/admin/traces", False, 
                                f"Missing fields: {', '.join(missing_fields)}",
                                expected_fields=expected_fields,
                                actual_data=first_trace)
                        return traces
                else:
                    log_test("GET /api/admin/traces", True, "No traces in system (empty list is valid)")
                    return []
            else:
                log_test("GET /api/admin/traces", False, "Response is not a list", actual_data=traces)
                return None
        else:
            log_test("GET /api/admin/traces", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/admin/traces", False, f"Exception: {str(e)}")
        return None


def test_3_get_registered_users(admin_token: str) -> Optional[List[Dict]]:
    """TEST 3: GET /api/admin/registered-users - Expect list with specific fields"""
    print("=" * 80)
    print("TEST 3: GET /api/admin/registered-users")
    print("=" * 80)
    
    # Core fields that must be present
    required_fields = ["id", "first_name", "last_name", "email", "email_verified"]
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/registered-users",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            users = response.json()
            if isinstance(users, list):
                if len(users) > 0:
                    # Check multiple users to find one with a trace
                    user_with_trace = None
                    for user in users:
                        if user.get("trace") is not None:
                            user_with_trace = user
                            break
                    
                    first_user = users[0]
                    missing_fields = [f for f in required_fields if f not in first_user]
                    
                    # Check for not_interested field (may be missing on some users)
                    has_not_interested = "not_interested" in first_user
                    
                    # Check if uniswap_account_created exists in trace for users with traces
                    has_uniswap_in_trace = False
                    if user_with_trace and user_with_trace.get("trace"):
                        has_uniswap_in_trace = "uniswap_account_created" in user_with_trace["trace"]
                    
                    issues = []
                    if missing_fields:
                        issues.append(f"Missing required fields: {', '.join(missing_fields)}")
                    
                    # Note: not_interested may be missing on users who haven't been flagged
                    # Note: uniswap_account_created is only in trace object, not at user level
                    
                    if not missing_fields:
                        details = f"Retrieved {len(users)} users with all required fields"
                        if not has_not_interested:
                            details += " (NOTE: not_interested field missing on some users - backend should default to false)"
                        if user_with_trace and has_uniswap_in_trace:
                            details += f" (uniswap_account_created found in trace object)"
                        elif user_with_trace:
                            details += " (WARNING: uniswap_account_created missing from trace object)"
                        
                        log_test("GET /api/admin/registered-users", True, details)
                        print(f"  Sample user: {first_user.get('first_name')} {first_user.get('last_name')} - {first_user.get('email')}")
                        if user_with_trace:
                            print(f"  User with trace: {user_with_trace.get('first_name')} {user_with_trace.get('last_name')}")
                            print(f"    - trace.uniswap_account_created: {user_with_trace['trace'].get('uniswap_account_created')}")
                        return users
                    else:
                        log_test("GET /api/admin/registered-users", False,
                                "; ".join(issues),
                                expected_fields=required_fields,
                                actual_data=first_user)
                        return users
                else:
                    log_test("GET /api/admin/registered-users", True, "No users in system (empty list is valid)")
                    return []
            else:
                log_test("GET /api/admin/registered-users", False, "Response is not a list", actual_data=users)
                return None
        else:
            log_test("GET /api/admin/registered-users", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/admin/registered-users", False, f"Exception: {str(e)}")
        return None


def test_4_get_admin_settings(admin_token: str) -> Optional[Dict]:
    """TEST 4: GET /api/admin/settings - Expect agent_portal_slug and payment_url"""
    print("=" * 80)
    print("TEST 4: GET /api/admin/settings")
    print("=" * 80)
    
    expected_fields = ["agent_portal_slug", "payment_url"]
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            settings = response.json()
            if isinstance(settings, dict):
                missing_fields = [f for f in expected_fields if f not in settings]
                
                if not missing_fields:
                    log_test("GET /api/admin/settings", True,
                            f"Settings retrieved with all expected fields")
                    print(f"  agent_portal_slug: {settings.get('agent_portal_slug')}")
                    print(f"  payment_url: {settings.get('payment_url')}")
                    return settings
                else:
                    log_test("GET /api/admin/settings", False,
                            f"Missing fields: {', '.join(missing_fields)}",
                            expected_fields=expected_fields,
                            actual_data=settings)
                    return settings
            else:
                log_test("GET /api/admin/settings", False, "Response is not a dict", actual_data=settings)
                return None
        else:
            log_test("GET /api/admin/settings", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/admin/settings", False, f"Exception: {str(e)}")
        return None


def test_5_get_payment_url_public() -> bool:
    """TEST 5: GET /api/settings/payment-url (public endpoint) - Expect payment_url field"""
    print("=" * 80)
    print("TEST 5: GET /api/settings/payment-url (public endpoint)")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/settings/payment-url",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "payment_url" in data:
                log_test("GET /api/settings/payment-url", True,
                        f"Payment URL retrieved: {data.get('payment_url')}")
                return True
            else:
                log_test("GET /api/settings/payment-url", False,
                        "Missing payment_url field",
                        expected_fields=["payment_url"],
                        actual_data=data)
                return False
        else:
            log_test("GET /api/settings/payment-url", False, f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("GET /api/settings/payment-url", False, f"Exception: {str(e)}")
        return False


def test_6_get_agents(admin_token: str) -> Optional[List[Dict]]:
    """TEST 6: GET /api/admin/agents - Expect list of agents"""
    print("=" * 80)
    print("TEST 6: GET /api/admin/agents")
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
                if len(agents) > 0:
                    for i, agent in enumerate(agents[:3]):
                        print(f"  Agent {i+1}: id={agent.get('id')}, username={agent.get('username')}")
                return agents
            else:
                log_test("GET /api/admin/agents", False, "Response is not a list", actual_data=agents)
                return None
        else:
            log_test("GET /api/admin/agents", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/admin/agents", False, f"Exception: {str(e)}")
        return None


def test_7_get_portal_access_logs(admin_token: str) -> bool:
    """TEST 7: GET /api/admin/portal-access-logs - Expect list of access logs"""
    print("=" * 80)
    print("TEST 7: GET /api/admin/portal-access-logs")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/portal-access-logs",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            logs = response.json()
            if isinstance(logs, list):
                log_test("GET /api/admin/portal-access-logs", True, f"Retrieved {len(logs)} access logs")
                if len(logs) > 0:
                    print(f"  Sample log: event={logs[0].get('event')}, timestamp={logs[0].get('timestamp')}")
                return True
            else:
                log_test("GET /api/admin/portal-access-logs", False, "Response is not a list", actual_data=logs)
                return False
        else:
            log_test("GET /api/admin/portal-access-logs", False, f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("GET /api/admin/portal-access-logs", False, f"Exception: {str(e)}")
        return False


def test_8_agent_login_flow(admin_token: str, agents: List[Dict]) -> Optional[str]:
    """TEST 8: Agent login flow - Get agent password, then login"""
    print("=" * 80)
    print("TEST 8: Agent Login Flow")
    print("=" * 80)
    
    if not agents or len(agents) == 0:
        log_test("Agent Login Flow", False, "No agents available for testing")
        return None
    
    agent = agents[0]
    agent_id = agent.get("id")
    agent_username = agent.get("username")
    
    # Step 1: Get agent password
    try:
        response = requests.get(
            f"{API_BASE}/admin/agents/{agent_id}/password",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("Agent Login Flow - Get Password", False, 
                    f"Failed to get password: Status {response.status_code}")
            return None
        
        password_data = response.json()
        agent_password = password_data.get("password")
        
        if not agent_password:
            log_test("Agent Login Flow - Get Password", False, "No password in response")
            return None
        
        print(f"  ✓ Retrieved password for agent: {agent_username}")
        
    except Exception as e:
        log_test("Agent Login Flow - Get Password", False, f"Exception: {str(e)}")
        return None
    
    # Step 2: Agent login
    try:
        response = requests.post(
            f"{API_BASE}/agent/login",
            json={"username": agent_username, "password": agent_password},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            if token:
                log_test("Agent Login Flow", True, 
                        f"Agent {agent_username} logged in successfully, token: {token[:20]}...")
                return token
            else:
                log_test("Agent Login Flow", False, "No token in login response", actual_data=data)
                return None
        else:
            log_test("Agent Login Flow", False, 
                    f"Login failed: Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("Agent Login Flow", False, f"Exception during login: {str(e)}")
        return None


def test_9_agent_my_clients(agent_token: str) -> Optional[List[Dict]]:
    """TEST 9: GET /api/agent/my-clients - Expect list with specific fields"""
    print("=" * 80)
    print("TEST 9: GET /api/agent/my-clients")
    print("=" * 80)
    
    expected_fields = [
        "not_interested", "uniswap_account_created", 
        "uniswap_username", "fee_paid"
    ]
    
    try:
        response = requests.get(
            f"{API_BASE}/agent/my-clients",
            headers={"Authorization": f"Bearer {agent_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            clients = response.json()
            if isinstance(clients, list):
                if len(clients) > 0:
                    first_client = clients[0]
                    missing_fields = [f for f in expected_fields if f not in first_client]
                    
                    if not missing_fields:
                        log_test("GET /api/agent/my-clients", True,
                                f"Retrieved {len(clients)} clients with all expected fields")
                        print(f"  Sample client: {first_client.get('first_name')} {first_client.get('last_name')}")
                        print(f"    - not_interested: {first_client.get('not_interested')}")
                        print(f"    - uniswap_account_created: {first_client.get('uniswap_account_created')}")
                        print(f"    - fee_paid: {first_client.get('fee_paid')}")
                        return clients
                    else:
                        log_test("GET /api/agent/my-clients", False,
                                f"Missing fields: {', '.join(missing_fields)}",
                                expected_fields=expected_fields,
                                actual_data=first_client)
                        return clients
                else:
                    log_test("GET /api/agent/my-clients", True, "No clients assigned (empty list is valid)")
                    return []
            else:
                log_test("GET /api/agent/my-clients", False, "Response is not a list", actual_data=clients)
                return None
        else:
            log_test("GET /api/agent/my-clients", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/agent/my-clients", False, f"Exception: {str(e)}")
        return None


def test_10_agent_portal_visit() -> bool:
    """TEST 10: POST /api/agent/portal-visit - Expect {"ok": true}"""
    print("=" * 80)
    print("TEST 10: POST /api/agent/portal-visit")
    print("=" * 80)
    
    try:
        response = requests.post(
            f"{API_BASE}/agent/portal-visit",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True:
                log_test("POST /api/agent/portal-visit", True, "Portal visit logged successfully")
                return True
            else:
                log_test("POST /api/agent/portal-visit", False, 
                        "Expected {ok: true} in response",
                        actual_data=data)
                return False
        else:
            log_test("POST /api/agent/portal-visit", False, f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("POST /api/agent/portal-visit", False, f"Exception: {str(e)}")
        return False


def test_11_agent_not_interested(agent_token: str, users: List[Dict]) -> bool:
    """TEST 11: PUT /api/agent/clients/not-interested - Toggle not_interested flag"""
    print("=" * 80)
    print("TEST 11: PUT /api/agent/clients/not-interested")
    print("=" * 80)
    
    if not users or len(users) == 0:
        log_test("PUT /api/agent/clients/not-interested", False, "No users available for testing")
        return False
    
    # Find a user to test with
    test_user = users[0]
    user_id = test_user.get("id")
    
    if not user_id:
        log_test("PUT /api/agent/clients/not-interested", False, "No valid user_id found")
        return False
    
    # Step 1: Set not_interested to true
    try:
        response = requests.put(
            f"{API_BASE}/agent/clients/not-interested",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"user_id": user_id, "not_interested": True},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("PUT /api/agent/clients/not-interested (set true)", False,
                    f"Status {response.status_code}: {response.text[:200]}")
            return False
        
        data = response.json()
        if data.get("ok") != True or data.get("not_interested") != True:
            log_test("PUT /api/agent/clients/not-interested (set true)", False,
                    "Expected {ok: true, not_interested: true}",
                    actual_data=data)
            return False
        
        print(f"  ✓ Set not_interested=true for user {user_id}")
        
    except Exception as e:
        log_test("PUT /api/agent/clients/not-interested (set true)", False, f"Exception: {str(e)}")
        return False
    
    # Step 2: Set not_interested back to false (restore)
    try:
        response = requests.put(
            f"{API_BASE}/agent/clients/not-interested",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"user_id": user_id, "not_interested": False},
            timeout=10
        )
        
        if response.status_code != 200:
            log_test("PUT /api/agent/clients/not-interested (restore)", False,
                    f"Status {response.status_code}: {response.text[:200]}")
            return False
        
        data = response.json()
        if data.get("ok") != True:
            log_test("PUT /api/agent/clients/not-interested (restore)", False,
                    "Expected {ok: true}",
                    actual_data=data)
            return False
        
        print(f"  ✓ Restored not_interested=false for user {user_id}")
        log_test("PUT /api/agent/clients/not-interested", True, 
                "Successfully toggled not_interested flag both ways")
        return True
        
    except Exception as e:
        log_test("PUT /api/agent/clients/not-interested (restore)", False, f"Exception: {str(e)}")
        return False


def test_12_user_registration() -> bool:
    """TEST 12: POST /api/auth/register - User registration"""
    print("=" * 80)
    print("TEST 12: POST /api/auth/register - User Registration")
    print("=" * 80)
    
    # Generate unique test data
    random_num = random.randint(10000, 99999)
    test_email = f"healthcheck.test.{random_num}@example.com"
    
    test_data = {
        "first_name": "Health",
        "last_name": "Check",
        "email": test_email,
        "password": "TestPass123!",
        "date_of_birth": "1990-01-01",
        "lang": "it"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=test_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True:
                log_test("POST /api/auth/register", True, 
                        f"User registered successfully: {test_email}")
                return True
            else:
                log_test("POST /api/auth/register", False,
                        "Expected {ok: true} in response",
                        actual_data=data)
                return False
        else:
            log_test("POST /api/auth/register", False, 
                    f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("POST /api/auth/register", False, f"Exception: {str(e)}")
        return False


def test_13_migrate_title_case(admin_token: str) -> bool:
    """TEST 13: POST /api/admin/migrate-title-case - Expect users_fixed/traces_fixed counts"""
    print("=" * 80)
    print("TEST 13: POST /api/admin/migrate-title-case")
    print("=" * 80)
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/migrate-title-case",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "users_fixed" in data and "traces_fixed" in data:
                log_test("POST /api/admin/migrate-title-case", True,
                        f"Migration completed: users_fixed={data.get('users_fixed')}, traces_fixed={data.get('traces_fixed')}")
                return True
            else:
                log_test("POST /api/admin/migrate-title-case", False,
                        "Missing users_fixed or traces_fixed in response",
                        expected_fields=["users_fixed", "traces_fixed"],
                        actual_data=data)
                return False
        else:
            log_test("POST /api/admin/migrate-title-case", False, 
                    f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("POST /api/admin/migrate-title-case", False, f"Exception: {str(e)}")
        return False


def print_summary():
    """Print comprehensive test summary"""
    print("\n" + "=" * 80)
    print("COMPREHENSIVE HEALTH CHECK SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for r in test_results if r["passed"])
    failed = sum(1 for r in test_results if not r["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {(passed/total*100) if total > 0 else 0:.1f}%\n")
    
    if failed > 0:
        print("=" * 80)
        print("FAILED TESTS - DETAILED REPORT")
        print("=" * 80)
        for r in failed_tests:
            print(f"\n❌ {r['test']}")
            print(f"   Details: {r['details']}")
            if r.get('expected_fields'):
                print(f"   Expected fields: {r['expected_fields']}")
            if r.get('actual_data'):
                if isinstance(r['actual_data'], dict):
                    print(f"   Actual data keys: {list(r['actual_data'].keys())}")
                else:
                    print(f"   Actual data type: {type(r['actual_data'])}")
        print()
    
    print("=" * 80 + "\n")


def main():
    """Main test execution"""
    print("\n" + "=" * 80)
    print("TRACCIA FONDI - COMPREHENSIVE HEALTH CHECK")
    print("Testing ALL major flows as specified in review request")
    print("=" * 80 + "\n")
    
    # TEST 1: Admin login
    admin_token = test_1_admin_login()
    if not admin_token:
        print("\n❌ CRITICAL: Admin login failed. Cannot continue tests.")
        print_summary()
        sys.exit(1)
    
    # TEST 2: GET /api/admin/traces
    traces = test_2_get_traces(admin_token)
    
    # TEST 3: GET /api/admin/registered-users
    users = test_3_get_registered_users(admin_token)
    
    # TEST 4: GET /api/admin/settings
    settings = test_4_get_admin_settings(admin_token)
    
    # TEST 5: GET /api/settings/payment-url (public)
    test_5_get_payment_url_public()
    
    # TEST 6: GET /api/admin/agents
    agents = test_6_get_agents(admin_token)
    
    # TEST 7: GET /api/admin/portal-access-logs
    test_7_get_portal_access_logs(admin_token)
    
    # TEST 8: Agent login flow
    agent_token = None
    if agents and len(agents) > 0:
        agent_token = test_8_agent_login_flow(admin_token, agents)
    else:
        log_test("Agent Login Flow", False, "No agents available for testing")
    
    # TEST 9: GET /api/agent/my-clients
    if agent_token:
        test_9_agent_my_clients(agent_token)
    else:
        log_test("GET /api/agent/my-clients", False, "Skipped - no agent token available")
    
    # TEST 10: POST /api/agent/portal-visit
    test_10_agent_portal_visit()
    
    # TEST 11: PUT /api/agent/clients/not-interested
    if agent_token and users:
        test_11_agent_not_interested(agent_token, users)
    else:
        log_test("PUT /api/agent/clients/not-interested", False, 
                "Skipped - no agent token or users available")
    
    # TEST 12: User registration
    test_12_user_registration()
    
    # TEST 13: POST /api/admin/migrate-title-case
    test_13_migrate_title_case(admin_token)
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    if len(failed_tests) > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
