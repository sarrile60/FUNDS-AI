"""
Traccia Fondi Backend (v4 — self-registration + persistent traces + scheduled emails)
======================================================================================

NEW FEATURES:
- Self-registration with bcrypt passwords (phone, date_of_birth, lang stored)
- Traces linked to user accounts (user_id on trace doc)
- APScheduler: 24 h and 50 h branded emails after trace creation
- Admin: registered-users list endpoint
- /api/users/me  /api/users/trace for profile page
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
from passlib.context import CryptContext

# APScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger

ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / ".env"

if env_path.exists():
    load_dotenv(env_path, override=True)
    print(f"[STARTUP] Loaded .env from {env_path}")
else:
    print(f"[STARTUP] WARNING: .env not found at {env_path}")

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
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")

# --- Bcrypt ---
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Cloudinary ---
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
    secure=True,
)
MAX_DOCS_PER_USER = 5
MAX_FILE_BYTES = 25 * 1024 * 1024
ALLOWED_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif",
    "application/pdf",
}

# --- Resend ---
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_RECOVERY = os.environ.get("RESEND_FROM_RECOVERY", "Traccia Fondi <recovery@traccia-fondi.com>")
RESEND_FROM_NOREPLY = os.environ.get("RESEND_FROM_NOREPLY", "Traccia Fondi <noreply@traccia-fondi.com>")
RESEND_REPLY_TO = os.environ.get("RESEND_REPLY_TO", "support@traccia-fondi.com")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# --- APScheduler ---
scheduler = AsyncIOScheduler()

# --- Rate limiter ---
_rate_buckets: Dict[str, deque] = defaultdict(deque)


def _rate_limit(key: str, max_requests: int, window_seconds: int):
    now = _time.time()
    q = _rate_buckets[key]
    while q and (now - q[0]) > window_seconds:
        q.popleft()
    if len(q) >= max_requests:
        retry = int(window_seconds - (now - q[0])) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please try again in {retry} seconds.",
        )
    q.append(now)


app = FastAPI(title="Traccia Fondi API", version="4.0.0")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("traccia-fondi")


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


def _bearer_optional(authorization: Optional[str]) -> Optional[str]:
    """Extract bearer token without raising if missing."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip()


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    payload = _decode_token(_bearer(authorization))
    role = payload.get("role")
    if role not in ("user", "registered_user"):
        raise HTTPException(403, "Forbidden")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def get_registered_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Require a self-registered user (not admin-created legacy)."""
    payload = _decode_token(_bearer(authorization))
    if payload.get("role") not in ("user", "registered_user"):
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


# Located amount ranges
TIER_HIGH_END = {
    "5000_20000":     (130000, 150000),
    "20000_50000":    (275000, 305000),
    "50000_100000":   (355000, 385000),
    "100000_plus":    (430000, 470000),
}


def _located_amount_for(tier: str) -> float:
    lo, hi = TIER_HIGH_END.get(tier, (18000, 19999))
    n = random.randint(lo, hi)
    units = random.randint(0, 999)
    n = (n // 1000) * 1000 + units
    if n < lo: n = lo + units
    if n > hi: n = hi - random.randint(0, 500)
    cents = random.randint(1, 99)
    return round(float(n) + cents / 100.0, 2)


def _fmt_amount(amount: float) -> str:
    """Format amount as Italian currency string."""
    return f"€ {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


# ============================================================
#   Email templates
# ============================================================

def _email_html_wrapper(title: str, body_html: str, year: int) -> str:
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#06122A;font-family:Arial,sans-serif;color:#E6EDF7">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#06122A">
<tr><td align="center" style="padding:32px 16px">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0E1A36;border:1px solid #1f2d4f;border-radius:14px;overflow:hidden">
    <tr><td style="padding:24px 32px;background:linear-gradient(90deg,#5FE3C9,#6E8BFF)">
      <div style="font-weight:800;color:#06122A;font-size:22px;letter-spacing:-0.02em">Traccia Fondi</div>
      <div style="color:#06122A;opacity:0.85;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-top:2px">{title}</div>
    </td></tr>
    <tr><td style="padding:28px 32px;color:#E6EDF7;font-size:14px;line-height:1.6">
      {body_html}
    </td></tr>
    <tr><td style="padding:14px 32px;background:#06122A;border-top:1px solid #1f2d4f;color:#6F7E9C;font-size:11px;text-align:center">
      © {year} Traccia Fondi · Privacy-first · GDPR aware
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>"""


