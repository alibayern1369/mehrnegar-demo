"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { I } from "./icons";

export function Glass({ className = "", children, hover = false, onClick }: { className?: string; children: ReactNode; hover?: boolean; onClick?: () => void }) {
  return <div className={`glass rounded-3xl ${hover ? "hover-lift" : ""} ${className}`} onClick={onClick}>{children}</div>;
}

const toneMap: Record<string, string> = {
  brand: "bg-brand-500/15 text-brand-600 dark:text-brand-300 ring-brand-500/20",
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/20",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/20",
  red: "bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/20",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/20",
  cyan: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 ring-cyan-500/20",
  gray: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/20",
};

export function Badge({ tone = "brand", children, className = "" }: { tone?: keyof typeof toneMap | string; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${toneMap[tone] ?? toneMap.brand} ${className}`}>{children}</span>;
}

export function Btn({ children, onClick, variant = "primary", className = "", type = "button", disabled }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "soft" | "danger"; className?: string; type?: "button" | "submit"; disabled?: boolean }) {
  const styles: Record<string, string> = {
    primary: "grad-brand text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50",
    ghost: "glass-2 text-strong hover:bg-white/10",
    soft: "bg-brand-500/12 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20",
    danger: "bg-rose-500/90 text-white hover:bg-rose-500",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`press inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) {
      window.addEventListener("keydown", h);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 anim-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className={`modal-panel relative z-10 w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[min(88vh,100dvh-1.5rem)] overflow-y-auto rounded-3xl p-5 sm:p-6 anim-scale-in`}>
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-lg font-bold text-strong">{title}</h3>
          <button onClick={onClose} className="press rounded-full p-2 text-muted hover:bg-white/10"><I.close /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Full-viewport panel — portaled to body so scroll/transform ancestors cannot clip it */
export function FullPagePanel({ open, onClose, title, subtitle, children, footer }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const wasOpen = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    // Reset scroll only on open transition (not when parent re-renders)
    if (!wasOpen.current) {
      wasOpen.current = true;
      requestAnimationFrame(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
      });
    }
    const h = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col anim-fade-in" style={{ height: "100dvh" }}>
      <div className="modal-panel flex h-full min-h-0 w-full flex-col rounded-none border-0 md:m-3 md:h-[calc(100dvh-1.5rem)] md:w-[calc(100%-1.5rem)] md:rounded-3xl md:border">
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-3 sm:gap-3 sm:px-4 md:px-6">
          <button onClick={onClose} className="press shrink-0 rounded-2xl glass-2 p-2.5 text-muted hover:text-strong" title="بازگشت">
            <I.arrow width={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-strong sm:text-lg">{title}</h3>
            {subtitle && <p className="truncate text-[11px] text-muted sm:text-xs">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="press shrink-0 rounded-full p-2 text-muted hover:bg-white/10"><I.close /></button>
        </div>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 md:px-6 md:py-5">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-white/10 px-3 py-3 sm:px-4 md:px-6 safe-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-2xl border border-white/20 bg-white/70 dark:bg-white/8 px-4 py-2.5 text-base text-strong outline-none transition placeholder:text-muted focus:border-brand-400 focus:bg-white/90 dark:focus:bg-white/12 focus:ring-brand ${props.className ?? ""}`} />;
}

/** Password field with show/hide eye toggle */
export function PasswordInput({
  className = "",
  inputClassName = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full rounded-2xl border border-white/20 bg-white/70 dark:bg-white/8 px-4 py-2.5 pl-11 text-base text-strong outline-none transition placeholder:text-muted focus:border-brand-400 focus:bg-white/90 dark:focus:bg-white/12 focus:ring-brand ${inputClassName}`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "مخفی کردن رمز" : "نمایش رمز"}
        onClick={() => setVisible((v) => !v)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-strong"
      >
        {visible ? <I.eyeOff width={18} /> : <I.eye width={18} />}
      </button>
    </div>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`ui-select w-full rounded-2xl border border-white/20 bg-white/70 dark:bg-[var(--modal-bg)] px-4 py-2.5 text-base text-strong outline-none transition focus:border-brand-400 focus:ring-brand ${props.className ?? ""}`}
    />
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`press relative h-7 w-12 rounded-full transition ${on ? "grad-brand" : "bg-slate-400/40"}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "right-1" : "right-6"}`} />
    </button>
  );
}

export function SectionTitle({ icon, title, sub, action }: { icon?: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        {icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl grad-brand text-white shadow-lg shadow-brand-500/30 sm:h-11 sm:w-11">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-snug text-strong sm:text-2xl">{title}</h1>
          {sub && <p className="mt-0.5 text-xs leading-5 text-muted sm:text-sm">{sub}</p>}
        </div>
      </div>
      {action && <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{action}</div>}
    </div>
  );
}

export function Progress({ value, tone = "brand" }: { value: number; tone?: string }) {
  const colors: Record<string, string> = {
    brand: "grad-brand", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-rose-500", sky: "bg-sky-500",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
      <div className={`h-full rounded-full ${colors[tone] ?? colors.brand} transition-all duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
