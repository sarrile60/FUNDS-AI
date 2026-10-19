// RegisterPage — self-registration form
import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  User, Mail, Lock, Calendar, ArrowRight, ShieldAlert, Eye, EyeOff,
  CheckCircle2, RefreshCw
} from "lucide-react";
import Logo from "./Logo";
import { useI18n } from "../i18n";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RegisterPage() {
  const { lang } = useI18n();
  const nav = useNavigate();
  const isIt = lang === "it";

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    password: "", date_of_birth: ""
  });
  // Separate day/month/year fields for dd/mm/yyyy display
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [resending, setResending] = useState(false);
  const datePickerRef = useRef(null); // hidden native date input

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  // Update date_of_birth in YYYY-MM-DD format whenever day/month/year changes
  const updateDob = (day, month, year) => {
    if (day && month && year && year.length === 4) {
      const d = String(day).padStart(2, "0");
      const m = String(month).padStart(2, "0");
      setForm(prev => ({ ...prev, date_of_birth: `${year}-${m}-${d}` }));
    } else {
      setForm(prev => ({ ...prev, date_of_birth: "" }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      toast.error(isIt ? "Compila tutti i campi" : "Fill all fields");
      return;
    }
    if (!dobDay || !dobMonth || !dobYear || dobYear.length < 4) {
      toast.error(isIt ? "Inserisci la data di nascita completa (GG/MM/AAAA)" : "Enter complete date of birth (DD/MM/YYYY)");
      return;
    }
    if (!form.date_of_birth) {
      toast.error(isIt ? "Data di nascita non valida" : "Invalid date of birth");
      return;
    }
    if (form.password.length < 6) {
      toast.error(isIt ? "Password minima 6 caratteri" : "Password minimum 6 characters");
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${API}/auth/register`, { ...form, lang });
      setDone(true);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : (isIt ? "Errore registrazione" : "Registration error"));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!form.email) return;
    setResending(true);
    try {
      await axios.post(`${API}/auth/resend-verification`, { email: form.email });
      toast.success(isIt ? "Email di verifica inviata di nuovo" : "Verification email resent");
    } catch {
      toast.error(isIt ? "Errore invio" : "Send error");
    } finally {
      setResending(false);
    }
  };

  // ── "Check your email" screen ─────────────────────────────
  if (done) {
    return (
      <div className="aif-app-bg min-h-screen relative flex flex-col">
        <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
        <div className="relative flex-1 flex flex-col">
          <header className="px-5 lg:px-8 py-5">
            <Link to="/"><Logo/></Link>
          </header>
          <main className="flex-1 flex items-center justify-center px-5 py-10">
            <div className="w-full max-w-md space-y-5 text-center">
              <div className="aif-card aif-glow p-8 md:p-10 relative overflow-hidden">
                <div className="aif-grid-overlay absolute inset-0 opacity-25 pointer-events-none"/>
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-full bg-[#5FE3C9]/15 border border-[#5FE3C9]/40 flex items-center justify-center mx-auto mb-4">
                    <Mail size={32} className="text-[#5FE3C9]"/>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {isIt ? "Controlla la tua email" : "Check your email"}
                  </h2>
                  <p className="text-[var(--aif-text-dim)] mt-3 leading-relaxed text-[14px]">
                    {isIt
                      ? `Abbiamo inviato un link di conferma a ${form.email}. Clicca sul link per attivare il tuo account.`
                      : `We sent a confirmation link to ${form.email}. Click the link to activate your account.`}
                  </p>
                  <div className="mt-4 aif-card !rounded-xl p-3 text-[12px] text-[var(--aif-text-dim)]">
                    {isIt
                      ? "Il link scade dopo 48 ore. Controlla anche la cartella spam."
                      : "The link expires after 48 hours. Also check your spam folder."}
                  </div>
                  <button
                    onClick={resend}
                    disabled={resending}
                    className="mt-5 aif-btn-ghost inline-flex items-center gap-2 !text-sm"
                  >
                    <RefreshCw size={14} className={resending ? "animate-spin" : ""}/>
                    {isIt ? "Invia di nuovo" : "Resend email"}
                  </button>
                  <div className="mt-5">
                    <Link to="/login" className="text-[#5FE3C9] text-[13px] hover:underline">
                      {isIt ? "Vai al login" : "Go to login"}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────
  return (
    <div className="aif-app-bg min-h-screen relative flex flex-col">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative flex-1 flex flex-col">
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
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] pointer-events-none"/>
                    <input
                      className="aif-input pl-10"
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
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] pointer-events-none"/>
                    <input
                      className="aif-input pl-10"
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
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] pointer-events-none"/>
                  <input
                    type="email"
                    className="aif-input pl-10"
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
                <label className="aif-label">Password *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] pointer-events-none"/>
                  <input
                    type={showPw ? "text" : "password"}
                    className="aif-input pl-10 pr-10"
                    data-testid="reg-password"
                    value={form.password}
                    onChange={set("password")}
                    placeholder={isIt ? "Min. 6 caratteri" : "Min. 6 characters"}
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

              {/* Date of birth — dd/mm/yyyy with optional calendar picker */}
              <div>
                <label className="aif-label">{isIt ? "Data di nascita" : "Date of birth"} *</label>
                <div className="flex items-center gap-2">
                  {/* Calendar icon — opens native date picker */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => datePickerRef.current?.showPicker?.() || datePickerRef.current?.click()}
                      className="w-9 h-10 flex items-center justify-center rounded-lg border border-[var(--aif-line)] bg-[var(--aif-surface)] text-[#5FE3C9] hover:border-[#5FE3C9] transition"
                      title={isIt ? "Apri calendario" : "Open calendar"}
                    >
                      <Calendar size={15}/>
                    </button>
                    {/* Hidden native date input — positioned over button to trigger picker */}
                    <input
                      ref={datePickerRef}
                      type="date"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      tabIndex={-1}
                      min="1900-01-01"
                      max={`${new Date().getFullYear()}-12-31`}
                      onChange={e => {
                        const val = e.target.value; // YYYY-MM-DD
                        if (!val) return;
                        const [y, m, d] = val.split("-");
                        setDobDay(String(parseInt(d)));
                        setDobMonth(String(parseInt(m)));
                        setDobYear(y);
                        updateDob(d, m, y);
                      }}
                    />
                  </div>

                  {/* Day */}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      className="aif-input text-center"
                      data-testid="reg-dob-day"
                      value={dobDay}
                      onChange={e => {
                        const v = e.target.value.slice(0, 2);
                        setDobDay(v);
                        updateDob(v, dobMonth, dobYear);
                      }}
                      placeholder="GG"
                      min="1"
                      max="31"
                      required
                    />
                  </div>
                  <span className="text-[var(--aif-text-dim)] font-bold text-lg select-none">/</span>
                  {/* Month */}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      className="aif-input text-center"
                      data-testid="reg-dob-month"
                      value={dobMonth}
                      onChange={e => {
                        const v = e.target.value.slice(0, 2);
                        setDobMonth(v);
                        updateDob(dobDay, v, dobYear);
                      }}
                      placeholder="MM"
                      min="1"
                      max="12"
                      required
                    />
                  </div>
                  <span className="text-[var(--aif-text-dim)] font-bold text-lg select-none">/</span>
                  {/* Year */}
                  <div className="relative flex-[2]">
                    <input
                      type="number"
                      className="aif-input text-center"
                      data-testid="reg-dob-year"
                      value={dobYear}
                      onChange={e => {
                        const v = e.target.value.slice(0, 4);
                        setDobYear(v);
                        updateDob(dobDay, dobMonth, v);
                      }}
                      placeholder="AAAA"
                      min="1900"
                      max={new Date().getFullYear()}
                      required
                    />
                  </div>
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
