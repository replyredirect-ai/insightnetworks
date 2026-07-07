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
    Proxy for XceedNet Subscriber Login.

    XceedNet endpoint: POST {AUTH_BASE_URL}/api/v2/sessions/subscriber_login
    Body: {"domain": "<location_subdomain>.<domain>", "username": "...", "password": "..."}
    Success response: {"auth_token": "eyJ..."}
    """
    domain = _normalize_domain(credentials.domain, XCEEDNET_DEFAULT_SUBSCRIBER_DOMAIN)
    url = f"{XCEEDNET_AUTH_BASE_URL}/api/v2/sessions/subscriber_login"
    payload = {
        "domain": domain,
        "username": credentials.username,
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
