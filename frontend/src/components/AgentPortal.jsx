// AgentPortal — private portal for Traccia Fondi agents
// Route: /createaccount
// Flow: PIN gate (8971, once per browser) → Agent login → Client search

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import axios from "axios";
import {
  Search, LogOut, User, Clock, Mail, CheckCircle2, XCircle,
  DollarSign, Shield, Eye, EyeOff, Loader2, AlertTriangle,
  ChevronDown, ChevronUp
} from "lucide-react";
import Logo from "./Logo";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PIN_KEY = "agent_pin_verified";
const TOKEN_KEY = "agent_token";
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

function ElapsedTimer({ startIso }) {
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
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  return <span className="font-mono text-[#5FE3C9]">{elapsed}</span>;
}

// ============================================================
//   PIN Gate
// ============================================================
function PinGate({ onVerified }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const inputs = useRef([]);

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
          <div className="mt-4 text-center">
            <p className="text-[var(--aif-text-dim)] text-sm mt-1">Portale Agenti</p>
          </div>
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
              <AlertTriangle size={14}/>
              <span>{error}</span>
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
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/agent/login`, {
        username: username.trim(),
        password: password.trim(),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      onLoggedIn(data.agent);
    } catch (err) {
      setError(err?.response?.data?.detail || "Credenziali non valide.");
    } finally {
      setLoading(false);
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
          <h2 className="text-white font-semibold text-base mb-6">Accesso Agente</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="aif-label">Username</label>
              <input
                type="text"
                className="aif-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                autoFocus
                autoComplete="username"
                data-testid="agent-username"
              />
            </div>
            <div>
              <label className="aif-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="aif-input pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  data-testid="agent-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] hover:text-white">
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[#FF6B7A] text-sm">
                <AlertTriangle size={14}/> <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="aif-btn-primary w-full !py-3 inline-flex items-center justify-center gap-2" data-testid="agent-login-btn">
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
//   Client Result Card
// ============================================================
function StatusBadge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${ok ? "bg-[#4ADE80]/15 text-[#4ADE80]" : "bg-[#FF6B7A]/15 text-[#FF6B7A]"}`}>
      {ok ? <CheckCircle2 size={10}/> : <XCircle size={10}/>}
      {label}
    </span>
  );
}

