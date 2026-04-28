import React from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { I18nProvider } from "./i18n";
import { AuthProvider } from "./auth";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import AppShell from "./components/AppShell";

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage/>}/>
            <Route path="/login" element={<AuthPage mode="login"/>}/>
            <Route path="/register" element={<AuthPage mode="register"/>}/>
            <Route path="/app" element={<AppShell/>}/>
            <Route path="*" element={<LandingPage/>}/>
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" richColors/>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
