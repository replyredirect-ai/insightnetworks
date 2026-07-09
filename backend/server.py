from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import base64
import json as jsonlib
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone
import httpx
import re
import time


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# XceedNet API Configuration
# Authentication endpoints live on the admin domain
XCEEDNET_AUTH_BASE_URL = os.environ.get('XCEEDNET_AUTH_BASE_URL', 'https://admin.insightnet.in')
# Default location subdomain used for subscriber login when the frontend doesn't send one
XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN = os.environ.get('XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN', 'bhopal.insightnet.in')
# Default location subdomain used for admin data fetches (dashboard, subscribers, packages)
XCEEDNET_DEFAULT_ADMIN_LOCATION = os.environ.get('XCEEDNET_DEFAULT_ADMIN_LOCATION', 'bhopal.insightnet.in')
# Service account used server-side to look up subscribers by mobile number
XCEEDNET_SERVICE_EMAIL = os.environ.get('XCEEDNET_SERVICE_EMAIL', '')
XCEEDNET_SERVICE_PASSWORD = os.environ.get('XCEEDNET_SERVICE_PASSWORD', '')

# Cached service admin token (in-memory; expires after ~50 minutes to be safe)
_service_token_cache = {"token": None, "expires_at": 0.0}

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


# XceedNet Authentication Models
class SubscriberLoginRequest(BaseModel):
    # `username` may contain either a real username OR a mobile number.
    # (Kept as `username` for backwards compatibility.)
    username: str
    password: str
    domain: Optional[str] = None  # e.g. "bhopal.insightnet.in"


class AdminLoginRequest(BaseModel):
    email: str
    password: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_domain(value: Optional[str], fallback: str) -> str:
    """Return a bare host name like `bhopal.insightnet.in` (strip scheme/path)."""
    v = (value or fallback or '').strip()
    if not v:
        return fallback
    if v.startswith('http://'):
        v = v[len('http://'):]
    elif v.startswith('https://'):
        v = v[len('https://'):]
    v = v.split('/', 1)[0]
    return v or fallback


def _xceednet_error_message(payload: dict, default: str = "Login failed") -> str:
    if not isinstance(payload, dict):
        return default
    # XceedNet returns either {"error": "..."} or {"error_message": "...", "error_status": "..."}
    return (
        payload.get('error_message')
        or payload.get('error')
        or payload.get('message')
        or default
    )


# --- Mobile-number login helpers ------------------------------------------

# Detect if the identifier a subscriber typed is really a mobile number.
# Accepts 10-15 digit strings, optionally with a leading '+', country code, or
# separators like spaces/hyphens (stripped before matching).
_MOBILE_RE = re.compile(r'^\+?\d{10,15}$')


def _is_mobile_number(value: str) -> bool:
    if not value:
        return False
    digits_only = re.sub(r'[\s\-()]', '', value.strip())
    return bool(_MOBILE_RE.match(digits_only))


def _normalize_mobile(value: str) -> str:
    """Return just the digits (drop +, spaces, hyphens, parens)."""
    return re.sub(r'\D', '', value or '')


async def _get_service_admin_token(force_refresh: bool = False) -> Optional[str]:
    """
    Return a cached admin token for the XceedNet service account so we can
    perform privileged lookups (e.g. resolve a mobile number → subscriber
    username). Re-logs in transparently when the cached token is expired.
    """
    if not XCEEDNET_SERVICE_EMAIL or not XCEEDNET_SERVICE_PASSWORD:
        return None

    now = time.time()
    if (not force_refresh
            and _service_token_cache["token"]
            and _service_token_cache["expires_at"] > now):
        return _service_token_cache["token"]

    url = f"{XCEEDNET_AUTH_BASE_URL}/api/v2/sessions/user_login"
    try:
        async with httpx.AsyncClient(timeout=20.0) as http_client:
            response = await http_client.post(
                url,
                json={
                    "email": XCEEDNET_SERVICE_EMAIL,
                    "password": XCEEDNET_SERVICE_PASSWORD,
                },
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
        if response.status_code in (200, 201):
            data = response.json() or {}
            token = data.get("auth_token")
            if token:
                # Cache for ~50 minutes; refresh proactively before typical expiry.
                _service_token_cache["token"] = token
                _service_token_cache["expires_at"] = now + 50 * 60
                return token
        logger.warning(
            "Service admin login failed (status=%s body=%s)",
            response.status_code, response.text[:200],
        )
    except httpx.RequestError as e:
        logger.error(f"Service admin login network error: {e}")
    return None


async def _lookup_subscriber_username_by_mobile(mobile: str, domain: str) -> Optional[str]:
    """
    Use the service admin token to search subscribers by mobile number and
    return the matching username. Returns None if not found.
    """
    token = await _get_service_admin_token()
    if not token:
        return None

    normalized = _normalize_mobile(mobile)
    # Try the exact number the user typed AND the last-10-digit form
    # (subscribers are stored with country code prefix like 919926625075).
    candidates = [normalized]
    if len(normalized) > 10:
        candidates.append(normalized[-10:])

    url = f"https://{domain}/subscribers/search"
    for _attempt in range(2):  # retry once after refreshing token on 401
        async with httpx.AsyncClient(timeout=20.0) as http_client:
            for search_value in candidates:
                try:
                    response = await http_client.post(
                        url,
                        json={
                            "search": {"value": search_value},
                            "start": 0,
                            "length": 5,
                            "draw": 0,
                        },
                        headers={
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            "Authentication": token,
                        },
                    )
                except httpx.RequestError as e:
                    logger.error(f"Subscriber lookup network error: {e}")
                    return None

                if response.status_code in (401, 403):
                    # Token might be expired — refresh once and retry.
                    token = await _get_service_admin_token(force_refresh=True)
                    if not token:
                        return None
                    break  # retry outer loop with new token

                if response.status_code != 200:
                    logger.warning(
                        "Subscriber search failed (%s): %s",
                        response.status_code, response.text[:200],
                    )
                    continue

                try:
                    data = response.json() or {}
                except Exception:
                    continue

                # XceedNet DataTables shape:
                # {"data": [[id, username, name, account_no, mobile1, ...], ...]}
                rows = data.get("data") or []
                for row in rows:
                    if not isinstance(row, list) or len(row) < 5:
                        continue
                    row_username = row[1] if isinstance(row[1], str) else None
                    row_mobile = _normalize_mobile(str(row[4] or ""))
                    if not row_username or not row_mobile:
                        continue
                    # Match on the last 10 digits (India mobile core) to ignore
                    # country-code differences.
                    if row_mobile[-10:] == normalized[-10:]:
                        return row_username
            else:
                # Both search values done without hitting 401 — stop.
                return None
    return None


# ---------------------------------------------------------------------------
# Health / status endpoints
# ---------------------------------------------------------------------------

@api_router.get("/")
async def root():
    return {"message": "Insight Networks API Proxy"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)

    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()

    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)

    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])

    return status_checks


# ---------------------------------------------------------------------------
# XceedNet API Proxy Endpoints
# ---------------------------------------------------------------------------

@api_router.post("/subscriber/login")
async def subscriber_login(credentials: SubscriberLoginRequest):
    """
    Proxy for XceedNet Subscriber Login. Accepts either a username OR a
    mobile number in the `username` field. If a mobile number is detected,
    we first resolve it to the actual XceedNet username via an admin-scoped
    subscriber search, then call subscriber_login with the resolved username.

    XceedNet endpoint: POST {AUTH_BASE_URL}/api/v2/sessions/subscriber_login
    Body: {"domain": "<location_subdomain>.<domain>", "username": "...", "password": "..."}
    Success response: {"auth_token": "eyJ..."}
    """
    domain = _normalize_domain(credentials.domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    raw_identifier = (credentials.username or "").strip()
    identifier_looked_up_via_mobile = False

    # If the identifier looks like a phone number, resolve it to the real
    # XceedNet username before calling subscriber_login.
    if _is_mobile_number(raw_identifier):
        resolved = await _lookup_subscriber_username_by_mobile(raw_identifier, domain)
        if not resolved:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "message": "No subscriber found for that mobile number.",
                    "upstream_status": 404,
                },
            )
        actual_username = resolved
        identifier_looked_up_via_mobile = True
    else:
        actual_username = raw_identifier

    url = f"{XCEEDNET_AUTH_BASE_URL}/api/v2/sessions/subscriber_login"
    payload = {
        "domain": domain,
        "username": actual_username,
        "password": credentials.password,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )

        try:
            data = response.json()
        except Exception:
            data = {}

        if response.status_code in (200, 201) and data.get("auth_token"):
            return {
                "success": True,
                "token": data["auth_token"],
                "domain": domain,
                "username": actual_username,
                "resolved_from_mobile": identifier_looked_up_via_mobile,
                "message": "Login successful",
            }

        # Bubble up the actual XceedNet error text with a proxy-friendly status
        status_code = 401 if response.status_code in (401, 404, 422) else response.status_code
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "message": _xceednet_error_message(data, "Invalid subscriber credentials"),
                "upstream_status": response.status_code,
            },
        )

    except httpx.RequestError as e:
        logger.error(f"Subscriber login network error: {e}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")


