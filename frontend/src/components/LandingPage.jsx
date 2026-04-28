// LandingPage — composes all sections of the AI-FUNDS marketing page.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, TrendingUp, Bitcoin, CreditCard, Wallet, FileCheck2,
  ShieldAlert, ShieldCheck, Banknote, Network, AlertTriangle, ChevronDown,
  ArrowRight, CheckCircle2, Sparkles, Lock, Eye, Layers, FileWarning, Coins
} from "lucide-react";
import Navbar from "./Navbar";
import HeroNetwork from "./HeroNetwork";
import { useI18n } from "../i18n";
import Footer from "./Footer";

const FADE_UP = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function Section({ id, children, className = "" }) {
  return <section id={id} className={`relative max-w-7xl mx-auto px-5 lg:px-8 ${className}`}>{children}</section>;
}

function SmallTag({ children, icon: Icon = Sparkles }) {
  return (
    <span className="aif-chip"><Icon size={12} className="text-[#5FE3C9]"/> {children}</span>
  );
}

// === Hero ===
function Hero() {
  const { t } = useI18n();
  return (
    <Section id="hero" className="pt-12 md:pt-20 pb-16 md:pb-24">
      <div className="grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6">
          <motion.div initial="hidden" animate="show" variants={FADE_UP}><SmallTag icon={Sparkles}>{t("hero.tag")}</SmallTag></motion.div>
          <motion.h1 initial="hidden" animate="show" variants={FADE_UP} transition={{ delay: 0.05 }}
            className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] section-title">
            {t("hero.title")}
          </motion.h1>
          <motion.p initial="hidden" animate="show" variants={FADE_UP} transition={{ delay: 0.12 }}
            className="mt-5 text-[15px] md:text-base text-[var(--aif-text-dim)] max-w-xl leading-relaxed">
            {t("hero.subtitle")}
          </motion.p>
          <motion.div initial="hidden" animate="show" variants={FADE_UP} transition={{ delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="aif-btn-primary inline-flex items-center gap-2" data-testid="hero-cta-start">
              {t("hero.cta1")} <ArrowRight size={16}/>
            </Link>
            <a href="#how" className="aif-btn-ghost inline-flex items-center gap-2" data-testid="hero-cta-how">
              {t("hero.cta2")}
            </a>
          </motion.div>
          <p className="mt-4 text-[12px] text-[var(--aif-text-dim)] max-w-md">{t("hero.disclaimer")}</p>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            <Stat label="Tipi di scam" value="20+"/>
            <Stat label="Report generabili" value="9"/>
            <Stat label="Lingue" value="IT / EN"/>
          </div>
        </div>

        <div className="lg:col-span-6">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
            className="aif-card aif-glow p-3 md:p-5">
            <HeroNetwork/>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="aif-card !rounded-xl p-3">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-[var(--aif-text-dim)]">{label}</div>
    </div>
  );
}

// === Trust warning ===
function TrustWarning() {
  const { t } = useI18n();
  return (
    <Section className="py-10">
      <div className="aif-card p-6 md:p-8 border-l-4 !border-l-[#FFB454]">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#FFB454]/15 border border-[#FFB454]/40 flex items-center justify-center text-[#FFB454] shrink-0">
            <AlertTriangle size={22}/>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#FFB454] mb-1">Avviso importante</div>
            <h3 className="text-xl md:text-2xl font-bold text-white">{t("trust.title")}</h3>
            <p className="mt-2 text-[var(--aif-text-dim)] text-[14px] leading-relaxed">{t("trust.body")}</p>
            <div className="mt-3 inline-flex items-center gap-2 text-[13px] text-[#FFB454] font-medium">
              <ShieldAlert size={14}/> {t("trust.never")}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// === Italian context grid ===
function ItalianContext() {
  const { t } = useI18n();
  const cards = [
    { icon: Banknote,  title: "Bonifici SEPA e Istantanei",       desc: "CRO/TRN, IBAN, recall: tutto strutturato per la banca." },
    { icon: TrendingUp,title: "Forex e Broker Falsi",             desc: "Dashboard, prelievi bloccati, profitti garantiti, segnalazioni CONSOB." },
    { icon: Bitcoin,   title: "Crypto Wallet Tracking",           desc: "Network, hash, wallet, exchange esposti, freeze request." },
    { icon: CreditCard,title: "PostePay e BancoPosta",            desc: "PostePay Evolution, top-up, fake SMS Poste, reclamo strutturato." },
    { icon: Wallet,    title: "Carte, PayPal e Wallet Digitali",  desc: "Chargeback, dispute, merchant descriptor, Revolut, Wise, Satispay." },
    { icon: FileCheck2,title: "Report per Banca, CONSOB, Polizia",desc: "Documenti professionali pronti all'invio." },
  ];
  return (
    <Section id="scams" className="py-16 md:py-24">
      <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
        <div>
          <SmallTag icon={Layers}>Italia • Scenari reali</SmallTag>
          <h2 className="section-title mt-3">{t("context.title")}</h2>
          <p className="text-[var(--aif-text-dim)] mt-3 max-w-2xl">{t("context.body")}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={i} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
              className="aif-card p-6 hover:border-[#5FE3C9]/40 transition">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#5FE3C9]/20 to-[#6E8BFF]/20 border border-[var(--aif-line)] flex items-center justify-center text-[#5FE3C9]">
                <Icon size={20}/>
              </div>
              <h3 className="text-white font-semibold text-lg mt-4">{c.title}</h3>
              <p className="text-[var(--aif-text-dim)] text-[13px] mt-2 leading-relaxed">{c.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}

// === How it works ===
function HowItWorks() {
  const { t } = useI18n();
  const steps = [t("how.s1"), t("how.s2"), t("how.s3"), t("how.s4"), t("how.s5"), t("how.s6")];
  return (
    <Section id="how" className="py-16 md:py-24">
      <div className="mb-10">
        <SmallTag icon={Network}>Workflow</SmallTag>
        <h2 className="section-title mt-3">{t("how.title")}</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div key={i} className="aif-card p-5 relative overflow-hidden">
            <div className="absolute -right-4 -top-6 text-[80px] font-black text-[#5FE3C9]/8 leading-none">{i + 1}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9] mb-2">Step {i + 1}</div>
            <div className="text-white font-medium">{s}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// === Authority cards ===
function AuthorityPath() {
  const { t } = useI18n();
  const cards = [
    { icon: Building2, color: "#5FE3C9", title: "Banca / Provider di pagamento", desc: "Bonifico, carta, conto corrente, operazione non autorizzata, chargeback, SEPA recall.", btn: "Genera Reclamo Banca" },
    { icon: ShieldCheck, color: "#6E8BFF", title: "CONSOB", desc: "Broker non autorizzato, forex, CFD, trading online, finta piattaforma di investimento.", btn: "Prepara Segnalazione CONSOB" },
    { icon: ShieldAlert, color: "#FFB454", title: "Polizia Postale", desc: "Online fraud, phishing, crypto scam, romance scam, fake broker, account takeover.", btn: "Prepara Riassunto Denuncia" },
    { icon: Coins, color: "#5FE3C9", title: "Exchange Crypto", desc: "Wallet, transaction hash, crypto sent to scammer, possible exchange exposure.", btn: "Genera Richiesta Freeze" },
    { icon: CreditCard, color: "#FF6B7A", title: "PostePay / BancoPosta", desc: "PostePay top-up, BancoPosta phishing, fake Poste SMS, falsa pagina.", btn: "Prepara Reclamo Poste" },
  ];
  return (
    <Section id="reports" className="py-16 md:py-24">
      <div className="mb-10">
        <SmallTag icon={FileCheck2}>Percorso istituzionale</SmallTag>
        <h2 className="section-title mt-3">{t("auth.title")}</h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="aif-card p-6">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${c.color}20`, border: `1px solid ${c.color}40`, color: c.color }}>
                <Icon size={20}/>
              </div>
              <h3 className="text-white font-semibold text-lg mt-4">{c.title}</h3>
              <p className="text-[var(--aif-text-dim)] text-[13px] mt-2 leading-relaxed">{c.desc}</p>
              <Link to="/register" className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: c.color }}>
                {c.btn} <ArrowRight size={14}/>
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-[12px] text-[var(--aif-text-dim)] max-w-3xl">{t("auth.disclaimer")}</p>
    </Section>
  );
}

// === Tracing visualization teaser ===
function TracingTeaser() {
  const { t } = useI18n();
  return (
    <Section id="tracing" className="py-16 md:py-24">
      <div className="aif-card p-6 md:p-10 relative overflow-hidden">
        <div className="aif-grid-overlay absolute inset-0 opacity-30 pointer-events-none"/>
        <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-5">
            <SmallTag icon={Network}>Live tracing</SmallTag>
            <h2 className="section-title mt-3">{t("tracing.title")}</h2>
            <p className="text-[var(--aif-text-dim)] mt-3 leading-relaxed">{t("tracing.body")}</p>
            <ul className="mt-5 space-y-2 text-[14px]">
              {["Mappatura SEPA / PostePay / Card / Crypto / Forex","Particelle animate sui flussi di fondi","Rilevazione red flag in tempo reale","Generazione report bank-ready"].map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[var(--aif-text-dim)]"><CheckCircle2 size={16} className="text-[#5FE3C9] mt-0.5"/> {b}</li>
              ))}
            </ul>
            <Link to="/register" className="aif-btn-primary inline-flex items-center gap-2 mt-6">Avvia Tracciamento <ArrowRight size={16}/></Link>
          </div>
          <div className="lg:col-span-7"><HeroNetwork/></div>
        </div>
      </div>
    </Section>
  );
}

// === Reports gallery ===
function ReportsGallery() {
  const reports = [
    "Reclamo banca", "Richiesta chargeback", "Segnalazione PostePay/BancoPosta",
    "Segnalazione CONSOB", "Riassunto Polizia Postale", "Richiesta freeze exchange",
    "Memo per avvocato", "Timeline del caso", "Warning falso recupero",
  ];
  return (
    <Section className="py-16 md:py-24">
      <div className="mb-10">
        <SmallTag icon={FileCheck2}>Report</SmallTag>
        <h2 className="section-title mt-3">Report professionali generati dal tuo caso</h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r} className="aif-card p-5 flex items-center gap-4 hover:border-[#5FE3C9]/40 transition">
            <div className="w-12 h-16 rounded-md bg-gradient-to-b from-[#5FE3C9]/30 to-[#6E8BFF]/30 border border-[var(--aif-line)] flex items-center justify-center">
              <FileWarning size={20} className="text-[#5FE3C9]"/>
            </div>
            <div>
              <div className="text-white font-medium">{r}</div>
              <div className="text-[11px] text-[var(--aif-text-dim)] mt-0.5">PDF generabile dal dashboard</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// === FAQ ===
function FAQ() {
  const { t } = useI18n();
  const items = [
    { q: "AI-FUNDS garantisce il recupero?", a: "No. AI-FUNDS aiuta a organizzare prove, tracciare possibili percorsi dei fondi e preparare report professionali. Il recupero dipende da banche, exchange, provider di pagamento, autorità, tempi, giurisdizione e qualità delle prove." },
    { q: "Devo inserire seed phrase o password?", a: "No. Non inserire mai seed phrase, private key, password bancarie, codici OTP o credenziali exchange. AI-FUNDS non te le chiederà mai." },
    { q: "AI-FUNDS è affiliato a CONSOB o Polizia Postale?", a: "No. AI-FUNDS non è affiliato ad autorità pubbliche. Aiuta solo a preparare informazioni e report da inviare attraverso i canali ufficiali." },
    { q: "Posso usare il report per la banca?", a: "Sì. Il sistema genera un report strutturato che puoi usare come base per contattare banca o provider di pagamento." },
    { q: "Supporta bonifici SEPA e PostePay?", a: "Sì. Il sistema chiede CRO/TRN, IBAN, ricevute, destinatario e dettagli pagamento, con flusso dedicato per ciascun binario." },
    { q: "Supporta crypto transaction hash?", a: "Sì. Puoi inserire network, wallet address, transaction hash, exchange usato e importo, e generare richieste freeze." },
    { q: "Cosa succede se ho già pagato un falso recuperatore?", a: "AI-FUNDS rileva segnali di falso recupero fondi (secondary scam) e genera un warning report con prove e prossimi passi." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <Section id="faq" className="py-16 md:py-24">
      <div className="mb-10">
        <SmallTag icon={Eye}>FAQ</SmallTag>
        <h2 className="section-title mt-3">{t("faq.title")}</h2>
      </div>
      <div className="max-w-3xl space-y-2">
        {items.map((it, i) => (
          <div key={i} className={`aif-card transition ${open === i ? "aif-glow" : ""}`}>
            <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="text-white font-medium">{it.q}</span>
              <ChevronDown size={18} className={`text-[var(--aif-text-dim)] transition-transform ${open === i ? "rotate-180" : ""}`}/>
            </button>
            {open === i && <div className="px-5 pb-5 text-[14px] text-[var(--aif-text-dim)] leading-relaxed">{it.a}</div>}
          </div>
        ))}
      </div>
    </Section>
  );
}

// === CTA banner ===
function CtaBanner() {
  return (
    <Section className="py-12">
      <div className="aif-card aif-glow p-8 md:p-12 text-center relative overflow-hidden">
        <div className="aif-grid-overlay absolute inset-0 opacity-40 pointer-events-none"/>
        <div className="relative z-10">
          <SmallTag icon={Lock}>Privacy-first • GDPR aware</SmallTag>
          <h3 className="section-title mt-3">Inizia ora la tua analisi gratuita</h3>
          <p className="text-[var(--aif-text-dim)] mt-3 max-w-2xl mx-auto">Nessuna seed phrase, nessuna OTP, nessun pagamento per 'sbloccare' fondi. Solo evidenze e report.</p>
          <Link to="/register" className="aif-btn-primary inline-flex items-center gap-2 mt-6">Avvia Analisi Gratuita <ArrowRight size={16}/></Link>
        </div>
      </div>
    </Section>
  );
}

export default function LandingPage() {
  return (
    <div className="aif-app-bg">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <Navbar/>
        <Hero/>
        <TrustWarning/>
        <ItalianContext/>
        <HowItWorks/>
        <AuthorityPath/>
        <TracingTeaser/>
        <ReportsGallery/>
        <FAQ/>
        <CtaBanner/>
        <Footer/>
      </div>
    </div>
  );
}
