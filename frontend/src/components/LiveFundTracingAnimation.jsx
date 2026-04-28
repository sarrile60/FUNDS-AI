// LiveFundTracingAnimation
// =========================
// Premium multi-stage animation that runs while the AI "analyzes" the case.
// Stages: initializing → scanning_payment → mapping_path → detecting_risk → building_schema → generating_reports → complete
// Pure SVG + CSS + small Framer Motion. No fake claims.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Network, AlertTriangle, FileSearch, FileCheck2, CheckCircle2, Activity } from "lucide-react";

const STAGE_LIST = [
  { key: "init",     label: "Inizializzazione analisi sicura del caso",    icon: Shield },
  { key: "payment",  label: "Analisi metodo di pagamento",                 icon: Zap },
  { key: "mapping",  label: "Mappatura percorso fondi",                    icon: Network },
  { key: "risk",     label: "Rilevamento indicatori di frode",             icon: AlertTriangle },
  { key: "schema",   label: "Costruzione schema documentale di recupero",  icon: FileSearch },
  { key: "reports",  label: "Generazione report professionali",            icon: FileCheck2 },
  { key: "complete", label: "Case Intelligence pronta",                    icon: CheckCircle2 },
];

const RAIL_ICONS = [
  { id: "sepa",         label: "SEPA",         icon: "🏦" },
  { id: "instant_sepa", label: "SEPA Instant", icon: "⚡" },
  { id: "postepay",     label: "PostePay",     icon: "💳" },
  { id: "card",         label: "Carta",        icon: "💳" },
  { id: "paypal",       label: "PayPal",       icon: "🅿" },
  { id: "revolut",      label: "Revolut",      icon: "🅡" },
  { id: "wise",         label: "Wise",         icon: "🪙" },
  { id: "satispay",     label: "Satispay",     icon: "🟥" },
  { id: "crypto",       label: "Crypto",       icon: "₿" },
  { id: "forex",        label: "Forex Broker", icon: "📈" },
];

// node chains by scam/payment
function chainFor(scam, pay) {
  if (pay === "instant_sepa" || pay === "sepa") {
    return ["Banca Vittima", "Rete SEPA", "IBAN Beneficiario", "Possibile Mule", "Richiesta Recall"];
  }
  if (pay === "postepay" || scam === "postepay") {
    return ["PostePay/BancoPosta", "Ricarica", "Destinatario", "Reclamo Poste"];
  }
  if (pay === "card") return ["Carta Vittima", "Merchant Descriptor", "Payment Processor", "Chargeback"];
  if (scam === "crypto") return ["Exchange Origine", "Wallet", "Blockchain TX", "Wallet Destinatario", "Possibile Exchange Esposto", "Freeze Request"];
  if (scam === "forex_broker") return ["Deposito Vittima", "Finta Piattaforma", "IBAN/Wallet/Processor", "Prelievo Bloccato", "CONSOB / Polizia"];
  if (scam === "fake_recovery") return ["Vittima", "Finto Recuperatore", "Tassa di Sblocco", "ALERT Secondary Scam"];
  if (["paypal","revolut","wise","satispay"].includes(pay)) return ["Wallet/App", "Account Destinatario", "Platform Dispute"];
  return ["Vittima", "Metodo di Pagamento", "Destinatario", "Report"];
}

const RISK_FLAGS = [
  "Broker non autorizzato", "Prelievo bloccato", "Richiesta tassa di sblocco",
  "AML fee", "Gas fee", "Falso documento autorità", "Richiesta seed phrase",
  "Richiesta OTP", "Remote access risk", "IBAN sospetto", "Wallet risk", "Falso recupero fondi"
];

const REPORTS = [
  "Reclamo banca", "Richiesta freeze exchange", "Segnalazione CONSOB",
  "Riassunto Polizia Postale", "Reclamo Poste", "Lawyer handoff memo", "Timeline caso"
];

const SCHEMA_STEPS = [
  "Contatta banca", "Richiedi recall bonifico", "Prepara chargeback",
  "Contatta exchange compliance", "Prepara segnalazione CONSOB",
  "Prepara riassunto Polizia Postale", "Conserva prove", "Non pagare altre commissioni"
];

