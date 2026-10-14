// AdminPanel — admin dashboard with Access Codes management and Traces auditing
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Settings, BarChart3, Plus, Edit2, Trash2, Save, X,
  Mail as MailIcon, ExternalLink, Wallet, Check, LogOut, FileText, Download,
  Calendar, DollarSign, Link2, Key, Copy, Eye, Image as ImageIcon, FileType,
  Loader2, ZoomIn, ZoomOut, AlertCircle, Users, Search, ChevronLeft, ChevronRight,
  Phone, CheckCircle2, Clock, Mail, Globe
} from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TIER_LABEL = {
  "5000_20000":   "< €20.000",
  "20000_50000":  "€20.000 – €50.000",
  "50000_100000": "€50.000 – €100.000",
  "100000_plus":  "€100.000+",
};

// Helper to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem("aif_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const isIt = lang === "it";
  const [tab, setTab] = useState("traces");

  if (!user) return <Navigate to="/admin" replace/>;
  if (user.role !== "admin") return <Navigate to="/app" replace/>;

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        {/* Top bar */}
        <header className="border-b border-[var(--aif-line)] bg-[rgba(6,11,24,0.92)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-5 lg:px-8 h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Logo/>
              <span className="aif-chip text-[10px] hidden md:inline-flex">{isIt ? "Pannello Admin" : "Admin Panel"}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setLang(lang === "it" ? "en" : "it")}
                className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--aif-text-dim)] hover:text-white transition px-2.5 py-1.5 rounded-lg border border-[var(--aif-line)]"
                data-testid="adm-lang-toggle"
                title={isIt ? "Cambia lingua" : "Switch language"}
              >
                <Globe size={13}/> {lang.toUpperCase()}
              </button>
              <button onClick={() => { logout(); nav("/login"); }} className="aif-btn-ghost !py-2 !px-3 !text-sm inline-flex items-center gap-1.5" data-testid="adm-logout">
                <LogOut size={14}/> <span className="hidden sm:inline">{isIt ? "Esci" : "Sign out"}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-8 space-y-5">
          {/* Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <TabBtn active={tab === "traces"}   onClick={() => setTab("traces")}   icon={BarChart3} label={isIt ? "Tracciamenti" : "Traces"} testid="tab-traces"/>
            <TabBtn active={tab === "codes"}    onClick={() => setTab("codes")}    icon={Key}       label={isIt ? "Codici Accesso" : "Access Codes"} testid="tab-codes"/>
            <TabBtn active={tab === "users"}    onClick={() => setTab("users")}    icon={Users}     label={isIt ? "Utenti" : "Users"} testid="tab-users"/>
          </div>

          {tab === "traces" && <TracesTab isIt={isIt}/>}
          {tab === "codes" && <AccessCodesTab isIt={isIt}/>}
          {tab === "users" && <RegisteredUsersTab isIt={isIt}/>}
        </main>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, testid }) {
  return (
    <button onClick={onClick} data-testid={testid}
      className={`aif-card !rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 transition ${active ? "!border-[#5FE3C9] aif-glow" : ""}`}>
      <Icon size={14} className={active ? "text-[#5FE3C9]" : "text-[var(--aif-text-dim)]"}/>
      <span className={active ? "text-white font-semibold" : "text-[var(--aif-text-dim)]"}>{label}</span>
    </button>
  );
}

// ============================================================
//   ACCESS CODES TAB
// ============================================================
function AccessCodesTab({ isIt }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/access-codes`, { headers: getAuthHeader() });
      setCodes(data);
    } catch (e) {
      toast.error(isIt ? "Errore caricamento codici" : "Failed to load access codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setFormCode("");
    setFormName("");
    setFormUrl("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (c) => {
    setFormCode(c.code);
    setFormName(c.destination_name);
    setFormUrl(c.destination_url);
    setEditingId(c.id);
    setShowForm(true);
  };

  const saveCode = async () => {
    if (!formCode.trim() || !formName.trim()) {
      toast.error(isIt ? "Codice e nome destinazione obbligatori" : "Code and destination name required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API}/admin/access-codes/${editingId}`, {
          code: formCode.trim(),
          destination_name: formName.trim(),
          destination_url: formUrl.trim(),
        }, { headers: getAuthHeader() });
        toast.success(isIt ? "Codice aggiornato" : "Code updated");
      } else {
        await axios.post(`${API}/admin/access-codes`, {
          code: formCode.trim(),
          destination_name: formName.trim(),
          destination_url: formUrl.trim(),
        }, { headers: getAuthHeader() });
        toast.success(isIt ? "Codice creato" : "Code created");
      }
      resetForm();
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore salvataggio" : "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteCode = async (id) => {
    if (!window.confirm(isIt ? "Eliminare questo codice di accesso?" : "Delete this access code?")) return;
    try {
      await axios.delete(`${API}/admin/access-codes/${id}`, { headers: getAuthHeader() });
      setCodes(prev => prev.filter(c => c.id !== id));
      toast.success(isIt ? "Codice eliminato" : "Code deleted");
    } catch (e) {
      toast.error(isIt ? "Errore eliminazione" : "Delete failed");
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(isIt ? "Codice copiato" : "Code copied");
  };

  if (loading) {
    return <div className="aif-card p-8 text-center text-[var(--aif-text-dim)]">{isIt ? "Caricamento..." : "Loading..."}</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header with add button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{isIt ? "Codici di Accesso" : "Access Codes"}</h2>
          <p className="text-[13px] text-[var(--aif-text-dim)] mt-1">
            {isIt 
              ? "Ogni codice è collegato a una destinazione diversa. L'utente vedrà la destinazione associata al codice inserito."
              : "Each code is linked to a different destination. The user will see the destination associated with the code they enter."}
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="aif-btn-primary inline-flex items-center gap-2 shrink-0"
          data-testid="add-code-btn"
        >
          <Plus size={16}/> {isIt ? "Aggiungi Codice" : "Add Code"}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="aif-card aif-glow p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">
              {editingId ? (isIt ? "Modifica Codice" : "Edit Code") : (isIt ? "Nuovo Codice" : "New Code")}
            </h3>
            <button onClick={resetForm} className="p-2 text-[var(--aif-text-dim)] hover:text-white"><X size={18}/></button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="aif-label flex items-center gap-2">
                <Key size={14} className="text-[#5FE3C9]"/>
                {isIt ? "Codice" : "Code"}
              </label>
              <input 
                type="text" 
                className="aif-input font-mono tracking-wider uppercase"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="WYZ22"
                data-testid="form-code"
              />
            </div>
            <div>
              <label className="aif-label flex items-center gap-2">
                <Wallet size={14} className="text-[#5FE3C9]"/>
                {isIt ? "Nome Destinazione" : "Destination Name"}
              </label>
              <input 
                type="text" 
                className="aif-input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Chiantin Bank"
                data-testid="form-dest-name"
              />
            </div>
            <div>
              <label className="aif-label flex items-center gap-2">
                <Link2 size={14} className="text-[#5FE3C9]"/>
                {isIt ? "URL Destinazione" : "Destination URL"}
              </label>
              <input 
                type="text" 
                className="aif-input"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="zenthos-eu.com"
                data-testid="form-dest-url"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button 
              onClick={saveCode} 
              disabled={saving}
              className="aif-btn-primary inline-flex items-center gap-2"
              data-testid="form-save"
            >
              <Save size={16}/> {saving ? "..." : (editingId ? (isIt ? "Aggiorna" : "Update") : (isIt ? "Crea Codice" : "Create Code"))}
            </button>
            <button onClick={resetForm} className="aif-btn-ghost">{isIt ? "Annulla" : "Cancel"}</button>
          </div>
        </div>
      )}

      {/* Codes list */}
      {codes.length === 0 && !showForm ? (
        <div className="aif-card p-8 text-center">
          <Key size={48} className="mx-auto text-[var(--aif-text-dim)] mb-3"/>
          <p className="text-[var(--aif-text-dim)]">{isIt ? "Nessun codice creato ancora." : "No access codes yet."}</p>
          <p className="text-[12px] text-[var(--aif-text-dim)] mt-1">{isIt ? "Clicca 'Aggiungi Codice' per iniziare." : "Click 'Add Code' to get started."}</p>
        </div>
      ) : (
        <div className="aif-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--aif-line)] text-[var(--aif-text-dim)] text-left">
                  <th className="p-4 font-medium">{isIt ? "Codice" : "Code"}</th>
                  <th className="p-4 font-medium">{isIt ? "Destinazione" : "Destination"}</th>
                  <th className="p-4 font-medium">URL</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {codes.map(c => (
                  <tr key={c.id} className="border-b border-[var(--aif-line)] hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#5FE3C9] tracking-wider text-[15px]">{c.code}</span>
                        <button onClick={() => copyCode(c.code)} className="p-1 text-[var(--aif-text-dim)] hover:text-white" title="Copy">
                          <Copy size={13}/>
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{c.destination_name}</div>
                    </td>
                    <td className="p-4 text-[var(--aif-text-dim)] text-[13px]">
                      {c.destination_url ? (
                        <a href={c.destination_url.match(/^https?:\/\//) ? c.destination_url : `http://${c.destination_url}`} 
                           target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#5FE3C9] hover:underline">
                          {c.destination_url} <ExternalLink size={11}/>
                        </a>
                      ) : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(c)} className="p-2 text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition" title={isIt ? "Modifica" : "Edit"}>
                          <Edit2 size={15}/>
                        </button>
                        <button onClick={() => deleteCode(c.id)} className="p-2 text-[var(--aif-text-dim)] hover:text-[#FF6B7A] transition" title={isIt ? "Elimina" : "Delete"}>
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
//   TRACES TAB
// ============================================================

// Format seconds as HH:MM:SS stopwatch
function fmtStopwatch(seconds) {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// Live elapsed stopwatch for admin — ticks every second
// Uses increment-based approach to avoid server/client clock skew issues
function ElapsedCell({ createdAt }) {
  const [elapsed, setElapsed] = useState(() => {
    const ms = Date.now() - new Date(createdAt).getTime();
    return ms > 0 ? Math.floor(ms / 1000) : 0;
  });
  useEffect(() => {
    // Recalculate once from createdAt to sync
    const ms = Date.now() - new Date(createdAt).getTime();
    const initial = ms > 0 ? Math.floor(ms / 1000) : 0;
    setElapsed(initial);
    // Then just increment by 1 every second — immune to clock skew
    const id = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  const h = Math.floor(elapsed / 3600);
  const color = h >= 50 ? "#FF6B7A" : h >= 24 ? "#FFB454" : "#5FE3C9";
  return (
    <div>
      <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color }}>{fmtStopwatch(elapsed)}</span>
      <div className="text-[10px] text-[var(--aif-text-dim)] mt-0.5">
        {h >= 50 ? "50h+" : h >= 24 ? "24h+" : h > 0 ? `${h}h elapsed` : "< 1h"}
      </div>
    </div>
  );
}

function TracesTab({ isIt }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [markingFee, setMarkingFee] = useState(null);
  const [sending24h, setSending24h] = useState(null);
  const [simulating, setSimulating] = useState(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/traces`, { headers: getAuthHeader() });
      setTraces(data);
    } catch (e) {
      toast.error(isIt ? "Errore caricamento tracciamenti" : "Failed to load traces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deleteTrace = async (id) => {
    if (!window.confirm(isIt ? "Eliminare questo tracciamento?" : "Delete this trace?")) return;
    try {
      await axios.delete(`${API}/admin/traces/${id}`, { headers: getAuthHeader() });
      setTraces(prev => prev.filter(t => t.id !== id));
      toast.success(isIt ? "Tracciamento eliminato" : "Trace deleted");
    } catch (e) {
      toast.error(isIt ? "Errore eliminazione" : "Delete failed");
    }
  };

  const markFeePaid = async (traceId) => {
    if (!window.confirm(isIt ? "Contrassegnare come pagato e inviare email fondi localizzati?" : "Mark as paid and send funds-located email?")) return;
    setMarkingFee(traceId);
    try {
      const { data } = await axios.post(`${API}/admin/traces/${traceId}/mark-fee-paid`, {}, { headers: getAuthHeader() });
      setTraces(prev => prev.map(t => t.id === traceId ? { ...t, ...data } : t));
      toast.success(isIt ? "Quota confermata — email inviata" : "Fee confirmed — email sent");
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore" : "Error"));
    } finally {
      setMarkingFee(null);
    }
  };

  const send24hEmail = async (traceId) => {
    if (!window.confirm(isIt ? "Inviare email aggiornamento 24h ora?" : "Send 24h update email now?")) return;
    setSending24h(traceId);
    try {
      const { data } = await axios.post(`${API}/admin/traces/${traceId}/send-24h-email`, {}, { headers: getAuthHeader() });
      setTraces(prev => prev.map(t => t.id === traceId ? { ...t, ...data } : t));
      toast.success(isIt ? "Email 24h inviata" : "24h email sent");
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore invio" : "Send error"));
    } finally {
      setSending24h(null);
    }
  };

  const simulateHours = async (traceId, hours) => {
    if (!window.confirm(isIt ? `Simulare ${hours}h fa? Questo rischedula le email.` : `Simulate ${hours}h ago? This reschedules emails.`)) return;
    setSimulating(traceId);
    try {
      const { data } = await axios.post(`${API}/admin/traces/${traceId}/simulate-hours`, { hours }, { headers: getAuthHeader() });
      setTraces(prev => prev.map(t => t.id === traceId ? { ...t, ...data } : t));
      toast.success(isIt ? `Tracciamento spostato a ${hours}h fa — email riprogrammate` : `Trace moved to ${hours}h ago — emails rescheduled`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore" : "Error"));
    } finally {
      setSimulating(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(isIt ? "it-IT" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const formatAmount = (n) => `€ ${(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Client-side filter
  const filtered = traces.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.first_name || "").toLowerCase().includes(q) ||
      (t.last_name || "").toLowerCase().includes(q) ||
      (t.email || "").toLowerCase().includes(q) ||
      (t.code_used || "").toLowerCase().includes(q) ||
      (t.destination_name || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page when search changes
  useEffect(() => { setPage(0); }, [search]);

  if (loading) {
    return <div className="aif-card p-8 text-center text-[var(--aif-text-dim)]">{isIt ? "Caricamento..." : "Loading..."}</div>;
  }

  if (traces.length === 0) {
    return (
      <div className="aif-card p-8 text-center">
        <BarChart3 size={48} className="mx-auto text-[var(--aif-text-dim)] mb-3"/>
        <p className="text-[var(--aif-text-dim)]">{isIt ? "Nessun tracciamento ancora." : "No traces yet."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search + page size */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
            <input
              type="text"
              className="aif-input pl-9 !py-2 text-[13px] w-96"
              placeholder={isIt ? "Cerca nome, email, codice, destinazione…" : "Search name, email, code, destination…"}
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="traces-search"
            />
          </div>
          <select
            className="aif-input !py-2 text-[13px] w-28"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
          >
            {[20, 50, 100].map(s => <option key={s} value={s}>{s} / {isIt ? "pag." : "page"}</option>)}
          </select>
        </div>
        <div className="text-[12px] text-[var(--aif-text-dim)]">
          {filtered.length} {isIt ? "risultati" : "results"}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={isIt ? "Totale Tracciamenti" : "Total Traces"} value={traces.length} icon={BarChart3}/>
        <StatCard label={isIt ? "Completati" : "Completed"} value={traces.filter(t => t.status === "completed").length} icon={Check}/>
        <StatCard label={isIt ? "Importo Totale" : "Total Amount"} value={formatAmount(traces.reduce((sum, t) => sum + (t.located_amount || 0), 0))} icon={DollarSign}/>
        <StatCard label={isIt ? "Con Documenti" : "With Documents"} value={traces.filter(t => t.documents?.length > 0).length} icon={FileText}/>
      </div>

      {/* Traces list */}
      {filtered.length === 0 ? (
        <div className="aif-card p-8 text-center">
          <Search size={36} className="mx-auto text-[var(--aif-text-dim)] mb-3"/>
          <p className="text-[var(--aif-text-dim)]">{search ? (isIt ? "Nessun risultato." : "No results found.") : (isIt ? "Nessun tracciamento ancora." : "No traces yet.")}</p>
        </div>
      ) : (
      <div className="aif-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{minWidth:"1100px"}}>
            <thead>
              <tr className="border-b border-[var(--aif-line)] text-[var(--aif-text-dim)] text-left">
                <th className="px-3 py-3 font-medium text-[12px]">{isIt ? "Nome" : "Name"}</th>
                <th className="px-3 py-3 font-medium text-[12px]">Email</th>
                <th className="px-3 py-3 font-medium text-[12px]">{isIt ? "Cod." : "Code"}</th>
                <th className="px-3 py-3 font-medium text-[12px]">{isIt ? "Dest." : "Dest."}</th>
                <th className="px-3 py-3 font-medium text-[12px] whitespace-nowrap">{isIt ? "Importo" : "Amount"}</th>
                <th className="px-3 py-3 font-medium text-[12px]">Elapsed</th>
                <th className="px-3 py-3 font-medium text-[12px]">{isIt ? "Doc" : "Doc"}</th>
                <th className="px-3 py-3 font-medium text-[12px] whitespace-nowrap">{isIt ? "Data" : "Date"}</th>
                <th className="px-3 py-3 font-medium text-[12px]">{isIt ? "Stato" : "Status"}</th>
                <th className="px-3 py-3 font-medium text-[12px]">{isIt ? "Azioni" : "Actions"}</th>
                <th className="px-3 py-3 font-medium text-[12px] w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(trace => (
                <React.Fragment key={trace.id}>
                  <tr className="border-b border-[var(--aif-line)] hover:bg-white/[0.02]">
                    <td className="px-3 py-3 min-w-[140px]">
                      <div className="font-semibold text-white text-[12px]">{trace.first_name} {trace.last_name}</div>
                      <div className="text-[10px] text-[var(--aif-text-dim)]">{TIER_LABEL[trace.amount_tier] || trace.amount_tier}</div>
                    </td>
                    <td className="px-3 py-3 text-[var(--aif-text-dim)] text-[11px] min-w-[180px]">{trace.email}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[#5FE3C9] text-[11px] font-bold">{trace.code_used || "—"}</span>
                    </td>
                    <td className="px-3 py-3 min-w-[100px]">
                      <span className="text-white text-[12px]">{trace.destination_name || "—"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-bold text-[#5FE3C9] text-[12px] whitespace-nowrap">{formatAmount(trace.located_amount)}</span>
                    </td>
                    <td className="px-3 py-3">
                      {trace.created_at
                        ? <ElapsedCell createdAt={trace.created_at}/>
                        : <span className="text-[var(--aif-text-dim)]">—</span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      {trace.documents?.length > 0 ? (
                        <button 
                          onClick={() => setExpandedId(expandedId === trace.id ? null : trace.id)}
                          className="inline-flex items-center gap-1 text-[#5FE3C9] hover:underline text-[11px]"
                        >
                          <FileText size={12}/> {trace.documents.length}
                        </button>
                      ) : (
                        <span className="text-[var(--aif-text-dim)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[var(--aif-text-dim)] text-[11px] whitespace-nowrap">
                      {formatDate(trace.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                        trace.status === "completed" 
                          ? "bg-[#4ADE80]/15 text-[#4ADE80]" 
                          : "bg-[#FFB454]/15 text-[#FFB454]"
                      }`}>
                        {trace.status === "completed" ? (isIt ? "Fine" : "Done") : (isIt ? "Attivo" : "Active")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1.5">
                        {/* ── Real actions ── */}
                        <div className="flex items-center gap-1 flex-nowrap">
                          <button
                            onClick={() => send24hEmail(trace.id)}
                            disabled={sending24h === trace.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#5FE3C9]/40 text-[#5FE3C9] text-[10px] font-medium hover:bg-[#5FE3C9]/10 transition disabled:opacity-50 whitespace-nowrap"
                            title={isIt ? "Invia email 24h" : "Send 24h email"}
                            data-testid={`send-24h-btn-${trace.id}`}
                          >
                            {sending24h === trace.id ? "…" : "📧 24h"}
                          </button>
                          {trace.fee_paid ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-bold bg-[#4ADE80]/15 text-[#4ADE80] whitespace-nowrap">
                              <Check size={10}/> {isIt ? "Pagato" : "Paid"}
                            </span>
                          ) : (
                            <button
                              onClick={() => markFeePaid(trace.id)}
                              disabled={markingFee === trace.id}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-[#5FE3C9]/50 text-[#5FE3C9] text-[10px] font-medium hover:bg-[#5FE3C9]/10 transition disabled:opacity-50 whitespace-nowrap"
                              data-testid={`fee-paid-btn-${trace.id}`}
                            >
                              {markingFee === trace.id ? "…" : "Fee ✓"}
                            </button>
                          )}
                        </div>
                        {/* ── Test simulations ── */}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] uppercase text-[var(--aif-text-dim)]">T:</span>
                          <button
                            onClick={() => simulateHours(trace.id, 25)}
                            disabled={simulating === trace.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded border border-[#FFB454]/40 text-[#FFB454] text-[10px] hover:bg-[#FFB454]/10 transition disabled:opacity-50"
                            data-testid={`sim-25h-btn-${trace.id}`}
                          >⏩25h</button>
                          <button
                            onClick={() => simulateHours(trace.id, 51)}
                            disabled={simulating === trace.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded border border-[#FF6B7A]/40 text-[#FF6B7A] text-[10px] hover:bg-[#FF6B7A]/10 transition disabled:opacity-50"
                            data-testid={`sim-51h-btn-${trace.id}`}
                          >⏩51h</button>
                        </div>
                      </div>
                    </td>
                    {/* Delete — own column */}
                    <td className="px-2 py-3">
                      <button
                        onClick={() => deleteTrace(trace.id)}
                        className="p-1.5 rounded text-[var(--aif-text-dim)] hover:text-[#FF6B7A] hover:bg-[#FF6B7A]/10 transition"
                        title={isIt ? "Elimina tracciamento" : "Delete trace"}
                      >
                        <Trash2 size={15}/>
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded documents row */}
                  {expandedId === trace.id && trace.documents?.length > 0 && (
                    <tr className="bg-[#0E1A36]">
                      <td colSpan={11} className="p-4">
                        <div className="text-[11px] uppercase tracking-wider text-[#5FE3C9] mb-3">
                          {isIt ? "Documenti caricati" : "Uploaded documents"}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                          {trace.documents.map(doc => {
                            const isImage = (doc.mime_type || "").startsWith("image/");
                            const isPdf = (doc.mime_type || "") === "application/pdf";
                            const Icon = isImage ? ImageIcon : (isPdf ? FileType : FileText);
                            return (
                              <button
                                key={doc.id}
                                onClick={() => setPreviewDoc(doc)}
                                className="aif-card !p-3 text-left hover:!border-[#5FE3C9] transition group cursor-pointer"
                                data-testid={`doc-card-${doc.id}`}
                                title={isIt ? "Clicca per visualizzare" : "Click to preview"}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon size={16} className="text-[#5FE3C9] shrink-0"/>
                                  <span className="text-[12px] text-white truncate flex-1">{doc.original_name}</span>
                                </div>
                                <div className="text-[10px] text-[var(--aif-text-dim)] mb-2">
                                  {(doc.size_bytes / 1024).toFixed(1)} KB
                                </div>
                                <div className="inline-flex items-center gap-1 text-[11px] text-[#5FE3C9] group-hover:underline">
                                  <Eye size={12}/> {isIt ? "Anteprima" : "Preview"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--aif-line)]">
            <div className="text-[12px] text-[var(--aif-text-dim)]">
              {isIt
                ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} di ${filtered.length}`
                : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 text-[var(--aif-text-dim)] hover:text-white disabled:opacity-30 transition"
              >
                <ChevronLeft size={16}/>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 rounded text-[12px] transition ${pageNum === page ? "bg-[#5FE3C9] text-[#06122A] font-bold" : "text-[var(--aif-text-dim)] hover:text-white"}`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 text-[var(--aif-text-dim)] hover:text-white disabled:opacity-30 transition"
              >
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Document preview modal */}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          isIt={isIt}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}

// ============================================================
//   DOCUMENT PREVIEW MODAL
// ============================================================
function DocumentPreviewModal({ doc, isIt, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [fetching, setFetching] = useState(true);
  const blobRef = React.useRef(null);

  const isImage = (doc.mime_type || "").startsWith("image/");
  const isPdf = (doc.mime_type || "") === "application/pdf";

  // Escape key to close + body scroll lock
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Pre-fetch the file as a blob so we can:
  //  1) Force PDFs to render inline in the iframe regardless of Cloudinary's
  //     Content-Disposition: attachment header (which is what makes the
  //     iframe show a blank page when set as the raw URL).
  //  2) Reuse the same blob for the download button, avoiding a second
  //     network round-trip.
  //
  // IMPORTANT — React 18 StrictMode workaround:
  // In development, StrictMode intentionally double-invokes effects
  // (mount → cleanup → remount) to surface unsafe side effects. If we
  // naively create a new blob URL on every effect run, the iframe's src
  // rapidly flips between two blob URLs and the browser aborts the first
  // load with ERR_ABORTED, leaving the iframe blank. To prevent this we
  // gate the fetch by a ref that remembers which `doc.url` we've already
  // handled — the second invocation short-circuits and reuses the blob
  // URL from state. This is safe because each document opens a *new*
  // DocumentPreviewModal instance (parent unmounts it when previewDoc
  // becomes null), so `doc.url` never legitimately changes for one
  // instance. Browsers auto-clean blob URLs when the underlying Blob is
  // GC'd and when the document unloads, so no explicit revoke is needed
  // for our short-lived, admin-only modal.
  const fetchedForUrlRef = React.useRef(null);
  useEffect(() => {
    // Skip re-fetching if we already handled this URL (StrictMode remount
    // or accidental re-render). The state (blobUrl / fetching / loadError)
    // is preserved across the second invocation because React keeps state
    // for the SAME component instance during StrictMode double-invoke.
    if (fetchedForUrlRef.current === doc.url) return;
    fetchedForUrlRef.current = doc.url;

    let cancelled = false;

    (async () => {
      setFetching(true);
      setLoadError(false);
      try {
        const res = await fetch(doc.url, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.blob();
        const typed = new Blob([raw], {
          type: doc.mime_type || raw.type || "application/octet-stream",
        });
        if (cancelled) return;
        blobRef.current = typed;
        const newUrl = URL.createObjectURL(typed);
        setBlobUrl(newUrl);
      } catch (e) {
        console.warn("Preview fetch failed, falling back to direct URL", e);
        if (!cancelled) {
          setBlobUrl(null);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      // Only cancel any in-flight state updates. DO NOT revoke the object
      // URL — see the header comment.
      cancelled = true;
    };
  }, [doc.url, doc.mime_type]);

  // Download using the already-fetched blob when possible.
  const handleDownload = async () => {
    setDownloading(true);
    try {
      let blob = blobRef.current;
      if (!blob) {
        const res = await fetch(doc.url, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.blob();
        blob = new Blob([raw], {
          type: doc.mime_type || raw.type || "application/octet-stream",
        });
      }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = ensureFilenameHasExtension(doc.original_name, doc.mime_type);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      toast.success(isIt ? "Download avviato" : "Download started");
    } catch (e) {
      console.error("Download failed", e);
      toast.error(isIt ? "Download diretto non disponibile, apertura in nuova scheda" : "Direct download unavailable, opening in new tab");
      window.open(doc.url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  // Prefer the blob URL for preview; fall back to the direct URL if the
  // blob fetch failed (e.g., CORS on a legacy record).
  const previewSrc = blobUrl || doc.url;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      data-testid="doc-preview-modal"
    >
      <div
        className="aif-card !bg-[#0E1A36] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[var(--aif-line)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isImage ? <ImageIcon size={16} className="text-[#5FE3C9] shrink-0"/> :
              isPdf ? <FileType size={16} className="text-[#5FE3C9] shrink-0"/> :
              <FileText size={16} className="text-[#5FE3C9] shrink-0"/>}
            <span className="text-[13px] sm:text-[14px] font-semibold text-white truncate">{doc.original_name}</span>
            <span className="hidden sm:inline text-[11px] text-[var(--aif-text-dim)] shrink-0">
              · {(doc.size_bytes / 1024).toFixed(1)} KB
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="aif-btn-primary !py-2 !px-3 !text-[12px] inline-flex items-center gap-1.5"
              data-testid="doc-preview-download"
            >
              {downloading ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
              {isIt ? "Scarica" : "Download"}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[var(--aif-text-dim)] hover:text-white transition"
              data-testid="doc-preview-close"
              title={isIt ? "Chiudi" : "Close"}
            >
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-[#06122A] flex items-center justify-center p-2 sm:p-4">
          {fetching ? (
            <div className="text-center">
              <Loader2 size={32} className="mx-auto text-[#5FE3C9] animate-spin mb-3"/>
              <p className="text-[13px] text-[var(--aif-text-dim)]">
                {isIt ? "Caricamento anteprima…" : "Loading preview…"}
              </p>
            </div>
          ) : loadError && !blobUrl ? (
            <div className="text-center max-w-md">
              <AlertCircle size={40} className="mx-auto text-[#FFB454] mb-3"/>
              <p className="text-[14px] text-white mb-1">
                {isIt ? "Impossibile visualizzare l'anteprima" : "Preview unavailable"}
              </p>
              <p className="text-[12px] text-[var(--aif-text-dim)] mb-4">
                {isIt
                  ? "Puoi comunque scaricare il documento originale."
                  : "You can still download the original document."}
              </p>
              <button onClick={handleDownload} className="aif-btn-primary inline-flex items-center gap-2 !text-[13px]">
                <Download size={14}/> {isIt ? "Scarica documento" : "Download document"}
              </button>
            </div>
          ) : isImage ? (
            <img
              src={previewSrc}
              alt={doc.original_name}
              className="max-w-full max-h-[75vh] object-contain rounded"
              onError={() => setLoadError(true)}
              data-testid="doc-preview-image"
            />
          ) : isPdf ? (
            <iframe
              src={previewSrc}
              title={doc.original_name}
              className="w-full h-[75vh] bg-white rounded"
              onError={() => setLoadError(true)}
              data-testid="doc-preview-pdf"
            />
          ) : (
            <div className="text-center">
              <FileText size={40} className="mx-auto text-[var(--aif-text-dim)] mb-3"/>
              <p className="text-[13px] text-[var(--aif-text-dim)] mb-4">
                {isIt ? "Anteprima non disponibile per questo tipo di file." : "Preview not available for this file type."}
              </p>
              <button onClick={handleDownload} className="aif-btn-primary inline-flex items-center gap-2 !text-[13px]">
                <Download size={14}/> {isIt ? "Scarica documento" : "Download document"}
              </button>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2 border-t border-[var(--aif-line)] text-[11px] text-[var(--aif-text-dim)] shrink-0 flex items-center justify-between">
          <span>{doc.mime_type || "—"}</span>
          <span>{isIt ? "ESC per chiudere" : "Press ESC to close"}</span>
        </div>
      </div>
    </div>
  );
}

// Ensure the download filename has an extension matching the MIME type.
// Cloudinary sometimes strips extensions from the original name, and PDFs
// stored as raw resources lose the .pdf suffix in the URL. This guarantees
// the downloaded file opens correctly on the client machine.
function ensureFilenameHasExtension(name, mime) {
  const safe = (name || "document").trim();
  const hasExt = /\.[a-z0-9]{2,5}$/i.test(safe);
  if (hasExt) return safe;
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "application/pdf": ".pdf",
  };
  const ext = map[mime] || "";
  return safe + ext;
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="aif-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-[#5FE3C9]"/>
        <span className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}


// ============================================================
//   REGISTERED USERS TAB
// ============================================================
const PAGE_SIZE_OPTIONS = [20, 50, 100];

function RegisteredUsersTab({ isIt }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [editingUser, setEditingUser] = useState(null); // user to edit

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/registered-users`, { headers: getAuthHeader() });
      setUsers(data);
    } catch (e) {
      toast.error(isIt ? "Errore caricamento utenti" : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Client-side filter
  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.first_name || "").toLowerCase().includes(q) ||
      (u.last_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => { setPage(0); }, [search]);

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(isIt ? "it-IT" : "en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const fmtAmount = (n) => n ? `€ ${(n).toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "—";

  const handleSaveUser = (updated) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
    setEditingUser(null);
  };

  const deleteUser = async (u) => {
    const label = `${u.first_name} ${u.last_name} (${u.email})`;
    if (!window.confirm(isIt ? `Eliminare l'utente ${label}?` : `Delete user ${label}?`)) return;
    try {
      if (u.type === "guest") {
        // Guest = orphan trace, delete the trace
        await axios.delete(`${API}/admin/traces/${u.trace?.id}`, { headers: getAuthHeader() });
      } else {
        await axios.delete(`${API}/admin/users/${u.id}`, { headers: getAuthHeader() });
      }
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success(isIt ? "Utente eliminato" : "User deleted");
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore eliminazione" : "Delete failed"));
    }
  };

  if (loading) {
    return <div className="aif-card p-8 text-center text-[var(--aif-text-dim)]">{isIt ? "Caricamento..." : "Loading..."}</div>;
  }

  return (
    <div className="space-y-5">
      {/* Edit modal */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          isIt={isIt}
          onClose={() => setEditingUser(null)}
          onSaved={handleSaveUser}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">{isIt ? "Utenti Registrati" : "Registered Users"}</h2>
          <p className="text-[13px] text-[var(--aif-text-dim)] mt-1">
            {isIt ? `${users.length} utenti totali` : `${users.length} total users`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
            <input
              type="text"
              className="aif-input pl-9 !py-2 text-[13px] w-56"
              placeholder={isIt ? "Cerca nome, email…" : "Search name, email…"}
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="users-search"
            />
          </div>
          <select
            className="aif-input !py-2 text-[13px] w-24"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            data-testid="users-page-size"
          >
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} / {isIt ? "pag." : "page"}</option>)}
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={isIt ? "Totale utenti" : "Total users"} value={users.length} icon={Users}/>
        <StatCard label={isIt ? "Con tracciamento" : "With trace"} value={users.filter(u => u.trace).length} icon={BarChart3}/>
        <StatCard label={isIt ? "Email 24h inviate" : "24h emails sent"} value={users.filter(u => u.trace?.email_24h_sent).length} icon={Mail}/>
        <StatCard label={isIt ? "Email 50h inviate" : "50h emails sent"} value={users.filter(u => u.trace?.email_50h_sent).length} icon={CheckCircle2}/>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="aif-card p-8 text-center">
          <Users size={40} className="mx-auto text-[var(--aif-text-dim)] mb-3"/>
          <p className="text-[var(--aif-text-dim)]">{search ? (isIt ? "Nessun risultato." : "No results found.") : (isIt ? "Nessun utente registrato." : "No registered users yet.")}</p>
        </div>
      ) : (
        <div className="aif-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--aif-line)] text-[var(--aif-text-dim)] text-left">
                  <th className="p-3 font-medium">{isIt ? "Nome" : "Name"}</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium hidden md:table-cell">{isIt ? "Password" : "Password"}</th>
                  <th className="p-3 font-medium hidden lg:table-cell">{isIt ? "Nascita" : "DOB"}</th>
                  <th className="p-3 font-medium hidden lg:table-cell">{isIt ? "Registrato" : "Registered"}</th>
                  <th className="p-3 font-medium">{isIt ? "Tracciamento" : "Trace"}</th>
                  <th className="p-3 font-medium hidden md:table-cell">Email 24h</th>
                  <th className="p-3 font-medium hidden md:table-cell">Email 50h</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(u => (
                  <tr key={u.id} className="border-b border-[var(--aif-line)] hover:bg-white/[0.02]">
                    <td className="p-3">
                      <div className="font-semibold text-white">{u.first_name} {u.last_name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <LangBadge lang={u.lang}/>
                        {u.type === "guest" && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFB454]/15 text-[#FFB454] border border-[#FFB454]/30 uppercase tracking-wide">
                            Guest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 group">
                        <span className="text-[var(--aif-text-dim)] text-[12px]">{u.email}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(u.email); toast.success(isIt ? "Email copiata" : "Email copied"); }}
                          className="opacity-0 group-hover:opacity-100 transition p-1 text-[var(--aif-text-dim)] hover:text-[#5FE3C9]"
                          title={isIt ? "Copia email" : "Copy email"}
                        >
                          <Copy size={12}/>
                        </button>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {u.password ? (
                        <div className="flex items-center gap-1.5 group">
                          <span className="font-mono text-[11px] bg-[#0E1A36] border border-[var(--aif-line)] rounded px-2 py-0.5 text-[#FFB454] select-all">
                            {u.password.length > 30 ? u.password.slice(0, 30) + "…" : u.password}
                          </span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(u.password); toast.success(isIt ? "Password copiata" : "Password copied"); }}
                            className="opacity-0 group-hover:opacity-100 transition p-1 text-[var(--aif-text-dim)] hover:text-[#FFB454]"
                            title={isIt ? "Copia password" : "Copy password"}
                          >
                            <Copy size={12}/>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[var(--aif-text-dim)]">—</span>
                      )}
                    </td>
                    <td className="p-3 text-[var(--aif-text-dim)] text-[12px] hidden lg:table-cell">{u.date_of_birth || "—"}</td>
                    <td className="p-3 text-[var(--aif-text-dim)] text-[12px] hidden lg:table-cell">{fmtDate(u.created_at)}</td>
                    <td className="p-3">
                      {u.trace ? (
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            u.trace.status === "completed" ? "bg-[#4ADE80]/15 text-[#4ADE80]" : "bg-[#5FE3C9]/15 text-[#5FE3C9]"
                          }`}>
                            {u.trace.status === "completed" ? (isIt ? "Completato" : "Completed") : (isIt ? "Attivo" : "Active")}
                          </span>
                          {u.trace.located_amount && (
                            <div className="text-[10px] text-[#5FE3C9] mt-0.5">{fmtAmount(u.trace.located_amount)}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--aif-text-dim)] text-[11px]">{isIt ? "Nessuno" : "None"}</span>
                      )}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <EmailBadge sent={u.trace?.email_24h_sent} isIt={isIt}/>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <EmailBadge sent={u.trace?.email_50h_sent} isIt={isIt}/>
                    </td>
                    <td className="p-3">
                      {u.type !== "guest" ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-2 text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition"
                            title={isIt ? "Modifica" : "Edit"}
                            data-testid={`edit-user-btn-${u.id}`}
                          >
                            <Edit2 size={15}/>
                          </button>
                          <button
                            onClick={() => deleteUser(u)}
                            className="p-2 text-[var(--aif-text-dim)] hover:text-[#FF6B7A] transition"
                            title={isIt ? "Elimina utente" : "Delete user"}
                          >
                            <Trash2 size={15}/>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--aif-text-dim)] text-[10px] px-2">—</span>
                          <button
                            onClick={() => deleteUser(u)}
                            className="p-2 text-[var(--aif-text-dim)] hover:text-[#FF6B7A] transition"
                            title={isIt ? "Elimina tracciamento guest" : "Delete guest trace"}
                          >
                            <Trash2 size={15}/>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--aif-line)]">
              <div className="text-[12px] text-[var(--aif-text-dim)]">
                {isIt
                  ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} di ${filtered.length}`
                  : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 text-[var(--aif-text-dim)] hover:text-white disabled:opacity-30 transition"
                >
                  <ChevronLeft size={16}/>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 rounded text-[12px] transition ${pageNum === page ? "bg-[#5FE3C9] text-[#06122A] font-bold" : "text-[var(--aif-text-dim)] hover:text-white"}`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 text-[var(--aif-text-dim)] hover:text-white disabled:opacity-30 transition"
                >
                  <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LangBadge({ lang }) {
  const isEn = lang === "en";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
        isEn
          ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
          : "bg-[#5FE3C9]/10 text-[#5FE3C9] border border-[#5FE3C9]/30"
      }`}
    >
      {isEn ? "EN" : "IT"}
    </span>
  );
}

function EmailBadge({ sent, isIt }) {
  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#4ADE80]/15 text-[#4ADE80]">
        <CheckCircle2 size={10}/> {isIt ? "Inviata" : "Sent"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--aif-line)]/30 text-[var(--aif-text-dim)]">
      <Clock size={10}/> {isIt ? "In attesa" : "Pending"}
    </span>
  );
}


// ============================================================
//   USER EDIT MODAL
// ============================================================
function UserEditModal({ user, isIt, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    password: user.password || "",  // pre-fill existing plaintext password
    date_of_birth: user.date_of_birth || "",
    lang: user.lang || "it",
    located_amount: user.trace?.located_amount || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        email: form.email || undefined,
        date_of_birth: form.date_of_birth || undefined,
        lang: form.lang || undefined,
        password: form.password || undefined,  // always send (plaintext)
      };
      if (form.located_amount !== "" && form.located_amount !== null) {
        payload.located_amount = parseFloat(form.located_amount);
      }
      const { data } = await axios.put(`${API}/admin/registered-users/${user.id}`, payload, { headers: getAuthHeader() });
      toast.success(isIt ? "Utente aggiornato" : "User updated");
      onSaved(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore salvataggio" : "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="aif-card !bg-[#0E1A36] w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--aif-line)]">
          <div>
            <h3 className="text-white font-bold text-[15px]">{isIt ? "Modifica Utente" : "Edit User"}</h3>
            <p className="text-[12px] text-[var(--aif-text-dim)]">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--aif-text-dim)] hover:text-white"><X size={18}/></button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="aif-label">{isIt ? "Nome" : "First name"}</label>
              <input className="aif-input" value={form.first_name} onChange={set("first_name")} data-testid="edit-first"/>
            </div>
            <div>
              <label className="aif-label">{isIt ? "Cognome" : "Last name"}</label>
              <input className="aif-input" value={form.last_name} onChange={set("last_name")} data-testid="edit-last"/>
            </div>
          </div>

          <div>
            <label className="aif-label">Email</label>
            <input type="email" className="aif-input" value={form.email} onChange={set("email")} data-testid="edit-email"/>
          </div>

          <div>
            <label className="aif-label">{isIt ? "Password (visibile — testo in chiaro)" : "Password (visible — plaintext)"}</label>
            <input
              type="text"
              className="aif-input font-mono"
              value={form.password}
              onChange={set("password")}
              placeholder={isIt ? "Password utente" : "User password"}
              data-testid="edit-password"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="aif-label">{isIt ? "Data di nascita" : "Date of birth"}</label>
              <input type="date" className="aif-input" value={form.date_of_birth} onChange={set("date_of_birth")} data-testid="edit-dob"/>
            </div>
            <div>
              <label className="aif-label">{isIt ? "Lingua" : "Language"}</label>
              <select className="aif-input" value={form.lang} onChange={set("lang")} data-testid="edit-lang">
                <option value="it">🇮🇹 Italiano</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
          </div>

          {/* Located amount — only show if user has a trace */}
          {user.trace && (
            <div>
              <label className="aif-label">{isIt ? "Importo localizzato (€) — tracciamento" : "Located amount (€) — trace"}</label>
              <input
                type="number"
                step="0.01"
                className="aif-input"
                value={form.located_amount}
                onChange={set("located_amount")}
                placeholder="0.00"
                data-testid="edit-located-amount"
              />
              <p className="text-[11px] text-[var(--aif-text-dim)] mt-1">
                {isIt ? "Aggiorna l'importo sul tracciamento associato." : "Updates the amount on the linked trace."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--aif-line)]">
          <button onClick={onClose} className="aif-btn-ghost !py-2 !px-4 !text-sm">{isIt ? "Annulla" : "Cancel"}</button>
          <button onClick={save} disabled={saving} className="aif-btn-primary !py-2 !px-5 !text-sm inline-flex items-center gap-2 disabled:opacity-60" data-testid="edit-save">
            <Save size={14}/> {saving ? "…" : (isIt ? "Salva" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
