// ProcedureAnimation.jsx
// =======================
// High-fidelity scanning animation.
//
// Props:
//  - startedAt:  ISO timestamp from DB (persistent mode). If provided, elapsed
//                is calculated from the real start time (server clock).
//  - duration:   total seconds for non-persistent mode (default 120)
//  - destination: destination name string
//  - locatedAmount: integer EUR
//  - onComplete(): called when the timer reaches 0 (non-persistent only)
//  - onCancel():   called when user clicks Cancel (non-persistent only)
//  - persistent:  if true, runs indefinitely using server-clock elapsed; no
//                 countdown, no completion trigger from the timer.
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Shield, Activity, Lock, Database, Network, Server, Building2,
  CreditCard, Bitcoin, AlertTriangle, CheckCircle2, X, Cpu, FileSearch
} from "lucide-react";
import { useI18n } from "../i18n";

// --- Stage map (relative to total duration) ----------------------------------
const STAGES = [
  { key: "init",          icon: Shield,        from: 0.00, to: 0.06, labelKey: "trc.s.init" },
  { key: "italian_banks", icon: Building2,     from: 0.06, to: 0.22, labelKey: "trc.s.italian_banks" },
  { key: "sepa",          icon: Network,       from: 0.22, to: 0.38, labelKey: "trc.s.sepa" },
  { key: "fintech",       icon: CreditCard,    from: 0.38, to: 0.52, labelKey: "trc.s.fintech" },
  { key: "crypto",        icon: Bitcoin,       from: 0.52, to: 0.70, labelKey: "trc.s.crypto" },
  { key: "brokers",       icon: AlertTriangle, from: 0.70, to: 0.84, labelKey: "trc.s.brokers" },
  { key: "aml",           icon: Cpu,           from: 0.84, to: 0.94, labelKey: "trc.s.aml" },
  { key: "locating",      icon: FileSearch,    from: 0.94, to: 1.00, labelKey: "trc.s.locating" },
];

