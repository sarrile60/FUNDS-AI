// AgentPortal — private portal for Traccia Fondi agents
// Route: configured via admin (default: /createaccount)
// Flow: PIN gate (8971, once per browser) → Agent login → I Miei Clienti

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import axios from "axios";
import {
  LogOut, User, Mail, CheckCircle2, XCircle,
  DollarSign, Shield, Eye, EyeOff, Loader2, AlertTriangle,
  ChevronDown, ChevronUp, Globe, RefreshCw, Users, Search
} from "lucide-react";
import Logo from "./Logo";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PIN_KEY = "agent_pin_verified";
const TOKEN_KEY = "agent_token";
const LANG_KEY = "agent_lang";
const CORRECT_PIN = "8971";

const TIER_LABEL = {
  "5000_20000":   "< €20.000",
  "20000_50000":  "€20.000 – €50.000",
  "50000_100000": "€50.000 – €100.000",
  "100000_plus":  "€100.000+",
};

function fmtAmount(n) {
  if (!n) return "—";
  return `€ ${Number(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ElapsedTimer({ startIso, stopped }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const tick = () => {
      if (!startIso) { setElapsed("—"); return; }
      const diff = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    if (stopped) return; // don’t start interval if stopped
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso, stopped]);
  return <span className={`font-mono ${stopped ? "text-[var(--aif-text-dim)]" : "text-[#5FE3C9]"}`}>{elapsed}</span>;
}

// ============================================================
//   PIN Gate
// ============================================================
function PinGate({ onVerified }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const inputs = React.useRef([]);

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const arr = pin.split("");
    arr[idx] = val;
    const newPin = arr.join("").slice(0, 4);
    setPin(newPin);
    setError("");
    if (val && idx < 3) inputs.current[idx + 1]?.focus();
    if (newPin.length === 4) {
      setTimeout(() => {
        if (newPin === CORRECT_PIN) {
          localStorage.setItem(PIN_KEY, "true");
          onVerified();
        } else {
          setShake(true);
          setError("PIN non corretto. Riprova.");
          setPin("");
          setTimeout(() => { setShake(false); inputs.current[0]?.focus(); }, 600);
        }
      }, 100);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
      const arr = pin.split("");
      arr[idx - 1] = "";
      setPin(arr.join(""));
    }
  };

  return (
    <div className="aif-app-bg min-h-screen flex flex-col items-center justify-center relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="flex flex-col items-center mb-8">
          <Logo/>
          <p className="text-[var(--aif-text-dim)] text-sm mt-2">Portale Agenti</p>
        </div>
        <div className="aif-card !rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={18} className="text-[#5FE3C9]"/>
            <h2 className="text-white font-semibold text-base">Inserisci il codice PIN</h2>
          </div>
          <div className={`flex justify-center gap-3 mb-6 ${shake ? "animate-shake" : ""}`}>
            {[0, 1, 2, 3].map(idx => (
              <input
                key={idx}
                ref={el => inputs.current[idx] = el}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={pin[idx] || ""}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                autoFocus={idx === 0}
                className="w-14 h-14 text-center text-2xl font-bold rounded-xl border border-[var(--aif-line)] bg-[var(--aif-surface)] text-white focus:border-[#5FE3C9] focus:outline-none transition"
                data-testid={`pin-input-${idx}`}
              />
            ))}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-[#FF6B7A] text-sm mb-4 justify-center">
              <AlertTriangle size={14}/><span>{error}</span>
            </div>
          )}
          <p className="text-center text-[var(--aif-text-dim)] text-xs mt-2">
            Inserisci il PIN per accedere all&apos;area riservata agenti
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   Login Form
// ============================================================
function LoginForm({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Inserisci username e password."); return; }
    setLoading(true); setError("");
    try {
      const { data } = await axios.post(`${API}/agent/login`, { username: username.trim(), password: password.trim() });
      localStorage.setItem(TOKEN_KEY, data.token);
      onLoggedIn(data.agent);
    } catch (err) {
      setError(err?.response?.data?.detail || "Credenziali non valide.");
    } finally { setLoading(false); }
  };

  return (
    <div className="aif-app-bg min-h-screen flex flex-col items-center justify-center relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="flex flex-col items-center mb-8">
          <Logo/>
          <p className="text-[var(--aif-text-dim)] text-sm mt-2">Portale Agenti</p>
        </div>
        <div className="aif-card !rounded-2xl p-8">
          <h2 className="text-white font-semibold text-base mb-6">Accesso Agente</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="aif-label">Username</label>
              <input type="text" className="aif-input" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="username" autoFocus autoComplete="username" data-testid="agent-username"/>
            </div>
            <div>
              <label className="aif-label">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} className="aif-input pr-10" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  autoComplete="current-password" data-testid="agent-password"/>
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] hover:text-white">
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-[#FF6B7A] text-sm">
                <AlertTriangle size={14}/><span>{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="aif-btn-primary w-full !py-3 inline-flex items-center justify-center gap-2"
              data-testid="agent-login-btn">
              {loading ? <Loader2 size={14} className="animate-spin"/> : null}
              {loading ? "Accesso..." : "Accedi"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   Client Card (read-only)
// ============================================================
function StatusBadge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${ok ? "bg-[#4ADE80]/15 text-[#4ADE80]" : "bg-[#FF6B7A]/15 text-[#FF6B7A]"}`}>
      {ok ? <CheckCircle2 size={10}/> : <XCircle size={10}/>}
      {label}
    </span>
  );
}

