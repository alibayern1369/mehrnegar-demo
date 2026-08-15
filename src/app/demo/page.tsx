"use client";

import { useEffect, useState } from "react";
import { AppProvider, useApp } from "@/components/context";
import { Login } from "@/components/Login";
import { Shell } from "@/components/Shell";
import { IosInstallBanner } from "@/components/IosInstallBanner";

function App() {
  const { user, branding } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Fast readiness check — full migrations run in background when already seeded
    fetch("/api/setup?fast=1", { method: "POST" })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center"
        style={{ background: "linear-gradient(180deg,#07050f,#0c0a1d)" }}>
        <div className="text-center space-y-4">
          <div
            className={`grid h-20 w-20 place-items-center overflow-hidden text-3xl font-black text-white mx-auto ${
              branding.appLogo ? "" : "rounded-3xl grad-brand shadow-xl"
            }`}
          >
            {branding.appLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.appLogo} alt="" className="h-full w-full object-contain" />
            ) : (
              (branding.appName || "م").charAt(0)
            )}
          </div>
          <p className="text-white font-bold text-lg">{branding.appName}</p>
          <div className="flex items-center gap-2 text-white/50 text-sm justify-center">
            <svg className="anim-spin-slow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>
            در حال راه‌اندازی...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <IosInstallBanner />
      </>
    );
  }
  return (
    <>
      <Shell />
      <IosInstallBanner />
    </>
  );
}

export default function DemoPage() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
