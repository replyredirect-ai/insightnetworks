from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
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
