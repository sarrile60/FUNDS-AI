#!/usr/bin/env python3
"""
Backend API Testing for Traccia Fondi - "Not Interested" Feature (COMPLETE)
===========================================================================
Tests the "Not Interested" feature using an existing user.
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
    """TEST 1: Admin login"""
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
                log_test("Admin Login", True, f"Token received")
                return token
            else:
                log_test("Admin Login", False, "No token in response")
                return None
        else:
            log_test("Admin Login", False, f"Status {response.status_code}")
            return None
    except Exception as e:
        log_test("Admin Login", False, f"Exception: {str(e)}")
        return None


def test_2_get_agents(admin_token: str) -> Optional[list]:
    """TEST 2: Get agents"""
    print("=" * 80)
    print("TEST 2: GET /api/admin/agents")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/agents",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            agents = response.json()
            if isinstance(agents, list) and len(agents) > 0:
                log_test("GET /api/admin/agents", True, f"Retrieved {len(agents)} agents")
                return agents
            else:
                log_test("GET /api/admin/agents", False, "No agents found")
                return None
        else:
            log_test("GET /api/admin/agents", False, f"Status {response.status_code}")
            return None
    except Exception as e:
        log_test("GET /api/admin/agents", False, f"Exception: {str(e)}")
        return None


def test_3_get_registered_users(admin_token: str) -> Optional[Dict[str, Any]]:
    """TEST 3: Get a registered user without assigned agent"""
    print("=" * 80)
    print("TEST 3: GET /api/admin/registered-users - Find Test User")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/registered-users",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            users = response.json()
            # Find a user without assigned agent and with user_id (not ghost)
            for user in users:
                if not user.get("assigned_agent_id") and user.get("id") and not user.get("id").startswith("ghost_"):
                    log_test("Find Test User", True, 
                            f"Found user: {user.get('first_name')} {user.get('last_name')}, "
                            f"email={user.get('email')}, user_id={user.get('id')}")
                    return user
            
            log_test("Find Test User", False, "No suitable user found (all have assigned agents or are ghosts)")
            return None
        else:
            log_test("Find Test User", False, f"Status {response.status_code}")
            return None
    except Exception as e:
        log_test("Find Test User", False, f"Exception: {str(e)}")
        return None


def test_4_assign_agent(admin_token: str, user_id: str, agent_id: str) -> bool:
    """TEST 4: Assign agent to user"""
    print("=" * 80)
    print(f"TEST 4: PUT /api/admin/users/{user_id}/assign-agent")
    print("=" * 80)
    
    try:
        response = requests.put(
            f"{API_BASE}/admin/users/{user_id}/assign-agent",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"agent_id": agent_id},
            timeout=10
        )
        
        if response.status_code == 200:
            log_test("Assign Agent to User", True, "Agent assigned successfully")
            return True
        else:
            log_test("Assign Agent to User", False, f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Assign Agent to User", False, f"Exception: {str(e)}")
        return False


def test_5_get_agent_password(admin_token: str, agent_id: str) -> Optional[str]:
    """TEST 5: Get agent password"""
    print("=" * 80)
    print(f"TEST 5: GET /api/admin/agents/{agent_id}/password")
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
                log_test("GET agent password", True, f"Password: {password}")
                return password
            else:
                log_test("GET agent password", False, "No password in response")
                return None
        else:
            log_test("GET agent password", False, f"Status {response.status_code}")
            return None
    except Exception as e:
        log_test("GET agent password", False, f"Exception: {str(e)}")
        return None


def test_6_agent_login(username: str, password: str) -> Optional[str]:
    """TEST 6: Agent login"""
    print("=" * 80)
    print(f"TEST 6: POST /api/agent/login")
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
            if token:
                log_test("Agent login", True, f"Logged in as {username}")
                return token
            else:
                log_test("Agent login", False, "No token in response")
                return None
        else:
            log_test("Agent login", False, f"Status {response.status_code}")
            return None
    except Exception as e:
        log_test("Agent login", False, f"Exception: {str(e)}")
        return None


def test_7_get_my_clients(agent_token: str, expected_user_id: str) -> bool:
    """TEST 7: GET /api/agent/my-clients - Verify not_interested field exists"""
    print("=" * 80)
    print("TEST 7: GET /api/agent/my-clients - Verify not_interested field")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/agent/my-clients",
            headers={"Authorization": f"Bearer {agent_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            clients = response.json()
            # Find our test user
            test_client = None
            for client in clients:
                if client.get("user_id") == expected_user_id:
                    test_client = client
                    break
            
            if test_client:
                has_field = "not_interested" in test_client
                default_value = test_client.get("not_interested")
                
                if has_field:
                    log_test("GET /api/agent/my-clients - not_interested field exists", True, 
                            f"Field exists with default value: {default_value}")
                    return True
                else:
                    log_test("GET /api/agent/my-clients - not_interested field exists", False, 
                            "Field 'not_interested' missing")
                    return False
            else:
                log_test("GET /api/agent/my-clients - not_interested field exists", False, 
                        f"Test user not found in agent's clients")
                return False
        else:
            log_test("GET /api/agent/my-clients", False, f"Status {response.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/agent/my-clients", False, f"Exception: {str(e)}")
        return False


def test_8_mark_not_interested(agent_token: str, user_id: str) -> bool:
    """TEST 8: Mark client as not interested"""
    print("=" * 80)
    print(f"TEST 8: PUT /api/agent/clients/not-interested (mark=true)")
    print("=" * 80)
    
    try:
        response = requests.put(
            f"{API_BASE}/agent/clients/not-interested",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"user_id": user_id, "not_interested": True},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("not_interested") == True:
                log_test("Mark as not interested", True, f"Response: {data}")
                return True
            else:
                log_test("Mark as not interested", False, f"Unexpected response: {data}")
                return False
        else:
            log_test("Mark as not interested", False, f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Mark as not interested", False, f"Exception: {str(e)}")
        return False


def test_9_verify_true(agent_token: str, user_id: str) -> bool:
    """TEST 9: Verify not_interested=true"""
    print("=" * 80)
    print(f"TEST 9: Verify not_interested=true")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/agent/my-clients",
            headers={"Authorization": f"Bearer {agent_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            clients = response.json()
            for client in clients:
                if client.get("user_id") == user_id:
                    if client.get("not_interested") == True:
                        log_test("Verify not_interested=true", True, "Client has not_interested=true")
                        return True
                    else:
                        log_test("Verify not_interested=true", False, 
                                f"Expected true, got {client.get('not_interested')}")
                        return False
            
            log_test("Verify not_interested=true", False, "Client not found")
            return False
        else:
            log_test("Verify not_interested=true", False, f"Status {response.status_code}")
            return False
    except Exception as e:
        log_test("Verify not_interested=true", False, f"Exception: {str(e)}")
        return False


def test_10_unmark_not_interested(agent_token: str, user_id: str) -> bool:
    """TEST 10: Unmark client as not interested"""
    print("=" * 80)
    print(f"TEST 10: PUT /api/agent/clients/not-interested (mark=false)")
    print("=" * 80)
    
    try:
        response = requests.put(
            f"{API_BASE}/agent/clients/not-interested",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"user_id": user_id, "not_interested": False},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("not_interested") == False:
                log_test("Unmark as not interested", True, f"Response: {data}")
                return True
            else:
                log_test("Unmark as not interested", False, f"Unexpected response: {data}")
                return False
        else:
            log_test("Unmark as not interested", False, f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Unmark as not interested", False, f"Exception: {str(e)}")
        return False


def test_11_verify_false(agent_token: str, user_id: str) -> bool:
    """TEST 11: Verify not_interested=false"""
    print("=" * 80)
    print(f"TEST 11: Verify not_interested=false")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/agent/my-clients",
            headers={"Authorization": f"Bearer {agent_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            clients = response.json()
            for client in clients:
                if client.get("user_id") == user_id:
                    if client.get("not_interested") == False:
                        log_test("Verify not_interested=false", True, "Client has not_interested=false")
                        return True
                    else:
                        log_test("Verify not_interested=false", False, 
                                f"Expected false, got {client.get('not_interested')}")
                        return False
            
            log_test("Verify not_interested=false", False, "Client not found")
            return False
        else:
            log_test("Verify not_interested=false", False, f"Status {response.status_code}")
            return False
    except Exception as e:
        log_test("Verify not_interested=false", False, f"Exception: {str(e)}")
        return False


def test_12_error_no_params(agent_token: str) -> bool:
    """TEST 12: Error - 400 if no user_id or trace_id"""
    print("=" * 80)
    print("TEST 12: Error handling - 400 for missing params")
    print("=" * 80)
    
    try:
        response = requests.put(
            f"{API_BASE}/agent/clients/not-interested",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"not_interested": True},
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("Error 400 for missing params", True, "Correctly returned 400")
            return True
        else:
            log_test("Error 400 for missing params", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Error 400 for missing params", False, f"Exception: {str(e)}")
        return False


def test_13_error_not_found(agent_token: str) -> bool:
    """TEST 13: Error - 404 if user doesn't exist"""
    print("=" * 80)
    print("TEST 13: Error handling - 404 for non-existent user")
    print("=" * 80)
    
    try:
        response = requests.put(
            f"{API_BASE}/agent/clients/not-interested",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"user_id": "fake-user-id-12345", "not_interested": True},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("Error 404 for non-existent user", True, "Correctly returned 404")
            return True
        else:
            log_test("Error 404 for non-existent user", False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Error 404 for non-existent user", False, f"Exception: {str(e)}")
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 80)
    print("TRACCIA FONDI - NOT INTERESTED FEATURE - COMPLETE TEST")
    print("=" * 80 + "\n")
    
    # TEST 1: Admin login
    admin_token = test_1_admin_login()
    if not admin_token:
        print("\n❌ CRITICAL: Admin login failed")
        sys.exit(1)
    
    # TEST 2: Get agents
    agents = test_2_get_agents(admin_token)
    if not agents:
        print("\n❌ CRITICAL: No agents found")
        sys.exit(1)
    
    agent = agents[0]
    agent_id = agent.get("id")
    agent_username = agent.get("username")
    print(f"\n📋 Using agent: {agent_username}\n")
    
    # TEST 3: Get a test user
    test_user = test_3_get_registered_users(admin_token)
    if not test_user:
        print("\n❌ CRITICAL: No suitable test user found")
        sys.exit(1)
    
    test_user_id = test_user.get("id")
    print(f"\n📋 Using test user: {test_user.get('first_name')} {test_user.get('last_name')} (ID: {test_user_id})\n")
    
    # TEST 4: Assign agent to user
    if not test_4_assign_agent(admin_token, test_user_id, agent_id):
        print("\n❌ CRITICAL: Could not assign agent")
        sys.exit(1)
    
    # TEST 5: Get agent password
    agent_password = test_5_get_agent_password(admin_token, agent_id)
    if not agent_password:
        print("\n❌ CRITICAL: Could not get agent password")
        sys.exit(1)
    
    # TEST 6: Agent login
    agent_token = test_6_agent_login(agent_username, agent_password)
    if not agent_token:
        print("\n❌ CRITICAL: Agent login failed")
        sys.exit(1)
    
    # TEST 7: Verify not_interested field exists
    if not test_7_get_my_clients(agent_token, test_user_id):
        print("\n❌ CRITICAL: not_interested field missing or user not found")
        sys.exit(1)
    
    # TEST 8-11: Mark/unmark workflow
    test_8_mark_not_interested(agent_token, test_user_id)
    test_9_verify_true(agent_token, test_user_id)
    test_10_unmark_not_interested(agent_token, test_user_id)
    test_11_verify_false(agent_token, test_user_id)
    
    # TEST 12-13: Error handling
    test_12_error_no_params(agent_token)
    test_13_error_not_found(agent_token)
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for r in test_results if r["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total*100):.1f}%\n")
    
    if passed == total:
        print("✅ ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED")
        print("\nFailed tests:")
        for r in test_results:
            if not r["passed"]:
                print(f"  - {r['test']}: {r['details']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
