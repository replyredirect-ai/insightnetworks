#!/usr/bin/env python3
"""
CCAvenue Payment Gateway Phase-3 Backend Test Suite
Tests all payment initiation, callback, and result endpoints.
"""
import sys
import httpx
import json
from typing import Dict, Any, Optional

# Backend URL (external preview URL)
BASE_URL = "https://network-hub-172.preview.emergentagent.com/api"

# Test credentials
SUBSCRIBER_USERNAME = "poriya.traders"
SUBSCRIBER_PASSWORD = "9926625075"
SUBSCRIBER_DOMAIN = "bhopal.insightnet.in"

# CCAvenue config (from .env)
CCAVENUE_MERCHANT_ID = "1936794"
CCAVENUE_ACCESS_CODE = "AVAZ89NC56AW30ZAWA"
CCAVENUE_WORKING_KEY = "9A36C6DD773113B207725DF9AD3784C9"

# Test state
subscriber_token = None
test_results = []


def log_test(test_id: str, passed: bool, message: str, details: Optional[Dict] = None):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {test_id}: {message}")
    test_results.append({
        "test_id": test_id,
        "passed": passed,
        "message": message,
        "details": details or {}
    })


def make_request(
    method: str,
    endpoint: str,
    token: Optional[str] = None,
    json_data: Optional[Dict] = None,
    form_data: Optional[Dict] = None,
    headers: Optional[Dict] = None,
    follow_redirects: bool = False,
) -> httpx.Response:
    """Make HTTP request to backend"""
    url = f"{BASE_URL}{endpoint}"
    req_headers = headers or {}
    
    if token:
        req_headers["Authentication"] = token
    
    req_headers["X-Location-Domain"] = SUBSCRIBER_DOMAIN
    
    with httpx.Client(timeout=30.0, follow_redirects=follow_redirects) as client:
        if method == "GET":
            return client.get(url, headers=req_headers)
        elif method == "POST":
            if form_data:
                return client.post(url, data=form_data, headers=req_headers)
            else:
                return client.post(url, json=json_data, headers=req_headers)
        elif method == "PATCH":
            return client.patch(url, json=json_data, headers=req_headers)
        elif method == "DELETE":
            return client.delete(url, headers=req_headers)
    
    raise ValueError(f"Unsupported method: {method}")


# ============================================================================
# INITIATE PAYMENT TESTS (I1-I8)
# ============================================================================

