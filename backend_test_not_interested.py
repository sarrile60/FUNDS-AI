#!/usr/bin/env python3
"""
Backend API Testing for Traccia Fondi - "Not Interested" Feature
=================================================================
Tests the new "Not Interested" feature for the Agent Portal:
1. PUT /api/agent/clients/not-interested endpoint
2. GET /api/agent/my-clients includes not_interested field
3. Error handling (400 for missing params, 404 for non-existent user)
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
    """TEST 3: GET /api/admin/agents/{agent_id}/password - Get agent password"""
    print("=" * 80)
    print(f"TEST 3: GET /api/admin/agents/{agent_id}/password - Get Agent Password")
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
                log_test("GET /api/admin/agents/{agent_id}/password", True, f"Password retrieved: {password}")
                return password
            else:
                log_test("GET /api/admin/agents/{agent_id}/password", False, "No password in response")
                return None
        else:
            log_test("GET /api/admin/agents/{agent_id}/password", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/admin/agents/{agent_id}/password", False, f"Exception: {str(e)}")
        return None


def test_4_agent_login(username: str, password: str) -> Optional[str]:
    """TEST 4: POST /api/agent/login - Agent login"""
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
            if token:
                log_test("POST /api/agent/login", True, f"Agent logged in. Token: {token[:20]}..., Agent ID: {agent.get('id')}")
                return token
            else:
                log_test("POST /api/agent/login", False, "No token in response")
                return None
        else:
            log_test("POST /api/agent/login", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("POST /api/agent/login", False, f"Exception: {str(e)}")
        return None


def test_5_get_my_clients(agent_token: str) -> Optional[list]:
    """TEST 5: GET /api/agent/my-clients - Get agent's clients with not_interested field"""
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
                # Check if not_interested field exists
                has_not_interested_field = True
                for client in clients:
                    if "not_interested" not in client:
                        has_not_interested_field = False
                        break
                
                if has_not_interested_field:
                    log_test("GET /api/agent/my-clients - not_interested field", True, 
                            f"Retrieved {len(clients)} clients, all have 'not_interested' field")
                    for i, client in enumerate(clients[:3]):  # Show first 3
                        print(f"  Client {i+1}: {client.get('first_name')} {client.get('last_name')}, "
                              f"email={client.get('email')}, user_id={client.get('user_id')}, "
                              f"not_interested={client.get('not_interested')}")
                    return clients
                else:
                    log_test("GET /api/agent/my-clients - not_interested field", False, 
                            "Some clients missing 'not_interested' field")
                    return None
            else:
                log_test("GET /api/agent/my-clients", False, "Response is not a list")
                return None
        else:
            log_test("GET /api/agent/my-clients", False, f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("GET /api/agent/my-clients", False, f"Exception: {str(e)}")
        return None


def test_6_mark_not_interested(agent_token: str, user_id: str) -> bool:
    """TEST 6: PUT /api/agent/clients/not-interested - Mark client as not interested"""
    print("=" * 80)
    print(f"TEST 6: PUT /api/agent/clients/not-interested - Mark as Not Interested (user_id: {user_id})")
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
                log_test("PUT /api/agent/clients/not-interested (mark)", True, 
                        f"Successfully marked user as not interested. Response: {data}")
                return True
            else:
                log_test("PUT /api/agent/clients/not-interested (mark)", False, 
                        f"Unexpected response: {data}")
                return False
        else:
            log_test("PUT /api/agent/clients/not-interested (mark)", False, 
                    f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("PUT /api/agent/clients/not-interested (mark)", False, f"Exception: {str(e)}")
        return False


def test_7_verify_not_interested_true(agent_token: str, user_id: str) -> bool:
    """TEST 7: Verify client now has not_interested=true"""
    print("=" * 80)
    print(f"TEST 7: Verify not_interested=true for user_id: {user_id}")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/agent/my-clients",
            headers={"Authorization": f"Bearer {agent_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            clients = response.json()
            target_client = None
            for client in clients:
                if client.get("user_id") == user_id:
                    target_client = client
                    break
            
            if target_client:
                if target_client.get("not_interested") == True:
                    log_test("Verify not_interested=true", True, 
                            f"Client {target_client.get('first_name')} {target_client.get('last_name')} "
                            f"has not_interested=true")
                    return True
                else:
                    log_test("Verify not_interested=true", False, 
                            f"Client has not_interested={target_client.get('not_interested')}, expected True")
                    return False
            else:
                log_test("Verify not_interested=true", False, f"Client with user_id={user_id} not found")
                return False
        else:
            log_test("Verify not_interested=true", False, f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Verify not_interested=true", False, f"Exception: {str(e)}")
        return False


def test_8_unmark_not_interested(agent_token: str, user_id: str) -> bool:
    """TEST 8: PUT /api/agent/clients/not-interested - Unmark client as not interested"""
    print("=" * 80)
    print(f"TEST 8: PUT /api/agent/clients/not-interested - Unmark Not Interested (user_id: {user_id})")
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
                log_test("PUT /api/agent/clients/not-interested (unmark)", True, 
                        f"Successfully unmarked user as not interested. Response: {data}")
                return True
            else:
                log_test("PUT /api/agent/clients/not-interested (unmark)", False, 
                        f"Unexpected response: {data}")
                return False
        else:
            log_test("PUT /api/agent/clients/not-interested (unmark)", False, 
                    f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("PUT /api/agent/clients/not-interested (unmark)", False, f"Exception: {str(e)}")
        return False


def test_9_verify_not_interested_false(agent_token: str, user_id: str) -> bool:
    """TEST 9: Verify client now has not_interested=false"""
    print("=" * 80)
    print(f"TEST 9: Verify not_interested=false for user_id: {user_id}")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{API_BASE}/agent/my-clients",
            headers={"Authorization": f"Bearer {agent_token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            clients = response.json()
            target_client = None
            for client in clients:
                if client.get("user_id") == user_id:
                    target_client = client
                    break
            
            if target_client:
                if target_client.get("not_interested") == False:
                    log_test("Verify not_interested=false", True, 
                            f"Client {target_client.get('first_name')} {target_client.get('last_name')} "
                            f"has not_interested=false")
                    return True
                else:
                    log_test("Verify not_interested=false", False, 
                            f"Client has not_interested={target_client.get('not_interested')}, expected False")
                    return False
            else:
                log_test("Verify not_interested=false", False, f"Client with user_id={user_id} not found")
                return False
        else:
            log_test("Verify not_interested=false", False, f"Status {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Verify not_interested=false", False, f"Exception: {str(e)}")
        return False


def test_10_error_no_params(agent_token: str) -> bool:
    """TEST 10: Error handling - 400 if neither user_id nor trace_id provided"""
    print("=" * 80)
    print("TEST 10: Error Handling - 400 if no user_id or trace_id")
    print("=" * 80)
    
    try:
        response = requests.put(
            f"{API_BASE}/agent/clients/not-interested",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"not_interested": True},  # Missing both user_id and trace_id
            timeout=10
        )
        
        if response.status_code == 400:
            log_test("Error handling - 400 for missing params", True, 
                    f"Correctly returned 400. Response: {response.text[:200]}")
            return True
        else:
            log_test("Error handling - 400 for missing params", False, 
                    f"Expected 400, got {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Error handling - 400 for missing params", False, f"Exception: {str(e)}")
        return False


def test_11_error_user_not_found(agent_token: str) -> bool:
    """TEST 11: Error handling - 404 if user_id doesn't exist"""
    print("=" * 80)
    print("TEST 11: Error Handling - 404 if user_id doesn't exist")
    print("=" * 80)
    
    fake_user_id = "nonexistent-user-id-12345"
    
    try:
        response = requests.put(
            f"{API_BASE}/agent/clients/not-interested",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"user_id": fake_user_id, "not_interested": True},
            timeout=10
        )
        
        if response.status_code == 404:
            log_test("Error handling - 404 for non-existent user", True, 
                    f"Correctly returned 404. Response: {response.text[:200]}")
            return True
        else:
            log_test("Error handling - 404 for non-existent user", False, 
                    f"Expected 404, got {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test("Error handling - 404 for non-existent user", False, f"Exception: {str(e)}")
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 80)
    print("TRACCIA FONDI - NOT INTERESTED FEATURE TESTING")
    print("=" * 80 + "\n")
    
    # TEST 1: Admin login
    admin_token = test_1_admin_login()
    if not admin_token:
        print("\n❌ CRITICAL: Admin login failed. Cannot continue.")
        sys.exit(1)
    
    # TEST 2: Get agents
    agents = test_2_get_agents(admin_token)
    if not agents or len(agents) == 0:
        print("\n❌ CRITICAL: No agents found. Cannot continue.")
        sys.exit(1)
    
    # Use first agent
    first_agent = agents[0]
    agent_id = first_agent.get("id")
    agent_username = first_agent.get("username")
    
    print(f"\n📋 Using agent: {agent_username} (ID: {agent_id})\n")
    
    # TEST 3: Get agent password
    agent_password = test_3_get_agent_password(admin_token, agent_id)
    if not agent_password:
        print("\n❌ CRITICAL: Could not retrieve agent password. Cannot continue.")
        sys.exit(1)
    
    # TEST 4: Agent login
    agent_token = test_4_agent_login(agent_username, agent_password)
    if not agent_token:
        print("\n❌ CRITICAL: Agent login failed. Cannot continue.")
        sys.exit(1)
    
    # TEST 5: Get agent's clients
    clients = test_5_get_my_clients(agent_token)
    if not clients or len(clients) == 0:
        print("\n⚠️  WARNING: Agent has no clients. Cannot test mark/unmark functionality.")
        print("    Continuing with error handling tests only...\n")
        test_user_id = None
    else:
        # Use first client for testing
        test_user_id = clients[0].get("user_id")
        if not test_user_id:
            print("\n⚠️  WARNING: First client has no user_id (orphan trace). Looking for registered user...")
            for client in clients:
                if client.get("user_id"):
                    test_user_id = client.get("user_id")
                    print(f"    Found registered user: {client.get('first_name')} {client.get('last_name')} (user_id: {test_user_id})\n")
                    break
        
        if test_user_id:
            print(f"\n📋 Using client with user_id: {test_user_id} for testing\n")
            
            # TEST 6: Mark as not interested
            test_6_mark_not_interested(agent_token, test_user_id)
            
            # TEST 7: Verify not_interested=true
            test_7_verify_not_interested_true(agent_token, test_user_id)
            
            # TEST 8: Unmark as not interested
            test_8_unmark_not_interested(agent_token, test_user_id)
            
            # TEST 9: Verify not_interested=false
            test_9_verify_not_interested_false(agent_token, test_user_id)
        else:
            print("\n⚠️  WARNING: No registered users found (all clients are orphan traces).")
            print("    Cannot test mark/unmark functionality. Continuing with error handling tests...\n")
    
    # TEST 10: Error handling - no params
    test_10_error_no_params(agent_token)
    
    # TEST 11: Error handling - user not found
    test_11_error_user_not_found(agent_token)
    
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
