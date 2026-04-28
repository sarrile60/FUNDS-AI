import React from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { I18nProvider } from "./i18n";
import { AuthProvider, useAuth } from "./auth";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import UserApp from "./components/UserApp";
import AdminLogin from "./components/AdminLogin";
import AdminPanel from "./components/AdminPanel";

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin" replace/>;
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
            <Route path="/login" element={<AuthPage mode="login"/>}/>
            <Route path="/register" element={<AuthPage mode="register"/>}/>
            <Route path="/app" element={<UserApp/>}/>
            <Route path="/admin" element={<AdminLogin/>}/>
            <Route path="/admin/dashboard" element={<RequireAdmin><AdminPanel/></RequireAdmin>}/>
            <Route path="*" element={<LandingPage/>}/>
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" richColors/>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
