"""
AI-FUNDS Backend
================
FastAPI backend for an Italian-first scam victim case-management platform.

Endpoints (all under /api):
  - GET  /health
  - POST /auth/register
  - POST /auth/login
  - GET  /auth/me
  - POST /cases
  - GET  /cases
  - GET  /cases/{case_id}
  - PUT  /cases/{case_id}
  - POST /cases/{case_id}/transactions
  - GET  /cases/{case_id}/transactions
  - POST /cases/{case_id}/evidence
  - GET  /cases/{case_id}/evidence
  - POST /cases/{case_id}/analyze
  - GET  /cases/{case_id}/analysis
  - POST /cases/{case_id}/reports
  - GET  /cases/{case_id}/reports

NOTE: AI analysis is a deterministic mock. Real LLM integration is planned for phase 2.
"""

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Mongo ---
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "ai_funds")]

# --- Auth ---
JWT_SECRET = os.environ.get("JWT_SECRET", "ai-funds-dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXP_HOURS = 24 * 7  # 7 days

app = FastAPI(title="AI-FUNDS API", version="1.0.0")
api = APIRouter(prefix="/api")


# ============================================================
#   Helpers
# ============================================================

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _case_ref() -> str:
    # Friendly case reference, e.g. AIF-7G3KX9
    suffix = uuid.uuid4().hex[:6].upper()
    return f"AIF-{suffix}"


def _hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False


def _make_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def _audit(case_id: Optional[str], user_id: Optional[str], action: str, metadata: Dict[str, Any] | None = None):
    await db.audit_logs.insert_one({
        "id": _new_id(),
        "case_id": case_id,
        "user_id": user_id,
        "action": action,
        "metadata": metadata or {},
        "created_at": _now_iso(),
    })


# ============================================================
#   Schemas
# ============================================================

class HealthOut(BaseModel):
    status: str
    time: str


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = None
    consent_privacy: bool = True


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    token: str
    user: Dict[str, Any]


class CaseIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    scam_type: str
    country: str = "IT"
    region: Optional[str] = None
    loss_amount: Optional[float] = 0
    currency: str = "EUR"
    first_payment_date: Optional[str] = None
    last_contact_date: Optional[str] = None
    payment_method: Optional[str] = None
    scammer_still_active: Optional[bool] = False
    requested_extra_fee: Optional[bool] = False
    impersonated_authority: Optional[str] = None
    seed_phrase_shared: Optional[bool] = False
    otp_shared: Optional[bool] = False
    remote_access_installed: Optional[bool] = False
    withdrawal_blocked: Optional[bool] = False
    notes: Optional[str] = None


class CaseUpdateIn(CaseIn):
    scam_type: Optional[str] = None  # all optional on update
    country: Optional[str] = None


class TransactionIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_type: str
    network: Optional[str] = None
    tx_hash: Optional[str] = None
    wallet_address: Optional[str] = None
    iban: Optional[str] = None
    iban_country: Optional[str] = None
    bank_name: Optional[str] = None
    recipient_name: Optional[str] = None
    merchant_descriptor: Optional[str] = None
    platform_name: Optional[str] = None
    amount: Optional[float] = 0
    currency: Optional[str] = "EUR"
    date: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class EvidenceIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    evidence_type: str
    title: str
    description: Optional[str] = None
    collected: bool = True
    file_name_placeholder: Optional[str] = None


class ReportIn(BaseModel):
    report_type: str
    language: str = "it"


# ============================================================
#   AI mock service
# ============================================================

RED_FLAG_RULES = [
    ("withdrawal_blocked",         "Prelievo bloccato dalla piattaforma",                              25),
    ("requested_extra_fee",        "Richiesta tassa di sblocco / AML / gas fee",                       30),
    ("seed_phrase_shared",         "Seed phrase / private key condivisa con scammer",                  35),
    ("otp_shared",                 "Codici OTP / credenziali bancarie condivisi",                      30),
    ("remote_access_installed",    "Software di accesso remoto installato (AnyDesk/TeamViewer)",       25),
    ("scammer_still_active",       "Scammer ancora in contatto attivo",                                15),
    ("impersonated_authority",     "Falsa identità autorità (CONSOB / Banca d'Italia / Polizia)",      20),
]

SCAM_TYPE_FLAGS = {
    "forex_broker": ["Possibile broker non autorizzato", "Profitti garantiti / dashboard falsa"],
    "crypto": ["Possibile invio crypto a wallet sconosciuto", "Transazione potenzialmente irreversibile"],
    "fake_recovery": ["Falso recupero fondi rilevato (secondary scam)", "Richiesta di pagamento per 'sbloccare' fondi"],
    "romance": ["Pattern pig butchering / romance investment", "Investment scam tramite relazione personale"],
    "phishing": ["Phishing / smishing / vishing rilevato", "Possibile furto credenziali"],
    "postepay": ["Scam PostePay / BancoPosta con destinatario sconosciuto", "Possibile falso SMS Poste"],
    "sepa": ["Bonifico SEPA verso IBAN potenzialmente sospetto", "Valutare richiesta di recall"],
    "instant_sepa": ["Bonifico SEPA istantaneo: alta urgenza, irreversibile in molti casi"],
    "card": ["Pagamento carta contestabile (chargeback)", "Verificare merchant descriptor"],
    "paypal": ["Dispute PayPal/Wallet possibile entro tempi piattaforma"],
}

PAYMENT_RAIL_SUMMARY = {
    "sepa": "Bonifico SEPA standard – richiesta di recall via banca emittente",
    "instant_sepa": "Bonifico SEPA Istantaneo – tempi strettissimi, contattare banca immediatamente",
    "postepay": "PostePay / BancoPosta – reclamo Poste Italiane via canali ufficiali",
    "card": "Carta di pagamento – procedura chargeback via banca emittente / circuito",
    "crypto": "Crypto – richiesta freeze a exchange esposti se identificabili",
    "paypal": "PayPal – apertura dispute, valutare buyer/seller protection",
    "revolut": "Revolut – dispute via app, segnalazione fraud",
    "wise": "Wise – fraud report + supporto via app",
    "satispay": "Satispay – segnalazione tramite supporto, raccolta ricevute",
    "western_union": "Western Union / MoneyGram – fraud report, MTCN richiesta",
}


def _compute_analysis(case: dict, transactions: list, evidence: list) -> dict:
    score = 0
    flags: List[str] = []

    # Recency boost
    try:
        if case.get("first_payment_date"):
            d = datetime.fromisoformat(case["first_payment_date"].replace("Z", "+00:00"))
            days = (datetime.now(timezone.utc) - d.replace(tzinfo=timezone.utc) if d.tzinfo is None else datetime.now(timezone.utc) - d).days
            if days <= 2:
                score += 30
                flags.append("Pagamento molto recente (≤48h) – finestra di azione critica")
            elif days <= 7:
                score += 20
                flags.append("Pagamento recente (≤7 giorni) – azione tempestiva consigliata")
            elif days <= 30:
                score += 10
    except Exception:
        pass

    # Boolean rule flags
    for key, label, weight in RED_FLAG_RULES:
        if case.get(key):
            score += weight
            flags.append(label)

    # Scam-type flags
    flags.extend(SCAM_TYPE_FLAGS.get(case.get("scam_type", ""), []))

    # Payment-rail summary
    pay = (case.get("payment_method") or "").lower()
    rail_summary = PAYMENT_RAIL_SUMMARY.get(pay, "Metodo di pagamento da chiarire – preparare comunque dossier evidenze")

    # Loss amount weight
    try:
        amt = float(case.get("loss_amount") or 0)
        if amt >= 50000:
            score += 25
            flags.append(f"Perdita elevata (€{int(amt):,})")
        elif amt >= 10000:
            score += 15
        elif amt >= 1000:
            score += 8
    except Exception:
        pass

    # Crypto + seed phrase = critical
    if case.get("scam_type") == "crypto" and case.get("seed_phrase_shared"):
        score += 30
        flags.append("CRITICO: seed phrase esposta – muovere fondi residui immediatamente")

    # Evidence completeness
    needed = {"screenshot", "ricevuta", "iban", "transaction_hash", "chat", "email"}
    have = {e.get("evidence_type", "").lower() for e in evidence}
    missing = []
    if "screenshot" not in have:
        missing.append("Screenshot conversazioni / dashboard")
    if "ricevuta" not in have and pay in {"sepa", "instant_sepa", "postepay", "card", "paypal"}:
        missing.append("Ricevuta del pagamento (CRO/TRN o screenshot transazione)")
    if "transaction_hash" not in have and case.get("scam_type") == "crypto":
        missing.append("Transaction hash on-chain")
    if "iban" not in have and pay in {"sepa", "instant_sepa"}:
        missing.append("IBAN beneficiario completo")
    if not evidence:
        missing.append("Nessuna prova caricata: aggiungere checklist evidenze")

    if len(transactions) == 0:
        missing.append("Nessuna transazione registrata")
        score += 5

    # Cap
    score = min(score, 100)

    if score >= 75:
        category = "critical"
    elif score >= 50:
        category = "high"
    elif score >= 25:
        category = "medium"
    else:
        category = "low"

    # Recommended actions
    actions = []
    if pay in {"sepa", "instant_sepa"}:
        actions.append("Contattare immediatamente la banca emittente e chiedere richiesta di recall")
    if pay == "card":
        actions.append("Aprire pratica di chargeback con la banca emittente")
    if pay in {"postepay"} or case.get("scam_type") == "postepay":
        actions.append("Reclamo Poste Italiane via canali ufficiali con ricevuta")
    if case.get("scam_type") in {"forex_broker"}:
        actions.append("Preparare segnalazione CONSOB (broker non autorizzato)")
    if case.get("scam_type") == "crypto":
        actions.append("Inviare richiesta di freeze a exchange esposto")
    actions.append("Preparare riassunto per Polizia Postale / Commissariato P.S. Online")
    actions.append("Conservare tutte le prove originali, non cancellare chat o email")
    if case.get("requested_extra_fee"):
        actions.append("Non pagare nessuna 'tassa di sblocco' – è un secondary scam")
    actions.append("Considerare consulenza con avvocato esperto in frodi finanziarie")

    # Tracing summary nodes
    nodes = _build_tracing_nodes(case, transactions)

    return {
        "urgency_score": score,
        "urgency_category": category,
        "red_flags": list(dict.fromkeys(flags))[:20],
        "missing_evidence": missing,
        "recommended_actions": actions,
        "payment_rail_summary": rail_summary,
        "tracing_summary": nodes,
        "recovery_outlook": _outlook(score, pay, case),
    }


def _outlook(score: int, pay: str, case: dict) -> str:
    if case.get("requested_extra_fee") or case.get("scam_type") == "fake_recovery":
        return "Allerta secondary scam – non versare ulteriori somme"
    if pay in {"card"}:
        return "Possibili opzioni di contestazione (chargeback) entro tempi del circuito"
    if pay in {"sepa"}:
        return "Possibile richiesta di recall – tempistica fondamentale"
    if pay in {"instant_sepa"}:
        return "Azione urgente consigliata: bonifici istantanei sono in molti casi irrevocabili"
    if case.get("scam_type") == "crypto":
        return "Possibile richiesta freeze se exchange identificabile – serve transaction hash"
    if score >= 60:
        return "Serve supporto professionale – preparare dossier completo"
    return "Documentazione da completare per valutare opzioni"


def _build_tracing_nodes(case: dict, transactions: list) -> Dict[str, Any]:
    pay = (case.get("payment_method") or "").lower()
    scam = (case.get("scam_type") or "").lower()

    if pay == "instant_sepa" or pay == "sepa":
        chain = ["Banca Vittima", "Rete SEPA", "IBAN Beneficiario", "Possibile Mule Account", "Richiesta Recall"]
    elif pay == "postepay" or scam == "postepay":
        chain = ["PostePay/BancoPosta", "Ricarica/Trasferimento", "Destinatario", "Reclamo Poste"]
    elif pay == "card":
        chain = ["Carta Vittima", "Merchant Descriptor", "Payment Processor", "Chargeback Route"]
    elif scam == "crypto":
        chain = ["Exchange Origine", "Wallet Address", "Blockchain TX", "Wallet Destinatario", "Possibile Exchange Esposto", "Freeze Request"]
    elif scam == "forex_broker":
        chain = ["Deposito Vittima", "Finta Piattaforma Broker", "IBAN/Wallet/Processor", "Prelievo Bloccato", "CONSOB / Polizia Report"]
    elif scam == "fake_recovery":
        chain = ["Vittima", "Finto Recuperatore", "Richiesta Tassa di Sblocco", "ALERT Secondary Scam"]
    elif pay in {"paypal", "revolut", "wise", "satispay"}:
        chain = ["Wallet/App", "Account Destinatario", "Platform Dispute Route"]
    else:
        chain = ["Vittima", "Metodo di Pagamento", "Destinatario", "Report Generato"]

    return {
        "chain": chain,
        "transaction_count": len(transactions),
        "summary": " → ".join(chain),
    }


# ============================================================
#   Report generator (text content; PDF made on frontend)
# ============================================================

def _format_eur(v) -> str:
    try:
        return f"€ {float(v):,.2f}"
    except Exception:
        return "€ 0,00"


def _build_report(report_type: str, language: str, case: dict, transactions: list, evidence: list, analysis: dict | None) -> Dict[str, Any]:
    user_full_name = case.get("user_full_name") or "[Nome Cognome]"
    case_ref = case.get("case_reference", "—")
    amount = _format_eur(case.get("loss_amount", 0))
    pay = case.get("payment_method") or "—"
    scam = case.get("scam_type") or "—"
    first_date = case.get("first_payment_date") or "—"
    last_date = case.get("last_contact_date") or "—"

    tx_lines = []
    for t in transactions[:30]:
        line = f"- [{t.get('payment_type','')}] {t.get('date','')} | {_format_eur(t.get('amount',0))} {t.get('currency','EUR')} | "
        if t.get("iban"):
            line += f"IBAN {t['iban']} ({t.get('iban_country','')}) "
        if t.get("recipient_name"):
            line += f"→ {t['recipient_name']} "
        if t.get("tx_hash"):
            line += f"hash: {t['tx_hash']} "
        if t.get("wallet_address"):
            line += f"wallet: {t['wallet_address']} "
        if t.get("reference_number"):
            line += f"ref: {t['reference_number']} "
        tx_lines.append(line.strip())
    tx_block = "\n".join(tx_lines) if tx_lines else "Nessuna transazione registrata."

    ev_lines = [f"- {e.get('title','')} ({e.get('evidence_type','')}): {'presente' if e.get('collected') else 'mancante'}"
                for e in evidence] or ["Nessuna prova registrata."]
    ev_block = "\n".join(ev_lines)

    flags = "\n".join(f"- {f}" for f in (analysis or {}).get("red_flags", [])) or "- (in valutazione)"
    actions = "\n".join(f"- {a}" for a in (analysis or {}).get("recommended_actions", []))

    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")

    titles = {
        "bank_complaint": "Reclamo Banca per Operazione Contestata",
        "chargeback":     "Richiesta di Chargeback Carta",
        "poste_complaint":"Reclamo Poste Italiane / PostePay / BancoPosta",
        "consob_report":  "Segnalazione CONSOB – Sospetta Truffa di Investimento",
        "police_report":  "Riassunto per Denuncia – Polizia Postale",
        "exchange_freeze":"Richiesta di Freeze Exchange – Sospetto Riciclaggio",
        "lawyer_memo":    "Memo Caso per Avvocato",
        "case_timeline":  "Timeline Personale del Caso",
        "recovery_warning":"Warning Report – Falso Recupero Fondi",
    }
    title = titles.get(report_type, "Report Caso")

    intro_map = {
        "bank_complaint": (
            f"Il/La sottoscritto/a {user_full_name} segnala alla banca emittente operazioni di pagamento "
            f"ritenute non autorizzate / contestate, per un importo totale stimato di {amount}. "
            f"Si richiede l'apertura di un reclamo formale e, ove applicabile, l'attivazione delle procedure "
            f"di richiesta di recall del bonifico ai sensi della normativa sui servizi di pagamento "
            f"(incluso il D. Lgs. 11/2010)."
        ),
        "chargeback": (
            f"Si richiede l'apertura di una procedura di chargeback per la transazione contestata di {amount} "
            f"effettuata con carta di pagamento. Le operazioni risultano disconosciute / frutto di frode."
        ),
        "poste_complaint": (
            f"Il/La sottoscritto/a {user_full_name} presenta reclamo a Poste Italiane in merito ad operazioni "
            f"PostePay/BancoPosta riconducibili a sospetta truffa, per un totale di {amount}."
        ),
        "consob_report": (
            "Il/La sottoscritto/a intende segnalare a CONSOB un soggetto / piattaforma sospetta di operare "
            "abusivamente come intermediario o di proporre offerte di investimento non autorizzate, "
            "ai sensi del TUF e dei poteri di vigilanza CONSOB."
        ),
        "police_report": (
            f"Il/La sottoscritto/a {user_full_name} riassume i fatti relativi a presunta truffa online "
            f"al fine di sporgere denuncia / querela presso la Polizia Postale o il Commissariato di P.S. Online."
        ),
        "exchange_freeze": (
            "Si richiede al compliance team dell'exchange di valutare il blocco preventivo di fondi "
            "associati al wallet sottostante, a seguito di sospetta movimentazione fraudolenta."
        ),
        "lawyer_memo": (
            "Memo professionale a uso dello studio legale incaricato. Sintesi dei fatti, evidenze, "
            "transazioni e analisi preliminare di urgenza e red flags."
        ),
        "case_timeline": (
            "Timeline personale degli eventi e dei pagamenti, utile per condivisione con banca, "
            "exchange, autorità o consulenti professionali."
        ),
        "recovery_warning": (
            "ATTENZIONE: il caso presenta indicatori riconducibili a tentativi di FALSO RECUPERO FONDI "
            "(secondary scam). Non versare ulteriori somme."
        ),
    }
    intro = intro_map.get(report_type, "Riassunto del caso e delle evidenze raccolte.")

    body = f"""{title.upper()}

Data report: {today}
Riferimento caso: {case_ref}

DICHIARANTE
- Nome: {user_full_name}
- Paese: {case.get('country','IT')}
- Regione/Città: {case.get('region','—')}

OGGETTO
{intro}

SINTESI CASO
- Tipologia di presunta truffa: {scam}
- Metodo di pagamento principale: {pay}
- Importo perso (stimato): {amount}
- Data primo pagamento: {first_date}
- Data ultimo contatto: {last_date}
- Scammer ancora attivo: {'Sì' if case.get('scammer_still_active') else 'No'}
- Richieste ulteriori pagamenti / tasse di sblocco: {'Sì' if case.get('requested_extra_fee') else 'No'}
- Falsa identità autorità: {case.get('impersonated_authority') or 'Nessuna'}

TRANSAZIONI RILEVANTI
{tx_block}

PROVE DISPONIBILI
{ev_block}

INDICATORI DI RISCHIO RILEVATI
{flags}

AZIONI RICHIESTE / CONSIGLIATE
{actions}

DICHIARAZIONE
Le informazioni sopra riportate sono fornite in buona fede dal dichiarante. La presente è preparata
con il supporto di AI-FUNDS, piattaforma di organizzazione documentale per vittime di truffe online.
AI-FUNDS non è affiliata a CONSOB, Banca d'Italia, Polizia Postale, Poste Italiane, banche o exchange
e non fornisce consulenza legale. Le valutazioni sono preliminari.

Firma del dichiarante: __________________________      Data: {today}
"""
    return {"title": title, "content": body}


# ============================================================
#   Routes
# ============================================================

@api.get("/health", response_model=HealthOut)
async def health():
    return HealthOut(status="ok", time=_now_iso())


# ----- AUTH -----

@api.post("/auth/register", response_model=AuthOut)
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = _new_id()
    doc = {
        "id": user_id,
        "email": body.email.lower(),
        "full_name": body.full_name or "",
        "password_hash": _hash_password(body.password),
        "consent_privacy": bool(body.consent_privacy),
        "created_at": _now_iso(),
    }
    await db.users.insert_one(doc)
    await _audit(None, user_id, "user.register", {"email": body.email})
    safe = {k: v for k, v in doc.items() if k not in ("password_hash", "_id")}
    return AuthOut(token=_make_token(user_id, body.email.lower()), user=safe)


@api.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not _verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    safe = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    await _audit(None, user["id"], "user.login")
    return AuthOut(token=_make_token(user["id"], user["email"]), user=safe)


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ----- CASES -----

@api.post("/cases")
async def create_case(body: CaseIn, user=Depends(get_current_user)):
    cid = _new_id()
    doc = {
        "id": cid,
        "case_reference": _case_ref(),
        "user_id": user["id"],
        "user_full_name": user.get("full_name") or "",
        **body.model_dump(),
        "status": "open",
        "urgency_score": 0,
        "urgency_category": "low",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.cases.insert_one(doc)
    await _audit(cid, user["id"], "case.create", {"scam_type": body.scam_type})
    doc.pop("_id", None)
    return doc


@api.get("/cases")
async def list_cases(user=Depends(get_current_user)):
    cur = db.cases.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(500)


@api.get("/cases/{case_id}")
async def get_case(case_id: str, user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    return c


@api.put("/cases/{case_id}")
async def update_case(case_id: str, body: CaseUpdateIn, user=Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = _now_iso()
    res = await db.cases.update_one({"id": case_id, "user_id": user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Case not found")
    await _audit(case_id, user["id"], "case.update", {"keys": list(update.keys())})
    return await db.cases.find_one({"id": case_id}, {"_id": 0})


# ----- TRANSACTIONS -----

@api.post("/cases/{case_id}/transactions")
async def add_transaction(case_id: str, body: TransactionIn, user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    doc = {"id": _new_id(), "case_id": case_id, **body.model_dump(), "created_at": _now_iso()}
    await db.transactions.insert_one(doc)
    await _audit(case_id, user["id"], "transaction.add")
    doc.pop("_id", None)
    return doc


@api.get("/cases/{case_id}/transactions")
async def list_transactions(case_id: str, user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    return await db.transactions.find({"case_id": case_id}, {"_id": 0}).sort("created_at", 1).to_list(500)


# ----- EVIDENCE -----

@api.post("/cases/{case_id}/evidence")
async def add_evidence(case_id: str, body: EvidenceIn, user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    doc = {"id": _new_id(), "case_id": case_id, **body.model_dump(), "created_at": _now_iso()}
    await db.evidence.insert_one(doc)
    await _audit(case_id, user["id"], "evidence.add")
    doc.pop("_id", None)
    return doc


@api.get("/cases/{case_id}/evidence")
async def list_evidence(case_id: str, user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    return await db.evidence.find({"case_id": case_id}, {"_id": 0}).sort("created_at", 1).to_list(500)


# ----- ANALYSIS -----

@api.post("/cases/{case_id}/analyze")
async def analyze_case(case_id: str, user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    txs = await db.transactions.find({"case_id": case_id}, {"_id": 0}).to_list(500)
    evs = await db.evidence.find({"case_id": case_id}, {"_id": 0}).to_list(500)
    result = _compute_analysis(c, txs, evs)
    doc = {"id": _new_id(), "case_id": case_id, **result, "created_at": _now_iso()}
    await db.analyses.insert_one(doc)
    # update case urgency
    await db.cases.update_one(
        {"id": case_id},
        {"$set": {
            "urgency_score": result["urgency_score"],
            "urgency_category": result["urgency_category"],
            "updated_at": _now_iso(),
        }},
    )
    await _audit(case_id, user["id"], "case.analyze", {"score": result["urgency_score"]})
    doc.pop("_id", None)
    return doc


@api.get("/cases/{case_id}/analysis")
async def get_latest_analysis(case_id: str, user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    a = await db.analyses.find_one({"case_id": case_id}, {"_id": 0}, sort=[("created_at", -1)])
    return a or {}


# ----- REPORTS -----

@api.post("/cases/{case_id}/reports")
async def create_report(case_id: str, body: ReportIn, user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    txs = await db.transactions.find({"case_id": case_id}, {"_id": 0}).to_list(500)
    evs = await db.evidence.find({"case_id": case_id}, {"_id": 0}).to_list(500)
    a = await db.analyses.find_one({"case_id": case_id}, {"_id": 0}, sort=[("created_at", -1)])
    built = _build_report(body.report_type, body.language, c, txs, evs, a)
    doc = {
        "id": _new_id(),
        "case_id": case_id,
        "report_type": body.report_type,
        "language": body.language,
        "title": built["title"],
        "content": built["content"],
        "created_at": _now_iso(),
    }
    await db.reports.insert_one(doc)
    await _audit(case_id, user["id"], "report.create", {"type": body.report_type})
    doc.pop("_id", None)
    return doc


@api.get("/cases/{case_id}/reports")
async def list_reports(case_id: str, user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    return await db.reports.find({"case_id": case_id}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ----- mount -----

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ai-funds")


@app.on_event("shutdown")
async def shutdown():
    client.close()
