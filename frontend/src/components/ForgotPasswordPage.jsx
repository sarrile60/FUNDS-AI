// ForgotPasswordPage — request a password reset email
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Mail, ArrowRight, ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";
import Logo from "./Logo";
import { useI18n } from "../i18n";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ForgotPasswordPage() {
  const { lang } = useI18n();
  const isIt = lang === "it";

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(isIt ? "Inserisci la tua email" : "Enter your email");
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: email.trim() });
      setSent(true);
    } catch {
      // Even on error, show sent state to avoid enumeration
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="aif-app-bg min-h-screen relative flex flex-col">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative flex-1 flex flex-col">
        <header className="px-5 lg:px-8 py-5">
          <Link to="/"><Logo/></Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md space-y-5">

            {sent ? (
              // Success state
              <div className="aif-card aif-glow p-8 text-center relative overflow-hidden">
                <div className="aif-grid-overlay absolute inset-0 opacity-25 pointer-events-none"/>
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[#5FE3C9]/15 border border-[#5FE3C9]/40 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-[#5FE3C9]"/>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    {isIt ? "Email inviata" : "Email sent"}
                  </h2>
                  <p className="text-[var(--aif-text-dim)] text-[14px] leading-relaxed mb-2">
                    {isIt
                      ? `Se l'indirizzo ${email} è registrato, riceverai un link per reimpostare la password.`
                      : `If ${email} is registered, you'll receive a password reset link.`}
                  </p>
                  <p className="text-[var(--aif-text-dim)] text-[12px] mb-6">
                    {isIt
                      ? "Il link scade dopo 2 ore. Controlla anche la cartella spam."
                      : "The link expires in 2 hours. Check your spam folder too."}
                  </p>
                  <Link
                    to="/login"
                    className="aif-btn-primary inline-flex items-center gap-2 !text-sm"
                    data-testid="forgot-back-login"
                  >
                    <ArrowLeft size={14}/>
                    {isIt ? "Torna al login" : "Back to login"}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Title */}
                <div className="aif-card aif-glow p-7 relative overflow-hidden text-center">
                  <div className="aif-grid-overlay absolute inset-0 opacity-25 pointer-events-none"/>
                  <div className="relative z-10">
                    <h1 className="section-title !text-3xl">
                      {isIt ? "Hai dimenticato la password?" : "Forgot your password?"}
                    </h1>
                    <p className="text-[var(--aif-text-dim)] mt-2 text-[14px]">
                      {isIt
                        ? "Inserisci la tua email e ti invieremo un link per reimpostarla."
                        : "Enter your email and we'll send you a link to reset it."}
                    </p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={submit} className="aif-card p-6 md:p-8 space-y-4">
                  <div>
                    <label className="aif-label">Email *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] pointer-events-none"/>
                      <input
                        type="email"
                        className="aif-input pl-10"
                        data-testid="forgot-email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="tu@esempio.it"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="forgot-submit"
                    className="aif-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {busy
                      ? (isIt ? "Invio in corso…" : "Sending…")
                      : (isIt ? "Invia link di reset" : "Send reset link")}
                    {!busy && <ArrowRight size={16}/>}
                  </button>

                  <div className="text-center text-[13px] text-[var(--aif-text-dim)]">
                    <Link to="/login" className="text-[#5FE3C9] hover:underline inline-flex items-center gap-1" data-testid="forgot-back">
                      <ArrowLeft size={12}/>
                      {isIt ? "Torna al login" : "Back to login"}
                    </Link>
                  </div>
                </form>

                <div className="aif-card p-4 !border-l-4 !border-l-[#FFB454]">
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={15} className="text-[#FFB454] mt-0.5 shrink-0"/>
                    <p className="text-[12px] text-[var(--aif-text-dim)] leading-relaxed">
                      {isIt
                        ? "Non condivideremo mai la tua password. Il link di reset è monouso e valido 2 ore."
                        : "We will never share your password. The reset link is one-use and valid for 2 hours."}
                    </p>
                  </div>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
