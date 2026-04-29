// UserApp — main authenticated experience for end users.
// Flow: start-procedure (pick tier + consent) -> animation -> located -> request -> done
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield, ArrowRight, Lock, CheckCircle2, MapPin, Banknote, Wallet,
  Sparkles, ShieldAlert, Mail, User, Send, Home, Building2, Calendar
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProcedureAnimation from "./ProcedureAnimation";
import DocumentUploader from "./DocumentUploader";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { api } from "../api";

const TIERS = [
  { id: "5000_20000",   key: "proc.tier.5_20" },
  { id: "20000_50000",  key: "proc.tier.20_50" },
  { id: "50000_100000", key: "proc.tier.50_100" },
  { id: "100000_plus",  key: "proc.tier.100_plus" },
];

export default function UserApp() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();

  // view: idle | animating | located | requested
  const [view, setView] = useState("idle");
  const [tier, setTier] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  // Personal info — collected on this screen, saved on backend, prefilled later.
  const [first, setFirst] = useState("");
  const [last,  setLast]  = useState("");
  const [cmail, setCmail] = useState("");
  const [dob,   setDob]   = useState("");

  // server state
  const [state, setState] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.procedureState();
        setState(s);
        // restore previously saved values if user reloads
        if (s?.procedure_first_name)   setFirst(s.procedure_first_name);
        if (s?.procedure_last_name)    setLast(s.procedure_last_name);
        if (s?.procedure_contact_email) setCmail(s.procedure_contact_email);
        if (s?.procedure_date_of_birth) setDob(s.procedure_date_of_birth);
      } catch {}
    })();
  }, []);

  if (!user) return <Navigate to="/login" replace state={{ next: "/app" }}/>;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace/>;

  const destination = user.recovery_destination;
  const destLabel = destination === "zenthos_wallet" ? t("trc.dest.zenthos_wallet") : t("trc.dest.chiantin_bank");
  const DestIcon = destination === "zenthos_wallet" ? Wallet : Building2;

  const startProcedure = async () => {
    if (!first.trim() || !last.trim() || !cmail.trim() || !dob) {
      toast.error(t("proc.fill_personal")); return;
    }
    if (!tier) { toast.error(t("proc.pick_first")); return; }
    if (!consent) { toast.error(t("proc.consent_first")); return; }
    setBusy(true);
    try {
      const s = await api.startProcedure({
        amount_tier: tier,
        first_name: first.trim(),
        last_name: last.trim(),
        contact_email: cmail.trim(),
        date_of_birth: dob,
      });
      setState(s);
      setView("animating");
    } catch (e) {
      const d = e?.response?.data?.detail;
      const msg = typeof d === "string" ? d : Array.isArray(d) ? d.map(x => x?.msg || JSON.stringify(x)).join(", ") : "Error starting procedure";
      toast.error(msg);
    } finally { setBusy(false); }
  };

  const onComplete = async () => {
    try { await api.completeProcedure(); } catch {}
    setView("located");
  };

  const onCancel = () => {
    setView("idle");
    toast.info(t("trc.canceled"));
  };

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <Navbar/>
        <main className="max-w-5xl mx-auto px-5 lg:px-8 py-8 space-y-5">
          <AnimatePresence mode="wait">
            {view === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <StartProcedure
                  user={user}
                  tier={tier} setTier={setTier}
                  consent={consent} setConsent={setConsent}
                  first={first} setFirst={setFirst}
                  last={last}   setLast={setLast}
                  cmail={cmail} setCmail={setCmail}
                  dob={dob}     setDob={setDob}
                  busy={busy}
                  onStart={startProcedure}
                />
              </motion.div>
            )}

            {view === "animating" && (
              <motion.div key="anim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="!max-w-none -mx-5 lg:-mx-8">
                <ProcedureAnimation
                  duration={120}
                  destination={destination}
                  locatedAmount={state?.located_amount || 0}
                  onComplete={onComplete}
                  onCancel={onCancel}
                />
              </motion.div>
            )}

            {view === "located" && (
              <motion.div key="loc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <FundsLocated
                  destination={destination}
                  destLabel={destLabel}
                  DestIcon={DestIcon}
                  amount={state?.located_amount || 0}
                  onContinue={() => setView("request")}
                />
              </motion.div>
            )}

            {view === "request" && (
              <motion.div key="req" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <RecoveryRequest
                  destLabel={destLabel}
                  prefill={{
                    first: state?.procedure_first_name || first,
                    last:  state?.procedure_last_name  || last,
                    email: state?.procedure_contact_email || cmail,
                  }}
                  onDone={() => setView("requested")}
                />
              </motion.div>
            )}

            {view === "requested" && (
              <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <RequestSuccess
                  destLabel={destLabel}
                  onHome={() => { logout(); nav("/"); }}
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
//   IDLE — pick tier + consent + start
// ============================================================
function StartProcedure({ user, tier, setTier, consent, setConsent, first, setFirst, last, setLast, cmail, setCmail, dob, setDob, busy, onStart }) {
  const { t } = useI18n();
  const initials = `${(user.first_name || "?").charAt(0)}${(user.last_name || "").charAt(0)}`.toUpperCase();
  return (
    <div className="space-y-5" data-testid="start-procedure">
      {/* Hero header — centered */}
      <div className="aif-card aif-glow p-6 md:p-10 relative overflow-hidden">
        <div className="aif-grid-overlay absolute inset-0 opacity-30 pointer-events-none"/>
        <div className="relative z-10 text-center">
          {/* Welcome pill + tag (centered, with breathing room) */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-6">
            <div className="inline-flex items-center gap-3 aif-card !rounded-full !py-2 !px-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5FE3C9] to-[#6E8BFF] flex items-center justify-center text-[#06122A] font-bold text-[13px]">
                {initials}
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-[13px] leading-tight">{user.first_name} {user.last_name}</div>
                <div className="text-[11px] text-[var(--aif-text-dim)] leading-tight">{user.email}</div>
              </div>
            </div>
            <div className="aif-chip"><Sparkles size={12} className="text-[#5FE3C9]"/> {t("proc.tag")}</div>
          </div>

          <h1 className="section-title mt-2 mx-auto max-w-3xl">{t("proc.title")}</h1>
          <p className="text-[var(--aif-text-dim)] mt-4 max-w-2xl mx-auto leading-relaxed">{t("proc.subtitle")}</p>
        </div>
      </div>

      {/* Personal info card */}
      <div className="aif-card p-6 md:p-8" data-testid="personal-info">
        <div className="text-[12px] uppercase tracking-[0.2em] text-[#5FE3C9]">{t("proc.personal.title")}</div>
        <p className="text-[13px] text-[var(--aif-text-dim)] mt-1">{t("proc.personal.subtitle")}</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          <div>
            <label className="aif-label">{t("proc.first_name")}</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input className="aif-input pl-10" data-testid="proc-first" value={first} onChange={(e) => setFirst(e.target.value)} placeholder={t("proc.first_name_ph")} required/>
            </div>
          </div>
          <div>
            <label className="aif-label">{t("proc.last_name")}</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input className="aif-input pl-10" data-testid="proc-last" value={last} onChange={(e) => setLast(e.target.value)} placeholder={t("proc.last_name_ph")} required/>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="aif-label">{t("proc.contact_email")}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input type="email" className="aif-input pl-10" data-testid="proc-email" value={cmail} onChange={(e) => setCmail(e.target.value)} placeholder={t("proc.email_ph")} required/>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="aif-label">{t("proc.date_of_birth")}</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input type="date" className="aif-input pl-10" data-testid="proc-dob" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0,10)} required/>
            </div>
          </div>
        </div>
      </div>

      {/* Documents (optional) */}
      <DocumentUploader/>

      {/* Tier picker */}
      <div className="aif-card p-6 md:p-8">
        <div className="text-[12px] uppercase tracking-[0.2em] text-[#5FE3C9] mb-3">{t("proc.tier.label")}</div>
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
                <div>
                  <div className="text-white font-semibold">{t(opt.key)}</div>
                </div>
              </button>
            );
          })}
        </div>

        <label className="flex items-start gap-3 mt-6 aif-card !rounded-xl p-4 cursor-pointer" data-testid="consent-box">
          <input type="checkbox" className="accent-[#5FE3C9] mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)}/>
          <span className="text-[13px] text-[var(--aif-text-dim)] leading-relaxed">{t("proc.consent")}</span>
        </label>

        <div className="mt-6 flex flex-wrap items-center gap-3 justify-between">
          <div className="text-[12px] text-[var(--aif-text-dim)] flex items-center gap-2">
            <Lock size={13} className="text-[#5FE3C9]"/> AES-256 · TLS 1.3 · {t("trc.do_not_close")}
          </div>
          <button onClick={onStart} disabled={busy} data-testid="proc-start"
            className="aif-btn-primary inline-flex items-center gap-2 disabled:opacity-60">
            {busy ? t("proc.start_busy") : t("proc.start")} <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   LOCATED — final reveal (professional congratulations)
