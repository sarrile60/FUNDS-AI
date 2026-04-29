// ProcedureAnimation.jsx
// =======================
// 2-minute (120 seconds) high-fidelity scanning animation.
// Shows live MM:SS countdown, progress bar, rolling stage labels,
// scrolling fake "scanned record" logs, an animated graph visual,
// and at the end reveals the destination assigned to the user.
//
// Props:
//  - duration:  total seconds (default 120)
//  - destination: "chiantin_bank" | "zenthos_wallet"
//  - locatedAmount: integer EUR
//  - onComplete(): called when the timer reaches 0
//  - onCancel():   called when user clicks Cancel
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

// --- Italian-context databases per stage --------------------------------------
const DATABASES = {
  italian_banks: [
    "Intesa Sanpaolo", "UniCredit", "BPER Banca", "Banco BPM", "Mediolanum",
    "Banca Sella", "Fineco Bank", "Crédit Agricole Italia", "Monte dei Paschi",
    "Banca Popolare di Sondrio", "Credem", "BNL", "Cariparma", "Iccrea",
    "Cassa Centrale Banca", "Banca Generali", "Banca Mediolanum", "Webank",
    "Hype", "Illimity Bank", "BPER Card", "BancoPosta", "Poste Italiane",
  ],
  sepa: [
    "DE-IBAN cluster (Frankfurt)", "LT-IBAN cluster (Vilnius)",
    "MT-IBAN cluster (Valletta)", "CY-IBAN cluster (Limassol)",
    "BG-IBAN cluster (Sofia)", "EE-IBAN cluster (Tallinn)",
    "LV-IBAN cluster (Riga)", "PL-IBAN cluster (Warsaw)",
    "HU-IBAN cluster (Budapest)", "RO-IBAN cluster (Bucharest)",
    "NL-IBAN cluster (Amsterdam)", "ES-IBAN cluster (Madrid)",
    "Instant SEPA gateway", "TARGET2 settlement", "STEP2 ACH",
  ],
  fintech: [
    "PostePay Evolution", "PostePay Standard", "BancoPosta online",
    "Revolut IT", "Revolut <3>", "Wise EUR ledger", "N26 EU",
    "Satispay merchant pool", "Hype prepaid", "Mooney digital",
    "SisalPay", "Skrill EU", "Neteller EU", "Paysafecard vouchers",
    "Western Union MTCN", "MoneyGram EU corridor", "PayPal IT",
  ],
  crypto: [
    "Bitcoin (BTC) mempool", "Ethereum (ETH) mainnet", "Tron (TRC20-USDT)",
    "BNB Chain (BSC)", "Polygon (MATIC)", "Solana (SOL)",
    "Arbitrum L2", "Optimism L2", "Base L2", "Avalanche C-Chain",
    "Binance hot wallets", "Kraken cluster", "Coinbase prime",
    "OKX EU", "KuCoin EU", "MEXC global", "Bitstamp", "Bitfinex",
    "Bybit EU", "ByBit OTC", "Mixer cluster #4471", "ChainHopper #221",
  ],
  brokers: [
    "FXOpenMarkets.io (CONSOB warned)", "TradeProElite.com (CONSOB warned)",
    "GoldenFXCapital.com", "EuroBitBroker.net", "AlphaTradePro.eu",
    "InvestFastTrust.com", "MaxiFundsCapital.io", "PrimeBitTrade.io",
    "CoinReturns.club", "RecoveryFundsEU.org (recovery scam)",
    "BlockchainExpertsRecovery.com (recovery scam)",
    "TradingMillionaireFX.io", "ETrade-Crypto.eu",
  ],
  aml:  [
    "SEFIV cross-check", "SEFIV jurisdictional registry",
    "OLAF anti-fraud database", "OLAF case correlation",
    "BCE / ECB payment rails registry", "BCE supervisory data feed",
    "Blockchain forensic graph", "Blockchain cluster correlation",
    "ESMA supervisory cross-check", "ESMA warned-firms registry",
    "FINRA disciplinary records", "FINRA broker check",
    "S.F.O. financial-crime intelligence", "S.F.O. cross-border watchlist",
    "OFAC sanctions list", "EU consolidated list",
    "FATF high-risk jurisdictions", "Chainalysis KYT cluster",
    "TRM Labs forensic graph", "Elliptic risk score",
    "GAFI grey list", "AMLD6 reporting node",
    "Banca d'Italia UIF reports (public summaries)",
    "EUROPOL fraud cluster", "INTERPOL bulletins",
    "AML pattern: pig-butchering", "AML pattern: layering",
    "AML pattern: smurfing", "AML pattern: mule cluster",
  ],
  locating: [
    "Cross-correlating final cluster…", "Ranking exposure scores…",
    "Validating IBAN/Wallet match…", "Decrypting destination ID…",
    "Generating recovery vector…", "Sealing case dossier…",
  ],
  init: [
    "Generating session UUID…", "Negotiating TLS 1.3…",
    "Loading forensic agents…", "Verifying integrity hashes…",
    "Mounting encrypted volumes…",
  ],
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
function _line(stageKey) {
  const r = Math.random();
  if (stageKey === "italian_banks") {
    const ds = DATABASES.italian_banks;
    const item = ds[Math.floor(Math.random() * ds.length)];
    return `[BANK] ${item}  ·  acct=${_iban().slice(0, 18)}…  match=${r < 0.07 ? "FLAGGED" : "clean"}`;
  }
  if (stageKey === "sepa") {
    const ds = DATABASES.sepa;
    return `[SEPA] ${ds[Math.floor(Math.random() * ds.length)]}  ·  ${_iban()}  ·  €${Math.floor(Math.random() * 90000 + 1000)}`;
  }
  if (stageKey === "fintech") {
    const ds = DATABASES.fintech;
    return `[FINTECH] ${ds[Math.floor(Math.random() * ds.length)]}  ·  txn=${_hex(10).slice(2)}  ·  ${r < 0.1 ? "SUSPECT" : "ok"}`;
  }
  if (stageKey === "crypto") {
    const ds = DATABASES.crypto;
    return `[CHAIN] ${ds[Math.floor(Math.random() * ds.length)]}  ·  tx ${_hex(20)}…  ·  ${r < 0.08 ? "TAINTED" : "scanned"}`;
  }
  if (stageKey === "brokers") {
    const ds = DATABASES.brokers;
    return `[BROKER] ${ds[Math.floor(Math.random() * ds.length)]}  ·  exposure=${(Math.random() * 100).toFixed(1)}%`;
  }
  if (stageKey === "aml") {
    const ds = DATABASES.aml;
    return `[AML] ${ds[Math.floor(Math.random() * ds.length)]}  ·  cluster_score=${(Math.random()).toFixed(3)}`;
  }
  if (stageKey === "locating") {
    const ds = DATABASES.locating;
    return `[CORE] ${ds[Math.floor(Math.random() * ds.length)]}`;
  }
  const ds = DATABASES.init;
  return `[INIT] ${ds[Math.floor(Math.random() * ds.length)]}`;
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, Math.floor(seconds % 60));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// =============================================================================
export default function ProcedureAnimation({ duration = 120, destination, locatedAmount, onComplete, onCancel }) {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState(0);   // seconds
  const [logs, setLogs] = useState([]);
  const [matches, setMatches] = useState(0);
  const [records, setRecords] = useState(0);
  const startedRef = useRef(Date.now());
  const completedRef = useRef(false);

  // Tick every 250ms — smooth enough for a per-second timer, ~4× fewer re-renders than 100ms.
  useEffect(() => {
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
  }, [duration, onComplete]);

  // Stage based on elapsed
  const t01 = Math.min(1, elapsed / duration);
  const stage = useMemo(() => STAGES.find(s => t01 >= s.from && t01 < s.to) || STAGES[STAGES.length - 1], [t01]);
  const stageProgress = (t01 - stage.from) / Math.max(0.0001, (stage.to - stage.from));

  // Log/records generator — tied to stage. Slower pace for a calmer feel.
  useEffect(() => {
    const id = setInterval(() => {
      setLogs(prev => {
        const next = [...prev, { id: Math.random(), text: _line(stage.key), ts: Date.now() }];
        // keep last 8 lines (was 12) — fewer DOM nodes, less paint cost
        return next.slice(-8);
      });
      setRecords(r => r + Math.floor(Math.random() * 42 + 8));
      if (Math.random() < 0.13) setMatches(m => m + 1);
    }, 600);
    return () => clearInterval(id);
  }, [stage.key]);

  const StageIcon = stage.icon;
  const remaining = Math.max(0, duration - elapsed);
  const progressPct = Math.round(t01 * 100);
  const destLabel = destination === "zenthos_wallet" ? t("trc.dest.zenthos_wallet") : t("trc.dest.chiantin_bank");

  return (
    <div className="aif-card aif-glow p-6 md:p-9 lg:p-10 relative overflow-hidden mx-auto max-w-[1600px]" data-testid="procedure-animation">
      <div className="aif-grid-overlay absolute inset-0 opacity-40 pointer-events-none"/>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#5FE3C9] opacity-20"/>
            <div className="relative w-14 h-14 rounded-full bg-[#0E1A36] border border-[#5FE3C9]/40 flex items-center justify-center text-[#5FE3C9]">
              <StageIcon size={26}/>
            </div>
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-[#9FB0CC]">{t("trc.title")}</div>
            <div className="text-white font-bold text-xl md:text-2xl mt-0.5">{t(stage.labelKey)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="aif-chip text-[11px]"><Lock size={12}/> AES-256</div>
          <div className="aif-chip text-[11px]"><Activity size={12}/> {t("trc.do_not_close")}</div>
          <button onClick={onCancel} className="text-[var(--aif-text-dim)] hover:text-[#FF6B7A] p-2" title={t("trc.cancel")} data-testid="proc-cancel">
            <X size={18}/>
          </button>
        </div>
      </div>

      {/* Time & progress */}
      <div className="grid sm:grid-cols-3 gap-4 mt-7 relative z-10">
        <TimeBox label={t("trc.elapsed")} value={fmtTime(elapsed)}/>
        <TimeBox label={t("trc.remaining")} value={fmtTime(remaining)} highlight/>
        <TimeBox label={t("trc.progress")} value={`${progressPct}%`}/>
      </div>

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
      <div className="grid lg:grid-cols-5 gap-5 mt-7 relative z-10">
        <div className="lg:col-span-2 aif-card !rounded-xl p-5 min-h-[400px] relative overflow-hidden">
          <ScanVisual stage={stage.key} stageProgress={stageProgress}/>
          <div className="mt-4 flex items-center justify-between gap-2 text-[12.5px] text-[var(--aif-text-dim)]">
            <span><Server size={12} className="inline -mt-0.5 mr-1"/> {t("trc.records")}: <span className="text-white font-semibold">{records.toLocaleString("it-IT")}</span></span>
            <span><Database size={12} className="inline -mt-0.5 mr-1"/> {t("trc.matches")}: <span className="text-[#FFB454] font-semibold">{matches}</span></span>
          </div>
        </div>

        <div className="lg:col-span-3 aif-card !rounded-xl p-4 min-h-[400px] font-mono text-[13px] leading-relaxed overflow-hidden">
          <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.22em] text-[var(--aif-text-dim)] mb-3 px-1">
            <span>{t("trc.scanning")} :: {stage.key}</span>
            <span className="aif-pulse">●</span>
          </div>
          <div className="space-y-1.5">
            {logs.map((l) => (
              <div key={l.id} className="text-[#9FE6D2] truncate aif-log-fade">
                {l.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 text-[12px] text-[var(--aif-text-dim)] text-center relative z-10 flex items-center justify-center gap-2">
        <Lock size={12}/> {t("trc.disclaimer")}
      </div>
    </div>
  );
}

function TimeBox({ label, value, highlight = false }) {
  return (
    <div className={`aif-card !rounded-xl p-4 ${highlight ? "!border-[#5FE3C9]" : ""}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--aif-text-dim)]">{label}</div>
      <div className={`text-3xl md:text-4xl font-extrabold tabular-nums mt-1 ${highlight ? "text-[#5FE3C9]" : "text-white"}`}>{value}</div>
    </div>
  );
}

// === Scan visual: rotating radar + animated nodes ===========================
const ScanVisual = React.memo(function ScanVisual({ stage, stageProgress }) {
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

        <text x="110" y="194" textAnchor="middle" fontSize="9" fill="#9FB0CC" letterSpacing="0.2em">SECURE SCAN ZONE</text>
      </svg>

      <style>{`@keyframes aif-sweep { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
      <style>{`.aif-card .aif-pulse { animation-duration: 3.6s !important; }`}</style>
    </div>
  );
});
