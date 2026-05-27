// AdminPanel — admin dashboard with Settings, Traces, and legacy Users/Requests
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users, Settings, BarChart3, Plus, Edit2, Trash2, Eye, EyeOff, Save, X,
  Mail as MailIcon, ExternalLink, Wallet, Check, LogOut, FileText, Download,
  Calendar, DollarSign, Link2, Key
} from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TIER_LABEL = {
  "5000_20000":   "€5,000 – €20,000",
  "20000_50000":  "€20,000 – €50,000",
  "50000_100000": "€50,000 – €100,000",
  "100000_plus":  "€100,000+",
};

// Helper to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem("aif_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const isIt = lang === "it";
  const [tab, setTab] = useState("traces");

  const isAdmin = user && user.role === "admin";

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
              <button onClick={() => { logout(); nav("/admin"); }} className="aif-btn-ghost !py-2 !px-3 !text-sm inline-flex items-center gap-1.5" data-testid="adm-logout">
                <LogOut size={14}/> <span className="hidden sm:inline">{isIt ? "Esci" : "Sign out"}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-5 lg:px-8 py-8 space-y-5">
          {/* Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <TabBtn active={tab === "traces"}   onClick={() => setTab("traces")}   icon={BarChart3} label={isIt ? "Tracciamenti" : "Traces"} testid="tab-traces"/>
            <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={Settings}  label={isIt ? "Impostazioni" : "Settings"} testid="tab-settings"/>
          </div>

          {tab === "traces" && <TracesTab isIt={isIt}/>}
          {tab === "settings" && <SettingsTab isIt={isIt}/>}
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
//   SETTINGS TAB
// ============================================================
function SettingsTab({ isIt }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [accessCode, setAccessCode] = useState("");
  const [destName, setDestName] = useState("");
  const [destUrl, setDestUrl] = useState("");

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/settings`, { headers: getAuthHeader() });
      setSettings(data);
      setAccessCode(data.access_code || "");
      setDestName(data.destination_name || "");
      setDestUrl(data.destination_url || "");
    } catch (e) {
      toast.error(isIt ? "Errore caricamento impostazioni" : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put(`${API}/admin/settings`, {
        access_code: accessCode.trim(),
        destination_name: destName.trim(),
        destination_url: destUrl.trim(),
      }, { headers: getAuthHeader() });
      setSettings(data);
      toast.success(isIt ? "Impostazioni salvate" : "Settings saved");
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore salvataggio" : "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="aif-card p-8 text-center text-[var(--aif-text-dim)]">{isIt ? "Caricamento..." : "Loading..."}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="aif-card p-6 md:p-8">
        <h2 className="text-xl font-bold text-white mb-6">{isIt ? "Impostazioni Globali" : "Global Settings"}</h2>
        
        <div className="space-y-5">
          {/* Access Code */}
          <div>
            <label className="aif-label flex items-center gap-2">
              <Key size={14} className="text-[#5FE3C9]"/>
              {isIt ? "Codice di Accesso" : "Access Code"}
            </label>
            <input 
              type="text" 
              className="aif-input font-mono tracking-wider text-lg"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="TRACE2026"
              data-testid="settings-code"
            />
            <p className="text-[11px] text-[var(--aif-text-dim)] mt-1">
              {isIt 
                ? "Questo codice è richiesto agli utenti per avviare un tracciamento. Può essere riutilizzato."
                : "This code is required for users to start a trace. It can be reused."}
            </p>
          </div>

          {/* Destination Name */}
          <div>
            <label className="aif-label flex items-center gap-2">
              <Wallet size={14} className="text-[#5FE3C9]"/>
              {isIt ? "Nome Destinazione" : "Destination Name"}
            </label>
            <input 
              type="text" 
              className="aif-input"
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
              placeholder="Zenthos Wallet"
              data-testid="settings-dest-name"
            />
            <p className="text-[11px] text-[var(--aif-text-dim)] mt-1">
              {isIt 
                ? "Il nome mostrato come destinazione dei fondi localizzati (es. Zenthos Wallet)."
                : "The name shown as the destination of located funds (e.g., Zenthos Wallet)."}
            </p>
          </div>

          {/* Destination URL */}
          <div>
            <label className="aif-label flex items-center gap-2">
              <Link2 size={14} className="text-[#5FE3C9]"/>
              {isIt ? "URL Destinazione" : "Destination URL"}
            </label>
            <input 
              type="url" 
              className="aif-input"
              value={destUrl}
              onChange={(e) => setDestUrl(e.target.value)}
              placeholder="https://zenthos-wallet.com"
              data-testid="settings-dest-url"
            />
            <p className="text-[11px] text-[var(--aif-text-dim)] mt-1">
              {isIt 
                ? "Il link al sito di recupero mostrato all'utente dopo il tracciamento."
                : "The link to the recovery site shown to the user after tracing."}
            </p>
          </div>

          {/* Save button */}
          <div className="pt-4">
            <button 
              onClick={save} 
              disabled={saving}
              className="aif-btn-primary inline-flex items-center gap-2"
              data-testid="settings-save"
            >
              <Save size={16}/> {saving ? (isIt ? "Salvataggio..." : "Saving...") : (isIt ? "Salva Impostazioni" : "Save Settings")}
            </button>
          </div>
        </div>
      </div>

      {/* Current settings preview */}
      <div className="aif-card p-6">
        <h3 className="text-sm font-semibold text-[#5FE3C9] mb-3">{isIt ? "Anteprima Attuale" : "Current Preview"}</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="aif-card !rounded-lg p-3">
            <div className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wider">{isIt ? "Codice" : "Code"}</div>
            <div className="text-white font-mono font-bold mt-1">{settings?.access_code || "—"}</div>
          </div>
          <div className="aif-card !rounded-lg p-3">
            <div className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wider">{isIt ? "Destinazione" : "Destination"}</div>
            <div className="text-white font-semibold mt-1">{settings?.destination_name || "—"}</div>
          </div>
          <div className="aif-card !rounded-lg p-3">
            <div className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wider">URL</div>
            <div className="text-[#5FE3C9] text-sm mt-1 truncate">{settings?.destination_url || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   TRACES TAB
// ============================================================
function TracesTab({ isIt }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

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

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(isIt ? "it-IT" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const formatAmount = (n) => `€ ${(n || 0).toLocaleString("it-IT")}`;

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
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          label={isIt ? "Totale Tracciamenti" : "Total Traces"} 
          value={traces.length}
          icon={BarChart3}
        />
        <StatCard 
          label={isIt ? "Completati" : "Completed"} 
          value={traces.filter(t => t.status === "completed").length}
          icon={Check}
        />
        <StatCard 
          label={isIt ? "Importo Totale" : "Total Amount"} 
          value={formatAmount(traces.reduce((sum, t) => sum + (t.located_amount || 0), 0))}
          icon={DollarSign}
        />
        <StatCard 
          label={isIt ? "Con Documenti" : "With Documents"} 
          value={traces.filter(t => t.documents?.length > 0).length}
          icon={FileText}
        />
      </div>

      {/* Traces list */}
      <div className="aif-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--aif-line)] text-[var(--aif-text-dim)] text-left">
                <th className="p-4 font-medium">{isIt ? "Nome" : "Name"}</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">{isIt ? "Importo" : "Amount"}</th>
                <th className="p-4 font-medium">{isIt ? "Documenti" : "Docs"}</th>
                <th className="p-4 font-medium">{isIt ? "Data" : "Date"}</th>
                <th className="p-4 font-medium">{isIt ? "Stato" : "Status"}</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {traces.map(trace => (
                <React.Fragment key={trace.id}>
                  <tr className="border-b border-[var(--aif-line)] hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div className="font-semibold text-white">{trace.first_name} {trace.last_name}</div>
                      <div className="text-[11px] text-[var(--aif-text-dim)]">{TIER_LABEL[trace.amount_tier] || trace.amount_tier}</div>
                    </td>
                    <td className="p-4 text-[var(--aif-text-dim)]">{trace.email}</td>
                    <td className="p-4">
                      <span className="font-bold text-[#5FE3C9]">{formatAmount(trace.located_amount)}</span>
                    </td>
                    <td className="p-4">
                      {trace.documents?.length > 0 ? (
                        <button 
                          onClick={() => setExpandedId(expandedId === trace.id ? null : trace.id)}
                          className="inline-flex items-center gap-1 text-[#5FE3C9] hover:underline"
                        >
                          <FileText size={14}/> {trace.documents.length}
                        </button>
                      ) : (
                        <span className="text-[var(--aif-text-dim)]">—</span>
                      )}
                    </td>
                    <td className="p-4 text-[var(--aif-text-dim)] text-[12px]">
                      {formatDate(trace.created_at)}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${
                        trace.status === "completed" 
                          ? "bg-[#4ADE80]/15 text-[#4ADE80]" 
                          : "bg-[#FFB454]/15 text-[#FFB454]"
                      }`}>
                        {trace.status === "completed" ? (isIt ? "Completato" : "Completed") : (isIt ? "In corso" : "In progress")}
                      </span>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => deleteTrace(trace.id)}
                        className="p-2 text-[var(--aif-text-dim)] hover:text-[#FF6B7A] transition"
                        title={isIt ? "Elimina" : "Delete"}
                      >
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded documents row */}
                  {expandedId === trace.id && trace.documents?.length > 0 && (
                    <tr className="bg-[#0E1A36]">
                      <td colSpan={7} className="p-4">
                        <div className="text-[11px] uppercase tracking-wider text-[#5FE3C9] mb-3">
                          {isIt ? "Documenti caricati" : "Uploaded documents"}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                          {trace.documents.map(doc => (
                            <div key={doc.id} className="aif-card !p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText size={16} className="text-[var(--aif-text-dim)]"/>
                                <span className="text-[12px] text-white truncate flex-1">{doc.original_name}</span>
                              </div>
                              <div className="text-[10px] text-[var(--aif-text-dim)] mb-2">
                                {(doc.size_bytes / 1024).toFixed(1)} KB
                              </div>
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-[#5FE3C9] hover:underline"
                              >
                                <Download size={12}/> {isIt ? "Scarica" : "Download"}
                              </a>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
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
