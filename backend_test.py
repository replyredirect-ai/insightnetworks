#!/usr/bin/env python3
"""
Backend API Testing for XceedNet Login/Proxy Endpoints
Tests all 8 scenarios outlined in the test plan.
"""
import requests
import json
import sys
from typing import Dict, Any, Optional

# Load backend URL from frontend/.env
# Testing against external URL (routing has been fixed)
BACKEND_URL = "https://32ac4902-d835-4e50-b97b-45d102ca4b34.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "insightnetworks@hotmail.com"
ADMIN_PASSWORD = "Cisco@12345"
SUBSCRIBER_USERNAME = "poriya.traders"
SUBSCRIBER_PASSWORD = "9926625075"
SUBSCRIBER_DOMAIN = "bhopal.insightnet.in"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_pass(self, test_name: str):
        self.passed += 1
        print(f"{GREEN}✓ PASS{RESET}: {test_name}")
    
    def add_fail(self, test_name: str, reason: str):
        self.failed += 1
        error_msg = f"{test_name}: {reason}"
        self.errors.append(error_msg)
        print(f"{RED}✗ FAIL{RESET}: {error_msg}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*70}")
        print(f"TEST SUMMARY: {self.passed}/{total} passed")
        if self.failed > 0:
            print(f"\n{RED}FAILED TESTS:{RESET}")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*70}\n")
        return self.failed == 0


def test_admin_login_success(result: TestResult) -> Optional[str]:
    """Test 1: Admin login with correct credentials"""
    test_name = "Test 1: Admin login (correct credentials)"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        print(f"  Response: {json.dumps(data, indent=2)}")
        
        # Verify status code
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return None
        
        # Verify response structure
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return None
        
        token = data.get("token")
        if not token or not isinstance(token, str) or len(token) < 10:
            result.add_fail(test_name, f"Expected non-empty token, got: {token}")
            return None
        
        if data.get("message") != "Login successful":
            result.add_fail(test_name, f"Expected message='Login successful', got: {data.get('message')}")
            return None
        
        result.add_pass(test_name)
        print(f"  Token (truncated): {token[:20]}...")
        return token
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")
        return None


