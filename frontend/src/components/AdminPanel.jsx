// AdminPanel — admin login + dashboard with users + recovery requests.
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users, Inbox, Plus, Edit2, Trash2, Eye, EyeOff, Save, X,
  Mail as MailIcon, ExternalLink, Building2, Wallet, Check, LogOut, Send, FileText
} from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { api } from "../api";

const TIER_LABEL = {
  "5000_20000":   "5,000 – 20,000 €",
  "20000_50000":  "20,000 – 50,000 €",
  "50000_100000": "50,000 – 100,000 €",
  "100000_plus":  "100,000+ €",
};

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [tab, setTab] = useState("users");

  if (!user) return <Navigate to="/admin" replace/>;
  if (user.role !== "admin") return <Navigate to="/app" replace/>;

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        {/* Top bar */}
        <header className="border-b border-[var(--aif-line)] bg-[rgba(6,11,24,0.92)]">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo/>
              <span className="aif-chip text-[10px]">{t("adm.title")}</span>
            </div>
            <button onClick={() => { logout(); nav("/admin"); }} className="aif-btn-ghost !py-2 !text-sm inline-flex items-center gap-2" data-testid="adm-logout">
              <LogOut size={14}/> {t("adm.logout")}
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-5 lg:px-8 py-8 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <TabBtn active={tab === "users"}    onClick={() => setTab("users")}    icon={Users}    label={t("adm.tab.users")}    testid="tab-users"/>
            <TabBtn active={tab === "requests"} onClick={() => setTab("requests")} icon={Inbox}    label={t("adm.tab.requests")} testid="tab-requests"/>
          </div>

          {tab === "users" ? <UsersTab/> : <RequestsTab/>}
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
//   USERS TAB
// ============================================================
function UsersTab() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null); // null | {} new | existing
  const [showPwById, setShowPwById] = useState({});
  const [docsOpenId, setDocsOpenId] = useState(null);
  const [docsByUser, setDocsByUser] = useState({});

  const load = async () => {
    try { setList(await api.adminListUsers()); } catch { toast.error("Load failed"); }
  };
  useEffect(() => { load(); }, []);

  const togglePw = (id) => setShowPwById(s => ({ ...s, [id]: !s[id] }));

  const toggleDocs = async (u) => {
    if (docsOpenId === u.id) { setDocsOpenId(null); return; }
    setDocsOpenId(u.id);
    if (!docsByUser[u.id]) {
      try {
        const docs = await api.adminListUserDocuments(u.id);
        setDocsByUser((d) => ({ ...d, [u.id]: docs }));
      } catch { toast.error("Failed to load documents"); }
    }
  };

  const remove = async (u) => {
    if (!window.confirm(t("adm.users.delete_confirm"))) return;
    try {
      await api.adminDeleteUser(u.id);
      toast.success(t("adm.users.deleted_toast"));
      load();
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="aif-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-white font-semibold">{t("adm.tab.users")}</div>
          <div className="text-[12px] text-[var(--aif-text-dim)]">{list.length} total</div>
        </div>
        <button onClick={() => setEditing({})} className="aif-btn-primary inline-flex items-center gap-2 !py-2 !text-sm" data-testid="adm-new-user">
          <Plus size={14}/> {t("adm.users.new")}
        </button>
      </div>

      <div className="aif-card p-0 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-[var(--aif-text-dim)] border-b border-[var(--aif-line)]">
              <th className="text-left p-3">{t("adm.users.first_name")}</th>
              <th className="text-left p-3">{t("adm.users.last_name")}</th>
              <th className="text-left p-3">{t("adm.users.email")}</th>
              <th className="text-left p-3">DOB</th>
              <th className="text-left p-3">{t("adm.users.password")}</th>
              <th className="text-left p-3">{t("adm.users.destination")}</th>
              <th className="text-left p-3">{t("adm.users.tier")}</th>
              <th className="text-left p-3">{t("adm.users.located")}</th>
              <th className="text-right p-3">{t("adm.users.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-[var(--aif-text-dim)]">{t("adm.users.empty")}</td></tr>
            )}
            {list.map(u => {
              const show = !!showPwById[u.id];
              return (
                <React.Fragment key={u.id}>
                <tr className="border-b border-[var(--aif-line)] hover:bg-white/[0.02]">
                  <td className="p-3 text-white">{u.first_name}</td>
                  <td className="p-3 text-white">{u.last_name}</td>
                  <td className="p-3 text-white">{u.email}</td>
                  <td className="p-3 text-[var(--aif-text-dim)] text-[12px]">{u.procedure_date_of_birth || "—"}</td>
                  <td className="p-3 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[#5FE3C9]">{show ? u.password : "••••••••"}</span>
                      <button onClick={() => togglePw(u.id)} className="text-[var(--aif-text-dim)] hover:text-white" title="Toggle">
                        {show ? <EyeOff size={13}/> : <Eye size={13}/>}
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="risk-badge risk-low">
                      {u.recovery_destination === "zenthos_wallet" ? "Zenthos Wallet" : "Chiantin Bank"}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--aif-text-dim)]">{u.amount_tier ? TIER_LABEL[u.amount_tier] : "—"}</td>
                  <td className="p-3 text-white">{u.located_amount ? `€ ${u.located_amount.toLocaleString("it-IT")}` : "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => toggleDocs(u)} className={`p-1.5 transition ${docsOpenId === u.id ? "text-[#5FE3C9]" : "text-[var(--aif-text-dim)] hover:text-[#5FE3C9]"}`} title="Documents" data-testid={`adm-docs-${u.id}`}>
                        <FileText size={14}/>
                      </button>
                      <button onClick={() => setEditing(u)} className="text-[var(--aif-text-dim)] hover:text-[#5FE3C9] p-1.5" title="Edit"><Edit2 size={14}/></button>
                      <button onClick={() => remove(u)} className="text-[var(--aif-text-dim)] hover:text-[#FF6B7A] p-1.5" title="Delete"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
                {docsOpenId === u.id && (
                  <tr className="bg-white/[0.015]">
                    <td colSpan={9} className="p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[#5FE3C9] mb-2">Uploaded documents</div>
                      {(docsByUser[u.id] === undefined) && <div className="text-[12px] text-[var(--aif-text-dim)]">Loading…</div>}
                      {(docsByUser[u.id] !== undefined) && docsByUser[u.id].length === 0 && (
                        <div className="text-[12px] text-[var(--aif-text-dim)]">No documents uploaded by this user.</div>
                      )}
                      {docsByUser[u.id] && docsByUser[u.id].length > 0 && (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {docsByUser[u.id].map((d) => {
                            const isImg = d.mime_type?.startsWith("image/");
                            return (
                              <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                                className="aif-card !rounded-xl p-3 flex items-center gap-3 hover:!border-[#5FE3C9]/50 transition">
                                {isImg && d.thumbnail_url ? (
                                  <img src={d.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover bg-[#0E1A36]"/>
                                ) : (
                                  <div className="w-10 h-10 rounded bg-[#5FE3C9]/15 border border-[#5FE3C9]/40 flex items-center justify-center text-[#5FE3C9]">
                                    <FileText size={16}/>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] text-white truncate">{d.original_name}</div>
                                  <div className="text-[10px] text-[var(--aif-text-dim)] mt-0.5">
                                    {d.mime_type} · {((d.size_bytes || 0) / 1024).toFixed(0)} KB
                                  </div>
                                </div>
                                <span className="text-[11px] text-[#5FE3C9]">Open ↗</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <UserForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }}/>}
    </div>
  );
}

function UserForm({ initial, onClose, onSaved }) {
  const { t } = useI18n();
  const isNew = !initial?.id;
  const [first, setFirst] = useState(initial.first_name || "");
  const [last, setLast]   = useState(initial.last_name || "");
  const [em, setEm]       = useState(initial.email || "");
  const [pw, setPw]       = useState(initial.password || "");
  const [dest, setDest]   = useState(initial.recovery_destination || "chiantin_bank");
  const [notes, setNotes] = useState(initial.notes || "");
  const [busy, setBusy]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isNew) {
        await api.adminCreateUser({ first_name: first, last_name: last, email: em, password: pw, recovery_destination: dest, notes });
        toast.success(t("adm.users.created_toast"));
      } else {
        const patch = { first_name: first, last_name: last, email: em, recovery_destination: dest, notes };
        if (pw) patch.password = pw;
        await api.adminUpdateUser(initial.id, patch);
        toast.success(t("adm.users.updated_toast"));
      }
      onSaved();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || "Save error");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="aif-card aif-glow w-full max-w-xl p-6" data-testid="user-form">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">{isNew ? t("adm.users.new") : t("adm.users.edit")}</h3>
          <button type="button" onClick={onClose} className="text-[var(--aif-text-dim)] hover:text-white"><X size={18}/></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("adm.users.first_name")}><input className="aif-input" data-testid="uf-first" value={first} onChange={(e) => setFirst(e.target.value)} required/></Field>
          <Field label={t("adm.users.last_name")}><input className="aif-input" data-testid="uf-last" value={last} onChange={(e) => setLast(e.target.value)} required/></Field>
        </div>
        <div className="mt-3"><Field label={t("adm.users.email")}><input type="email" className="aif-input" data-testid="uf-email" value={em} onChange={(e) => setEm(e.target.value)} required/></Field></div>
        <div className="mt-3"><Field label={t("adm.users.password") + (isNew ? "" : " (leave empty to keep)")}>
          <input className="aif-input" data-testid="uf-pw" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={isNew ? "min 4 chars" : "•••••"} required={isNew}/></Field></div>
        <div className="mt-3">
          <label className="aif-label">{t("adm.users.destination")}</label>
          <div className="grid sm:grid-cols-2 gap-2" data-testid="uf-dest">
            <button type="button" onClick={() => setDest("chiantin_bank")}
              data-testid="uf-dest-chiantin"
              className={`aif-card !rounded-xl p-3 flex items-center gap-3 ${dest === "chiantin_bank" ? "!border-[#5FE3C9]" : ""}`}>
              <Building2 size={18} className="text-[#5FE3C9]"/>
              <span className="text-white text-[13px]">Chiantin Bank</span>
            </button>
            <button type="button" onClick={() => setDest("zenthos_wallet")}
              data-testid="uf-dest-zenthos"
              className={`aif-card !rounded-xl p-3 flex items-center gap-3 ${dest === "zenthos_wallet" ? "!border-[#5FE3C9]" : ""}`}>
              <Wallet size={18} className="text-[#5FE3C9]"/>
              <span className="text-white text-[13px]">Zenthos Wallet</span>
            </button>
          </div>
        </div>
        <div className="mt-3"><Field label={t("adm.users.notes")}><textarea className="aif-input min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)}/></Field></div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="aif-btn-ghost !py-2 !text-sm">{t("adm.users.cancel")}</button>
          <button type="submit" disabled={busy} className="aif-btn-primary !py-2 !text-sm inline-flex items-center gap-2 disabled:opacity-60" data-testid="uf-save">
            <Save size={14}/> {busy ? "..." : t("adm.users.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="aif-label">{label}</label>{children}</div>;
}

// ============================================================
//   REQUESTS TAB
// ============================================================
function RequestsTab() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [openId, setOpenId] = useState(null);

  const load = async () => {
    try { setList(await api.adminListRequests()); } catch { toast.error("Load failed"); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="aif-card p-5 flex items-center justify-between">
        <div>
          <div className="text-white font-semibold">{t("adm.tab.requests")}</div>
          <div className="text-[12px] text-[var(--aif-text-dim)]">{list.length} total</div>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="aif-card p-6 text-[var(--aif-text-dim)] text-center">{t("adm.requests.empty")}</div>
      ) : (
        <div className="space-y-3">
          {list.map(r => (
            <RequestRow key={r.id} req={r} open={openId === r.id} setOpen={(v) => setOpenId(v ? r.id : null)} reload={load}/>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({ req, open, setOpen, reload }) {
  const { t } = useI18n();
  const [destEm, setDestEm] = useState(req.destination_login_email || "");
  const [destPw, setDestPw] = useState(req.destination_login_password || "");
  const [destUrl, setDestUrl] = useState(req.destination_login_url || "");
  const [extra, setExtra] = useState(req.extra_notes || "");
  const [busy, setBusy] = useState(false);

  const destLabel = req.recovery_destination === "zenthos_wallet" ? "Zenthos Wallet" : "Chiantin Bank";
  const DestIcon = req.recovery_destination === "zenthos_wallet" ? Wallet : Building2;

  const saveCreds = async () => {
    setBusy(true);
    try {
      await api.adminUpdateRequest(req.id, { destination_login_email: destEm, destination_login_password: destPw, destination_login_url: destUrl, extra_notes: extra });
      toast.success("Saved");
      reload();
    } catch { toast.error("Save error"); }
    finally { setBusy(false); }
  };

  const composeMailto = () => {
    if (!destEm || !destPw) { toast.error(t("adm.requests.fill_first")); return; }
    const amount = `€ ${(req.located_amount || 0).toLocaleString("it-IT")}`;
    const subject = `[Traccia Fondi] Recovery instructions — ${destLabel} — ${amount}`;
    const lines = [
      `Dear ${req.first_name} ${req.last_name},`,
      ``,
      `Following the completion of the Traccia Fondi tracing procedure, we can confirm that an amount of ${amount} associated with your case has been located at:`,
      ``,
      `  ${destLabel}`,
      ``,
      `Below you will find the access credentials we have prepared for you:`,
      ``,
      `  Login URL:  ${destUrl || (req.recovery_destination === "zenthos_wallet" ? "https://app.zenthos-wallet.com/login" : "https://secure.chiantin-bank.com/login")}`,
      `  Email:      ${destEm}`,
      `  Password:   ${destPw}`,
      ``,
      `Please access your account to verify the located funds and follow the on-screen instructions to complete the recovery.`,
      ``,
      extra ? `Additional notes:\n${extra}\n` : ``,
      `Important: keep these credentials private. Traccia Fondi will never ask you to share your password, OTP codes, seed phrases or to install any remote-access software.`,
      ``,
      `Best regards,`,
      `Traccia Fondi — Recovery Operations`,
    ].filter(Boolean);
    const body = lines.join("\n");
    const url = `mailto:${encodeURIComponent(req.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const markSent = async () => {
    try {
      await api.adminMarkSent(req.id);
      toast.success("Marked as sent");
      reload();
    } catch { toast.error("Error"); }
  };

  const remove = async () => {
    if (!window.confirm("Delete this request?")) return;
    try {
      await api.adminDeleteRequest(req.id);
      toast.success("Deleted");
      reload();
    } catch { toast.error("Error"); }
  };

  return (
    <div className={`aif-card p-4 transition ${open ? "aif-glow" : ""}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold">{req.first_name} {req.last_name}</span>
            <span className="text-[12px] text-[var(--aif-text-dim)]">·</span>
            <span className="text-[12px] text-[#5FE3C9]">{req.email}</span>
            <span className={`risk-badge !text-[9px] ${req.status === "sent" ? "risk-low" : "risk-medium"}`}>
              {req.status === "sent" ? t("adm.requests.status.sent") : t("adm.requests.status.pending")}
            </span>
          </div>
          <div className="text-[12px] text-[var(--aif-text-dim)] mt-1 flex items-center gap-3 flex-wrap">
            <span><DestIcon size={11} className="inline -mt-0.5 mr-1 text-[#5FE3C9]"/>{destLabel}</span>
            <span>€ {(req.located_amount || 0).toLocaleString("it-IT")}</span>
            <span>{new Date(req.created_at).toLocaleString()}</span>
          </div>
          {req.message && <div className="text-[12px] text-[var(--aif-text-dim)] mt-2 italic">"{req.message}"</div>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} className="aif-btn-ghost !py-1.5 !text-xs inline-flex items-center gap-1.5" data-testid={`req-toggle-${req.id}`}>
            <MailIcon size={12}/> {t("adm.requests.compose")}
          </button>
          {req.status !== "sent" && (
            <button onClick={markSent} className="aif-btn-ghost !py-1.5 !text-xs inline-flex items-center gap-1.5" title={t("adm.requests.mark_sent")}>
              <Check size={12}/>
            </button>
          )}
          <button onClick={remove} className="text-[var(--aif-text-dim)] hover:text-[#FF6B7A] p-1.5" title={t("adm.requests.delete")}><Trash2 size={14}/></button>
        </div>
      </div>

      {open && (
        <div className="mt-4 border-t border-[var(--aif-line)] pt-4 space-y-3">
          <Field label={t("adm.requests.dest_email")}>
            <input className="aif-input" value={destEm} onChange={(e) => setDestEm(e.target.value)} placeholder="login@chiantin-bank.com"/>
          </Field>
          <Field label={t("adm.requests.dest_password")}>
            <input className="aif-input font-mono" value={destPw} onChange={(e) => setDestPw(e.target.value)} placeholder="********"/>
          </Field>
          <Field label={t("adm.requests.dest_url")}>
            <input className="aif-input" value={destUrl} onChange={(e) => setDestUrl(e.target.value)} placeholder="https://secure.chiantin-bank.com/login"/>
          </Field>
          <Field label={t("adm.requests.extra_notes")}>
            <textarea className="aif-input min-h-[70px]" value={extra} onChange={(e) => setExtra(e.target.value)}/>
          </Field>
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <button onClick={saveCreds} disabled={busy} className="aif-btn-ghost !py-2 !text-sm inline-flex items-center gap-2 disabled:opacity-60">
              <Save size={14}/> {t("adm.users.save")}
            </button>
            <button onClick={composeMailto} className="aif-btn-primary !py-2 !text-sm inline-flex items-center gap-2" data-testid={`req-mailto-${req.id}`}>
              <Send size={14}/> {t("adm.requests.send_email")} <ExternalLink size={12}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
