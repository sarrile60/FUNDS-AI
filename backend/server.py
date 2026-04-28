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
    ("withdrawal_blocked",         {"it": "Prelievo bloccato dalla piattaforma", "en": "Withdrawal blocked by the platform"},                              25),
    ("requested_extra_fee",        {"it": "Richiesta tassa di sblocco / AML / gas fee", "en": "Unlock / AML / gas fee request"},                       30),
    ("seed_phrase_shared",         {"it": "Seed phrase / private key condivisa con scammer", "en": "Seed phrase / private key shared with scammer"},                  35),
    ("otp_shared",                 {"it": "Codici OTP / credenziali bancarie condivisi", "en": "OTP codes / banking credentials shared"},                      30),
    ("remote_access_installed",    {"it": "Software di accesso remoto installato (AnyDesk/TeamViewer)", "en": "Remote access software installed (AnyDesk/TeamViewer)"},       25),
    ("scammer_still_active",       {"it": "Scammer ancora in contatto attivo", "en": "Scammer still in active contact"},                                15),
    ("impersonated_authority",     {"it": "Falsa identità autorità (CONSOB / Banca d'Italia / Polizia)", "en": "Impersonated authority (CONSOB / Banca d'Italia / Police)"},      20),
]

SCAM_TYPE_FLAGS = {
    "forex_broker": {
        "it": ["Possibile broker non autorizzato", "Profitti garantiti / dashboard falsa"],
        "en": ["Possible unauthorized broker", "Guaranteed profits / fake dashboard"],
    },
    "crypto": {
        "it": ["Possibile invio crypto a wallet sconosciuto", "Transazione potenzialmente irreversibile"],
        "en": ["Possible crypto sent to unknown wallet", "Potentially irreversible transaction"],
    },
    "fake_recovery": {
        "it": ["Falso recupero fondi rilevato (secondary scam)", "Richiesta di pagamento per 'sbloccare' fondi"],
        "en": ["Fake recovery scam detected (secondary scam)", "Payment requested to 'unlock' funds"],
    },
    "romance": {
        "it": ["Pattern pig butchering / romance investment", "Investment scam tramite relazione personale"],
        "en": ["Pig butchering / romance investment pattern", "Investment scam via personal relationship"],
    },
    "phishing": {
        "it": ["Phishing / smishing / vishing rilevato", "Possibile furto credenziali"],
        "en": ["Phishing / smishing / vishing detected", "Possible credential theft"],
    },
    "postepay": {
        "it": ["Scam PostePay / BancoPosta con destinatario sconosciuto", "Possibile falso SMS Poste"],
        "en": ["PostePay / BancoPosta scam with unknown recipient", "Possible fake Poste SMS"],
    },
    "sepa": {
        "it": ["Bonifico SEPA verso IBAN potenzialmente sospetto", "Valutare richiesta di recall"],
        "en": ["SEPA wire to potentially suspicious IBAN", "Evaluate recall request"],
    },
    "instant_sepa": {
        "it": ["Bonifico SEPA istantaneo: alta urgenza, irreversibile in molti casi"],
        "en": ["Instant SEPA wire: high urgency, often irreversible"],
    },
    "card": {
        "it": ["Pagamento carta contestabile (chargeback)", "Verificare merchant descriptor"],
        "en": ["Card payment may be disputable (chargeback)", "Verify merchant descriptor"],
    },
    "paypal": {
        "it": ["Dispute PayPal/Wallet possibile entro tempi piattaforma"],
        "en": ["PayPal/wallet dispute possible within platform timeframe"],
    },
}