def test_admin_login_failure(result: TestResult):
    """Test 2: Admin login with wrong password"""
    test_name = "Test 2: Admin login (wrong password)"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/login",
            json={"email": ADMIN_EMAIL, "password": "WRONG"},
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        print(f"  Response: {json.dumps(data, indent=2)}")
        
        # Verify status code
        if response.status_code != 401:
            result.add_fail(test_name, f"Expected HTTP 401, got {response.status_code}")
            return
        
        # Verify response structure
        if data.get("success") != False:
            result.add_fail(test_name, f"Expected success=false, got {data.get('success')}")
            return
        
        message = data.get("message", "")
        if not message or not isinstance(message, str):
            result.add_fail(test_name, f"Expected non-empty error message, got: {message}")
            return
        
        if "upstream_status" not in data:
            result.add_fail(test_name, f"Expected upstream_status field in response")
            return
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_subscriber_login_success(result: TestResult) -> Optional[str]:
    """Test 3: Subscriber login with correct credentials"""
    test_name = "Test 3: Subscriber login (correct credentials)"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.post(
            f"{API_BASE}/subscriber/login",
            json={
                "username": SUBSCRIBER_USERNAME,
                "password": SUBSCRIBER_PASSWORD,
                "domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        print(f"  Response: {json.dumps(data, indent=2)}")
        
        # Verify status code
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return None
        
        # Verify response structure
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return None
        
        token = data.get("token")
        if not token or not isinstance(token, str) or len(token) < 10:
            result.add_fail(test_name, f"Expected non-empty token, got: {token}")
            return None
        
        if data.get("domain") != SUBSCRIBER_DOMAIN:
            result.add_fail(test_name, f"Expected domain='{SUBSCRIBER_DOMAIN}', got: {data.get('domain')}")
            return None
        
        result.add_pass(test_name)
        print(f"  Token (truncated): {token[:20]}...")
        return token
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")
        return None


def test_subscriber_login_failure(result: TestResult):
    """Test 4: Subscriber login with unknown username"""
    test_name = "Test 4: Subscriber login (unknown username)"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.post(
            f"{API_BASE}/subscriber/login",
            json={
                "username": "nonexistent_user_xyz",
                "password": "anything",
                "domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        print(f"  Response: {json.dumps(data, indent=2)}")
        
        # Verify status code
        if response.status_code != 401:
            result.add_fail(test_name, f"Expected HTTP 401, got {response.status_code}")
            return
        
        # Verify response structure
        if data.get("success") != False:
            result.add_fail(test_name, f"Expected success=false, got {data.get('success')}")
            return
        
        message = data.get("message", "")
        if not message or not isinstance(message, str):
            result.add_fail(test_name, f"Expected non-empty error message, got: {message}")
            return
        
        # Check if message mentions subscriber not found (flexible check)
        if "subscriber" not in message.lower() and "find" not in message.lower():
            print(f"  {YELLOW}Warning:{RESET} Message doesn't mention 'Subscriber' or 'find': {message}")
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_subscriber_dashboard(result: TestResult, token: str):
    """Test 5: Subscriber dashboard with valid token"""
    test_name = "Test 5: Subscriber dashboard (authenticated)"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available (previous test failed)")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/subscriber/dashboard",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        print(f"  Response keys: {list(data.keys())}")
        
        # Verify status code
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        # Verify response structure
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return
        
        dashboard_data = data.get("data")
        if not dashboard_data or not isinstance(dashboard_data, dict):
            result.add_fail(test_name, f"Expected data object, got: {type(dashboard_data)}")
            return
        
        # Verify username matches
        username = dashboard_data.get("username")
        if username != SUBSCRIBER_USERNAME:
            result.add_fail(test_name, f"Expected username='{SUBSCRIBER_USERNAME}', got: {username}")
            return
        
        # Verify id is present
        if "id" not in dashboard_data:
            result.add_fail(test_name, f"Expected 'id' field in data")
            return
        
        result.add_pass(test_name)
        print(f"  Username: {username}, ID: {dashboard_data.get('id')}")
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_admin_dashboard(result: TestResult, token: str):
    """Test 6: Admin dashboard with valid token"""
    test_name = "Test 6: Admin dashboard (authenticated)"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available (previous test failed)")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/admin/dashboard",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        print(f"  Response keys: {list(data.keys())}")
        
        # Verify status code
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        # Verify response structure
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return
        
        dashboard_data = data.get("data")
        if not dashboard_data or not isinstance(dashboard_data, dict):
            result.add_fail(test_name, f"Expected data object, got: {type(dashboard_data)}")
            return
        
        # Verify all_subscribers_count is present and is a number
        count = dashboard_data.get("all_subscribers_count")
        if count is None:
            result.add_fail(test_name, f"Expected 'all_subscribers_count' field in data")
            return
        
        if not isinstance(count, (int, float)):
            result.add_fail(test_name, f"Expected all_subscribers_count to be a number, got: {type(count)}")
            return
        
        result.add_pass(test_name)
        print(f"  All subscribers count: {count}")
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_subscribers_list(result: TestResult, token: str):
    """Test 7: Subscribers list with valid token"""
    test_name = "Test 7: Subscribers list (authenticated)"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available (previous test failed)")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/subscribers/list?length=5",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        print(f"  Response keys: {list(data.keys())}")
        
        # Verify status code
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        # Verify response structure
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return
        
        list_data = data.get("data")
        if not list_data or not isinstance(list_data, dict):
            result.add_fail(test_name, f"Expected data object, got: {type(list_data)}")
            return
        
        # XceedNet returns datatable format with nested data.data array
        subscribers_array = list_data.get("data")
        if not isinstance(subscribers_array, list):
            result.add_fail(test_name, f"Expected data.data to be an array, got: {type(subscribers_array)}")
            return
        
        result.add_pass(test_name)
        print(f"  Subscribers array length: {len(subscribers_array)}")
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_missing_auth_header(result: TestResult):
    """Test 8: Request without Authentication header"""
    test_name = "Test 8: Missing Authentication header"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.get(
            f"{API_BASE}/subscriber/dashboard",
            headers={
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        print(f"  Response: {json.dumps(data, indent=2)}")
        
        # Verify status code
        if response.status_code != 401:
            result.add_fail(test_name, f"Expected HTTP 401, got {response.status_code}")
            return
        
        # Verify error message mentions authentication
        detail = data.get("detail", "")
        if not detail or "authentication" not in detail.lower():
            result.add_fail(test_name, f"Expected error mentioning 'authentication', got: {detail}")
            return
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def main():
    print(f"\n{'='*70}")
    print(f"XceedNet Backend API Testing")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"{'='*70}")
    
    result = TestResult()
    
    # Run all 8 tests
    admin_token = test_admin_login_success(result)
    test_admin_login_failure(result)
    subscriber_token = test_subscriber_login_success(result)
    test_subscriber_login_failure(result)
    test_subscriber_dashboard(result, subscriber_token)
    test_admin_dashboard(result, admin_token)
    test_subscribers_list(result, admin_token)
    test_missing_auth_header(result)
    
    # Print summary
    success = result.summary()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
