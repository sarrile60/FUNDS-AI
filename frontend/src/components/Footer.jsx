import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useI18n } from "../i18n";
import { ShieldAlert, Mail } from "lucide-react";

export default function Footer() {
  const { t, lang } = useI18n();
  const isIt = lang === "it";
  return (
    <footer className="border-t border-[var(--aif-line)] mt-16">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12 grid md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="md:col-span-2">
          <Logo/>
          <p className="text-[12.5px] text-[var(--aif-text-dim)] mt-3 leading-relaxed max-w-md">{t("footer.intro")}</p>
          <div className="mt-5 space-y-2 text-[12px] text-[var(--aif-text-dim)]">
            <div className="flex items-center gap-2"><Mail size={13} className="text-[#5FE3C9]"/> support@traccia-fondi.com</div>
          </div>
        </div>

        {/* Security column */}
        <div>
          <div className="text-white font-semibold mb-2 text-[14px]">{t("footer.tag1")}</div>
          <div className="flex items-start gap-2 text-[12px] text-[#FFB454]">
            <ShieldAlert size={13} className="mt-0.5 shrink-0"/> {t("footer.warn")}
          </div>
          <div className="text-[12px] text-[var(--aif-text-dim)] mt-3 leading-relaxed">{t("footer.disclaimer")}</div>
        </div>

        {/* Legal column */}
        <div>
          <div className="text-white font-semibold mb-2 text-[14px]">{isIt ? "Legale" : "Legal"}</div>
          <ul className="space-y-1.5 text-[12.5px]">
            <li><Link to="/terms"   className="text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition">{isIt ? "Termini di Servizio" : "Terms of Service"}</Link></li>
            <li><Link to="/privacy" className="text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition">{isIt ? "Informativa Privacy" : "Privacy Policy"}</Link></li>
            <li><Link to="/cookies" className="text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition">Cookie Policy</Link></li>
            <li><a href="mailto:legal@traccia-fondi.com" className="text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition">{isIt ? "Contatto legale" : "Legal contact"}</a></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-[11px] text-[var(--aif-text-dim)] py-4 border-t border-[var(--aif-line)]">
        © {new Date().getFullYear()} Traccia Fondi — {t("footer.copy")}
      </div>
    </footer>
  );
}
