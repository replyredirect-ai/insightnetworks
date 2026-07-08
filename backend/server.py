from fastapi import FastAPI, APIRouter, HTTPException, Header
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
    """Render a compact GST-style tax invoice PDF using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title=f"Invoice {inv.get('invoice_no', '')}",
        author="Insight Networks",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle", parent=styles["Heading1"],
        textColor=colors.HexColor("#0A1A33"), fontSize=22, spaceAfter=4,
    )
    accent_style = ParagraphStyle(
        "Accent", parent=styles["Normal"],
        textColor=colors.HexColor("#1E88FF"), fontSize=11, spaceAfter=8,
    )
    small = ParagraphStyle(
        "Small", parent=styles["Normal"], fontSize=9,
        textColor=colors.HexColor("#334155"),
    )
    label = ParagraphStyle(
        "Label", parent=styles["Normal"], fontSize=8,
        textColor=colors.HexColor("#64748B"),
    )
    value = ParagraphStyle(
        "Value", parent=styles["Normal"], fontSize=10,
        textColor=colors.HexColor("#0A1A33"),
    )

    currency = inv.get("amount_currency") or "INR"
    amount = _cents_to_amount(inv.get("amount_cents"), currency)
    other = _cents_to_amount(inv.get("other_charge_cents"), currency)
    cgst = _cents_to_amount(inv.get("cgst_amount_cents"), currency)
    sgst = _cents_to_amount(inv.get("sgst_amount_cents"), currency)
    igst = _cents_to_amount(inv.get("igst_amount_cents"), currency)
    total = _cents_to_amount(inv.get("total_amount_cents"), currency)

    story = []

    # Header
    header_left = [
        Paragraph("<b>INSIGHT NETWORKS</b>", title_style),
        Paragraph("Smart Networks. Stronger Business.", accent_style),
        Paragraph(
            "Bhopal, Madhya Pradesh, India<br/>"
            "Email: insightnetworks@hotmail.com<br/>"
            "Web: https://insightnet.in",
            small,
        ),
    ]
    header_right = [
        Paragraph("<b>TAX INVOICE</b>", ParagraphStyle(
            "TaxInv", parent=styles["Heading2"],
            alignment=2, textColor=colors.HexColor("#0A1A33"),
        )),
        Paragraph(
            f"<b>Invoice No:</b> {inv.get('invoice_no') or inv.get('id', '')}<br/>"
            f"<b>Invoice Date:</b> {inv.get('invoice_date') or '—'}<br/>"
            f"<b>Due By:</b> {inv.get('due_by') or '—'}<br/>"
            f"<b>Status:</b> {(inv.get('status') or '').replace('_', ' ').title()}",
            ParagraphStyle("RightMeta", parent=small, alignment=2),
        ),
    ]
    header_table = Table(
        [[header_left, header_right]],
        colWidths=[100 * mm, 74 * mm],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6 * mm))

    # Blue divider
    div = Table([[""]], colWidths=[174 * mm], rowHeights=[2])
    div.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1E88FF"))]))
    story.append(div)
    story.append(Spacer(1, 6 * mm))

    # Bill-to
    bill_to = [
        Paragraph("<b>BILL TO</b>", label),
        Paragraph(f"<b>{inv.get('subscriber_name') or '—'}</b>", value),
        Paragraph(f"Subscriber ID: {inv.get('subscriber_id') or '—'}", small),
    ]
    period = [
        Paragraph("<b>SERVICE PERIOD</b>", label),
        Paragraph(
            f"{inv.get('period_from') or '—'}  to  {inv.get('period_to') or '—'}",
            value,
        ),
        Paragraph(f"Package: {inv.get('location_package_name') or '—'}", small),
    ]
    bill_table = Table([[bill_to, period]], colWidths=[87 * mm, 87 * mm])
    bill_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (0, 0), 0.5, colors.HexColor("#E2E8F0")),
        ("BOX", (1, 0), (1, 0), 0.5, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(bill_table)
    story.append(Spacer(1, 8 * mm))

    # Line items
    items = [[
        Paragraph("<b>DESCRIPTION</b>", label),
        Paragraph("<b>SAC CODE</b>", label),
        Paragraph("<b>AMOUNT</b>", ParagraphStyle("R", parent=label, alignment=2)),
    ]]
    items.append([
        Paragraph(inv.get("description") or "Internet Service Charges", value),
        Paragraph(str(inv.get("sac_code") or "—"), value),
        Paragraph(amount, ParagraphStyle("R2", parent=value, alignment=2)),
    ])
    if inv.get("other_charge_applicable"):
        items.append([
            Paragraph(inv.get("other_charge_description") or "Other charges", value),
            Paragraph("—", value),
            Paragraph(other, ParagraphStyle("R3", parent=value, alignment=2)),
        ])
    items_table = Table(items, colWidths=[100 * mm, 30 * mm, 44 * mm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 6 * mm))

    # Totals
    right = ParagraphStyle("R4", parent=value, alignment=2)
    right_label = ParagraphStyle("RL", parent=small, alignment=2)
    totals_rows = [[Paragraph("Subtotal", right_label), Paragraph(amount, right)]]
    if inv.get("gst_applicable"):
        if float(inv.get("cgst_rate") or 0) > 0:
            totals_rows.append([Paragraph(f"CGST ({inv.get('cgst_rate')}%)", right_label), Paragraph(cgst, right)])
        if float(inv.get("sgst_rate") or 0) > 0:
            totals_rows.append([Paragraph(f"SGST ({inv.get('sgst_rate')}%)", right_label), Paragraph(sgst, right)])
        if float(inv.get("igst_rate") or 0) > 0:
            totals_rows.append([Paragraph(f"IGST ({inv.get('igst_rate')}%)", right_label), Paragraph(igst, right)])
    totals_rows.append([
        Paragraph("<b>TOTAL</b>", ParagraphStyle("TL", parent=value, alignment=2)),
        Paragraph(f"<b>{total}</b>", ParagraphStyle("TV", parent=value, alignment=2, textColor=colors.HexColor("#1E88FF"))),
    ])
    totals_table = Table(totals_rows, colWidths=[130 * mm, 44 * mm])
    totals_table.setStyle(TableStyle([
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#0A1A33")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 12 * mm))

    # Footer
    story.append(Paragraph(
        "This is a computer-generated invoice and does not require a signature.",
        ParagraphStyle("F", parent=small, alignment=1, textColor=colors.HexColor("#64748B")),
    ))

    doc.build(story)
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
