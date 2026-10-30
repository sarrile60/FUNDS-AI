// AdminPanel — admin dashboard with Access Codes management and Traces auditing
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Settings, BarChart3, Plus, Edit2, Trash2, Save, X,
  Mail as MailIcon, ExternalLink, Wallet, Check, LogOut, FileText, Download,
  Calendar, DollarSign, Link2, Key, Copy, Eye, EyeOff, Image as ImageIcon, FileType,
  Loader2, ZoomIn, ZoomOut, AlertCircle, Users, Search, ChevronLeft, ChevronRight,
  Phone, CheckCircle2, Clock, Mail, Globe, Bell, BellRing, Filter, UserPlus, Lock
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

  // ── Auto-migrate names to title case on first admin load ──
  useEffect(() => {
    const token = localStorage.getItem("aif_token");
    if (!token) return;
    axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/api/admin/migrate-title-case`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(res => {
      const { users_fixed, traces_fixed } = res.data;
      if (users_fixed > 0 || traces_fixed > 0) {
        console.log(`[AdminPanel] Title-case migration: ${users_fixed} users, ${traces_fixed} traces fixed`);
      }
    }).catch(() => { /* silent — non-critical */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notification bell state ──
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifyPrefs, setNotifyPrefs] = useState({ h24: true, h50: true });

  // Ref mirror of notifyPrefs so checkThresholds has EMPTY deps (no loop)
  const notifyPrefsRef = useRef({ h24: true, h50: true });
  useEffect(() => { notifyPrefsRef.current = notifyPrefs; }, [notifyPrefs]);

  // Tracks which trace/threshold combos have already been shown
  // Persisted in localStorage so they survive page refreshes
  const notifiedRef = useRef(new Set(
    JSON.parse(localStorage.getItem("tf_admin_notified") || "[]")
  ));

  // TRUE on the very first poll — used to suppress browser OS notifications
  // for events that already happened before admin opened the page
  const isFirstPollRef = useRef(true);

  const persistNotified = useCallback((key) => {
    notifiedRef.current.add(key);
    try {
      localStorage.setItem("tf_admin_notified", JSON.stringify([...notifiedRef.current]));
    } catch { /* quota full */ }
  }, []);

  // Stable callback — EMPTY deps so it's created once and never recreated
  // Uses refs for all dynamic values (notifyPrefsRef, notifiedRef, isFirstPollRef)
  const checkThresholds = useCallback(async () => {
    try {
      const token = localStorage.getItem("aif_token");
      if (!token) return;
      const { data: traces } = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/traces`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const firstPoll = isFirstPollRef.current;
      // Mark first poll as done BEFORE processing so concurrent calls don't double-fire
      isFirstPollRef.current = false;

      traces.forEach(trace => {
        const label = `${trace.first_name} ${trace.last_name}`;

        // ── 24h: trigger when the backend has sent the 24h email ──
        const key24 = `${trace.id}_24h`;
        if (
          notifyPrefsRef.current.h24 &&
          trace.email_24h_sent &&
          !notifiedRef.current.has(key24)
        ) {
          persistNotified(key24);
          const msg = isIt
            ? `${label} — email 24h inviata al cliente`
            : `${label} — 24h email sent to client`;
          // On first load: add to bell but as already-read (no spam, no OS notification)
          // On subsequent polls: add as unread + fire OS notification
          setNotifications(prev => [{
            id: key24, msg, type: "24h",
            time: trace.email_24h_sent_at
              ? new Date(trace.email_24h_sent_at).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            read: false, // always unread so bell count reflects what happened while away
          }, ...prev.slice(0, 49)]);
          if (!firstPoll) {
            setUnread(u => u + 1);
            // OS notification only for live events (not historical spam)
            if (Notification.permission === "granted") {
              try { new Notification("Traccia Fondi — 24h", { body: msg, icon: "/favicon.ico" }); } catch (err) { /* unsupported */ }
            }
          } else {
            // Historical: increment unread count so admin sees badge on return
            setUnread(u => u + 1);
          }
        }

        // ── 50h: trigger when the backend has sent the 50h email ──
        const key50 = `${trace.id}_50h`;
        if (
          notifyPrefsRef.current.h50 &&
          trace.email_50h_sent &&
          !notifiedRef.current.has(key50)
        ) {
          persistNotified(key50);
          const msg = isIt
            ? `${label} — email 50h inviata (fondi localizzati)`
            : `${label} — 50h email sent (funds located)`;
          setNotifications(prev => [{
            id: key50, msg, type: "50h",
            time: trace.email_50h_sent_at
              ? new Date(trace.email_50h_sent_at).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            read: false, // always unread
          }, ...prev.slice(0, 49)]);
          if (!firstPoll) {
            setUnread(u => u + 1);
            if (Notification.permission === "granted") {
              try { new Notification("Traccia Fondi — 50h", { body: msg, icon: "/favicon.ico" }); } catch (err) { /* unsupported */ }
            }
          } else {
            // Historical: still increment unread count
            setUnread(u => u + 1);
          }
        }
      });
    } catch { /* silent fail — polling */ }
  }, []); // ← EMPTY: never recreated, no loop possible

  useEffect(() => {
    if (Notification.permission === "default") Notification.requestPermission();
    checkThresholds(); // immediate first poll (historical, no OS notifications)
    const id = setInterval(checkThresholds, 60000); // live polling every 60s
    return () => clearInterval(id);
  }, [checkThresholds]); // checkThresholds never changes → runs once only

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };
  const togglePref = (key) => setNotifyPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  if (!user) return <Navigate to="/login" replace/>;
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
              >
                <Globe size={13}/> {lang.toUpperCase()}
              </button>

              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={() => { setBellOpen(!bellOpen); if (!bellOpen) { setUnread(0); setNotifications(prev => prev.map(n=>({...n,read:true}))); } }}
                  className="relative p-2 text-[var(--aif-text-dim)] hover:text-white transition"
                  title={isIt ? "Notifiche" : "Notifications"}
                >
                  {unread > 0 ? <BellRing size={18} className="text-[#FFB454]"/> : <Bell size={18}/>}
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FFB454] text-[#06122A] text-[9px] font-black flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 top-10 w-84 aif-card !rounded-xl shadow-2xl z-50 border border-[var(--aif-line)] overflow-hidden" style={{width:"340px"}}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-[var(--aif-line)]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[13px] font-semibold text-white">{isIt ? "Notifiche" : "Notifications"}</span>
                        <button onClick={markAllRead} className="text-[11px] text-[#5FE3C9] hover:underline">{isIt ? "Segna tutte lette" : "Mark all read"}</button>
                      </div>
                      {/* Preference toggles */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[var(--aif-text-dim)]">{isIt ? "Notifica per:" : "Notify for:"}</span>
                        <button
                          onClick={() => togglePref("h24")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${notifyPrefs.h24 ? "bg-[#FFB454]/20 text-[#FFB454] border-[#FFB454]/40" : "border-[var(--aif-line)] text-[var(--aif-text-dim)]"}`}
                        >
                          {notifyPrefs.h24 ? "✓" : ""} 24h
                        </button>
                        <button
                          onClick={() => togglePref("h50")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${notifyPrefs.h50 ? "bg-[#FF6B7A]/20 text-[#FF6B7A] border-[#FF6B7A]/40" : "border-[var(--aif-line)] text-[var(--aif-text-dim)]"}`}
                        >
                          {notifyPrefs.h50 ? "✓" : ""} 50h
                        </button>
                      </div>
                    </div>
                    {/* Notification list */}
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[12px] text-[var(--aif-text-dim)]">
                          {isIt ? "Nessuna notifica ancora" : "No notifications yet"}
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id + n.time} className={`px-4 py-3 border-b border-[var(--aif-line)] ${n.read ? "opacity-50" : n.type === "50h" ? "bg-[#FF6B7A]/5" : "bg-[#FFB454]/5"}`}>
                          <div className="flex items-start gap-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 mt-0.5 ${n.type === "50h" ? "bg-[#FF6B7A]/20 text-[#FF6B7A]" : "bg-[#FFB454]/20 text-[#FFB454]"}`}>
                              {n.type || "50h"}
                            </span>
                            <div>
                              <p className="text-[12px] text-white leading-snug">{n.msg}</p>
                              <p className="text-[10px] text-[var(--aif-text-dim)] mt-0.5">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
            <TabBtn active={tab === "agents"}   onClick={() => setTab("agents")}   icon={UserPlus}  label={isIt ? "Agenti" : "Agents"} testid="tab-agents"/>
            <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={Settings}  label={isIt ? "Impostazioni" : "Settings"} testid="tab-settings"/>
          </div>

          {tab === "traces" && <TracesTab isIt={isIt}/>}
          {tab === "codes" && <AccessCodesTab isIt={isIt}/>}
          {tab === "users" && <RegisteredUsersTab isIt={isIt}/>}
          {tab === "agents" && <AgentsTab isIt={isIt}/>}
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
// Stops when 50h email has been sent (procedure complete)
function ElapsedCell({ createdAt, email50hSent, feePaid }) {
  const [elapsed, setElapsed] = useState(() => {
    const ms = Date.now() - new Date(createdAt).getTime();
    return ms > 0 ? Math.floor(ms / 1000) : 0;
  });
  useEffect(() => {
    // If 50h email already sent, no need to tick
    if (email50hSent) return;
    const ms = Date.now() - new Date(createdAt).getTime();
    const initial = ms > 0 ? Math.floor(ms / 1000) : 0;
    setElapsed(initial);
    const id = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [createdAt, email50hSent]);

  // Once 50h email sent → show static "Done" state, stop timer
  if (email50hSent) {
    // Still show how long it took (frozen)
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    const frozen = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    return (
      <div>
        <span className="font-mono text-[12px] font-bold tabular-nums text-[var(--aif-text-dim)]">{frozen}</span>
        <div className="mt-0.5">
          {feePaid ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30">
              ✓ Pagato
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#6E8BFF]/15 text-[#6E8BFF] border border-[#6E8BFF]/30">
              ✓ Done
            </span>
          )}
        </div>
      </div>
    );
  }

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

// ============================================================
//   SORT HEADER — reusable clickable column header with ASC/DESC arrows
// ============================================================
function SortHeader({ label, col, sortCol, sortDir, onSort }) {
  const active = sortCol === col;
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 group whitespace-nowrap transition ${active ? "text-white" : "text-[var(--aif-text-dim)] hover:text-white"}`}
    >
      {label}
      <span className="flex flex-col leading-none ml-0.5">
        <span className={`text-[8px] leading-none ${active && sortDir === "asc" ? "text-[#5FE3C9]" : "opacity-30"}`}>▲</span>
        <span className={`text-[8px] leading-none ${active && sortDir === "desc" ? "text-[#5FE3C9]" : "opacity-30"}`}>▼</span>
      </span>
    </button>
  );
}


function TracesTab({ isIt }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [markingFee, setMarkingFee] = useState(null);
  const [sending24h, setSending24h] = useState(null);
  const [sending50h, setSending50h] = useState(null);
  const [forcingFee, setForcingFee] = useState(null);
  const [simulating, setSimulating] = useState(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all"); // "all" | "24h" | "50h"
  const [dateFrom, setDateFrom] = useState("");  // YYYY-MM-DD
  const [dateTo, setDateTo] = useState("");
  const [destFilter, setDestFilter] = useState("all"); // "all" | dest name
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [editingEmailId, setEditingEmailId] = useState(null);
  const [editingEmailVal, setEditingEmailVal] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

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

  const send50hEmail = async (traceId) => {
    if (!window.confirm(isIt ? "Inviare email fondi localizzati (50h) ora? Verrà inviata anche se già inviata in precedenza." : "Send funds-located (50h) email now? It will send even if already sent before.")) return;
    setSending50h(traceId);
    try {
      const { data } = await axios.post(`${API}/admin/traces/${traceId}/send-50h-email`, {}, { headers: getAuthHeader() });
      setTraces(prev => prev.map(t => t.id === traceId ? { ...t, ...data } : t));
      toast.success(isIt ? "Email 50h fondi localizzati inviata" : "50h funds-located email sent");
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore invio" : "Send error"));
    } finally {
      setSending50h(null);
    }
  };

  const forceFee = async (traceId) => {
    if (!window.confirm(isIt ? "Forzare quota €100 come pagata (anche se già pagata) e reinviare email di conferma?" : "Force €100 fee as paid (even if already paid) and resend confirmation email?")) return;
    setForcingFee(traceId);
    try {
      const { data } = await axios.post(`${API}/admin/traces/${traceId}/mark-fee-paid`, {}, { headers: getAuthHeader() });
      setTraces(prev => prev.map(t => t.id === traceId ? { ...t, ...data } : t));
      toast.success(isIt ? "Quota forzata — email di conferma reinviata" : "Fee forced — confirmation email resent");
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore" : "Error"));
    } finally {
      setForcingFee(null);
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
    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchText = (
        (t.first_name || "").toLowerCase().includes(q) ||
        (t.last_name || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.code_used || "").toLowerCase().includes(q) ||
        (t.destination_name || "").toLowerCase().includes(q)
      );
      if (!matchText) return false;
    }
    // Elapsed filter
    if (filter !== "all" && t.created_at) {
      const hours = (Date.now() - new Date(t.created_at).getTime()) / 1000 / 3600;
      if (filter === "24h" && hours < 24) return false;
      if (filter === "50h" && hours < 50) return false;
    }
    // Date range filter
    if (dateFrom && t.created_at) {
      if (new Date(t.created_at) < new Date(dateFrom)) return false;
    }
    if (dateTo && t.created_at) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      if (new Date(t.created_at) > to) return false;
    }
    // Destination filter
    if (destFilter !== "all") {
      if ((t.destination_name || "").toLowerCase() !== destFilter.toLowerCase()) return false;
    }
    return true;
  });

  // Get unique destinations for filter dropdown
  const destinations = [...new Set(traces.map(t => t.destination_name).filter(Boolean))].sort();

  // Reset page when any filter changes
  useEffect(() => { setPage(0); }, [search, filter, dateFrom, dateTo, destFilter, sortCol, sortDir]);

  // Sort helpers
  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sorted = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortCol === "name") { av = `${a.first_name} ${a.last_name}`.toLowerCase(); bv = `${b.first_name} ${b.last_name}`.toLowerCase(); }
    else if (sortCol === "email") { av = (a.email || "").toLowerCase(); bv = (b.email || "").toLowerCase(); }
    else if (sortCol === "amount") { av = a.located_amount || 0; bv = b.located_amount || 0; }
    else if (sortCol === "created_at") { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
    else if (sortCol === "elapsed") { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
    else { av = a[sortCol] || ""; bv = b[sortCol] || ""; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

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
      {/* Header with search + filters + page size */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
            <input
              type="text"
              className="aif-input pl-9 !py-2 text-[13px] w-72"
              placeholder={isIt ? "Cerca nome, email, codice…" : "Search name, email, code…"}
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="traces-search"
            />
          </div>
          {/* Elapsed filters */}
          <div className="flex items-center gap-1 border border-[var(--aif-line)] rounded-xl p-1">
            {[
              { key: "all", label: isIt ? "Tutti" : "All" },
              { key: "24h", label: "24h+" },
              { key: "50h", label: "50h+" },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                  filter === f.key
                    ? f.key === "50h" ? "bg-[#FF6B7A]/20 text-[#FF6B7A]" : f.key === "24h" ? "bg-[#FFB454]/20 text-[#FFB454]" : "bg-[#5FE3C9]/15 text-[#5FE3C9]"
                    : "text-[var(--aif-text-dim)] hover:text-white"
                }`}>{f.label}</button>
            ))}
          </div>
          {/* Destination filter */}
          <select
            className="aif-input !py-2 text-[12px] w-40"
            value={destFilter}
            onChange={e => setDestFilter(e.target.value)}
          >
            <option value="all">{isIt ? "Tutte le dest." : "All destinations"}</option>
            {destinations.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--aif-text-dim)]">{isIt ? "Dal" : "From"}</span>
            <input type="date" className="aif-input !py-1.5 text-[12px] w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
            <span className="text-[11px] text-[var(--aif-text-dim)]">{isIt ? "al" : "to"}</span>
            <input type="date" className="aif-input !py-1.5 text-[12px] w-36" value={dateTo} onChange={e => setDateTo(e.target.value)}/>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-[11px] text-[#FF6B7A] hover:underline px-1">✕</button>
            )}
          </div>
          <select className="aif-input !py-2 text-[13px] w-28" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}>
            {[20, 50, 100].map(s => <option key={s} value={s}>{s} / {isIt ? "pag." : "page"}</option>)}
          </select>
        </div>
        <div className="text-[12px] text-[var(--aif-text-dim)]">
          {sorted.length} {isIt ? "risultati" : "results"}
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
      {sorted.length === 0 ? (
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
                <th className="px-3 py-3 font-medium text-[12px]"><SortHeader label={isIt ? "Nome" : "Name"} col="name" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                <th className="px-3 py-3 font-medium text-[12px]"><SortHeader label="Email" col="email" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                <th className="px-3 py-3 font-medium text-[12px]">{isIt ? "Cod." : "Code"}</th>
                <th className="px-3 py-3 font-medium text-[12px]">{isIt ? "Dest." : "Dest."}</th>
                <th className="px-3 py-3 font-medium text-[12px] whitespace-nowrap"><SortHeader label={isIt ? "Importo" : "Amount"} col="amount" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                <th className="px-3 py-3 font-medium text-[12px]"><SortHeader label="Elapsed" col="elapsed" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                <th className="px-3 py-3 font-medium text-[12px]">{isIt ? "Doc" : "Doc"}</th>
                <th className="px-3 py-3 font-medium text-[12px] whitespace-nowrap"><SortHeader label={isIt ? "Data" : "Date"} col="created_at" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
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
                      <div className="flex items-center gap-1.5">
                        <div className="font-semibold text-white text-[12px]">{trace.first_name} {trace.last_name}</div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${trace.first_name} ${trace.last_name}`); toast.success("Name copied"); }}
                          className="p-0.5 text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition shrink-0"
                          title="Copy name"
                        ><Copy size={11}/></button>
                      </div>
                      <div className="text-[10px] text-[var(--aif-text-dim)]">{TIER_LABEL[trace.amount_tier] || trace.amount_tier}</div>
                    </td>
                    <td className="px-3 py-3 min-w-[180px]">
                      {editingEmailId === trace.id ? (
                        // Inline email editor
                        <div className="flex items-center gap-1">
                          <input
                            type="email"
                            className="aif-input !py-1 !px-2 text-[11px] flex-1 min-w-0"
                            value={editingEmailVal}
                            onChange={e => setEditingEmailVal(e.target.value)}
                            onKeyDown={async e => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (!editingEmailVal.trim()) return;
                                setSavingEmail(true);
                                try {
                                  const { data } = await axios.put(`${API}/admin/traces/${trace.id}/update-email`, { email: editingEmailVal.trim() }, { headers: getAuthHeader() });
                                  setTraces(prev => prev.map(t => t.id === trace.id ? { ...t, email: data.email } : t));
                                  toast.success(isIt ? "Email aggiornata" : "Email updated");
                                  setEditingEmailId(null);
                                } catch (err) {
                                  toast.error(err?.response?.data?.detail || (isIt ? "Errore aggiornamento email" : "Failed to update email"));
                                } finally { setSavingEmail(false); }
                              }
                              if (e.key === "Escape") setEditingEmailId(null);
                            }}
                            autoFocus
                            data-testid={`edit-email-input-${trace.id}`}
                          />
                          <button
                            disabled={savingEmail}
                            onClick={async () => {
                              if (!editingEmailVal.trim()) return;
                              setSavingEmail(true);
                              try {
                                const { data } = await axios.put(`${API}/admin/traces/${trace.id}/update-email`, { email: editingEmailVal.trim() }, { headers: getAuthHeader() });
                                setTraces(prev => prev.map(t => t.id === trace.id ? { ...t, email: data.email } : t));
                                toast.success(isIt ? "Email aggiornata — ora puoi re-inviare le email mancanti" : "Email updated — you can now resend missed emails");
                                setEditingEmailId(null);
                              } catch (err) {
                                toast.error(err?.response?.data?.detail || (isIt ? "Errore" : "Error"));
                              } finally { setSavingEmail(false); }
                            }}
                            className="p-1 text-[#4ADE80] hover:text-white transition shrink-0"
                            title={isIt ? "Salva" : "Save"}
                          >
                            {savingEmail ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>}
                          </button>
                          <button
                            onClick={() => setEditingEmailId(null)}
                            className="p-1 text-[var(--aif-text-dim)] hover:text-[#FF6B7A] transition shrink-0"
                            title={isIt ? "Annulla" : "Cancel"}
                          >
                            <X size={12}/>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--aif-text-dim)] text-[11px]">{trace.email}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(trace.email); toast.success("Email copied"); }}
                            className="p-0.5 text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition shrink-0"
                            title="Copy email"
                          ><Copy size={11}/></button>
                          <button
                            onClick={() => { setEditingEmailId(trace.id); setEditingEmailVal(trace.email); }}
                            className="p-0.5 text-[var(--aif-text-dim)] hover:text-[#FFB454] transition shrink-0"
                            title={isIt ? "Modifica email" : "Edit email"}
                            data-testid={`edit-email-btn-${trace.id}`}
                          ><Edit2 size={11}/></button>
                        </div>
                      )}
                    </td>
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
                        ? <ElapsedCell createdAt={trace.created_at} email50hSent={trace.email_50h_sent} feePaid={trace.fee_paid}/>
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
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1.5 min-w-[160px]">

                        {/* ── Group 1: Send emails / mark fee ── */}
                        <div className="rounded-lg border border-[#5FE3C9]/20 bg-[#5FE3C9]/5 px-2 py-1.5">
                          <p className="text-[8px] uppercase tracking-widest text-[#5FE3C9]/60 mb-1.5 flex items-center gap-1">
                            <MailIcon size={8}/> {isIt ? "Azioni" : "Actions"}
                          </p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              onClick={() => send24hEmail(trace.id)}
                              disabled={sending24h === trace.id}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-[#5FE3C9]/40 text-[#5FE3C9] text-[10px] font-medium hover:bg-[#5FE3C9]/10 transition disabled:opacity-50 whitespace-nowrap"
                              title={isIt ? "Forza invio email 24h" : "Force send 24h email"}
                              data-testid={`send-24h-btn-${trace.id}`}
                            >
                              {sending24h === trace.id ? "…" : "📧 24h"}
                            </button>
                            <button
                              onClick={() => send50hEmail(trace.id)}
                              disabled={sending50h === trace.id}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-[#FF6B7A]/40 text-[#FF6B7A] text-[10px] font-medium hover:bg-[#FF6B7A]/10 transition disabled:opacity-50 whitespace-nowrap"
                              title={isIt ? "Forza invio email 50h" : "Force send 50h email"}
                              data-testid={`send-50h-btn-${trace.id}`}
                            >
                              {sending50h === trace.id ? "…" : "📧 51h"}
                            </button>
                            {/* ⏩Fee (force) lives in Azioni group */}
                            <button
                              onClick={() => forceFee(trace.id)}
                              disabled={forcingFee === trace.id}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-[#4ADE80]/40 text-[#4ADE80] text-[10px] font-medium hover:bg-[#4ADE80]/10 transition disabled:opacity-50 whitespace-nowrap"
                              title={isIt ? "Forza quota €100 e reinvia email" : "Force €100 fee and resend email"}
                              data-testid={`force-fee-btn-${trace.id}`}
                            >
                              {forcingFee === trace.id ? "…" : "⏩Fee"}
                            </button>
                          </div>
                        </div>

                        {/* ── Group 2: Force / time simulations ── */}
                        <div className="rounded-lg border border-[#FFB454]/20 bg-[#FFB454]/5 px-2 py-1.5">
                          <p className="text-[8px] uppercase tracking-widest text-[#FFB454]/60 mb-1.5 flex items-center gap-1">
                            <Clock size={8}/> {isIt ? "Simula" : "Simulate"}
                          </p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              onClick={() => simulateHours(trace.id, 25)}
                              disabled={simulating === trace.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded border border-[#FFB454]/40 text-[#FFB454] text-[10px] hover:bg-[#FFB454]/10 transition disabled:opacity-50 whitespace-nowrap"
                              title={isIt ? "Simula 25h fa" : "Simulate 25h ago"}
                              data-testid={`sim-25h-btn-${trace.id}`}
                            >⏩25h</button>
                            <button
                              onClick={() => simulateHours(trace.id, 51)}
                              disabled={simulating === trace.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded border border-[#FF6B7A]/40 text-[#FF6B7A] text-[10px] hover:bg-[#FF6B7A]/10 transition disabled:opacity-50 whitespace-nowrap"
                              title={isIt ? "Simula 51h fa" : "Simulate 51h ago"}
                              data-testid={`sim-51h-btn-${trace.id}`}
                            >⏩51h</button>
                            {/* Fee ✓ (regular mark) lives in Simula group */}
                            {trace.fee_paid ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#4ADE80]/15 text-[#4ADE80] whitespace-nowrap">
                                <Check size={9}/> {isIt ? "Pagato" : "Paid"}
                              </span>
                            ) : (
                              <button
                                onClick={() => markFeePaid(trace.id)}
                                disabled={markingFee === trace.id}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#4ADE80]/50 text-[#4ADE80] text-[10px] font-medium hover:bg-[#4ADE80]/10 transition disabled:opacity-50 whitespace-nowrap"
                                data-testid={`fee-paid-btn-${trace.id}`}
                              >
                                {markingFee === trace.id ? "…" : "Fee ✓"}
                              </button>
                            )}
                          </div>
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
                ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)} di ${sorted.length}`
                : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)} of ${sorted.length}`}
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
  const [editingUser, setEditingUser] = useState(null);
  const [feeFilter, setFeeFilter] = useState("all");
  const [uniswapFilter, setUniswapFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  // Uniswap modal state
  const [uniswapTarget, setUniswapTarget] = useState(null);
  const [agents, setAgents] = useState([]);

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

  const loadAgents = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/agents`, { headers: getAuthHeader() });
      // Also get passwords for each agent
      const withPw = await Promise.all(data.map(async a => {
        try {
          const pw = await axios.get(`${API}/admin/agents/${a.id}/password`, { headers: getAuthHeader() });
          return { ...a, password: pw.data.password };
        } catch { return a; }
      }));
      setAgents(withPw);
    } catch { /* silent */ }
  };

  useEffect(() => { load(); loadAgents(); }, []);

  // Client-side filter
  const filtered = users.filter(u => {
    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchText = (
        (u.first_name || "").toLowerCase().includes(q) ||
        (u.last_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q)
      );
      if (!matchText) return false;
    }
    // Fee filter
    if (feeFilter === "paid" && !u.trace?.fee_paid) return false;
    if (feeFilter === "unpaid" && u.trace?.fee_paid) return false;
    // Uniswap filter
    if (uniswapFilter === "registered" && !u.trace?.uniswap_account_created) return false;
    if (uniswapFilter === "not_registered" && u.trace?.uniswap_account_created) return false;
    // Email verified filter (guests are excluded from verified/unverified since they have no account)
    if (verifiedFilter === "verified" && (u.type === "guest" || !u.email_verified)) return false;
    if (verifiedFilter === "unverified" && (u.type === "guest" || u.email_verified)) return false;
    // Date range filter (by registration date)
    if (dateFrom && u.created_at) {
      if (new Date(u.created_at) < new Date(dateFrom)) return false;
    }
    if (dateTo && u.created_at) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      if (new Date(u.created_at) > to) return false;
    }
    return true;
  });

  // Sort helpers
  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sorted = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortCol === "name") { av = `${a.first_name} ${a.last_name}`.toLowerCase(); bv = `${b.first_name} ${b.last_name}`.toLowerCase(); }
    else if (sortCol === "email") { av = (a.email || "").toLowerCase(); bv = (b.email || "").toLowerCase(); }
    else if (sortCol === "dob") { av = a.date_of_birth || ""; bv = b.date_of_birth || ""; }
    else if (sortCol === "created_at") { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
    else if (sortCol === "amount") { av = a.trace?.located_amount || 0; bv = b.trace?.located_amount || 0; }
    else if (sortCol === "agent") { av = (a.assigned_agent_username || "").toLowerCase(); bv = (b.assigned_agent_username || "").toLowerCase(); }
    else if (sortCol === "uniswap") {
      // 2=Creato, 1=available (fee paid), 0=not available (no fee), -1=no trace
      const score = (u) => !u.trace ? -1 : u.trace.uniswap_account_created ? 2 : u.trace.fee_paid ? 1 : 0;
      av = score(a); bv = score(b);
    }
    else { av = a[sortCol] || ""; bv = b[sortCol] || ""; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => { setPage(0); }, [search, feeFilter, uniswapFilter, verifiedFilter, dateFrom, dateTo, sortCol, sortDir]);

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
      {/* Uniswap account creation modal */}
      {uniswapTarget && (
        <CreateUniswapModal
          user={uniswapTarget}
          agents={agents}
          isIt={isIt}
          onClose={() => setUniswapTarget(null)}
          onSuccess={(traceId) => {
            setUsers(prev => prev.map(u =>
              u.trace?.id === traceId
                ? { ...u, trace: { ...u.trace, uniswap_account_created: true } }
                : u
            ));
            setUniswapTarget(null);
          }}
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
          {/* Fee filter */}
          <div className="flex items-center gap-1 border border-[var(--aif-line)] rounded-xl p-1">
            {[
              { key: "all",    label: isIt ? "Tutti" : "All" },
              { key: "paid",   label: isIt ? "Pagato ✓" : "Paid ✓" },
              { key: "unpaid", label: isIt ? "Non pagato" : "Unpaid" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFeeFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                  feeFilter === f.key
                    ? f.key === "paid" ? "bg-[#4ADE80]/20 text-[#4ADE80]" : f.key === "unpaid" ? "bg-[#FFB454]/20 text-[#FFB454]" : "bg-[#5FE3C9]/15 text-[#5FE3C9]"
                    : "text-[var(--aif-text-dim)] hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Uniswap filter */}
          <div className="flex items-center gap-1 border border-[var(--aif-line)] rounded-xl p-1">
            {[
              { key: "all",           label: isIt ? "Uniswap: tutti" : "Uniswap: all" },
              { key: "registered",    label: isIt ? "✓ Registrati" : "✓ Registered" },
              { key: "not_registered",label: isIt ? "✗ Non registrati" : "✗ Not registered" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setUniswapFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                  uniswapFilter === f.key
                    ? f.key === "registered" ? "bg-[#5FE3C9]/20 text-[#5FE3C9]" : f.key === "not_registered" ? "bg-[#FF6B7A]/15 text-[#FF6B7A]" : "bg-white/10 text-white"
                    : "text-[var(--aif-text-dim)] hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Email verified filter */}
          <div className="flex items-center gap-1 border border-[var(--aif-line)] rounded-xl p-1">
            {[
              { key: "all",        label: isIt ? "Email: tutti" : "Email: all" },
              { key: "verified",   label: isIt ? "✓ Verificata" : "✓ Verified" },
              { key: "unverified", label: isIt ? "✗ Non verificata" : "✗ Unverified" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setVerifiedFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                  verifiedFilter === f.key
                    ? f.key === "verified" ? "bg-[#4ADE80]/20 text-[#4ADE80]" : f.key === "unverified" ? "bg-[#FF6B7A]/15 text-[#FF6B7A]" : "bg-white/10 text-white"
                    : "text-[var(--aif-text-dim)] hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Date range filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--aif-text-dim)]">{isIt ? "Dal" : "From"}</span>
            <input type="date" className="aif-input !py-1.5 text-[12px] w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
            <span className="text-[11px] text-[var(--aif-text-dim)]">{isIt ? "al" : "to"}</span>
            <input type="date" className="aif-input !py-1.5 text-[12px] w-36" value={dateTo} onChange={e => setDateTo(e.target.value)}/>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-[11px] text-[#FF6B7A] hover:underline px-1">✕</button>
            )}
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
        <StatCard label={isIt ? "Pagato €100" : "Paid €100"} value={users.filter(u => u.trace?.fee_paid).length} icon={CheckCircle2}/>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
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
                  <th className="p-3 font-medium"><SortHeader label={isIt ? "Nome" : "Name"} col="name" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                  <th className="p-3 font-medium hidden lg:table-cell"><SortHeader label={isIt ? "Agente" : "Agent"} col="agent" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                  <th className="p-3 font-medium"><SortHeader label="Email" col="email" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                  <th className="p-3 font-medium hidden md:table-cell">{isIt ? "Password" : "Password"}</th>
                  <th className="p-3 font-medium hidden lg:table-cell"><SortHeader label={isIt ? "Nascita" : "DOB"} col="dob" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                  <th className="p-3 font-medium hidden lg:table-cell"><SortHeader label={isIt ? "Registrato" : "Registered"} col="created_at" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                  <th className="p-3 font-medium"><SortHeader label={isIt ? "Importo" : "Amount"} col="amount" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                  <th className="p-3 font-medium hidden md:table-cell">Email 24h</th>
                  <th className="p-3 font-medium hidden md:table-cell">Email 50h</th>
                  <th className="p-3 font-medium text-center"><SortHeader label="Uniswap V4" col="uniswap" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}/></th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(u => (
                  <tr key={u.id} className="border-b border-[var(--aif-line)] hover:bg-white/[0.02]">
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <div className="font-semibold text-white">{u.first_name} {u.last_name}</div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${u.first_name} ${u.last_name}`); toast.success(isIt ? "Nome copiato" : "Name copied"); }}
                          className="p-0.5 text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition shrink-0"
                          title={isIt ? "Copia nome" : "Copy name"}
                        ><Copy size={11}/></button>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <LangBadge lang={u.lang}/>
                        {u.type === "guest" && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFB454]/15 text-[#FFB454] border border-[#FFB454]/30 uppercase tracking-wide">
                            Guest
                          </span>
                        )}
                        {/* Email verification badge — only for registered users */}
                        {u.type !== "guest" && (
                          u.email_verified
                            ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30" title={isIt ? "Email verificata" : "Email verified"}>
                                <CheckCircle2 size={9}/> {isIt ? "Verificata" : "Verified"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF6B7A]/10 text-[#FF6B7A] border border-[#FF6B7A]/30" title={isIt ? "Email non verificata" : "Email not verified"}>
                                <Clock size={9}/> {isIt ? "Non verificata" : "Unverified"}
                              </span>
                            )
                        )}
                      </div>
                    </td>
                    {/* Agent assignment cell */}
                    <td className="p-3 hidden lg:table-cell min-w-[130px]">
                      <AgentAssignCell user={u} agents={agents} isIt={isIt} onAssigned={(agentId, agentUsername) => {
                        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, assigned_agent_id: agentId, assigned_agent_username: agentUsername } : x));
                      }}/>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--aif-text-dim)] text-[12px]">{u.email}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(u.email); toast.success(isIt ? "Email copiata" : "Email copied"); }}
                          className="p-0.5 text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition shrink-0"
                          title={isIt ? "Copia email" : "Copy email"}
                        >
                          <Copy size={11}/>
                        </button>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {u.password ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] bg-[#0E1A36] border border-[var(--aif-line)] rounded px-2 py-0.5 text-[#FFB454] select-all">
                            {u.password.length > 30 ? u.password.slice(0, 30) + "…" : u.password}
                          </span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(u.password); toast.success(isIt ? "Password copiata" : "Password copied"); }}
                            className="p-0.5 text-[var(--aif-text-dim)] hover:text-[#FFB454] transition shrink-0"
                            title={isIt ? "Copia password" : "Copy password"}
                          >
                            <Copy size={11}/>
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
                          {/* €100 fee badge — always visible */}
                          <div className="mt-1">
                            {u.trace.fee_paid ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30">
                                <CheckCircle2 size={9}/> €100 ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFB454]/10 text-[#FFB454] border border-[#FFB454]/20">
                                <Clock size={9}/> €100
                              </span>
                            )}
                          </div>
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
                    {/* Uniswap V4 account creation button */}
                    <td className="p-3 text-center">
                      {u.trace ? (
                        u.trace.uniswap_account_created ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 whitespace-nowrap"
                            title={u.trace.uniswap_username ? `Username: ${u.trace.uniswap_username}` : "Uniswap V4 account created"}
                          >
                            <CheckCircle2 size={12}/> Creato
                          </span>
                        ) : u.trace.fee_paid ? (
                          <button
                            onClick={() => setUniswapTarget(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF] text-[#06122A] hover:opacity-90 transition whitespace-nowrap shadow-sm"
                            data-testid={`uniswap-create-btn-${u.id}`}
                            title="Create Uniswap V4 account"
                          >
                            <ExternalLink size={11}/> Crea Account
                          </button>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--aif-line)] text-[var(--aif-text-dim)] cursor-not-allowed whitespace-nowrap opacity-60"
                            title={isIt ? "Il pagamento €100 non è stato effettuato" : "€100 fee not paid yet"}
                          >
                            <ExternalLink size={11}/> Crea Account
                          </button>
                        )
                      ) : (
                        <span className="text-[var(--aif-text-dim)] text-[11px]">—</span>
                      )}
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
                  ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)} di ${sorted.length}`
                  : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)} of ${sorted.length}`}
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

// ============================================================
//   AGENT ASSIGN CELL — inline dropdown to assign an agent to a user
// ============================================================
function AgentAssignCell({ user, agents, isIt, onAssigned }) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (e) => {
    const agentId = e.target.value || null;
    setSaving(true);
    try {
      await axios.put(`${API}/admin/users/${user.id}/assign-agent`, { agent_id: agentId }, { headers: getAuthHeader() });
      const agentUsername = agents.find(a => a.id === agentId)?.username || "";
      onAssigned(agentId, agentUsername);
      toast.success(agentId
        ? (isIt ? `Assegnato a ${agentUsername}` : `Assigned to ${agentUsername}`)
        : (isIt ? "Agente rimosso" : "Agent removed"));
    } catch {
      toast.error(isIt ? "Errore assegnazione" : "Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {saving && <Loader2 size={10} className="animate-spin text-[#5FE3C9] shrink-0"/>}
      <select
        value={user.assigned_agent_id || ""}
        onChange={handleChange}
        disabled={saving}
        className="aif-input !py-1 !px-2 text-[11px] !h-auto min-w-0 w-full"
        style={{fontSize:"11px"}}
        title={isIt ? "Assegna agente" : "Assign agent"}
      >
        <option value="">{isIt ? "— nessuno —" : "— none —"}</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.username}</option>
        ))}
      </select>
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
//   CREATE UNISWAP V4 ACCOUNT MODAL
// ============================================================
function CreateUniswapModal({ user, agents, isIt, onClose, onSuccess }) {
  const trace = user.trace;
  // Auto-suggest username from email
  const emailPrefix = (user.email || "").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30);

  const [form, setForm] = useState({
    agent_id: agents[0]?.id || "",
    username: emailPrefix,
    password: "",
    eur_amount: trace?.located_amount ? Number(trace.located_amount).toFixed(2) : "",
    total_fees: "",
    timer_duration_hours: "",
    start_date: "",
    end_date: "",
  });
  // Separate dd/mm/yyyy fields for start and end dates
  const [startDay, setStartDay] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endDay, setEndDay] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");

  // Refs for auto-advance between date parts
  const startMonthRef = React.useRef(null);
  const startYearRef  = React.useRef(null);
  const endMonthRef   = React.useRef(null);
  const endYearRef    = React.useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  // Build YYYY-MM-DD from parts
  const buildDate = (d, m, y) => {
    if (d && m && y && y.length === 4) {
      return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ["agent_id", "username", "password", "eur_amount", "total_fees", "start_date", "end_date"];
    for (const f of required) {
      if (!form[f]?.trim()) {
        setError(isIt ? `Compila il campo: ${f.replace(/_/g, " ")}` : `Please fill: ${f.replace(/_/g, " ")}`);
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/admin/traces/${trace.id}/create-uniswap-account`,
        {
          agent_id: form.agent_id,
          username: form.username.trim(),
          password: form.password.trim(),
          eur_amount: form.eur_amount.trim(),
          total_fees: form.total_fees.trim(),
          timer_duration_hours: form.timer_duration_hours.trim(),
          start_date: form.start_date.trim(),
          end_date: form.end_date.trim(),
        },
        { headers: getAuthHeader() }
      );
      toast.success(isIt ? "Account Uniswap V4 creato con successo!" : "Uniswap V4 account created successfully!");
      onSuccess(trace.id);
    } catch (err) {
      const msg = err?.response?.data?.detail || (isIt ? "Errore creazione account" : "Failed to create account");
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="aif-card !rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--aif-line)] bg-gradient-to-r from-[#5FE3C9]/10 to-[#6E8BFF]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5FE3C9] to-[#6E8BFF] flex items-center justify-center shrink-0">
                <ExternalLink size={15} className="text-[#06122A]"/>
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">
                  {isIt ? "Crea Account Uniswap V4" : "Create Uniswap V4 Account"}
                </h2>
                <p className="text-[var(--aif-text-dim)] text-xs mt-0.5">
                  {user.first_name} {user.last_name} · {user.email}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-[var(--aif-text-dim)] hover:text-white transition p-1">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">

            {/* Client info (read-only) */}
            <div className="aif-card !rounded-lg !p-3 bg-[#5FE3C9]/5 border border-[#5FE3C9]/20">
              <p className="text-[10px] text-[#5FE3C9] uppercase tracking-wide mb-2">
                {isIt ? "Dati cliente (auto-compilati)" : "Client data (auto-filled)"}
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[12px]">
                <div><span className="text-[var(--aif-text-dim)]">{isIt ? "Nome:" : "Name:"}</span> <span className="text-white">{user.first_name} {user.last_name}</span></div>
                <div><span className="text-[var(--aif-text-dim)]">Email:</span> <span className="text-white truncate">{user.email}</span></div>
                {user.date_of_birth && <div><span className="text-[var(--aif-text-dim)]">DOB:</span> <span className="text-white">{user.date_of_birth}</span></div>}
              </div>
            </div>

            {/* Agent selector */}
            <div>
              <label className="aif-label">{isIt ? "Agente (per autenticazione)" : "Agent (for authentication)"} *</label>
              <select
                className="aif-input"
                value={form.agent_id}
                onChange={set("agent_id")}
                required
                data-testid="uniswap-agent-select"
              >
                {agents.length === 0 && <option value="">{isIt ? "Nessun agente disponibile" : "No agents available"}</option>}
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.username}</option>
                ))}
              </select>
            </div>

            {/* Username */}
            <div>
              <label className="aif-label">{isIt ? "Username su Uniswap V4" : "Uniswap V4 Username"} *</label>
              <input
                type="text"
                className="aif-input font-mono"
                value={form.username}
                onChange={set("username")}
                placeholder={emailPrefix || "username"}
                required
                data-testid="uniswap-username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="aif-label">{isIt ? "Password su Uniswap V4" : "Uniswap V4 Password"} *</label>
              <input
                type="text"
                className="aif-input font-mono"
                value={form.password}
                onChange={set("password")}
                placeholder="••••••••"
                required
                data-testid="uniswap-password"
              />
            </div>

            {/* EUR + Fees */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="aif-label">{isIt ? "Importo EUR" : "EUR Amount"} *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="aif-input"
                  value={form.eur_amount}
                  onChange={set("eur_amount")}
                  placeholder="5000"
                  required
                  data-testid="uniswap-eur"
                />
              </div>
              <div>
                <label className="aif-label">{isIt ? "Commissioni (fees)" : "Total Fees"} *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="aif-input"
                  value={form.total_fees}
                  onChange={set("total_fees")}
                  placeholder="50"
                  required
                  data-testid="uniswap-fees"
                />
              </div>
            </div>

            {/* Dates — DD/MM/YYYY */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="aif-label">{isIt ? "Data inizio (GG/MM/AAAA)" : "Start date (DD/MM/YYYY)"} *</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text" inputMode="numeric" maxLength={2}
                    className="aif-input text-center !px-1"
                    value={startDay}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g,"").slice(0,2);
                      setStartDay(v); setForm(p => ({ ...p, start_date: buildDate(v, startMonth, startYear) }));
                      if (v.length === 2 || (v.length === 1 && parseInt(v) >= 4)) { startMonthRef.current?.focus(); startMonthRef.current?.select(); }
                    }}
                    placeholder="GG"
                    data-testid="uniswap-start-day"
                  />
                  <span className="text-[var(--aif-text-dim)] font-bold shrink-0">/</span>
                  <input
                    ref={startMonthRef}
                    type="text" inputMode="numeric" maxLength={2}
                    className="aif-input text-center !px-1"
                    value={startMonth}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g,"").slice(0,2);
                      setStartMonth(v); setForm(p => ({ ...p, start_date: buildDate(startDay, v, startYear) }));
                      if (v.length === 2 || (v.length === 1 && parseInt(v) >= 2)) { startYearRef.current?.focus(); startYearRef.current?.select(); }
                    }}
                    placeholder="MM"
                    data-testid="uniswap-start-month"
                  />
                  <span className="text-[var(--aif-text-dim)] font-bold shrink-0">/</span>
                  <input
                    ref={startYearRef}
                    type="text" inputMode="numeric" maxLength={4}
                    className="aif-input text-center !px-1"
                    value={startYear}
                    onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,4); setStartYear(v); setForm(p => ({ ...p, start_date: buildDate(startDay, startMonth, v) })); }}
                    placeholder="AAAA"
                    data-testid="uniswap-start-year"
                  />
                </div>
              </div>
              <div>
                <label className="aif-label">{isIt ? "Data fine (GG/MM/AAAA)" : "End date (DD/MM/YYYY)"} *</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text" inputMode="numeric" maxLength={2}
                    className="aif-input text-center !px-1"
                    value={endDay}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g,"").slice(0,2);
                      setEndDay(v); setForm(p => ({ ...p, end_date: buildDate(v, endMonth, endYear) }));
                      if (v.length === 2 || (v.length === 1 && parseInt(v) >= 4)) { endMonthRef.current?.focus(); endMonthRef.current?.select(); }
                    }}
                    placeholder="GG"
                    data-testid="uniswap-end-day"
                  />
                  <span className="text-[var(--aif-text-dim)] font-bold shrink-0">/</span>
                  <input
                    ref={endMonthRef}
                    type="text" inputMode="numeric" maxLength={2}
                    className="aif-input text-center !px-1"
                    value={endMonth}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g,"").slice(0,2);
                      setEndMonth(v); setForm(p => ({ ...p, end_date: buildDate(endDay, v, endYear) }));
                      if (v.length === 2 || (v.length === 1 && parseInt(v) >= 2)) { endYearRef.current?.focus(); endYearRef.current?.select(); }
                    }}
                    placeholder="MM"
                    data-testid="uniswap-end-month"
                  />
                  <span className="text-[var(--aif-text-dim)] font-bold shrink-0">/</span>
                  <input
                    ref={endYearRef}
                    type="text" inputMode="numeric" maxLength={4}
                    className="aif-input text-center !px-1"
                    value={endYear}
                    onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,4); setEndYear(v); setForm(p => ({ ...p, end_date: buildDate(endDay, endMonth, v) })); }}
                    placeholder="AAAA"
                    data-testid="uniswap-end-year"
                  />
                </div>
              </div>
            </div>

            {/* Timer (optional) */}
            <div>
              <label className="aif-label">
                {isIt ? "Timer (ore) — opzionale" : "Timer (hours) — optional"}
              </label>
              <input
                type="number"
                step="1"
                min="0"
                className="aif-input"
                value={form.timer_duration_hours}
                onChange={set("timer_duration_hours")}
                placeholder={isIt ? "Es. 48 (lascia vuoto per nessun timer)" : "E.g. 48 (leave empty for no timer)"}
                data-testid="uniswap-timer"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-[#FF6B7A] text-sm bg-[#FF6B7A]/10 border border-[#FF6B7A]/30 rounded-lg px-3 py-2.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0"/>
                <span className="leading-snug">{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--aif-line)] flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="aif-btn-ghost !py-2 !px-4 !text-sm">
              {isIt ? "Annulla" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="aif-btn-primary !py-2.5 !px-6 !text-sm inline-flex items-center gap-2 disabled:opacity-60"
              data-testid="uniswap-submit"
            >
              {saving ? <Loader2 size={14} className="animate-spin"/> : <ExternalLink size={14}/>}
              {saving
                ? (isIt ? "Creazione in corso..." : "Creating...")
                : (isIt ? "Crea Account" : "Create Account")}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  // Title-case helper for name fields
  const toTitleCase = (str) =>
    str.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const blurName = (k) => (e) => {
    const formatted = toTitleCase(e.target.value);
    setForm(prev => ({ ...prev, [k]: formatted }));
  };

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
              <input className="aif-input" value={form.first_name} onChange={set("first_name")} onBlur={blurName("first_name")} data-testid="edit-first"/>
            </div>
            <div>
              <label className="aif-label">{isIt ? "Cognome" : "Last name"}</label>
              <input className="aif-input" value={form.last_name} onChange={set("last_name")} onBlur={blurName("last_name")} data-testid="edit-last"/>
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


// ============================================================
//   AGENTS TAB
// ============================================================
function AgentsTab({ isIt }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPw, setShowPw] = useState({});
  const [passwords, setPasswords] = useState({});  // { agentId: plaintext }
  const [saving, setSaving] = useState(false);

  // Portal URL config
  const [portalSlug, setPortalSlug] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugEditing, setSlugEditing] = useState(false);

  // IP access logs
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/portal-access-logs`, { headers: getAuthHeader() });
      setLogs(data);
      setLogsOpen(true);
    } catch { toast.error("Failed to load logs"); }
    finally { setLogsLoading(false); }
  };

  const clearLogs = async () => {
    if (!window.confirm(isIt ? "Cancellare tutti i log di accesso?" : "Clear all access logs?")) return;
    try {
      await axios.delete(`${API}/admin/portal-access-logs`, { headers: getAuthHeader() });
      setLogs([]);
      toast.success(isIt ? "Log cancellati" : "Logs cleared");
    } catch { toast.error("Failed to clear logs"); }
  };

  const loadSlug = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/settings`, { headers: getAuthHeader() });
      const s = data.agent_portal_slug || "createaccount";
      setPortalSlug(s);
      setSlugInput(s);
    } catch { /* silent */ }
  };

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/agents`, { headers: getAuthHeader() });
      setAgents(data);
    } catch (e) {
      toast.error(isIt ? "Errore caricamento agenti" : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); loadSlug(); }, []);

  const saveSlug = async () => {
    const cleaned = slugInput.trim().replace(/^\//, "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleaned) {
      toast.error(isIt ? "Slug non valido" : "Invalid slug");
      return;
    }
    setSlugSaving(true);
    try {
      await axios.put(`${API}/admin/settings`, { agent_portal_slug: cleaned }, { headers: getAuthHeader() });
      setPortalSlug(cleaned);
      setSlugInput(cleaned);
      setSlugEditing(false);
      toast.success(isIt ? `URL portale aggiornato: /${cleaned}` : `Portal URL updated: /${cleaned}`);
    } catch {
      toast.error(isIt ? "Errore aggiornamento URL" : "Failed to update URL");
    } finally {
      setSlugSaving(false);
    }
  };

  const revealPassword = async (agentId) => {
    if (passwords[agentId]) {
      setShowPw(prev => ({ ...prev, [agentId]: !prev[agentId] }));
      return;
    }
    try {
      const { data } = await axios.get(`${API}/admin/agents/${agentId}/password`, { headers: getAuthHeader() });
      setPasswords(prev => ({ ...prev, [agentId]: data.password }));
      setShowPw(prev => ({ ...prev, [agentId]: true }));
    } catch {
      toast.error(isIt ? "Errore recupero password" : "Failed to get password");
    }
  };

  const createAgent = async () => {
    if (!formUsername.trim() || !formPassword.trim()) {
      toast.error(isIt ? "Inserisci username e password" : "Enter username and password");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/agents`, {
        username: formUsername.trim(),
        password: formPassword.trim(),
      }, { headers: getAuthHeader() });
      toast.success(isIt ? "Agente creato" : "Agent created");
      setFormUsername(""); setFormPassword(""); setShowForm(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isIt ? "Errore creazione agente" : "Failed to create agent"));
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async (id) => {
    if (!window.confirm(isIt ? "Eliminare questo agente?" : "Delete this agent?")) return;
    try {
      await axios.delete(`${API}/admin/agents/${id}`, { headers: getAuthHeader() });
      toast.success(isIt ? "Agente eliminato" : "Agent deleted");
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error(isIt ? "Errore eliminazione agente" : "Failed to delete agent");
    }
  };

  return (
    <div className="space-y-4">

      {/* Portal URL Config */}
      <div className="aif-card !rounded-xl !p-5 border border-[#6E8BFF]/30 bg-[#6E8BFF]/5">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={15} className="text-[#6E8BFF]"/>
          <h3 className="text-white font-semibold text-sm">
            {isIt ? "URL Portale Agenti" : "Agent Portal URL"}
          </h3>
        </div>
        {slugEditing ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0 flex-1 min-w-0">
              <span className="text-[var(--aif-text-dim)] text-sm px-3 py-2 border border-r-0 border-[var(--aif-line)] rounded-l-lg bg-[rgba(6,11,24,0.5)] whitespace-nowrap">
                traccia-fondi.com/
              </span>
              <input
                type="text"
                className="aif-input !rounded-l-none flex-1"
                value={slugInput}
                onChange={e => setSlugInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder="createaccount"
                data-testid="portal-slug-input"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSlugInput(portalSlug); setSlugEditing(false); }}
                className="aif-btn-ghost !py-2 !px-3 !text-sm"
              >
                <X size={13}/>
              </button>
              <button
                onClick={saveSlug}
                disabled={slugSaving}
                className="aif-btn-primary !py-2 !px-4 !text-sm inline-flex items-center gap-1.5"
                data-testid="portal-slug-save"
              >
                {slugSaving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
                {isIt ? "Salva" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[var(--aif-text-dim)] text-xs mb-1">
                {isIt ? "URL attuale del portale agenti:" : "Current agent portal URL:"}
              </p>
              <p className="text-white font-mono text-sm">
                traccia-fondi.com/<span className="text-[#5FE3C9]">{portalSlug || "createaccount"}</span>
              </p>
            </div>
            <button
              onClick={() => setSlugEditing(true)}
              className="aif-btn-ghost !py-1.5 !px-3 !text-sm inline-flex items-center gap-1.5"
              data-testid="portal-slug-edit"
            >
              <Edit2 size={13}/> {isIt ? "Modifica URL" : "Change URL"}
            </button>
          </div>
        )}
        <p className="text-[10px] text-[var(--aif-text-dim)] mt-2">
          {isIt
            ? "Solo lettere, numeri, - e _ sono consentiti. Il cambio URL invalida subito il vecchio link."
            : "Only letters, numbers, - and _ allowed. Changing URL immediately invalidates the old link."}
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-semibold text-base">
            {isIt ? "Gestione Agenti" : "Agent Management"}
          </h2>
          <p className="text-[var(--aif-text-dim)] text-xs mt-0.5">
            {isIt
              ? `Gli agenti possono accedere al portale /${portalSlug || "createaccount"} per cercare i clienti (sola lettura)`
              : `Agents can access /${portalSlug || "createaccount"} portal to search clients (read-only)`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="aif-btn-primary !py-2 !px-4 !text-sm inline-flex items-center gap-2"
          data-testid="add-agent-btn"
        >
          <Plus size={14}/> {isIt ? "Nuovo agente" : "New agent"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="aif-card !rounded-xl p-5 border border-[#5FE3C9]/30">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <UserPlus size={15} className="text-[#5FE3C9]"/>
            {isIt ? "Crea nuovo agente" : "Create new agent"}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="aif-label">Username</label>
              <input
                type="text"
                className="aif-input"
                value={formUsername}
                onChange={e => setFormUsername(e.target.value)}
                placeholder="agent1"
                autoFocus
                data-testid="new-agent-username"
              />
            </div>
            <div>
              <label className="aif-label">{isIt ? "Password" : "Password"}</label>
              <input
                type="text"
                className="aif-input font-mono"
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="new-agent-password"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end">
            <button onClick={() => { setShowForm(false); setFormUsername(""); setFormPassword(""); }} className="aif-btn-ghost !py-2 !px-4 !text-sm">
              {isIt ? "Annulla" : "Cancel"}
            </button>
            <button onClick={createAgent} disabled={saving} className="aif-btn-primary !py-2 !px-5 !text-sm inline-flex items-center gap-2" data-testid="create-agent-submit">
              {saving ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>}
              {saving ? "..." : (isIt ? "Crea agente" : "Create agent")}
            </button>
          </div>
        </div>
      )}

      {/* Agents list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-[var(--aif-text-dim)]">
          <Loader2 size={16} className="animate-spin"/> {isIt ? "Caricamento..." : "Loading..."}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16">
          <UserPlus size={32} className="mx-auto text-[var(--aif-text-dim)] mb-3"/>
          <p className="text-white font-medium">{isIt ? "Nessun agente" : "No agents yet"}</p>
          <p className="text-[var(--aif-text-dim)] text-sm mt-1">
            {isIt ? "Crea il primo agente con il pulsante sopra" : "Create the first agent using the button above"}
          </p>
        </div>
      ) : (
        <div className="aif-card !rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--aif-line)]">
                  <th className="px-4 py-3 text-left text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider">Username</th>
                  <th className="px-4 py-3 text-left text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider">Password</th>
                  <th className="px-4 py-3 text-left text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider">{isIt ? "Creato" : "Created"}</th>
                  <th className="px-4 py-3 text-right text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider">{isIt ? "Azioni" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, idx) => (
                  <tr key={agent.id} className={`border-b border-[var(--aif-line)] last:border-0 ${idx % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#5FE3C9]/15 flex items-center justify-center shrink-0">
                          <UserPlus size={12} className="text-[#5FE3C9]"/>
                        </div>
                        <span className="text-white font-mono text-sm">{agent.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {showPw[agent.id] ? (
                          <span className="text-white font-mono text-xs">{passwords[agent.id]}</span>
                        ) : (
                          <span className="text-[var(--aif-text-dim)] font-mono text-xs">••••••••</span>
                        )}
                        <button
                          onClick={() => revealPassword(agent.id)}
                          className="text-[var(--aif-text-dim)] hover:text-white transition"
                          title={showPw[agent.id] ? (isIt ? "Nascondi" : "Hide") : (isIt ? "Mostra" : "Show")}
                        >
                          {showPw[agent.id] ? <EyeOff size={13}/> : <Eye size={13}/>}
                        </button>
                        {showPw[agent.id] && passwords[agent.id] && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(passwords[agent.id]); toast.success("Copied!"); }}
                            className="text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition"
                          >
                            <Copy size={12}/>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--aif-text-dim)] text-xs">
                      {agent.created_at ? new Date(agent.created_at).toLocaleDateString("it-IT") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteAgent(agent.id)}
                        className="p-1.5 text-[var(--aif-text-dim)] hover:text-[#FF6B7A] transition rounded-lg hover:bg-[#FF6B7A]/10"
                        title={isIt ? "Elimina agente" : "Delete agent"}
                      >
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="aif-card !rounded-xl !p-4 border border-[#6E8BFF]/20 bg-[#6E8BFF]/5">
        <div className="flex items-start gap-3">
          <Lock size={16} className="text-[#6E8BFF] mt-0.5 shrink-0"/>
          <div>
            <p className="text-white text-sm font-medium mb-1">
              {isIt ? "Come funziona il portale agenti" : "How the agent portal works"}
            </p>
            <ul className="text-[var(--aif-text-dim)] text-xs space-y-1">
              <li>• {isIt ? `URL portale: /${portalSlug || "createaccount"}` : `Portal URL: /${portalSlug || "createaccount"}`}</li>
              <li>• {isIt ? "PIN di accesso (richiesto una volta per browser): condividilo con i tuoi agenti" : "Access PIN (required once per browser): share it with your agents"}</li>
              <li>• {isIt ? "Gli agenti vedono informazioni sui clienti in sola lettura" : "Agents see client information in read-only mode"}</li>
              <li>• {isIt ? "Nessun agente può modificare dati — solo l'admin può farlo" : "No agent can modify data — only the admin can do that"}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── IP Access Logs ── */}
      <div className="aif-card !rounded-xl border border-[#FFB454]/20 bg-[#FFB454]/5">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-[#FFB454]"/>
            <div>
              <p className="text-white font-semibold text-sm">
                {isIt ? "Log Accessi Portale (IP)" : "Portal Access Logs (IP)"}
              </p>
              <p className="text-[var(--aif-text-dim)] text-[11px]">
                {isIt ? "Ogni visita alla pagina e ogni tentativo di login viene registrato" : "Every page visit and login attempt is logged"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {logsOpen && logs.length > 0 && (
              <button
                onClick={clearLogs}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#FF6B7A] border border-[#FF6B7A]/30 hover:bg-[#FF6B7A]/10 transition"
              >
                <Trash2 size={12}/> {isIt ? "Cancella" : "Clear"}
              </button>
            )}
            <button
              onClick={logsOpen ? () => setLogsOpen(false) : loadLogs}
              disabled={logsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#FFB454]/15 text-[#FFB454] hover:bg-[#FFB454]/25 transition"
              data-testid="view-portal-logs-btn"
            >
              {logsLoading ? <Loader2 size={12} className="animate-spin"/> : <Eye size={12}/>}
              {logsOpen ? (isIt ? "Nascondi" : "Hide") : (isIt ? "Visualizza log" : "View logs")}
            </button>
          </div>
        </div>

        {logsOpen && (
          <div className="border-t border-[var(--aif-line)]">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-[var(--aif-text-dim)] text-sm">
                {isIt ? "Nessun accesso registrato" : "No access logs yet"}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0A1628] z-10">
                    <tr className="border-b border-[var(--aif-line)] text-[var(--aif-text-dim)]">
                      <th className="px-4 py-2.5 text-left font-medium">{isIt ? "Data/Ora" : "Date/Time"}</th>
                      <th className="px-4 py-2.5 text-left font-medium">IP</th>
                      <th className="px-4 py-2.5 text-left font-medium">{isIt ? "Evento" : "Event"}</th>
                      <th className="px-4 py-2.5 text-left font-medium">{isIt ? "Agente" : "Agent"}</th>
                      <th className="px-4 py-2.5 text-left font-medium">{isIt ? "Esito" : "Result"}</th>
                      <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">User-Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={log.id || i} className="border-b border-[var(--aif-line)] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-[var(--aif-text-dim)] whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString(isIt ? "it-IT" : "en-US", { dateStyle: "short", timeStyle: "medium" }) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-white bg-[#6E8BFF]/10 px-2 py-0.5 rounded text-[11px]">
                            {log.ip || "—"}
                          </span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(log.ip || ""); toast.success("IP copied"); }}
                            className="ml-1.5 text-[var(--aif-text-dim)] hover:text-[#5FE3C9] transition"
                            title="Copy IP"
                          >
                            <Copy size={10}/>
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          {log.event === "agent_login" ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#6E8BFF]/15 text-[#6E8BFF] border border-[#6E8BFF]/30">
                              🔑 {isIt ? "Login" : "Login"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFB454]/10 text-[#FFB454] border border-[#FFB454]/20">
                              👁 {isIt ? "Visita" : "Visit"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--aif-text-dim)] font-mono">
                          {log.agent_username || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {log.success === null || log.success === undefined ? (
                            <span className="text-[var(--aif-text-dim)]">—</span>
                          ) : log.success ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#4ADE80]/15 text-[#4ADE80]">
                              <CheckCircle2 size={9}/> {isIt ? "OK" : "OK"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF6B7A]/15 text-[#FF6B7A]">
                              <X size={9}/> {isIt ? "Fallito" : "Failed"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--aif-text-dim)] hidden lg:table-cell max-w-xs truncate" title={log.user_agent}>
                          {log.user_agent ? log.user_agent.substring(0, 60) + (log.user_agent.length > 60 ? "…" : "") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 py-2.5 border-t border-[var(--aif-line)] text-[10px] text-[var(--aif-text-dim)]">
              {isIt ? `${logs.length} eventi registrati (ultimi 500)` : `${logs.length} events logged (latest 500)`}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}


// ============================================================
//   SETTINGS TAB
// ============================================================
function SettingsTab({ isIt }) {
  const [paymentUrl, setPaymentUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/settings`, { headers: getAuthHeader() });
      const url = data.payment_url || "";
      setPaymentUrl(url);
      setInputUrl(url);
    } catch { toast.error(isIt ? "Errore caricamento impostazioni" : "Failed to load settings"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) { toast.error(isIt ? "Inserisci un link valido" : "Enter a valid link"); return; }
    if (!trimmed.startsWith("http")) { toast.error(isIt ? "Il link deve iniziare con http:// o https://" : "Link must start with http:// or https://"); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings`, { payment_url: trimmed }, { headers: getAuthHeader() });
      setPaymentUrl(trimmed);
      toast.success(isIt ? "Link pagamento aggiornato — effettivo immediatamente ovunque nell'app e nelle email" : "Payment link updated — effective immediately everywhere in the app and emails");
    } catch { toast.error(isIt ? "Errore salvataggio" : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-[var(--aif-text-dim)]">
      <Loader2 size={16} className="animate-spin"/> {isIt ? "Caricamento..." : "Loading..."}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Payment Link Section */}
      <div className="aif-card !rounded-xl border border-[#5FE3C9]/20">
        <div className="px-6 py-4 border-b border-[var(--aif-line)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#5FE3C9]/15 flex items-center justify-center shrink-0">
            <Link2 size={15} className="text-[#5FE3C9]"/>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">
              {isIt ? "Link Pagamento €100" : "€100 Payment Link"}
            </h3>
            <p className="text-[var(--aif-text-dim)] text-xs mt-0.5">
              {isIt
                ? "Questo link viene usato ovunque nell'app: pulsante nel profilo cliente, email 50h (EN + IT), fallback testo email. La modifica ha effetto immediato."
                : "This link is used everywhere in the app: client profile button, 50h email (EN + IT), email plain-text fallback. Change takes effect immediately."}
            </p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">

          {/* Current link preview */}
          {paymentUrl && (
            <div className="bg-[#4ADE80]/5 border border-[#4ADE80]/20 rounded-lg px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-[#4ADE80] mb-1 flex items-center gap-1">
                <CheckCircle2 size={10}/> {isIt ? "Link attuale" : "Current link"}
              </p>
              <p className="text-white text-xs font-mono break-all">{paymentUrl}</p>
            </div>
          )}

          {/* Input */}
          <div>
            <label className="aif-label">
              {isIt ? "Nuovo link di pagamento" : "New payment link"} *
            </label>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="url"
                className="aif-input flex-1"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="https://buy.stripe.com/..."
                data-testid="settings-payment-url-input"
              />
              <button
                onClick={save}
                disabled={saving || inputUrl.trim() === paymentUrl}
                className="aif-btn-primary !py-2.5 !px-5 !text-sm inline-flex items-center gap-2 shrink-0 disabled:opacity-50"
                data-testid="settings-payment-url-save"
              >
                {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
                {saving ? (isIt ? "Salvataggio..." : "Saving...") : (isIt ? "Salva" : "Save")}
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-[#FFB454]/5 border border-[#FFB454]/20 rounded-lg px-4 py-3">
            <p className="text-[#FFB454] text-xs font-medium mb-1">
              {isIt ? "Dove viene usato questo link:" : "Where this link is used:"}
            </p>
            <ul className="text-[var(--aif-text-dim)] text-xs space-y-0.5">
              <li>• {isIt ? "Pulsante «Paga €100 — Sblocca il report» nell'app cliente" : "«Pay €100 — Unlock report» button in the client app"}</li>
              <li>• {isIt ? "Email 50h — pulsante «PROCEED TO SECURE PAYMENT» (EN)" : "50h email — «PROCEED TO SECURE PAYMENT» button (EN)"}</li>
              <li>• {isIt ? "Email 50h — pulsante «PROCEDI AL PAGAMENTO SICURO» (IT)" : "50h email — «PROCEDI AL PAGAMENTO SICURO» button (IT)"}</li>
              <li>• {isIt ? "Link testo alternativo nelle email (fallback per client senza HTML)" : "Plain-text fallback link in emails (for HTML-disabled clients)"}</li>
              <li>• {isIt ? "Clienti che hanno già avviato la procedura vedono il nuovo link immediatamente" : "Clients who already started the procedure see the new link immediately"}</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
