// LoginPage — clean login page
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldAlert } from "lucide-react";
import Logo from "./Logo";
import { useI18n } from "../i18n";
import { useAuth } from "../auth";

export default function LoginPage() {
  const { lang } = useI18n();
  const { login } = useAuth();
  const nav = useNavigate();
  const isIt = lang === "it";

  const [email, setEmail] = useState(() => localStorage.getItem("tf_remember_email") || "");
  const [password, setPassword] = useState(() => localStorage.getItem("tf_remember_pw") || "");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("tf_remember_email"));
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(isIt ? "Inserisci email e password" : "Enter email and password");
      return;
    }
    // Save or clear credentials
    if (rememberMe) {
      localStorage.setItem("tf_remember_email", email);
      localStorage.setItem("tf_remember_pw", password);
    } else {
      localStorage.removeItem("tf_remember_email");
      localStorage.removeItem("tf_remember_pw");
    }
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);
    if (result.ok) {
      toast.success(isIt ? "Accesso effettuato" : "Signed in");
      if (result.user?.role === "admin") nav("/admin/dashboard");
      else nav("/app");
    } else {
      toast.error(result.error || (isIt ? "Credenziali non valide" : "Invalid credentials"));
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
            {/* Title */}
            <div className="aif-card aif-glow p-7 relative overflow-hidden text-center">
              <div className="aif-grid-overlay absolute inset-0 opacity-25 pointer-events-none"/>
              <div className="relative z-10">
                <h1 className="section-title !text-3xl">
                  {isIt ? "Bentornato" : "Welcome back"}
                </h1>
                <p className="text-[var(--aif-text-dim)] mt-2 text-[14px]">
                  {isIt ? "Accedi al tuo dossier sicuro" : "Access your secure dossier"}
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
                    data-testid="login-email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@esempio.it"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="aif-label">Password *</label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition"
                    data-testid="login-forgot-link"
                  >
                    {isIt ? "Password dimenticata?" : "Forgot password?"}
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] pointer-events-none"/>
                  <input
                    type={showPw ? "text" : "password"}
                    className="aif-input pl-10 pr-10"
                    data-testid="login-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
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

              {/* Remember Me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none" data-testid="remember-me-label">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${rememberMe ? "bg-[#5FE3C9]" : "bg-[var(--aif-line)]"}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${rememberMe ? "left-[18px]" : "left-0.5"}`}/>
                </div>
                <span className="text-[13px] text-[var(--aif-text-dim)]">
                  {isIt ? "Ricordami" : "Remember me"}
                </span>
              </label>

              <button
                type="submit"
                disabled={busy}
                data-testid="login-submit"
                className="aif-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy
                  ? (isIt ? "Accesso in corso…" : "Signing in…")
                  : (isIt ? "Accedi" : "Sign in")}
                {!busy && <ArrowRight size={16}/>}
              </button>

              <div className="text-center text-[13px] text-[var(--aif-text-dim)]">
                {isIt ? "Non hai un account?" : "Don't have an account?"}{" "}
                <Link to="/register" className="text-[#5FE3C9] hover:underline" data-testid="login-register-link">
                  {isIt ? "Registrati" : "Sign up"}
                </Link>
              </div>
            </form>

            <div className="aif-card p-4 !border-l-4 !border-l-[#FFB454]">
              <div className="flex items-start gap-3">
                <ShieldAlert size={15} className="text-[#FFB454] mt-0.5 shrink-0"/>
                <p className="text-[12px] text-[var(--aif-text-dim)] leading-relaxed">
                  {isIt
                    ? "Traccia Fondi non ti chiederà mai password, OTP, seed phrase o pagamenti per 'sbloccare' fondi."
                    : "Traccia Fondi will never ask for passwords, OTP codes, seed phrases or payments to 'unlock' funds."}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
