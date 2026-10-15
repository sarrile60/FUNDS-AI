import React, { useState, useEffect } from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Toaster } from "sonner";
import axios from "axios";
import { I18nProvider } from "./i18n";
import { AuthProvider, useAuth } from "./auth";
import LandingPage from "./components/LandingPage";
import UserApp from "./components/UserApp";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import VerifyEmailPage from "./components/VerifyEmailPage";
import AdminPanel from "./components/AdminPanel";
import AgentPortal from "./components/AgentPortal";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import LegalPage from "./components/LegalPage";
import AboutPage from "./components/AboutPage";
import ContactPage from "./components/ContactPage";
import SecurityPage from "./components/SecurityPage";
import NotFoundPage from "./components/NotFoundPage";
import CookieBanner from "./components/CookieBanner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace/>;
  if (user.role !== "admin") return <Navigate to="/app" replace/>;
  return children;
}

/**
 * Resolves a dynamic slug against the configured agent portal slug from the backend.
 * If the slug matches, renders AgentPortal. Otherwise renders NotFoundPage.
 */
function AgentPortalGate() {
  const { slug } = useParams();
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "not_found"

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/agent/portal-slug`)
      .then(({ data }) => {
        if (data.slug && data.slug === slug) setStatus("ok");
        else setStatus("not_found");
      })
      .catch(() => setStatus("not_found"));
  }, [slug]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#060B18", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: "2.5px solid #5FE3C9", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    );
  }
  if (status === "not_found") return <NotFoundPage/>;
  return <AgentPortal/>;
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage/>}/>
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/register" element={<RegisterPage/>}/>
            <Route path="/verify-email" element={<VerifyEmailPage/>}/>
            <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
            <Route path="/reset-password" element={<ResetPasswordPage/>}/>
            <Route path="/app" element={<UserApp/>}/>
            <Route path="/start" element={<UserApp/>}/>
            <Route path="/trace" element={<UserApp/>}/>
            {/* /admin now redirects to /login — login page handles both admin & user */}
            <Route path="/admin" element={<Navigate to="/login" replace/>}/>
            <Route path="/admin/dashboard" element={<RequireAdmin><AdminPanel/></RequireAdmin>}/>
            <Route path="/about"   element={<AboutPage/>}/>
            <Route path="/contact" element={<ContactPage/>}/>
            <Route path="/security" element={<SecurityPage/>}/>
            <Route path="/terms"   element={<LegalPage kind="terms"/>}/>
            <Route path="/privacy" element={<LegalPage kind="privacy"/>}/>
            <Route path="/cookies" element={<LegalPage kind="cookies"/>}/>
            {/* Dynamic agent portal slug — configured by admin */}
            <Route path="/:slug" element={<AgentPortalGate/>}/>
            <Route path="*" element={<NotFoundPage/>}/>
          </Routes>
          <CookieBanner/>
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" richColors/>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
