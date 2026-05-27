// UserApp — main experience for public trace (code-based access)
// Flow: form (name, email, code, tier, optional docs) -> animation -> located -> done
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield, ArrowRight, Lock, CheckCircle2, MapPin, Wallet,
  Sparkles, ShieldAlert, Mail, User, FileUp, X, ExternalLink,
  Upload, Image, FileText, Calendar
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProcedureAnimation from "./ProcedureAnimation";
import { useI18n } from "../i18n";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TIERS = [
  { id: "5000_20000",   label: "€5.000 - €20.000" },
  { id: "20000_50000",  label: "€20.000 - €50.000" },
  { id: "50000_100000", label: "€50.000 - €100.000" },
  { id: "100000_plus",  label: "€100.000+" },
];

export default function UserApp() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const isIt = lang === "it";

  // view: form | animating | located
  const [view, setView] = useState("form");
  
  // Form state
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [tier, setTier] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  
  // Documents
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Trace result
  const [traceId, setTraceId] = useState(null);
  const [traceResult, setTraceResult] = useState(null);

  // Check if email already used
  const checkEmail = useCallback(async (em) => {
    if (!em || !em.includes("@")) return;
    try {
      const { data } = await axios.post(`${API}/trace/check-email`, { email: em.toLowerCase().trim() });
      if (data.used) {
        toast.error(isIt 
          ? "Questa email è già stata utilizzata per un tracciamento. Ogni email può tracciare solo una volta." 
          : "This email has already been used for a trace. Each email can only trace once."
        );
      }
    } catch {}
  }, [isIt]);

  // Upload document
  const uploadDoc = async (file) => {
    if (docs.length >= 5) {
      toast.error(isIt ? "Massimo 5 documenti" : "Maximum 5 documents");
      return;
    }
    
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error(isIt ? "Tipo file non supportato" : "File type not supported");
      return;
    }
    
    if (file.size > 25 * 1024 * 1024) {
      toast.error(isIt ? "File troppo grande (max 25MB)" : "File too large (max 25MB)");
      return;
    }
    
    // Store locally first, upload after trace starts
    const reader = new FileReader();
    reader.onload = (e) => {
      setDocs(prev => [...prev, {
        id: Date.now(),
        name: file.name,
        type: file.type,
        size: file.size,
        file: file,
        preview: file.type.startsWith("image/") ? e.target.result : null
      }]);
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (id) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  // Start trace
  const startTrace = async () => {
    // Validation
    if (!first.trim() || !last.trim() || !email.trim() || !code.trim()) {
      toast.error(isIt ? "Compila tutti i campi obbligatori" : "Fill all required fields");
      return;
    }
    if (!tier) {
      toast.error(isIt ? "Seleziona un intervallo di importo" : "Select an amount range");
      return;
    }
    if (!consent) {
      toast.error(isIt ? "Conferma il consenso per procedere" : "Confirm consent to proceed");
      return;
    }
    
    setBusy(true);
    try {
      // Start the trace
      const { data } = await axios.post(`${API}/trace/start`, {
        first_name: first.trim(),
        last_name: last.trim(),
        email: email.toLowerCase().trim(),
        access_code: code.trim(),
        amount_tier: tier,
      });
      
      setTraceId(data.trace_id);
      setTraceResult(data);
      
      // Upload documents if any
      if (docs.length > 0) {
        for (const doc of docs) {
          const formData = new FormData();
          formData.append("file", doc.file);
          try {
            await axios.post(`${API}/trace/${data.trace_id}/upload`, formData, {
              headers: { "Content-Type": "multipart/form-data" }
            });
          } catch (e) {
            console.error("Doc upload failed:", e);
          }
        }
      }
      
      setView("animating");
    } catch (e) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : (isIt ? "Errore durante il tracciamento" : "Error starting trace");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // Animation complete
  const onComplete = async () => {
    // Mark trace as completed
    if (traceId) {
      try {
        await axios.post(`${API}/trace/${traceId}/complete`);
      } catch {}
    }
    setView("located");
  };

  const onCancel = () => {
    setView("form");
    toast.info(isIt ? "Procedura annullata" : "Procedure canceled");
  };

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <Navbar/>
        <main className="max-w-5xl mx-auto px-5 lg:px-8 py-8 space-y-5">
          <AnimatePresence mode="wait">
            {view === "form" && (
              <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <TraceForm
                  first={first} setFirst={setFirst}
                  last={last} setLast={setLast}
                  email={email} setEmail={setEmail}
                  code={code} setCode={setCode}
                  tier={tier} setTier={setTier}
                  consent={consent} setConsent={setConsent}
                  docs={docs} uploadDoc={uploadDoc} removeDoc={removeDoc}
                  busy={busy}
                  onStart={startTrace}
                  checkEmail={checkEmail}
                  isIt={isIt}
                />
              </motion.div>
            )}

            {view === "animating" && (
              <motion.div key="anim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="!max-w-none -mx-5 lg:-mx-8">
                <ProcedureAnimation
                  duration={120}
                  destination="zenthos_wallet"
                  locatedAmount={traceResult?.located_amount || 0}
                  onComplete={onComplete}
                  onCancel={onCancel}
                />
              </motion.div>
            )}

            {view === "located" && (
              <motion.div key="loc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <FundsLocated
                  result={traceResult}
                  isIt={isIt}
                  onHome={() => nav("/")}
                />
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
//   TRACE FORM
// ============================================================
function TraceForm({ 
  first, setFirst, last, setLast, email, setEmail, code, setCode,
  tier, setTier, consent, setConsent, docs, uploadDoc, removeDoc,
  busy, onStart, checkEmail, isIt 
}) {
  const nav = useNavigate();
  
  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files) {
      Array.from(files).forEach(uploadDoc);
    }
  };

  return (
    <div className="space-y-5" data-testid="trace-form">
      {/* Back button */}
      <button 
        onClick={() => nav("/")} 
        className="inline-flex items-center gap-2 text-[14px] text-[var(--aif-text-dim)] hover:text-white transition"
        data-testid="back-home"
      >
        ← {isIt ? "Torna alla home" : "Back to home"}
      </button>

      {/* Hero header */}
      <div className="aif-card aif-glow p-6 md:p-10 relative overflow-hidden">
        <div className="aif-grid-overlay absolute inset-0 opacity-30 pointer-events-none"/>
        <div className="relative z-10 text-center">
          <div className="aif-chip mb-4"><Sparkles size={12} className="text-[#5FE3C9]"/> {isIt ? "Tracciamento fondi assistito da IA" : "AI-assisted fund tracing"}</div>
          <h1 className="section-title mt-2 mx-auto max-w-3xl">
            {isIt ? "Avvia la procedura di tracciamento fondi" : "Start the fund-tracing procedure"}
          </h1>
          <p className="text-[var(--aif-text-dim)] mt-4 max-w-2xl mx-auto leading-relaxed">
            {isIt 
              ? "Inserisci i tuoi dati e il codice di accesso per avviare una scansione approfondita delle reti bancarie, circuiti SEPA, wallet crypto ed exchange esposti."
              : "Enter your details and access code to start a deep scan of banking networks, SEPA circuits, crypto wallets and exposed exchanges."}
          </p>
        </div>
      </div>

      {/* Personal info */}
      <div className="aif-card p-6 md:p-8" data-testid="personal-info">
        <div className="text-[12px] uppercase tracking-[0.2em] text-[#5FE3C9]">
          {isIt ? "Dati personali" : "Personal information"}
        </div>
        <p className="text-[13px] text-[var(--aif-text-dim)] mt-1">
          {isIt ? "Necessari per associare il tracciamento al tuo caso." : "Required to link the tracing to your case."}
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          <div>
            <label className="aif-label">{isIt ? "Nome" : "First name"} *</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input className="aif-input pl-10" data-testid="trace-first" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Mario" required/>
            </div>
          </div>
          <div>
            <label className="aif-label">{isIt ? "Cognome" : "Last name"} *</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input className="aif-input pl-10" data-testid="trace-last" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Rossi" required/>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="aif-label">Email *</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input 
                type="email" 
                className="aif-input pl-10" 
                data-testid="trace-email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                onBlur={(e) => checkEmail(e.target.value)}
                placeholder="tu@esempio.it" 
                required
              />
            </div>
            <p className="text-[11px] text-[var(--aif-text-dim)] mt-1">
              {isIt ? "Ogni email può effettuare un solo tracciamento." : "Each email can only perform one trace."}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="aif-label">{isIt ? "Codice di accesso" : "Access code"} *</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input 
                type="text" 
                className="aif-input pl-10 font-mono tracking-wider" 
                data-testid="trace-code" 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase())} 
                placeholder="XXXXXX"
                required
              />
            </div>
            <p className="text-[11px] text-[var(--aif-text-dim)] mt-1">
              {isIt ? "Il codice ti è stato fornito dal tuo consulente." : "The code was provided by your consultant."}
            </p>
          </div>
        </div>
      </div>

      {/* Documents upload (optional) */}
      <div className="aif-card p-6 md:p-8" data-testid="documents-upload">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[12px] uppercase tracking-[0.2em] text-[#5FE3C9]">
              {isIt ? "Documenti di prova" : "Proof documents"} <span className="text-[var(--aif-text-dim)]">({isIt ? "opzionale" : "optional"})</span>
            </div>
            <p className="text-[13px] text-[var(--aif-text-dim)] mt-1">
              {isIt ? "Screenshot, ricevute, chat — qualsiasi prova della truffa." : "Screenshots, receipts, chats — any proof of the scam."}
            </p>
          </div>
          <div className="text-[12px] text-[var(--aif-text-dim)]">{docs.length}/5</div>
        </div>

        {/* Drag & drop zone */}
        <div 
          className="border-2 border-dashed border-[var(--aif-line)] rounded-xl p-6 text-center hover:border-[#5FE3C9]/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById("doc-input").click()}
        >
          <Upload size={32} className="mx-auto text-[var(--aif-text-dim)] mb-2"/>
          <p className="text-[14px] text-[var(--aif-text-dim)]">
            {isIt ? "Trascina qui i file o clicca per selezionare" : "Drag files here or click to select"}
          </p>
          <p className="text-[11px] text-[var(--aif-text-dim)] mt-1">
            {isIt ? "JPG, PNG, PDF — max 25MB per file" : "JPG, PNG, PDF — max 25MB per file"}
          </p>
          <input 
            id="doc-input"
            type="file" 
            className="hidden" 
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            multiple
            onChange={(e) => Array.from(e.target.files).forEach(uploadDoc)}
          />
        </div>

        {/* Uploaded docs preview */}
        {docs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
            {docs.map(doc => (
              <div key={doc.id} className="relative group">
                <div className="aif-card !p-2 aspect-square flex items-center justify-center overflow-hidden">
                  {doc.preview ? (
                    <img src={doc.preview} alt={doc.name} className="w-full h-full object-cover rounded"/>
                  ) : (
                    <FileText size={32} className="text-[var(--aif-text-dim)]"/>
                  )}
                </div>
                <button 
                  onClick={() => removeDoc(doc.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14}/>
                </button>
                <p className="text-[10px] text-[var(--aif-text-dim)] mt-1 truncate">{doc.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier picker */}
      <div className="aif-card p-6 md:p-8">
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
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${sel ? "bg-[#5FE3C9] border-[#5FE3C9]" : "border-[var(--aif-line)]"}`}>
                  {sel && <CheckCircle2 size={14} className="text-[#06122A]"/>}
                </div>
                <div className="text-white font-semibold">{opt.label}</div>
              </button>
            );
          })}
        </div>

        {/* Consent */}
        <label className="flex items-start gap-3 mt-6 aif-card !rounded-xl p-4 cursor-pointer" data-testid="consent-box">
          <input type="checkbox" className="accent-[#5FE3C9] mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)}/>
          <span className="text-[13px] text-[var(--aif-text-dim)] leading-relaxed">
            {isIt 
              ? "Confermo che le informazioni fornite sono accurate al meglio della mia conoscenza e autorizzo l'avvio della procedura di tracciamento."
              : "I confirm the information I provided is accurate to the best of my knowledge and I authorize the start of the tracing procedure."}
          </span>
        </label>

        {/* Submit */}
        <div className="mt-6 flex flex-wrap items-center gap-3 justify-between">
          <div className="text-[12px] text-[var(--aif-text-dim)] flex items-center gap-2">
            <Lock size={13} className="text-[#5FE3C9]"/> AES-256 · TLS 1.3
          </div>
          <button onClick={onStart} disabled={busy} data-testid="trace-start"
            className="aif-btn-primary inline-flex items-center gap-2 disabled:opacity-60">
            {busy ? (isIt ? "Inizializzazione…" : "Initializing…") : (isIt ? "Avvia Tracciamento" : "Start Tracing")} <ArrowRight size={16}/>
          </button>
        </div>
      </div>

      {/* Security notice */}
      <div className="aif-card p-5 !border-l-4 !border-l-[#FFB454]">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="text-[#FFB454] mt-0.5 shrink-0"/>
          <div className="text-[13px] text-[var(--aif-text-dim)] leading-relaxed">
            <strong className="text-[#FFB454]">{isIt ? "Attenzione." : "Warning."}</strong>{" "}
            {isIt
              ? "Non inserire mai seed phrase, private key, password bancarie o codici OTP. Traccia Fondi non te li chiederà mai."
              : "Never enter seed phrases, private keys, banking passwords, or OTP codes. Traccia Fondi will never ask for them."}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   FUNDS LOCATED — final result
// ============================================================
function FundsLocated({ result, isIt, onHome }) {
  const amount = result?.located_amount || 0;
  const destName = result?.destination_name || "Zenthos Wallet";
  const destUrl = result?.destination_url || "";

  const summaryRows = isIt ? [
    ["Stato procedura", "Completata con successo"],
    ["Tipo di scansione", "Multi-livello (Bancaria · SEPA · Crypto · AML)"],
    ["Esito", "Fondi localizzati"],
    ["Posizione confermata", destName],
    ["Standard di sicurezza", "AES-256 · TLS 1.3 · GDPR"],
  ] : [
    ["Procedure status", "Completed successfully"],
    ["Scan type", "Multi-layer (Banking · SEPA · Crypto · AML)"],
    ["Outcome", "Funds located"],
    ["Confirmed location", destName],
    ["Security standards", "AES-256 · TLS 1.3 · GDPR"],
  ];

  const nextSteps = isIt ? [
    "Riceverai via email le istruzioni per accedere al portale di recupero",
    "Accedi al portale per verificare i fondi localizzati",
    "Segui le istruzioni a schermo per completare il recupero",
  ] : [
    "You will receive instructions by email to access the recovery portal",
    "Log in to the portal to verify the located funds",
    "Follow the on-screen instructions to complete the recovery",
  ];

  return (
    <div className="space-y-5" data-testid="funds-located">
      {/* Hero card */}
      <div className="aif-card aif-glow p-7 md:p-12 relative overflow-hidden text-center">
        <div className="aif-grid-overlay absolute inset-0 opacity-30 pointer-events-none"/>
        <div className="relative z-10">
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#4ADE80]/15 border-2 border-[#4ADE80]/40 mb-4 relative">
            <div className="absolute inset-0 rounded-full bg-[#4ADE80] blur-2xl opacity-25"/>
            <CheckCircle2 size={56} className="text-[#4ADE80] relative"/>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="aif-chip !border-[#4ADE80]/40 !text-[#4ADE80]">
            <Sparkles size={12}/> {isIt ? "Procedura completata" : "Procedure completed"}
          </motion.div>

          <motion.h2 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="section-title mt-4 max-w-2xl mx-auto">
            {isIt ? "Congratulazioni, i tuoi fondi sono stati localizzati." : "Congratulations, your funds have been located."}
          </motion.h2>

          <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-4 text-[var(--aif-text-dim)] max-w-2xl mx-auto leading-relaxed text-[14.5px]">
            {isIt
              ? "Il sistema Traccia Fondi ha completato con successo la procedura di tracciamento. I tuoi fondi sono stati localizzati e sono pronti per il recupero."
              : "The Traccia Fondi system has successfully completed the tracing procedure. Your funds have been located and are ready for recovery."}
          </motion.p>

          {/* Big amount */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
            className="mt-8 text-[10px] uppercase tracking-[0.3em] text-[#4ADE80] font-semibold">
            {isIt ? "FONDI LOCALIZZATI" : "FUNDS LOCATED"}
          </motion.div>
          <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55, type: "spring", stiffness: 110 }}
            className="mt-2 text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF] leading-none">
            € {amount.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </motion.div>
          <div className="text-[12px] text-[var(--aif-text-dim)] mt-2">{isIt ? "Importo localizzato" : "Located amount"}</div>

          {/* Location badge with link */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
            className="mt-7 inline-flex items-center gap-3 aif-card !rounded-2xl px-5 py-4">
            <Wallet size={28} className="text-[#5FE3C9]"/>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--aif-text-dim)]">{isIt ? "Posizione" : "Location"}</div>
              <div className="text-xl font-bold text-white">{destName}</div>
            </div>
          </motion.div>

          {/* Link to wallet site */}
          {destUrl && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
              className="mt-6">
              <a 
                href={destUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="aif-btn-primary inline-flex items-center gap-2 text-[15px] !px-6 !py-3.5"
                data-testid="goto-wallet"
              >
                {isIt ? "Accedi al portale di recupero" : "Access recovery portal"} <ExternalLink size={16}/>
              </a>
            </motion.div>
          )}

          <div className="mt-6 text-[11px] text-[var(--aif-text-dim)] flex items-center justify-center gap-2">
            <Lock size={11}/> {isIt ? "Procedura crittografata end-to-end" : "End-to-end encrypted procedure"}
          </div>
        </div>
      </div>

      {/* Procedure summary table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
        className="aif-card p-6 md:p-7">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#5FE3C9] mb-4">
          {isIt ? "Riepilogo procedura" : "Procedure summary"}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {summaryRows.map(([k, v]) => (
            <div key={k} className="aif-card !rounded-xl p-3.5 flex items-start justify-between gap-3">
              <span className="text-[12px] text-[var(--aif-text-dim)]">{k}</span>
              <span className="text-[13px] text-white font-medium text-right">{v}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Next steps */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15 }}
        className="aif-card p-6 md:p-7">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#5FE3C9] mb-4">
          {isIt ? "Prossimi passi" : "Next steps"}
        </div>
        <ol className="space-y-3">
          {nextSteps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5FE3C9] to-[#6E8BFF] text-[#06122A] font-bold text-[12px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-[14px] text-white leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </motion.div>

      {/* Safety notice */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
        className="aif-card p-5 !border-l-4 !border-l-[#FFB454]">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="text-[#FFB454] mt-0.5 shrink-0"/>
          <div className="text-[13px] text-[var(--aif-text-dim)] leading-relaxed">
            <strong className="text-[#FFB454]">{isIt ? "Promemoria sicurezza." : "Security reminder."}</strong>{" "}
            {isIt
              ? "Traccia Fondi non ti chiederà mai password, codici OTP, seed phrase, o l'installazione di software di accesso remoto."
              : "Traccia Fondi will never ask for passwords, OTP codes, seed phrases, or for you to install remote-access software."}
          </div>
        </div>
      </motion.div>

      {/* Back home */}
      <div className="text-center">
        <button onClick={onHome} className="text-[14px] text-[var(--aif-text-dim)] hover:text-white transition">
          ← {isIt ? "Torna alla home" : "Back to home"}
        </button>
      </div>
    </div>
  );
}
