// Lightweight i18n (no external dependency complexity).
// Provides t(key) and toggle between IT (default) and EN.
import React, { createContext, useContext, useEffect, useState } from "react";

const dict = {
  it: {
    "nav.how": "Come funziona",
    "nav.scams": "Truffe supportate",
    "nav.tracing": "Tracciamento fondi",
    "nav.reports": "Report",
    "nav.faq": "FAQ",
    "nav.start": "Inizia ora",
    "nav.login": "Accedi",
    "nav.register": "Registrati",
    "nav.logout": "Esci",
    "nav.dashboard": "Dashboard",

    "hero.tag": "AI-assisted fund tracing • Italia",
    "hero.title": "Traccia, organizza e prepara il tuo caso dopo una truffa online.",
    "hero.subtitle": "AI-FUNDS aiuta vittime italiane di truffe Forex, crypto, bonifici SEPA, PostePay, BancoPosta, carte e pagamenti online a creare un dossier professionale con timeline, transazioni, prove e report per banca, exchange, CONSOB, Polizia Postale e consulenti legali.",
    "hero.cta1": "Inizia Tracciamento Fondi",
    "hero.cta2": "Scopri Come Funziona",
    "hero.disclaimer": "Analisi preliminare basata sulle informazioni fornite dall'utente. Il recupero dei fondi non è garantito.",

    "trust.title": "Attenzione alle truffe di recupero fondi",
    "trust.body": "Molte vittime vengono ricontattate da falsi avvocati, falsi broker, falsi funzionari o presunti esperti blockchain che promettono il recupero del denaro in cambio di tasse, commissioni AML, gas fee, certificati o costi di sblocco.",
    "trust.never": "AI-FUNDS non ti chiederà mai seed phrase, private key, password bancarie, codici OTP o pagamenti per 'sbloccare' fondi.",

    "context.title": "Costruito per il contesto italiano",
    "context.body": "AI-FUNDS organizza il tuo caso secondo le informazioni normalmente richieste da banche, provider di pagamento, exchange crypto, CONSOB, Polizia Postale e professionisti legali. Ti aiuta a preparare timeline, ricevute, IBAN, CRO/TRN, wallet address, transaction hash, screenshot, chat e report chiari.",

    "how.title": "Come funziona",
    "how.s1": "Racconta cosa è successo",
    "how.s2": "Inserisci pagamenti, IBAN, wallet, ricevute e prove",
    "how.s3": "L'AI costruisce una timeline del caso",
    "how.s4": "Il sistema visualizza il possibile percorso dei fondi",
    "how.s5": "Vengono rilevati red flag e urgenze",
    "how.s6": "Genera report professionali per banca, exchange, CONSOB, Polizia Postale o legale",

    "scams.title": "Truffe supportate",
    "scams.subtitle": "Una piattaforma costruita su scenari reali del contesto italiano.",

    "auth.title": "Percorso Italiano: Banca, CONSOB, Polizia Postale",
    "auth.disclaimer": "AI-FUNDS non è affiliato a CONSOB, Banca d'Italia, Polizia Postale, Poste Italiane, banche, exchange o autorità pubbliche. La piattaforma aiuta a organizzare informazioni e report, ma non fornisce consulenza legale e non garantisce il recupero.",

    "tracing.title": "Tracciamento fondi visuale e intelligente",
    "tracing.body": "Visualizza il possibile percorso dei fondi, collega transazioni, wallet, IBAN, ricevute e prove, e crea uno schema chiaro del caso.",

    "reports.title": "Report professionali generati dal tuo caso",

    "faq.title": "Domande frequenti",

    "footer.warn": "Non inserire seed phrase, private key, password bancarie o codici OTP.",
    "footer.disclaimer": "AI-FUNDS non garantisce il recupero dei fondi e non fornisce consulenza legale.",

    "wizard.title": "Analisi Caso",
    "wizard.next": "Avanti",
    "wizard.prev": "Indietro",
    "wizard.start_tracing": "Avvia Tracciamento",
    "wizard.s1": "Tipologia di truffa",
    "wizard.s2": "Vittima e perdita",
    "wizard.s3": "Dettagli pagamento",
    "wizard.s4": "Prove",
    "wizard.s5": "Tracciamento live",
    "wizard.s6": "Dashboard caso",
  },
  en: {
    "nav.how": "How it works",
    "nav.scams": "Supported scams",
    "nav.tracing": "Fund tracing",
    "nav.reports": "Reports",
    "nav.faq": "FAQ",
    "nav.start": "Get started",
    "nav.login": "Sign in",
    "nav.register": "Sign up",
    "nav.logout": "Sign out",
    "nav.dashboard": "Dashboard",

    "hero.tag": "AI-assisted fund tracing • Italy",
    "hero.title": "Trace, organize and prepare your case after an online scam.",
    "hero.subtitle": "AI-FUNDS helps Italian victims of Forex, crypto, SEPA, PostePay, BancoPosta, card and online payment scams build a professional dossier with timeline, transactions, evidence and reports for banks, exchanges, CONSOB, Polizia Postale and legal professionals.",
    "hero.cta1": "Start Fund Tracing",
    "hero.cta2": "How it works",
    "hero.disclaimer": "Preliminary analysis based on user-provided information. Fund recovery is not guaranteed.",

    "trust.title": "Beware of recovery scams",
    "trust.body": "Many victims are contacted again by fake lawyers, brokers, officials or self-claimed blockchain experts promising recovery in exchange for taxes, AML fees, gas, certificates or unlock costs.",
    "trust.never": "AI-FUNDS will never ask you for a seed phrase, private key, banking password, OTP code or any payment to 'unlock' funds.",

    "context.title": "Built for the Italian context",
    "context.body": "AI-FUNDS organizes your case using the information typically required by banks, payment providers, crypto exchanges, CONSOB, Polizia Postale and legal professionals.",

    "how.title": "How it works",
    "how.s1": "Tell us what happened",
    "how.s2": "Add payments, IBAN, wallets, receipts and evidence",
    "how.s3": "The AI builds a clear case timeline",
    "how.s4": "The system visualizes the possible fund path",
    "how.s5": "Red flags and urgency signals are detected",
    "how.s6": "Generate professional reports for bank, exchange, CONSOB, Polizia Postale or your lawyer",

    "scams.title": "Supported scam types",
    "scams.subtitle": "Built on real Italian-context scenarios.",

    "auth.title": "Italian path: Bank, CONSOB, Polizia Postale",
    "auth.disclaimer": "AI-FUNDS is not affiliated with CONSOB, Banca d'Italia, Polizia Postale, Poste Italiane, banks, exchanges or public authorities. We help you organize information and reports — we do not provide legal advice and do not guarantee recovery.",

    "tracing.title": "Visual, intelligent fund tracing",
    "tracing.body": "Visualize the possible fund path, link transactions, wallets, IBANs, receipts and evidence into a clear case map.",

    "reports.title": "Professional reports generated from your case",

    "faq.title": "Frequently asked questions",

    "footer.warn": "Never enter a seed phrase, private key, banking password or OTP code.",
    "footer.disclaimer": "AI-FUNDS does not guarantee fund recovery and does not provide legal advice.",

    "wizard.title": "Case Analysis",
    "wizard.next": "Next",
    "wizard.prev": "Back",
    "wizard.start_tracing": "Start Tracing",
    "wizard.s1": "Scam type",
    "wizard.s2": "Victim and loss",
    "wizard.s3": "Payment details",
    "wizard.s4": "Evidence",
    "wizard.s5": "Live tracing",
    "wizard.s6": "Case dashboard",
  },
};

const Ctx = createContext({ lang: "it", t: (k) => k, setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("aif_lang") || "it");
  useEffect(() => { localStorage.setItem("aif_lang", lang); }, [lang]);
  const t = (k) => (dict[lang] && dict[lang][k]) || (dict.it[k]) || k;
  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