// --- Italian-context databases per stage ---
// These names reflect institutions, fintech apps, exchanges, and warned
// platforms that Italian victims of online financial scams actually
// recognize — making the procedure feel real and locally relevant.
const DATABASES = {
  italian_banks: [
    // Top retail banks
    "Intesa Sanpaolo", "UniCredit", "Banco BPM", "BPER Banca",
    "Monte dei Paschi di Siena", "Credit Agricole Italia", "BNL — BNP Paribas",
    "Banca Mediolanum", "Banca Generali", "Banca Sella", "Fineco Bank",
    "Banca Popolare di Sondrio", "Banca Popolare dell'Emilia Romagna",
    "Credem", "Banca Carige", "Cariparma", "Banca Popolare di Bari",
    // Postal & cooperative
    "BancoPosta — Poste Italiane", "Iccrea Banca", "Cassa Centrale Banca",
    "BCC — Credito Cooperativo", "Banca di Bologna", "BCC Roma",
    // Online & mobile-first
    "Hype (Banca Sella)", "Webank (Banco BPM)", "Buddybank (UniCredit)",
    "Illimity Bank", "Banca Progetto", "Aidexa", "Flowe",
    "Tinaba (Banca Profilo)", "ING Italia", "CheBanca! (Mediobanca)",
    // Cards & prepaid
    "BPER Card", "Nexi Pay", "Nexi prepaid", "PostePay Evolution",
    "PostePay Standard", "PostePay Connect",
  ],
  sepa: [
    // Country IBAN clusters Italians often see in scam wires
    "DE-IBAN cluster (Frankfurt)", "DE-IBAN cluster (Berlin)",
    "LT-IBAN cluster (Vilnius)", "LT-IBAN cluster (Kaunas)",
    "MT-IBAN cluster (Valletta)", "CY-IBAN cluster (Limassol)",
    "BG-IBAN cluster (Sofia)", "EE-IBAN cluster (Tallinn)",
    "LV-IBAN cluster (Riga)", "PL-IBAN cluster (Warsaw)",
    "HU-IBAN cluster (Budapest)", "RO-IBAN cluster (Bucharest)",
    "SK-IBAN cluster (Bratislava)", "CZ-IBAN cluster (Prague)",
    "NL-IBAN cluster (Amsterdam)", "ES-IBAN cluster (Madrid)",
    "FR-IBAN cluster (Paris)", "BE-IBAN cluster (Brussels)",
    "GB-IBAN cluster (London)", "CH-IBAN cluster (Zurich)",
    "LU-IBAN cluster (Luxembourg)",
    // Settlement & clearing systems
    "Instant SEPA gateway (SCT Inst)", "TARGET2 settlement",
    "STEP2 ACH (EBA Clearing)", "TIPS — TARGET Instant Payment",
    "SWIFT gpi tracker", "SEPA Direct Debit (SDD CORE)",
    "SEPA Direct Debit (SDD B2B)",
  ],
  fintech: [
    // Mainstream Italian wallets & apps
    "PostePay Evolution", "PostePay Standard", "BancoPosta online",
    "PostePay Connect", "Postepay Digital",
    "Satispay merchant pool", "Satispay P2P", "Hype prepaid",
    "Hype Premium", "Tinaba wallet", "Flowe wallet", "Oval Money",
    "Yap (Banca Sella)", "Mooney digital", "SisalPay", "Lottomatica wallet",
    // International (heavily used in Italy)
    "Revolut IT", "Revolut <3>", "Revolut Junior",
    "Wise EUR ledger", "Wise GBP ledger", "N26 EU", "N26 You",
    "Skrill EU", "Neteller EU", "Paysafecard vouchers",
    // Money transfer corridors
    "Western Union MTCN", "MoneyGram EU corridor", "Ria Money Transfer",
    "TransferGo", "WorldRemit",
    // Card schemes / processors
    "PayPal IT", "Stripe IT", "Nexi acquiring", "SumUp IT",
    "Adyen acquiring", "Worldline", "Banca Sella POS network",
  ],
  crypto: [
    // Layer 1 / Layer 2 chains
    "Bitcoin (BTC) mempool", "Ethereum (ETH) mainnet",
    "Tron (TRC20-USDT)", "BNB Chain (BSC)", "Polygon (MATIC)",
    "Solana (SOL)", "Arbitrum L2", "Optimism L2", "Base L2",
    "Avalanche C-Chain", "zkSync Era", "Linea", "Cardano (ADA)",
    "XRP Ledger", "Litecoin (LTC)", "Bitcoin Cash (BCH)",
    // Major exchanges (where Italians often hold funds)
    "Binance hot wallets", "Kraken cluster", "Coinbase prime",
    "OKX EU", "KuCoin EU", "MEXC global", "Bitstamp", "Bitfinex",
    "Bybit EU", "ByBit OTC", "Crypto.com EU", "Gate.io",
    // Italian / EU-licensed exchanges
    "Young Platform (Italia)", "Conio", "The Rock Trading (Italia)",
    "Bitpanda IT", "Coinbar", "Coinbase Italia",
    // Mixers & privacy services (red-flag clusters)
    "Mixer cluster #4471", "ChainHopper #221", "Tornado Cash residual",
    "Wasabi CoinJoin pool", "Samourai Whirlpool",
  ],
  brokers: [
    // CONSOB-warned style names (similar to public delibere format)
    "FXOpenMarkets.io (CONSOB warned)", "TradeProElite.com (CONSOB warned)",
    "GoldenFXCapital.com (CONSOB warned)", "EuroBitBroker.net (CONSOB warned)",
    "AlphaTradePro.eu (CONSOB warned)", "InvestFastTrust.com (CONSOB warned)",
    "MaxiFundsCapital.io (CONSOB warned)", "PrimeBitTrade.io (CONSOB warned)",
    "TradingMillionaireFX.io", "ETrade-Crypto.eu",
    "WiseTradeCapital.io", "CryptoLeaderInvest.com",
    "RoyalFXMarkets.eu", "DigitalGlobalCapital.io",
    "EuroFinanceCapital.net", "GlobalCryptoInvestments.io",
    // Recovery-scam (secondary scam) platforms
    "CoinReturns.club (recovery scam)",
    "RecoveryFundsEU.org (recovery scam)",
    "BlockchainExpertsRecovery.com (recovery scam)",
    "AssetRecoveryEU.io (recovery scam)",
    "FundsBackPro.com (recovery scam)",
    "ItalyCryptoRecovery.net (recovery scam)",
    // Pig-butchering / romance investment apps
    "MetaProTrading app (pig-butchering)",
    "GlobalCoinPro app (pig-butchering)",
    "QuantumWealthApp (pig-butchering)",
  ],
  aml:  {
    en: [
      // International authorities
      "SEFIV cross-check", "SEFIV jurisdictional registry",
      "OLAF anti-fraud database", "OLAF case correlation",
      "BCE / ECB payment rails registry", "BCE supervisory data feed",
      "Blockchain forensic graph", "Blockchain cluster correlation",
      "ESMA supervisory cross-check", "ESMA warned-firms registry",
      "FINRA disciplinary records", "FINRA broker check",
      "S.F.O. financial-crime intelligence", "S.F.O. cross-border watchlist",
      "OFAC sanctions list", "EU consolidated sanctions list",
      "FATF high-risk jurisdictions", "GAFI grey list",
      "Chainalysis KYT cluster", "TRM Labs forensic graph",
      "Elliptic risk score", "AMLD6 reporting node",
      "EUROPOL fraud cluster", "INTERPOL bulletins",
      "Egmont Group FIU exchange",
      // Italian authorities & registries
      "Banca d'Italia UIF reports (public summaries)",
      "Banca d'Italia Centrale Allarme Interbancaria (CAI)",
      "CONSOB warning list (offerte abusive)",
      "OAM register (cambiavalute & money transfer)",
      "IVASS insurance fraud register",
      "Guardia di Finanza Nucleo Speciale Polizia Valutaria",
      "DIA — Direzione Investigativa Antimafia",
      "Polizia Postale CNAIPIC database",
      "AGID PEC trust list",
      "ABI — Associazione Bancaria Italiana fraud feed",
      "Agenzia delle Entrate anti-fraud cluster",
      // AML patterns
      "AML pattern: pig-butchering", "AML pattern: layering",
      "AML pattern: smurfing", "AML pattern: mule cluster",
      "AML pattern: trade-based laundering",
    ],
    it: [
      // Autorità internazionali
      "Controllo SEFIV", "Registro giurisdizionale SEFIV",
      "Database antifrode OLAF", "Correlazione casi OLAF",
      "Registro circuiti di pagamento BCE", "Flusso dati supervisione BCE",
      "Grafo forense blockchain", "Correlazione cluster blockchain",
      "Controllo supervisione ESMA", "Registro società segnalate ESMA",
      "Archivio disciplinare FINRA", "Verifica broker FINRA",
      "Intelligence crimini finanziari S.F.O.", "Watchlist transfrontaliera S.F.O.",
      "Lista sanzioni OFAC", "Lista consolidata sanzioni UE",
      "Giurisdizioni ad alto rischio FATF", "Lista grigia GAFI",
      "Cluster KYT Chainalysis", "Grafo forense TRM Labs",
      "Punteggio di rischio Elliptic", "Nodo di reporting AMLD6",
      "Cluster frodi EUROPOL", "Bollettini INTERPOL",
      "Egmont Group — scambio UIF",
      // Autorità e registri italiani
      "Report UIF Banca d'Italia (sintesi pubbliche)",
      "Centrale Allarme Interbancaria (CAI) — Banca d'Italia",
      "Lista CONSOB offerte abusive (delibere)",
      "Registro OAM cambiavalute & money transfer",
      "Registro frodi IVASS",
      "Guardia di Finanza — Nucleo Speciale Polizia Valutaria",
      "DIA — Direzione Investigativa Antimafia",
      "Database Polizia Postale CNAIPIC",
      "Lista PEC certificate AGID",
      "Feed antifrode ABI — Associazione Bancaria Italiana",
      "Cluster antifrode Agenzia delle Entrate",
      // Pattern AML
      "Pattern AML: pig-butchering", "Pattern AML: stratificazione",
      "Pattern AML: smurfing", "Pattern AML: cluster di prestanome",
      "Pattern AML: trade-based laundering",
    ],
  },
  locating: {
    en: [
      "Cross-correlating final cluster…", "Ranking exposure scores…",
      "Validating IBAN/Wallet match…", "Decrypting destination ID…",
      "Generating recovery vector…", "Sealing case dossier…",
    ],
    it: [
      "Correlazione finale del cluster…", "Calcolo punteggi di esposizione…",
      "Validazione corrispondenza IBAN/Wallet…", "Decrittazione ID destinazione…",
      "Generazione vettore di recupero…", "Sigillatura dossier del caso…",
    ],
  },
  init: {
    en: [
      "Generating session UUID…", "Negotiating TLS 1.3…",
      "Loading forensic agents…", "Verifying integrity hashes…",
      "Mounting encrypted volumes…",
    ],
    it: [
      "Generazione UUID di sessione…", "Negoziazione TLS 1.3…",
      "Caricamento agenti forensi…", "Verifica hash di integrità…",
      "Montaggio volumi crittografati…",
    ],
  },
};

