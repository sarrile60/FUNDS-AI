// ContactPage — simplified contact page with email only.
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";
import { useI18n } from "../i18n";

export default function ContactPage() {
  const { t, lang } = useI18n();
  const isIt = lang === "it";

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

        <main className="max-w-3xl mx-auto px-5 lg:px-8 py-12 md:py-20">
          <div className="aif-chip mb-4">{isIt ? "Contatti" : "Contact"}</div>
          <h1 className="section-title">{isIt ? "Contattaci" : "Get in touch"}</h1>
          <p className="text-[var(--aif-text-dim)] mt-3 leading-relaxed max-w-2xl text-[15px]">
            {isIt
              ? "Per supporto, domande sul servizio o qualsiasi altra richiesta, il nostro team è a tua disposizione via email. Risponderemo entro 1-2 giorni lavorativi."
              : "For support, service questions, or any other inquiry, our team is available via email. We'll respond within 1-2 business days."}
          </p>

          {/* Single email card */}
          <div className="mt-10 max-w-md">
            <a
              href="mailto:support@traccia-fondi.com"
              className="aif-card p-6 md:p-8 flex items-center gap-5 hover:border-[#5FE3C9]/40 transition-colors group"
              data-testid="contact-email-card"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#5FE3C9]/10 border border-[#5FE3C9]/30 flex items-center justify-center group-hover:bg-[#5FE3C9]/20 transition-colors">
                <Mail size={24} className="text-[#5FE3C9]"/>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9] mb-1">
                  {isIt ? "Scrivici a" : "Write to us at"}
                </div>
                <div className="text-white font-semibold text-[17px]">support@traccia-fondi.com</div>
              </div>
            </a>
          </div>

          <p className="text-[var(--aif-text-dim)] mt-8 text-[13px] leading-relaxed max-w-lg">
            {isIt
              ? "Includi nel messaggio una breve descrizione della tua richiesta. Il nostro team ti risponderà il prima possibile."
              : "Please include a brief description of your request in the email. Our team will get back to you as soon as possible."}
          </p>
        </main>
        <Footer/>
      </div>
    </div>
  );
}