// ============================================================
function FundsLocated({ destination, destLabel, DestIcon, amount, onContinue }) {
  const { t, lang } = useI18n();
  const isIt = lang === "it";

  const summaryRows = isIt ? [
    ["Stato procedura", "Completata con successo"],
    ["Tipo di scansione", "Multi-livello (Bancaria · SEPA · Crypto · AML)"],
    ["Esito", "Fondi localizzati"],
    ["Posizione confermata", destLabel],
    ["Standard di sicurezza", "AES-256 · TLS 1.3 · GDPR"],
  ] : [
    ["Procedure status", "Completed successfully"],
    ["Scan type", "Multi-layer (Banking · SEPA · Crypto · AML)"],
    ["Outcome", "Funds located"],
    ["Confirmed location", destLabel],
    ["Security standards", "AES-256 · TLS 1.3 · GDPR"],
  ];

  const nextSteps = isIt ? [
    "Compila la richiesta formale di recupero con i tuoi dati",
    "Riceverai via email le credenziali di accesso al conto di recupero",
    "Accedi al portale per visualizzare e ritirare i fondi localizzati",
  ] : [
    "Submit the formal recovery request with your details",
    "You will receive by email the credentials to access your recovery account",
    "Log in to the portal to view and withdraw the located funds",
  ];

  return (
    <div className="space-y-5" data-testid="funds-located">
      {/* Hero card with gradient + check */}
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
              ? "Il sistema Traccia Fondi ha completato con successo la procedura di tracciamento durata 2 minuti. Dopo aver analizzato reti bancarie italiane, circuiti SEPA, wallet fintech, blockchain e cluster AML, i tuoi fondi sono stati localizzati. Il prossimo passo è formalizzare la richiesta di recupero per ricevere le credenziali di accesso al conto."
              : "The Traccia Fondi system has successfully completed the 2-minute tracing procedure. After analyzing Italian banking rails, SEPA networks, fintech wallets, blockchain, and AML clusters, your funds have been located. The next step is to formalize the recovery request to receive the access credentials to the recovery account."}
          </motion.p>

          {/* Big amount */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
            className="mt-8 text-[10px] uppercase tracking-[0.3em] text-[#4ADE80] font-semibold">
            {t("trc.found.label")}
          </motion.div>
          <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55, type: "spring", stiffness: 110 }}
            className="mt-2 text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF] leading-none">
            € {amount.toLocaleString("it-IT")}
          </motion.div>
          <div className="text-[12px] text-[var(--aif-text-dim)] mt-2">{t("trc.found.amount")}</div>

          {/* Location badge */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
            className="mt-7 inline-flex items-center gap-3 aif-card !rounded-2xl px-5 py-4">
            <DestIcon size={28} className="text-[#5FE3C9]"/>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--aif-text-dim)]">{t("trc.found.location")}</div>
              <div className="text-xl font-bold text-white">{destLabel}</div>
            </div>
          </motion.div>

          {/* CTA */}
          <div className="mt-8">
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
              onClick={onContinue} className="aif-btn-primary inline-flex items-center gap-2 text-[15px] !px-6 !py-3.5" data-testid="goto-request">
              {t("trc.found.cta")} <ArrowRight size={16}/>
            </motion.button>
          </div>

          <div className="mt-6 text-[11px] text-[var(--aif-text-dim)] flex items-center justify-center gap-2">
            <Lock size={11}/> {t("trc.disclaimer")}
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

      {/* Final safety notice */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
        className="aif-card p-5 !border-l-4 !border-l-[#FFB454]">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="text-[#FFB454] mt-0.5 shrink-0"/>
          <div className="text-[13px] text-[var(--aif-text-dim)] leading-relaxed">
            <strong className="text-[#FFB454]">{isIt ? "Promemoria sicurezza." : "Security reminder."}</strong>{" "}
            {isIt
              ? "Traccia Fondi non ti chiederà mai password, codici OTP, seed phrase, o l'installazione di software di accesso remoto. Tutte le comunicazioni ufficiali avvengono via email da @traccia-fondi.com."
              : "Traccia Fondi will never ask for passwords, OTP codes, seed phrases, or for you to install remote-access software. All official communications come from @traccia-fondi.com email addresses."}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
//   RECOVERY REQUEST FORM
// ============================================================
function RecoveryRequest({ destLabel, prefill, onDone }) {
  const { t } = useI18n();
  const [first, setFirst] = useState(prefill?.first || "");
  const [last,  setLast]  = useState(prefill?.last  || "");
  const [em,    setEm]    = useState(prefill?.email || "");
  const [msg,   setMsg]   = useState("");
  const [busy,  setBusy]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!first || !last || !em) { toast.error(t("rec.required")); return; }
    setBusy(true);
    try {
      await api.createRecoveryRequest({ first_name: first, last_name: last, email: em, message: msg });
      onDone();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error");
    } finally { setBusy(false); }
  };

  return (
    <div className="aif-card aif-glow p-6 md:p-8 max-w-2xl mx-auto" data-testid="recovery-request">
      <div className="aif-chip"><MapPin size={12} className="text-[#5FE3C9]"/> {destLabel}</div>
      <h2 className="section-title mt-3">{t("rec.title")}</h2>
      <p className="text-[var(--aif-text-dim)] mt-2 text-[14px]">{t("rec.subtitle")}</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="aif-label">{t("rec.first_name")}</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input className="aif-input pl-10" data-testid="rec-first" value={first} onChange={(e) => setFirst(e.target.value)} required/>
            </div>
          </div>
          <div>
            <label className="aif-label">{t("rec.last_name")}</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
              <input className="aif-input pl-10" data-testid="rec-last" value={last} onChange={(e) => setLast(e.target.value)} required/>
            </div>
          </div>
        </div>
        <div>
          <label className="aif-label">{t("rec.email")}</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
            <input type="email" className="aif-input pl-10" data-testid="rec-email" value={em} onChange={(e) => setEm(e.target.value)} required/>
          </div>
        </div>
        <div>
          <label className="aif-label">{t("rec.message")}</label>
          <textarea className="aif-input min-h-[90px]" data-testid="rec-msg" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t("rec.message_ph")}/>
        </div>

        <button type="submit" disabled={busy} className="aif-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="rec-submit">
          {busy ? t("rec.submitting") : t("rec.submit")} <Send size={16}/>
        </button>
      </form>

      <div className="mt-4 text-[11px] text-[var(--aif-text-dim)] flex items-start gap-2">
        <ShieldAlert size={12} className="text-[#FFB454] mt-0.5"/>
        <span>{t("auth.never_warn")}</span>
      </div>
    </div>
  );
}

function RequestSuccess({ destLabel, onHome }) {
  const { t } = useI18n();
  const body = t("rec.success_body").replace("{dest}", destLabel);
  return (
    <div className="aif-card aif-glow p-8 md:p-12 max-w-2xl mx-auto text-center" data-testid="request-success">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#4ADE80]/15 border-2 border-[#4ADE80]/40 mb-4">
        <CheckCircle2 size={40} className="text-[#4ADE80]"/>
      </div>
      <h2 className="section-title">{t("rec.success_title")}</h2>
      <p className="text-[var(--aif-text-dim)] mt-3 max-w-lg mx-auto">{body}</p>
      <button onClick={onHome} className="aif-btn-primary inline-flex items-center gap-2 mt-6">
        <Home size={16}/> {t("rec.go_home")}
      </button>
    </div>
  );
}