@api_router.post("/admin/login")
async def admin_login(credentials: AdminLoginRequest):
    """
    Proxy for XceedNet Admin (user) Login.

    XceedNet endpoint: POST {AUTH_BASE_URL}/api/v2/sessions/user_login
    Body: {"email": "...", "password": "..."}
    Success response: {"auth_token": "eyJ..."}
    """
    url = f"{XCEEDNET_AUTH_BASE_URL}/api/v2/sessions/user_login"
    payload = {"email": credentials.email, "password": credentials.password}

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )

        try:
            data = response.json()
        except Exception:
            data = {}

        if response.status_code in (200, 201) and data.get("auth_token"):
            return {
                "success": True,
                "token": data["auth_token"],
                "message": "Login successful",
            }

        status_code = 401 if response.status_code in (401, 404, 422) else response.status_code
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "message": _xceednet_error_message(data, "Invalid admin credentials"),
                "upstream_status": response.status_code,
            },
        )

    except httpx.RequestError as e:
        logger.error(f"Admin login network error: {e}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")


# --- Authenticated proxy helpers -----------------------------------------

async def _proxy_get(
    location_domain: str,
    path: str,
    auth_token: str,
    params: Optional[dict] = None,
):
    """GET a XceedNet resource on the given location subdomain."""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication token required")

    base = f"https://{location_domain}"
    url = f"{base}{path}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.get(
                url,
                params=params or {},
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authentication": auth_token,
                },
            )
        try:
            data = response.json()
        except Exception:
            data = {}
        return response.status_code, data
    except httpx.RequestError as e:
        logger.error(f"Proxy GET {url} error: {e}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")


async def _proxy_post(
    location_domain: str,
    path: str,
    auth_token: str,
    body: Optional[dict] = None,
):
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication token required")
    base = f"https://{location_domain}"
    url = f"{base}{path}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                url,
                json=body or {},
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authentication": auth_token,
                },
            )
        try:
            data = response.json()
        except Exception:
            data = {}
        return response.status_code, data
    except httpx.RequestError as e:
        logger.error(f"Proxy POST {url} error: {e}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")


# --- Subscriber authenticated endpoints ----------------------------------

@api_router.get("/subscriber/dashboard")
async def subscriber_dashboard(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """
    Fetch the currently authenticated subscriber's dashboard data.
    XceedNet endpoint: GET {SUBDOMAIN}/api/v2/subscribers/dashboard
    """
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)
    status, data = await _proxy_get(
        domain, "/api/v2/subscribers/dashboard", authentication
    )
    if status == 200:
        return {"success": True, "data": data}
    return JSONResponse(
        status_code=(401 if status in (401, 403) else status),
        content={"success": False, "message": _xceednet_error_message(data, "Failed to load dashboard"), "upstream_status": status},
    )


