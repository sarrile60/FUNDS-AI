// AdminLogin — separate login screen for admin route /admin
import React, { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Mail, KeyRound, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../auth";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user?.role === "admin") return <Navigate to="/admin/dashboard" replace/>;

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !pw) { toast.error("Email & password required"); return; }
    setBusy(true);
    const res = await login(email, pw);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    if (res.user?.role !== "admin") { toast.error("Not an admin account"); return; }
    toast.success("Welcome, admin");
    nav("/admin/dashboard");
  };

  return (
    <div className="aif-app-bg min-h-screen flex flex-col">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 py-6 w-full flex items-center justify-between gap-4">
        <Logo/>
        <Link to="/" className="aif-btn-ghost !py-2 !text-sm inline-flex items-center gap-2" data-testid="adm-back">
          <ArrowLeft size={14}/> Back
        </Link>
      </div>
      <div className="relative flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md">
          <div className="aif-card aif-glow p-7 md:p-9">
            <div className="w-12 h-12 rounded-xl bg-[#5FE3C9]/15 border border-[#5FE3C9]/40 flex items-center justify-center text-[#5FE3C9] mb-3">
              <ShieldCheck size={22}/>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Admin access</h1>
            <p className="text-[13px] text-[var(--aif-text-dim)] mt-1">Restricted area</p>

            <form onSubmit={submit} className="mt-6 space-y-4" data-testid="admin-login-form">
              <div>
                <label className="aif-label">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input type="email" className="aif-input pl-10" data-testid="adm-email"
                    value={email} onChange={(e) => setEmail(e.target.value)} required/>
                </div>
              </div>
              <div>
                <label className="aif-label">Password</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)]"/>
                  <input type={show ? "text" : "password"} className="aif-input pl-10 pr-10" data-testid="adm-password"
                    value={pw} onChange={(e) => setPw(e.target.value)} required/>
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aif-text-dim)] hover:text-white">
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={busy} className="aif-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="adm-submit">
                {busy ? "..." : "Access panel"} <ArrowRight size={16}/>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