PAYMENT_RAIL_SUMMARY = {
    "sepa":         {"it": "Bonifico SEPA standard – richiesta di recall via banca emittente",                  "en": "Standard SEPA wire — recall request via issuing bank"},
    "instant_sepa": {"it": "Bonifico SEPA Istantaneo – tempi strettissimi, contattare banca immediatamente",    "en": "Instant SEPA wire — extremely tight timing, contact bank immediately"},
    "postepay":     {"it": "PostePay / BancoPosta – reclamo Poste Italiane via canali ufficiali",               "en": "PostePay / BancoPosta — Poste Italiane complaint via official channels"},
    "card":         {"it": "Carta di pagamento – procedura chargeback via banca emittente / circuito",         "en": "Payment card — chargeback procedure via issuing bank / scheme"},
    "crypto":       {"it": "Crypto – richiesta freeze a exchange esposti se identificabili",                    "en": "Crypto — freeze request to exposed exchanges if identifiable"},
    "paypal":       {"it": "PayPal – apertura dispute, valutare buyer/seller protection",                       "en": "PayPal — open dispute, evaluate buyer/seller protection"},
    "revolut":      {"it": "Revolut – dispute via app, segnalazione fraud",                                     "en": "Revolut — in-app dispute, fraud report"},
    "wise":         {"it": "Wise – fraud report + supporto via app",                                            "en": "Wise — fraud report + in-app support"},
    "satispay":     {"it": "Satispay – segnalazione tramite supporto, raccolta ricevute",                       "en": "Satispay — report via support, gather receipts"},
    "western_union":{"it": "Western Union / MoneyGram – fraud report, MTCN richiesta",                          "en": "Western Union / MoneyGram — fraud report, MTCN required"},
}

OUTLOOK = {
    "secondary_scam": {"it": "Allerta secondary scam – non versare ulteriori somme",            "en": "Secondary-scam alert — do not send any further funds"},
    "card":           {"it": "Possibili opzioni di contestazione (chargeback) entro tempi del circuito",  "en": "Possible dispute options (chargeback) within scheme timeframe"},
    "sepa":           {"it": "Possibile richiesta di recall – tempistica fondamentale",         "en": "Recall request possible — timing is critical"},
    "instant_sepa":   {"it": "Azione urgente consigliata: bonifici istantanei sono in molti casi irrevocabili",  "en": "Urgent action recommended: instant transfers are often irrevocable"},
    "crypto":         {"it": "Possibile richiesta freeze se exchange identificabile – serve transaction hash",  "en": "Freeze request possible if exchange identifiable — transaction hash required"},
    "high":           {"it": "Serve supporto professionale – preparare dossier completo",       "en": "Professional support needed — prepare complete dossier"},
    "default":        {"it": "Documentazione da completare per valutare opzioni",               "en": "Documentation to be completed to evaluate options"},
}

ACTIONS = {
    "sepa_recall":      {"it": "Contattare immediatamente la banca emittente e chiedere richiesta di recall",  "en": "Immediately contact the issuing bank and request a recall"},
    "card_chargeback":  {"it": "Aprire pratica di chargeback con la banca emittente",                            "en": "Open a chargeback case with the issuing bank"},
    "poste_complaint":  {"it": "Reclamo Poste Italiane via canali ufficiali con ricevuta",                       "en": "Poste Italiane complaint via official channels with receipt"},
    "consob_filing":    {"it": "Preparare segnalazione CONSOB (broker non autorizzato)",                          "en": "Prepare CONSOB filing (unauthorized broker)"},
    "exchange_freeze":  {"it": "Inviare richiesta di freeze a exchange esposto",                                  "en": "Send freeze request to the exposed exchange"},
    "police":           {"it": "Preparare riassunto per Polizia Postale / Commissariato P.S. Online",            "en": "Prepare summary for Polizia Postale / online police precinct"},
    "preserve":         {"it": "Conservare tutte le prove originali, non cancellare chat o email",               "en": "Preserve all original evidence, do not delete chats or emails"},
    "no_secondary":     {"it": "Non pagare nessuna 'tassa di sblocco' – è un secondary scam",                     "en": "Do not pay any 'unlock fee' — that is a secondary scam"},
    "lawyer":           {"it": "Considerare consulenza con avvocato esperto in frodi finanziarie",                "en": "Consider consulting a lawyer experienced in financial fraud"},
}

MISSING = {
    "screenshot":   {"it": "Screenshot conversazioni / dashboard",                  "en": "Conversation / dashboard screenshots"},
    "receipt":      {"it": "Ricevuta del pagamento (CRO/TRN o screenshot transazione)", "en": "Payment receipt (CRO/TRN or transaction screenshot)"},
    "tx_hash":      {"it": "Transaction hash on-chain",                              "en": "On-chain transaction hash"},
    "iban":         {"it": "IBAN beneficiario completo",                             "en": "Full beneficiary IBAN"},
    "no_evidence":  {"it": "Nessuna prova caricata: aggiungere checklist evidenze", "en": "No evidence added: complete the evidence checklist"},
    "no_tx":        {"it": "Nessuna transazione registrata",                         "en": "No transactions recorded"},
}

