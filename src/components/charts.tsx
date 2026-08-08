"use client";

import { useState } from "react";
import { toFa } from "@/lib/format";

export function LineChart({ data, color = "#7c4dff" }: { data: { label: string; value: number }[]; color?: string }) {
  const w = 520, h = 200, pad = 28;
  const max = Math.max(...data.map((d) => d.value)) * 1.15;
  const min = 0;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (data.length - 1);
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${path} L${x(data.length - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ transform: "scaleX(-1)" }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={pad} x2={w - pad} y1={pad + g * (h - pad * 2)} y2={pad + g * (h - pad * 2)} stroke="currentColor" strokeOpacity="0.08" />
      ))}
      <path d={area} fill="url(#lg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <circle cx={p[0]} cy={p[1]} r={hover === i ? 6 : 4} fill="#fff" stroke={color} strokeWidth="2.5" />
          {hover === i && (
            <g style={{ transform: "scaleX(-1)", transformOrigin: `${p[0]}px 0px` }}>
              <text x={p[0]} y={p[1] - 14} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">{toFa(data[i].value)}</text>
            </g>
          )}
          <rect x={p[0] - 18} width="36" y={0} height={h} fill="transparent" />
        </g>
      ))}
      {data.map((d, i) => (
        <g key={i} style={{ transform: "scaleX(-1)", transformOrigin: `${x(i)}px 0px` }}>
          <text x={x(i)} y={h - 6} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function BarChart({ data, color = "#06b6d4" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  return (
    <div className="flex h-52 items-end justify-around gap-3 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-bold text-strong">{toFa(d.value)}</span>
          <div className="flex w-full justify-center">
            <div className="w-8 rounded-t-xl rounded-b-md transition-all duration-700 hover:opacity-80 sm:w-10" style={{ height: `${(d.value / max) * 150}px`, background: `linear-gradient(180deg, ${color}, ${color}66)` }} />
          </div>
          <span className="text-center text-[11px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ data, size = 180 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const r = size / 2 - 14, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth="18" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} strokeLinecap="round" className="transition-all duration-700" />;
          acc += len;
          return el;
        })}
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="rotate-90" fontSize="22" fontWeight="800" fill="currentColor" style={{ transformOrigin: "center" }}>{toFa(total)}٪</text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
            <span className="text-muted">{d.label}</span>
            <span className="font-bold text-strong">{toFa(d.value)}٪</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBars({ data, color = "#7c4dff" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted">{d.label}</span>
            <span className="font-bold text-strong">{toFa(d.value)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/12">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.value / max) * 100}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
