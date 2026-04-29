// NotFoundPage — polished 404 page.
import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Search } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";
import { useI18n } from "../i18n";

export default function NotFoundPage() {
  const { lang } = useI18n();
  const isIt = lang === "it";
  return (
    <div className="aif-app-bg min-h-screen relative flex flex-col">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative flex-1 flex flex-col">
        <header className="border-b border-[var(--aif-line)] bg-[rgba(6,11,24,0.92)]">
          <div className="max-w-5xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="aif-btn-ghost !py-2 !text-sm inline-flex items-center gap-2">
              <ArrowLeft size={14}/> {isIt ? "Indietro" : "Back"}
            </Link>
            <Link to="/"><Logo/></Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-20">
          <div className="text-center max-w-xl">
            <div className="text-[140px] md:text-[180px] font-black leading-none bg-clip-text text-transparent bg-gradient-to-r from-[#5FE3C9] to-[#6E8BFF]">404</div>
            <h1 className="section-title mt-2">
              {isIt ? "Pagina non trovata" : "Page not found"}
            </h1>
            <p className="text-[var(--aif-text-dim)] mt-4 leading-relaxed">
              {isIt
                ? "La pagina che stai cercando non esiste o è stata spostata. Torna alla home o contattaci se pensi sia un errore."
                : "The page you're looking for doesn't exist or was moved. Go back home, or contact us if you think this is a mistake."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/" className="aif-btn-primary inline-flex items-center gap-2">
                <Home size={16}/> {isIt ? "Torna alla home" : "Go to home"}
              </Link>
              <Link to="/contact" className="aif-btn-ghost inline-flex items-center gap-2">
                <Search size={16}/> {isIt ? "Contattaci" : "Contact us"}
              </Link>
            </div>
          </div>
        </main>
        <Footer/>
      </div>
    </div>
  );
}