async def send_24h_email(trace_id: str):
    """Send the 24-hour progress email for a trace."""
    try:
        trace = await db.traces.find_one({"id": trace_id}, {"_id": 0})
        if not trace:
            logger.warning("24h email: trace %s not found", trace_id)
            return
        if trace.get("email_24h_sent"):
            logger.info("24h email already sent for trace %s", trace_id)
            return

        to_email = trace.get("email")
        if not to_email:
            logger.warning("24h email: no email on trace %s", trace_id)
            await db.traces.update_one({"id": trace_id}, {"$set": {"email_24h_sent": True}})
            return

        lang = trace.get("user_lang", "it")
        first_name = trace.get("first_name", "")
        last_name = trace.get("last_name", "")
        year = datetime.now(timezone.utc).year

        # Pick a random number of transactions (2-3) for realism
        tx_count = random.randint(2, 3)

        if lang == "en":
            subject = "Case update — first transactions detected"
            body_html = f"""
<p>Dear <strong>{first_name} {last_name}</strong>,</p>
<p>We are writing to inform you of an important update on your case.</p>
<p>In the first <strong>24 hours</strong> of analysis, the Traccia Fondi system has identified
<strong style="color:#5FE3C9">{tx_count} transactions</strong> that show the path taken by your funds through
the banking and payment networks.</p>
<div style="background:#06122A;border:1px solid #1f2d4f;border-radius:10px;padding:16px;margin:16px 0">
  <div style="color:#9FB0CC;font-size:11px;letter-spacing:0.18em;text-transform:uppercase">Status</div>
  <div style="color:#5FE3C9;font-size:16px;font-weight:700;margin-top:4px">Investigation in progress</div>
  <div style="color:#9FB0CC;font-size:12px;margin-top:4px">Transactions detected: <strong style="color:#fff">{tx_count}</strong></div>
</div>
<p>Our team is continuing the in-depth analysis to achieve full disclosure of all transactions and
confirm the final location of your funds. You will receive a further update when the procedure is complete.</p>
<div style="background:rgba(255,107,122,0.08);border:1px solid rgba(255,107,122,0.3);border-radius:10px;padding:14px;margin:20px 0;color:#FF8B6A;font-size:13px">
  <strong>Security reminder:</strong> Never share passwords, OTP codes, seed phrases, banking credentials,
  or payment methods with anyone claiming to act on behalf of Traccia Fondi or any other organisation.
  We will never ask for them.
</div>
<p style="color:#9FB0CC;font-size:13px;margin-top:24px">Regards,<br/><strong style="color:#fff">Traccia Fondi — Case Intelligence Team</strong><br/><a href="mailto:support@traccia-fondi.com" style="color:#5FE3C9">support@traccia-fondi.com</a></p>"""
            html = _email_html_wrapper("Case Intelligence Update", body_html, year)
            text = (
                f"Dear {first_name} {last_name},\n\n"
                f"In the first 24 hours of analysis, the Traccia Fondi system has identified {tx_count} transactions "
                f"showing the path taken by your funds.\n\n"
                "Our team is continuing the in-depth analysis. You will receive a further update when complete.\n\n"
                "Security reminder: never share passwords, OTP codes, seed phrases or banking credentials with anyone.\n\n"
                "Traccia Fondi — Case Intelligence Team\nsupport@traccia-fondi.com"
            )
        else:
            subject = "Aggiornamento sul tuo caso — prime transazioni rilevate"
            body_html = f"""
<p>Gentile <strong>{first_name} {last_name}</strong>,</p>
<p>Ti scriviamo per informarti di un aggiornamento importante sul tuo caso.</p>
<p>Nelle prime <strong>24 ore</strong> di analisi, il sistema Traccia Fondi ha identificato
<strong style="color:#5FE3C9">{tx_count} transazioni</strong> che mostrano il percorso seguito dai tuoi fondi
attraverso le reti bancarie e di pagamento.</p>
<div style="background:#06122A;border:1px solid #1f2d4f;border-radius:10px;padding:16px;margin:16px 0">
  <div style="color:#9FB0CC;font-size:11px;letter-spacing:0.18em;text-transform:uppercase">Stato procedura</div>
  <div style="color:#5FE3C9;font-size:16px;font-weight:700;margin-top:4px">Indagine in corso</div>
  <div style="color:#9FB0CC;font-size:12px;margin-top:4px">Transazioni rilevate: <strong style="color:#fff">{tx_count}</strong></div>
</div>
<p>Il nostro team sta continuando l'analisi approfondita per ottenere la divulgazione completa di tutte
le transazioni e confermare la posizione finale dei tuoi fondi. Riceverai un ulteriore aggiornamento
al completamento della procedura.</p>
<div style="background:rgba(255,107,122,0.08);border:1px solid rgba(255,107,122,0.3);border-radius:10px;padding:14px;margin:20px 0;color:#FF8B6A;font-size:13px">
  <strong>Promemoria sicurezza:</strong> Non condividere mai password, codici OTP, seed phrase, credenziali bancarie
  o metodi di pagamento con nessuno che affermi di agire per conto di Traccia Fondi o di qualsiasi altra
  organizzazione. Non te li chiederemo mai.
</div>
<p style="color:#9FB0CC;font-size:13px;margin-top:24px">Cordiali saluti,<br/><strong style="color:#fff">Traccia Fondi — Case Intelligence Team</strong><br/><a href="mailto:support@traccia-fondi.com" style="color:#5FE3C9">support@traccia-fondi.com</a></p>"""
            html = _email_html_wrapper("Aggiornamento Case Intelligence", body_html, year)
            text = (
                f"Gentile {first_name} {last_name},\n\n"
                f"Nelle prime 24 ore di analisi, il sistema ha identificato {tx_count} transazioni che mostrano "
                f"il percorso dei tuoi fondi.\n\n"
                "Il team sta continuando l'analisi approfondita. Riceverai un ulteriore aggiornamento al completamento.\n\n"
                "Promemoria sicurezza: non condividere mai password, codici OTP, seed phrase o credenziali bancarie.\n\n"
                "Traccia Fondi — Case Intelligence Team\nsupport@traccia-fondi.com"
            )

        if RESEND_API_KEY:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: resend.Emails.send({
                "from": RESEND_FROM_NOREPLY,
                "to": [to_email],
                "reply_to": RESEND_REPLY_TO,
                "subject": subject,
                "text": text,
                "html": html,
                "tags": [{"name": "type", "value": "case_update_24h"}],
            }))
            logger.info("24h email sent to %s for trace %s", to_email, trace_id)
        else:
            logger.warning("24h email: RESEND_API_KEY not set, skipping send for trace %s", trace_id)

        await db.traces.update_one({"id": trace_id}, {"$set": {"email_24h_sent": True, "email_24h_sent_at": _now_iso()}})

    except Exception as e:
        logger.exception("24h email job failed for trace %s: %s", trace_id, e)