def test_i1_login():
    """I1: Login to get subscriber token"""
    global subscriber_token
    
    response = make_request(
        "POST",
        "/subscriber/login",
        json_data={
            "username": SUBSCRIBER_USERNAME,
            "password": SUBSCRIBER_PASSWORD,
            "domain": SUBSCRIBER_DOMAIN,
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and data.get("token"):
            subscriber_token = data["token"]
            log_test("I1", True, "Subscriber login successful", {"token_length": len(subscriber_token)})
            return True
        else:
            log_test("I1", False, f"Login response missing token: {data}")
            return False
    else:
        log_test("I1", False, f"Login failed: HTTP {response.status_code} - {response.text[:200]}")
        return False


def test_i2_initiate_recharge_100():
    """I2: Initiate recharge ₹100 (success case)"""
    response = make_request(
        "POST",
        "/payments/initiate",
        token=subscriber_token,
        json_data={
            "kind": "recharge",
            "amount": 100,
            "remark": "Test top-up"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify all required fields
        checks = {
            "success": data.get("success") == True,
            "order_id_prefix": str(data.get("order_id", "")).startswith("RCH-"),
            "transaction_url": str(data.get("transaction_url", "")).startswith("https://secure.ccavenue.com/transaction/"),
            "access_code": data.get("access_code") == CCAVENUE_ACCESS_CODE,
            "amount": data.get("amount") == 100.0,
            "enc_request_exists": bool(data.get("enc_request")),
        }
        
        # Verify enc_request is hex string
        enc_request = data.get("enc_request", "")
        enc_request_valid = (
            len(enc_request) > 100 and
            len(enc_request) % 32 == 0 and
            all(c in "0123456789abcdefABCDEF" for c in enc_request)
        )
        checks["enc_request_hex"] = enc_request_valid
        
        all_passed = all(checks.values())
        
        if all_passed:
            log_test("I2", True, "Recharge ₹100 initiated successfully", {
                "order_id": data.get("order_id"),
                "enc_request_length": len(enc_request),
                **checks
            })
            return data  # Return for C1 test
        else:
            log_test("I2", False, f"Recharge ₹100 validation failed: {checks}", data)
            return None
    else:
        log_test("I2", False, f"Recharge ₹100 failed: HTTP {response.status_code} - {response.text[:200]}")
        return None


def test_i3_initiate_recharge_below_minimum():
    """I3: Initiate recharge ₹5 (below minimum ₹10)"""
    response = make_request(
        "POST",
        "/payments/initiate",
        token=subscriber_token,
        json_data={
            "kind": "recharge",
            "amount": 5
        }
    )
    
    if response.status_code == 400:
        data = response.json()
        detail = data.get("detail", "").lower()
        if "at least" in detail or "minimum" in detail or "₹10" in detail or "10" in detail:
            log_test("I3", True, "Recharge ₹5 correctly rejected (below minimum)", {"detail": data.get("detail")})
            return True
        else:
            log_test("I3", False, f"Wrong error message for below minimum: {data.get('detail')}")
            return False
    else:
        log_test("I3", False, f"Expected HTTP 400, got {response.status_code}: {response.text[:200]}")
        return False


def test_i4_initiate_recharge_too_large():
    """I4: Initiate recharge ₹250000 (too large)"""
    response = make_request(
        "POST",
        "/payments/initiate",
        token=subscriber_token,
        json_data={
            "kind": "recharge",
            "amount": 250000
        }
    )
    
    if response.status_code == 400:
        data = response.json()
        detail = data.get("detail", "").lower()
        if "too large" in detail or "maximum" in detail or "exceed" in detail:
            log_test("I4", True, "Recharge ₹250000 correctly rejected (too large)", {"detail": data.get("detail")})
            return True
        else:
            log_test("I4", False, f"Wrong error message for too large: {data.get('detail')}")
            return False
    else:
        log_test("I4", False, f"Expected HTTP 400, got {response.status_code}: {response.text[:200]}")
        return False


def test_i5_initiate_paid_invoice():
    """I5: Initiate invoice payment for already-paid invoice (4668187)"""
    response = make_request(
        "POST",
        "/payments/initiate",
        token=subscriber_token,
        json_data={
            "kind": "invoice",
            "invoice_id": 4668187
        }
    )
    
    if response.status_code == 400:
        data = response.json()
        detail = data.get("detail", "").lower()
        if "already paid" in detail or "payment_received" in detail:
            log_test("I5", True, "Already-paid invoice correctly rejected", {"detail": data.get("detail")})
            return True
        else:
            log_test("I5", False, f"Wrong error message for paid invoice: {data.get('detail')}")
            return False
    else:
        log_test("I5", False, f"Expected HTTP 400, got {response.status_code}: {response.text[:200]}")
        return False


def test_i6_initiate_nonexistent_invoice():
    """I6: Initiate invoice payment for non-existent invoice"""
    response = make_request(
        "POST",
        "/payments/initiate",
        token=subscriber_token,
        json_data={
            "kind": "invoice",
            "invoice_id": 99999999
        }
    )
    
    if response.status_code == 404:
        data = response.json()
        detail = data.get("detail", "").lower()
        if "not found" in detail:
            log_test("I6", True, "Non-existent invoice correctly rejected", {"detail": data.get("detail")})
            return True
        else:
            log_test("I6", False, f"Wrong error message for non-existent invoice: {data.get('detail')}")
            return False
    else:
        log_test("I6", False, f"Expected HTTP 404, got {response.status_code}: {response.text[:200]}")
        return False


def test_i7_initiate_invalid_kind():
    """I7: Initiate with invalid kind"""
    response = make_request(
        "POST",
        "/payments/initiate",
        token=subscriber_token,
        json_data={
            "kind": "bogus",
            "amount": 100
        }
    )
    
    if response.status_code == 400:
        data = response.json()
        detail = data.get("detail", "").lower()
        if "kind" in detail:
            log_test("I7", True, "Invalid kind correctly rejected", {"detail": data.get("detail")})
            return True
        else:
            log_test("I7", False, f"Wrong error message for invalid kind: {data.get('detail')}")
            return False
    else:
        log_test("I7", False, f"Expected HTTP 400, got {response.status_code}: {response.text[:200]}")
        return False


def test_i8_initiate_no_auth():
    """I8: Initiate without Authentication header"""
    response = make_request(
        "POST",
        "/payments/initiate",
        token=None,  # No token
        json_data={
            "kind": "recharge",
            "amount": 100
        }
    )
    
    if response.status_code == 401:
        log_test("I8", True, "No auth correctly rejected with HTTP 401")
        return True
    else:
        log_test("I8", False, f"Expected HTTP 401, got {response.status_code}: {response.text[:200]}")
        return False


# ============================================================================
# CRYPTO ROUND-TRIP TEST (C1)
# ============================================================================

def test_c1_crypto_roundtrip(i2_response: Optional[Dict]):
    """C1: Decrypt enc_request and verify CCAvenue parameters"""
    if not i2_response:
        log_test("C1", False, "Skipped (I2 failed)")
        return None
    
    enc_request = i2_response.get("enc_request")
    order_id = i2_response.get("order_id")
    
    if not enc_request or not order_id:
        log_test("C1", False, "Missing enc_request or order_id from I2")
        return None
    
    try:
        # Import ccavenue module from backend
        sys.path.insert(0, "/app/backend")
        import ccavenue
        
        # Decrypt
        plain = ccavenue.decrypt(enc_request, CCAVENUE_WORKING_KEY)
        params = ccavenue.parse_plaintext(plain)
        
        # Verify all required parameters
        checks = {
            "merchant_id": params.get("merchant_id") == CCAVENUE_MERCHANT_ID,
            "order_id": params.get("order_id") == order_id,
            "currency": params.get("currency") == "INR",
            "amount": params.get("amount") == "100.00",
            "redirect_url": params.get("redirect_url", "").endswith("/api/payments/ccavenue/callback"),
            "cancel_url": params.get("cancel_url", "").endswith("/api/payments/ccavenue/callback"),
            "language": params.get("language") == "EN",
            "billing_name": bool(params.get("billing_name")),
            "billing_country": params.get("billing_country") == "India",
            "merchant_param3": params.get("merchant_param3") == "recharge",
        }
        
        all_passed = all(checks.values())
        
        if all_passed:
            log_test("C1", True, "Crypto round-trip successful, all params verified", {
                "decrypted_params": params,
                "checks": checks
            })
            return params
        else:
            log_test("C1", False, f"Crypto round-trip param validation failed: {checks}", params)
            return None
    except Exception as e:
        log_test("C1", False, f"Crypto round-trip exception: {str(e)}")
        return None


# ============================================================================
# CALLBACK TESTS (K1-K5)
# ============================================================================

def test_k1_callback_success(i2_response: Optional[Dict]):
    """K1: Simulate CCAvenue Success callback"""
    if not i2_response:
        log_test("K1", False, "Skipped (I2 failed)")
        return None
    
    order_id = i2_response.get("order_id")
    if not order_id:
        log_test("K1", False, "Missing order_id from I2")
        return None
    
    try:
        sys.path.insert(0, "/app/backend")
        import ccavenue
        
        # Build success response
        plain = (
            f"order_id={order_id}&"
            f"order_status=Success&"
            f"amount=100.00&"
            f"currency=INR&"
            f"tracking_id=TEST123456&"
            f"bank_ref_no=BR-TEST-001&"
            f"payment_mode=Test Card&"
            f"merchant_param1={order_id}&"
            f"merchant_param2=3637069&"
            f"merchant_param3=recharge&"
            f"merchant_param4=&"
            f"merchant_param5="
        )
        
        enc_resp = ccavenue.encrypt(plain, CCAVENUE_WORKING_KEY)
        
        # POST to callback (do NOT follow redirects)
        response = make_request(
            "POST",
            "/payments/ccavenue/callback",
            token=None,  # CCAvenue callbacks don't use auth
            form_data={"encResp": enc_resp},
            follow_redirects=False
        )
        
        # Should redirect (303 or 302)
        if response.status_code in (303, 302):
            location = response.headers.get("Location", "")
            if "/payment-result" in location and f"order_id={order_id}" in location and "status=Success" in location:
                log_test("K1", True, "Success callback processed, redirect correct", {
                    "status_code": response.status_code,
                    "location": location
                })
                return order_id
            else:
                log_test("K1", False, f"Redirect location incorrect: {location}")
                return None
        else:
            log_test("K1", False, f"Expected HTTP 303/302, got {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test("K1", False, f"Callback exception: {str(e)}")
        return None


def test_k2_verify_payment_status(order_id: Optional[str]):
    """K2: Verify payment status after K1"""
    if not order_id:
        log_test("K2", False, "Skipped (K1 failed)")
        return False
    
    response = make_request(
        "GET",
        f"/payments/{order_id}",
        token=subscriber_token
    )
    
    if response.status_code == 200:
        data = response.json()
        payment = data.get("data", {})
        
        checks = {
            "success": data.get("success") == True,
            "status": payment.get("status") == "Success",
            "tracking_id": payment.get("tracking_id") == "TEST123456",
            "bank_ref_no": payment.get("bank_ref_no") == "BR-TEST-001",
            "payment_mode": "Test" in str(payment.get("payment_mode", "")),
            "kind": payment.get("kind") == "recharge",
            "amount": payment.get("amount") == 100.0,
        }
        
        all_passed = all(checks.values())
        
        if all_passed:
            log_test("K2", True, "Payment status verified after callback", {
                "order_id": order_id,
                "checks": checks
            })
            return True
        else:
            log_test("K2", False, f"Payment status validation failed: {checks}", payment)
            return False
    else:
        log_test("K2", False, f"Get payment failed: HTTP {response.status_code} - {response.text[:200]}")
        return False


def test_k3_callback_failure():
    """K3: Simulate Failure callback"""
    # First initiate a new recharge
    response = make_request(
        "POST",
        "/payments/initiate",
        token=subscriber_token,
        json_data={
            "kind": "recharge",
            "amount": 250,
            "remark": "Test failure"
        }
    )
    
    if response.status_code != 200:
        log_test("K3", False, f"Failed to initiate recharge for K3: HTTP {response.status_code}")
        return False
    
    data = response.json()
    order_id = data.get("order_id")
    
    if not order_id:
        log_test("K3", False, "Missing order_id from initiate")
        return False
    
    try:
        sys.path.insert(0, "/app/backend")
        import ccavenue
        
        # Build failure response
        plain = (
            f"order_id={order_id}&"
            f"order_status=Failure&"
            f"amount=250.00&"
            f"currency=INR&"
            f"failure_message=Insufficient funds&"
            f"merchant_param1={order_id}&"
            f"merchant_param2=3637069&"
            f"merchant_param3=recharge"
        )
        
        enc_resp = ccavenue.encrypt(plain, CCAVENUE_WORKING_KEY)
        
        # POST to callback
        callback_response = make_request(
            "POST",
            "/payments/ccavenue/callback",
            token=None,
            form_data={"encResp": enc_resp},
            follow_redirects=False
        )
        
        # Should redirect with status=Failure
        if callback_response.status_code in (303, 302):
            location = callback_response.headers.get("Location", "")
            if "status=Failure" in location:
                # Now verify payment status
                verify_response = make_request(
                    "GET",
                    f"/payments/{order_id}",
                    token=subscriber_token
                )
                
                if verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    payment = verify_data.get("data", {})
                    
                    if payment.get("status") == "Failure" and "Insufficient" in str(payment.get("failure_message", "")):
                        log_test("K3", True, "Failure callback processed correctly", {
                            "order_id": order_id,
                            "status": payment.get("status"),
                            "failure_message": payment.get("failure_message")
                        })
                        return True
                    else:
                        log_test("K3", False, f"Payment status incorrect: {payment}")
                        return False
                else:
                    log_test("K3", False, f"Failed to verify payment: HTTP {verify_response.status_code}")
                    return False
            else:
                log_test("K3", False, f"Redirect location missing status=Failure: {location}")
                return False
        else:
            log_test("K3", False, f"Expected HTTP 303/302, got {callback_response.status_code}")
            return False
    except Exception as e:
        log_test("K3", False, f"K3 exception: {str(e)}")
        return False


def test_k4_callback_amount_tamper():
    """K4: Simulate amount tamper attack (Success but wrong amount)"""
    # First initiate a new recharge
    response = make_request(
        "POST",
        "/payments/initiate",
        token=subscriber_token,
        json_data={
            "kind": "recharge",
            "amount": 500,
            "remark": "Test tamper"
        }
    )
    
    if response.status_code != 200:
        log_test("K4", False, f"Failed to initiate recharge for K4: HTTP {response.status_code}")
        return False
    
    data = response.json()
    order_id = data.get("order_id")
    
    if not order_id:
        log_test("K4", False, "Missing order_id from initiate")
        return False
    
    try:
        sys.path.insert(0, "/app/backend")
        import ccavenue
        
        # Build tampered response (Success but amount=1.00 instead of 500.00)
        plain = (
            f"order_id={order_id}&"
            f"order_status=Success&"
            f"amount=1.00&"  # TAMPERED!
            f"currency=INR&"
            f"tracking_id=TAMPER123&"
            f"bank_ref_no=BR-TAMPER&"
            f"payment_mode=Test Card&"
            f"merchant_param1={order_id}&"
            f"merchant_param2=3637069&"
            f"merchant_param3=recharge"
        )
        
        enc_resp = ccavenue.encrypt(plain, CCAVENUE_WORKING_KEY)
        
        # POST to callback
        callback_response = make_request(
            "POST",
            "/payments/ccavenue/callback",
            token=None,
            form_data={"encResp": enc_resp},
            follow_redirects=False
        )
        
        # Should redirect
        if callback_response.status_code in (303, 302):
            # Verify payment status should be Invalid (not Success)
            verify_response = make_request(
                "GET",
                f"/payments/{order_id}",
                token=subscriber_token
            )
            
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                payment = verify_data.get("data", {})
                
                if payment.get("status") == "Invalid" and "mismatch" in str(payment.get("failure_message", "")).lower():
                    log_test("K4", True, "Amount tamper detected correctly", {
                        "order_id": order_id,
                        "status": payment.get("status"),
                        "failure_message": payment.get("failure_message")
                    })
                    return True
                else:
                    log_test("K4", False, f"Amount tamper NOT detected: {payment}")
                    return False
            else:
                log_test("K4", False, f"Failed to verify payment: HTTP {verify_response.status_code}")
                return False
        else:
            log_test("K4", False, f"Expected HTTP 303/302, got {callback_response.status_code}")
            return False
    except Exception as e:
        log_test("K4", False, f"K4 exception: {str(e)}")
        return False


def test_k5_callback_unknown_order():
    """K5: Callback with unknown order_id"""
    try:
        sys.path.insert(0, "/app/backend")
        import ccavenue
        
        # Build response with unknown order_id
        plain = (
            "order_id=UNKNOWN-ORDER-12345&"
            "order_status=Success&"
            "amount=100.00&"
            "currency=INR&"
            "tracking_id=TEST999&"
            "bank_ref_no=BR-TEST-999"
        )
        
        enc_resp = ccavenue.encrypt(plain, CCAVENUE_WORKING_KEY)
        
        # POST to callback
        response = make_request(
            "POST",
            "/payments/ccavenue/callback",
            token=None,
            form_data={"encResp": enc_resp},
            follow_redirects=False
        )
        
        # Should redirect with status=Invalid
        if response.status_code in (303, 302):
            location = response.headers.get("Location", "")
            if "status=Invalid" in location:
                log_test("K5", True, "Unknown order_id handled correctly", {
                    "location": location
                })
                return True
            else:
                log_test("K5", False, f"Expected status=Invalid in redirect: {location}")
                return False
        else:
            log_test("K5", False, f"Expected HTTP 303/302, got {response.status_code}")
            return False
    except Exception as e:
        log_test("K5", False, f"K5 exception: {str(e)}")
        return False


# ============================================================================
# OWNERSHIP TEST (O1)
# ============================================================================

def test_o1_ownership(k1_order_id: Optional[str]):
    """O1: Try to access payment with no token (should fail)"""
    if not k1_order_id:
        log_test("O1", False, "Skipped (K1 failed)")
        return False
    
    # Try without token
    response = make_request(
        "GET",
        f"/payments/{k1_order_id}",
        token=None  # No token
    )
    
    if response.status_code == 401:
        log_test("O1", True, "Payment access without token correctly rejected (HTTP 401)")
        return True
    else:
        log_test("O1", False, f"Expected HTTP 401, got {response.status_code}: {response.text[:200]}")
        return False


# ============================================================================
# REGRESSION TESTS (R1-R4)
# ============================================================================

def test_r1_subscriber_login():
    """R1: Subscriber login (regression)"""
    response = make_request(
        "POST",
        "/subscriber/login",
        json_data={
            "username": SUBSCRIBER_USERNAME,
            "password": SUBSCRIBER_PASSWORD,
            "domain": SUBSCRIBER_DOMAIN,
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and data.get("token"):
            log_test("R1", True, "Subscriber login working (regression)")
            return True
        else:
            log_test("R1", False, f"Login response invalid: {data}")
            return False
    else:
        log_test("R1", False, f"Login failed: HTTP {response.status_code}")
        return False


def test_r2_subscriber_dashboard():
    """R2: Subscriber dashboard (regression)"""
    response = make_request(
        "GET",
        "/subscriber/dashboard",
        token=subscriber_token
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and data.get("data"):
            log_test("R2", True, "Subscriber dashboard working (regression)")
            return True
        else:
            log_test("R2", False, f"Dashboard response invalid: {data}")
            return False
    else:
        log_test("R2", False, f"Dashboard failed: HTTP {response.status_code}")
        return False


def test_r3_subscriber_invoices():
    """R3: Subscriber invoices (regression)"""
    response = make_request(
        "GET",
        "/subscriber/invoices?length=100",
        token=subscriber_token
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") and "data" in data:
            log_test("R3", True, "Subscriber invoices working (regression)")
            return True
        else:
            log_test("R3", False, f"Invoices response invalid: {data}")
            return False
    else:
        log_test("R3", False, f"Invoices failed: HTTP {response.status_code}")
        return False


def test_r4_account_statement_pdf():
    """R4: Account statement PDF (regression)"""
    response = make_request(
        "GET",
        "/subscriber/statement/pdf",
        token=subscriber_token
    )
    
    if response.status_code == 200:
        content_type = response.headers.get("Content-Type", "")
        if "application/pdf" in content_type and len(response.content) > 1000:
            log_test("R4", True, "Account statement PDF working (regression)", {
                "content_type": content_type,
                "size": len(response.content)
            })
            return True
        else:
            log_test("R4", False, f"PDF response invalid: content_type={content_type}, size={len(response.content)}")
            return False
    else:
        log_test("R4", False, f"Statement PDF failed: HTTP {response.status_code}")
        return False


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def main():
    print("=" * 80)
    print("CCAvenue Payment Gateway Phase-3 Backend Test Suite")
    print("=" * 80)
    print()
    
    # INITIATE PAYMENT TESTS
    print("--- INITIATE PAYMENT TESTS (I1-I8) ---")
    test_i1_login()
    if not subscriber_token:
        print("\n❌ CRITICAL: Login failed, cannot continue with other tests")
        return
    
    i2_response = test_i2_initiate_recharge_100()
    test_i3_initiate_recharge_below_minimum()
    test_i4_initiate_recharge_too_large()
    test_i5_initiate_paid_invoice()
    test_i6_initiate_nonexistent_invoice()
    test_i7_initiate_invalid_kind()
    test_i8_initiate_no_auth()
    print()
    
    # CRYPTO ROUND-TRIP TEST
    print("--- CRYPTO ROUND-TRIP TEST (C1) ---")
    test_c1_crypto_roundtrip(i2_response)
    print()
    
    # CALLBACK TESTS
    print("--- CALLBACK TESTS (K1-K5) ---")
    k1_order_id = test_k1_callback_success(i2_response)
    test_k2_verify_payment_status(k1_order_id)
    test_k3_callback_failure()
    test_k4_callback_amount_tamper()
    test_k5_callback_unknown_order()
    print()
    
    # OWNERSHIP TEST
    print("--- OWNERSHIP TEST (O1) ---")
    test_o1_ownership(k1_order_id)
    print()
    
    # REGRESSION TESTS
    print("--- REGRESSION TESTS (R1-R4) ---")
    test_r1_subscriber_login()
    test_r2_subscriber_dashboard()
    test_r3_subscriber_invoices()
    test_r4_account_statement_pdf()
    print()
    
    # SUMMARY
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for r in test_results if r["passed"])
    failed = sum(1 for r in test_results if not r["passed"])
    total = len(test_results)
    
    print(f"Total: {total} | Passed: {passed} | Failed: {failed}")
    print()
    
    if failed > 0:
        print("FAILED TESTS:")
        for r in test_results:
            if not r["passed"]:
                print(f"  ❌ {r['test_id']}: {r['message']}")
        print()
    
    if passed == total:
        print("✅ ALL TESTS PASSED!")
    else:
        print(f"❌ {failed} TEST(S) FAILED")
    
    print("=" * 80)
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
