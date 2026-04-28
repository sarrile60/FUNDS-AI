import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Mail, KeyRound, User, Eye, EyeOff, ShieldAlert, ArrowRight } from "lucide-react";
import { useAuth } from "../auth";
import Logo from "./Logo";

export default function AuthPage({ mode = "login" }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Inserisci email e password"); return; }
    if (!isLogin && password.length < 8) { toast.error("Password minima 8 caratteri"); return; }
    setBusy(true);
    const res = isLogin ? await login(email, password) : await register(email, password, fullName);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(isLogin ? "Accesso effettuato" : "Account creato");
    const next = loc.state?.next || "/app";
    nav(next);
  };

  return (
    <div className="aif-app-bg min-h-screen flex flex-col">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 py-6 w-full">
        <Link to="/"><Logo/></Link>
      </div>

      <div className="relative flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md">
          <div className="aif-card aif-glow p-7 md:p-9">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {isLogin ? "Bentornato" : "Crea il tuo account"}
            </h1>
            <p className="text-[13px] text-[var(--aif-text-dim)] mt-1">
              {isLogin ? "Accedi al tuo dossier sicuro" : "Inizia in pochi secondi. Privacy-first."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4" data-testid="auth-form">
              {!isLogin && (
                <div>
                  <label className="aif-label">Nome completo</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                    <input className="aif-input pl-10" data-testid="auth-fullname"
                      value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mario Rossi"/>
                  </div>
                </div>
              )}
              <div>
                <label className="aif-label">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input type="email" className="aif-input pl-10" data-testid="auth-email"
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@esempio.it" required/>
                </div>
              </div>
              <div>
                <label className="aif-label">Password</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input type={show ? "text" : "password"} className="aif-input pl-10 pr-10" data-testid="auth-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? "••••••••" : "Min 8 caratteri"} required/>
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] hover:text-white">
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={busy} className="aif-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="auth-submit">
                {busy ? "Attendi…" : (isLogin ? "Accedi" : "Crea account")} <ArrowRight size={16}/>
              </button>

              <div className="text-center text-[13px] text-[var(--aif-text-dim)]">
                {isLogin ? (
                  <>Non hai un account? <Link to="/register" className="aif-link" data-testid="auth-switch">Registrati</Link></>
                ) : (
                  <>Hai già un account? <Link to="/login" className="aif-link" data-testid="auth-switch">Accedi</Link></>
                )}
              </div>
            </form>
          </div>

          <div className="mt-4 text-[12px] text-[var(--aif-text-dim)] flex items-start gap-2">
            <ShieldAlert size={14} className="text-[#FFB454] mt-0.5 shrink-0"/>
            <span>Non inserire mai seed phrase, private key, password bancarie o codici OTP. AI-FUNDS non te le chiederà mai.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