async def send_50h_email(trace_id: str):
    """Send the 50-hour funds-located email for a trace."""
    try:
        trace = await db.traces.find_one({"id": trace_id}, {"_id": 0})
        if not trace:
            logger.warning("50h email: trace %s not found", trace_id)
            return
        if trace.get("email_50h_sent"):
            logger.info("50h email already sent for trace %s", trace_id)
            return

        to_email = trace.get("email")
        if not to_email:
            logger.warning("50h email: no email on trace %s", trace_id)
            await db.traces.update_one({"id": trace_id}, {"$set": {"email_50h_sent": True}})
            return

        lang = trace.get("user_lang", "it")
        first_name = trace.get("first_name", "")
        last_name = trace.get("last_name", "")
        amount = trace.get("located_amount", 0)
        dest_name = trace.get("destination_name", "")
        dest_url = trace.get("destination_url", "")
        year = datetime.now(timezone.utc).year
        amount_str = _fmt_amount(amount)

        safe_url = dest_url
        if dest_url and not dest_url.startswith("http"):
            safe_url = f"http://{dest_url}"

        if lang == "en":
            subject = "Funds located — your case is ready for recovery"
            body_html = f"""
<p>Dear <strong>{first_name} {last_name}</strong>,</p>
<p>We are pleased to confirm that the Traccia Fondi tracing procedure is <strong>complete</strong>.</p>
<p>After thorough analysis of banking networks, SEPA circuits, and payment rails, the full amount
associated with your case has been located:</p>
<div style="background:#06122A;border:1px solid #1f2d4f;border-radius:10px;padding:20px;margin:16px 0;text-align:center">
  <div style="color:#9FB0CC;font-size:11px;letter-spacing:0.3em;text-transform:uppercase">Funds Located</div>
  <div style="color:#5FE3C9;font-size:32px;font-weight:900;margin-top:6px;font-family:monospace">{amount_str}</div>
  <div style="color:#9FB0CC;font-size:12px;margin-top:8px">Confirmed location: <strong style="color:#fff">{dest_name}</strong></div>
</div>
<p>A dedicated case agent will be in touch with you shortly with the next steps to complete the
recovery procedure and arrange the return of your funds.</p>
{f'<p style="margin-top:12px"><a href="{safe_url}" style="color:#5FE3C9;word-break:break-all">{safe_url}</a></p>' if dest_url else ''}
<div style="background:rgba(255,107,122,0.08);border:1px solid rgba(255,107,122,0.3);border-radius:10px;padding:14px;margin:20px 0;color:#FF8B6A;font-size:13px">
  <strong>Important security reminder:</strong> Traccia Fondi will never ask you to share passwords, OTP codes,
  seed phrases, private keys, or to make any payment to "unlock" or "release" your funds.
  If anyone contacts you claiming to charge fees, it is a scam — please report it immediately.
</div>
<p style="color:#9FB0CC;font-size:13px;margin-top:24px">Regards,<br/><strong style="color:#fff">Traccia Fondi — Case Intelligence Team</strong><br/><a href="mailto:support@traccia-fondi.com" style="color:#5FE3C9">support@traccia-fondi.com</a></p>"""
            html = _email_html_wrapper("Funds Located — Recovery Ready", body_html, year)
            text = (
                f"Dear {first_name} {last_name},\n\n"
                f"The Traccia Fondi tracing procedure is complete.\n\n"
                f"Located amount: {amount_str}\n"
                f"Confirmed location: {dest_name}\n\n"
                "A dedicated case agent will contact you shortly with next steps.\n\n"
                "Important: Traccia Fondi will never ask for passwords, OTP codes, seed phrases or any fees.\n\n"
                "Traccia Fondi — Case Intelligence Team\nsupport@traccia-fondi.com"
            )
        else:
            subject = "Fondi localizzati — il tuo caso è pronto per il recupero"
            body_html = f"""
<p>Gentile <strong>{first_name} {last_name}</strong>,</p>
<p>Siamo lieti di confermare che la procedura di tracciamento Traccia Fondi è <strong>completata</strong>.</p>
<p>Dopo un'analisi approfondita delle reti bancarie, dei circuiti SEPA e dei circuiti di pagamento,
l'importo completo associato al tuo caso è stato localizzato:</p>
<div style="background:#06122A;border:1px solid #1f2d4f;border-radius:10px;padding:20px;margin:16px 0;text-align:center">
  <div style="color:#9FB0CC;font-size:11px;letter-spacing:0.3em;text-transform:uppercase">Fondi Localizzati</div>
  <div style="color:#5FE3C9;font-size:32px;font-weight:900;margin-top:6px;font-family:monospace">{amount_str}</div>
  <div style="color:#9FB0CC;font-size:12px;margin-top:8px">Posizione confermata: <strong style="color:#fff">{dest_name}</strong></div>
</div>
<p>Un agente dedicato al tuo caso ti contatterà a breve con i passi successivi per completare la
procedura di recupero e organizzare la restituzione dei tuoi fondi.</p>
{f'<p style="margin-top:12px"><a href="{safe_url}" style="color:#5FE3C9;word-break:break-all">{safe_url}</a></p>' if dest_url else ''}
<div style="background:rgba(255,107,122,0.08);border:1px solid rgba(255,107,122,0.3);border-radius:10px;padding:14px;margin:20px 0;color:#FF8B6A;font-size:13px">
  <strong>Promemoria sicurezza importante:</strong> Traccia Fondi non ti chiederà mai di condividere password,
  codici OTP, seed phrase, chiavi private, né di effettuare pagamenti per "sbloccare" o "rilasciare" i tuoi fondi.
  Se qualcuno ti contatta chiedendo commissioni, si tratta di una truffa — segnalala immediatamente.
</div>
<p style="color:#9FB0CC;font-size:13px;margin-top:24px">Cordiali saluti,<br/><strong style="color:#fff">Traccia Fondi — Case Intelligence Team</strong><br/><a href="mailto:support@traccia-fondi.com" style="color:#5FE3C9">support@traccia-fondi.com</a></p>"""
            html = _email_html_wrapper("Fondi Localizzati — Recupero Pronto", body_html, year)
            text = (
                f"Gentile {first_name} {last_name},\n\n"
                f"La procedura di tracciamento Traccia Fondi è completata.\n\n"
                f"Importo localizzato: {amount_str}\n"
                f"Posizione confermata: {dest_name}\n\n"
                "Un agente dedicato ti contatterà a breve con i passi successivi.\n\n"
                "Importante: Traccia Fondi non ti chiederà mai password, codici OTP, seed phrase o pagamenti.\n\n"
                "Traccia Fondi — Case Intelligence Team\nsupport@traccia-fondi.com"
            )

        if RESEND_API_KEY:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: resend.Emails.send({
                "from": RESEND_FROM_NOREPLY,
                "to": [to_email],
                "reply_to": RESEND_REPLY_TO,
                "subject": subject,
                "text": text,
                "html": html,
                "tags": [{"name": "type", "value": "funds_located_50h"}],
            }))
            logger.info("50h email sent to %s for trace %s", to_email, trace_id)
        else:
            logger.warning("50h email: RESEND_API_KEY not set, skipping send for trace %s", trace_id)

        await db.traces.update_one({"id": trace_id}, {"$set": {"email_50h_sent": True, "email_50h_sent_at": _now_iso()}})

    except Exception as e:
        logger.exception("50h email job failed for trace %s: %s", trace_id, e)


