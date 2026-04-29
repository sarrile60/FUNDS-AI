// SecurityPage — Anti-fraud / recovery-scam awareness page.
// THE single biggest legitimacy signal: a long, detailed warning about scams
// that a real recovery scammer would NEVER publish.
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, AlertTriangle, X, CheckCircle2 } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";
import { useI18n } from "../i18n";

export default function SecurityPage() {
  const { t, lang } = useI18n();
  const isIt = lang === "it";

  const redFlags = isIt ? [
    "Promette il recupero al 100% in pochi giorni.",
    "Chiede una 'tassa di sblocco', 'commissione AML', 'gas fee' o 'certificato' anticipato.",
    "Si presenta come avvocato, agente CONSOB, funzionario Banca d'Italia, ECB, Interpol o Polizia Postale senza prove verificabili.",
    "Ti contatta su WhatsApp o Telegram da un numero estero.",
    "Ti chiede di installare AnyDesk, TeamViewer, RustDesk o altri software di accesso remoto.",
    "Ti chiede la tua seed phrase, private key, password bancaria o codici OTP.",
    "Mostra dashboard finte con 'fondi recuperati' e ti chiede di pagare per ritirarli.",
    "Ti dice di non parlarne con la banca o con la Polizia Postale.",
    "Pretende il pagamento solo in crypto, gift card, Western Union, Postepay o ricariche.",
    "Ha un sito web con dominio recente (<6 mesi), nessuna informazione legale, nessuna sede fisica verificabile.",
  ] : [
    "Promises 100% recovery within days.",
    "Asks for an upfront 'unlock fee', 'AML fee', 'gas fee', or 'certificate'.",
    "Claims to be a lawyer, CONSOB agent, Banca d'Italia officer, ECB, Interpol, or Polizia Postale without verifiable proof.",
    "Contacts you on WhatsApp or Telegram from a foreign number.",
    "Asks you to install AnyDesk, TeamViewer, RustDesk, or any remote-access software.",
    "Asks for your seed phrase, private key, banking password, or OTP codes.",
    "Shows fake dashboards with 'recovered funds' and asks you to pay to withdraw them.",
    "Tells you not to talk to your bank or the police.",
    "Demands payment only in crypto, gift cards, Western Union, Postepay, or top-ups.",
    "Has a website with a recent domain (<6 months), no legal information, no verifiable physical address.",
  ];

  const safeChecks = isIt ? [
    "Verifica sempre l'identità di chi ti contatta tramite i canali ufficiali della presunta organizzazione.",
    "Non condividere mai password, codici OTP, seed phrase o private key.",
    "Non installare software di accesso remoto su richiesta di sconosciuti.",
    "Conserva tutte le prove originali: email, chat, screenshot, ricevute, transaction hash, IBAN.",
    "Sporgi denuncia / querela presso la Polizia Postale (commissariatodips.it) o un Commissariato locale.",
    "Contatta la tua banca per richiedere recall o chargeback nei tempi del circuito.",
    "Per truffe di investimento: segnala a CONSOB tramite www.consob.it.",
    "Per truffe crypto: contatta l'exchange esposto e prepara una richiesta di freeze.",
    "Diffida di chiunque ti prometta recuperi miracolosi a fronte di pagamenti anticipati.",
    "Consultati con un avvocato esperto in frodi finanziarie prima di firmare contratti o effettuare pagamenti.",
  ] : [
    "Always verify the identity of anyone contacting you through the official channels of the claimed organization.",
    "Never share passwords, OTP codes, seed phrases, or private keys.",
    "Do not install remote-access software at the request of strangers.",
    "Keep all original evidence: emails, chats, screenshots, receipts, transaction hashes, IBANs.",
    "File a police report with Polizia Postale (commissariatodips.it) or your local police station.",
    "Contact your bank to request a recall or chargeback within the scheme's deadlines.",
    "For investment scams: report to CONSOB at www.consob.it.",
    "For crypto scams: contact the exposed exchange and prepare a freeze request.",
    "Be suspicious of anyone promising miraculous recoveries in exchange for upfront payments.",
    "Consult a lawyer experienced in financial fraud before signing contracts or making payments.",
  ];

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <header className="border-b border-[var(--aif-line)] bg-[rgba(6,11,24,0.92)]">
          <div className="max-w-4xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="aif-btn-ghost !py-2 !text-sm inline-flex items-center gap-2">
              <ArrowLeft size={14}/> {t("nav.back")}
            </Link>
            <Link to="/"><Logo/></Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-5 lg:px-8 py-12 md:py-16">
          <div className="aif-chip mb-4 !border-[#FFB454]/40 !text-[#FFB454]">
            <ShieldAlert size={12}/> {isIt ? "Avvertimento truffe" : "Scam awareness"}
          </div>
          <h1 className="section-title">
            {isIt ? "Riconoscere le truffe di recupero fondi" : "Recognising recovery scams"}
          </h1>
          <p className="text-[var(--aif-text-dim)] mt-5 leading-relaxed max-w-3xl text-[15px]">
            {isIt
              ? "Le 'truffe di recupero' sono uno dei reati più cinici: prendono di mira persone già state truffate una volta, promettendo di recuperare i fondi persi a fronte di pagamenti anticipati. Sono il secondo livello della stessa rete criminale. Questa pagina ti aiuta a riconoscerle ed evitarle."
              : "Recovery scams are one of the most cynical crimes: they target people who have already been scammed once, promising to recover their lost funds in exchange for upfront payments. They are the second layer of the same criminal network. This page helps you recognise and avoid them."}
          </p>

          {/* Red flags */}
          <div className="aif-card p-6 md:p-8 mt-10 !border-l-4 !border-l-[#FF6B7A]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-[#FF6B7A]"/>
              <h2 className="text-2xl font-bold text-white">
                {isIt ? "Segnali di allarme — DIFFIDA se chi ti contatta…" : "Red flags — DO NOT TRUST if they…"}
              </h2>
            </div>
            <ul className="space-y-2.5 text-[14px]">
              {redFlags.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[var(--aif-text-dim)]">
                  <X size={16} className="text-[#FF6B7A] shrink-0 mt-0.5"/>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Safe checks */}
          <div className="aif-card p-6 md:p-8 mt-6 !border-l-4 !border-l-[#4ADE80]">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 size={22} className="text-[#4ADE80]"/>
              <h2 className="text-2xl font-bold text-white">
                {isIt ? "Cosa fare invece" : "What to do instead"}
              </h2>
            </div>
            <ul className="space-y-2.5 text-[14px]">
              {safeChecks.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[var(--aif-text-dim)]">
                  <CheckCircle2 size={16} className="text-[#4ADE80] shrink-0 mt-0.5"/>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="aif-card p-6 md:p-8 mt-6">
            <h2 className="text-2xl font-bold text-white">
              {isIt ? "Risorse ufficiali" : "Official resources"}
            </h2>
            <ul className="mt-4 space-y-2 text-[14px]">
              <li><a href="https://www.commissariatodips.it" target="_blank" rel="noopener noreferrer" className="aif-link">Polizia Postale — Commissariato di P.S. Online (commissariatodips.it)</a></li>
              <li><a href="https://www.consob.it" target="_blank" rel="noopener noreferrer" className="aif-link">CONSOB — Avvisi su offerte di investimento abusive (consob.it)</a></li>
              <li><a href="https://www.bancaditalia.it" target="_blank" rel="noopener noreferrer" className="aif-link">Banca d'Italia — Educazione finanziaria e segnalazioni (bancaditalia.it)</a></li>
              <li><a href="https://www.poste.it/sicurezza-online.html" target="_blank" rel="noopener noreferrer" className="aif-link">Poste Italiane — Sicurezza online</a></li>
              <li><a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="aif-link">Garante per la Protezione dei Dati Personali (garanteprivacy.it)</a></li>
            </ul>
          </div>

          {/* Our commitment */}
          <div className="aif-card aif-glow p-6 md:p-8 mt-6">
            <div className="text-[12px] uppercase tracking-[0.2em] text-[#5FE3C9]">
              {isIt ? "Il nostro impegno" : "Our commitment"}
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">
              {isIt ? "Traccia Fondi non userà MAI queste tattiche" : "Traccia Fondi will NEVER use these tactics"}
            </h2>
            <p className="text-[var(--aif-text-dim)] mt-3 leading-relaxed">
              {isIt
                ? "Se qualcuno si presenta a tuo nome usando il marchio Traccia Fondi e ti chiede pagamenti anticipati, password, OTP, seed phrase o l'installazione di software di accesso remoto, NON è Traccia Fondi. Verifica sempre via "
                : "If someone contacts you using the Traccia Fondi name and asks for upfront payments, passwords, OTP, seed phrases, or remote-access software, it is NOT Traccia Fondi. Always verify via "}
              <a href="mailto:support@traccia-fondi.com" className="aif-link">support@traccia-fondi.com</a>{isIt ? "." : "."}
            </p>
          </div>
        </main>
        <Footer/>
      </div>
    </div>
  );
}
