// CaseDashboard — shows analysis, transactions, evidence, generates and downloads reports.
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ShieldAlert, AlertTriangle, CheckCircle2, FileText, Download, RefreshCw,
  Activity, Network, Plus, Coins, CreditCard, Building2, ShieldCheck, FileWarning, Clock
} from "lucide-react";
import { api } from "../api";
import { downloadReportPDF } from "../lib/pdf";

const CATEGORY_LABEL = { low: "Bassa", medium: "Media", high: "Alta", critical: "Critica" };
const CATEGORY_CLASS = { low: "risk-low", medium: "risk-medium", high: "risk-high", critical: "risk-critical" };

const REPORT_DEFS = [
  { type: "bank_complaint",   title: "Reclamo Banca",                icon: Building2 },
  { type: "chargeback",       title: "Richiesta Chargeback",         icon: CreditCard },
  { type: "poste_complaint",  title: "Reclamo Poste / PostePay",     icon: FileText },
  { type: "consob_report",    title: "Segnalazione CONSOB",          icon: ShieldCheck },
  { type: "police_report",    title: "Riassunto Polizia Postale",    icon: ShieldAlert },
  { type: "exchange_freeze",  title: "Richiesta Freeze Exchange",    icon: Coins },
  { type: "lawyer_memo",      title: "Memo per Avvocato",            icon: FileText },
  { type: "case_timeline",    title: "Timeline del Caso",            icon: Clock },
  { type: "recovery_warning", title: "Warning Falso Recupero",       icon: FileWarning },
];