// Stage-key labels in the log header (the "SCANSIONE :: XXX" line)
const STAGE_KEY_LABEL = {
  en: { init: "INIT", italian_banks: "BANKS", sepa: "SEPA", fintech: "FINTECH", crypto: "CRYPTO", brokers: "BROKERS", aml: "AML", locating: "CORE" },
  it: { init: "AVVIO", italian_banks: "BANCHE", sepa: "SEPA", fintech: "FINTECH", crypto: "CRYPTO", brokers: "BROKER", aml: "AML", locating: "CORE" },
};

// Status-word & prefix translations
const STATUS_I18N = {
  en: { scanned: "scanned", clean: "clean", ok: "ok", flagged: "FLAGGED", suspect: "SUSPECT", tainted: "TAINTED", match: "match", acct: "acct", txn: "txn", tx: "tx", exposure: "exposure", cluster_score: "cluster_score" },
  it: { scanned: "scansionato", clean: "pulito", ok: "ok", flagged: "SEGNALATO", suspect: "SOSPETTO", tainted: "COMPROMESSO", match: "match", acct: "conto", txn: "txn", tx: "tx", exposure: "esposizione", cluster_score: "punteggio_cluster" },
};
const PREFIX_I18N = {
  en: { BANK: "BANK", SEPA: "SEPA", FINTECH: "FINTECH", CHAIN: "CHAIN", BROKER: "BROKER", AML: "AML", CORE: "CORE", INIT: "INIT" },
  it: { BANK: "BANCA", SEPA: "SEPA", FINTECH: "FINTECH", CHAIN: "CHAIN", BROKER: "BROKER", AML: "AML", CORE: "CORE", INIT: "INIT" },
};

