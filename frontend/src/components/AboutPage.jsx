// AboutPage — "Chi siamo" / About us. Builds trust & legitimacy signals.
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Sparkles, Users, FileCheck2, Globe } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";
import { useI18n } from "../i18n";

export default function AboutPage() {
  const { t, lang } = useI18n();
  const isIt = lang === "it";

  const values = [
    {
      icon: Lock,
      t: isIt ? "Privacy-first" : "Privacy-first",
      d: isIt
        ? "Raccogliamo solo i dati strettamente necessari. Nessun tracking comportamentale, nessuna vendita di dati a terze parti."
        : "We only collect data strictly needed for the service. No behavioral tracking, no data sold to third parties.",
    },
    {
      icon: Shield,
      t: isIt ? "Sicurezza" : "Security",
      d: isIt
        ? "Crittografia AES-256 a riposo, TLS 1.3 in transito, controllo accessi basato su ruoli e audit log completi."
        : "AES-256 encryption at rest, TLS 1.3 in transit, role-based access control, full audit logs.",
    },
    {
      icon: Users,
      t: isIt ? "Centrato sull'utente" : "User-centric",
      d: isIt
        ? "Costruito da chi ha visto da vicino l'impatto delle truffe online. Nessun fee nascosto, nessun upsell aggressivo."
        : "Built by people who have witnessed the impact of online scams firsthand. No hidden fees, no aggressive upsells.",
    },
    {
      icon: FileCheck2,
      t: isIt ? "Trasparenza" : "Transparency",
      d: isIt
        ? "Termini chiari, privacy policy comprensibile, ogni passaggio della procedura è documentato e tracciabile."
        : "Clear terms, plain-language privacy policy, every step of the procedure is documented and auditable.",
    },
    {
      icon: Globe,
      t: isIt ? "Conformità GDPR" : "GDPR compliant",
      d: isIt
        ? "Allineato al Regolamento (UE) 2016/679. L'utente ha pieno controllo sui propri dati: accesso, rettifica, cancellazione."
        : "Aligned with Regulation (EU) 2016/679. Users have full control over their data: access, rectification, deletion.",
    },
    {
      icon: Sparkles,
      t: isIt ? "Innovazione responsabile" : "Responsible innovation",
      d: isIt
        ? "Usiamo l'AI per accelerare il tracciamento, ma le decisioni critiche restano con team umani esperti."
        : "We use AI to accelerate tracing, but critical decisions stay with experienced human teams.",
    },
  ];

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <header className="border-b border-[var(--aif-line)] bg-[rgba(6,11,24,0.92)]">
          <div className="max-w-5xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="aif-btn-ghost !py-2 !text-sm inline-flex items-center gap-2">
              <ArrowLeft size={14}/> {t("nav.back")}
            </Link>
            <Link to="/"><Logo/></Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-5 lg:px-8 py-12 md:py-16">
          <div className="aif-chip mb-4">{isIt ? "Chi siamo" : "About us"}</div>
          <h1 className="section-title">{isIt ? "La nostra missione" : "Our mission"}</h1>
          <p className="text-[var(--aif-text-dim)] mt-5 leading-relaxed max-w-3xl text-[15px]">
            {isIt
              ? "Traccia Fondi nasce per dare alle vittime di truffe online uno strumento serio, chiaro e privacy-first per organizzare il proprio caso e portare avanti la procedura di recupero. Combiniamo tracciamento AI-assistito, esperienza nel contesto italiano e un approccio etico per evitare le pratiche aggressive tipiche del settore."
              : "Traccia Fondi exists to give victims of online scams a serious, clear, privacy-first tool to organize their case and carry out the recovery procedure. We combine AI-assisted tracing, expertise in the Italian context, and an ethical approach that avoids the aggressive practices typical of the industry."}
          </p>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.t} className="aif-card p-6">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#5FE3C9]/20 to-[#6E8BFF]/20 border border-[var(--aif-line)] flex items-center justify-center text-[#5FE3C9]">
                    <Icon size={20}/>
                  </div>
                  <h3 className="text-white font-semibold text-lg mt-4">{v.t}</h3>
                  <p className="text-[var(--aif-text-dim)] text-[13px] mt-2 leading-relaxed">{v.d}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 aif-card p-6 md:p-8">
            <div className="text-[12px] uppercase tracking-[0.2em] text-[#5FE3C9]">
              {isIt ? "Cosa NON facciamo" : "What we DO NOT do"}
            </div>
            <h2 className="text-2xl font-bold text-white mt-3">
              {isIt ? "Il nostro impegno contro le pratiche scorrette" : "Our commitment against bad practices"}
            </h2>
            <ul className="mt-5 space-y-2.5 text-[14px] text-[var(--aif-text-dim)]">
              {[
                isIt ? "Non chiediamo MAI seed phrase, private key, password bancarie o codici OTP." : "We NEVER ask for seed phrases, private keys, banking passwords or OTP codes.",
                isIt ? "Non chiediamo MAI 'tasse di sblocco', 'gas fee', 'AML fee' o pagamenti per liberare fondi." : "We NEVER ask for 'unlock fees', 'gas fees', 'AML fees' or payments to release funds.",
                isIt ? "Non installiamo software di accesso remoto sul tuo computer (AnyDesk, TeamViewer ecc.)." : "We do NOT install remote-access software on your computer (AnyDesk, TeamViewer, etc.).",
                isIt ? "Non vendiamo i tuoi dati, non li condividiamo per marketing, non usiamo cookie di profilazione." : "We do NOT sell your data, share it for marketing, or use profiling cookies.",
                isIt ? "Non promettiamo cifre o tempistiche fantasiose: lavoriamo solo con informazioni verificabili." : "We do NOT promise unrealistic amounts or timelines: we work only with verifiable information.",
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#5FE3C9] mt-2 inline-block"/> {line}</li>
              ))}
            </ul>
          </div>
        </main>
        <Footer/>
      </div>
    </div>
  );
}
