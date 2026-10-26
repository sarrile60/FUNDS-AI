// Auth context — login + self-registration
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function _err(e, fallback) {
  const d = e?.response?.data?.detail;
  if (!d) return fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(x => x?.msg || JSON.stringify(x)).join(", ");
  if (typeof d === "object") return d.msg || JSON.stringify(d);
  return String(d);
}

const Ctx = createContext({ user: null, token: null });

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("aif_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aif_user") || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    else delete axios.defaults.headers.common["Authorization"];
  }, [token]);

  const persist = useCallback((tok, usr) => {
    setToken(tok); setUser(usr);
    if (tok) localStorage.setItem("aif_token", tok); else localStorage.removeItem("aif_token");
    if (usr) localStorage.setItem("aif_user", JSON.stringify(usr)); else localStorage.removeItem("aif_user");
  }, []);

  /**
   * Re-fetch the user profile from the server and update local state/storage.
   * Call this when the UserApp mounts so any admin-side changes (email, name, etc.)
   * are reflected immediately without requiring a new login.
   */
  const refreshUser = useCallback(async (tok) => {
    const activeToken = tok || token;
    if (!activeToken) return;
    try {
      const { data } = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      // Merge fresh server data into stored user (preserves role/id etc.)
      const fresh = { ...data };
      setUser(fresh);
      localStorage.setItem("aif_user", JSON.stringify(fresh));
    } catch {
      // Silent — if it fails (expired token etc.) the user stays as-is
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      persist(data.token, data.user);
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: _err(e, "Sign-in error") };
    } finally { setLoading(false); }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/register`, formData);
      persist(data.token, data.user);
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: _err(e, "Registration error") };
    } finally { setLoading(false); }
  };

  const logout = () => persist(null, null);

  return (
    <Ctx.Provider value={{ user, token, loading, login, register, logout, refreshUser, API }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
export const API_URL = API;
