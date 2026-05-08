import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, Globe } from "lucide-react";
import Logo from "./Logo";
import { useI18n } from "../i18n";
import { useAuth } from "../auth";

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const items = [
    { id: "how", label: t("nav.how") },
    { id: "scams", label: t("nav.scams") },
    { id: "tracing", label: t("nav.tracing") },
    { id: "reports", label: t("nav.reports") },
    { id: "faq", label: t("nav.faq") },
  ];

  // Smooth-scroll with easing + sticky-navbar offset
  const scrollTo = (id) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    const navOffset = 72; // sticky navbar height
    const startY = window.scrollY;
    const targetY = el.getBoundingClientRect().top + window.scrollY - navOffset;
    const distance = targetY - startY;
    const duration = 1100; // ms — slow enough to feel premium
    const startTime = performance.now();
    // easeInOutCubic
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      window.scrollTo(0, startY + distance * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else {
        // brief highlight pulse on the target section
        el.classList.add("aif-section-pulse");
        setTimeout(() => el.classList.remove("aif-section-pulse"), 1400);
      }
    };
    requestAnimationFrame(step);
  };

  return (
    <header className="sticky top-0 z-50 bg-[rgba(6,11,24,0.92)] border-b border-[var(--aif-line)]">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" data-testid="nav-home"><Logo /></Link>

        <nav className="hidden lg:flex items-center gap-7 text-[14px] text-[var(--aif-text-dim)]">
          {items.map((i) => (
            <button key={i.id} className="hover:text-white transition" onClick={() => scrollTo(i.id)} data-testid={`nav-${i.id}`}>
              {i.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            data-testid="lang-toggle"
            onClick={() => setLang(lang === "it" ? "en" : "it")}
            className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--aif-text-dim)] hover:text-white transition px-2.5 py-1.5 rounded-lg border border-[var(--aif-line)]"
          >
            <Globe size={14} /> {lang.toUpperCase()}
          </button>

          {user ? (
            <>
              <button onClick={() => nav("/app")} className="aif-btn-ghost hidden md:inline-flex items-center gap-2 !py-2 !text-sm" data-testid="nav-dashboard">
                <LayoutDashboard size={16} /> {t("nav.dashboard")}
              </button>
              <button onClick={() => { logout(); nav("/"); }} className="text-[var(--aif-text-dim)] hover:text-white p-2" title={t("nav.logout")} data-testid="nav-logout">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="aif-btn-primary !py-2.5 !px-4 !text-sm" data-testid="nav-start">{t("nav.start")}</Link>
            </>
          )}

          <button className="lg:hidden text-white" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[var(--aif-line)] bg-[#06122A] px-5 py-3 space-y-2">
          {items.map((i) => (
            <button key={i.id} className="block w-full text-left py-2 text-[var(--aif-text-dim)]" onClick={() => scrollTo(i.id)}>
              {i.label}
            </button>
          ))}
          <button onClick={() => setLang(lang === "it" ? "en" : "it")} className="aif-chip mt-2"><Globe size={14}/> {lang.toUpperCase()}</button>
        </div>
      )}
    </header>
  );
}
