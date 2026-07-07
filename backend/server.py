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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# XceedNet API Configuration
XCEEDNET_BASE_URL = "https://admin.insightnet.in/api"

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# XceedNet Authentication Models
class SubscriberLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginRequest(BaseModel):
    email: str
    password: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Insight Networks API Proxy"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ===== XceedNet API Proxy Endpoints =====

@api_router.post("/subscriber/login")
async def subscriber_login(credentials: SubscriberLoginRequest):
    """
    Proxy for XceedNet Subscriber Login
    Endpoint: POST /sessions/subscriber-login
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{XCEEDNET_BASE_URL}/sessions/subscriber-login",
                json={
                    "subscriber": {
                        "username": credentials.username,
                        "password": credentials.password
                    }
                },
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            
            data = response.json()
            
            # XceedNet returns token in response
            if response.status_code == 200 or response.status_code == 201:
                return {
                    "success": True,
                    "token": data.get("token"),
                    "subscriber_id": data.get("subscriber_id"),
                    "subscriber": data.get("subscriber"),
                    "message": "Login successful"
                }
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content={
                        "success": False,
                        "message": data.get("error", "Login failed"),
                        "error": data.get("error_message", "Invalid credentials")
                    }
                )
                
    except httpx.RequestError as e:
        logger.error(f"Subscriber login error: {str(e)}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")
    except Exception as e:
        logger.error(f"Subscriber login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.post("/admin/login")
async def admin_login(credentials: AdminLoginRequest):
    """
    Proxy for XceedNet Admin Login
    Endpoint: POST /sessions/user-login
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{XCEEDNET_BASE_URL}/sessions/user-login",
                json={
                    "user": {
                        "email": credentials.email,
                        "password": credentials.password
                    }
                },
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            
            data = response.json()
            
            if response.status_code == 200 or response.status_code == 201:
                return {
                    "success": True,
                    "token": data.get("token"),
                    "user": data.get("user"),
                    "message": "Login successful"
                }
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content={
                        "success": False,
                        "message": data.get("error", "Login failed"),
                        "error": data.get("error_message", "Invalid credentials")
                    }
                )
                
    except httpx.RequestError as e:
        logger.error(f"Admin login error: {str(e)}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")
    except Exception as e:
        logger.error(f"Admin login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/subscriber/data")
async def get_subscriber_data(
    subscriber_id: Optional[str] = None,
    authentication: Optional[str] = Header(None)
):
    """
    Proxy to get subscriber details
    Endpoint: GET /subscribers/{id}
    """
    if not authentication:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{XCEEDNET_BASE_URL}/subscribers"
            if subscriber_id:
                url = f"{url}/{subscriber_id}"
            
            response = await client.get(
                url,
                headers={
                    "Authentication": authentication,
                    "Accept": "application/json"
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content=response.json()
                )
                
    except httpx.RequestError as e:
        logger.error(f"Get subscriber data error: {str(e)}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")
    except Exception as e:
        logger.error(f"Get subscriber data error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/dashboard/stats")
async def get_dashboard_stats(authentication: Optional[str] = Header(None)):
    """
    Proxy to get admin dashboard statistics
    Endpoint: GET /location_dashboard
    """
    if not authentication:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{XCEEDNET_BASE_URL}/location_dashboard",
                headers={
                    "Authentication": authentication,
                    "Accept": "application/json"
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content=response.json()
                )
                
    except httpx.RequestError as e:
        logger.error(f"Get dashboard stats error: {str(e)}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")
    except Exception as e:
        logger.error(f"Get dashboard stats error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/subscribers/list")
async def get_subscribers_list(
    authentication: Optional[str] = Header(None),
    page: int = 1,
    per_page: int = 50
):
    """
    Proxy to get subscribers list for admin
    Endpoint: GET /subscribers
    """
    if not authentication:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{XCEEDNET_BASE_URL}/subscribers",
                params={"page": page, "per_page": per_page},
                headers={
                    "Authentication": authentication,
                    "Accept": "application/json"
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content=response.json()
                )
                
    except httpx.RequestError as e:
        logger.error(f"Get subscribers list error: {str(e)}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")
    except Exception as e:
        logger.error(f"Get subscribers list error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/packages/list")
async def get_packages_list(authentication: Optional[str] = Header(None)):
    """
    Proxy to get packages list
    Endpoint: GET /location_packages
    """
    if not authentication:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{XCEEDNET_BASE_URL}/location_packages",
                headers={
                    "Authentication": authentication,
                    "Accept": "application/json"
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content=response.json()
                )
                
    except httpx.RequestError as e:
        logger.error(f"Get packages list error: {str(e)}")
        raise HTTPException(status_code=503, detail="XceedNet API unavailable")
    except Exception as e:
        logger.error(f"Get packages list error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()