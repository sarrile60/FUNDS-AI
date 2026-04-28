import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Mail, KeyRound, Eye, EyeOff, ShieldAlert, ArrowRight, Info } from "lucide-react";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import Logo from "./Logo";

/**
 * Single page handles BOTH login and "registration" (which is disabled).
 * mode = "login" or "register".
 */
export default function AuthPage({ mode = "login" }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error(t("auth.warn_creds")); return; }
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(t("auth.toast_login"));
    // Route based on role
    if (res.user?.role === "admin") {
      nav("/admin/dashboard");
    } else {
      const next = loc.state?.next || "/app";
      nav(next);
    }
  };

  return (
    <div className="aif-app-bg min-h-screen flex flex-col">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 py-6 w-full">
        <Link to="/"><Logo/></Link>
      </div>

      <div className="relative flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md">
          {!isLogin ? (
            // REGISTRATION DISABLED VIEW
            <div className="aif-card aif-glow p-7 md:p-9" data-testid="register-disabled">
              <div className="w-12 h-12 rounded-xl bg-[#FFB454]/15 border border-[#FFB454]/40 flex items-center justify-center text-[#FFB454] mb-4">
                <Info size={22}/>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{t("auth.register_disabled_short")}</h1>
              <p className="mt-3 text-[14px] text-[var(--aif-text-dim)] leading-relaxed">{t("auth.register_disabled")}</p>
              <Link to="/login" className="aif-btn-primary inline-flex items-center gap-2 mt-6 w-full justify-center" data-testid="go-login">
                {t("auth.go_login")} <ArrowRight size={16}/>
              </Link>
            </div>
          ) : (
            <div className="aif-card aif-glow p-7 md:p-9">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{t("auth.welcome")}</h1>
              <p className="text-[13px] text-[var(--aif-text-dim)] mt-1">{t("auth.sub_login")}</p>

              <form onSubmit={submit} className="mt-6 space-y-4" data-testid="auth-form">
                <div>
                  <label className="aif-label">{t("auth.email")}</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                    <input type="email" className="aif-input pl-10" data-testid="auth-email"
                      value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email_ph")} required/>
                  </div>
                </div>
                <div>
                  <label className="aif-label">{t("auth.password")}</label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                    <input type={show ? "text" : "password"} className="aif-input pl-10 pr-10" data-testid="auth-password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.password_ph_login")} required/>
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] hover:text-white">
                      {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={busy} className="aif-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="auth-submit">
                  {busy ? t("auth.wait") : t("auth.btn_login")} <ArrowRight size={16}/>
                </button>

                <div className="text-center text-[12px] text-[var(--aif-text-dim)]">
                  {t("auth.register_disabled")}
                </div>
              </form>
            </div>
          )}

          <div className="mt-4 text-[12px] text-[var(--aif-text-dim)] flex items-start gap-2">
            <ShieldAlert size={14} className="text-[#FFB454] mt-0.5 shrink-0"/>
            <span>{t("auth.never_warn")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
