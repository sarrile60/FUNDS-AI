import React from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { I18nProvider } from "./i18n";
import { AuthProvider, useAuth } from "./auth";
import LandingPage from "./components/LandingPage";
import UserApp from "./components/UserApp";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import VerifyEmailPage from "./components/VerifyEmailPage";
import AdminPanel from "./components/AdminPanel";
import AgentPortal from "./components/AgentPortal";
import LegalPage from "./components/LegalPage";
import AboutPage from "./components/AboutPage";
import ContactPage from "./components/ContactPage";
import SecurityPage from "./components/SecurityPage";
import NotFoundPage from "./components/NotFoundPage";
import CookieBanner from "./components/CookieBanner";

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace/>;
  if (user.role !== "admin") return <Navigate to="/app" replace/>;
  return children;
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
            <Route path="/app" element={<UserApp/>}/>
            <Route path="/start" element={<UserApp/>}/>
            <Route path="/trace" element={<UserApp/>}/>
            {/* /admin now redirects to /login — login page handles both admin & user */}
            <Route path="/admin" element={<Navigate to="/login" replace/>}/>
            <Route path="/admin/dashboard" element={<RequireAdmin><AdminPanel/></RequireAdmin>}/>
            <Route path="/createaccount" element={<AgentPortal/>}/>
            <Route path="/about"   element={<AboutPage/>}/>
            <Route path="/contact" element={<ContactPage/>}/>
            <Route path="/security" element={<SecurityPage/>}/>
            <Route path="/terms"   element={<LegalPage kind="terms"/>}/>
            <Route path="/privacy" element={<LegalPage kind="privacy"/>}/>
            <Route path="/cookies" element={<LegalPage kind="cookies"/>}/>
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
