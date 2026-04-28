// AppShell — authenticated experience: wizard → live tracing → dashboard
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "./Navbar";
import CaseWizard from "./CaseWizard";
import LiveFundTracingAnimation from "./LiveFundTracingAnimation";
import CaseDashboard from "./CaseDashboard";
import CasesList from "./CasesList";
import Footer from "./Footer";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { api } from "../api";
import { toast } from "sonner";

export default function AppShell() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [view, setView] = useState("wizard"); // wizard | tracing | dashboard
  const [activeCase, setActiveCase] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // On mount, if user has cases, jump to dashboard of latest
  useEffect(() => {
    (async () => {
      try {
        const list = await api.listCases();
        if (list && list.length > 0) {
          setActiveCase(list[0]);
          setView("dashboard");
        }
      } catch {}
    })();
  }, []);

  if (!user) return <Navigate to="/login" replace state={{ next: "/app" }}/>;

  const onCaseReady = (created) => {
    setActiveCase(created);
    setRefreshKey(k => k + 1);
    setView("tracing");
  };

  const onTracingComplete = async () => {
    if (!activeCase) return;
    try { await api.analyze(activeCase.id, lang); }
    catch { toast.error("Errore nell'analisi"); }
    setRefreshKey(k => k + 1);
    setView("dashboard");
  };

  const startNewCase = () => { setActiveCase(null); setView("wizard"); };

  const selectCase = async (id) => {
    try {
      const c = await api.getCase(id);
      setActiveCase(c);
      setView("dashboard");
    } catch { toast.error("Caso non trovato"); }
  };

  return (
    <div className="aif-app-bg min-h-screen relative">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative">
        <Navbar/>
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8 grid lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3 hidden lg:block">
            <CasesList
              activeId={activeCase?.id}
              onSelect={selectCase}
              onNew={startNewCase}
              refreshKey={refreshKey}
            />
          </aside>

          <main className="lg:col-span-9 space-y-5">
            {view === "wizard" && <CaseWizard onCaseReady={onCaseReady}/>}
            {view === "tracing" && (
              <LiveFundTracingAnimation
                scam={activeCase?.scam_type}
                pay={activeCase?.payment_method}
                onComplete={onTracingComplete}
              />
            )}
            {view === "dashboard" && activeCase && (
              <CaseDashboard
                caseId={activeCase.id}
                onNewCase={startNewCase}
              />
            )}
          </main>
        </div>
        <Footer/>
      </div>
    </div>
  );
}
