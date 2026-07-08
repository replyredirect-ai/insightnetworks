#!/usr/bin/env python3
"""
Backend API Testing for XceedNet - Phase 2 Customer Portal
Tests regression + new Phase-2 endpoints (invoices, payments, profile, tickets)
"""
import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://network-hub-172.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "insightnetworks@hotmail.com"
ADMIN_PASSWORD = "Cisco@12345"
SUBSCRIBER_USERNAME = "poriya.traders"
SUBSCRIBER_PASSWORD = "9926625075"
SUBSCRIBER_MOBILE = "9926625075"
SUBSCRIBER_DOMAIN = "bhopal.insightnet.in"
SUBSCRIBER_ID = 3637069

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
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


# ============================================================================
# REGRESSION TESTS (R1-R4)
# ============================================================================

def test_r1_subscriber_login_username(result: TestResult) -> Optional[str]:
    """R1: POST /api/subscriber/login with username"""
    test_name = "R1: Subscriber login (username)"
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
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return None
        
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return None
        
        token = data.get("token")
        if not token or not isinstance(token, str) or len(token) < 10:
            result.add_fail(test_name, f"Expected non-empty token, got: {token}")
            return None
        
        result.add_pass(test_name)
        print(f"  Token (truncated): {token[:20]}...")
        return token
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")
        return None


