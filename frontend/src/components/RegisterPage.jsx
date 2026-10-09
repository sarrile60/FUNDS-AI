// RegisterPage — self-registration form
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  User, Mail, Lock, Phone, Calendar, ArrowRight, ShieldAlert, Eye, EyeOff
} from "lucide-react";
import Logo from "./Logo";
import { useI18n } from "../i18n";
import { useAuth } from "../auth";

export default function RegisterPage() {
  const { t, lang } = useI18n();
  const { register } = useAuth();
  const nav = useNavigate();
  const isIt = lang === "it";

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    password: "", phone: "", date_of_birth: ""
  });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.password || !form.phone || !form.date_of_birth) {
      toast.error(isIt ? "Compila tutti i campi" : "Fill all fields");
      return;
    }
    if (form.password.length < 6) {
      toast.error(isIt ? "Password minima 6 caratteri" : "Password minimum 6 characters");
      return;
    }
    setBusy(true);
    const result = await register({
      ...form,
      lang,
    });
    setBusy(false);
    if (result.ok) {
      toast.success(isIt ? "Account creato — benvenuto!" : "Account created — welcome!");
      nav("/app");
    } else {
      toast.error(result.error || (isIt ? "Errore registrazione" : "Registration error"));
    }
  };

  return (
    <div className="aif-app-bg min-h-screen relative flex flex-col">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative flex-1 flex flex-col">
        {/* Minimal header */}
        <header className="px-5 lg:px-8 py-5">
          <Link to="/"><Logo/></Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-lg space-y-5">
            {/* Title card */}
            <div className="aif-card aif-glow p-7 md:p-9 relative overflow-hidden text-center">
              <div className="aif-grid-overlay absolute inset-0 opacity-25 pointer-events-none"/>
              <div className="relative z-10">
                <div className="aif-chip mb-3">
                  <ShieldAlert size={12} className="text-[#5FE3C9]"/>
                  {isIt ? "Registrazione sicura" : "Secure registration"}
                </div>
                <h1 className="section-title !text-3xl mt-2">
                  {isIt ? "Crea il tuo account" : "Create your account"}
                </h1>
                <p className="text-[var(--aif-text-dim)] mt-2 text-[14px]">
                  {isIt
                    ? "Inserisci i tuoi dati per avviare la procedura di tracciamento fondi."
                    : "Enter your details to start the fund-tracing procedure."}
                </p>
              </div>
            </div>

            {/* Form card */}
            <form onSubmit={submit} className="aif-card p-6 md:p-8 space-y-4">
              {/* Name row */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="aif-label">{isIt ? "Nome" : "First name"} *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                    <input
                      className="aif-input pl-9"
                      data-testid="reg-first"
                      value={form.first_name}
                      onChange={set("first_name")}
                      placeholder="Mario"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="aif-label">{isIt ? "Cognome" : "Last name"} *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                    <input
                      className="aif-input pl-9"
                      data-testid="reg-last"
                      value={form.last_name}
                      onChange={set("last_name")}
                      placeholder="Rossi"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="aif-label">Email *</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input
                    type="email"
                    className="aif-input pl-9"
                    data-testid="reg-email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="tu@esempio.it"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="aif-label">{isIt ? "Password" : "Password"} *</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input
                    type={showPw ? "text" : "password"}
                    className="aif-input pl-9 pr-10"
                    data-testid="reg-password"
                    value={form.password}
                    onChange={set("password")}
                    placeholder={isIt ? "Min. 6 caratteri" : "Min. 6 characters"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] hover:text-white"
                  >
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="aif-label">{isIt ? "Telefono" : "Phone number"} *</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input
                    type="tel"
                    className="aif-input pl-9"
                    data-testid="reg-phone"
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="+39 333 1234567"
                    required
                  />
                </div>
              </div>

              {/* Date of birth */}
              <div>
                <label className="aif-label">{isIt ? "Data di nascita" : "Date of birth"} *</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input
                    type="date"
                    className="aif-input pl-9"
                    data-testid="reg-dob"
                    value={form.date_of_birth}
                    onChange={set("date_of_birth")}
                    required
                  />
                </div>
              </div>

              {/* Privacy consent */}
              <div className="aif-card !rounded-xl p-4 !border-[var(--aif-line)]">
                <p className="text-[12px] text-[var(--aif-text-dim)] leading-relaxed">
                  {isIt
                    ? "Registrandoti accetti i nostri Termini di Servizio e l'Informativa Privacy. I dati del caso sono riservati — non inserire mai seed phrase, password bancarie o codici OTP."
                    : "By registering you accept our Terms of Service and Privacy Policy. Case data is confidential — never enter seed phrases, banking passwords or OTP codes."}
                </p>
              </div>

              <button
                type="submit"
                disabled={busy}
                data-testid="reg-submit"
                className="aif-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy
                  ? (isIt ? "Creazione account…" : "Creating account…")
                  : (isIt ? "Crea Account" : "Create Account")}
                {!busy && <ArrowRight size={16}/>}
              </button>

              <div className="text-center text-[13px] text-[var(--aif-text-dim)]">
                {isIt ? "Hai già un account?" : "Already have an account?"}{" "}
                <Link to="/login" className="text-[#5FE3C9] hover:underline" data-testid="reg-login-link">
                  {isIt ? "Accedi" : "Sign in"}
                </Link>
              </div>
            </form>

            {/* Security warning */}
            <div className="aif-card p-5 !border-l-4 !border-l-[#FFB454]">
              <div className="flex items-start gap-3">
                <ShieldAlert size={16} className="text-[#FFB454] mt-0.5 shrink-0"/>
                <p className="text-[12px] text-[var(--aif-text-dim)] leading-relaxed">
                  <strong className="text-[#FFB454]">
                    {isIt ? "Attenzione truffe di recupero." : "Recovery scam warning."}
                  </strong>{" "}
                  {isIt
                    ? "Traccia Fondi non ti chiederà mai pagamenti, seed phrase, private key, OTP o l'installazione di software remoto."
                    : "Traccia Fondi will never ask for payments, seed phrases, private keys, OTP codes or remote software installation."}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