def _schedule_trace_emails(trace_id: str, created_at_iso: str):
    """Schedule the 24h and 50h email jobs for a trace."""
    try:
        created_at = datetime.fromisoformat(created_at_iso.replace("Z", "+00:00"))
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)

        run_24h = created_at + timedelta(hours=24)
        run_50h = created_at + timedelta(hours=50)

        job_id_24 = f"email_24h_{trace_id}"
        job_id_50 = f"email_50h_{trace_id}"

        # Remove existing jobs to avoid duplicates on restart
        try:
            scheduler.remove_job(job_id_24)
        except Exception:
            pass
        try:
            scheduler.remove_job(job_id_50)
        except Exception:
            pass

        # If run time is in the past, schedule 5 seconds from now
        if run_24h <= now:
            run_24h = now + timedelta(seconds=5)
        if run_50h <= now:
            run_50h = now + timedelta(seconds=10)

        scheduler.add_job(
            send_24h_email,
            trigger=DateTrigger(run_date=run_24h),
            id=job_id_24,
            args=[trace_id],
            replace_existing=True,
            misfire_grace_time=3600,
        )
        scheduler.add_job(
            send_50h_email,
            trigger=DateTrigger(run_date=run_50h),
            id=job_id_50,
            args=[trace_id],
            replace_existing=True,
            misfire_grace_time=3600,
        )
        logger.info("Scheduled emails for trace %s: 24h=%s 50h=%s", trace_id, run_24h, run_50h)
    except Exception as e:
        logger.exception("Failed to schedule emails for trace %s: %s", trace_id, e)


# ============================================================
#   Schemas
# ============================================================

class HealthOut(BaseModel):
    status: str
    time: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    token: str
    user: Dict[str, Any]


# --- Self-registration ---
class UserRegistrationIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    date_of_birth: str = Field(min_length=1, max_length=20)  # YYYY-MM-DD
    lang: Optional[str] = "it"


# --- Admin user mgmt ---
class AdminUserIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    first_name: str
    last_name: str
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)
    recovery_destination: str
    notes: Optional[str] = None


class AdminUserUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    recovery_destination: Optional[str] = None
    notes: Optional[str] = None


class StartProcedureIn(BaseModel):
    amount_tier: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    date_of_birth: Optional[str] = None


class RecoveryRequestIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    message: Optional[str] = None


class RecoveryEmailUpdate(BaseModel):
    destination_login_email: Optional[str] = None
    destination_login_password: Optional[str] = None
    destination_login_url: Optional[str] = None
    extra_notes: Optional[str] = None


class GlobalSettingsUpdate(BaseModel):
    access_code: Optional[str] = None
    destination_name: Optional[str] = None
    destination_url: Optional[str] = None


class AccessCodeIn(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    destination_name: str = Field(min_length=1, max_length=200)
    destination_url: str = Field(max_length=500, default="")


class AccessCodeUpdate(BaseModel):
    code: Optional[str] = None
    destination_name: Optional[str] = None
    destination_url: Optional[str] = None


class StartTraceIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    access_code: str = Field(min_length=1, max_length=50)
    amount_tier: str


class CheckEmailIn(BaseModel):
    email: EmailStr


# ============================================================
#   Routes — health + auth
# ============================================================

@api.get("/health", response_model=HealthOut)
async def health():
    return HealthOut(status="ok", time=_now_iso())


# ============================================================
#   Email verification helper
# ============================================================

async def _send_verification_email(to_email: str, first_name: str, token: str, lang: str):
    """Send the email-verification link to a newly registered user."""
    verify_url = f"{APP_URL}/verify-email?token={token}"
    year = datetime.now(timezone.utc).year

    if lang == "en":
        subject = "Verify your Traccia Fondi account"
        body_html = f"""
<p>Hi <strong>{first_name}</strong>,</p>
<p>Thank you for registering with Traccia Fondi. Please verify your email address to activate your account and start the tracing procedure.</p>
<div style="text-align:center;margin:28px 0">
  <a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#5FE3C9,#6E8BFF);color:#06122A;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none">
    Verify my email
  </a>
</div>
<p style="color:#9FB0CC;font-size:12px">Or copy this link into your browser:<br/><a href="{verify_url}" style="color:#5FE3C9;word-break:break-all">{verify_url}</a></p>
<p style="color:#9FB0CC;font-size:12px">This link is valid for 48 hours. If you did not create this account, you can ignore this email.</p>
<div style="background:rgba(255,107,122,0.08);border:1px solid rgba(255,107,122,0.3);border-radius:10px;padding:14px;margin:20px 0;color:#FF8B6A;font-size:13px">
  <strong>Security:</strong> Traccia Fondi will never ask for passwords, OTP codes, seed phrases, or any fees.
</div>
<p style="color:#9FB0CC;font-size:13px;margin-top:24px">The Traccia Fondi Team<br/><a href="mailto:support@traccia-fondi.com" style="color:#5FE3C9">support@traccia-fondi.com</a></p>"""
        text = (
            f"Hi {first_name},\n\nPlease verify your email to activate your Traccia Fondi account:\n\n"
            f"{verify_url}\n\nThis link is valid for 48 hours.\n\nTraccia Fondi Team"
        )
    else:
        subject = "Verifica il tuo account Traccia Fondi"
        body_html = f"""
<p>Ciao <strong>{first_name}</strong>,</p>
<p>Grazie per esserti registrato su Traccia Fondi. Verifica il tuo indirizzo email per attivare l'account e avviare la procedura di tracciamento.</p>
<div style="text-align:center;margin:28px 0">
  <a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#5FE3C9,#6E8BFF);color:#06122A;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none">
    Verifica la mia email
  </a>
</div>
<p style="color:#9FB0CC;font-size:12px">Oppure copia questo link nel browser:<br/><a href="{verify_url}" style="color:#5FE3C9;word-break:break-all">{verify_url}</a></p>
<p style="color:#9FB0CC;font-size:12px">Il link è valido per 48 ore. Se non hai creato questo account, puoi ignorare questa email.</p>
<div style="background:rgba(255,107,122,0.08);border:1px solid rgba(255,107,122,0.3);border-radius:10px;padding:14px;margin:20px 0;color:#FF8B6A;font-size:13px">
  <strong>Sicurezza:</strong> Traccia Fondi non ti chiederà mai password, codici OTP, seed phrase o pagamenti.
</div>
<p style="color:#9FB0CC;font-size:13px;margin-top:24px">Il Team di Traccia Fondi<br/><a href="mailto:support@traccia-fondi.com" style="color:#5FE3C9">support@traccia-fondi.com</a></p>"""
        text = (
            f"Ciao {first_name},\n\nVerifica la tua email per attivare l'account Traccia Fondi:\n\n"
            f"{verify_url}\n\nIl link è valido per 48 ore.\n\nIl Team di Traccia Fondi"
        )

    html = _email_html_wrapper(
        "Verifica Email" if lang != "en" else "Email Verification",
        body_html, year
    )

    if RESEND_API_KEY:
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: resend.Emails.send({
                "from": RESEND_FROM_NOREPLY,
                "to": [to_email],
                "reply_to": RESEND_REPLY_TO,
                "subject": subject,
                "text": text,
                "html": html,
                "tags": [{"name": "type", "value": "email_verification"}],
            }))
            logger.info("Verification email sent to %s", to_email)
        except Exception as e:
            logger.exception("Failed to send verification email to %s: %s", to_email, e)
    else:
        logger.warning("RESEND_API_KEY not set — verification email not sent to %s (token: %s)", to_email, token)