PERIODS = {
    "very_recent": {"it": "Pagamento molto recente (≤48h) – finestra di azione critica", "en": "Very recent payment (≤48h) — critical action window"},
    "recent":      {"it": "Pagamento recente (≤7 giorni) – azione tempestiva consigliata", "en": "Recent payment (≤7 days) — timely action recommended"},
}

CRYPTO_SEED = {"it": "CRITICO: seed phrase esposta – muovere fondi residui immediatamente",
               "en": "CRITICAL: seed phrase exposed — move remaining funds immediately"}

LARGE_LOSS = {"it": "Perdita elevata (€{amt:,})", "en": "Large loss (€{amt:,})"}


def _compute_analysis(case: dict, transactions: list, evidence: list, lang: str = "it") -> dict:
    L = lang if lang in ("it", "en") else "it"
    score = 0
    flags: List[str] = []

    # Recency boost
    try:
        if case.get("first_payment_date"):
            d = datetime.fromisoformat(case["first_payment_date"].replace("Z", "+00:00"))
            days = (datetime.now(timezone.utc) - d.replace(tzinfo=timezone.utc) if d.tzinfo is None else datetime.now(timezone.utc) - d).days
            if days <= 2:
                score += 30
                flags.append(PERIODS["very_recent"][L])
            elif days <= 7:
                score += 20
                flags.append(PERIODS["recent"][L])
            elif days <= 30:
                score += 10
    except Exception:
        pass

    # Boolean rule flags
    for key, label_dict, weight in RED_FLAG_RULES:
        if case.get(key):
            score += weight
            flags.append(label_dict[L])

    # Scam-type flags
    flags.extend(SCAM_TYPE_FLAGS.get(case.get("scam_type", ""), {}).get(L, []))

    # Payment-rail summary
    pay = (case.get("payment_method") or "").lower()
    rail = PAYMENT_RAIL_SUMMARY.get(pay)
    rail_summary = rail[L] if rail else (
        "Metodo di pagamento da chiarire – preparare comunque dossier evidenze"
        if L == "it" else
        "Payment method to clarify — prepare the evidence dossier anyway"
    )

    # Loss amount weight
    try:
        amt = float(case.get("loss_amount") or 0)
        if amt >= 50000:
            score += 25
            flags.append(LARGE_LOSS[L].format(amt=int(amt)))
        elif amt >= 10000:
            score += 15
        elif amt >= 1000:
            score += 8
    except Exception:
        pass

    # Crypto + seed phrase = critical
    if case.get("scam_type") == "crypto" and case.get("seed_phrase_shared"):
        score += 30
        flags.append(CRYPTO_SEED[L])

    # Evidence completeness
    have = {e.get("evidence_type", "").lower() for e in evidence}
    missing = []
    if "screenshot" not in have:
        missing.append(MISSING["screenshot"][L])
    if "ricevuta" not in have and pay in {"sepa", "instant_sepa", "postepay", "card", "paypal"}:
        missing.append(MISSING["receipt"][L])
    if "transaction_hash" not in have and case.get("scam_type") == "crypto":
        missing.append(MISSING["tx_hash"][L])
    if "iban" not in have and pay in {"sepa", "instant_sepa"}:
        missing.append(MISSING["iban"][L])
    if not evidence:
        missing.append(MISSING["no_evidence"][L])

    if len(transactions) == 0:
        missing.append(MISSING["no_tx"][L])
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
        actions.append(ACTIONS["sepa_recall"][L])
    if pay == "card":
        actions.append(ACTIONS["card_chargeback"][L])
    if pay in {"postepay"} or case.get("scam_type") == "postepay":
        actions.append(ACTIONS["poste_complaint"][L])
    if case.get("scam_type") in {"forex_broker"}:
        actions.append(ACTIONS["consob_filing"][L])
    if case.get("scam_type") == "crypto":
        actions.append(ACTIONS["exchange_freeze"][L])
    actions.append(ACTIONS["police"][L])
    actions.append(ACTIONS["preserve"][L])
    if case.get("requested_extra_fee"):
        actions.append(ACTIONS["no_secondary"][L])
    actions.append(ACTIONS["lawyer"][L])

    # Tracing summary nodes
    nodes = _build_tracing_nodes(case, transactions, L)

    return {
        "urgency_score": score,
        "urgency_category": category,
        "red_flags": list(dict.fromkeys(flags))[:20],
        "missing_evidence": missing,
        "recommended_actions": actions,
        "payment_rail_summary": rail_summary,
        "tracing_summary": nodes,
        "recovery_outlook": _outlook(score, pay, case, L),
        "language": L,
    }


