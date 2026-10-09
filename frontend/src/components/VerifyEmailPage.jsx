// VerifyEmailPage — handles /verify-email?token=xxx
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Logo from "./Logo";
import { useI18n } from "../i18n";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VerifyEmailPage() {
  const { lang } = useI18n();
  const isIt = lang === "it";
  const [params] = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "already" | "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(isIt ? "Link di verifica non valido." : "Invalid verification link.");
      return;
    }

    axios.get(`${API}/auth/verify-email`, { params: { token } })
      .then(({ data }) => {
        if (data.already_verified) {
          setStatus("already");
        } else {
          setStatus("success");
        }
      })
      .catch((e) => {
        setStatus("error");
        const detail = e?.response?.data?.detail;
        setMessage(typeof detail === "string" ? detail : (isIt ? "Link scaduto o non valido." : "Link expired or invalid."));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isIt]);

  return (
    <div className="aif-app-bg min-h-screen relative flex flex-col">
      <div className="aif-grid-overlay absolute inset-0 pointer-events-none"/>
      <div className="relative flex-1 flex flex-col">
        <header className="px-5 lg:px-8 py-5">
          <Link to="/"><Logo/></Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">
            <div className="aif-card aif-glow p-8 md:p-10 text-center relative overflow-hidden">
              <div className="aif-grid-overlay absolute inset-0 opacity-25 pointer-events-none"/>
              <div className="relative z-10">

                {status === "loading" && (
                  <>
                    <Loader2 size={48} className="mx-auto text-[#5FE3C9] animate-spin mb-4"/>
                    <h2 className="text-xl font-bold text-white">
                      {isIt ? "Verifica in corso…" : "Verifying…"}
                    </h2>
                  </>
                )}

                {status === "success" && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#4ADE80]/15 border border-[#4ADE80]/40 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={36} className="text-[#4ADE80]"/>
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      {isIt ? "Email verificata!" : "Email verified!"}
                    </h2>
                    <p className="text-[var(--aif-text-dim)] mt-3 text-[14px]">
                      {isIt
                        ? "Il tuo account è attivo. Accedi per avviare la procedura di tracciamento."
                        : "Your account is active. Sign in to start the tracing procedure."}
                    </p>
                    <Link to="/login"
                      className="aif-btn-primary inline-flex items-center gap-2 mt-6"
                      data-testid="verify-go-login"
                    >
                      {isIt ? "Accedi ora" : "Sign in now"}
                    </Link>
                  </>
                )}

                {status === "already" && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#5FE3C9]/15 border border-[#5FE3C9]/40 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={36} className="text-[#5FE3C9]"/>
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      {isIt ? "Già verificato" : "Already verified"}
                    </h2>
                    <p className="text-[var(--aif-text-dim)] mt-3 text-[14px]">
                      {isIt
                        ? "Il tuo account è già stato verificato. Puoi accedere."
                        : "Your account is already verified. You can sign in."}
                    </p>
                    <Link to="/login" className="aif-btn-primary inline-flex items-center gap-2 mt-6">
                      {isIt ? "Accedi" : "Sign in"}
                    </Link>
                  </>
                )}

                {status === "error" && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#FF6B7A]/15 border border-[#FF6B7A]/40 flex items-center justify-center mx-auto mb-4">
                      <XCircle size={36} className="text-[#FF6B7A]"/>
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      {isIt ? "Link non valido" : "Invalid link"}
                    </h2>
                    <p className="text-[var(--aif-text-dim)] mt-3 text-[14px]">
                      {message || (isIt ? "Il link è scaduto o non valido." : "The link is expired or invalid.")}
                    </p>
                    <Link to="/register" className="aif-btn-ghost inline-flex items-center gap-2 mt-6 !text-sm">
                      {isIt ? "Registrati di nuovo" : "Register again"}
                    </Link>
                  </>
                )}

              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
