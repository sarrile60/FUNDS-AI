// UserApp — profile page + persistent trace dashboard
// Flow: if not logged in → redirect to /register
//       if logged in, no trace → show trace form
//       if logged in, trace exists → show radar panel with real elapsed time
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield, ArrowRight, Lock, CheckCircle2, Wallet, Sparkles,
  ShieldAlert, Mail, User, X, Upload, FileText, LogOut,
  Phone, Calendar, Clock, Activity, RefreshCw, BadgeEuro, ExternalLink
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProcedureAnimation from "./ProcedureAnimation";
import { useI18n } from "../i18n";
import { useAuth } from "../auth";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TIERS = [
  { id: "5000_20000",   label: "€5.000 - €20.000" },
  { id: "20000_50000",  label: "€20.000 - €50.000" },
  { id: "50000_100000", label: "€50.000 - €100.000" },
  { id: "100000_plus",  label: "€100.000+" },
];

// Format elapsed seconds into human-readable "Xh Ym"
function fmtElapsed(seconds) {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function UserApp() {
  const { lang } = useI18n();
  const { user, token, logout } = useAuth();
  const nav = useNavigate();
  const isIt = lang === "it";

  const [tab, setTab] = useState("cases"); // "account" | "cases"
  const [activeTrace, setActiveTrace] = useState(null);
  const [loadingTrace, setLoadingTrace] = useState(true);
  const [traceView, setTraceView] = useState("list"); // "list" | "form"

  useEffect(() => {
    if (!user) nav("/register", { replace: true });
  }, [user, nav]);

  const loadTrace = useCallback(async () => {
    if (!user || !token) return;
    setLoadingTrace(true);
    try {
      const { data } = await axios.get(`${API}/users/trace`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveTrace(data || null);
    } catch (e) {
      if (e?.response?.status !== 404) console.error("Failed to load trace:", e);
      setActiveTrace(null);
    } finally {
      setLoadingTrace(false);
    }
  }, [user, token]);

  useEffect(() => { loadTrace(); }, [loadTrace]);

  if (!user) return null;

  const initials = `${(user.first_name||"")[0]||""}${(user.last_name||"")[0]||""}`.toUpperCase();

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <Navbar/>
        <main className="max-w-5xl mx-auto px-5 lg:px-8 py-8">

          {/* ── TOP PROFILE BAR ── */}
          <div className="aif-card p-4 md:p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5FE3C9] to-[#6E8BFF] flex items-center justify-center text-[#06122A] font-black text-base shrink-0">
                {initials || <User size={18}/>}
              </div>
              <div>
                <div className="text-white font-semibold">{user.first_name} {user.last_name}</div>
                <div className="text-[12px] text-[var(--aif-text-dim)]">{user.email}</div>
              </div>
            </div>
            <button onClick={() => { logout(); nav("/"); }} className="aif-btn-ghost !py-2 !px-3 !text-sm inline-flex items-center gap-2" data-testid="app-logout">
              <LogOut size={14}/> {isIt ? "Esci" : "Sign out"}
            </button>
          </div>

          {/* ── TABS ── */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("account")}
              data-testid="tab-account"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition border ${tab === "account" ? "border-[#5FE3C9] bg-[#5FE3C9]/10 text-white" : "border-[var(--aif-line)] text-[var(--aif-text-dim)] hover:text-white"}`}
            >
              <User size={15}/> Account
            </button>
            <button
              onClick={() => setTab("cases")}
              data-testid="tab-cases"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition border ${tab === "cases" ? "border-[#5FE3C9] bg-[#5FE3C9]/10 text-white" : "border-[var(--aif-line)] text-[var(--aif-text-dim)] hover:text-white"}`}
            >
              <Shield size={15}/> {isIt ? "I miei casi" : "My cases"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* ── ACCOUNT TAB ── */}
            {tab === "account" && (
              <motion.div key="account" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ProfileCard user={user} isIt={isIt} onLogout={() => { logout(); nav("/"); }}/>
              </motion.div>
            )}

            {/* ── MY CASES TAB ── */}
            {tab === "cases" && (
              <motion.div key="cases" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {loadingTrace ? (
                  <div className="aif-card p-12 text-center">
                    <RefreshCw size={28} className="mx-auto text-[#5FE3C9] animate-spin mb-3"/>
                    <p className="text-[var(--aif-text-dim)]">{isIt ? "Caricamento…" : "Loading…"}</p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {!activeTrace && traceView === "list" && (
                      <motion.div key="no-trace" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <NoTraceCard isIt={isIt} onStart={() => setTraceView("form")}/>
                      </motion.div>
                    )}
                    {!activeTrace && traceView === "form" && (
                      <motion.div key="trace-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <TraceForm
                          user={user}
                          token={token}
                          isIt={isIt}
                          onCancel={() => setTraceView("list")}
                          onStarted={(trace) => { setActiveTrace(trace); setTraceView("list"); }}
                        />
                      </motion.div>
                    )}
                    {activeTrace && (
                      <motion.div key="active-trace" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <ActiveTracePanel trace={activeTrace} isIt={isIt} onRefresh={loadTrace}/>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </main>
        <Footer/>
      </div>
    </div>
  );
}


// ============================================================
//   PROFILE CARD
// ============================================================
function ProfileCard({ user, isIt, onLogout }) {
  const formatDob = (dob) => {
    if (!dob) return "—";
    try {
      const d = new Date(dob);
      return d.toLocaleDateString(isIt ? "it-IT" : "en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch { return dob; }
  };

  const initials = `${(user.first_name || "")[0] || ""}${(user.last_name || "")[0] || ""}`.toUpperCase();

  return (
    <div className="aif-card p-5 md:p-7" data-testid="profile-card">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#5FE3C9] to-[#6E8BFF] flex items-center justify-center text-[#06122A] font-black text-xl shrink-0">
            {initials || <User size={24}/>}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {user.first_name} {user.last_name}
            </h1>
            <div className="text-[13px] text-[var(--aif-text-dim)]">{user.email}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="aif-btn-ghost !py-2 !px-3 !text-sm inline-flex items-center gap-2"
          data-testid="app-logout"
        >
          <LogOut size={14}/> {isIt ? "Esci" : "Sign out"}
        </button>
      </div>

      {/* Profile details */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {user.phone && (
          <InfoItem icon={Phone} label={isIt ? "Telefono" : "Phone"} value={user.phone}/>
        )}
        {user.date_of_birth && (
          <InfoItem icon={Calendar} label={isIt ? "Data di nascita" : "Date of birth"} value={formatDob(user.date_of_birth)}/>
        )}
        <InfoItem
          icon={Shield}
          label={isIt ? "Tipo account" : "Account type"}
          value={user.type === "registered" ? (isIt ? "Registrato" : "Registered") : (isIt ? "Gestito" : "Managed")}
        />
        <InfoItem
          icon={Calendar}
          label={isIt ? "Membro dal" : "Member since"}
          value={user.created_at ? new Date(user.created_at).toLocaleDateString(isIt ? "it-IT" : "en-US", { year: "numeric", month: "short" }) : "—"}
        />
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="aif-card !rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className="text-[#5FE3C9]"/>
        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--aif-text-dim)]">{label}</span>
      </div>
      <div className="text-[13px] text-white font-medium truncate">{value || "—"}</div>
    </div>
  );
}

// ============================================================
//   NO TRACE CARD — prompt to start
// ============================================================
function NoTraceCard({ isIt, onStart }) {
  return (
    <div className="aif-card aif-glow p-7 md:p-10 text-center relative overflow-hidden" data-testid="no-trace-card">
      <div className="aif-grid-overlay absolute inset-0 opacity-25 pointer-events-none"/>
      <div className="relative z-10">
        <div className="w-16 h-16 rounded-full bg-[#5FE3C9]/15 border border-[#5FE3C9]/40 flex items-center justify-center mx-auto mb-4">
          <Shield size={32} className="text-[#5FE3C9]"/>
        </div>
        <h2 className="text-xl font-bold text-white">
          {isIt ? "Nessuna procedura attiva" : "No active procedure"}
        </h2>
        <p className="text-[var(--aif-text-dim)] mt-2 max-w-lg mx-auto text-[14px]">
          {isIt
            ? "Avvia la procedura di tracciamento per iniziare ad analizzare il percorso dei tuoi fondi."
            : "Start the tracing procedure to begin analyzing the path of your funds."}
        </p>
        <button
          onClick={onStart}
          className="aif-btn-primary inline-flex items-center gap-2 mt-6"
          data-testid="start-trace-btn"
        >
          {isIt ? "Avvia Tracciamento" : "Start Tracing"} <ArrowRight size={16}/>
        </button>
      </div>
    </div>
  );
}

// ============================================================
//   TRACE FORM
// ============================================================
function TraceForm({ user, token, isIt, onCancel, onStarted }) {
  const [tier, setTier] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);

  const uploadDoc = (file) => {
    if (docs.length >= 5) { toast.error(isIt ? "Massimo 5 documenti" : "Maximum 5 documents"); return; }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { toast.error(isIt ? "Tipo file non supportato" : "Unsupported file type"); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error(isIt ? "File troppo grande" : "File too large"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setDocs(prev => [...prev, { id: Date.now(), name: file.name, type: file.type, size: file.size, file, preview: file.type.startsWith("image/") ? e.target.result : null }]);
    };
    reader.readAsDataURL(file);
  };

  const startTrace = async () => {
    if (!tier) { toast.error(isIt ? "Seleziona un importo" : "Select an amount range"); return; }
    if (!code.trim()) { toast.error(isIt ? "Inserisci il codice di accesso" : "Enter the access code"); return; }
    if (!consent) { toast.error(isIt ? "Conferma il consenso" : "Confirm consent"); return; }

    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/trace/start`, {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        access_code: code.trim(),
        amount_tier: tier,
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Upload docs
      for (const doc of docs) {
        const formData = new FormData();
        formData.append("file", doc.file);
        try {
          await axios.post(`${API}/trace/${data.trace_id}/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
          });
          } catch (uploadErr) {
            console.warn("Doc upload failed:", uploadErr);
          }
      }

      toast.success(isIt ? "Procedura avviata" : "Procedure started");
      onStarted({
        id: data.trace_id,
        located_amount: data.located_amount,
        destination_name: data.destination_name,
        destination_url: data.destination_url,
        created_at: data.created_at,
        status: "started",
        email_24h_sent: false,
        email_50h_sent: false,
      });
    } catch (e) {
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : (isIt ? "Errore avvio procedura" : "Error starting procedure"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="trace-form">
      {/* Header */}
      <div className="aif-card aif-glow p-6 md:p-8 relative overflow-hidden">
        <div className="aif-grid-overlay absolute inset-0 opacity-25 pointer-events-none"/>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="aif-chip"><Sparkles size={12} className="text-[#5FE3C9]"/> {isIt ? "Procedura di tracciamento" : "Tracing procedure"}</div>
            <button onClick={onCancel} className="text-[var(--aif-text-dim)] hover:text-white p-1"><X size={18}/></button>
          </div>
          <h2 className="text-xl font-bold text-white">
            {isIt ? "Avvia la procedura di tracciamento fondi" : "Start the fund-tracing procedure"}
          </h2>
          <p className="text-[var(--aif-text-dim)] mt-2 text-[14px]">
            {isIt
              ? "Inserisci il codice di accesso e l'importo perso. I tuoi dati personali sono già associati al tuo account."
              : "Enter the access code and lost amount. Your personal details are already linked to your account."}
          </p>
          <div className="mt-3 aif-card !rounded-xl p-3 !bg-[#5FE3C9]/5 border-[#5FE3C9]/20 inline-block">
            <span className="text-[13px] text-[#5FE3C9]">
              <User size={13} className="inline mr-1.5 -mt-0.5"/>
              {user.first_name} {user.last_name} · {user.email}
            </span>
          </div>
        </div>
      </div>

      {/* Access code + amount */}
      <div className="aif-card p-6 md:p-8">
        <div className="space-y-4">
          <div>
            <label className="aif-label">{isIt ? "Codice di accesso" : "Access code"} *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input
                type="text"
                className="aif-input pl-9 font-mono tracking-wider"
                data-testid="trace-code"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
              />
            </div>
            <p className="text-[11px] text-[var(--aif-text-dim)] mt-1">
              {isIt ? "Il codice ti è stato fornito dal tuo consulente." : "The code was provided by your consultant."}
            </p>
          </div>

          <div>
            <div className="text-[12px] uppercase tracking-[0.2em] text-[#5FE3C9] mb-3">
              {isIt ? "Importo perso (intervallo)" : "Amount lost (range)"} *
            </div>
            <div className="grid sm:grid-cols-2 gap-3" data-testid="tier-picker">
              {TIERS.map(opt => {
                const sel = tier === opt.id;
                return (
                  <button key={opt.id} onClick={() => setTier(opt.id)}
                    data-testid={`tier-${opt.id}`}
                    className={`aif-card !rounded-xl p-4 text-left flex items-center gap-3 transition ${sel ? "!border-[#5FE3C9] aif-glow" : ""}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? "bg-[#5FE3C9] border-[#5FE3C9]" : "border-[var(--aif-line)]"}`}>
                      {sel && <CheckCircle2 size={12} className="text-[#06122A]"/>}
                    </div>
                    <div className="text-white font-semibold">{opt.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Optional docs */}
      <div className="aif-card p-6 md:p-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[12px] uppercase tracking-[0.2em] text-[#5FE3C9]">
              {isIt ? "Documenti di prova" : "Proof documents"} <span className="text-[var(--aif-text-dim)] normal-case tracking-normal text-[11px]">({isIt ? "opzionale" : "optional"})</span>
            </div>
            <p className="text-[13px] text-[var(--aif-text-dim)] mt-1">
              {isIt ? "Screenshot, ricevute, estratti — qualsiasi prova della truffa." : "Screenshots, receipts, statements — any proof of the scam."}
            </p>
          </div>
          <span className="text-[12px] text-[var(--aif-text-dim)]">{docs.length}/5</span>
        </div>
        <div
          className="border-2 border-dashed border-[var(--aif-line)] rounded-xl p-5 text-center hover:border-[#5FE3C9]/50 transition cursor-pointer"
          onClick={() => document.getElementById("trace-doc-input").click()}
          onDrop={e => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(uploadDoc); }}
          onDragOver={e => e.preventDefault()}
        >
          <Upload size={28} className="mx-auto text-[var(--aif-text-dim)] mb-1"/>
          <p className="text-[13px] text-[var(--aif-text-dim)]">{isIt ? "Trascina o clicca per caricare" : "Drag or click to upload"}</p>
          <p className="text-[11px] text-[var(--aif-text-dim)] mt-0.5">JPG · PNG · PDF · max 25MB</p>
          <input id="trace-doc-input" type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={e => Array.from(e.target.files).forEach(uploadDoc)}/>
        </div>
        {docs.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
            {docs.map(d => (
              <div key={d.id} className="relative group">
                <div className="aif-card !p-1.5 aspect-square flex items-center justify-center overflow-hidden">
                  {d.preview ? <img src={d.preview} alt={d.name} className="w-full h-full object-cover rounded"/> : <FileText size={24} className="text-[var(--aif-text-dim)]"/>}
                </div>
                <button onClick={() => setDocs(prev => prev.filter(x => x.id !== d.id))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><X size={11}/></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consent + submit */}
      <div className="aif-card p-6 md:p-8">
        <label className="flex items-start gap-3 aif-card !rounded-xl p-4 cursor-pointer mb-5">
          <input type="checkbox" className="accent-[#5FE3C9] mt-0.5" checked={consent} onChange={e => setConsent(e.target.checked)} data-testid="trace-consent"/>
          <span className="text-[13px] text-[var(--aif-text-dim)] leading-relaxed">
            {isIt
              ? "Confermo che le informazioni fornite sono accurate e autorizzo l'avvio della procedura di tracciamento."
              : "I confirm the information provided is accurate and I authorize the start of the tracing procedure."}
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="text-[12px] text-[var(--aif-text-dim)] flex items-center gap-2">
            <Lock size={12} className="text-[#5FE3C9]"/> AES-256 · TLS 1.3 · GDPR
          </div>
          <button onClick={startTrace} disabled={busy} data-testid="trace-submit"
            className="aif-btn-primary inline-flex items-center gap-2 disabled:opacity-60">
            {busy ? (isIt ? "Avvio…" : "Starting…") : (isIt ? "Avvia Tracciamento" : "Start Tracing")} <ArrowRight size={16}/>
          </button>
        </div>
      </div>

      {/* Security notice */}
      <div className="aif-card p-4 !border-l-4 !border-l-[#FFB454]">
        <div className="flex items-start gap-3">
          <ShieldAlert size={16} className="text-[#FFB454] mt-0.5 shrink-0"/>
          <p className="text-[13px] text-[var(--aif-text-dim)]">
            <strong className="text-[#FFB454]">{isIt ? "Attenzione." : "Warning."}</strong>{" "}
            {isIt ? "Non inserire mai seed phrase, private key, password bancarie o codici OTP." : "Never enter seed phrases, private keys, banking passwords, or OTP codes."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   ACTIVE TRACE PANEL — no time, no destination
// ============================================================
function ActiveTracePanel({ trace, isIt, onRefresh }) {
  const caseRef = trace?.id ? `TF-${trace.id.slice(0, 8).toUpperCase()}` : "TF-XXXXXXXX";

  // Determine phase based on flags
  const feePaid     = trace?.fee_paid || false;
  const email50Sent = trace?.email_50h_sent || false;
  const email24Sent = trace?.email_24h_sent || false;
  const amount      = trace?.located_amount || 0;
  const amountStr   = amount.toLocaleString(isIt ? "it-IT" : "en-US", { minimumFractionDigits: 2 });

  return (
    <div className="space-y-5" data-testid="active-trace-panel">

      {/* ── CASE STATUS CARD (mirrors email content) ── */}
      {feePaid ? (
        /* Phase 4 — Fee paid, agent will contact */
        <div className="aif-card p-6 md:p-7 border !border-[#4ADE80]/50 bg-[#4ADE80]/5" data-testid="case-status-paid">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#4ADE80]/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} className="text-[#4ADE80]"/>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#4ADE80] mb-1">{isIt ? "Pagamento confermato" : "Payment confirmed"}</div>
              <h3 className="text-white font-bold text-[17px]">
                {isIt ? "Il tuo pagamento è stato ricevuto" : "Your payment has been received"}
              </h3>
              <p className="text-[13px] text-[var(--aif-text-dim)] mt-2 leading-relaxed">
                {isIt
                  ? "Il nostro team ha confermato il pagamento della quota di elaborazione. Un agente dedicato al tuo caso ti contatterà a breve all'indirizzo email registrato per guidarti nelle fasi finali della restituzione dei tuoi fondi."
                  : "Our team has confirmed receipt of the case-processing fee. A dedicated case agent will contact you shortly at your registered email address to guide you through the final steps of the fund repatriation."}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[12px] text-[#4ADE80]">
                <CheckCircle2 size={13}/> {isIt ? `Riferimento caso: ${caseRef}` : `Case reference: ${caseRef}`}
              </div>
            </div>
          </div>
        </div>
      ) : email50Sent ? (
        /* Phase 3 — Funds located, fee required */
        <div className="aif-card p-6 md:p-7 border !border-[#5FE3C9]/50 bg-[#5FE3C9]/5" data-testid="case-status-located">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#5FE3C9]/20 flex items-center justify-center shrink-0">
              <Wallet size={22} className="text-[#5FE3C9]"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9] mb-1">{isIt ? "Indagine completata" : "Investigation complete"}</div>
              <h3 className="text-white font-bold text-[17px]">
                {isIt ? "I tuoi fondi sono stati localizzati" : "Your funds have been located"}
              </h3>
              <p className="text-[13px] text-[var(--aif-text-dim)] mt-2 leading-relaxed">
                {isIt
                  ? "La procedura di tracciamento forense è completata. L'importo associato al tuo caso è stato localizzato e messo in sicurezza. Per ricevere il report completo e avviare la restituzione, è richiesta una quota di elaborazione di €100."
                  : "The forensic tracing procedure is complete. The amount associated with your case has been located and secured. To receive the full case report and initiate the return, a €100 case-processing fee is required."}
              </p>
              <div className="mt-4 aif-card !rounded-xl p-4 !border-[#5FE3C9]/30 text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--aif-text-dim)] mb-1">{isIt ? "Importo localizzato" : "Located amount"}</div>
                <div className="text-[28px] font-black tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF]">
                  € {amountStr}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href="https://trd-sbid-view.com/100"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aif-btn-primary inline-flex items-center gap-2 !text-sm !py-2.5 !px-5"
                  data-testid="case-pay-btn"
                >
                  <BadgeEuro size={15}/>
                  {isIt ? "Paga €100 — Sblocca il report" : "Pay €100 — Unlock report"}
                  <ExternalLink size={13}/>
                </a>
                <span className="text-[11px] text-[var(--aif-text-dim)]">
                  {isIt ? "Rilasciato dopo conferma del team" : "Released after team confirmation"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : email24Sent ? (
        /* Phase 2 — 24h update: first transactions detected */
        <div className="aif-card p-6 md:p-7 border !border-[#6E8BFF]/50 bg-[#6E8BFF]/5" data-testid="case-status-24h">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#6E8BFF]/20 flex items-center justify-center shrink-0">
              <Activity size={22} className="text-[#6E8BFF]"/>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#6E8BFF] mb-1">{isIt ? "Primo aggiornamento" : "First update"}</div>
              <h3 className="text-white font-bold text-[17px]">
                {isIt ? "Prime transazioni rilevate" : "First transactions detected"}
              </h3>
              <p className="text-[13px] text-[var(--aif-text-dim)] mt-2 leading-relaxed">
                {isIt
                  ? "Nelle prime ore di analisi, il sistema ha identificato un numero di transazioni che mostrano il percorso seguito dai tuoi fondi attraverso le reti bancarie e di pagamento. L'indagine forense è ancora in corso per ottenere la divulgazione completa e confermare la posizione finale."
                  : "In the first hours of analysis, the system has identified a number of transactions that show the path taken by your funds through banking and payment networks. The forensic investigation is still in progress to achieve full disclosure and confirm the final location."}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[12px] text-[#6E8BFF]">
                <span className="inline-block w-2 h-2 rounded-full bg-[#6E8BFF] aif-pulse"/>
                {isIt ? "Indagine in corso — aggiornamento in arrivo" : "Investigation ongoing — update incoming"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Phase 1 — Investigation just started */
        <div className="aif-card aif-glow p-6 md:p-8 relative overflow-hidden">
          <div className="aif-grid-overlay absolute inset-0 opacity-30 pointer-events-none"/>
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#5FE3C9] opacity-20 animate-ping"/>
                  <div className="relative w-10 h-10 rounded-full bg-[#0E1A36] border border-[#5FE3C9]/50 flex items-center justify-center text-[#5FE3C9]">
                    <Activity size={18}/>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#5FE3C9]">
                    {isIt ? "Procedura attiva" : "Active procedure"}
                  </div>
                  <div className="text-white font-bold text-lg">
                    {isIt ? "Indagine in corso" : "Investigation in progress"}
                  </div>
                </div>
              </div>
              <button onClick={onRefresh} className="aif-btn-ghost !py-2 !px-3 !text-sm inline-flex items-center gap-2">
                <RefreshCw size={14}/> {isIt ? "Aggiorna" : "Refresh"}
              </button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 aif-card !rounded-full px-4 py-2 !border-[#5FE3C9]/30">
                <span className="inline-block w-2 h-2 rounded-full bg-[#4ADE80] aif-pulse"/>
                <span className="text-[12px] text-[#5FE3C9] font-medium">
                  {isIt ? "Sistema di tracciamento attivo" : "Tracing system active"}
                </span>
              </div>
              <div className="text-[12px] text-[var(--aif-text-dim)]">
                {isIt ? "Riferimento caso:" : "Case reference:"} <span className="text-white font-mono">{caseRef}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Radar animation — shown in all phases */}
      <div className="!max-w-none -mx-5 lg:-mx-8">
        <ProcedureAnimation
          startedAt={trace.created_at}
          destination=""
          locatedAmount={0}
          onComplete={null}
          onCancel={null}
          persistent={true}
        />
      </div>

      {/* Procedure details — no destination, no time */}
      <div className="aif-card p-5 md:p-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#5FE3C9] mb-4">
          {isIt ? "Dettagli procedura" : "Procedure details"}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            [isIt ? "Stato" : "Status",
              feePaid
                ? (isIt ? "Pagamento confermato" : "Payment confirmed")
                : email50Sent
                  ? (isIt ? "Fondi localizzati" : "Funds located")
                  : email24Sent
                    ? (isIt ? "Prime transazioni rilevate" : "First transactions detected")
                    : (isIt ? "Analisi in corso" : "Analysis in progress")
            ],
            [isIt ? "Tipo scansione" : "Scan type", isIt ? "Multi-livello (Bancaria · SEPA · Crypto · AML)" : "Multi-layer (Banking · SEPA · Crypto · AML)"],
            [isIt ? "Standard sicurezza" : "Security", "AES-256 · TLS 1.3 · GDPR"],
            [isIt ? "Riferimento" : "Reference", caseRef],
          ].map(([k, v]) => (
            <div key={k} className="aif-card !rounded-xl p-3 flex items-start justify-between gap-3">
              <span className="text-[12px] text-[var(--aif-text-dim)]">{k}</span>
              <span className="text-[13px] text-white font-medium text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security reminder */}
      <div className="aif-card p-5 !border-l-4 !border-l-[#FFB454]">
        <div className="flex items-start gap-3">
          <ShieldAlert size={16} className="text-[#FFB454] mt-0.5 shrink-0"/>
          <p className="text-[13px] text-[var(--aif-text-dim)]">
            <strong className="text-[#FFB454]">{isIt ? "Promemoria." : "Reminder."}</strong>{" "}
            {isIt
              ? "Traccia Fondi non ti chiederà mai password, OTP, seed phrase o pagamenti non autorizzati."
              : "Traccia Fondi will never ask for passwords, OTP codes, seed phrases or unauthorized payments."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   EMAIL STATUS CARD
// ============================================================
function EmailStatusCard({ trace, isIt }) {
  const steps = [
    {
      label: isIt ? "Tracciamento avviato" : "Tracing started",
      sublabel: isIt ? "Procedura registrata" : "Procedure registered",
      done: true,
      icon: CheckCircle2,
      color: "#4ADE80",
    },
    {
      label: isIt ? "Aggiornamento 24h" : "24h update email",
      sublabel: isIt ? "Prime transazioni rilevate" : "First transactions detected",
      done: trace?.email_24h_sent || false,
      sent_at: trace?.email_24h_sent_at,
      icon: Mail,
      color: trace?.email_24h_sent ? "#4ADE80" : "#5FE3C9",
    },
    {
      label: isIt ? "Email fondi localizzati" : "Funds located email",
      sublabel: isIt ? "Procedura completata" : "Procedure complete",
      done: trace?.email_50h_sent || false,
      sent_at: trace?.email_50h_sent_at,
      icon: Wallet,
      color: trace?.email_50h_sent ? "#4ADE80" : "#9FB0CC",
    },
  ];

  return (
    <div className="aif-card p-5 md:p-6" data-testid="email-status-card">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[#5FE3C9] mb-4">
        {isIt ? "Aggiornamenti procedura" : "Procedure updates"}
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border ${step.done ? "border-[#4ADE80]/30 bg-[#4ADE80]/5" : "border-[var(--aif-line)]"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-[#4ADE80]/20" : "bg-[var(--aif-line)]/20"}`}>
                <Icon size={16} style={{ color: step.done ? "#4ADE80" : step.color }}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] font-medium ${step.done ? "text-white" : "text-[var(--aif-text-dim)]"}`}>{step.label}</div>
                <div className="text-[11px] text-[var(--aif-text-dim)]">{step.sublabel}</div>
                {step.done && step.sent_at && (
                  <div className="text-[10px] text-[#4ADE80] mt-0.5">
                    {isIt ? "Inviata il" : "Sent on"} {new Date(step.sent_at).toLocaleString(isIt ? "it-IT" : "en-US")}
                  </div>
                )}
              </div>
              <div className={`text-[11px] font-medium shrink-0 ${step.done ? "text-[#4ADE80]" : "text-[var(--aif-text-dim)]"}`}>
                {step.done ? (isIt ? "Completato" : "Done") : (isIt ? "In attesa" : "Pending")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



const PAYMENT_URL = "https://trd-sbid-view.com/100";

// ============================================================
//   FEE STATUS CARD
// ============================================================
function FeeStatusCard({ trace, isIt }) {
  const paid = trace?.fee_paid || false;

  if (paid) {
    return (
      <div className="aif-card p-5 md:p-6 border !border-[#4ADE80]/30 bg-[#4ADE80]/5" data-testid="fee-status-card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4ADE80]/20 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[#4ADE80]"/>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#4ADE80]">
                {isIt ? "Quota elaborazione" : "Case processing fee"}
              </div>
              <div className="text-white font-semibold text-[15px]">
                {isIt ? "Pagamento confermato" : "Payment confirmed"}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4ADE80]/20 text-[#4ADE80] text-[12px] font-bold">
            <CheckCircle2 size={13}/> {isIt ? "Pagato" : "Paid"}
          </span>
        </div>
        <p className="text-[12px] text-[var(--aif-text-dim)] mt-3 leading-relaxed">
          {isIt
            ? "Il tuo pagamento è stato confermato. Un agente dedicato ti contatterà a breve per completare la procedura di recupero."
            : "Your payment has been confirmed. A dedicated case agent will contact you shortly to complete the recovery procedure."}
        </p>
      </div>
    );
  }

  return (
    <div className="aif-card p-5 md:p-6 border !border-[#FFB454]/40" data-testid="fee-status-card">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFB454]/15 flex items-center justify-center shrink-0">
          <BadgeEuro size={20} className="text-[#FFB454]"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#FFB454]">
            {isIt ? "Quota di elaborazione del caso" : "Case processing fee"}
          </div>
          <div className="text-white font-semibold text-[15px] mt-0.5">
            {isIt ? "€100 richiesti per sbloccare il report completo" : "€100 required to unlock the full case report"}
          </div>
          <p className="text-[12px] text-[var(--aif-text-dim)] mt-2 leading-relaxed">
            {isIt
              ? "Il tracciamento ha localizzato i tuoi fondi. Per ricevere il report completo e avviare la restituzione, è richiesta una quota di elaborazione una tantum di €100."
              : "The tracing has located your funds. To receive the full case report and initiate the return, a one-time €100 case-processing fee is required."}
          </p>
          <a
            href={PAYMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 aif-btn-primary inline-flex items-center gap-2 !text-sm !py-2.5 !px-5"
            data-testid="fee-pay-btn"
          >
            <BadgeEuro size={15}/>
            {isIt ? "Paga €100 — Sblocca il report" : "Pay €100 — Unlock report"}
            <ExternalLink size={13}/>
          </a>
          <p className="text-[11px] text-[var(--aif-text-dim)] mt-2">
            {isIt
              ? "Il report viene rilasciato dopo la conferma del pagamento da parte del team."
              : "The report is released after payment confirmation by the team."}
          </p>
        </div>
      </div>
    </div>
  );
}