function ClientCard({ result }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="aif-card !rounded-xl overflow-hidden">
      {/* Card header */}
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
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 p-1.5 text-[var(--aif-text-dim)] hover:text-white transition"
          >
            {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>

        {/* Quick status row */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <StatusBadge ok={result.email_24h_sent} label="Email 24h"/>
          <StatusBadge ok={result.email_50h_sent} label="Email 50h"/>
          <StatusBadge ok={result.fee_paid} label="€100 Pagato"/>
          {result.has_account && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#6E8BFF]/15 text-[#6E8BFF]">
              <Shield size={10}/> Account
            </span>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[var(--aif-line)] px-5 py-4 space-y-4">

          {/* Trace timing */}
          <div>
            <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">Tracciamento</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wide mb-1">Avviato il</p>
                <p className="text-white text-sm">{fmtDate(result.trace_created_at)}</p>
              </div>
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wide mb-1">Tempo trascorso</p>
                <ElapsedTimer startIso={result.trace_created_at}/>
              </div>
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wide mb-1">Fascia importo</p>
                <p className="text-white text-sm">{TIER_LABEL[result.amount_tier] || result.amount_tier || "—"}</p>
              </div>
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-[10px] text-[var(--aif-text-dim)] uppercase tracking-wide mb-1">Importo localizzato</p>
                <p className="text-[#5FE3C9] text-sm font-mono font-semibold">{fmtAmount(result.located_amount)}</p>
              </div>
            </div>
          </div>

          {/* Email timeline */}
          <div>
            <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">Email inviate</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between aif-card !rounded-lg !p-3">
                <div className="flex items-center gap-2">
                  <Mail size={13} className={result.email_24h_sent ? "text-[#4ADE80]" : "text-[var(--aif-text-dim)]"}/>
                  <span className="text-sm text-white">Email 24 ore</span>
                </div>
                <div className="text-right">
                  {result.email_24h_sent ? (
                    <span className="text-[#4ADE80] text-xs">✓ {fmtDate(result.email_24h_sent_at)}</span>
                  ) : (
                    <span className="text-[#FF6B7A] text-xs">Non inviata</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between aif-card !rounded-lg !p-3">
                <div className="flex items-center gap-2">
                  <Mail size={13} className={result.email_50h_sent ? "text-[#4ADE80]" : "text-[var(--aif-text-dim)]"}/>
                  <span className="text-sm text-white">Email 50 ore (fondi localizzati)</span>
                </div>
                <div className="text-right">
                  {result.email_50h_sent ? (
                    <span className="text-[#4ADE80] text-xs">✓ {fmtDate(result.email_50h_sent_at)}</span>
                  ) : (
                    <span className="text-[#FF6B7A] text-xs">Non inviata</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">Quota €100</p>
            <div className="aif-card !rounded-lg !p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={13} className={result.fee_paid ? "text-[#4ADE80]" : "text-[var(--aif-text-dim)]"}/>
                <span className="text-sm text-white">Pagamento €100</span>
              </div>
              <div>
                {result.fee_paid ? (
                  <span className="text-[#4ADE80] text-xs">✓ Pagato — {fmtDate(result.fee_paid_at)}</span>
                ) : (
                  <span className="text-[#FFB454] text-xs">In attesa</span>
                )}
              </div>
            </div>
          </div>

          {/* Destination */}
          {result.destination_name && (
            <div>
              <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">Destinazione fondi</p>
              <div className="aif-card !rounded-lg !p-3">
                <p className="text-white text-sm font-semibold">{result.destination_name}</p>
              </div>
            </div>
          )}

          {/* Account info */}
          {result.date_of_birth && (
            <div>
              <p className="text-[11px] text-[var(--aif-text-dim)] uppercase tracking-wider mb-2">Dati account</p>
              <div className="aif-card !rounded-lg !p-3 grid sm:grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-[var(--aif-text-dim)]">Data di nascita</p>
                  <p className="text-white text-sm">{result.date_of_birth}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--aif-text-dim)]">Lingua</p>
                  <p className="text-white text-sm">{result.lang === "it" ? "🇮🇹 Italiano" : "🇬🇧 English"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Trace ID */}
          <p className="text-[10px] text-[var(--aif-text-dim)] font-mono">
            Trace ID: {result.trace_id}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
//   Agent Dashboard (search)
// ============================================================
function AgentDashboard({ agent, onLogout }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = async (q) => {
    if (!q || q.trim().length < 2) { setResults(null); setSearched(false); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const { data } = await axios.get(`${API}/agent/search`, {
        params: { q: q.trim() },
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(data);
      setSearched(true);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast.error("Sessione scaduta. Effettua di nuovo l'accesso.");
        onLogout();
      } else {
        toast.error("Errore nella ricerca.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val), 400);
    } else {
      setResults(null);
      setSearched(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    doSearch(query);
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
              <span className="aif-chip text-[10px] hidden sm:inline-flex">Portale Agenti</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[var(--aif-text-dim)] text-xs hidden sm:block">
                <User size={12} className="inline mr-1"/>{agent?.username}
              </span>
              <button
                onClick={onLogout}
                className="aif-btn-ghost !py-1.5 !px-3 !text-sm inline-flex items-center gap-1.5"
                data-testid="agent-logout"
              >
                <LogOut size={13}/> <span className="hidden sm:inline">Esci</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Search */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-white mb-1">Ricerca Cliente</h1>
            <p className="text-[var(--aif-text-dim)] text-sm mb-5">
              Cerca per nome + cognome oppure per indirizzo email
            </p>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                <input
                  type="text"
                  className="aif-input pl-9 pr-4"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Mario Rossi oppure mario@email.com"
                  autoFocus
                  data-testid="agent-search-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading || query.trim().length < 2}
                className="aif-btn-primary !py-2.5 !px-5 inline-flex items-center gap-2 disabled:opacity-50"
                data-testid="agent-search-btn"
              >
                {loading ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
                Cerca
              </button>
            </form>
          </div>

          {/* Results */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-[var(--aif-text-dim)]">
              <Loader2 size={20} className="animate-spin"/>
              <span>Ricerca in corso...</span>
            </div>
          )}

          {!loading && searched && results !== null && (
            <>
              {results.length === 0 ? (
                <div className="text-center py-16">
                  <Search size={32} className="mx-auto text-[var(--aif-text-dim)] mb-3"/>
                  <p className="text-white font-medium">Nessun risultato trovato</p>
                  <p className="text-[var(--aif-text-dim)] text-sm mt-1">
                    Prova con un nome diverso o con l&apos;email completa
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[var(--aif-text-dim)] text-sm mb-4">
                    {results.length} risultat{results.length === 1 ? "o" : "i"} trovati
                  </p>
                  <div className="space-y-3">
                    {results.map(r => (
                      <ClientCard key={r.trace_id} result={r}/>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !searched && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-[#5FE3C9]/10 flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-[#5FE3C9]"/>
              </div>
              <p className="text-white font-medium text-base">Inizia la ricerca</p>
              <p className="text-[var(--aif-text-dim)] text-sm mt-1 max-w-xs mx-auto">
                Inserisci il nome, cognome o email del cliente nel campo di ricerca
              </p>
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

  // On mount, check if we have a valid stored token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setTokenChecked(true); return; }

    // Verify token by calling the search endpoint with empty query
    axios.get(`${API}/agent/search`, {
      params: { q: "__ping__" },
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      // Token is valid — try to parse agent from token payload
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setAgent({ id: payload.sub, username: "agente" });
      } catch { setAgent({ username: "agente" }); }
    }).catch(() => {
      // Token invalid or expired
      localStorage.removeItem(TOKEN_KEY);
    }).finally(() => setTokenChecked(true));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAgent(null);
  };

  if (!pinVerified) {
    return <PinGate onVerified={() => setPinVerified(true)}/>;
  }

  if (!tokenChecked) {
    return (
      <div className="aif-app-bg min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#5FE3C9]"/>
      </div>
    );
  }

  if (!agent) {
    return <LoginForm onLoggedIn={(agentData) => setAgent(agentData)}/>;
  }

  return <AgentDashboard agent={agent} onLogout={handleLogout}/>;
}
