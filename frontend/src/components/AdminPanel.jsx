// AdminPanel — admin dashboard with Access Codes management and Traces auditing
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Settings, BarChart3, Plus, Edit2, Trash2, Save, X,
  Mail as MailIcon, ExternalLink, Wallet, Check, LogOut, FileText, Download,
  Calendar, DollarSign, Link2, Key, Copy, Eye, Image as ImageIcon, FileType,
  Loader2, ZoomIn, ZoomOut, AlertCircle
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
            <TabBtn active={tab === "codes"}    onClick={() => setTab("codes")}    icon={Key}       label={isIt ? "Codici Accesso" : "Access Codes"} testid="tab-codes"/>
          </div>

          {tab === "traces" && <TracesTab isIt={isIt}/>}
          {tab === "codes" && <AccessCodesTab isIt={isIt}/>}
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
function TracesTab({ isIt }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

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

  const formatAmount = (n) => `€ ${(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
                <th className="p-4 font-medium">{isIt ? "Codice" : "Code"}</th>
                <th className="p-4 font-medium">{isIt ? "Destinazione" : "Destination"}</th>
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
                      <span className="font-mono text-[#5FE3C9] text-[12px] font-bold">{trace.code_used || "—"}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-white text-[13px]">{trace.destination_name || "—"}</span>
                    </td>
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
                      <td colSpan={9} className="p-4">
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
      </div>

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
  //     iframe show a blank page when set as raw URL).
  //  2) Reuse the same blob for the download button, avoiding a second
  //     network round-trip.
  //
  // NOTE: we deliberately DO NOT revoke the blob URL inside this effect's
  // cleanup — React 18 StrictMode double-invokes effects in development,
  // and revoking the URL between the two runs kills the iframe load
  // (ERR_ABORTED). The URL is revoked exactly once, when the modal
  // unmounts, via the dedicated cleanup effect below.
  const blobUrlRef = React.useRef(null);
  useEffect(() => {
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
        // Revoke any previously-created preview URL for this modal instance
        // (only fires on doc.url change, not on StrictMode double-invoke).
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const newUrl = URL.createObjectURL(typed);
        blobUrlRef.current = newUrl;
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
      cancelled = true;
    };
  }, [doc.url, doc.mime_type]);

  // Revoke the blob URL only on real unmount (empty deps → runs once).
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      blobRef.current = null;
    };
  }, []);

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