def _outlook(score: int, pay: str, case: dict, L: str) -> str:
    if case.get("requested_extra_fee") or case.get("scam_type") == "fake_recovery":
        return OUTLOOK["secondary_scam"][L]
    if pay == "card":
        return OUTLOOK["card"][L]
    if pay == "sepa":
        return OUTLOOK["sepa"][L]
    if pay == "instant_sepa":
        return OUTLOOK["instant_sepa"][L]
    if case.get("scam_type") == "crypto":
        return OUTLOOK["crypto"][L]
    if score >= 60:
        return OUTLOOK["high"][L]
    return OUTLOOK["default"][L]


def _build_tracing_nodes(case: dict, transactions: list, L: str = "it") -> Dict[str, Any]:
    pay = (case.get("payment_method") or "").lower()
    scam = (case.get("scam_type") or "").lower()

    chains = {
        ("sepa_or_instant",): {
            "it": ["Banca Vittima", "Rete SEPA", "IBAN Beneficiario", "Possibile Mule Account", "Richiesta Recall"],
            "en": ["Victim Bank", "SEPA Network", "Beneficiary IBAN", "Possible Mule Account", "Recall Request"],
        },
        ("postepay",): {
            "it": ["PostePay/BancoPosta", "Ricarica/Trasferimento", "Destinatario", "Reclamo Poste"],
            "en": ["PostePay/BancoPosta", "Top-up/Transfer", "Recipient", "Poste Complaint"],
        },
        ("card",): {
            "it": ["Carta Vittima", "Merchant Descriptor", "Payment Processor", "Chargeback Route"],
            "en": ["Victim Card", "Merchant Descriptor", "Payment Processor", "Chargeback Route"],
        },
        ("crypto",): {
            "it": ["Exchange Origine", "Wallet Address", "Blockchain TX", "Wallet Destinatario", "Possibile Exchange Esposto", "Freeze Request"],
            "en": ["Origin Exchange", "Wallet Address", "Blockchain TX", "Recipient Wallet", "Possible Exposed Exchange", "Freeze Request"],
        },
        ("forex_broker",): {
            "it": ["Deposito Vittima", "Finta Piattaforma Broker", "IBAN/Wallet/Processor", "Prelievo Bloccato", "CONSOB / Polizia Report"],
            "en": ["Victim Deposit", "Fake Broker Platform", "IBAN/Wallet/Processor", "Blocked Withdrawal", "CONSOB / Police Report"],
        },
        ("fake_recovery",): {
            "it": ["Vittima", "Finto Recuperatore", "Richiesta Tassa di Sblocco", "ALERT Secondary Scam"],
            "en": ["Victim", "Fake Recovery Agent", "Unlock Fee Request", "ALERT Secondary Scam"],
        },
        ("wallet_apps",): {
            "it": ["Wallet/App", "Account Destinatario", "Platform Dispute Route"],
            "en": ["Wallet/App", "Recipient Account", "Platform Dispute Route"],
        },
        ("default",): {
            "it": ["Vittima", "Metodo di Pagamento", "Destinatario", "Report Generato"],
            "en": ["Victim", "Payment Method", "Recipient", "Generated Report"],
        },
    }

    if pay in ("instant_sepa", "sepa"):
        chain = chains[("sepa_or_instant",)][L]
    elif pay == "postepay" or scam == "postepay":
        chain = chains[("postepay",)][L]
    elif pay == "card":
        chain = chains[("card",)][L]
    elif scam == "crypto":
        chain = chains[("crypto",)][L]
    elif scam == "forex_broker":
        chain = chains[("forex_broker",)][L]
    elif scam == "fake_recovery":
        chain = chains[("fake_recovery",)][L]
    elif pay in {"paypal", "revolut", "wise", "satispay"}:
        chain = chains[("wallet_apps",)][L]
    else:
        chain = chains[("default",)][L]

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
    L = "en" if (language or "it").lower().startswith("en") else "it"
    user_full_name = case.get("user_full_name") or ("[Full Name]" if L == "en" else "[Nome Cognome]")
    case_ref = case.get("case_reference", "—")
    amount = _format_eur(case.get("loss_amount", 0))
    pay = case.get("payment_method") or "—"
    scam = case.get("scam_type") or "—"
    first_date = case.get("first_payment_date") or "—"
    last_date = case.get("last_contact_date") or "—"

    tx_lines = []
    for t in transactions[:30]:
        line = f"- [{t.get('payment_type','')}] {t.get('date','')} | {_format_eur(t.get('amount',0))} {t.get('currency','EUR')} | "
        if t.get("iban"):              line += f"IBAN {t['iban']} ({t.get('iban_country','')}) "
        if t.get("recipient_name"):    line += f"-> {t['recipient_name']} "
        if t.get("tx_hash"):           line += f"hash: {t['tx_hash']} "
        if t.get("wallet_address"):    line += f"wallet: {t['wallet_address']} "
        if t.get("reference_number"):  line += f"ref: {t['reference_number']} "
        tx_lines.append(line.strip())
    tx_block = "\n".join(tx_lines) if tx_lines else ("No transactions recorded." if L == "en" else "Nessuna transazione registrata.")

    ev_lines = [f"- {e.get('title','')} ({e.get('evidence_type','')}): {('present' if e.get('collected') else 'missing') if L == 'en' else ('presente' if e.get('collected') else 'mancante')}"
                for e in evidence] or [("No evidence recorded." if L == "en" else "Nessuna prova registrata.")]
    ev_block = "\n".join(ev_lines)

    flags = "\n".join(f"- {f}" for f in (analysis or {}).get("red_flags", [])) or ("- (under evaluation)" if L == "en" else "- (in valutazione)")
    actions = "\n".join(f"- {a}" for a in (analysis or {}).get("recommended_actions", []))

    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")

    titles_it = {
        "bank_complaint": "Reclamo Banca per Operazione Contestata",
        "chargeback":     "Richiesta di Chargeback Carta",
        "poste_complaint":"Reclamo Poste Italiane / PostePay / BancoPosta",
        "consob_report":  "Segnalazione CONSOB - Sospetta Truffa di Investimento",
        "police_report":  "Riassunto per Denuncia - Polizia Postale",
        "exchange_freeze":"Richiesta di Freeze Exchange - Sospetto Riciclaggio",
        "lawyer_memo":    "Memo Caso per Avvocato",
        "case_timeline":  "Timeline Personale del Caso",
        "recovery_warning":"Warning Report - Falso Recupero Fondi",
    }
    titles_en = {
        "bank_complaint": "Bank Complaint - Disputed Transaction",
        "chargeback":     "Card Chargeback Request",
        "poste_complaint":"Poste Italiane / PostePay / BancoPosta Complaint",
        "consob_report":  "CONSOB Filing - Suspected Investment Scam",
        "police_report":  "Police Summary - Polizia Postale",
        "exchange_freeze":"Exchange Freeze Request - Suspected Laundering",
        "lawyer_memo":    "Lawyer Case Memo",
        "case_timeline":  "Personal Case Timeline",
        "recovery_warning":"Warning Report - Fake Recovery Scam",
    }
    titles = titles_en if L == "en" else titles_it
    title = titles.get(report_type, "Case Report" if L == "en" else "Report Caso")

    intro_it = {
        "bank_complaint": (
            f"Il/La sottoscritto/a {user_full_name} segnala alla banca emittente operazioni di pagamento "
            f"ritenute non autorizzate / contestate, per un importo totale stimato di {amount}. "
            f"Si richiede l'apertura di un reclamo formale e, ove applicabile, l'attivazione delle procedure "
            f"di richiesta di recall del bonifico ai sensi della normativa sui servizi di pagamento "
            f"(incluso il D. Lgs. 11/2010)."
        ),
        "chargeback": f"Si richiede l'apertura di una procedura di chargeback per la transazione contestata di {amount}.",
        "poste_complaint": f"Il/La sottoscritto/a {user_full_name} presenta reclamo a Poste Italiane in merito ad operazioni PostePay/BancoPosta riconducibili a sospetta truffa, per un totale di {amount}.",
        "consob_report":  "Il/La sottoscritto/a intende segnalare a CONSOB un soggetto / piattaforma sospetta di operare abusivamente come intermediario o di proporre offerte di investimento non autorizzate.",
        "police_report":  f"Il/La sottoscritto/a {user_full_name} riassume i fatti relativi a presunta truffa online al fine di sporgere denuncia / querela presso la Polizia Postale o il Commissariato di P.S. Online.",
        "exchange_freeze":"Si richiede al compliance team dell'exchange di valutare il blocco preventivo di fondi associati al wallet sottostante.",
        "lawyer_memo":    "Memo professionale a uso dello studio legale incaricato. Sintesi dei fatti, evidenze, transazioni e analisi preliminare.",
        "case_timeline":  "Timeline personale degli eventi e dei pagamenti, utile per condivisione con banca, exchange, autorità o consulenti.",
        "recovery_warning":"ATTENZIONE: il caso presenta indicatori riconducibili a tentativi di FALSO RECUPERO FONDI (secondary scam). Non versare ulteriori somme.",
    }
    intro_en = {
        "bank_complaint": (
            f"The undersigned, {user_full_name}, reports to the issuing bank payment operations "
            f"deemed unauthorized / disputed, for a total estimated amount of {amount}. "
            f"A formal complaint is requested and, where applicable, the activation of recall procedures "
            f"under Italian payment-services regulation (including Legislative Decree 11/2010)."
        ),
        "chargeback":      f"A chargeback procedure is requested for the disputed transaction of {amount}, made by payment card.",
        "poste_complaint": f"The undersigned, {user_full_name}, files a complaint with Poste Italiane regarding PostePay/BancoPosta operations related to a suspected scam, totalling {amount}.",
        "consob_report":   "The undersigned intends to report to CONSOB an entity / platform suspected of operating unlawfully as an intermediary or proposing unauthorized investment offers.",
        "police_report":   f"The undersigned, {user_full_name}, summarizes the facts of an alleged online scam in order to file a complaint with the Polizia Postale or online police precinct.",
        "exchange_freeze": "The exchange compliance team is requested to evaluate a preventive freeze of funds associated with the underlying wallet, due to suspected fraudulent movement.",
        "lawyer_memo":     "Professional memo for the engaged law firm. Facts summary, evidence, transactions and preliminary analysis.",
        "case_timeline":   "Personal timeline of events and payments, useful for sharing with bank, exchange, authorities or professionals.",
        "recovery_warning":"WARNING: the case shows indicators of FAKE RECOVERY SCAM (secondary scam). Do not send any further funds.",
    }
    intro = (intro_en if L == "en" else intro_it).get(report_type, "")

    if L == "en":
        body = f"""{title.upper()}

Report date: {today}
Case reference: {case_ref}

DECLARANT
- Name: {user_full_name}
- Country: {case.get('country','IT')}
- Region/City: {case.get('region','—')}

SUBJECT
{intro}

CASE SUMMARY
- Suspected scam type: {scam}
- Main payment method: {pay}
- Estimated loss: {amount}
- First payment date: {first_date}
- Last contact date: {last_date}
- Scammer still active: {'Yes' if case.get('scammer_still_active') else 'No'}
- Further payment / unlock-fee requests: {'Yes' if case.get('requested_extra_fee') else 'No'}
- Impersonated authority: {case.get('impersonated_authority') or 'None'}

RELEVANT TRANSACTIONS
{tx_block}

AVAILABLE EVIDENCE
{ev_block}

DETECTED RISK INDICATORS
{flags}

REQUESTED / RECOMMENDED ACTIONS
{actions}

DECLARATION
The information above is provided in good faith by the declarant. This document is prepared with
the support of AI-FUNDS, a documentation platform for victims of online scams. AI-FUNDS is not
affiliated with CONSOB, Banca d'Italia, Polizia Postale, Poste Italiane, banks or exchanges, and
does not provide legal advice. The assessments are preliminary.

Declarant signature: __________________________      Date: {today}
"""
    else:
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
async def analyze_case(case_id: str, lang: str = "it", user=Depends(get_current_user)):
    c = await db.cases.find_one({"id": case_id, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    txs = await db.transactions.find({"case_id": case_id}, {"_id": 0}).to_list(500)
    evs = await db.evidence.find({"case_id": case_id}, {"_id": 0}).to_list(500)
    result = _compute_analysis(c, txs, evs, lang)
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
