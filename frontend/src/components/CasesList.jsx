import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Folder, Plus } from "lucide-react";
import { useI18n } from "../i18n";

export default function CasesList({ activeId, onSelect, onNew, refreshKey }) {
  const { t } = useI18n();
  const [cases, setCases] = useState([]);
  useEffect(() => { (async () => { try { setCases(await api.listCases()); } catch {} })(); }, [refreshKey]);
  return (
    <div className="aif-card p-4 sticky top-20" data-testid="cases-list">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-semibold text-sm">{t("cl.title")}</div>
        <button onClick={onNew} className="aif-btn-ghost !py-1 !px-2 !text-xs inline-flex items-center gap-1" data-testid="cases-new">
          <Plus size={12}/> {t("cl.new")}
        </button>
      </div>
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
        {cases.length === 0 && <div className="text-[12px] text-[var(--aif-text-dim)]">{t("cl.empty")}</div>}
        {cases.map((c) => (
          <button key={c.id} onClick={() => onSelect(c.id)}
            data-testid={`case-${c.case_reference}`}
            className={`w-full text-left aif-card !rounded-xl p-3 flex items-center gap-3 transition ${activeId === c.id ? "!border-[#5FE3C9]" : ""}`}>
            <Folder size={14} className="text-[#5FE3C9]"/>
            <div className="flex-1">
              <div className="text-[12px] text-white font-medium">{c.case_reference}</div>
              <div className="text-[10px] text-[var(--aif-text-dim)] truncate">{c.scam_type} · €{(c.loss_amount || 0).toLocaleString("it-IT")}</div>
            </div>
            <span className={`risk-badge !text-[9px] ${c.urgency_category === "critical" ? "risk-critical" : c.urgency_category === "high" ? "risk-high" : c.urgency_category === "medium" ? "risk-medium" : "risk-low"}`}>{c.urgency_score || 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