def test_r2_subscriber_login_mobile(result: TestResult):
    """R2: POST /api/subscriber/login with mobile"""
    test_name = "R2: Subscriber login (mobile)"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.post(
            f"{API_BASE}/subscriber/login",
            json={
                "username": SUBSCRIBER_MOBILE,
                "password": SUBSCRIBER_PASSWORD,
                "domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        if not data.get("resolved_from_mobile"):
            result.add_fail(test_name, f"Expected resolved_from_mobile=true, got: {data.get('resolved_from_mobile')}")
            return
        
        if data.get("username") != SUBSCRIBER_USERNAME:
            result.add_fail(test_name, f"Expected username='{SUBSCRIBER_USERNAME}', got: {data.get('username')}")
            return
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_r3_admin_login(result: TestResult) -> Optional[str]:
    """R3: POST /api/admin/login"""
    test_name = "R3: Admin login"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return None
        
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return None
        
        token = data.get("token")
        if not token:
            result.add_fail(test_name, f"Expected non-empty token")
            return None
        
        result.add_pass(test_name)
        return token
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")
        return None


def test_r4_subscriber_dashboard(result: TestResult, token: str):
    """R4: GET /api/subscriber/dashboard"""
    test_name = "R4: Subscriber dashboard"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
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
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return
        
        dashboard_data = data.get("data", {})
        if dashboard_data.get("username") != SUBSCRIBER_USERNAME:
            result.add_fail(test_name, f"Expected username='{SUBSCRIBER_USERNAME}', got: {dashboard_data.get('username')}")
            return
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


# ============================================================================
# PHASE-2 TESTS (T1-T8)
# ============================================================================

def test_t1_invoices_list(result: TestResult, token: str):
    """T1: GET /api/subscriber/invoices?length=100"""
    test_name = "T1: Invoices list"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/subscriber/invoices?length=100",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return
        
        invoice_data = data.get("data", {})
        filtered = invoice_data.get("filtered", 0)
        if filtered < 6:
            result.add_fail(test_name, f"Expected filtered >= 6, got {filtered}")
            return
        
        invoices = invoice_data.get("invoices", [])
        if not isinstance(invoices, list):
            result.add_fail(test_name, f"Expected invoices to be a list, got {type(invoices)}")
            return
        
        # Check first invoice has required keys
        if len(invoices) > 0:
            inv = invoices[0]
            required_keys = ["id", "invoice_no", "invoice_date", "amount", "status"]
            missing = [k for k in required_keys if k not in inv]
            if missing:
                result.add_fail(test_name, f"Invoice missing keys: {missing}")
                return
        
        result.add_pass(test_name)
        print(f"  Filtered count: {filtered}, Invoices: {len(invoices)}")
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_t2_invoice_detail(result: TestResult, token: str):
    """T2: GET /api/subscriber/invoices/4668187"""
    test_name = "T2: Invoice detail"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/subscriber/invoices/4668187",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return
        
        invoice = data.get("data", {})
        
        # Check invoice_no
        if invoice.get("invoice_no") != "INS-11":
            result.add_fail(test_name, f"Expected invoice_no='INS-11', got: {invoice.get('invoice_no')}")
            return
        
        # Check subscriber_id
        if int(invoice.get("subscriber_id", 0)) != SUBSCRIBER_ID:
            result.add_fail(test_name, f"Expected subscriber_id={SUBSCRIBER_ID}, got: {invoice.get('subscriber_id')}")
            return
        
        # Check total_amount_cents
        if int(invoice.get("total_amount_cents", 0)) != 47100:
            result.add_fail(test_name, f"Expected total_amount_cents=47100, got: {invoice.get('total_amount_cents')}")
            return
        
        result.add_pass(test_name)
        print(f"  Invoice: {invoice.get('invoice_no')}, Amount: {invoice.get('total_amount_cents')}")
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_t3_invoice_not_found(result: TestResult, token: str):
    """T3: GET /api/subscriber/invoices/999999 (non-existent)"""
    test_name = "T3: Invoice not found"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/subscriber/invoices/999999",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        
        # Should return 4xx status (404 or other error)
        if response.status_code < 400:
            result.add_fail(test_name, f"Expected status >= 400, got {response.status_code}")
            return
        
        # If JSON response, check success=false
        try:
            data = response.json()
            if data.get("success") != False and "detail" not in data:
                result.add_fail(test_name, f"Expected success=false or detail field, got: {data}")
                return
        except:
            pass  # Non-JSON response is acceptable for 404
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_t4_invoice_pdf(result: TestResult, token: str):
    """T4: GET /api/subscriber/invoices/4668187/pdf"""
    test_name = "T4: Invoice PDF download"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/subscriber/invoices/4668187/pdf",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        # Check Content-Type
        content_type = response.headers.get("Content-Type", "")
        if "application/pdf" not in content_type:
            result.add_fail(test_name, f"Expected Content-Type with 'application/pdf', got: {content_type}")
            return
        
        # Check Content-Disposition
        content_disp = response.headers.get("Content-Disposition", "")
        if "Invoice-INS-11.pdf" not in content_disp:
            result.add_fail(test_name, f"Expected Content-Disposition with 'Invoice-INS-11.pdf', got: {content_disp}")
            return
        
        # Check PDF content
        body = response.content
        if len(body) < 1000:
            result.add_fail(test_name, f"Expected body length > 1000 bytes, got {len(body)}")
            return
        
        # Check PDF header
        if not body.startswith(b"%PDF-"):
            result.add_fail(test_name, f"Expected PDF to start with b'%PDF-', got: {body[:10]}")
            return
        
        # Check PDF footer (%%EOF in last 100 bytes)
        if b"%%EOF" not in body[-100:]:
            result.add_fail(test_name, f"Expected b'%%EOF' in last 100 bytes")
            return
        
        result.add_pass(test_name)
        print(f"  PDF size: {len(body)} bytes")
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_t5_payments_list(result: TestResult, token: str):
    """T5: GET /api/subscriber/payments?length=100"""
    test_name = "T5: Payments list"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/subscriber/payments?length=100",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return
        
        payment_data = data.get("data", {})
        payments = payment_data.get("payments", [])
        
        if not isinstance(payments, list):
            result.add_fail(test_name, f"Expected payments to be a list, got {type(payments)}")
            return
        
        # Check at least 1 payment with required keys
        if len(payments) < 1:
            result.add_fail(test_name, f"Expected at least 1 payment, got {len(payments)}")
            return
        
        payment = payments[0]
        required_keys = ["id", "payment_no", "payment_date", "amount", "status"]
        missing = [k for k in required_keys if k not in payment]
        if missing:
            result.add_fail(test_name, f"Payment missing keys: {missing}")
            return
        
        result.add_pass(test_name)
        print(f"  Payments count: {len(payments)}")
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_t6_profile_get(result: TestResult, token: str):
    """T6: GET /api/subscriber/profile"""
    test_name = "T6: Profile GET"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
        return
    
    try:
        response = requests.get(
            f"{API_BASE}/subscriber/profile",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200, got {response.status_code}")
            return
        
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true, got {data.get('success')}")
            return
        
        profile = data.get("data", {})
        
        # Check username
        if profile.get("username") != SUBSCRIBER_USERNAME:
            result.add_fail(test_name, f"Expected username='{SUBSCRIBER_USERNAME}', got: {profile.get('username')}")
            return
        
        # Check name
        if profile.get("name") != "Prasanna Thakur":
            result.add_fail(test_name, f"Expected name='Prasanna Thakur', got: {profile.get('name')}")
            return
        
        result.add_pass(test_name)
        print(f"  Username: {profile.get('username')}, Name: {profile.get('name')}")
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_t7_profile_update(result: TestResult, token: str):
    """T7: PATCH /api/subscriber/profile (update mobile2, verify, reset)"""
    test_name = "T7: Profile PATCH"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
        return
    
    try:
        # Step 1: Update mobile2
        print(f"  Step 1: Updating mobile2 to '9999900000'")
        response = requests.patch(
            f"{API_BASE}/subscriber/profile",
            json={"mobile2": "9999900000"},
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200 on PATCH, got {response.status_code}")
            return
        
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true on PATCH, got {data.get('success')}")
            return
        
        if not data.get("message"):
            result.add_fail(test_name, f"Expected message field in PATCH response")
            return
        
        # Step 2: Verify update
        print(f"  Step 2: Verifying mobile2 was updated")
        response = requests.get(
            f"{API_BASE}/subscriber/profile",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        data = response.json()
        profile = data.get("data", {})
        mobile2 = profile.get("mobile2", "")
        
        # XceedNet may normalize mobile numbers by adding country code prefix
        # Accept either the original value or with country code (91)
        if mobile2 not in ["9999900000", "919999900000"]:
            result.add_fail(test_name, f"Expected mobile2='9999900000' or '919999900000' after update, got: {mobile2}")
            return
        
        print(f"  Verified: mobile2={mobile2} (XceedNet normalized)")
        
        # Step 3: Reset mobile2 to empty
        print(f"  Step 3: Resetting mobile2 to empty string")
        response = requests.patch(
            f"{API_BASE}/subscriber/profile",
            json={"mobile2": ""},
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        # Accept either success or failure on reset (both behaviors acceptable)
        print(f"  Reset status: {response.status_code}")
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_t8_tickets_flow(result: TestResult, token: str):
    """T8: Full tickets flow (list, create, detail, reply, verify)"""
    test_name = "T8: Tickets full flow"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
        return
    
    try:
        # Step a: Get initial ticket count
        print(f"  Step a: Getting initial ticket count")
        response = requests.get(
            f"{API_BASE}/subscriber/tickets",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200 on GET tickets, got {response.status_code}")
            return
        
        data = response.json()
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true on GET tickets")
            return
        
        initial_count = data.get("data", {}).get("filtered", 0)
        print(f"  Initial ticket count: {initial_count}")
        
        # Step b: Create new ticket
        print(f"  Step b: Creating new ticket")
        response = requests.post(
            f"{API_BASE}/subscriber/tickets",
            json={
                "subject": "Automated test ticket",
                "description": "This is a test from the backend test suite.",
                "priority": "a_low"
            },
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200 on POST ticket, got {response.status_code}")
            return
        
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true on POST ticket")
            return
        
        ticket_data = data.get("data", {})
        new_ticket_id = ticket_data.get("id")
        
        if not new_ticket_id:
            result.add_fail(test_name, f"Expected ticket id in response")
            return
        
        if ticket_data.get("subject") != "Automated test ticket":
            result.add_fail(test_name, f"Expected subject='Automated test ticket', got: {ticket_data.get('subject')}")
            return
        
        print(f"  Created ticket ID: {new_ticket_id}")
        
        # Step c: Get ticket detail
        print(f"  Step c: Getting ticket detail")
        response = requests.get(
            f"{API_BASE}/subscriber/tickets/{new_ticket_id}",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200 on GET ticket detail, got {response.status_code}")
            return
        
        data = response.json()
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true on GET ticket detail")
            return
        
        detail_data = data.get("data", {})
        ticket = detail_data.get("ticket", {})
        replies = detail_data.get("replies", [])
        
        if ticket.get("subject") != "Automated test ticket":
            result.add_fail(test_name, f"Expected ticket subject='Automated test ticket'")
            return
        
        if not isinstance(replies, list):
            result.add_fail(test_name, f"Expected replies to be a list")
            return
        
        initial_reply_count = len(replies)
        print(f"  Initial reply count: {initial_reply_count}")
        
        # Step d: Add reply
        print(f"  Step d: Adding reply to ticket")
        response = requests.post(
            f"{API_BASE}/subscriber/tickets/{new_ticket_id}/reply",
            json={"message": "Automated reply from tests"},
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        if response.status_code != 200:
            result.add_fail(test_name, f"Expected HTTP 200 on POST reply, got {response.status_code}")
            return
        
        data = response.json()
        if not data.get("success"):
            result.add_fail(test_name, f"Expected success=true on POST reply")
            return
        
        # Step e: Verify reply was added
        print(f"  Step e: Verifying reply was added")
        response = requests.get(
            f"{API_BASE}/subscriber/tickets/{new_ticket_id}",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        data = response.json()
        detail_data = data.get("data", {})
        replies = detail_data.get("replies", [])
        
        if len(replies) != initial_reply_count + 1:
            result.add_fail(test_name, f"Expected {initial_reply_count + 1} replies, got {len(replies)}")
            return
        
        # Check latest reply message
        latest_reply = replies[-1]
        if latest_reply.get("message") != "Automated reply from tests":
            result.add_fail(test_name, f"Expected latest reply message='Automated reply from tests'")
            return
        
        print(f"  Reply verified: {latest_reply.get('message')}")
        
        # Step f: Verify total ticket count increased
        print(f"  Step f: Verifying total ticket count")
        response = requests.get(
            f"{API_BASE}/subscriber/tickets",
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        data = response.json()
        final_count = data.get("data", {}).get("filtered", 0)
        
        if final_count < initial_count + 1:
            result.add_fail(test_name, f"Expected final count >= {initial_count + 1}, got {final_count}")
            return
        
        print(f"  Final ticket count: {final_count}")
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


# ============================================================================
# AUTHORIZATION TESTS (A1-A4)
# ============================================================================

def test_a1_invoices_no_auth(result: TestResult):
    """A1: GET /api/subscriber/invoices without Authentication header"""
    test_name = "A1: Invoices without auth"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.get(
            f"{API_BASE}/subscriber/invoices",
            headers={"X-Location-Domain": SUBSCRIBER_DOMAIN},
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code != 401:
            result.add_fail(test_name, f"Expected HTTP 401, got {response.status_code}")
            return
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_a2_tickets_no_auth(result: TestResult):
    """A2: POST /api/subscriber/tickets without Authentication header"""
    test_name = "A2: Create ticket without auth"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.post(
            f"{API_BASE}/subscriber/tickets",
            json={
                "subject": "Test",
                "description": "Test",
                "priority": "a_low"
            },
            headers={"X-Location-Domain": SUBSCRIBER_DOMAIN},
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code != 401:
            result.add_fail(test_name, f"Expected HTTP 401, got {response.status_code}")
            return
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_a3_profile_patch_no_auth(result: TestResult):
    """A3: PATCH /api/subscriber/profile without Authentication header"""
    test_name = "A3: Profile PATCH without auth"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    try:
        response = requests.patch(
            f"{API_BASE}/subscriber/profile",
            json={"mobile2": "1234567890"},
            headers={"X-Location-Domain": SUBSCRIBER_DOMAIN},
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code != 401:
            result.add_fail(test_name, f"Expected HTTP 401, got {response.status_code}")
            return
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


def test_a4_change_password_wrong_current(result: TestResult, token: str):
    """A4: POST /api/subscriber/change-password with wrong current password"""
    test_name = "A4: Change password (wrong current)"
    print(f"\n{YELLOW}Running:{RESET} {test_name}")
    
    if not token:
        result.add_fail(test_name, "No token available")
        return
    
    try:
        response = requests.post(
            f"{API_BASE}/subscriber/change-password",
            json={
                "current_password": "WRONG_PASSWORD",
                "new_password": "newpass123"
            },
            headers={
                "Authentication": token,
                "X-Location-Domain": SUBSCRIBER_DOMAIN
            },
            timeout=30
        )
        
        print(f"  Status: {response.status_code}")
        data = response.json()
        
        if response.status_code != 401:
            result.add_fail(test_name, f"Expected HTTP 401, got {response.status_code}")
            return
        
        if data.get("success") != False:
            result.add_fail(test_name, f"Expected success=false")
            return
        
        message = data.get("message", "")
        if "password" not in message.lower():
            result.add_fail(test_name, f"Expected message about password, got: {message}")
            return
        
        result.add_pass(test_name)
        
    except Exception as e:
        result.add_fail(test_name, f"Exception: {str(e)}")


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def main():
    print(f"\n{'='*70}")
    print(f"XceedNet Backend API Testing - Phase 2 Customer Portal")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"{'='*70}")
    
    result = TestResult()
    
    # REGRESSION TESTS
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}REGRESSION TESTS (R1-R4){RESET}")
    print(f"{BLUE}{'='*70}{RESET}")
    
    subscriber_token = test_r1_subscriber_login_username(result)
    test_r2_subscriber_login_mobile(result)
    admin_token = test_r3_admin_login(result)
    test_r4_subscriber_dashboard(result, subscriber_token)
    
    # PHASE-2 TESTS
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}PHASE-2 TESTS (T1-T8){RESET}")
    print(f"{BLUE}{'='*70}{RESET}")
    
    test_t1_invoices_list(result, subscriber_token)
    test_t2_invoice_detail(result, subscriber_token)
    test_t3_invoice_not_found(result, subscriber_token)
    test_t4_invoice_pdf(result, subscriber_token)
    test_t5_payments_list(result, subscriber_token)
    test_t6_profile_get(result, subscriber_token)
    test_t7_profile_update(result, subscriber_token)
    test_t8_tickets_flow(result, subscriber_token)
    
    # AUTHORIZATION TESTS
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}AUTHORIZATION TESTS (A1-A4){RESET}")
    print(f"{BLUE}{'='*70}{RESET}")
    
    test_a1_invoices_no_auth(result)
    test_a2_tickets_no_auth(result)
    test_a3_profile_patch_no_auth(result)
    test_a4_change_password_wrong_current(result, subscriber_token)
    
    # Print summary
    success = result.summary()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
