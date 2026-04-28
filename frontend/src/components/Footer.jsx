import React from "react";
import Logo from "./Logo";
import { useI18n } from "../i18n";
import { ShieldAlert } from "lucide-react";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-[var(--aif-line)] mt-16">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10 grid md:grid-cols-3 gap-8">
        <div>
          <Logo/>
          <p className="text-[12px] text-[var(--aif-text-dim)] mt-3 leading-relaxed">
            AI-assisted fund tracing & professional dossier preparation per vittime italiane di truffe online.
          </p>
        </div>

        <div>
          <div className="text-white font-semibold mb-2">Sicurezza</div>
          <div className="flex items-start gap-2 text-[12px] text-[#FFB454]">
            <ShieldAlert size={14} className="mt-0.5"/> {t("footer.warn")}
          </div>
          <div className="text-[12px] text-[var(--aif-text-dim)] mt-3">{t("footer.disclaimer")}</div>
        </div>

        <div>
          <div className="text-white font-semibold mb-2">Disclaimer</div>
          <div className="text-[12px] text-[var(--aif-text-dim)] leading-relaxed">
            AI-FUNDS non è affiliato a CONSOB, Banca d'Italia, Polizia Postale, Poste Italiane, banche, exchange o autorità pubbliche.
            Le analisi sono preliminari. Per decisioni legali o finanziarie, rivolgersi a professionisti qualificati.
          </div>
        </div>
      </div>
      <div className="text-center text-[11px] text-[var(--aif-text-dim)] py-4 border-t border-[var(--aif-line)]">
        © {new Date().getFullYear()} AI-FUNDS — Italia. Privacy-first • GDPR aware.
      </div>
    </footer>
  );
}
