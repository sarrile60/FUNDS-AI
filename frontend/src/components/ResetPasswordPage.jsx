// ResetPasswordPage — set a new password using a token from email
import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, ArrowRight, Eye, EyeOff, ShieldAlert, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import Logo from "./Logo";
import { useI18n } from "../i18n";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResetPasswordPage() {
  const { lang } = useI18n();
  const isIt = lang === "it";
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [status, setStatus] = useState("checking"); // "checking" | "valid" | "invalid"
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    axios.get(`${API}/auth/check-reset-token`, { params: { token } })
      .then(({ data }) => {
        setFirstName(data.first_name || "");
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(isIt ? "Password minima 6 caratteri" : "Password minimum 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error(isIt ? "Le password non coincidono" : "Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: password });
      setDone(true);
      toast.success(isIt ? "Password reimpostata con successo!" : "Password reset successfully!");
      setTimeout(() => nav("/login"), 3000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : (isIt ? "Errore durante il reset" : "Reset failed"));
    } finally {
      setBusy(false);
    }
  };

  // Checking token
  if (status === "checking") {
    return (
      <div className="aif-app-bg min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#5FE3C9]"/>
      </div>
    );
  }

  // Invalid / expired token
  if (status === "invalid") {
    return (
      <div className="aif-app-bg min-h-screen relative flex flex-col">
        <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
        <div className="relative flex-1 flex flex-col">
          <header className="px-5 lg:px-8 py-5">
            <Link to="/"><Logo/></Link>
          </header>
          <main className="flex-1 flex items-center justify-center px-5 py-10">
            <div className="w-full max-w-md">
              <div className="aif-card p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#FF6B7A]/15 border border-[#FF6B7A]/40 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} className="text-[#FF6B7A]"/>
                </div>
                <h2 className="text-xl font-bold text-white mb-3">
                  {isIt ? "Link non valido o scaduto" : "Invalid or expired link"}
                </h2>
                <p className="text-[var(--aif-text-dim)] text-[13px] mb-6">
                  {isIt
                    ? "Il link di reset è già stato utilizzato o è scaduto. Richiedine uno nuovo."
                    : "The reset link has already been used or has expired. Request a new one."}
                </p>
                <Link
                  to="/forgot-password"
                  className="aif-btn-primary inline-flex items-center gap-2 !text-sm"
                >
                  <ArrowRight size={14}/>
                  {isIt ? "Richiedi nuovo link" : "Request new link"}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Done
  if (done) {
    return (
      <div className="aif-app-bg min-h-screen relative flex flex-col">
        <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
        <div className="relative flex-1 flex flex-col">
          <header className="px-5 lg:px-8 py-5">
            <Link to="/"><Logo/></Link>
          </header>
          <main className="flex-1 flex items-center justify-center px-5 py-10">
            <div className="w-full max-w-md">
              <div className="aif-card aif-glow p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#5FE3C9]/15 border border-[#5FE3C9]/40 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-[#5FE3C9]"/>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  {isIt ? "Password reimpostata!" : "Password reset!"}
                </h2>
                <p className="text-[var(--aif-text-dim)] text-[14px] mb-6">
                  {isIt
                    ? "La tua password è stata aggiornata. Verrai reindirizzato al login tra pochi secondi."
                    : "Your password has been updated. You will be redirected to login shortly."}
                </p>
                <Link to="/login" className="aif-btn-primary inline-flex items-center gap-2 !text-sm">
                  <ArrowRight size={14}/>
                  {isIt ? "Vai al login" : "Go to login"}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Valid token — show form
  return (
    <div className="aif-app-bg min-h-screen relative flex flex-col">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative flex-1 flex flex-col">
        <header className="px-5 lg:px-8 py-5">
          <Link to="/"><Logo/></Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md space-y-5">

            <div className="aif-card aif-glow p-7 relative overflow-hidden text-center">
              <div className="aif-grid-overlay absolute inset-0 opacity-25 pointer-events-none"/>
              <div className="relative z-10">
                <h1 className="section-title !text-3xl">
                  {isIt ? "Nuova password" : "New password"}
                </h1>
                {firstName && (
                  <p className="text-[var(--aif-text-dim)] mt-2 text-[14px]">
                    {isIt ? `Ciao ${firstName}, scegli la tua nuova password.` : `Hi ${firstName}, choose your new password.`}
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={submit} className="aif-card p-6 md:p-8 space-y-4">
              {/* New password */}
              <div>
                <label className="aif-label">{isIt ? "Nuova password" : "New password"} *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] pointer-events-none"/>
                  <input
                    type={showPw ? "text" : "password"}
                    className="aif-input pl-10 pr-10"
                    data-testid="reset-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={isIt ? "Min. 6 caratteri" : "Min. 6 characters"}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] hover:text-white"
                  >
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="aif-label">{isIt ? "Conferma password" : "Confirm password"} *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] pointer-events-none"/>
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="aif-input pl-10 pr-10"
                    data-testid="reset-confirm"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] hover:text-white"
                  >
                    {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                {/* Match indicator */}
                {confirm && (
                  <p className={`text-[11px] mt-1 ${password === confirm ? "text-[#4ADE80]" : "text-[#FF6B7A]"}`}>
                    {password === confirm
                      ? (isIt ? "✓ Le password coincidono" : "✓ Passwords match")
                      : (isIt ? "✗ Le password non coincidono" : "✗ Passwords do not match")}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy || (confirm && password !== confirm)}
                data-testid="reset-submit"
                className="aif-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy
                  ? (isIt ? "Salvataggio…" : "Saving…")
                  : (isIt ? "Salva nuova password" : "Save new password")}
                {!busy && <ArrowRight size={16}/>}
              </button>
            </form>

            <div className="aif-card p-4 !border-l-4 !border-l-[#FFB454]">
              <div className="flex items-start gap-3">
                <ShieldAlert size={15} className="text-[#FFB454] mt-0.5 shrink-0"/>
                <p className="text-[12px] text-[var(--aif-text-dim)] leading-relaxed">
                  {isIt
                    ? "Non condividere questa pagina con nessuno. Il link è monouso."
                    : "Do not share this page with anyone. The link is one-time use."}
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