function _hex(len) {
  const c = "abcdef0123456789";
  let s = "0x"; for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * 16)];
  return s;
}
function _iban() {
  const cc = ["IT","DE","LT","MT","CY","BG","NL","ES"][Math.floor(Math.random() * 8)];
  let s = cc + String(Math.floor(Math.random() * 100)).padStart(2, "0");
  for (let i = 0; i < 22; i++) s += "0123456789"[Math.floor(Math.random() * 10)];
  return s;
}
function _line(stageKey, lang = "it") {
  const r = Math.random();
  const S = STATUS_I18N[lang] || STATUS_I18N.it;
  const P = PREFIX_I18N[lang] || PREFIX_I18N.it;
  // Generic log lines — no specific bank/wallet names shown to client
  const nodeId = () => `NODE-${Math.floor(Math.random() * 9000 + 1000)}`;
  const refId = () => _hex(8).slice(2).toUpperCase();
  if (stageKey === "italian_banks") {
    return `[${P.BANK}] ${nodeId()}  ·  ${S.acct}=${_iban().slice(0, 18)}…  ${S.match}=${r < 0.07 ? S.flagged : S.clean}`;
  }
  if (stageKey === "sepa") {
    return `[${P.SEPA}] CLUSTER-${refId()}  ·  ${_iban()}  ·  ref=${refId()}`;
  }
  if (stageKey === "fintech") {
    return `[${P.FINTECH}] INST-${refId()}  ·  ${S.txn}=${_hex(10).slice(2)}  ·  ${r < 0.1 ? S.suspect : S.ok}`;
  }
  if (stageKey === "crypto") {
    return `[${P.CHAIN}] WALLET-${refId()}  ·  ${S.tx} ${_hex(20)}…  ·  ${r < 0.08 ? S.tainted : S.scanned}`;
  }
  if (stageKey === "brokers") {
    return `[${P.BROKER}] ENTITY-${refId()}  ·  ${S.exposure}=${(Math.random() * 100).toFixed(1)}%`;
  }
  if (stageKey === "aml") {
    const ds = DATABASES.aml[lang] || DATABASES.aml.it;
    return `[${P.AML}] ${ds[Math.floor(Math.random() * ds.length)]}  ·  ${S.cluster_score}=${(Math.random()).toFixed(3)}`;
  }
  if (stageKey === "locating") {
    const ds = DATABASES.locating[lang] || DATABASES.locating.it;
    return `[${P.CORE}] ${ds[Math.floor(Math.random() * ds.length)]}`;
  }
  const ds = DATABASES.init[lang] || DATABASES.init.it;
  return `[${P.INIT}] ${ds[Math.floor(Math.random() * ds.length)]}`;
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, Math.floor(seconds % 60));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// =============================================================================
export default function ProcedureAnimation({ duration = 120, startedAt, destination, locatedAmount, onComplete, onCancel, persistent = false }) {
  const { t, lang } = useI18n();
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState([]);
  const [matches, setMatches] = useState(0);
  const [records, setRecords] = useState(0);
  const startedRef = useRef(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    if (persistent && startedAt) {
      const serverStart = new Date(startedAt).getTime();
      const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - serverStart) / 1000)));
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    } else {
      const id = setInterval(() => {
        const e = (Date.now() - startedRef.current) / 1000;
        if (e >= duration) {
          setElapsed(duration);
          if (!completedRef.current) {
            completedRef.current = true;
            clearInterval(id);
            onComplete && onComplete();
          }
        } else {
          setElapsed(e);
        }
      }, 250);
      return () => clearInterval(id);
    }
  }, [duration, onComplete, persistent, startedAt]);

  // Stage based on elapsed: in persistent mode, cycle every 2 minutes
  const t01 = persistent
    ? ((elapsed % 120) / 120)
    : Math.min(1, elapsed / duration);

  const stage = useMemo(() => STAGES.find(s => t01 >= s.from && t01 < s.to) || STAGES[STAGES.length - 1], [t01]);
  const stageProgress = (t01 - stage.from) / Math.max(0.0001, (stage.to - stage.from));

  // Log/records generator — tied to stage.
  useEffect(() => {
    const VISIBLE = 8;
    const FADE_OUT_MS = 450;
    const id = setInterval(() => {
      setLogs(prev => {
        const next = [...prev, { id: Math.random(), text: _line(stage.key, lang), leaving: false }];
        const overflow = next.length - VISIBLE;
        if (overflow > 0) {
          for (let i = 0; i < overflow; i++) {
            if (!next[i].leaving) next[i] = { ...next[i], leaving: true };
          }
        }
        return next.slice(-(VISIBLE + 4));
      });
      setTimeout(() => {
        setLogs(prev => prev.filter((l) => !l.leaving));
      }, FADE_OUT_MS);
      setRecords(r => r + Math.floor(Math.random() * 42 + 8));
      if (Math.random() < 0.13) setMatches(m => m + 1);
    }, 600);
    return () => clearInterval(id);
  }, [stage.key, lang]);

  const StageIcon = stage.icon;
  const remaining = Math.max(0, duration - elapsed);
  const progressPct = persistent
    ? Math.round((elapsed % 120) / 120 * 100)
    : Math.round(t01 * 100);

  return (
    <div className="aif-card aif-glow p-4 sm:p-6 md:p-9 lg:p-10 relative overflow-hidden mx-auto max-w-[1600px]" data-testid="procedure-animation">
      <div className="aif-grid-overlay absolute inset-0 opacity-40 pointer-events-none"/>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap relative z-10">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-[#5FE3C9] opacity-20"/>
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#0E1A36] border border-[#5FE3C9]/40 flex items-center justify-center text-[#5FE3C9]">
              <StageIcon size={18} className="sm:hidden"/>
              <StageIcon size={22} className="hidden sm:block"/>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] sm:text-[12px] uppercase tracking-[0.08em] sm:tracking-[0.22em] text-[#9FB0CC] leading-tight break-words">{t("trc.title")}</div>
            <div className="text-white font-bold text-[15px] sm:text-xl md:text-2xl mt-0.5 truncate">{t(stage.labelKey)}</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="aif-chip text-[10px] sm:text-[11px]"><Lock size={12}/> AES-256</div>
        </div>
        {!persistent && onCancel && (
          <button onClick={onCancel} className="text-[var(--aif-text-dim)] hover:text-[#FF6B7A] p-2 shrink-0" title={t("trc.cancel")} data-testid="proc-cancel">
            <X size={18}/>
          </button>
        )}
      </div>

      {/* Time & progress */}
      {!persistent ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-7 relative z-10">
          <TimeBox label={t("trc.elapsed")} value={fmtTime(elapsed)}/>
          <TimeBox label={t("trc.remaining")} value={fmtTime(remaining)} highlight/>
          <TimeBox label={t("trc.progress")} value={`${progressPct}%`}/>
        </div>
      ) : (
        <div className="mt-7 relative z-10 flex items-center justify-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#4ADE80] aif-pulse"/>
          <span className="text-[12px] text-[#5FE3C9] font-medium uppercase tracking-[0.15em]">
            {t("trc.scanning")} · LIVE
          </span>
        </div>
      )}

      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden mt-5 relative z-10">
        <div className="h-full bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF] transition-all duration-200" style={{ width: `${progressPct}%` }}/>
      </div>

      {/* Stages strip */}
      <div className="grid grid-cols-8 gap-1.5 mt-3 relative z-10">
        {STAGES.map((s, i) => (
          <div key={s.key} className={`h-1.5 rounded-full transition-all ${t01 >= s.to ? "bg-[#5FE3C9]" : t01 >= s.from ? "bg-[#5FE3C9]/50" : "bg-white/5"}`}/>
        ))}
      </div>

      {/* Body — split: scan visual + logs */}
      <div className="grid lg:grid-cols-5 gap-4 lg:gap-5 mt-7 relative z-10">
        <div className="lg:col-span-2 aif-card !rounded-xl p-4 sm:p-5 min-h-[300px] lg:min-h-[400px] relative overflow-hidden">
          <ScanVisual stage={stage.key} stageProgress={stageProgress} zoneLabel={t("trc.secure_zone")}/>
          <div className="mt-4 flex items-center justify-between gap-2 text-[11px] sm:text-[12.5px] text-[var(--aif-text-dim)]">
            <span><Server size={12} className="inline -mt-0.5 mr-1"/> {t("trc.records")}: <span className="text-white font-semibold">{records.toLocaleString("it-IT")}</span></span>
            <span><Database size={12} className="inline -mt-0.5 mr-1"/> {t("trc.matches")}: <span className="text-[#FFB454] font-semibold">{matches}</span></span>
          </div>
        </div>

        <div className="lg:col-span-3 aif-card !rounded-xl p-3 sm:p-4 min-h-[280px] lg:min-h-[400px] font-mono text-[11.5px] sm:text-[13px] leading-relaxed overflow-hidden">
          <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.22em] text-[var(--aif-text-dim)] mb-3 px-1">
            <span>{t("trc.scanning")} :: {(STAGE_KEY_LABEL[lang] || STAGE_KEY_LABEL.it)[stage.key] || stage.key}</span>
            <span className="aif-pulse">●</span>
          </div>
          <div className="space-y-1.5">
            {logs.map((l) => (
              <div key={l.id} className={`text-[#9FE6D2] truncate ${l.leaving ? "aif-log-out" : "aif-log-fade"}`}>
                {l.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer — only shown in non-persistent mode */}
      {!persistent && (
        <div className="mt-6 text-[12px] text-[var(--aif-text-dim)] text-center relative z-10 flex items-center justify-center gap-2">
          <Lock size={12}/> {t("trc.disclaimer")}
        </div>
      )}
    </div>
  );
}

function TimeBox({ label, value, highlight = false }) {
  return (
    <div className={`aif-card !rounded-xl p-3 sm:p-4 ${highlight ? "!border-[#5FE3C9]" : ""}`}>
      <div className="text-[9px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[var(--aif-text-dim)]">{label}</div>
      <div className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tabular-nums mt-1 ${highlight ? "text-[#5FE3C9]" : "text-white"}`}>{value}</div>
    </div>
  );
}

// === Scan visual: rotating radar + animated nodes ===========================
const ScanVisual = React.memo(function ScanVisual({ stage, stageProgress, zoneLabel }) {
  // Radar sweep + scattered points changing per stage
  const points = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      r: 22 + Math.random() * 60,
      a: Math.random() * Math.PI * 2,
      hot: Math.random() < 0.18,
      key: `${stage}-${i}`,
    }));
  }, [stage]);

  return (
    <div className="relative w-full h-[280px] md:h-[320px]">
      <svg viewBox="0 0 220 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="radar-bg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#5FE3C9" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#5FE3C9" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="sweep" x1="0" x2="1">
            <stop offset="0" stopColor="#5FE3C9" stopOpacity="0"/>
            <stop offset="1" stopColor="#5FE3C9" stopOpacity="0.7"/>
          </linearGradient>
        </defs>

        <circle cx="110" cy="100" r="86" fill="url(#radar-bg)"/>
        {[20, 40, 60, 80].map(r => (
          <circle key={r} cx="110" cy="100" r={r} fill="none" stroke="rgba(120,160,230,0.18)" strokeWidth="1"/>
        ))}
        <line x1="20" y1="100" x2="200" y2="100" stroke="rgba(120,160,230,0.12)"/>
        <line x1="110" y1="20" x2="110" y2="180" stroke="rgba(120,160,230,0.12)"/>

        {/* sweep beam — slowed for calmer feel */}
        <g style={{ transformOrigin: "110px 100px" }}>
          <g style={{ animation: "aif-sweep 5.5s linear infinite" }}>
            <path d="M 110 100 L 196 100 A 86 86 0 0 0 168 41 Z" fill="url(#sweep)" opacity="0.85"/>
          </g>
        </g>

        {/* points */}
        {points.map(p => {
          const cx = 110 + Math.cos(p.a) * p.r;
          const cy = 100 + Math.sin(p.a) * p.r;
          return (
            <g key={p.key}>
              <circle cx={cx} cy={cy} r={p.hot ? 3.4 : 2.2} fill={p.hot ? "#FFB454" : "#5FE3C9"} className={p.hot ? "aif-pulse" : ""}/>
              {p.hot && <circle cx={cx} cy={cy} r="6" fill="none" stroke="#FFB454" strokeWidth="1" opacity="0.6"/>}
            </g>
          );
        })}

        <text x="110" y="194" textAnchor="middle" fontSize="9" fill="#9FB0CC" letterSpacing="0.2em">{(zoneLabel || "SECURE SCAN ZONE").toUpperCase()}</text>
      </svg>

      <style>{`@keyframes aif-sweep { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
      <style>{`.aif-card .aif-pulse { animation-duration: 3.6s !important; }`}</style>
    </div>
  );
});
