// LandingPage — composes all sections of the Traccia Fondi marketing page.
// Optimized for mobile: no heavy animations, reduced motion.
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2, TrendingUp, Bitcoin, CreditCard, Wallet, FileCheck2,
  ShieldAlert, ShieldCheck, Banknote, Network, AlertTriangle, ChevronDown,
  ArrowRight, CheckCircle2, Sparkles, Lock, Eye, Layers, FileWarning, Coins
} from "lucide-react";
import Navbar from "./Navbar";
import HeroNetwork from "./HeroNetwork";
import { useI18n } from "../i18n";
import Footer from "./Footer";

function Section({ id, children, className = "" }) {
  return <section id={id} className={`relative max-w-7xl mx-auto px-5 lg:px-8 ${className}`}>{children}</section>;
}

function SmallTag({ children, icon: Icon = Sparkles }) {
  return <span className="aif-chip"><Icon size={12} className="text-[#5FE3C9]"/> {children}</span>;
}

function Hero() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    // Simple fade-in on mount, no re-triggers
    const timer = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Section id="hero" className="pt-12 md:pt-20 pb-16 md:pb-24">
      <div className="grid lg:grid-cols-12 gap-10 items-center">
        <div className={`lg:col-span-6 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          <SmallTag icon={Sparkles}>{t("hero.tag")}</SmallTag>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] section-title">
            {t("hero.title")}
          </h1>
          <p className="mt-5 text-[15px] md:text-base text-[var(--aif-text-dim)] max-w-xl leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="aif-btn-primary inline-flex items-center gap-2" data-testid="hero-cta-start">
              {t("hero.cta1")} <ArrowRight size={16}/>
            </Link>
            <a href="#how" className="aif-btn-ghost inline-flex items-center gap-2" data-testid="hero-cta-how">
              {t("hero.cta2")}
            </a>
          </div>
          <p className="mt-4 text-[12px] text-[var(--aif-text-dim)] max-w-md">{t("hero.disclaimer")}</p>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            <Stat label={t("hero.stat1")} value="20+"/>
            <Stat label={t("hero.stat2")} value="9"/>
            <Stat label={t("hero.stat3")} value="IT / EN"/>
          </div>
        </div>

        <div className={`lg:col-span-6 transition-opacity duration-700 delay-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          <div className="aif-card aif-glow p-3 md:p-5">
            <HeroNetwork/>
          </div>
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
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#FFB454] mb-1">{t("trust.tag")}</div>
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

function FeaturedInStrip() {
  const { lang } = useI18n();
  const isIt = lang === "it";
  // Tasteful, generic "as featured in" categories — NOT real media logos
  // (which would be fraudulent if we don't have actual press coverage).
  // These are abstract category badges that signal "this is a real product".
  const items = [
    { tag: "AI",       label: "Artificial Intelligence" },
    { tag: "FinTech",  label: "Financial Technology" },
    { tag: "EU",       label: "GDPR Compliant" },
    { tag: "ISO 27001",label: "Security Aligned" },
    { tag: "AML",      label: "Anti-Money Laundering" },
    { tag: "Privacy",  label: "Privacy by Design" },
  ];
  return (
    <Section className="py-8 md:py-10">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--aif-text-dim)] mb-5">
          {isIt ? "Standard di settore allineati" : "Aligned with industry standards"}
        </div>
      </div>
      <div className="aif-card p-5 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {items.map((it) => (
            <div key={it.tag} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--aif-line)] bg-white/[0.015] hover:bg-white/[0.03] transition-colors">
              <span className="font-extrabold text-[13px] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF]">
                {it.tag}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--aif-text-dim)] truncate">
                {it.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ItalianContext() {
  const { t } = useI18n();
  const cards = [
    { icon: Banknote,  k: "c1" }, { icon: TrendingUp, k: "c2" },
    { icon: Bitcoin,   k: "c3" }, { icon: CreditCard, k: "c4" },
    { icon: Wallet,    k: "c5" }, { icon: FileCheck2, k: "c6" },
  ];
  return (
    <Section id="scams" className="py-16 md:py-24">
      <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
        <div>
          <SmallTag icon={Layers}>{t("context.tag")}</SmallTag>
          <h2 className="section-title mt-3">{t("context.title")}</h2>
          <p className="text-[var(--aif-text-dim)] mt-3 max-w-2xl">{t("context.body")}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="aif-card p-6 hover:border-[#5FE3C9]/40 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#5FE3C9]/20 to-[#6E8BFF]/20 border border-[var(--aif-line)] flex items-center justify-center text-[#5FE3C9]">
                <Icon size={20}/>
              </div>
              <h3 className="text-white font-semibold text-lg mt-4">{t(`context.${c.k}.t`)}</h3>
              <p className="text-[var(--aif-text-dim)] text-[13px] mt-2 leading-relaxed">{t(`context.${c.k}.d`)}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps = [t("how.s1"), t("how.s2"), t("how.s3"), t("how.s4"), t("how.s5"), t("how.s6")];
  return (
    <Section id="how" className="py-16 md:py-24">
      <div className="mb-10">
        <SmallTag icon={Network}>{t("how.tag")}</SmallTag>
        <h2 className="section-title mt-3">{t("how.title")}</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div key={i} className="aif-card p-5 relative overflow-hidden min-h-[140px]">
            <div className="absolute right-4 top-2 text-[72px] font-black text-[#5FE3C9]/10 leading-none pointer-events-none select-none">{i + 1}</div>
            <div className="relative z-10">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9] mb-2">{t("how.step")} {i + 1}</div>
              <div className="text-white font-medium">{s}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function AuthorityPath() {
  const { t } = useI18n();
  const cards = [
    { icon: Building2,   color: "#5FE3C9", k: "a1" },
    { icon: ShieldCheck, color: "#6E8BFF", k: "a2" },
    { icon: ShieldAlert, color: "#FFB454", k: "a3" },
    { icon: Coins,       color: "#5FE3C9", k: "a4" },
    { icon: CreditCard,  color: "#FF6B7A", k: "a5" },
  ];
  return (
    <Section id="reports" className="py-16 md:py-24">
      <div className="mb-10">
        <SmallTag icon={FileCheck2}>{t("auth.tag")}</SmallTag>
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
              <h3 className="text-white font-semibold text-lg mt-4">{t(`auth.${c.k}.t`)}</h3>
              <p className="text-[var(--aif-text-dim)] text-[13px] mt-2 leading-relaxed">{t(`auth.${c.k}.d`)}</p>
              <Link to="/login" className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: c.color }}>
                {t(`auth.${c.k}.b`)} <ArrowRight size={14}/>
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-[12px] text-[var(--aif-text-dim)] max-w-3xl">{t("auth.disclaimer")}</p>
    </Section>
  );
}

function TracingTeaser() {
  const { t } = useI18n();
  return (
    <Section id="tracing" className="py-16 md:py-24">
      <div className="aif-card p-6 md:p-10 relative overflow-hidden">
        <div className="aif-grid-overlay absolute inset-0 opacity-30 pointer-events-none"/>
        <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-5">
            <SmallTag icon={Network}>{t("tracing.tag")}</SmallTag>
            <h2 className="section-title mt-3">{t("tracing.title")}</h2>
            <p className="text-[var(--aif-text-dim)] mt-3 leading-relaxed">{t("tracing.body")}</p>
            <ul className="mt-5 space-y-2 text-[14px]">
              {[t("tracing.b1"), t("tracing.b2"), t("tracing.b3"), t("tracing.b4")].map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[var(--aif-text-dim)]"><CheckCircle2 size={16} className="text-[#5FE3C9] mt-0.5"/> {b}</li>
              ))}
            </ul>
            <Link to="/login" className="aif-btn-primary inline-flex items-center gap-2 mt-6">{t("tracing.cta")} <ArrowRight size={16}/></Link>
          </div>
          <div className="lg:col-span-7"><HeroNetwork animate={false}/></div>
        </div>
      </div>
    </Section>
  );
}

