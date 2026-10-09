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
  Phone, Calendar, Clock, Activity, RefreshCw
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

  const [activeTrace, setActiveTrace] = useState(null);
  const [loadingTrace, setLoadingTrace] = useState(true);
  const [view, setView] = useState("dashboard"); // "dashboard" | "trace-form"

  // Redirect to register if not logged in
  useEffect(() => {
    if (!user) {
      nav("/register", { replace: true });
    }
  }, [user, nav]);

  // Load user's active trace on mount
  const loadTrace = useCallback(async () => {
    if (!user || !token) return;
    setLoadingTrace(true);
    try {
      const { data } = await axios.get(`${API}/users/trace`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveTrace(data || null);
    } catch (e) {
      if (e?.response?.status !== 404) {
        console.error("Failed to load trace:", e);
      }
      setActiveTrace(null);
    } finally {
      setLoadingTrace(false);
    }
  }, [user, token]);

  useEffect(() => {
    loadTrace();
  }, [loadTrace]);

  if (!user) return null; // redirecting

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <Navbar/>
        <main className="max-w-5xl mx-auto px-5 lg:px-8 py-8 space-y-6">
          {/* Profile header */}
          <ProfileCard user={user} isIt={isIt} onLogout={() => { logout(); nav("/"); }}/>

          {/* Trace section */}
          {loadingTrace ? (
            <div className="aif-card p-10 text-center">
              <RefreshCw size={28} className="mx-auto text-[#5FE3C9] animate-spin mb-3"/>
              <p className="text-[var(--aif-text-dim)]">{isIt ? "Caricamento procedura…" : "Loading procedure…"}</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {!activeTrace && view === "dashboard" && (
                <motion.div key="no-trace" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <NoTraceCard isIt={isIt} onStart={() => setView("trace-form")}/>
                </motion.div>
              )}

              {!activeTrace && view === "trace-form" && (
                <motion.div key="trace-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TraceForm
                    user={user}
                    token={token}
                    isIt={isIt}
                    onCancel={() => setView("dashboard")}
                    onStarted={(trace) => {
                      setActiveTrace(trace);
                      setView("dashboard");
                    }}
                  />
                </motion.div>
              )}

              {activeTrace && (
                <motion.div key="active-trace" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ActiveTracePanel
                    trace={activeTrace}
                    isIt={isIt}
                    onRefresh={loadTrace}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
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
//   ACTIVE TRACE PANEL — radar + elapsed time counter
// ============================================================
function ActiveTracePanel({ trace, isIt, onRefresh }) {
  const [elapsed, setElapsed] = useState(0); // seconds

  // Calculate real elapsed from trace.created_at
  useEffect(() => {
    const createdAt = trace?.created_at ? new Date(trace.created_at).getTime() : Date.now();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - createdAt) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [trace?.created_at]);

  const elapsedStr = fmtElapsed(elapsed);
  const amount = trace?.located_amount || 0;
  const destName = trace?.destination_name || "";
  const destUrl = trace?.destination_url || "";
  const safeUrl = destUrl && !destUrl.startsWith("http") ? `http://${destUrl}` : destUrl;

  return (
    <div className="space-y-5" data-testid="active-trace-panel">
      {/* Live searching card */}
      <div className="aif-card aif-glow p-6 md:p-8 relative overflow-hidden">
        <div className="aif-grid-overlay absolute inset-0 opacity-30 pointer-events-none"/>
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
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
                  {isIt ? "Ricerca in corso" : "Searching"}
                </div>
              </div>
            </div>
            <button onClick={onRefresh} className="aif-btn-ghost !py-2 !px-3 !text-sm inline-flex items-center gap-2">
              <RefreshCw size={14}/> {isIt ? "Aggiorna" : "Refresh"}
            </button>
          </div>

          {/* Big elapsed counter */}
          <div className="text-center py-6">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--aif-text-dim)] mb-3">
              {isIt ? "In ricerca da" : "Searching for"}
            </div>
            <div
              className="font-black tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF] leading-none"
              style={{ fontSize: "clamp(2.5rem, 10vw, 5rem)" }}
              data-testid="elapsed-counter"
            >
              {elapsedStr}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="inline-block w-2 h-2 rounded-full bg-[#4ADE80] aif-pulse"/>
              <span className="text-[12px] text-[var(--aif-text-dim)]">
                {isIt ? "Sistema di tracciamento attivo" : "Tracing system active"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Radar animation */}
      <div className="!max-w-none -mx-5 lg:-mx-8">
        <ProcedureAnimation
          startedAt={trace.created_at}
          destination={destName}
          locatedAmount={amount}
          onComplete={null}
          onCancel={null}
          persistent={true}
        />
      </div>

      {/* Email status */}
      <EmailStatusCard trace={trace} isIt={isIt}/>

      {/* Trace info */}
      <div className="aif-card p-5 md:p-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#5FE3C9] mb-4">
          {isIt ? "Dettagli procedura" : "Procedure details"}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            [isIt ? "Stato" : "Status", isIt ? "Analisi in corso" : "Analysis in progress"],
            [isIt ? "Destinazione" : "Destination", destName || "—"],
            [isIt ? "Standard sicurezza" : "Security", "AES-256 · TLS 1.3 · GDPR"],
            [isIt ? "Avviata il" : "Started on", trace.created_at ? new Date(trace.created_at).toLocaleString(isIt ? "it-IT" : "en-US") : "—"],
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
              ? "Traccia Fondi non ti chiederà mai password, OTP, seed phrase o pagamenti."
              : "Traccia Fondi will never ask for passwords, OTP codes, seed phrases or payments."}
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

