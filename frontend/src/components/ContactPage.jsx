// ContactPage — public contact form, sends via Resend backend.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Mail, User, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";
import { useI18n } from "../i18n";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ContactPage() {
  const { t, lang } = useI18n();
  const isIt = lang === "it";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || message.trim().length < 10) {
      toast.error(isIt ? "Compila tutti i campi (messaggio min 10 caratteri)" : "Please fill all fields (message min 10 chars)");
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${API}/contact`, { name, email, message });
      setDone(true);
    } catch (e) {
      const d = e?.response?.data?.detail;
      toast.error(typeof d === "string" ? d : (isIt ? "Errore invio" : "Send error"));
    } finally { setBusy(false); }
  };

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <header className="border-b border-[var(--aif-line)] bg-[rgba(6,11,24,0.92)]">
          <div className="max-w-3xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="aif-btn-ghost !py-2 !text-sm inline-flex items-center gap-2">
              <ArrowLeft size={14}/> {t("nav.back")}
            </Link>
            <Link to="/"><Logo/></Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-5 lg:px-8 py-12 md:py-16">
          <div className="aif-chip mb-4">{isIt ? "Contatti" : "Contact"}</div>
          <h1 className="section-title">{isIt ? "Contattaci" : "Get in touch"}</h1>
          <p className="text-[var(--aif-text-dim)] mt-3 leading-relaxed max-w-2xl">
            {isIt
              ? "Per supporto generale, domande sul servizio o richieste relative alla privacy, scrivici. Risponderemo entro 1-2 giorni lavorativi."
              : "For general support, service questions, or privacy-related requests, write to us. We reply within 1-2 business days."}
          </p>

          <div className="mt-8 grid md:grid-cols-3 gap-3 mb-8">
            <a href="mailto:support@traccia-fondi.com" className="aif-card p-4 hover:border-[#5FE3C9]/40 transition-colors">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9]">{isIt ? "Supporto" : "Support"}</div>
              <div className="text-white font-medium mt-1.5 text-[14px] truncate">support@traccia-fondi.com</div>
            </a>
            <a href="mailto:privacy@traccia-fondi.com" className="aif-card p-4 hover:border-[#5FE3C9]/40 transition-colors">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9]">Privacy / GDPR</div>
              <div className="text-white font-medium mt-1.5 text-[14px] truncate">privacy@traccia-fondi.com</div>
            </a>
            <a href="mailto:legal@traccia-fondi.com" className="aif-card p-4 hover:border-[#5FE3C9]/40 transition-colors">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9]">{isIt ? "Legale" : "Legal"}</div>
              <div className="text-white font-medium mt-1.5 text-[14px] truncate">legal@traccia-fondi.com</div>
            </a>
          </div>

          {done ? (
            <div className="aif-card aif-glow p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4ADE80]/15 border-2 border-[#4ADE80]/40 mb-3">
                <CheckCircle2 size={32} className="text-[#4ADE80]"/>
              </div>
              <h2 className="text-2xl font-bold text-white">{isIt ? "Messaggio inviato" : "Message sent"}</h2>
              <p className="text-[var(--aif-text-dim)] mt-2 max-w-lg mx-auto">
                {isIt ? "Grazie per averci scritto. Ti risponderemo via email." : "Thanks for writing. We'll reply by email."}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="aif-card p-6 md:p-8 space-y-4" data-testid="contact-form">
              <div>
                <label className="aif-label">{isIt ? "Nome e cognome" : "Full name"}</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input className="aif-input pl-10" data-testid="contact-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120}/>
                </div>
              </div>
              <div>
                <label className="aif-label">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input type="email" className="aif-input pl-10" data-testid="contact-email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                </div>
              </div>
              <div>
                <label className="aif-label">{isIt ? "Messaggio" : "Message"}</label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-3 top-3 text-[var(--aif-text-dim)]"/>
                  <textarea className="aif-input pl-10 min-h-[140px] resize-y" data-testid="contact-message"
                    value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={5000}
                    placeholder={isIt ? "Scrivi qui il tuo messaggio…" : "Write your message here…"}/>
                </div>
                <div className="text-[11px] text-[var(--aif-text-dim)] mt-1.5">{message.length}/5000</div>
              </div>
              <button type="submit" disabled={busy} className="aif-btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-60" data-testid="contact-submit">
                {busy ? (isIt ? "Invio…" : "Sending…") : (isIt ? "Invia messaggio" : "Send message")} <Send size={16}/>
              </button>
              <p className="text-[11px] text-[var(--aif-text-dim)]">
                {isIt ? "Inviando, accetti il trattamento dei dati come da " : "By sending, you agree to data processing as per our "}
                <Link to="/privacy" className="aif-link">{isIt ? "Informativa Privacy" : "Privacy Policy"}</Link>.
              </p>
            </form>
          )}
        </main>
        <Footer/>
      </div>
    </div>
  );
}