function ClientCard({ result, isIt }) {
  const [expanded, setExpanded] = useState(false);
  const hasTrace = !!result.trace_id;

  return (
    <div className="aif-card !rounded-xl overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#5FE3C9]/15 flex items-center justify-center shrink-0">
              <User size={18} className="text-[#5FE3C9]"/>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm">{result.first_name} {result.last_name}</p>
              <p className="text-[var(--aif-text-dim)] text-xs mt-0.5 truncate">{result.email}</p>
            </div>
          </div>
          {hasTrace && (
            <button onClick={() => setExpanded(!expanded)}
              className="shrink-0 p-1.5 text-[var(--aif-text-dim)] hover:text-white transition">
              {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
          )}
        </div>

        {hasTrace && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <StatusBadge ok={result.email_24h_sent} label={isIt ? "Email 24h" : "24h Email"}/>
            <StatusBadge ok={result.email_50h_sent} label={isIt ? "Email 50h" : "50h Email"}/>
            <StatusBadge ok={result.fee_paid} label={isIt ? "€100 Pagato" : "€100 Paid"}/>
            {result.has_account && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#6E8BFF]/15 text-[#6E8BFF]">
                <Shield size={10}/> Account
              </span>
            )}
          </div>
        )}

        {!hasTrace && (
          <p className="text-[var(--aif-text-dim)] text-xs mt-2">{isIt ? "Nessun tracciamento avviato" : "No trace started yet"}</p>
        )}
      </div>

      {expanded && hasTrace && (
        <div className="border-t border-[var(--aif-line)] px-5 py-4 space-y-4">

          {/* Trace timing */}
          <div>
            <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">
              {isIt ? "Tracciamento" : "Trace"}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wide mb-1">
                  {isIt ? "Avviato il" : "Started on"}
                </p>
                <p className="text-white text-sm">{fmtDate(result.trace_created_at)}</p>
              </div>
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wide mb-1">
                  {isIt ? "Tempo trascorso" : "Elapsed time"}
                </p>
                <ElapsedTimer startIso={result.trace_created_at} stopped={result.email_50h_sent}/>
              </div>
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wide mb-1">
                  {isIt ? "Fascia importo" : "Amount tier"}
                </p>
                <p className="text-white text-sm">{TIER_LABEL[result.amount_tier] || result.amount_tier || "—"}</p>
              </div>
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wide mb-1">
                  {isIt ? "Importo localizzato" : "Located amount"}
                </p>
                <p className="text-[#5FE3C9] text-sm font-mono font-semibold">{fmtAmount(result.located_amount)}</p>
              </div>
            </div>
          </div>

          {/* Email timeline */}
          <div>
            <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">
              {isIt ? "Email inviate" : "Sent emails"}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between aif-card !rounded-lg !p-3">
                <div className="flex items-center gap-2">
                  <Mail size={13} className={result.email_24h_sent ? "text-[#4ADE80]" : "text-[var(--aif-text-dim)]"}/>
                  <span className="text-sm text-white">{isIt ? "Email 24 ore" : "24-hour email"}</span>
                </div>
                <div className="text-right">
                  {result.email_24h_sent
                    ? <span className="text-[#4ADE80] text-xs">✓ {fmtDate(result.email_24h_sent_at)}</span>
                    : <span className="text-[#FF6B7A] text-xs">{isIt ? "Non inviata" : "Not sent"}</span>}
                </div>
              </div>
              <div className="flex items-center justify-between aif-card !rounded-lg !p-3">
                <div className="flex items-center gap-2">
                  <Mail size={13} className={result.email_50h_sent ? "text-[#4ADE80]" : "text-[var(--aif-text-dim)]"}/>
                  <span className="text-sm text-white">{isIt ? "Email 50 ore (fondi localizzati)" : "50-hour email (funds located)"}</span>
                </div>
                <div className="text-right">
                  {result.email_50h_sent
                    ? <span className="text-[#4ADE80] text-xs">✓ {fmtDate(result.email_50h_sent_at)}</span>
                    : <span className="text-[#FF6B7A] text-xs">{isIt ? "Non inviata" : "Not sent"}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">
              {isIt ? "Quota €100" : "€100 Fee"}
            </p>
            <div className="aif-card !rounded-lg !p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={13} className={result.fee_paid ? "text-[#4ADE80]" : "text-[var(--aif-text-dim)]"}/>
                <span className="text-sm text-white">{isIt ? "Pagamento €100" : "€100 payment"}</span>
              </div>
              <div>
                {result.fee_paid
                  ? <span className="text-[#4ADE80] text-xs">✓ {isIt ? "Pagato" : "Paid"} — {fmtDate(result.fee_paid_at)}</span>
                  : <span className="text-[#FFB454] text-xs">{isIt ? "In attesa" : "Pending"}</span>}
              </div>
            </div>
          </div>

          {result.destination_name && (
            <div>
              <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">
                {isIt ? "Destinazione fondi" : "Fund destination"}
              </p>
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-white text-sm font-semibold">{result.destination_name}</p>
              </div>
            </div>
          )}

          {result.date_of_birth && (
            <div>
              <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">
                {isIt ? "Dati account" : "Account info"}
              </p>
              <div className="aif-card !rounded-lg !p-3 grid sm:grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-[var(--aif-text-dim)]">{isIt ? "Data di nascita" : "Date of birth"}</p>
                  <p className="text-white text-sm">{result.date_of_birth}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--aif-text-dim)]">{isIt ? "Lingua" : "Language"}</p>
                  <p className="text-white text-sm">{result.lang === "it" ? "🇮🇹 Italiano" : "🇬🇧 English"}</p>
                </div>
              </div>
            </div>
          )}

          <p className="text-[10px] text-[var(--aif-text-dim)] font-mono">Trace ID: {result.trace_id}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
//   Agent Dashboard — I Miei Clienti
// ============================================================
function AgentDashboard({ agent, onLogout, lang, setLang }) {
  const isIt = lang === "it";
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "24h" | "50h" | "newest" | "oldest"

  const loadClients = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const { data } = await axios.get(`${API}/agent/my-clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(data);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast.error(isIt ? "Sessione scaduta" : "Session expired");
        onLogout();
      } else {
        toast.error(isIt ? "Errore caricamento clienti" : "Failed to load clients");
      }
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [isIt, onLogout]);

  useEffect(() => { loadClients(); }, [loadClients]);

  // Client-side filter + sort
  const displayed = clients
    .filter(c => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const full = `${c.first_name} ${c.last_name}`.toLowerCase();
        if (!full.includes(q) && !c.email.toLowerCase().includes(q)) return false;
      }
      // 24h: got 24h email but NOT yet 50h
      if (filter === "24h" && !(c.email_24h_sent && !c.email_50h_sent)) return false;
      // 50h: got 50h email but NOT yet paid €100
      if (filter === "50h" && !(c.email_50h_sent && !c.fee_paid)) return false;
      // €100: paid the fee
      if (filter === "paid" && !c.fee_paid) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = new Date(a.trace_created_at || 0).getTime();
      const tb = new Date(b.trace_created_at || 0).getTime();
      if (filter === "oldest") return ta - tb;
      return tb - ta; // newest first (default)
    });

  const toggleLang = () => {
    const next = isIt ? "en" : "it";
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  };

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        {/* Top bar */}
        <header className="border-b border-[var(--aif-line)] bg-[rgba(6,11,24,0.92)]">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Logo/>
              <span className="aif-chip text-[10px] hidden sm:inline-flex">
                {isIt ? "Portale Agenti" : "Agent Portal"}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleLang}
                className="flex items-center gap-1.5 text-xs text-[var(--aif-text-dim)] hover:text-white transition px-2.5 py-1.5 rounded-lg border border-[var(--aif-line)]"
                data-testid="agent-lang-toggle"
              >
                <Globe size={12}/> {lang.toUpperCase()}
              </button>
              <span className="text-[var(--aif-text-dim)] text-xs hidden sm:flex items-center gap-1">
                <User size={12}/>{agent?.username}
              </span>
              <button
                onClick={onLogout}
                className="aif-btn-ghost !py-1.5 !px-3 !text-sm inline-flex items-center gap-1.5"
                data-testid="agent-logout"
              >
                <LogOut size={13}/> <span className="hidden sm:inline">{isIt ? "Esci" : "Sign out"}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Title row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-[#5FE3C9]"/>
                {isIt ? "I Miei Clienti" : "My Clients"}
              </h1>
              {!loading && (
                <p className="text-[var(--aif-text-dim)] text-sm mt-0.5">
                  {displayed.length !== clients.length
                    ? `${displayed.length} / ${clients.length}`
                    : clients.length === 0
                      ? (isIt ? "Nessun cliente assegnato" : "No clients assigned yet")
                      : isIt
                        ? `${clients.length} client${clients.length === 1 ? "e" : "i"} assegnat${clients.length === 1 ? "o" : "i"}`
                        : `${clients.length} client${clients.length === 1 ? "" : "s"} assigned`}
                </p>
              )}
            </div>
            <button
              onClick={() => loadClients(true)}
              disabled={refreshing}
              className="aif-btn-ghost !py-1.5 !px-3 !text-sm inline-flex items-center gap-1.5"
              title={isIt ? "Aggiorna" : "Refresh"}
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""}/>
              <span className="hidden sm:inline">{isIt ? "Aggiorna" : "Refresh"}</span>
            </button>
          </div>

          {/* Search + Filters */}
          {!loading && clients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                <input
                  type="text"
                  className="aif-input pl-9 !py-2 text-[13px] w-full"
                  placeholder={isIt ? "Cerca nome, cognome, email…" : "Search name, email…"}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  data-testid="agent-client-search"
                />
              </div>
              {/* Filter buttons */}
              <div className="flex items-center gap-1 border border-[var(--aif-line)] rounded-xl p-1 flex-wrap">
                {[
                  { key: "all",    label: isIt ? "Tutti" : "All" },
                  { key: "24h",    label: "24h ✓" },
                  { key: "50h",    label: "50h ✓" },
                  { key: "paid",   label: "€100 ✓" },
                  { key: "newest", label: isIt ? "↓ Recenti" : "↓ Newest" },
                  { key: "oldest", label: isIt ? "↑ Vecchi" : "↑ Oldest" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                      filter === f.key
                        ? f.key === "24h" ? "bg-[#FFB454]/20 text-[#FFB454]"
                        : f.key === "50h" ? "bg-[#FF6B7A]/20 text-[#FF6B7A]"
                        : f.key === "paid" ? "bg-[#4ADE80]/20 text-[#4ADE80]"
                        : "bg-[#5FE3C9]/15 text-[#5FE3C9]"
                        : "text-[var(--aif-text-dim)] hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-[var(--aif-text-dim)]">
              <Loader2 size={20} className="animate-spin"/>
              <span>{isIt ? "Caricamento clienti..." : "Loading clients..."}</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-[#5FE3C9]/10 flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-[#5FE3C9]"/>
              </div>
              <p className="text-white font-medium text-base">
                {isIt ? "Nessun cliente assegnato" : "No clients assigned"}
              </p>
              <p className="text-[var(--aif-text-dim)] text-sm mt-1 max-w-xs mx-auto">
                {isIt
                  ? "L'amministratore deve assegnarti dei clienti dal pannello admin."
                  : "The admin needs to assign clients to you from the admin panel."}
              </p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white font-medium">{isIt ? "Nessun risultato" : "No results"}</p>
              <p className="text-[var(--aif-text-dim)] text-sm mt-1">
                {isIt ? "Prova con un'altra ricerca o filtro." : "Try a different search or filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((c, idx) => (
                <ClientCard key={c.trace_id || c.email || idx} result={c} isIt={isIt}/>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================
//   AgentPortal — main entry point
// ============================================================
export default function AgentPortal() {
  const [pinVerified, setPinVerified] = useState(
    () => localStorage.getItem(PIN_KEY) === "true"
  );
  const [agent, setAgent] = useState(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [lang, setLang] = useState(
    () => localStorage.getItem(LANG_KEY) || "it"
  );

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setTokenChecked(true); return; }
    axios.get(`${API}/agent/my-clients`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setAgent({ id: payload.sub, username: "agente" });
      } catch { setAgent({ username: "agente" }); }
    }).catch(() => {
      localStorage.removeItem(TOKEN_KEY);
    }).finally(() => setTokenChecked(true));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAgent(null);
  };

  if (!pinVerified) return <PinGate onVerified={() => setPinVerified(true)}/>;

  if (!tokenChecked) {
    return (
      <div className="aif-app-bg min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#5FE3C9]"/>
      </div>
    );
  }

  if (!agent) return <LoginForm onLoggedIn={(agentData) => setAgent(agentData)}/>;

  return <AgentDashboard agent={agent} onLogout={handleLogout} lang={lang} setLang={setLang}/>;
}