# Keep backwards-compatible alias used by the existing frontend service
@api_router.get("/subscriber/data")
async def subscriber_data_alias(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    return await subscriber_dashboard(
        authentication=authentication, x_location_domain=x_location_domain
    )


# --- Admin authenticated endpoints ---------------------------------------

@api_router.get("/admin/locations")
async def admin_locations(authentication: Optional[str] = Header(None)):
    """
    List locations the admin belongs to.
    XceedNet endpoint: GET {AUTH_BASE_URL}/location_subdomain_and_domains
    """
    if not authentication:
        raise HTTPException(status_code=401, detail="Authentication token required")

    url = f"{XCEEDNET_AUTH_BASE_URL}/location_subdomain_and_domains"
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.get(
                url,
                headers={
                    "Accept": "application/json",
                    "Authentication": authentication,
                },
            )
        try:
            data = response.json()
        except Exception:
            data = {}
        if response.status_code == 200:
            return {"success": True, "data": data.get("data", [])}
        return JSONResponse(
            status_code=(401 if response.status_code in (401, 403) else response.status_code),
            content={
                "success": False,
                "message": _xceednet_error_message(data, "Failed to load locations"),
                "upstream_status": response.status_code,
            },
        )
    except httpx.RequestError as e:
        logger.error(f"admin/locations network error: {e}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")


@api_router.get("/admin/dashboard")
async def admin_dashboard(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """
    Admin location dashboard stats.
    XceedNet endpoint: GET {SUBDOMAIN}/location_dashboard
    """
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_ADMIN_LOCATION)
    status, data = await _proxy_get(domain, "/location_dashboard", authentication)
    if status == 200:
        return {"success": True, "data": data}
    return JSONResponse(
        status_code=(401 if status in (401, 403) else status),
        content={"success": False, "message": _xceednet_error_message(data, "Failed to load dashboard"), "upstream_status": status},
    )


# Backwards-compat aliases used by the current frontend service
@api_router.get("/dashboard/stats")
async def dashboard_stats_alias(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    return await admin_dashboard(
        authentication=authentication, x_location_domain=x_location_domain
    )


@api_router.get("/subscribers/list")
async def subscribers_list(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
    q: Optional[str] = None,
    length: int = 25,
    start: int = 0,
):
    """
    Admin — list subscribers via XceedNet's datatable search endpoint.
    XceedNet endpoint: POST {SUBDOMAIN}/subscribers/search
    """
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_ADMIN_LOCATION)
    body = {
        "search": {"value": q or ""},
        "start": max(0, int(start)),
        "length": max(1, min(200, int(length))),
        "draw": 0,
    }
    status, data = await _proxy_post(domain, "/subscribers/search", authentication, body)
    if status == 200:
        return {"success": True, "data": data}
    return JSONResponse(
        status_code=(401 if status in (401, 403) else status),
        content={"success": False, "message": _xceednet_error_message(data, "Failed to load subscribers"), "upstream_status": status},
    )


@api_router.get("/packages/list")
async def packages_list(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """
    Admin — list packages for a location.
    XceedNet endpoint: GET {SUBDOMAIN}/location_packages
    """
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_ADMIN_LOCATION)
    status, data = await _proxy_get(domain, "/location_packages", authentication)
    if status == 200:
        return {"success": True, "data": data.get("data", data)}
    return JSONResponse(
        status_code=(401 if status in (401, 403) else status),
        content={"success": False, "message": _xceednet_error_message(data, "Failed to load packages"), "upstream_status": status},
    )


# ---------------------------------------------------------------------------
# Subscriber Portal — JWT/auth helpers
# ---------------------------------------------------------------------------

def _decode_jwt_payload(token: str) -> Optional[dict]:
    """Decode the JWT payload (no signature verification — we only use it to
    read the subscriber_id claim so we can proxy XceedNet on the caller's
    behalf). Returns None on any parse error."""
    if not token or not isinstance(token, str):
        return None
    try:
        parts = token.split('.')
        if len(parts) < 2:
            return None
        payload_b64 = parts[1]
        # Pad the base64 string if needed
        padding = '=' * (-len(payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + padding)
        return jsonlib.loads(payload_bytes.decode('utf-8'))
    except Exception:
        return None


def _subscriber_id_from_token(token: str) -> Optional[int]:
    payload = _decode_jwt_payload(token) or {}
    sid = payload.get('subscriber_id')
    try:
        return int(sid) if sid is not None else None
    except (ValueError, TypeError):
        return None


async def _require_subscriber(authentication: Optional[str]) -> int:
    """Guard for subscriber-only endpoints. Returns the subscriber_id."""
    if not authentication:
        raise HTTPException(status_code=401, detail="Authentication token required")
    sid = _subscriber_id_from_token(authentication)
    if not sid:
        raise HTTPException(status_code=401, detail="Invalid subscriber token")
    return sid


# ---------------------------------------------------------------------------
# Admin service-token proxy helpers
# ---------------------------------------------------------------------------

async def _admin_service_request(
    method: str,
    location_domain: str,
    path: str,
    *,
    body: Optional[dict] = None,
    params: Optional[dict] = None,
) -> tuple[int, Any]:
    """Send a request to XceedNet using the cached service admin token.
    Retries once with a fresh token on 401/403."""
    token = await _get_service_admin_token()
    if not token:
        return 503, {"error": "Service account not configured"}

    url = f"https://{location_domain}{path}"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authentication": token,
    }

    for _attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                if method.upper() == "GET":
                    response = await http_client.get(url, headers=headers, params=params or {})
                elif method.upper() == "POST":
                    response = await http_client.post(url, headers=headers, json=body or {})
                elif method.upper() == "PATCH":
                    response = await http_client.patch(url, headers=headers, json=body or {})
                elif method.upper() == "DELETE":
                    response = await http_client.delete(url, headers=headers, params=params or {})
                else:
                    return 405, {"error": "Method not allowed"}
        except httpx.RequestError as e:
            logger.error(f"Admin service request {method} {url} error: {e}")
            return 503, {"error": "XceedNet API unavailable"}

        try:
            data = response.json()
        except Exception:
            data = {}

        if response.status_code in (401, 403) and _attempt == 0:
            # Force-refresh token and retry once
            token = await _get_service_admin_token(force_refresh=True)
            if not token:
                return response.status_code, data
            headers["Authentication"] = token
            continue

        return response.status_code, data

    return 500, {"error": "Unexpected retry loop"}


# ---------------------------------------------------------------------------
# DataTables row → dict helpers for invoices / payments / tickets
# ---------------------------------------------------------------------------

# Row layouts observed from the live XceedNet responses (see Phase 2 discovery).
_INVOICE_COLUMNS = [
    "id", "invoiceid", "username", "subscriber_name",
    "invoice_date", "period_from", "due_by", "amount",
    "col_8", "status", "invoice_no",
]

_PAYMENT_COLUMNS = [
    "id", "payment_no", "paymentid", "username", "subscriber_name",
    "payment_date", "amount", "mode_of_payment",
    "received_by", "status", "extra",
]


def _row_to_dict(row: List[Any], columns: List[str]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for i, key in enumerate(columns):
        if i < len(row):
            out[key] = row[i]
    return out


def _cents_to_amount(cents: Optional[int], currency: str = "INR") -> str:
    if cents is None:
        return "—"
    try:
        rupees = int(cents) / 100.0
        symbol = "₹" if currency == "INR" else currency + " "
        return f"{symbol}{rupees:,.2f}"
    except Exception:
        return "—"


# ---------------------------------------------------------------------------
# Subscriber Portal — Invoices
# ---------------------------------------------------------------------------

@api_router.get("/subscriber/invoices")
async def subscriber_invoices(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
    length: int = 25,
    start: int = 0,
    q: Optional[str] = None,
):
    """List invoices for the currently-authenticated subscriber."""
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    body = {
        "subscriber_id": sid,
        "search": {"value": q or ""},
        "start": max(0, int(start)),
        "length": max(1, min(200, int(length))),
        "draw": 0,
    }
    status, data = await _admin_service_request(
        "POST", domain, "/subscriber_invoices/search", body=body
    )
    if status != 200:
        return JSONResponse(
            status_code=(401 if status in (401, 403) else status),
            content={
                "success": False,
                "message": _xceednet_error_message(data, "Failed to load invoices"),
                "upstream_status": status,
            },
        )
    rows = data.get("data") or []
    invoices = [_row_to_dict(r, _INVOICE_COLUMNS) for r in rows if isinstance(r, list)]
    return {
        "success": True,
        "data": {
            "total": data.get("recordsTotal"),
            "filtered": data.get("recordsFiltered"),
            "invoices": invoices,
        },
    }


@api_router.get("/subscriber/invoices/{invoice_id}")
async def subscriber_invoice_detail(
    invoice_id: int,
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """Get full invoice detail. Validates that the invoice belongs to the
    authenticated subscriber (defense in depth)."""
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    status, data = await _admin_service_request(
        "GET", domain, f"/subscriber_invoices/{invoice_id}"
    )
    if status != 200:
        return JSONResponse(
            status_code=(404 if status == 404 else 401 if status in (401, 403) else status),
            content={
                "success": False,
                "message": _xceednet_error_message(data, "Failed to load invoice"),
                "upstream_status": status,
            },
        )

    invoice = (data.get("data") if isinstance(data, dict) else None) or data
    if isinstance(invoice, dict) and int(invoice.get("subscriber_id") or 0) != sid:
        # An invoice belonging to a different subscriber — don't leak it.
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"success": True, "data": invoice}


@api_router.get("/subscriber/invoices/{invoice_id}/pdf")
async def subscriber_invoice_pdf(
    invoice_id: int,
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """Generate a professional GST invoice PDF from the XceedNet invoice data."""
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    status, data = await _admin_service_request(
        "GET", domain, f"/subscriber_invoices/{invoice_id}"
    )
    if status != 200:
        raise HTTPException(status_code=(status if status < 500 else 502), detail="Invoice not found")

    inv = (data.get("data") if isinstance(data, dict) else None) or data
    if not isinstance(inv, dict) or int(inv.get("subscriber_id") or 0) != sid:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pdf_bytes = _build_invoice_pdf(inv)
    filename = f"Invoice-{inv.get('invoice_no') or invoice_id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_invoice_pdf(inv: Dict[str, Any]) -> bytes:
    """Render a professional full-page GST tax-invoice PDF using ReportLab.

    Layout (A4):
      - Header band: logo (left) + TAX INVOICE + invoice meta (right)
      - Company info + Bill-To panels
      - Service period + package summary
      - Line items table with amount column
      - GST breakdown + grand total (highlighted)
      - Amount in words
      - Payment status + received date if paid
      - Terms & Conditions (numbered)
      - Footer: legal note + page number
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether,
    )

    # Register a Unicode-friendly font so ₹ / ✓ / → / — render properly.
    # DejaVu Sans is included in fonts-dejavu-core on all Debian/Ubuntu images.
    FONT_REGULAR = "Helvetica"
    FONT_BOLD = "Helvetica-Bold"
    _dejavu_dir = Path(__file__).parent / "assets"
    if (_dejavu_dir / "DejaVuSans.ttf").exists():
        try:
            if "DejaVuSans" not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont("DejaVuSans", str(_dejavu_dir / "DejaVuSans.ttf")))
                pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(_dejavu_dir / "DejaVuSans-Bold.ttf")))
                pdfmetrics.registerFontFamily(
                    "DejaVuSans",
                    normal="DejaVuSans", bold="DejaVuSans-Bold",
                    italic="DejaVuSans", boldItalic="DejaVuSans-Bold",
                )
            FONT_REGULAR = "DejaVuSans"
            FONT_BOLD = "DejaVuSans-Bold"
        except Exception as e:
            logger.warning(f"DejaVu font registration failed: {e}")

    NAVY = colors.HexColor("#0A1A33")
    BLUE = colors.HexColor("#1E88FF")
    LIGHT_BLUE = colors.HexColor("#E3F2FD")
    GREY_50 = colors.HexColor("#F8FAFC")
    GREY_100 = colors.HexColor("#F1F5F9")
    GREY_200 = colors.HexColor("#E2E8F0")
    GREY_500 = colors.HexColor("#64748B")
    GREEN = colors.HexColor("#16A34A")
    RED = colors.HexColor("#DC2626")

    # Company information (matches website /data/site.js CONTACT block)
    COMPANY = {
        "name": "INSIGHT NETWORKS",
        "tagline": "Connecting Today. Powering Tomorrow.",
        "address_lines": [
            "Block-B Aashima Royal City,",
            "Bhopal-462043, Madhya Pradesh, India",
        ],
        "phone": "+91 93024 52424",
        "email": "contact@insightnet.in",
        "web": "www.insightnet.in",
    }

    buf = io.BytesIO()

    def _footer_canvas(canvas, doc):
        canvas.saveState()
        # Bottom rule
        canvas.setStrokeColor(GREY_200)
        canvas.setLineWidth(0.5)
        canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
        # Left legal note
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(GREY_500)
        canvas.drawString(
            18 * mm, 10 * mm,
            "This is a computer-generated tax invoice and does not require a physical signature.",
        )
        # Right — company web + page number
        canvas.drawRightString(
            A4[0] - 18 * mm, 10 * mm,
            f"{COMPANY['web']}   |   Page {doc.page}",
        )
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=15 * mm, bottomMargin=22 * mm,
        title=f"Tax Invoice {inv.get('invoice_no') or inv.get('id', '')}",
        author=COMPANY["name"].title(),
    )

    styles = getSampleStyleSheet()
    EMDASH = "\u2014"
    ARROW = "\u2192"

    def P(text, size=9, color=NAVY, bold=False, align=TA_LEFT, leading=None):
        font = FONT_BOLD if bold else FONT_REGULAR
        return Paragraph(
            text,
            ParagraphStyle(
                "custom", parent=styles["Normal"],
                fontName=font, fontSize=size, textColor=color,
                alignment=align, leading=leading or (size * 1.25),
            ),
        )

    currency_sym = "\u20b9"  # ₹
    def money(cents):
        try:
            v = int(cents or 0) / 100.0
        except Exception:
            return f"{currency_sym}0.00"
        return f"{currency_sym}{v:,.2f}"

    def num_to_words_inr(rupees: float) -> str:
        """Compact Indian-numbering rupees-in-words helper."""
        rupees = round(rupees, 2)
        int_part = int(rupees)
        paise = int(round((rupees - int_part) * 100))

        under_20 = [
            "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
            "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
            "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
        ]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty",
                "Seventy", "Eighty", "Ninety"]

        def _under_hundred(n: int) -> str:
            if n < 20:
                return under_20[n]
            t, u = divmod(n, 10)
            return tens[t] + (" " + under_20[u] if u else "")

        def _under_thousand(n: int) -> str:
            h, r = divmod(n, 100)
            parts = []
            if h:
                parts.append(under_20[h] + " Hundred")
            if r:
                parts.append(_under_hundred(r))
            return " ".join(parts).strip()

        def _indian(n: int) -> str:
            if n == 0:
                return "Zero"
            parts = []
            crore, n = divmod(n, 10000000)
            lakh, n = divmod(n, 100000)
            thousand, n = divmod(n, 1000)
            hundred = n
            if crore:
                parts.append(_under_hundred(crore) + " Crore")
            if lakh:
                parts.append(_under_hundred(lakh) + " Lakh")
            if thousand:
                parts.append(_under_hundred(thousand) + " Thousand")
            if hundred:
                parts.append(_under_thousand(hundred))
            return " ".join(parts).strip()

        words = _indian(int_part) + " Rupees"
        if paise:
            words += " and " + _under_hundred(paise) + " Paise"
        words += " Only"
        return words

    story = []

    # -------- HEADER BAND ---------
    logo_path = Path(__file__).parent / "assets" / "logo.png"
    if logo_path.exists():
        logo_flowable = Image(str(logo_path), width=54 * mm, height=22 * mm)
        logo_flowable.hAlign = "LEFT"
    else:
        logo_flowable = P(
            f"<b>{COMPANY['name']}</b>", size=18, color=NAVY, bold=True,
        )

    header_right = [
        P("<b>TAX INVOICE</b>", size=18, color=NAVY, bold=True, align=TA_RIGHT),
        Spacer(1, 3),
        P(
            f"<b>Invoice No.</b>  {inv.get('invoice_no') or inv.get('id', '')}<br/>"
            f"<b>Invoice Date</b>  {inv.get('invoice_date') or EMDASH}<br/>"
            f"<b>Due Date</b>  {inv.get('due_by') or EMDASH}",
            size=9, color=NAVY, align=TA_RIGHT, leading=13,
        ),
    ]
    header_table = Table(
        [[logo_flowable, header_right]],
        colWidths=[110 * mm, 64 * mm],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # Tagline strip
    tagline = Table(
        [[P(COMPANY["tagline"].upper(), size=8, color=colors.white, bold=True, align=TA_CENTER)]],
        colWidths=[174 * mm], rowHeights=[7 * mm],
    )
    tagline.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(tagline)
    story.append(Spacer(1, 10))

    # -------- BILL FROM / BILL TO ---------
    bill_from = [
        P("BILL FROM", size=8, color=GREY_500, bold=True),
        P(f"<b>{COMPANY['name']}</b>", size=11, color=NAVY, bold=True),
        Spacer(1, 3),
        P(
            "<br/>".join(COMPANY["address_lines"])
            + f"<br/>Phone: {COMPANY['phone']}<br/>Email: {COMPANY['email']}<br/>Web: {COMPANY['web']}",
            size=8.5, color=NAVY, leading=12,
        ),
    ]
    bill_to = [
        P("BILL TO", size=8, color=GREY_500, bold=True),
        P(f"<b>{inv.get('subscriber_name') or EMDASH}</b>", size=11, color=NAVY, bold=True),
        Spacer(1, 3),
        P(
            f"Customer ID: <b>{inv.get('subscriber_id') or EMDASH}</b>"
            "<br/><br/>Service Location:<br/>Bhopal, Madhya Pradesh",
            size=8.5, color=NAVY, leading=12,
        ),
    ]
    parties_table = Table(
        [[bill_from, bill_to]],
        colWidths=[87 * mm, 87 * mm],
    )
    parties_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, 0), GREY_50),
        ("BACKGROUND", (1, 0), (1, 0), LIGHT_BLUE),
        ("BOX", (0, 0), (0, 0), 0.5, GREY_200),
        ("BOX", (1, 0), (1, 0), 0.5, BLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(parties_table)
    story.append(Spacer(1, 10))

    # -------- SERVICE / PERIOD SUMMARY ---------
    service_info = Table(
        [[
            P("SERVICE PERIOD", size=7.5, color=GREY_500, bold=True),
            P("PACKAGE", size=7.5, color=GREY_500, bold=True),
            P("STATUS", size=7.5, color=GREY_500, bold=True),
        ], [
            P(f"{inv.get('period_from') or EMDASH}  {ARROW}  {inv.get('period_to') or EMDASH}", size=9, color=NAVY, bold=True),
            P(inv.get("location_package_name") or "\u2014", size=9, color=NAVY, bold=True),
            P(
                (inv.get("status") or "").replace("_", " ").title() or "\u2014",
                size=9,
                color=GREEN if inv.get("status") == "payment_received" else NAVY,
                bold=True,
            ),
        ]],
        colWidths=[64 * mm, 60 * mm, 50 * mm],
    )
    service_info.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, 0), GREY_100),
        ("BOX", (0, 0), (-1, -1), 0.5, GREY_200),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, GREY_200),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(service_info)
    story.append(Spacer(1, 10))

    # -------- LINE ITEMS ---------
    items_header = [
        P("#", size=8, color=colors.white, bold=True, align=TA_CENTER),
        P("DESCRIPTION", size=8, color=colors.white, bold=True),
        P("SAC", size=8, color=colors.white, bold=True, align=TA_CENTER),
        P("QTY", size=8, color=colors.white, bold=True, align=TA_CENTER),
        P("AMOUNT", size=8, color=colors.white, bold=True, align=TA_RIGHT),
    ]
    items = [items_header]
    row_num = 1
    items.append([
        P(str(row_num), size=9, color=NAVY, align=TA_CENTER),
        P(
            f"<b>{inv.get('description') or 'Internet Service Charges'}</b><br/>"
            f"<font size=7 color='#64748B'>Package: {inv.get('location_package_name') or EMDASH}"
            f" \u00b7 Period: {inv.get('period_from') or ''} to {inv.get('period_to') or ''}</font>",
            size=9, color=NAVY, leading=12,
        ),
        P(str(inv.get("sac_code") or "998422"), size=9, color=NAVY, align=TA_CENTER),
        P("1", size=9, color=NAVY, align=TA_CENTER),
        P(money(inv.get("amount_cents")), size=9, color=NAVY, bold=True, align=TA_RIGHT),
    ])
    if inv.get("other_charge_applicable") and inv.get("other_charge_cents"):
        row_num += 1
        items.append([
            P(str(row_num), size=9, color=NAVY, align=TA_CENTER),
            P(inv.get("other_charge_description") or "Other Charges", size=9, color=NAVY),
            P("\u2014", size=9, color=NAVY, align=TA_CENTER),
            P("1", size=9, color=NAVY, align=TA_CENTER),
            P(money(inv.get("other_charge_cents")), size=9, color=NAVY, bold=True, align=TA_RIGHT),
        ])

    items_table = Table(items, colWidths=[10 * mm, 96 * mm, 20 * mm, 14 * mm, 34 * mm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.5, GREY_200),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, GREY_200),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 8))

    # -------- TOTALS ---------
    totals_rows = [[
        P("Subtotal", size=9, color=NAVY, align=TA_RIGHT),
        P(money(inv.get("amount_cents")), size=9, color=NAVY, bold=True, align=TA_RIGHT),
    ]]
    if inv.get("other_charge_applicable") and inv.get("other_charge_cents"):
        totals_rows.append([
            P("Other Charges", size=9, color=NAVY, align=TA_RIGHT),
            P(money(inv.get("other_charge_cents")), size=9, color=NAVY, align=TA_RIGHT),
        ])
    if inv.get("gst_applicable"):
        if float(inv.get("cgst_rate") or 0) > 0:
            totals_rows.append([
                P(f"CGST @ {inv.get('cgst_rate')}%", size=9, color=NAVY, align=TA_RIGHT),
                P(money(inv.get("cgst_amount_cents")), size=9, color=NAVY, align=TA_RIGHT),
            ])
        if float(inv.get("sgst_rate") or 0) > 0:
            totals_rows.append([
                P(f"SGST @ {inv.get('sgst_rate')}%", size=9, color=NAVY, align=TA_RIGHT),
                P(money(inv.get("sgst_amount_cents")), size=9, color=NAVY, align=TA_RIGHT),
            ])
        if float(inv.get("igst_rate") or 0) > 0:
            totals_rows.append([
                P(f"IGST @ {inv.get('igst_rate')}%", size=9, color=NAVY, align=TA_RIGHT),
                P(money(inv.get("igst_amount_cents")), size=9, color=NAVY, align=TA_RIGHT),
            ])
    total_str = money(inv.get("total_amount_cents"))
    totals_rows.append([
        P("<b>GRAND TOTAL</b>", size=11, color=colors.white, bold=True, align=TA_RIGHT),
        P(f"<b>{total_str}</b>", size=13, color=colors.white, bold=True, align=TA_RIGHT),
    ])

    totals_table = Table(totals_rows, colWidths=[130 * mm, 44 * mm])
    style_cmds = [
        ("BOX", (0, 0), (-1, -2), 0.5, GREY_200),
        ("LINEBEFORE", (0, 0), (0, -1), 0.5, GREY_200),
        ("LINEAFTER", (-1, 0), (-1, -1), 0.5, GREY_200),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, -1), (-1, -1), NAVY),
        ("TOPPADDING", (0, -1), (-1, -1), 10),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
    ]
    totals_table.setStyle(TableStyle(style_cmds))
    story.append(totals_table)
    story.append(Spacer(1, 6))

    # Amount in words
    try:
        total_rupees = float(inv.get("total_amount_cents") or 0) / 100.0
        words = num_to_words_inr(total_rupees)
    except Exception:
        words = ""
    if words:
        words_table = Table(
            [[
                P("AMOUNT IN WORDS", size=7.5, color=GREY_500, bold=True),
                P(f"<b>{words}</b>", size=9.5, color=NAVY, bold=True),
            ]],
            colWidths=[42 * mm, 132 * mm],
        )
        words_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), GREY_50),
            ("BOX", (0, 0), (-1, -1), 0.5, GREY_200),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(words_table)
        story.append(Spacer(1, 12))

    # Payment status banner
    status = (inv.get("status") or "").lower()
    if status == "payment_received":
        banner = Table(
            [[P(
                "\u2713 PAYMENT RECEIVED  \u00b7  Thank you for your business!",
                size=10, color=colors.white, bold=True, align=TA_CENTER,
            )]],
            colWidths=[174 * mm], rowHeights=[9 * mm],
        )
        banner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), GREEN),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(banner)
        story.append(Spacer(1, 10))
    elif status in ("open", "payment_pending"):
        banner = Table(
            [[P(
                f"PAYMENT PENDING  \u00b7  Please clear your dues by {inv.get('due_by') or 'the due date'}",
                size=10, color=colors.white, bold=True, align=TA_CENTER,
            )]],
            colWidths=[174 * mm], rowHeights=[9 * mm],
        )
        banner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), RED),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(banner)
        story.append(Spacer(1, 10))

    # -------- TERMS & CONDITIONS ---------
    terms = [
        "This invoice is generated for internet services rendered under the subscription agreement between the subscriber and Insight Networks.",
        "All amounts are stated in Indian Rupees (INR). GST is charged as per applicable rates and is subject to change per Government of India regulations.",
        "Payment must be received on or before the due date shown above. Continued service is contingent on timely payment.",
        "In case of any billing dispute, please contact us within 7 days of the invoice date at " + COMPANY["email"] + " or " + COMPANY["phone"] + ".",
        "Late payments may attract a service interruption. Reconnection charges may apply for suspended accounts.",
        "Refunds and cancellations are governed by the Insight Networks Refund & Cancellation Policy available at " + COMPANY["web"] + ".",
        "Please retain this document for your tax and accounting records. Duplicate copies can be re-downloaded from your customer portal at any time.",
    ]
    terms_content = [
        P("TERMS &amp; CONDITIONS", size=9, color=NAVY, bold=True),
        Spacer(1, 4),
    ]
    for i, term in enumerate(terms, 1):
        terms_content.append(
            P(f"<b>{i}.</b>  {term}", size=7.5, color=GREY_500, leading=11)
        )
        terms_content.append(Spacer(1, 2))

    terms_table = Table([[terms_content]], colWidths=[174 * mm])
    terms_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREY_50),
        ("BOX", (0, 0), (-1, -1), 0.5, GREY_200),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(KeepTogether(terms_table))

    story.append(Spacer(1, 10))
    story.append(P(
        f"For any queries, contact us at <b>{COMPANY['phone']}</b> or write to "
        f"<b>{COMPANY['email']}</b>. Visit <b>{COMPANY['web']}</b>.",
        size=8, color=GREY_500, align=TA_CENTER,
    ))

    doc.build(story, onFirstPage=_footer_canvas, onLaterPages=_footer_canvas)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Subscriber Portal — Payments
# ---------------------------------------------------------------------------

@api_router.get("/subscriber/payments")
async def subscriber_payments(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
    length: int = 25,
    start: int = 0,
    q: Optional[str] = None,
):
    """List payments for the currently-authenticated subscriber."""
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    body = {
        "subscriber_id": sid,
        "search": {"value": q or ""},
        "start": max(0, int(start)),
        "length": max(1, min(200, int(length))),
        "draw": 0,
    }
    status, data = await _admin_service_request(
        "POST", domain, "/subscriber_payments/search", body=body
    )
    if status != 200:
        return JSONResponse(
            status_code=(401 if status in (401, 403) else status),
            content={
                "success": False,
                "message": _xceednet_error_message(data, "Failed to load payments"),
                "upstream_status": status,
            },
        )
    rows = data.get("data") or []
    payments = [_row_to_dict(r, _PAYMENT_COLUMNS) for r in rows if isinstance(r, list)]
    return {
        "success": True,
        "data": {
            "total": data.get("recordsTotal"),
            "filtered": data.get("recordsFiltered"),
            "payments": payments,
        },
    }


# ---------------------------------------------------------------------------
# Subscriber Portal — Profile & Change Password
# ---------------------------------------------------------------------------

class SubscriberProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: Optional[str] = None
    mobile1: Optional[str] = None
    mobile2: Optional[str] = None
    address1: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@api_router.get("/subscriber/profile")
async def subscriber_profile(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """Full subscriber profile (dashboard endpoint already returns most of it,
    but we also expose it as /profile for a cleaner URL scheme)."""
    return await subscriber_dashboard(
        authentication=authentication, x_location_domain=x_location_domain
    )


@api_router.patch("/subscriber/profile")
async def subscriber_profile_update(
    payload: SubscriberProfileUpdate,
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """Update the current subscriber's editable profile fields via the
    XceedNet PATCH /subscribers/:id endpoint (server uses the service admin
    token so we don't require admin credentials from the subscriber)."""
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    fields = {k: v for k, v in payload.model_dump(exclude_none=True).items() if v != ""}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    status, data = await _admin_service_request(
        "PATCH", domain, f"/subscribers/{sid}", body={"subscriber": fields}
    )
    if status in (200, 201):
        return {
            "success": True,
            "message": (data.get("message") if isinstance(data, dict) else None) or "Profile updated",
            "data": data.get("data") if isinstance(data, dict) else data,
        }
    return JSONResponse(
        status_code=(401 if status in (401, 403) else status),
        content={
            "success": False,
            "message": _xceednet_error_message(data, "Failed to update profile"),
            "upstream_status": status,
        },
    )


@api_router.post("/subscriber/change-password")
async def subscriber_change_password(
    payload: ChangePasswordRequest,
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """Change the subscriber's password. We first verify the current password
    by attempting a subscriber_login, then send the new password via a
    service-account PATCH /subscribers/:id call."""
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    if not payload.new_password or len(payload.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password is too short")

    # First: fetch current username via the subscriber dashboard call
    dash_status, dash_data = await _proxy_get(
        domain, "/api/v2/subscribers/dashboard", authentication
    )
    if dash_status != 200:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    username = (dash_data or {}).get("username")
    if not username:
        raise HTTPException(status_code=500, detail="Could not identify subscriber account")

    # Verify current password by attempting a subscriber_login
    verify_url = f"{XCEEDNET_AUTH_BASE_URL}/api/v2/sessions/subscriber_login"
    try:
        async with httpx.AsyncClient(timeout=20.0) as http_client:
            v_resp = await http_client.post(
                verify_url,
                json={"domain": domain, "username": username, "password": payload.current_password},
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
        if v_resp.status_code not in (200, 201):
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Current password is not correct."},
            )
    except httpx.RequestError as e:
        logger.error(f"Change-password verify error: {e}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")

    # Now issue the update
    status, data = await _admin_service_request(
        "PATCH", domain, f"/subscribers/{sid}",
        body={"subscriber": {"password": payload.new_password}},
    )
    if status in (200, 201):
        return {"success": True, "message": "Password updated successfully."}
    return JSONResponse(
        status_code=(401 if status in (401, 403) else status),
        content={
            "success": False,
            "message": _xceednet_error_message(data, "Failed to change password"),
            "upstream_status": status,
        },
    )


# ---------------------------------------------------------------------------
# Subscriber Portal — Support Tickets
# ---------------------------------------------------------------------------

class TicketCreateRequest(BaseModel):
    subject: str
    description: str
    priority: Optional[str] = "a_low"  # a_low | b_medium | c_high | d_urgent
    due_by: Optional[str] = None  # YYYY-MM-DD


class TicketReplyRequest(BaseModel):
    message: str


@api_router.get("/subscriber/tickets")
async def subscriber_tickets_list(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
    length: int = 25,
    start: int = 0,
):
    """List support tickets for the current subscriber."""
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    body = {
        "subscriber_id": sid,
        "start": max(0, int(start)),
        "length": max(1, min(200, int(length))),
        "draw": 0,
    }
    status, data = await _admin_service_request(
        "POST", domain, "/location_tickets/search", body=body
    )
    if status != 200:
        return JSONResponse(
            status_code=(401 if status in (401, 403) else status),
            content={
                "success": False,
                "message": _xceednet_error_message(data, "Failed to load tickets"),
                "upstream_status": status,
            },
        )
    rows = data.get("data") or []
    columns_meta = data.get("columns") or {}
    col_keys = list(columns_meta.keys()) if isinstance(columns_meta, dict) else []
    tickets = []
    for row in rows:
        if not isinstance(row, list):
            continue
        item: Dict[str, Any] = {}
        for i, col in enumerate(col_keys):
            if i < len(row):
                short = col.split(".")[-1]
                item[short] = row[i]
        tickets.append(item)

    return {
        "success": True,
        "data": {
            "total": data.get("recordsTotal"),
            "filtered": data.get("recordsFiltered"),
            "tickets": tickets,
        },
    }


@api_router.post("/subscriber/tickets")
async def subscriber_tickets_create(
    payload: TicketCreateRequest,
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    body = {
        "location_ticket": {
            "subscriber_id": sid,
            "subject": payload.subject.strip(),
            "description": payload.description.strip(),
            "priority": payload.priority or "a_low",
        }
    }
    # XceedNet requires a due_by date — default to +7 days if not provided.
    if payload.due_by:
        body["location_ticket"]["due_by"] = payload.due_by
    else:
        from datetime import timedelta as _td
        body["location_ticket"]["due_by"] = (
            datetime.now(timezone.utc) + _td(days=7)
        ).strftime("%Y-%m-%d")

    status, data = await _admin_service_request(
        "POST", domain, "/location_tickets", body=body
    )
    if status in (200, 201):
        ticket = (data.get("data") if isinstance(data, dict) else None) or data
        # Log an opening entry in the local reply store so the timeline is complete.
        try:
            await db.ticket_replies.insert_one({
                "id": str(uuid.uuid4()),
                "ticket_id": ticket.get("id") if isinstance(ticket, dict) else None,
                "subscriber_id": sid,
                "author": "subscriber",
                "message": payload.description.strip(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.warning(f"ticket_replies insert (open) failed: {e}")
        return {"success": True, "data": ticket, "message": "Ticket created."}

    return JSONResponse(
        status_code=(401 if status in (401, 403) else status),
        content={
            "success": False,
            "message": _xceednet_error_message(data, "Failed to create ticket"),
            "upstream_status": status,
        },
    )


@api_router.get("/subscriber/tickets/{ticket_id}")
async def subscriber_ticket_detail(
    ticket_id: int,
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    status, data = await _admin_service_request(
        "GET", domain, f"/location_tickets/{ticket_id}"
    )
    if status != 200:
        return JSONResponse(
            status_code=(404 if status == 404 else 401 if status in (401, 403) else status),
            content={
                "success": False,
                "message": _xceednet_error_message(data, "Failed to load ticket"),
                "upstream_status": status,
            },
        )
    ticket = (data.get("data") if isinstance(data, dict) else None) or data
    if isinstance(ticket, dict) and ticket.get("subscriber_id") and int(ticket["subscriber_id"]) != sid:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Load reply thread from Mongo
    replies_cursor = db.ticket_replies.find(
        {"ticket_id": int(ticket_id)}, {"_id": 0}
    ).sort("created_at", 1)
    replies = await replies_cursor.to_list(500)

    return {"success": True, "data": {"ticket": ticket, "replies": replies}}


@api_router.post("/subscriber/tickets/{ticket_id}/reply")
async def subscriber_ticket_reply(
    ticket_id: int,
    payload: TicketReplyRequest,
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """Append a reply to the ticket. Since XceedNet doesn't expose a native
    ticket-comments API, we store replies in our own MongoDB collection."""
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Reply message is required")

    # Verify the ticket belongs to this subscriber
    status, data = await _admin_service_request(
        "GET", domain, f"/location_tickets/{ticket_id}"
    )
    if status != 200:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket = (data.get("data") if isinstance(data, dict) else None) or data
    if not isinstance(ticket, dict) or int(ticket.get("subscriber_id") or 0) != sid:
        raise HTTPException(status_code=404, detail="Ticket not found")

    reply_doc = {
        "id": str(uuid.uuid4()),
        "ticket_id": int(ticket_id),
        "subscriber_id": sid,
        "author": "subscriber",
        "message": payload.message.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ticket_replies.insert_one(reply_doc)
    reply_doc.pop("_id", None)
    return {"success": True, "data": reply_doc, "message": "Reply added."}


@api_router.get("/subscriber/statement/pdf")
async def subscriber_statement_pdf(
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """Generate a comprehensive Account Statement PDF containing subscriber profile,
    invoices summary, and payment history — one professional document per subscriber."""
    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    # Fetch profile (subscriber's own token OK)
    dash_status, dash_data = await _proxy_get(
        domain, "/api/v2/subscribers/dashboard", authentication
    )
    profile = dash_data if dash_status == 200 and isinstance(dash_data, dict) else {}

    # Fetch invoices (admin scope)
    inv_status, inv_data = await _admin_service_request(
        "POST", domain, "/subscriber_invoices/search",
        body={"subscriber_id": sid, "start": 0, "length": 200, "draw": 0},
    )
    invoices = []
    if inv_status == 200:
        for r in (inv_data.get("data") or []):
            if isinstance(r, list):
                invoices.append(_row_to_dict(r, _INVOICE_COLUMNS))

    # Fetch payments (admin scope)
    pay_status, pay_data = await _admin_service_request(
        "POST", domain, "/subscriber_payments/search",
        body={"subscriber_id": sid, "start": 0, "length": 200, "draw": 0},
    )
    payments = []
    if pay_status == 200:
        for r in (pay_data.get("data") or []):
            if isinstance(r, list):
                payments.append(_row_to_dict(r, _PAYMENT_COLUMNS))

    pdf_bytes = _build_account_statement_pdf(profile, invoices, payments)
    filename = f"AccountStatement-{profile.get('account_no') or sid}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_account_statement_pdf(
    profile: Dict[str, Any],
    invoices: List[Dict[str, Any]],
    payments: List[Dict[str, Any]],
) -> bytes:
    """Multi-section Account Statement PDF: header, subscriber summary,
    invoices table, payments table, footer."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak,
    )

    NAVY = colors.HexColor("#0A1A33")
    BLUE = colors.HexColor("#1E88FF")
    LIGHT_BLUE = colors.HexColor("#E3F2FD")
    GREY_50 = colors.HexColor("#F8FAFC")
    GREY_100 = colors.HexColor("#F1F5F9")
    _ = GREY_100  # noqa: F841 (retained for potential future use)
    GREY_200 = colors.HexColor("#E2E8F0")
    GREY_500 = colors.HexColor("#64748B")
    GREEN = colors.HexColor("#16A34A")

    FONT_REGULAR = "Helvetica"
    FONT_BOLD = "Helvetica-Bold"
    _dejavu_dir = Path(__file__).parent / "assets"
    if (_dejavu_dir / "DejaVuSans.ttf").exists():
        try:
            if "DejaVuSans" not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont("DejaVuSans", str(_dejavu_dir / "DejaVuSans.ttf")))
                pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(_dejavu_dir / "DejaVuSans-Bold.ttf")))
                pdfmetrics.registerFontFamily(
                    "DejaVuSans",
                    normal="DejaVuSans", bold="DejaVuSans-Bold",
                    italic="DejaVuSans", boldItalic="DejaVuSans-Bold",
                )
            FONT_REGULAR = "DejaVuSans"
            FONT_BOLD = "DejaVuSans-Bold"
        except Exception:
            pass

    COMPANY = {
        "name": "INSIGHT NETWORKS",
        "tagline": "Connecting Today. Powering Tomorrow.",
        "address_lines": [
            "Block-B Aashima Royal City,",
            "Bhopal-462043, Madhya Pradesh, India",
        ],
        "phone": "+91 93024 52424",
        "email": "contact@insightnet.in",
        "web": "www.insightnet.in",
    }

    styles = getSampleStyleSheet()

    def P(text, size=9, color=NAVY, bold=False, align=TA_LEFT, leading=None):
        font = FONT_BOLD if bold else FONT_REGULAR
        return Paragraph(
            text,
            ParagraphStyle(
                "s", parent=styles["Normal"],
                fontName=font, fontSize=size, textColor=color,
                alignment=align, leading=leading or (size * 1.25),
            ),
        )

    def money(cents):
        try:
            v = int(cents or 0) / 100.0
        except Exception:
            return "\u20b90.00"
        return f"\u20b9{v:,.2f}"

    def _footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(GREY_200)
        canvas.setLineWidth(0.5)
        canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(GREY_500)
        canvas.drawString(
            18 * mm, 10 * mm,
            "Account Statement generated by Insight Networks Subscriber Dashboard.",
        )
        canvas.drawRightString(
            A4[0] - 18 * mm, 10 * mm,
            f"{COMPANY['web']}   |   Page {doc.page}",
        )
        canvas.restoreState()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=15 * mm, bottomMargin=22 * mm,
        title=f"Account Statement — {profile.get('name') or profile.get('username') or 'Subscriber'}",
        author=COMPANY["name"].title(),
    )

    story = []

    # HEADER: logo + title
    logo_path = Path(__file__).parent / "assets" / "logo.png"
    if logo_path.exists():
        logo_flow = Image(str(logo_path), width=54 * mm, height=22 * mm)
        logo_flow.hAlign = "LEFT"
    else:
        logo_flow = P(f"<b>{COMPANY['name']}</b>", size=18, color=NAVY, bold=True)

    header_right = [
        P("<b>ACCOUNT STATEMENT</b>", size=18, color=NAVY, bold=True, align=TA_RIGHT),
        Spacer(1, 3),
        P(
            f"<b>Statement Date:</b>  {datetime.now().strftime('%d-%b-%Y')}<br/>"
            f"<b>Customer ID:</b>  {profile.get('id') or '-'}<br/>"
            f"<b>Account No.:</b>  {profile.get('account_no') or '-'}",
            size=9, color=NAVY, align=TA_RIGHT, leading=13,
        ),
    ]
    header_table = Table([[logo_flow, header_right]], colWidths=[110 * mm, 64 * mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # Blue tagline strip
    tag = Table(
        [[P(COMPANY["tagline"].upper(), size=8, color=colors.white, bold=True, align=TA_CENTER)]],
        colWidths=[174 * mm], rowHeights=[7 * mm],
    )
    tag.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BLUE)]))
    story.append(tag)
    story.append(Spacer(1, 12))

    # Subscriber summary card
    subscriber_lines = [
        P("SUBSCRIBER DETAILS", size=8, color=GREY_500, bold=True),
        Spacer(1, 3),
        P(f"<b>{profile.get('name') or profile.get('username') or '-'}</b>", size=11, color=NAVY, bold=True),
        P(
            f"Username: {profile.get('username') or '-'}<br/>"
            f"Email: {profile.get('email') or '-'}<br/>"
            f"Mobile: {profile.get('mobile1') or '-'}<br/>"
            f"Package: {profile.get('location_package_name') or '-'}",
            size=9, color=NAVY, leading=12,
        ),
    ]
    company_lines = [
        P("SERVICE PROVIDER", size=8, color=GREY_500, bold=True),
        Spacer(1, 3),
        P(f"<b>{COMPANY['name']}</b>", size=11, color=NAVY, bold=True),
        P(
            "<br/>".join(COMPANY["address_lines"])
            + f"<br/>Phone: {COMPANY['phone']}<br/>"
            f"Email: {COMPANY['email']}<br/>Web: {COMPANY['web']}",
            size=9, color=NAVY, leading=12,
        ),
    ]
    summary_table = Table(
        [[subscriber_lines, company_lines]],
        colWidths=[87 * mm, 87 * mm],
    )
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), LIGHT_BLUE),
        ("BACKGROUND", (1, 0), (1, 0), GREY_50),
        ("BOX", (0, 0), (0, 0), 0.5, BLUE),
        ("BOX", (1, 0), (1, 0), 0.5, GREY_200),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # Financial summary tiles
    total_invoiced = 0
    for inv in invoices:
        amt = str(inv.get("amount") or "").replace("\u20b9", "").replace(",", "")
        try:
            total_invoiced += float(amt) if amt else 0
        except Exception:
            pass
    total_paid = 0
    for p in payments:
        amt = str(p.get("amount") or "").replace("\u20b9", "").replace(",", "")
        try:
            total_paid += float(amt) if amt else 0
        except Exception:
            pass

    def tile(label, value, color=NAVY):
        return [
            P(label.upper(), size=7.5, color=GREY_500, bold=True, align=TA_CENTER),
            Spacer(1, 3),
            P(f"<b>{value}</b>", size=14, color=color, bold=True, align=TA_CENTER),
        ]
    tiles = Table(
        [[
            tile("Total Invoices", str(len(invoices))),
            tile("Total Payments", str(len(payments))),
            tile("Amount Invoiced", f"\u20b9{total_invoiced:,.2f}"),
            tile("Amount Paid", f"\u20b9{total_paid:,.2f}", GREEN),
        ]],
        colWidths=[43.5 * mm] * 4,
    )
    tiles.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREY_50),
        ("BOX", (0, 0), (-1, -1), 0.5, GREY_200),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, GREY_200),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(tiles)
    story.append(Spacer(1, 16))

    # INVOICES section
    story.append(P("INVOICES", size=12, color=NAVY, bold=True))
    story.append(Spacer(1, 6))

    inv_header = [
        P("#", size=8, color=colors.white, bold=True, align=TA_CENTER),
        P("INVOICE NO", size=8, color=colors.white, bold=True),
        P("DATE", size=8, color=colors.white, bold=True),
        P("DUE BY", size=8, color=colors.white, bold=True),
        P("AMOUNT", size=8, color=colors.white, bold=True, align=TA_RIGHT),
        P("STATUS", size=8, color=colors.white, bold=True),
    ]
    inv_rows = [inv_header]
    if invoices:
        for i, inv in enumerate(invoices, 1):
            inv_rows.append([
                P(str(i), size=8.5, color=NAVY, align=TA_CENTER),
                P(str(inv.get("invoice_no") or inv.get("id") or "-"), size=8.5, color=NAVY, bold=True),
                P(str(inv.get("invoice_date") or "-"), size=8.5, color=NAVY),
                P(str(inv.get("due_by") or "-"), size=8.5, color=NAVY),
                P(str(inv.get("amount") or "-"), size=8.5, color=NAVY, bold=True, align=TA_RIGHT),
                P(
                    (inv.get("status") or "").replace("_", " ").title(),
                    size=8, color=GREEN if inv.get("status") == "payment_received" else GREY_500,
                    bold=True,
                ),
            ])
    else:
        inv_rows.append([P("No invoices on record.", size=9, color=GREY_500, align=TA_CENTER)] + [""] * 5)

    inv_table = Table(inv_rows, colWidths=[8 * mm, 30 * mm, 30 * mm, 30 * mm, 32 * mm, 44 * mm])
    inv_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 0.5, GREY_200),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, GREY_200),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY_50]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(inv_table)
    story.append(Spacer(1, 16))

    # PAYMENTS section
    story.append(P("PAYMENT HISTORY", size=12, color=NAVY, bold=True))
    story.append(Spacer(1, 6))

    pay_header = [
        P("#", size=8, color=colors.white, bold=True, align=TA_CENTER),
        P("PAYMENT NO", size=8, color=colors.white, bold=True),
        P("DATE", size=8, color=colors.white, bold=True),
        P("AMOUNT", size=8, color=colors.white, bold=True, align=TA_RIGHT),
        P("MODE", size=8, color=colors.white, bold=True),
        P("STATUS", size=8, color=colors.white, bold=True),
    ]
    pay_rows = [pay_header]
    if payments:
        for i, p in enumerate(payments, 1):
            mode = (p.get("mode_of_payment") or "").replace("_", " ").title() or "-"
            pay_rows.append([
                P(str(i), size=8.5, color=NAVY, align=TA_CENTER),
                P(str(p.get("payment_no") or p.get("id") or "-"), size=8.5, color=NAVY, bold=True),
                P(str(p.get("payment_date") or "-"), size=8.5, color=NAVY),
                P(str(p.get("amount") or "-"), size=8.5, color=NAVY, bold=True, align=TA_RIGHT),
                P(mode, size=8.5, color=NAVY),
                P(
                    (p.get("status") or "").title(),
                    size=8,
                    color=GREEN if (p.get("status") or "").lower() in ("closed", "received") else GREY_500,
                    bold=True,
                ),
            ])
    else:
        pay_rows.append([P("No payments on record.", size=9, color=GREY_500, align=TA_CENTER)] + [""] * 5)

    pay_table = Table(pay_rows, colWidths=[8 * mm, 34 * mm, 26 * mm, 30 * mm, 32 * mm, 44 * mm])
    pay_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 0.5, GREY_200),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, GREY_200),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY_50]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(pay_table)
    story.append(Spacer(1, 16))

    # Contact card
    story.append(P(
        f"For any queries about this statement, contact us at <b>{COMPANY['phone']}</b> or write to "
        f"<b>{COMPANY['email']}</b>. Visit <b>{COMPANY['web']}</b>.",
        size=9, color=GREY_500, align=TA_CENTER,
    ))

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# CCAvenue Payment Gateway
# ---------------------------------------------------------------------------
import ccavenue  # noqa: E402

CCAVENUE_MERCHANT_ID = os.environ.get("CCAVENUE_MERCHANT_ID", "")
CCAVENUE_ACCESS_CODE = os.environ.get("CCAVENUE_ACCESS_CODE", "")
CCAVENUE_WORKING_KEY = os.environ.get("CCAVENUE_WORKING_KEY", "")
CCAVENUE_ENVIRONMENT = os.environ.get("CCAVENUE_ENVIRONMENT", "production")
CCAVENUE_REDIRECT_URL = os.environ.get("CCAVENUE_REDIRECT_URL", "")
CCAVENUE_CANCEL_URL = os.environ.get("CCAVENUE_CANCEL_URL", CCAVENUE_REDIRECT_URL)
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "")


class PaymentInitiateRequest(BaseModel):
    kind: str  # "invoice" | "recharge"
    invoice_id: Optional[int] = None      # required when kind = "invoice"
    amount: Optional[float] = None        # required when kind = "recharge"
    remark: Optional[str] = None


def _new_order_id(prefix: str) -> str:
    """Short, URL-safe, unique order id. CCAvenue caps order_id at 30 chars."""
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


@api_router.post("/payments/initiate")
async def payment_initiate(
    payload: PaymentInitiateRequest,
    authentication: Optional[str] = Header(None),
    x_location_domain: Optional[str] = Header(None),
):
    """Create a payment session in Mongo, encrypt a CCAvenue request payload,
    and return the transaction URL + encRequest for the frontend to POST."""
    if not (CCAVENUE_MERCHANT_ID and CCAVENUE_ACCESS_CODE and CCAVENUE_WORKING_KEY):
        raise HTTPException(status_code=503, detail="Payment gateway not configured")

    sid = await _require_subscriber(authentication)
    domain = _normalize_domain(x_location_domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)

    # Load subscriber profile (name/email/mobile for billing pre-fill)
    dash_status, dash_data = await _proxy_get(
        domain, "/api/v2/subscribers/dashboard", authentication
    )
    if dash_status != 200:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    profile = dash_data or {}

    kind = (payload.kind or "").lower()
    if kind not in ("invoice", "recharge"):
        raise HTTPException(status_code=400, detail="kind must be 'invoice' or 'recharge'")

    # Resolve amount + description
    invoice_no = None
    if kind == "invoice":
        if not payload.invoice_id:
            raise HTTPException(status_code=400, detail="invoice_id required for kind=invoice")
        inv_status, inv_data = await _admin_service_request(
            "GET", domain, f"/subscriber_invoices/{payload.invoice_id}"
        )
        inv = (inv_data.get("data") if isinstance(inv_data, dict) else None) if inv_status == 200 else None
        if not isinstance(inv, dict) or int(inv.get("subscriber_id") or 0) != sid:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if inv.get("status") == "payment_received":
            raise HTTPException(status_code=400, detail="This invoice is already paid")
        total_cents = int(inv.get("total_amount_cents") or inv.get("amount_cents") or 0)
        if total_cents <= 0:
            raise HTTPException(status_code=400, detail="Invoice amount is invalid")
        amount = round(total_cents / 100.0, 2)
        invoice_no = inv.get("invoice_no") or str(payload.invoice_id)
        description = f"Payment for invoice {invoice_no}"
    else:  # recharge
        if payload.amount is None or float(payload.amount) < 10:
            raise HTTPException(status_code=400, detail="Recharge amount must be at least ₹10")
        if float(payload.amount) > 100000:
            raise HTTPException(status_code=400, detail="Recharge amount too large")
        amount = round(float(payload.amount), 2)
        description = payload.remark or "Account recharge"

    order_id = _new_order_id("INS" if kind == "invoice" else "RCH")

    payment_doc = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "subscriber_id": sid,
        "username": profile.get("username"),
        "domain": domain,
        "kind": kind,
        "invoice_id": payload.invoice_id,
        "invoice_no": invoice_no,
        "amount": amount,
        "currency": "INR",
        "status": "Initiated",
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "gateway": "ccavenue",
        "environment": CCAVENUE_ENVIRONMENT,
    }
    await db.payments.insert_one(payment_doc)

    billing_name = profile.get("name") or profile.get("username") or "Subscriber"
    billing_email = profile.get("email") or "noreply@insightnet.in"
    billing_tel = str(profile.get("mobile1") or "").lstrip("+")[-10:] or ""
    billing_address = profile.get("address1") or profile.get("address2") or "Bhopal"
    billing_city = profile.get("city") or "Bhopal"
    billing_state = profile.get("state") or "Madhya Pradesh"
    billing_zip = profile.get("pincode") or "462043"

    params = {
        "merchant_id": CCAVENUE_MERCHANT_ID,
        "order_id": order_id,
        "currency": "INR",
        "amount": f"{amount:.2f}",
        "redirect_url": CCAVENUE_REDIRECT_URL,
        "cancel_url": CCAVENUE_CANCEL_URL,
        "language": "EN",
        # Billing block
        "billing_name": billing_name,
        "billing_email": billing_email,
        "billing_tel": billing_tel,
        "billing_address": billing_address,
        "billing_city": billing_city,
        "billing_state": billing_state,
        "billing_zip": billing_zip,
        "billing_country": "India",
        # Merchant metadata (echoed back in the callback for reconciliation)
        "merchant_param1": order_id,
        "merchant_param2": str(sid),
        "merchant_param3": kind,
        "merchant_param4": str(payload.invoice_id or ""),
        "merchant_param5": invoice_no or "",
    }
    plaintext = ccavenue.build_plaintext(params)
    enc_request = ccavenue.encrypt(plaintext, CCAVENUE_WORKING_KEY)

    return {
        "success": True,
        "order_id": order_id,
        "transaction_url": ccavenue.transaction_url(CCAVENUE_ENVIRONMENT),
        "enc_request": enc_request,
        "access_code": CCAVENUE_ACCESS_CODE,
        "amount": amount,
        "description": description,
    }


@api_router.post("/payments/ccavenue/callback")
async def ccavenue_callback(request: Request):
    """CCAvenue posts back here after payment. Decrypt, verify, update Mongo,
    optionally sync to XceedNet, and redirect the user to /payment-result."""
    form = await request.form()
    enc_resp = form.get("encResp") or ""
    if not enc_resp:
        return _payment_result_redirect(order_id="", status="Invalid", message="Missing response")

    try:
        plain = ccavenue.decrypt(enc_resp, CCAVENUE_WORKING_KEY)
        resp = ccavenue.parse_plaintext(plain)
    except Exception as e:
        logger.error(f"CCAvenue decrypt failed: {e}")
        return _payment_result_redirect(order_id="", status="Invalid", message="Bad response")

    order_id = resp.get("order_id", "")
    order_status = resp.get("order_status", "")
    amount_str = resp.get("amount", "0")
    tracking_id = resp.get("tracking_id", "")
    bank_ref_no = resp.get("bank_ref_no", "")
    payment_mode = resp.get("payment_mode", "")
    failure_message = resp.get("failure_message", "")

    payment_doc = await db.payments.find_one({"order_id": order_id})
    if not payment_doc:
        logger.warning(f"CCAvenue callback for unknown order_id={order_id}")
        return _payment_result_redirect(order_id=order_id, status="Invalid", message="Unknown order")

    # Amount tamper-check
    try:
        resp_amount = float(amount_str or 0)
    except (TypeError, ValueError):
        resp_amount = 0
    expected_amount = float(payment_doc.get("amount") or 0)

    status_map = {"Success": "Success", "Failure": "Failure",
                  "Aborted": "Aborted", "Invalid": "Invalid"}
    internal_status = status_map.get(order_status, "Failure")
    if internal_status == "Success" and abs(resp_amount - expected_amount) > 0.01:
        logger.warning(
            "CCAvenue amount mismatch order=%s expected=%.2f got=%.2f",
            order_id, expected_amount, resp_amount,
        )
        internal_status = "Invalid"
        failure_message = failure_message or "Amount mismatch"

    xceednet_sync = {"attempted": False, "success": False, "message": None}

    # If success and this was for a specific invoice, try to record the payment
    # in XceedNet so the invoice status flips to payment_received automatically.
    if internal_status == "Success" and payment_doc.get("kind") == "invoice" and payment_doc.get("invoice_id"):
        xceednet_sync["attempted"] = True
        try:
            amount_cents = int(round(resp_amount * 100))
            body = {
                "subscriber_payment": {
                    "subscriber_id": payment_doc["subscriber_id"],
                    "amount_cents": amount_cents,
                    "amount_currency": "INR",
                    "payment_date": datetime.now().strftime("%Y-%m-%d"),
                    "mode_of_payment": "online",
                    "remark": f"CCAvenue {tracking_id} / {bank_ref_no}",
                    "subscriber_invoice_id": payment_doc["invoice_id"],
                }
            }
            sync_status, sync_data = await _admin_service_request(
                "POST", payment_doc.get("domain", XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN),
                "/subscriber_payments", body=body,
            )
            if sync_status in (200, 201):
                xceednet_sync["success"] = True
                xceednet_sync["message"] = "Invoice marked as paid on XceedNet."
            else:
                xceednet_sync["message"] = _xceednet_error_message(sync_data, "Sync failed")
                logger.warning(f"XceedNet payment sync failed: {sync_status} {sync_data}")
        except Exception as e:
            xceednet_sync["message"] = str(e)
            logger.exception("XceedNet payment sync raised")

    await db.payments.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": internal_status,
            "order_status": order_status,
            "tracking_id": tracking_id,
            "bank_ref_no": bank_ref_no,
            "payment_mode": payment_mode,
            "failure_message": failure_message,
            "resp_amount": resp_amount,
            "xceednet_sync": xceednet_sync,
            "raw_response": {k: v for k, v in resp.items() if k not in ("card_number",)},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return _payment_result_redirect(
        order_id=order_id, status=internal_status,
        message=failure_message if internal_status != "Success" else "",
    )


def _payment_result_redirect(order_id: str, status: str, message: str = ""):
    """302 the browser to the React /payment-result page with query params."""
    from fastapi.responses import RedirectResponse
    from urllib.parse import quote
    base = FRONTEND_BASE_URL.rstrip("/") if FRONTEND_BASE_URL else ""
    url = f"{base}/payment-result?order_id={quote(order_id)}&status={quote(status)}"
    if message:
        url += f"&message={quote(message)}"
    return RedirectResponse(url=url, status_code=303)


@api_router.get("/payments/{order_id}")
async def get_payment(
    order_id: str,
    authentication: Optional[str] = Header(None),
):
    """Fetch a payment record for the payment-result page."""
    sid = await _require_subscriber(authentication)
    doc = await db.payments.find_one({"order_id": order_id}, {"_id": 0})
    if not doc or int(doc.get("subscriber_id") or 0) != sid:
        raise HTTPException(status_code=404, detail="Payment not found")
    # Strip anything we don't want to expose
    doc.pop("raw_response", None)
    return {"success": True, "data": doc}


# ---------------------------------------------------------------------------
# Wire up router + middleware
# ---------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',')],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
