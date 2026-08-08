"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  role: "manager" | "user";
  permissions: string[];
  gender?: string | null;
  isBootstrap?: boolean;
};

export type AppBranding = {
  appName: string;
  appLogo: string | null;
  developerUrl: string;
};

type Toast = { id: number; msg: string; kind: "success" | "info" | "error" };

type Ctx = {
  theme: "light" | "dark";
  toggleTheme: () => void;
  online: boolean;
  setOnline: (v: boolean) => void;
  toasts: Toast[];
  toast: (msg: string, kind?: Toast["kind"]) => void;
  pendingSync: number;
  addPending: (n?: number) => void;
  clearPending: () => void;
  user: SessionUser | null;
  token: string | null;
  login: (user: SessionUser, token: string) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
  isManager: boolean;
  branding: AppBranding;
  refreshBranding: () => Promise<void>;
  setBranding: (b: AppBranding) => void;
};

const DEFAULT_BRANDING: AppBranding = {
  appName: "مهرنگار",
  appLogo: null,
  developerUrl: "https://kishlandweb.ir",
};

const AppCtx = createContext<Ctx | null>(null);

function applyFavicon(logo: string | null) {
  if (typeof document === "undefined") return;
  const id = "app-dynamic-favicon";
  let link = document.getElementById(id) as HTMLLinkElement | null;

  // Browser tab favicon can use the data URL; iOS home-screen icon cannot —
  // Safari only accepts a real http(s) apple-touch-icon (see /apple-icon).
  const bust = logo ? String(logo.length) : "0";

  if (!logo) {
    if (link) link.remove();
  } else {
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (logo.startsWith("/")) {
      link.type = "image/png";
      link.href = logo;
    } else {
      link.type = logo.startsWith("data:image/svg") ? "image/svg+xml" : "image/png";
      link.href = logo;
    }
  }

  let apple = document.getElementById("app-apple-touch") as HTMLLinkElement | null;
  if (!apple) {
    apple = document.createElement("link");
    apple.id = "app-apple-touch";
    apple.rel = "apple-touch-icon";
    apple.setAttribute("sizes", "180x180");
    document.head.appendChild(apple);
  }
  apple.href = `/apple-icon?v=${bust}`;
}

function applyPwaTitle() {
  if (typeof document === "undefined") return;
  let meta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "apple-mobile-web-app-title";
    document.head.appendChild(meta);
  }
  meta.content = "مهرنگار";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme]     = useState<"light" | "dark">("dark");
  const [online, setOnline]   = useState(true);
  const [toasts, setToasts]   = useState<Toast[]>([]);
  const [pendingSync, setPending] = useState(0);
  const [user, setUser]       = useState<SessionUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [branding, setBrandingState] = useState<AppBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const login = useCallback((u: SessionUser, t: string) => {
    setUser(u); setToken(t);
    try { localStorage.setItem("cf_session", JSON.stringify({ user: u, token: t })); } catch { /* ignore */ }
  }, []);

  const logout = useCallback(() => {
    setUser(null); setToken(null);
    try { localStorage.removeItem("cf_session"); } catch { /* ignore */ }
  }, []);

  const refreshSession = useCallback(async () => {
    let t: string | null = token;
    if (!t) {
      try {
        const saved = localStorage.getItem("cf_session");
        if (saved) t = JSON.parse(saved)?.token ?? null;
      } catch { /* ignore */ }
    }
    if (!t) return;
    try {
      const res = await fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const d = await res.json();
      if (d.ok && d.user && d.token) {
        login(d.user, d.token);
      } else if (res.status === 401) {
        logout();
      }
    } catch { /* ignore */ }
  }, [token, login, logout]);

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = localStorage.getItem("cf_session");
      if (saved) {
        const { user: u, token: t } = JSON.parse(saved);
        if (!cancelled && t) {
          setUser(u);
          setToken(t);
        }
      }
    } catch { /* ignore */ }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!token) return;
    void refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once per login/restore
  }, [Boolean(token)]);

  const setBranding = useCallback((b: AppBranding) => {
    setBrandingState(b);
    applyFavicon(b.appLogo);
    applyPwaTitle();
    try {
      document.title = `${b.appName} | سامانه حسابداری و انبارداری`;
    } catch { /* ignore */ }
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      const res = await fetch("/api/app-settings");
      const d = await res.json();
      if (d.ok && d.settings) {
        setBranding({
          appName: d.settings.appName || "مهرنگار",
          appLogo: d.settings.appLogo ?? null,
          developerUrl: d.settings.developerUrl || "https://kishlandweb.ir",
        });
      }
    } catch { /* ignore */ }
  }, [setBranding]);

  useEffect(() => {
    applyPwaTitle();
    applyFavicon(null);
    refreshBranding();
  }, [refreshBranding]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  const toast = useCallback((msg: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const addPending   = useCallback((n = 1) => setPending((p) => p + n), []);
  const clearPending = useCallback(() => setPending(0), []);

  return (
    <AppCtx.Provider value={{
      theme, toggleTheme, online, setOnline, toasts, toast,
      pendingSync, addPending, clearPending,
      user, token, login, logout, refreshSession, isManager: user?.role === "manager",
      branding, refreshBranding, setBranding,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
