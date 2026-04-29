#!/usr/bin/env python3
"""
AI-FUNDS Backend API Testing
============================
Comprehensive test suite for the AI-FUNDS FastAPI backend.
Tests all 19 critical steps outlined in the review request.
"""

import requests
import json
import uuid
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = "https://recovery-trace.preview.emergentagent.com/api"
TIMEOUT = 30

class AIFundsAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.user1_token = None
        self.user2_token = None
        self.user1_data = None
        self.user2_data = None
        self.case_id = None
        self.transaction_id = None
        self.evidence_id = None
        self.analysis_data = None
        self.reports = []
        
        # Test data
        self.test_email1 = f"qa+{uuid.uuid4().hex[:8]}@example.com"
        self.test_email2 = f"qa+{uuid.uuid4().hex[:8]}@example.com"
        self.test_password = "secretpass123"
        self.test_full_name = "QA Tester"
        
        print(f"🧪 AI-FUNDS API Testing Suite")
        print(f"📡 Backend URL: {self.base_url}")
        print(f"👤 Test User 1: {self.test_email1}")
        print(f"👤 Test User 2: {self.test_email2}")
        print("=" * 60)

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    headers: Optional[Dict] = None, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Prepare headers
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        if auth_token:
            req_headers["Authorization"] = f"Bearer {auth_token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=req_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=req_headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=req_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "headers": dict(response.headers),
                "success": 200 <= response.status_code < 300
            }
        except requests.exceptions.RequestException as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "headers": {},
                "success": False
            }
        except json.JSONDecodeError:
            return {
                "status_code": response.status_code,
                "data": {"error": "Invalid JSON response", "content": response.text[:200]},
                "headers": dict(response.headers),
                "success": False
            }

    def test_step_1_health_check(self) -> bool:
        """Step 1: GET /api/health → expect {status: "ok", time: ...}"""
        print("1️⃣  Testing health endpoint...")
        
        result = self.make_request("GET", "/health")
        
        if not result["success"]:
            print(f"❌ Health check failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if data.get("status") != "ok" or "time" not in data:
            print(f"❌ Health check response invalid: {data}")
            return False
            
        print(f"✅ Health check passed: {data}")
        return True

    def test_step_2_register_user1(self) -> bool:
        """Step 2: POST /api/auth/register with fresh email"""
        print("2️⃣  Testing user registration...")
        
        payload = {
            "email": self.test_email1,
            "password": self.test_password,
            "full_name": self.test_full_name,
            "consent_privacy": True
        }
        
        result = self.make_request("POST", "/auth/register", payload)
        
        if not result["success"]:
            print(f"❌ Registration failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if "token" not in data or "user" not in data:
            print(f"❌ Registration response missing token/user: {data}")
            return False
            
        self.user1_token = data["token"]
        self.user1_data = data["user"]
        
        # Verify user data
        user = data["user"]
        if user.get("email") != self.test_email1.lower() or user.get("full_name") != self.test_full_name:
            print(f"❌ User data mismatch: {user}")
            return False
            
        if "password_hash" in user:
            print(f"❌ Password hash exposed in response: {user}")
            return False
            
        print(f"✅ Registration successful: {user['email']} (ID: {user['id']})")
        return True

    def test_step_3_login_user1(self) -> bool:
        """Step 3: POST /api/auth/login with same credentials"""
        print("3️⃣  Testing user login...")
        
        payload = {
            "email": self.test_email1,
            "password": self.test_password
        }
        
        result = self.make_request("POST", "/auth/login", payload)
        
        if not result["success"]:
            print(f"❌ Login failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if "token" not in data or "user" not in data:
            print(f"❌ Login response missing token/user: {data}")
            return False
            
        # Verify token is different (new token issued)
        login_token = data["token"]
        if login_token == self.user1_token:
            print("⚠️  Warning: Same token returned on login (might be expected)")
        
        print(f"✅ Login successful: {data['user']['email']}")
        return True

    def test_step_4_auth_me(self) -> bool:
        """Step 4: GET /api/auth/me with Bearer token"""
        print("4️⃣  Testing auth/me endpoint...")
        
        result = self.make_request("GET", "/auth/me", auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Auth/me failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if data.get("email") != self.test_email1.lower():
            print(f"❌ Auth/me returned wrong user: {data}")
            return False
            
        if "password_hash" in data:
            print(f"❌ Password hash exposed in auth/me: {data}")
            return False
            
        print(f"✅ Auth/me successful: {data['email']} (ID: {data['id']})")
        return True

    def test_step_5_create_case(self) -> bool:
        """Step 5: POST /api/cases with case payload"""
        print("5️⃣  Testing case creation...")
        
        payload = {
            "scam_type": "forex_broker",
            "country": "IT",
            "region": "Milano",
            "loss_amount": 12500,
            "currency": "EUR",
            "first_payment_date": "2025-04-10",
            "last_contact_date": "2025-04-25",
            "payment_method": "sepa",
            "scammer_still_active": True,
            "requested_extra_fee": True,
            "withdrawal_blocked": True,
            "impersonated_authority": "CONSOB"
        }
        
        result = self.make_request("POST", "/cases", payload, auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Case creation failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if "id" not in data or "case_reference" not in data:
            print(f"❌ Case response missing id/case_reference: {data}")
            return False
            
        self.case_id = data["id"]
        case_ref = data["case_reference"]
        
        if not case_ref.startswith("AIF-"):
            print(f"❌ Case reference doesn't start with AIF-: {case_ref}")
            return False
            
        # Verify case data
        for key, value in payload.items():
            if data.get(key) != value:
                print(f"❌ Case data mismatch for {key}: expected {value}, got {data.get(key)}")
                return False
                
        print(f"✅ Case created: {case_ref} (ID: {self.case_id})")
        return True

    def test_step_6_list_cases(self) -> bool:
        """Step 6: GET /api/cases → returns list including new case"""
        print("6️⃣  Testing case listing...")
        
        result = self.make_request("GET", "/cases", auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Case listing failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if not isinstance(data, list):
            print(f"❌ Cases response not a list: {data}")
            return False
            
        # Find our case
        our_case = None
        for case in data:
            if case.get("id") == self.case_id:
                our_case = case
                break
                
        if not our_case:
            print(f"❌ Created case not found in list: {self.case_id}")
            return False
            
        print(f"✅ Case listing successful: found {len(data)} cases including ours")
        return True

    def test_step_7_get_case(self) -> bool:
        """Step 7: GET /api/cases/{id} → returns the same case"""
        print("7️⃣  Testing case retrieval...")
        
        result = self.make_request("GET", f"/cases/{self.case_id}", auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Case retrieval failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if data.get("id") != self.case_id:
            print(f"❌ Wrong case returned: expected {self.case_id}, got {data.get('id')}")
            return False
            
        print(f"✅ Case retrieval successful: {data['case_reference']}")
        return True

    def test_step_8_add_transaction(self) -> bool:
        """Step 8: POST /api/cases/{id}/transactions"""
        print("8️⃣  Testing transaction creation...")
        
        payload = {
            "payment_type": "sepa",
            "amount": 5000,
            "currency": "EUR",
            "iban": "IT60X0542811101000000123456",
            "iban_country": "IT",
            "bank_name": "Intesa",
            "recipient_name": "Acme Trading Ltd",
            "reference_number": "CRO123456",
            "date": "2025-04-10T10:30"
        }
        
        result = self.make_request("POST", f"/cases/{self.case_id}/transactions", 
                                 payload, auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Transaction creation failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if "id" not in data or data.get("case_id") != self.case_id:
            print(f"❌ Transaction response invalid: {data}")
            return False
            
        self.transaction_id = data["id"]
        
        # Verify transaction data
        for key, value in payload.items():
            if data.get(key) != value:
                print(f"❌ Transaction data mismatch for {key}: expected {value}, got {data.get(key)}")
                return False
                
        print(f"✅ Transaction created: {self.transaction_id}")
        return True

    def test_step_9_list_transactions(self) -> bool:
        """Step 9: GET /api/cases/{id}/transactions → list of 1"""
        print("9️⃣  Testing transaction listing...")
        
        result = self.make_request("GET", f"/cases/{self.case_id}/transactions", 
                                 auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Transaction listing failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if not isinstance(data, list) or len(data) != 1:
            print(f"❌ Expected 1 transaction, got: {len(data) if isinstance(data, list) else 'not a list'}")
            return False
            
        transaction = data[0]
        if transaction.get("id") != self.transaction_id:
            print(f"❌ Wrong transaction returned: expected {self.transaction_id}, got {transaction.get('id')}")
            return False
            
        print(f"✅ Transaction listing successful: 1 transaction found")
        return True

    def test_step_10_add_evidence(self) -> bool:
        """Step 10: POST /api/cases/{id}/evidence"""
        print("🔟 Testing evidence creation...")
        
        payload = {
            "evidence_type": "screenshot",
            "title": "Screenshot dashboard",
            "collected": True
        }
        
        result = self.make_request("POST", f"/cases/{self.case_id}/evidence", 
                                 payload, auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Evidence creation failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if "id" not in data or data.get("case_id") != self.case_id:
            print(f"❌ Evidence response invalid: {data}")
            return False
            
        self.evidence_id = data["id"]
        
        # Verify evidence data
        for key, value in payload.items():
            if data.get(key) != value:
                print(f"❌ Evidence data mismatch for {key}: expected {value}, got {data.get(key)}")
                return False
                
        print(f"✅ Evidence created: {self.evidence_id}")
        return True

    def test_step_11_list_evidence(self) -> bool:
        """Step 11: GET /api/cases/{id}/evidence → list of 1"""
        print("1️⃣1️⃣ Testing evidence listing...")
        
        result = self.make_request("GET", f"/cases/{self.case_id}/evidence", 
                                 auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Evidence listing failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if not isinstance(data, list) or len(data) != 1:
            print(f"❌ Expected 1 evidence, got: {len(data) if isinstance(data, list) else 'not a list'}")
            return False
            
        evidence = data[0]
        if evidence.get("id") != self.evidence_id:
            print(f"❌ Wrong evidence returned: expected {self.evidence_id}, got {evidence.get('id')}")
            return False
            
        print(f"✅ Evidence listing successful: 1 evidence found")
        return True

    def test_step_12_analyze_case(self) -> bool:
        """Step 12: POST /api/cases/{id}/analyze → returns analysis"""
        print("1️⃣2️⃣ Testing case analysis...")
        
        result = self.make_request("POST", f"/cases/{self.case_id}/analyze", 
                                 auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Case analysis failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        self.analysis_data = data
        
        # Verify required fields
        required_fields = [
            "urgency_score", "urgency_category", "red_flags", 
            "recommended_actions", "payment_rail_summary", 
            "tracing_summary", "recovery_outlook"
        ]
        
        for field in required_fields:
            if field not in data:
                print(f"❌ Analysis missing required field: {field}")
                return False
                
        # Verify urgency_score > 0
        if not isinstance(data["urgency_score"], (int, float)) or data["urgency_score"] <= 0:
            print(f"❌ Invalid urgency_score: {data['urgency_score']}")
            return False
            
        # Verify urgency_category
        valid_categories = {"low", "medium", "high", "critical"}
        if data["urgency_category"] not in valid_categories:
            print(f"❌ Invalid urgency_category: {data['urgency_category']}")
            return False
            
        # Verify red_flags is non-empty (given our test case conditions)
        if not isinstance(data["red_flags"], list) or len(data["red_flags"]) == 0:
            print(f"❌ Expected non-empty red_flags, got: {data['red_flags']}")
            return False
            
        # Verify recommended_actions is non-empty
        if not isinstance(data["recommended_actions"], list) or len(data["recommended_actions"]) == 0:
            print(f"❌ Expected non-empty recommended_actions, got: {data['recommended_actions']}")
            return False
            
        # Verify payment_rail_summary mentions SEPA/recall
        rail_summary = data["payment_rail_summary"].lower()
        if "sepa" not in rail_summary and "recall" not in rail_summary:
            print(f"❌ Payment rail summary should mention SEPA/recall: {data['payment_rail_summary']}")
            return False
            
        # Verify tracing_summary has chain
        tracing = data["tracing_summary"]
        if not isinstance(tracing, dict) or "chain" not in tracing:
            print(f"❌ Invalid tracing_summary structure: {tracing}")
            return False
            
        chain = tracing["chain"]
        if not isinstance(chain, list) or len(chain) == 0:
            print(f"❌ Invalid tracing chain: {chain}")
            return False
            
        # Check if chain ends with recall-related term
        last_item = chain[-1].lower()
        if "recall" not in last_item and "consob" not in last_item and "polizia" not in last_item:
            print(f"⚠️  Warning: Chain doesn't end with expected terms: {chain[-1]}")
            
        # Verify recovery_outlook is string
        if not isinstance(data["recovery_outlook"], str) or len(data["recovery_outlook"]) == 0:
            print(f"❌ Invalid recovery_outlook: {data['recovery_outlook']}")
            return False
            
        print(f"✅ Analysis successful: score={data['urgency_score']}, category={data['urgency_category']}")
        print(f"   Red flags: {len(data['red_flags'])}, Actions: {len(data['recommended_actions'])}")
        return True

    def test_step_13_get_analysis(self) -> bool:
        """Step 13: GET /api/cases/{id}/analysis → same analysis"""
        print("1️⃣3️⃣ Testing analysis retrieval...")
        
        result = self.make_request("GET", f"/cases/{self.case_id}/analysis", 
                                 auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Analysis retrieval failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        
        # Compare with previous analysis
        if not self.analysis_data:
            print(f"❌ No previous analysis to compare with")
            return False
            
        # Check key fields match
        key_fields = ["urgency_score", "urgency_category", "recovery_outlook"]
        for field in key_fields:
            if data.get(field) != self.analysis_data.get(field):
                print(f"❌ Analysis field mismatch for {field}: {data.get(field)} vs {self.analysis_data.get(field)}")
                return False
                
        print(f"✅ Analysis retrieval successful: matches previous analysis")
        return True

    def test_step_14_create_reports(self) -> bool:
        """Step 14: Create 4 different reports"""
        print("1️⃣4️⃣ Testing report creation...")
        
        report_types = [
            ("bank_complaint", "it"),
            ("consob_report", "it"),
            ("police_report", "it"),
            ("exchange_freeze", "it")
        ]
        
        for report_type, language in report_types:
            payload = {
                "report_type": report_type,
                "language": language
            }
            
            result = self.make_request("POST", f"/cases/{self.case_id}/reports", 
                                     payload, auth_token=self.user1_token)
            
            if not result["success"]:
                print(f"❌ Report creation failed for {report_type}: {result['status_code']} - {result['data']}")
                return False
                
            data = result["data"]
            if "id" not in data or "title" not in data or "content" not in data:
                print(f"❌ Report response invalid for {report_type}: {data}")
                return False
                
            self.reports.append(data)
            
            # Verify specific content based on report type
            title = data["title"]
            content = data["content"]
            
            if report_type == "bank_complaint" and "reclamo" not in title.lower():
                print(f"❌ Bank complaint title should contain 'Reclamo': {title}")
                return False
                
            # Check if content contains case reference and user name
            if self.user1_data and self.user1_data.get("full_name"):
                if self.user1_data["full_name"] not in content:
                    print(f"❌ Report content missing user full name for {report_type}")
                    return False
                    
            print(f"   ✅ {report_type} report created: {data['id']}")
            
        print(f"✅ All 4 reports created successfully")
        return True

    def test_step_15_list_reports(self) -> bool:
        """Step 15: GET /api/cases/{id}/reports → returns list of 4"""
        print("1️⃣5️⃣ Testing report listing...")
        
        result = self.make_request("GET", f"/cases/{self.case_id}/reports", 
                                 auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Report listing failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if not isinstance(data, list) or len(data) != 4:
            print(f"❌ Expected 4 reports, got: {len(data) if isinstance(data, list) else 'not a list'}")
            return False
            
        # Verify all our reports are there
        report_ids = {r["id"] for r in data}
        our_report_ids = {r["id"] for r in self.reports}
        
        if report_ids != our_report_ids:
            print(f"❌ Report ID mismatch: expected {our_report_ids}, got {report_ids}")
            return False
            
        print(f"✅ Report listing successful: 4 reports found")
        return True

    def test_step_16_update_case(self) -> bool:
        """Step 16: PUT /api/cases/{id} updating loss_amount to 15000"""
        print("1️⃣6️⃣ Testing case update...")
        
        payload = {
            "loss_amount": 15000
        }
        
        result = self.make_request("PUT", f"/cases/{self.case_id}", 
                                 payload, auth_token=self.user1_token)
        
        if not result["success"]:
            print(f"❌ Case update failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        if data.get("loss_amount") != 15000:
            print(f"❌ Case update didn't work: expected 15000, got {data.get('loss_amount')}")
            return False
            
        print(f"✅ Case update successful: loss_amount = {data['loss_amount']}")
        return True

    def test_step_17_auth_security(self) -> bool:
        """Step 17: Call POST /api/cases without bearer → expect 401"""
        print("1️⃣7️⃣ Testing auth security...")
        
        payload = {
            "scam_type": "test",
            "country": "IT"
        }
        
        result = self.make_request("POST", "/cases", payload)  # No auth token
        
        if result["status_code"] != 401:
            print(f"❌ Expected 401 without auth, got: {result['status_code']}")
            return False
            
        print(f"✅ Auth security working: 401 returned without token")
        return True

    def test_step_18_register_user2(self) -> bool:
        """Step 18: Register second user for isolation test"""
        print("1️⃣8️⃣ Testing second user registration...")
        
        payload = {
            "email": self.test_email2,
            "password": self.test_password,
            "full_name": "QA Tester 2",
            "consent_privacy": True
        }
        
        result = self.make_request("POST", "/auth/register", payload)
        
        if not result["success"]:
            print(f"❌ Second user registration failed: {result['status_code']} - {result['data']}")
            return False
            
        data = result["data"]
        self.user2_token = data["token"]
        self.user2_data = data["user"]
        
        print(f"✅ Second user registered: {data['user']['email']}")
        return True

    def test_step_19_cross_user_isolation(self) -> bool:
        """Step 19: Try to access first user's case with second user's token → expect 404"""
        print("1️⃣9️⃣ Testing cross-user isolation...")
        
        result = self.make_request("GET", f"/cases/{self.case_id}", 
                                 auth_token=self.user2_token)
        
        if result["status_code"] != 404:
            print(f"❌ Expected 404 for cross-user access, got: {result['status_code']}")
            print(f"   Response: {result['data']}")
            return False
            
        print(f"✅ Cross-user isolation working: 404 returned")
        return True

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all 19 test steps"""
        tests = [
            ("Health Check", self.test_step_1_health_check),
            ("User Registration", self.test_step_2_register_user1),
            ("User Login", self.test_step_3_login_user1),
            ("Auth Me", self.test_step_4_auth_me),
            ("Create Case", self.test_step_5_create_case),
            ("List Cases", self.test_step_6_list_cases),
            ("Get Case", self.test_step_7_get_case),
            ("Add Transaction", self.test_step_8_add_transaction),
            ("List Transactions", self.test_step_9_list_transactions),
            ("Add Evidence", self.test_step_10_add_evidence),
            ("List Evidence", self.test_step_11_list_evidence),
            ("Analyze Case", self.test_step_12_analyze_case),
            ("Get Analysis", self.test_step_13_get_analysis),
            ("Create Reports", self.test_step_14_create_reports),
            ("List Reports", self.test_step_15_list_reports),
            ("Update Case", self.test_step_16_update_case),
            ("Auth Security", self.test_step_17_auth_security),
            ("Register User 2", self.test_step_18_register_user2),
            ("Cross-User Isolation", self.test_step_19_cross_user_isolation),
        ]
        
        results = {}
        passed = 0
        total = len(tests)
        
        for name, test_func in tests:
            try:
                success = test_func()
                results[name] = success
                if success:
                    passed += 1
                print()  # Empty line for readability
            except Exception as e:
                print(f"❌ {name} failed with exception: {e}")
                results[name] = False
                print()
                
        print("=" * 60)
        print(f"🏁 TEST SUMMARY: {passed}/{total} tests passed")
        print("=" * 60)
        
        for name, success in results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {name}")
            
        return results

def main():
    """Main test runner"""
    print("Starting AI-FUNDS Backend API Tests...")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()
    
    tester = AIFundsAPITester()
    results = tester.run_all_tests()
    
    # Summary
    failed_tests = [name for name, success in results.items() if not success]
    
    if failed_tests:
        print("\n❌ FAILED TESTS:")
        for test in failed_tests:
            print(f"   - {test}")
        print(f"\n🚨 {len(failed_tests)} test(s) failed out of {len(results)}")
        return 1
    else:
        print("\n🎉 ALL TESTS PASSED!")
        return 0

if __name__ == "__main__":
    exit(main())