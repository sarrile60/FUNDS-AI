// UserApp — main authenticated experience for end users.
// Flow: start-procedure (pick tier + consent) -> animation -> located -> request -> done
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield, ArrowRight, Lock, CheckCircle2, MapPin, Banknote, Wallet,
  Sparkles, ShieldAlert, Mail, User, Send, Home, Building2
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProcedureAnimation from "./ProcedureAnimation";
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

  // server state
  const [state, setState] = useState(null);

  useEffect(() => {
    (async () => {
      try { setState(await api.procedureState()); } catch {}
    })();
  }, []);

  if (!user) return <Navigate to="/login" replace state={{ next: "/app" }}/>;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace/>;

  const destination = user.recovery_destination;
  const destLabel = destination === "zenthos_wallet" ? t("trc.dest.zenthos_wallet") : t("trc.dest.chiantin_bank");
  const DestIcon = destination === "zenthos_wallet" ? Wallet : Building2;

  const startProcedure = async () => {
    if (!tier) { toast.error(t("proc.pick_first")); return; }
    if (!consent) { toast.error(t("proc.consent_first")); return; }
    setBusy(true);
    try {
      const s = await api.startProcedure(tier);
      setState(s);
      setView("animating");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Error starting procedure");
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
function StartProcedure({ user, tier, setTier, consent, setConsent, busy, onStart }) {
  const { t } = useI18n();
  return (
    <div className="space-y-5" data-testid="start-procedure">
      {/* Welcome card */}
      <div className="aif-card aif-glow p-6 md:p-8 relative overflow-hidden">
        <div className="aif-grid-overlay absolute inset-0 opacity-30 pointer-events-none"/>
        <div className="relative z-10">
          <div className="aif-chip"><Sparkles size={12} className="text-[#5FE3C9]"/> {t("proc.tag")}</div>
          <h1 className="section-title mt-3">{t("proc.title")}</h1>
          <p className="text-[var(--aif-text-dim)] mt-3 max-w-3xl leading-relaxed">{t("proc.subtitle")}</p>

          <div className="mt-6 aif-card !rounded-xl p-4 max-w-md">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--aif-text-dim)]">{t("proc.welcome")}</div>
            <div className="text-white font-semibold mt-1">{user.first_name} {user.last_name}</div>
            <div className="text-[12px] text-[var(--aif-text-dim)] mt-0.5">{user.email}</div>
          </div>
        </div>
      </div>

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
//   LOCATED — final reveal
// ============================================================
function FundsLocated({ destination, destLabel, DestIcon, amount, onContinue }) {
  const { t } = useI18n();
  return (
    <div className="aif-card aif-glow p-7 md:p-12 relative overflow-hidden text-center" data-testid="funds-located">
      <div className="aif-grid-overlay absolute inset-0 opacity-30 pointer-events-none"/>
      <div className="relative z-10">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#4ADE80]/15 border-2 border-[#4ADE80]/40 mb-4 relative">
          <div className="absolute inset-0 rounded-full bg-[#4ADE80] blur-2xl opacity-25"/>
          <CheckCircle2 size={56} className="text-[#4ADE80] relative"/>
        </motion.div>

        <div className="text-[11px] uppercase tracking-[0.3em] text-[#4ADE80] font-semibold">{t("trc.found.label")}</div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="mt-3 text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF]">
          € {amount.toLocaleString("it-IT")}
        </motion.div>
        <div className="text-[12px] text-[var(--aif-text-dim)] mt-2">{t("trc.found.amount")}</div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-7 inline-flex items-center gap-3 aif-card !rounded-2xl px-5 py-4">
          <DestIcon size={28} className="text-[#5FE3C9]"/>
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--aif-text-dim)]">{t("trc.found.location")}</div>
            <div className="text-xl font-bold text-white">{destLabel}</div>
          </div>
        </motion.div>

        <div className="mt-8">
          <button onClick={onContinue} className="aif-btn-primary inline-flex items-center gap-2" data-testid="goto-request">
            {t("trc.found.cta")} <ArrowRight size={16}/>
          </button>
        </div>

        <div className="mt-6 text-[11px] text-[var(--aif-text-dim)] flex items-center justify-center gap-2">
          <Lock size={11}/> {t("trc.disclaimer")}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   RECOVERY REQUEST FORM
// ============================================================
function RecoveryRequest({ destLabel, onDone }) {
  const { t } = useI18n();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [em, setEm] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

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
