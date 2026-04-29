// CookieBanner — GDPR-compliant cookie consent banner.
// Shows once, on first visit, until user clicks Accept (or rejects).
// Optimized: no animations, immediate render decision.
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { useI18n } from "../i18n";

const KEY = "aif_cookie_consent";

export default function CookieBanner() {
  const { lang } = useI18n();
  const [show, setShow] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (mounted.current) return;
    mounted.current = true;
    
    // Check localStorage synchronously to prevent flicker
    try {
      const v = localStorage.getItem(KEY);
      if (!v) setShow(true);
    } catch {
      // localStorage might be blocked
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(KEY, "accepted"); } catch {}
    setShow(false);
  };
  
  const reject = () => {
    try { localStorage.setItem(KEY, "rejected"); } catch {}
    setShow(false);
  };

  if (!show) return null;

  const isIt = lang === "it";
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[60]" data-testid="cookie-banner">
      <div className="aif-card aif-glow p-5 relative" style={{ background: 'rgba(8,16,38,0.98)' }}>
        <button onClick={reject} className="absolute top-3 right-3 text-[var(--aif-text-dim)] hover:text-white" title={isIt ? "Chiudi" : "Close"}>
          <X size={16}/>
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5FE3C9]/15 border border-[#5FE3C9]/40 flex items-center justify-center text-[#5FE3C9] shrink-0">
            <Cookie size={18}/>
          </div>
          <div>
            <div className="text-white font-semibold text-[14px]">{isIt ? "Cookie e privacy" : "Cookies & privacy"}</div>
            <p className="text-[12.5px] text-[var(--aif-text-dim)] mt-1.5 leading-relaxed">
              {isIt
                ? "Utilizziamo solo cookie tecnici necessari al funzionamento della piattaforma (sessione, lingua, consenso). Non utilizziamo cookie di profilazione."
                : "We only use technical cookies necessary for the platform to work (session, language, consent). No profiling cookies."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={accept} className="aif-btn-primary !py-1.5 !px-3 !text-xs" data-testid="cookie-accept">
                {isIt ? "Accetto" : "Accept"}
              </button>
              <button onClick={reject} className="aif-btn-ghost !py-1.5 !px-3 !text-xs" data-testid="cookie-reject">
                {isIt ? "Solo necessari" : "Only necessary"}
              </button>
              <Link to="/cookies" className="text-[11.5px] text-[#5FE3C9] hover:underline ml-1">
                {isIt ? "Cookie Policy" : "Cookie Policy"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