function ReportsGallery() {
  const { t } = useI18n();
  const reports = [
    t("reports.r1"), t("reports.r2"), t("reports.r3"),
    t("reports.r4"), t("reports.r5"), t("reports.r6"),
    t("reports.r7"), t("reports.r8"), t("reports.r9"),
  ];
  return (
    <Section className="py-16 md:py-24">
      <div className="mb-10">
        <SmallTag icon={FileCheck2}>{t("reports.tag")}</SmallTag>
        <h2 className="section-title mt-3">{t("reports.title")}</h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r} className="aif-card p-5 flex items-center gap-4 hover:border-[#5FE3C9]/40 transition">
            <div className="w-12 h-16 rounded-md bg-gradient-to-b from-[#5FE3C9]/30 to-[#6E8BFF]/30 border border-[var(--aif-line)] flex items-center justify-center">
              <FileWarning size={20} className="text-[#5FE3C9]"/>
            </div>
            <div>
              <div className="text-white font-medium">{r}</div>
              <div className="text-[11px] text-[var(--aif-text-dim)] mt-0.5">{t("reports.note")}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TrustStrip() {
  const { t, lang } = useI18n();
  const isIt = lang === "it";
  const stats = [
    { v: "256-bit", k: isIt ? "Crittografia AES" : "AES Encryption" },
    { v: "TLS 1.3", k: isIt ? "Connessione sicura" : "Secure connection" },
    { v: "GDPR",    k: isIt ? "Privacy europea" : "EU privacy" },
    { v: "24/7",    k: isIt ? "Procedure attive" : "Active procedures" },
  ];
  return (
    <Section className="py-10 md:py-14">
      <div className="aif-card p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.v} className="text-center">
            <div className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF]">{s.v}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--aif-text-dim)] mt-1">{s.k}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FAQ() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4, 5, 6, 7].map((i) => ({ q: t(`faq.q${i}`), a: t(`faq.a${i}`) }));
  const [open, setOpen] = useState(0);

  // FAQ schema (JSON-LD) — helps Google show Q&A rich snippets in search results.
  // Injected dynamically so it follows the current language.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((it) => ({
      "@type": "Question",
      "name": it.q,
      "acceptedAnswer": { "@type": "Answer", "text": it.a },
    })),
  };

  return (
    <Section id="faq" className="py-16 md:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}/>
      <div className="mb-10">
        <SmallTag icon={Eye}>{t("faq.tag")}</SmallTag>
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

function CtaBanner() {
  const { t } = useI18n();
  return (
    <Section className="py-12">
      <div className="aif-card aif-glow p-8 md:p-12 text-center relative overflow-hidden">
        <div className="aif-grid-overlay absolute inset-0 opacity-40 pointer-events-none"/>
        <div className="relative z-10">
          <SmallTag icon={Lock}>{t("cta.tag")}</SmallTag>
          <h3 className="section-title mt-3">{t("cta.title")}</h3>
          <p className="text-[var(--aif-text-dim)] mt-3 max-w-2xl mx-auto">{t("cta.body")}</p>
          <Link to="/login" className="aif-btn-primary inline-flex items-center gap-2 mt-6">{t("cta.btn")} <ArrowRight size={16}/></Link>
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
        <FeaturedInStrip/>
        <ItalianContext/>
        <HowItWorks/>
        <AuthorityPath/>
        <TracingTeaser/>
        <ReportsGallery/>
        <TrustStrip/>
        <FAQ/>
        <CtaBanner/>
        <Footer/>
      </div>
    </div>
  );
}