@api.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn, request: Request):
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"login:{ip}", max_requests=8, window_seconds=300)

    em = body.email.lower().strip()

    if em == ADMIN_EMAIL and body.password == ADMIN_PASSWORD:
        return AuthOut(
            token=_make_token("admin", "admin"),
            user={"id": "admin", "email": ADMIN_EMAIL, "role": "admin", "first_name": "Admin", "last_name": ""},
        )

    user = await db.users.find_one({"email": em}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Invalid credentials")

    stored_pw = user.get("password", "")
    # Support both bcrypt (new self-registered) and plaintext (legacy admin-created)
    if stored_pw.startswith("$2"):
        # bcrypt hash
        if not pwd_ctx.verify(body.password, stored_pw):
            raise HTTPException(401, "Invalid credentials")
    else:
        # Legacy plaintext
        if stored_pw != body.password:
            raise HTTPException(401, "Invalid credentials")

    safe = {k: v for k, v in user.items() if k not in ("password",)}
    safe["role"] = "user"

    # Block login if email not verified (only for self-registered users)
    if user.get("type") == "registered" and not user.get("email_verified", False):
        raise HTTPException(403, "Please verify your email address before logging in. Check your inbox for the confirmation link.")

    return AuthOut(token=_make_token(user["id"], "user"), user=safe)


@api.post("/auth/register")
async def register(body: UserRegistrationIn, request: Request):
    """Self-registration — creates a new user with bcrypt password, sends verification email."""
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"register:{ip}", max_requests=5, window_seconds=600)

    em = body.email.lower().strip()

    # Check email uniqueness
    existing = await db.users.find_one({"email": em})
    if existing:
        raise HTTPException(400, "An account with this email already exists")

    # Hash password
    pw_hash = pwd_ctx.hash(body.password)
    verification_token = _new_id()

    doc = {
        "id": _new_id(),
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "email": em,
        "password": pw_hash,
        "date_of_birth": body.date_of_birth.strip(),
        "lang": body.lang or "it",
        "type": "registered",
        "role": "user",
        "email_verified": False,
        "email_verification_token": verification_token,
        "email_verification_sent_at": _now_iso(),
        # Legacy fields (kept for compat)
        "recovery_destination": None,
        "notes": "",
        "amount_tier": None,
        "located_amount": 0,
        "procedure_started_at": None,
        "procedure_completed_at": None,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(doc)

    # Send verification email
    await _send_verification_email(em, body.first_name.strip(), verification_token, body.lang or "it")

    return {"ok": True, "message": "Registration successful. Please check your email to verify your account."}


@api.get("/auth/verify-email")
async def verify_email(token: str):
    """Verify a user's email with the token from the link."""
    if not token:
        raise HTTPException(400, "Missing verification token")

    user = await db.users.find_one({"email_verification_token": token}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Invalid or expired verification link")

    if user.get("email_verified"):
        return {"ok": True, "already_verified": True, "message": "Email already verified"}

    await db.users.update_one(
        {"email_verification_token": token},
        {"$set": {"email_verified": True, "email_verified_at": _now_iso()}}
    )
    logger.info("Email verified for user %s", user.get("email"))
    return {"ok": True, "already_verified": False, "message": "Email verified successfully"}


@api.post("/auth/resend-verification")
async def resend_verification(body: CheckEmailIn, request: Request):
    """Resend the verification email for an unverified account."""
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"resend-verify:{ip}", max_requests=3, window_seconds=600)

    em = body.email.lower().strip()
    user = await db.users.find_one({"email": em}, {"_id": 0})
    if not user:
        # Don't reveal whether email exists
        return {"ok": True}
    if user.get("email_verified"):
        return {"ok": True}

    token = user.get("email_verification_token") or _new_id()
    await db.users.update_one({"email": em}, {"$set": {
        "email_verification_token": token,
        "email_verification_sent_at": _now_iso(),
    }})
    await _send_verification_email(em, user.get("first_name", ""), token, user.get("lang", "it"))
    return {"ok": True}


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
#   User profile endpoints
# ============================================================

@api.get("/users/me")
async def user_profile(user=Depends(get_current_user)):
    """Return the current user's profile (no password)."""
    return {k: v for k, v in user.items() if k != "password"}


@api.get("/users/trace")
async def user_trace(user=Depends(get_current_user)):
    """Return the current user's most recent trace, or null."""
    trace = await db.traces.find_one(
        {"user_id": user["id"]},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    return trace  # returns None → null in JSON


# ============================================================
#   Settings
# ============================================================

async def get_settings() -> dict:
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not settings:
        return {"id": "global", "access_code": "", "destination_name": "", "destination_url": ""}
    return settings


@api.get("/settings")
async def public_get_settings():
    return {"ok": True}


# ============================================================
#   Access Codes
# ============================================================

@api.get("/admin/access-codes")
async def admin_list_access_codes(_=Depends(require_admin)):
    codes = await db.access_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return codes


@api.post("/admin/access-codes")
async def admin_create_access_code(body: AccessCodeIn, _=Depends(require_admin)):
    code_upper = body.code.strip().upper()
    existing = await db.access_codes.find_one({"code": code_upper})
    if existing:
        raise HTTPException(400, f"Access code '{code_upper}' already exists")
    doc = {
        "id": _new_id(),
        "code": code_upper,
        "destination_name": body.destination_name.strip(),
        "destination_url": body.destination_url.strip(),
        "created_at": _now_iso(),
    }
    await db.access_codes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/access-codes/{code_id}")
async def admin_update_access_code(code_id: str, body: AccessCodeUpdate, _=Depends(require_admin)):
    update = {}
    if body.code is not None:
        new_code = body.code.strip().upper()
        existing = await db.access_codes.find_one({"code": new_code, "id": {"$ne": code_id}})
        if existing:
            raise HTTPException(400, f"Access code '{new_code}' already exists")
        update["code"] = new_code
    if body.destination_name is not None:
        update["destination_name"] = body.destination_name.strip()
    if body.destination_url is not None:
        update["destination_url"] = body.destination_url.strip()
    if not update:
        raise HTTPException(400, "No fields to update")
    res = await db.access_codes.update_one({"id": code_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Access code not found")
    return await db.access_codes.find_one({"id": code_id}, {"_id": 0})


@api.delete("/admin/access-codes/{code_id}")
async def admin_delete_access_code(code_id: str, _=Depends(require_admin)):
    res = await db.access_codes.delete_one({"id": code_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Access code not found")
    return {"ok": True}


@api.get("/admin/settings")
async def admin_get_settings(_=Depends(require_admin)):
    return await get_settings()


@api.put("/admin/settings")
async def admin_update_settings(body: GlobalSettingsUpdate, _=Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    await db.settings.update_one({"id": "global"}, {"$set": update}, upsert=True)
    return await get_settings()


# ============================================================
#   Trace System
# ============================================================

@api.post("/trace/check-email")
async def check_email_used(body: CheckEmailIn, request: Request):
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"check-email:{ip}", max_requests=20, window_seconds=60)
    em = body.email.lower().strip()
    existing = await db.traces.find_one({"email": em})
    return {"used": existing is not None}


@api.post("/trace/start")
async def start_trace(body: StartTraceIn, request: Request, authorization: Optional[str] = Header(None)):
    """
    Start a new trace. If a valid JWT is present, links the trace to the user account.
    Access code is still required.
    """
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"trace:{ip}", max_requests=5, window_seconds=300)

    if body.amount_tier not in TIER_HIGH_END:
        raise HTTPException(400, "Invalid amount_tier")

    code_entry = await db.access_codes.find_one({"code": body.access_code.strip().upper()}, {"_id": 0})
    if not code_entry:
        raise HTTPException(401, "Invalid access code")

    em = body.email.lower().strip()

    # Resolve user from JWT (optional)
    user_id = None
    user_lang = "it"
    token_str = _bearer_optional(authorization)
    if token_str:
        try:
            payload = _decode_token(token_str)
            if payload.get("role") in ("user", "registered_user"):
                u = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
                if u:
                    user_id = u["id"]
                    user_lang = u.get("lang", "it")
                    # Check: user already has an active trace?
                    existing_user_trace = await db.traces.find_one({"user_id": user_id})
                    if existing_user_trace:
                        raise HTTPException(400, "You already have an active trace. Each account can only have one trace at a time.")
        except HTTPException:
            raise
        except Exception:
            pass  # Invalid token, treat as public

    # If no user_id, check email uniqueness (legacy behavior)
    if not user_id:
        existing = await db.traces.find_one({"email": em})
        if existing:
            raise HTTPException(400, "This email has already been used for a trace.")

    located = _located_amount_for(body.amount_tier)

    trace = {
        "id": _new_id(),
        "user_id": user_id,
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "email": em,
        "amount_tier": body.amount_tier,
        "located_amount": located,
        "code_used": code_entry["code"],
        "destination_name": code_entry.get("destination_name", ""),
        "destination_url": code_entry.get("destination_url", ""),
        "documents": [],
        "status": "started",
        "user_lang": user_lang,
        "email_24h_sent": False,
        "email_50h_sent": False,
        "email_24h_sent_at": None,
        "email_50h_sent_at": None,
        "created_at": _now_iso(),
        "completed_at": None,
    }
    await db.traces.insert_one(trace)
    trace.pop("_id", None)

    # Schedule email jobs
    _schedule_trace_emails(trace["id"], trace["created_at"])

    return {
        "trace_id": trace["id"],
        "located_amount": located,
        "destination_name": trace["destination_name"],
        "destination_url": trace["destination_url"],
        "created_at": trace["created_at"],
    }


@api.post("/trace/{trace_id}/complete")
async def complete_trace(trace_id: str, request: Request):
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
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"trace-upload:{ip}", max_requests=15, window_seconds=300)
    trace = await db.traces.find_one({"id": trace_id})
    if not trace:
        raise HTTPException(404, "Trace not found")
    current_docs = trace.get("documents", [])
    if len(current_docs) >= MAX_DOCS_PER_USER:
        raise HTTPException(400, f"Maximum {MAX_DOCS_PER_USER} documents per trace")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"File type not allowed: {file.content_type}")
    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(400, f"File too large (max {MAX_FILE_BYTES // (1024*1024)} MB)")
    folder = f"traccia-fondi/traces/{trace_id}"
    is_pdf = file.content_type == "application/pdf"
    try:
        resource_type = "raw" if is_pdf else "image"
        result = cloudinary.uploader.upload(
            contents, folder=folder, resource_type=resource_type,
            use_filename=True, unique_filename=True, overwrite=False,
            tags=["traccia-fondi", "trace-doc", trace_id],
        )
    except Exception as e:
        logger.exception("Cloudinary upload failed")
        raise HTTPException(500, f"Upload failed: {e}")
    doc = {
        "id": _new_id(), "original_name": file.filename or "document",
        "mime_type": file.content_type, "size_bytes": len(contents),
        "cloudinary_public_id": result.get("public_id"),
        "cloudinary_resource_type": resource_type,
        "url": result.get("secure_url"), "created_at": _now_iso(),
    }
    await db.traces.update_one({"id": trace_id}, {"$push": {"documents": doc}})
    return doc


# ============================================================
#   Admin: Traces
# ============================================================

@api.get("/admin/traces")
async def admin_list_traces(_=Depends(require_admin)):
    traces = await db.traces.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return traces


@api.get("/admin/traces/{trace_id}")
async def admin_get_trace(trace_id: str, _=Depends(require_admin)):
    trace = await db.traces.find_one({"id": trace_id}, {"_id": 0})
    if not trace:
        raise HTTPException(404, "Trace not found")
    return trace


@api.delete("/admin/traces/{trace_id}")
async def admin_delete_trace(trace_id: str, _=Depends(require_admin)):
    trace = await db.traces.find_one({"id": trace_id})
    if not trace:
        raise HTTPException(404, "Trace not found")
    for doc in trace.get("documents", []):
        try:
            cloudinary.uploader.destroy(
                doc["cloudinary_public_id"],
                resource_type=doc.get("cloudinary_resource_type", "image"), invalidate=True,
            )
        except Exception:
            logger.warning("Cloudinary destroy failed for %s", doc.get("cloudinary_public_id"))
    await db.traces.delete_one({"id": trace_id})
    return {"ok": True}


# ============================================================
#   Admin: Users (registered)
# ============================================================

@api.get("/admin/registered-users")
async def admin_list_registered_users(_=Depends(require_admin)):
    """Return all self-registered users with trace status."""
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(5000)
    # Enrich with trace info
    result = []
    for u in users:
        trace = await db.traces.find_one({"user_id": u["id"]}, {"_id": 0})
        u_out = dict(u)
        if trace:
            u_out["trace"] = {
                "id": trace.get("id"),
                "status": trace.get("status"),
                "created_at": trace.get("created_at"),
                "located_amount": trace.get("located_amount"),
                "email_24h_sent": trace.get("email_24h_sent", False),
                "email_50h_sent": trace.get("email_50h_sent", False),
                "destination_name": trace.get("destination_name"),
            }
        else:
            u_out["trace"] = None
        result.append(u_out)
    return result


# ============================================================
#   Admin: Legacy user management
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
        "id": _new_id(), "first_name": body.first_name.strip(), "last_name": body.last_name.strip(),
        "email": em, "password": body.password, "recovery_destination": body.recovery_destination,
        "notes": body.notes or "", "amount_tier": None, "located_amount": 0,
        "procedure_started_at": None, "procedure_completed_at": None, "created_at": _now_iso(),
        "type": "admin_created",
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
#   User flow — legacy procedure (kept for compat)
# ============================================================

@api.post("/procedure/start")
async def start_procedure(body: StartProcedureIn, user=Depends(get_current_user)):
    if body.amount_tier not in TIER_HIGH_END:
        raise HTTPException(400, "Invalid amount_tier")
    located = _located_amount_for(body.amount_tier)
    update = {
        "amount_tier": body.amount_tier, "located_amount": located,
        "procedure_started_at": _now_iso(), "procedure_completed_at": None,
    }
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
    }


# ============================================================
#   Recovery requests
# ============================================================

@api.post("/recovery-requests")
async def create_recovery_request(body: RecoveryRequestIn, request: Request, user=Depends(get_current_user)):
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"recreq:{ip}", max_requests=5, window_seconds=600)
    doc = {
        "id": _new_id(), "user_id": user["id"], "user_email": user.get("email"),
        "first_name": body.first_name.strip(), "last_name": body.last_name.strip(),
        "email": body.email.lower().strip(), "message": (body.message or "").strip(),
        "located_amount": user.get("located_amount", 0),
        "recovery_destination": user.get("recovery_destination"),
        "status": "pending", "destination_login_email": "", "destination_login_password": "",
        "destination_login_url": "", "extra_notes": "", "created_at": _now_iso(), "sent_at": None,
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
    await db.recovery_requests.update_one({"id": req_id}, {"$set": {"status": "sent", "sent_at": _now_iso()}})
    return await db.recovery_requests.find_one({"id": req_id}, {"_id": 0})


@api.post("/admin/recovery-requests/{req_id}/send-email")
async def admin_send_email(req_id: str, _=Depends(require_admin)):
    r = await db.recovery_requests.find_one({"id": req_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Request not found")
    if not r.get("destination_login_email") or not r.get("destination_login_password"):
        raise HTTPException(400, "Fill destination_login_email and destination_login_password first")
    if not RESEND_API_KEY:
        raise HTTPException(500, "Resend API key is not configured")

    dest_label = "Zenthos Wallet" if r.get("recovery_destination") == "zenthos_wallet" else "Chiantin Bank"
    default_url = ("https://app.zenthos-wallet.com/login" if r.get("recovery_destination") == "zenthos_wallet"
                   else "https://secure.chiantin-bank.com/login")
    login_url = (r.get("destination_login_url") or default_url).strip()
    amount = _fmt_amount(r.get('located_amount') or 0)
    extra = (r.get("extra_notes") or "").strip()

    subject = f"[Traccia Fondi] Istruzioni di recupero — {dest_label} — {amount}"
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
      <p>A seguito del completamento della procedura di tracciamento, un importo di <strong style="color:#5FE3C9">{amount}</strong> è stato localizzato presso <strong>{dest_label}</strong>.</p>
      <table cellpadding="0" cellspacing="0" style="background:#06122A;border:1px solid #1f2d4f;border-radius:10px;width:100%;margin:8px 0 16px 0">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #1f2d4f"><span style="color:#9FB0CC;font-size:11px;text-transform:uppercase">URL</span><br/><a href="{login_url}" style="color:#5FE3C9">{login_url}</a></td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #1f2d4f"><span style="color:#9FB0CC;font-size:11px;text-transform:uppercase">Email</span><br/><span style="font-family:monospace">{r['destination_login_email']}</span></td></tr>
        <tr><td style="padding:12px 16px"><span style="color:#9FB0CC;font-size:11px;text-transform:uppercase">Password</span><br/><span style="font-family:monospace">{r['destination_login_password']}</span></td></tr>
      </table>
      {f'<div style="background:#06122A;border-left:3px solid #FFB454;padding:12px 16px;margin:16px 0"><strong style="color:#FFB454">Note</strong><br/>{extra}</div>' if extra else ""}
      <div style="background:rgba(255,107,122,0.08);border:1px solid rgba(255,107,122,0.3);border-radius:10px;padding:14px;margin:20px 0;color:#FF8B6A;font-size:13px">
        <strong>Importante:</strong> Traccia Fondi non le chiederà mai di condividere password, codici OTP, seed phrase, o di installare software di accesso remoto.
      </div>
      <p style="color:#9FB0CC;font-size:13px">Cordiali saluti,<br/><strong style="color:#fff">Traccia Fondi — Recovery Operations</strong></p>
    </td></tr>
    <tr><td style="padding:14px 32px;background:#06122A;border-top:1px solid #1f2d4f;color:#6F7E9C;font-size:11px;text-align:center">
      © {datetime.now(timezone.utc).year} Traccia Fondi · Privacy-first · GDPR aware
    </td></tr>
  </table>
</td></tr>
</table></body></html>"""

    try:
        loop = asyncio.get_event_loop()
        send_result = await loop.run_in_executor(None, lambda: resend.Emails.send({
            "from": RESEND_FROM_RECOVERY, "to": [r["email"]], "reply_to": RESEND_REPLY_TO,
            "subject": subject, "html": html_body,
            "tags": [{"name": "type", "value": "recovery_instructions"}],
        }))
        message_id = (send_result or {}).get("id", "")
    except Exception as e:
        logger.exception("Resend send failed")
        raise HTTPException(500, f"Email send failed: {e}")

    await db.recovery_requests.update_one({"id": req_id}, {"$set": {
        "status": "sent", "sent_at": _now_iso(), "email_message_id": message_id, "email_provider": "resend",
    }})
    return await db.recovery_requests.find_one({"id": req_id}, {"_id": 0})


@api.delete("/admin/recovery-requests/{req_id}")
async def admin_delete_request(req_id: str, _=Depends(require_admin)):
    await db.recovery_requests.delete_one({"id": req_id})
    return {"ok": True}


# ============================================================
#   Documents
# ============================================================

@api.get("/documents")
async def list_documents(user=Depends(get_current_user)):
    docs = await db.documents.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


@api.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), user=Depends(get_current_user)):
    count = await db.documents.count_documents({"user_id": user["id"]})
    if count >= MAX_DOCS_PER_USER:
        raise HTTPException(400, f"Maximum {MAX_DOCS_PER_USER} documents per user")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"File type not allowed: {file.content_type}")
    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(400, f"File too large")
    folder = f"traccia-fondi/users/{user['id']}"
    is_pdf = file.content_type == "application/pdf"
    try:
        resource_type = "raw" if is_pdf else "image"
        result = cloudinary.uploader.upload(
            contents, folder=folder, resource_type=resource_type,
            use_filename=True, unique_filename=True, overwrite=False,
            tags=["traccia-fondi", "user-doc", user["id"]],
        )
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")
    doc = {
        "id": _new_id(), "user_id": user["id"], "original_name": file.filename or "document",
        "mime_type": file.content_type, "size_bytes": len(contents),
        "cloudinary_public_id": result.get("public_id"), "cloudinary_resource_type": resource_type,
        "url": result.get("secure_url"), "thumbnail_url": (result.get("secure_url") if not is_pdf else None),
        "created_at": _now_iso(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    d = await db.documents.find_one({"id": doc_id, "user_id": user["id"]}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Document not found")
    try:
        cloudinary.uploader.destroy(d["cloudinary_public_id"], resource_type=d.get("cloudinary_resource_type", "image"), invalidate=True)
    except Exception:
        pass
    await db.documents.delete_one({"id": doc_id})
    return {"ok": True}


# ============================================================
#   Contact form
# ============================================================

class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=10, max_length=5000)


@api.post("/contact")
async def contact_form(body: ContactIn, request: Request):
    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"contact:{ip}", max_requests=3, window_seconds=600)
    doc = {"id": _new_id(), "name": body.name.strip(), "email": body.email.lower().strip(),
           "message": body.message.strip(), "ip": ip, "created_at": _now_iso()}
    await db.contact_messages.insert_one(doc)
    if RESEND_API_KEY:
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: resend.Emails.send({
                "from": RESEND_FROM_NOREPLY, "to": [RESEND_REPLY_TO], "reply_to": body.email,
                "subject": f"[Contact] {body.name}",
                "text": f"From: {body.name} <{body.email}>\nIP: {ip}\n\n{body.message}",
            }))
        except Exception:
            pass
    return {"ok": True}


@api.get("/admin/contact-messages")
async def admin_list_contact_messages(_=Depends(require_admin)):
    docs = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


# ============================================================
#   Admin: Scheduler status
# ============================================================

@api.get("/admin/scheduler/status")
async def scheduler_status(_=Depends(require_admin)):
    jobs = scheduler.get_jobs()
    return {
        "running": scheduler.running,
        "jobs": [{"id": j.id, "next_run": str(j.next_run_time)} for j in jobs],
    }


@api.post("/admin/scheduler/retrigger/{trace_id}")
async def retrigger_trace_emails(trace_id: str, _=Depends(require_admin)):
    """Re-schedule email jobs for a specific trace (admin manual trigger)."""
    trace = await db.traces.find_one({"id": trace_id}, {"_id": 0})
    if not trace:
        raise HTTPException(404, "Trace not found")
    _schedule_trace_emails(trace_id, trace["created_at"])
    return {"ok": True, "trace_id": trace_id}


# ============================================================
#   Mount + middleware + startup
# ============================================================

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.on_event("startup")
async def startup_event():
    """Start scheduler and re-queue any pending email jobs."""
    scheduler.start()
    logger.info("APScheduler started")

    # Load all traces that need emails scheduled
    try:
        pending = await db.traces.find(
            {"$or": [{"email_24h_sent": False}, {"email_50h_sent": {"$exists": False}}, {"email_50h_sent": False}]},
            {"_id": 0, "id": 1, "created_at": 1, "email_24h_sent": 1, "email_50h_sent": 1},
        ).to_list(10000)

        now = datetime.now(timezone.utc)
        scheduled = 0
        for t in pending:
            tid = t.get("id")
            cat = t.get("created_at")
            if not tid or not cat:
                continue
            # Normalize
            try:
                created = datetime.fromisoformat(cat.replace("Z", "+00:00"))
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            # If 24h not sent and not past 50h mark (give some slack)
            if not t.get("email_24h_sent", False):
                _schedule_trace_emails(tid, cat)
                scheduled += 1
            elif not t.get("email_50h_sent", False):
                # 24h already sent, only schedule 50h
                run_50h = created + timedelta(hours=50)
                if run_50h <= now:
                    run_50h = now + timedelta(seconds=10)
                job_id_50 = f"email_50h_{tid}"
                try:
                    scheduler.remove_job(job_id_50)
                except Exception:
                    pass
                scheduler.add_job(
                    send_50h_email, trigger=DateTrigger(run_date=run_50h),
                    id=job_id_50, args=[tid], replace_existing=True, misfire_grace_time=3600,
                )
                scheduled += 1

        logger.info("Startup: scheduled email jobs for %d traces", scheduled)
    except Exception as e:
        logger.exception("Startup scheduler load failed: %s", e)


@app.on_event("shutdown")
async def shutdown():
    if scheduler.running:
        scheduler.shutdown(wait=False)
    client.close()
