"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Field } from "./ui";
import { I } from "./icons";
import {
  FA_MONTHS_FULL,
  FA_WEEKDAYS_SHORT,
  formatJalali,
  gregorianIsoToJalali,
  jalaliMonthLength,
  jalaliToGregorianIso,
  jalaliWeekday,
  parseJalali,
  shiftJalaliMonth,
  todayJalali,
} from "@/lib/jalali";
import { toFa } from "@/lib/format";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  allowEmpty?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
  valueCalendar?: "jalali" | "gregorian";
};

function parseValue(value: string, valueCalendar: "jalali" | "gregorian") {
  return valueCalendar === "gregorian" ? gregorianIsoToJalali(value) : parseJalali(value);
}

function displayValue(value: string, valueCalendar: "jalali" | "gregorian") {
  const p = parseValue(value, valueCalendar);
  if (!p) return "";
  return toFa(`${String(p.jy).padStart(4, "0")}/${String(p.jm).padStart(2, "0")}/${String(p.jd).padStart(2, "0")}`);
}

export function JalaliDatePicker({
  value,
  onChange,
  label = "تاریخ تولد",
  required = false,
  allowEmpty = true,
  className,
  minYear = 1300,
  maxYear,
  valueCalendar = "jalali",
}: Props) {
  const today = useMemo(() => todayJalali(), []);
  const yearMax = maxYear ?? today.jy + (valueCalendar === "gregorian" ? 1 : 0);
  const yearMin = minYear;

  const selected = parseValue(value, valueCalendar);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({
    jy: selected?.jy ?? today.jy,
    jm: selected?.jm ?? today.jm,
  }));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const daysInMonth = jalaliMonthLength(view.jy, view.jm);
  const startWeekday = jalaliWeekday(view.jy, view.jm, 1) ?? 0;

  const cells = useMemo(() => {
    const list: ({ kind: "empty" } | { kind: "day"; day: number })[] = [];
    for (let i = 0; i < startWeekday; i++) list.push({ kind: "empty" });
    for (let d = 1; d <= daysInMonth; d++) list.push({ kind: "day", day: d });
    while (list.length % 7 !== 0) list.push({ kind: "empty" });
    return list;
  }, [daysInMonth, startWeekday]);

  const canPrev = view.jy > yearMin || (view.jy === yearMin && view.jm > 1);
  const canNext = view.jy < yearMax || (view.jy === yearMax && view.jm < 12);

  const emit = (jy: number, jm: number, jd: number) => {
    const nextValue = valueCalendar === "gregorian"
      ? jalaliToGregorianIso(jy, jm, jd)
      : formatJalali(jy, jm, jd);
    onChange(nextValue ?? "");
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setOpen(false);
  };

  const goMonth = (delta: number) => {
    const next = shiftJalaliMonth(view.jy, view.jm, delta);
    if (next.jy < yearMin || next.jy > yearMax) return;
    setView(next);
  };

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = yearMax; y >= yearMin; y--) list.push(y);
    return list;
  }, [yearMax, yearMin]);

  const shown = displayValue(value, valueCalendar);

  return (
    <Field label={`${label}${required ? " *" : ""}`} className={className}>
      <div ref={rootRef} className="relative min-w-0">
        <button
          type="button"
          onClick={() => {
            if (!open) {
              const p = parseValue(value, valueCalendar);
              setView({ jy: p?.jy ?? today.jy, jm: p?.jm ?? today.jm });
            }
            setOpen((v) => !v);
          }}
          className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-white/20 bg-white/70 px-3 py-2.5 text-right text-base text-strong outline-none transition hover:bg-white/85 focus:border-brand-400 focus:ring-brand dark:bg-white/8 dark:hover:bg-white/12 sm:px-4"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={`min-w-0 flex-1 truncate ${shown ? "font-semibold tabular-nums" : "text-muted"}`} dir="ltr">
            {shown || "انتخاب تاریخ"}
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-muted" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 11h18" />
          </svg>
        </button>

        {open && (
          <div
            className="popover absolute z-50 mt-2 w-[min(100%,20rem)] rounded-2xl p-3 anim-scale-in"
            role="dialog"
            aria-label="تقویم شمسی"
            dir="rtl"
          >
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                disabled={!canNext}
                onClick={() => goMonth(1)}
                className="press grid h-8 w-8 shrink-0 place-items-center rounded-xl glass-2 text-strong disabled:opacity-35"
                aria-label="ماه بعد"
              >
                <I.arrow width={14} className="rotate-180" />
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <select
                  value={view.jm}
                  onChange={(e) => setView((v) => ({ ...v, jm: Number(e.target.value) }))}
                  className="ui-select min-w-0 flex-[1.4] rounded-xl border border-white/15 bg-transparent px-2 py-1.5 text-sm font-semibold text-strong outline-none"
                >
                  {FA_MONTHS_FULL.map((name, i) => (
                    <option key={name} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={view.jy}
                  onChange={(e) => setView((v) => ({ ...v, jy: Number(e.target.value) }))}
                  className="ui-select min-w-0 flex-1 rounded-xl border border-white/15 bg-transparent px-2 py-1.5 text-sm font-semibold text-strong outline-none"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{toFa(y)}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={!canPrev}
                onClick={() => goMonth(-1)}
                className="press grid h-8 w-8 shrink-0 place-items-center rounded-xl glass-2 text-strong disabled:opacity-35"
                aria-label="ماه قبل"
              >
                <I.arrow width={14} />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center">
              {FA_WEEKDAYS_SHORT.map((d) => (
                <span key={d} className="py-1 text-[11px] font-bold text-muted">{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell, i) => {
                if (cell.kind === "empty") {
                  return <span key={`e-${i}`} className="aspect-square" />;
                }
                const isSelected = !!selected
                  && selected.jy === view.jy
                  && selected.jm === view.jm
                  && selected.jd === cell.day;
                const isToday = today.jy === view.jy && today.jm === view.jm && today.jd === cell.day;
                return (
                  <button
                    key={cell.day}
                    type="button"
                    onClick={() => emit(view.jy, view.jm, cell.day)}
                    className={`press aspect-square rounded-xl text-sm font-semibold transition ${
                      isSelected
                        ? "grad-brand text-white shadow-md shadow-brand-500/30"
                        : isToday
                          ? "bg-brand-500/15 text-brand-600 ring-1 ring-brand-500/30 dark:text-brand-300"
                          : "text-strong hover:bg-white/10"
                    }`}
                  >
                    {toFa(cell.day)}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={() => emit(today.jy, today.jm, today.jd)}
                className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-300"
              >
                امروز
              </button>
              {allowEmpty && (
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-white/8 hover:text-strong"
                >
                  پاک کردن
                </button>
              )}
              {!allowEmpty && required && !value && (
                <span className="text-[11px] text-rose-400">الزامی</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}