export default function CaseDashboard({ caseId, onBack, onNewCase }) {
  const [c, setC] = useState(null);
  const [txs, setTxs] = useState([]);
  const [evs, setEvs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [reports, setReports] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [cs, t, e, a, r] = await Promise.all([
        api.getCase(caseId),
        api.listTransactions(caseId),
        api.listEvidence(caseId),
        api.getAnalysis(caseId),
        api.listReports(caseId),
      ]);
      setC(cs); setTxs(t); setEvs(e); setAnalysis(a && a.urgency_score !== undefined ? a : null); setReports(r);
    } catch (e) {
      toast.error("Errore caricamento caso");
    }
  };

  useEffect(() => { refresh(); }, [caseId]); // eslint-disable-line

  const reanalyze = async () => {
    setBusy(true);
    try {
      const a = await api.analyze(caseId);
      setAnalysis(a);
      const cs = await api.getCase(caseId);
      setC(cs);
      toast.success("Analisi aggiornata");
    } catch { toast.error("Errore analisi"); }
    finally { setBusy(false); }
  };

  const generate = async (type) => {
    setBusy(true);
    try {
      const r = await api.createReport(caseId, { report_type: type, language: "it" });
      setReports([r, ...reports]);
      downloadReportPDF({ title: r.title, content: r.content, caseRef: c?.case_reference });
      toast.success("Report generato e scaricato");
    } catch { toast.error("Errore generazione report"); }
    finally { setBusy(false); }
  };

  const downloadExisting = (r) => downloadReportPDF({ title: r.title, content: r.content, caseRef: c?.case_reference });

  if (!c) return <div className="aif-card p-6 text-[var(--aif-text-dim)]">Caricamento caso…</div>;

  const score = analysis?.urgency_score ?? c.urgency_score ?? 0;
  const cat = analysis?.urgency_category ?? c.urgency_category ?? "low";

  return (
    <div className="space-y-5" data-testid="dashboard">
      {/* Header */}
      <div className="aif-card aif-glow p-5 md:p-7 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9]">Case Intelligence</div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-1">Dossier {c.case_reference}</h2>
          <div className="text-[12px] text-[var(--aif-text-dim)] mt-1">
            {c.scam_type} · {c.payment_method || "—"} · €{(c.loss_amount || 0).toLocaleString("it-IT")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reanalyze} disabled={busy} className="aif-btn-ghost inline-flex items-center gap-2 !py-2 !text-sm" data-testid="dash-reanalyze">
            <RefreshCw size={14}/> Aggiorna analisi
          </button>
          <button onClick={onNewCase} className="aif-btn-primary !py-2 !text-sm inline-flex items-center gap-2" data-testid="dash-new-case">
            <Plus size={14}/> Nuovo caso
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="aif-card p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--aif-text-dim)]">Urgency score</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-4xl font-extrabold text-white">{score}</div>
            <span className={`risk-badge ${CATEGORY_CLASS[cat]}`}>{CATEGORY_LABEL[cat]}</span>
          </div>
          <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-[#5FE3C9] to-[#FF6B7A]" initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.7 }}/>
          </div>
          <div className="text-[12px] text-[var(--aif-text-dim)] mt-3">{analysis?.recovery_outlook || "Esegui l'analisi per ottenere lo score"}</div>
        </div>

        <div className="aif-card p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--aif-text-dim)]">Payment rail</div>
          <div className="text-white font-medium mt-2">{analysis?.payment_rail_summary || "—"}</div>
          <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--aif-text-dim)]">
            <Network size={14} className="text-[#5FE3C9]"/> {analysis?.tracing_summary?.summary || "Tracing in attesa"}
          </div>
        </div>

        <div className="aif-card p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--aif-text-dim)]">Status caso</div>
          <div className="flex items-center gap-2 mt-2">
            <Activity size={16} className="text-[#5FE3C9]"/>
            <div className="text-white font-medium">{c.status}</div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div><div className="text-lg font-bold text-white">{txs.length}</div><div className="text-[10px] text-[var(--aif-text-dim)]">Transazioni</div></div>
            <div><div className="text-lg font-bold text-white">{evs.length}</div><div className="text-[10px] text-[var(--aif-text-dim)]">Prove</div></div>
            <div><div className="text-lg font-bold text-white">{reports.length}</div><div className="text-[10px] text-[var(--aif-text-dim)]">Report</div></div>
          </div>
        </div>
      </div>

      {/* Red flags + actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="aif-card p-5">
          <div className="flex items-center gap-2 text-white font-semibold"><AlertTriangle size={16} className="text-[#FFB454]"/> Indicatori di rischio</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(analysis?.red_flags || []).length === 0 && <div className="text-[12px] text-[var(--aif-text-dim)]">Nessun flag rilevato. Esegui analisi.</div>}
            {(analysis?.red_flags || []).map((f, i) => (
              <span key={i} className="risk-badge risk-high">⚠ {f}</span>
            ))}
          </div>
        </div>
        <div className="aif-card p-5">
          <div className="flex items-center gap-2 text-white font-semibold"><CheckCircle2 size={16} className="text-[#5FE3C9]"/> Azioni consigliate</div>
          <ul className="mt-3 space-y-2">
            {(analysis?.recommended_actions || ["Esegui l'analisi del caso per ottenere le azioni consigliate."]).map((a, i) => (
              <li key={i} className="text-[13px] text-[var(--aif-text-dim)] flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5FE3C9] mt-2 inline-block"/> {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tracing chain */}
      {analysis?.tracing_summary?.chain && (
        <div className="aif-card p-5">
          <div className="text-white font-semibold mb-3">Percorso fondi (mappa)</div>
          <div className="flex items-center gap-2 flex-wrap">
            {analysis.tracing_summary.chain.map((step, i) => (
              <React.Fragment key={i}>
                <div className="aif-card !rounded-full !py-1.5 !px-3 text-[12px] text-white">{step}</div>
                {i < analysis.tracing_summary.chain.length - 1 && <span className="text-[#5FE3C9]">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Transactions & evidence */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="aif-card p-5">
          <div className="text-white font-semibold mb-3">Transazioni ({txs.length})</div>
          {txs.length === 0 && <div className="text-[12px] text-[var(--aif-text-dim)]">Nessuna transazione registrata.</div>}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {txs.map((t) => (
              <div key={t.id} className="aif-card !rounded-xl p-3 text-[12px]">
                <div className="text-white"><strong>€{Number(t.amount || 0).toFixed(2)}</strong> · {t.payment_type} {t.network && <>· {t.network}</>}</div>
                <div className="text-[var(--aif-text-dim)] mt-0.5">
                  {t.iban && <>IBAN {t.iban} · </>}
                  {t.recipient_name && <>{t.recipient_name} · </>}
                  {t.tx_hash && <>hash: {t.tx_hash.slice(0, 18)}… · </>}
                  {t.wallet_address && <>wallet: {t.wallet_address.slice(0, 18)}…</>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="aif-card p-5">
          <div className="text-white font-semibold mb-3">Prove disponibili ({evs.length})</div>
          {evs.length === 0 && <div className="text-[12px] text-[var(--aif-text-dim)]">Nessuna prova registrata.</div>}
          <div className="grid grid-cols-2 gap-2">
            {evs.map((e) => (
              <div key={e.id} className="aif-card !rounded-xl p-2.5 text-[12px] text-white flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#5FE3C9]"/> {e.title}
              </div>
            ))}
          </div>
          {(analysis?.missing_evidence || []).length > 0 && (
            <>
              <div className="text-white font-semibold mt-4 mb-2 text-[13px]">Prove mancanti</div>
              <ul className="text-[12px] text-[#FFB454] space-y-1">
                {analysis.missing_evidence.map((m, i) => <li key={i}>• {m}</li>)}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Reports */}
      <div className="aif-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-white font-semibold">Genera report professionali</div>
          <div className="text-[11px] text-[var(--aif-text-dim)]">PDF scaricabile, basato sui dati del caso</div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {REPORT_DEFS.map((r) => {
            const Icon = r.icon;
            return (
              <button key={r.type} onClick={() => generate(r.type)} disabled={busy} data-testid={`report-${r.type}`}
                className="aif-card !rounded-xl p-3 text-left flex items-center gap-3 hover:!border-[#5FE3C9] transition disabled:opacity-60">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#5FE3C9]/20 to-[#6E8BFF]/20 border border-[var(--aif-line)] flex items-center justify-center text-[#5FE3C9]">
                  <Icon size={16}/>
                </div>
                <div className="flex-1">
                  <div className="text-[13px] text-white">{r.title}</div>
                  <div className="text-[10px] text-[var(--aif-text-dim)]">PDF · IT</div>
                </div>
                <Download size={14} className="text-[var(--aif-text-dim)]"/>
              </button>
            );
          })}
        </div>

        {reports.length > 0 && (
          <div className="mt-5">
            <div className="text-[12px] uppercase tracking-[0.18em] text-[var(--aif-text-dim)] mb-2">Storico report generati</div>
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="aif-card !rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] text-white">{r.title}</div>
                    <div className="text-[11px] text-[var(--aif-text-dim)]">{new Date(r.created_at).toLocaleString("it-IT")}</div>
                  </div>
                  <button onClick={() => downloadExisting(r)} className="aif-btn-ghost !py-1.5 !text-xs inline-flex items-center gap-2" data-testid={`re-download-${r.report_type}`}>
                    <Download size={12}/> PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