export default function LiveFundTracingAnimation({ scam = "forex_broker", pay = "sepa", onComplete }) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);
  const chain = useMemo(() => chainFor(scam, pay), [scam, pay]);

  // Auto-advance stages with visible timing
  useEffect(() => {
    const timings = [1100, 1700, 2300, 2100, 1900, 2200, 900]; // ms per stage
    const t = setTimeout(() => {
      if (stage < STAGE_LIST.length - 1) setStage(stage + 1);
      else if (!completedRef.current) {
        completedRef.current = true;
        onComplete && onComplete();
      }
    }, timings[stage]);
    return () => clearTimeout(t);
  }, [stage, onComplete]);

  // Smooth global progress bar
  useEffect(() => {
    const target = ((stage + 1) / STAGE_LIST.length) * 100;
    const id = setInterval(() => {
      setProgress((p) => {
        if (Math.abs(p - target) < 0.6) { clearInterval(id); return target; }
        return p + (target - p) * 0.06;
      });
    }, 40);
    return () => clearInterval(id);
  }, [stage]);

  const StageIcon = STAGE_LIST[stage].icon;

  return (
    <div className="aif-card aif-glow p-5 md:p-7 relative overflow-hidden" data-testid="live-tracing">
      {/* grid */}
      <div className="aif-grid-overlay absolute inset-0 opacity-40 pointer-events-none"/>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#5FE3C9] opacity-30 blur-md aif-pulse"/>
            <div className="relative w-10 h-10 rounded-full bg-[#0E1A36] border border-[var(--aif-line)] flex items-center justify-center text-[#5FE3C9]">
              <StageIcon size={18}/>
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#9FB0CC]">Tracciamento fondi</div>
            <div className="text-white font-semibold">{STAGE_LIST[stage].label}</div>
          </div>
        </div>
        <div className="aif-chip text-[10px]"><Activity size={12}/> {Math.round(progress)}%</div>
      </div>

      {/* Progress line */}
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
        <div className="h-full bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF] transition-all" style={{ width: `${progress}%` }}/>
      </div>

      {/* Stage stepper */}
      <div className="grid grid-cols-7 gap-1 mt-4 relative z-10">
        {STAGE_LIST.map((s, i) => (
          <div key={s.key} className={`h-1 rounded-full ${i <= stage ? "bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF]" : "bg-white/5"}`}/>
        ))}
      </div>

      {/* Stage canvas */}
      <div className="mt-6 relative z-10 min-h-[300px] md:min-h-[360px]">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div key="init" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-10">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full bg-[#5FE3C9] opacity-20 blur-2xl aif-pulse"/>
                <Shield size={84} className="absolute inset-0 m-auto text-[#5FE3C9]" />
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" stroke="rgba(120,160,230,0.15)" strokeWidth="1.5" fill="none"/>
                  <circle cx="50" cy="50" r="46" stroke="#5FE3C9" strokeWidth="1.5" fill="none"
                    strokeDasharray="289" strokeDashoffset="120">
                    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="2.4s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </div>
              <div className="text-center mt-4">
                <div className="text-white font-semibold">Caso protetto e crittografato</div>
                <div className="text-[12px] text-[var(--aif-text-dim)] mt-1">Generazione case ID • Verifica integrità prove</div>
              </div>
            </motion.div>
          )}

          {stage === 1 && (
            <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-5 gap-3 py-4">
              {RAIL_ICONS.map((r, i) => {
                const active = r.id === pay || (r.id === "forex" && scam === "forex_broker") || (r.id === "crypto" && scam === "crypto");
                return (
                  <motion.div key={r.id}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className={`aif-card flex flex-col items-center justify-center py-4 ${active ? "aif-glow !border-[#5FE3C9]" : ""}`}>
                    <div className={`text-2xl ${active ? "aif-pulse" : ""}`}>{r.icon}</div>
                    <div className={`text-[11px] mt-1 ${active ? "text-[#5FE3C9] font-semibold" : "text-[var(--aif-text-dim)]"}`}>{r.label}</div>
                  </motion.div>
                );
              })}
              <div className="col-span-5 text-center text-[12px] text-[var(--aif-text-dim)] mt-2">
                Riconoscimento del binario di pagamento per orientare l'analisi…
              </div>
            </motion.div>
          )}

          {stage === 2 && <MappingStage chain={chain}/> }

          {stage === 3 && (
            <motion.div key="risk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
              <div className="text-center text-[13px] text-[var(--aif-text-dim)] mb-4">Scansione indicatori di frode in corso…</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {RISK_FLAGS.map((f, i) => (
                  <motion.span key={f}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="risk-badge risk-high">
                    ⚠ {f}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {stage === 4 && (
            <motion.div key="schema" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 grid sm:grid-cols-2 gap-2">
              {SCHEMA_STEPS.map((s, i) => (
                <motion.div key={s}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 }}
                  className="aif-card !rounded-xl p-3 flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-[#5FE3C9]"/>
                  <div className="text-[13px] text-white">{s}</div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {stage === 5 && (
            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {REPORTS.map((r, i) => (
                <motion.div key={r}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="aif-card !rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-12 rounded bg-gradient-to-b from-[#5FE3C9]/30 to-[#6E8BFF]/30 border border-[var(--aif-line)] flex items-center justify-center">
                    <FileCheck2 size={16} className="text-[#5FE3C9]"/>
                  </div>
                  <div className="text-[13px] text-white">{r}</div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {stage === 6 && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-10 flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-[#4ADE80] blur-2xl opacity-25"/>
                <CheckCircle2 size={88} className="text-[#4ADE80] relative"/>
              </div>
              <div className="mt-3 text-white font-semibold text-lg">Case Intelligence pronta</div>
              <div className="text-[12px] text-[var(--aif-text-dim)] mt-1">Apertura della dashboard…</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 text-[11px] text-[var(--aif-text-dim)] text-center relative z-10">
        Analisi preliminare basata sulle informazioni fornite. Il recupero dei fondi non è garantito.
      </div>
    </div>
  );
}

// === Mapping stage with animated nodes & flowing particles ===
function MappingStage({ chain }) {
  const W = 720, H = 320;
  const padX = 60;
  const step = (W - padX * 2) / Math.max(1, chain.length - 1);
  const nodes = chain.map((label, i) => ({
    x: padX + i * step,
    y: 160 + (i % 2 === 0 ? -22 : 22),
    label,
  }));

  return (
    <motion.div key="mapping" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px] md:h-[320px]">
        <defs>
          <linearGradient id="m-line" x1="0" x2="1">
            <stop offset="0" stopColor="#5FE3C9"/>
            <stop offset="1" stopColor="#6E8BFF"/>
          </linearGradient>
        </defs>

        {/* Connectors */}
        {nodes.map((n, i) => {
          if (i === nodes.length - 1) return null;
          const a = n, b = nodes[i + 1];
          const cx = (a.x + b.x) / 2;
          const path = `M ${a.x} ${a.y} C ${cx} ${a.y}, ${cx} ${b.y}, ${b.x} ${b.y}`;
          return (
            <g key={i}>
              <path d={path} stroke="url(#m-line)" strokeWidth="1.6" fill="none" opacity="0.35"/>
              <path d={path} stroke="url(#m-line)" strokeWidth="2.2" fill="none" className="aif-flow-line" style={{ animationDelay: `${i * 0.25}s` }}/>
            </g>
          );
        })}

        {/* Particles flowing through */}
        {nodes.slice(0, -1).map((n, i) => {
          const b = nodes[i + 1];
          const cx = (n.x + b.x) / 2;
          const path = `M ${n.x} ${n.y} C ${cx} ${n.y}, ${cx} ${b.y}, ${b.x} ${b.y}`;
          return (
            <circle key={`p-${i}`} r="3" fill="#5FE3C9">
              <animateMotion dur={`${1.6 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.2}s`} path={path}/>
            </circle>
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={i} transform={`translate(${n.x} ${n.y})`}>
            <circle r="22" fill="rgba(8,16,38,0.95)" stroke="#5FE3C9" strokeWidth="1.4"/>
            <circle r="32" fill="#5FE3C9" opacity="0.10" className="aif-pulse"/>
            <text textAnchor="middle" y="4" fill="#5FE3C9" fontSize="13" fontWeight="700">{i + 1}</text>
            <text textAnchor="middle" y={n.y > 160 ? -34 : 44} fill="#E6EDF7" fontSize="10.5" fontWeight="600">{n.label}</text>
          </g>
        ))}
      </svg>
    </motion.div>
  );
}
