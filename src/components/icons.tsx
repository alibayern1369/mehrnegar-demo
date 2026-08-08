import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const, ...props,
});

export const I = {
  dashboard: (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>),
  box: (p: P) => (<svg {...base(p)}><path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>),
  scan: (p: P) => (<svg {...base(p)}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>),
  warehouse: (p: P) => (<svg {...base(p)}><path d="M22 8 12 3 2 8v12h20Z"/><path d="M6 20v-8h12v8M9 20v-5h6v5"/></svg>),
  layers: (p: P) => (<svg {...base(p)}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>),
  globe: (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/></svg>),
  bag: (p: P) => (<svg {...base(p)}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>),
  chart: (p: P) => (<svg {...base(p)}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>),
  users: (p: P) => (<svg {...base(p)}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M22 20a6 6 0 0 0-4-5.6"/></svg>),
  bell: (p: P) => (<svg {...base(p)}><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>),
  settings: (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.2A1.6 1.6 0 0 0 7 19.5l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 4.5 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 0 1 4 0v.2A1.6 1.6 0 0 0 17 4.5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z"/></svg>),
  search: (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>),
  sun: (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 4 4M20 20l-1-1M5 19l-1 1M20 4l-1 1"/></svg>),
  moon: (p: P) => (<svg {...base(p)}><path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8Z"/></svg>),
  wifi: (p: P) => (<svg {...base(p)}><path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>),
  wifiOff: (p: P) => (<svg {...base(p)}><path d="m2 2 20 20M8.5 15.5a6 6 0 0 1 7 0M5 12a11 11 0 0 1 4-2.5M2 8a16 16 0 0 1 5-3M16 9a11 11 0 0 1 3 3M19.5 6.5A16 16 0 0 0 14 4"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>),
  refresh: (p: P) => (<svg {...base(p)}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>),
  plus: (p: P) => (<svg {...base(p)}><path d="M12 5v14M5 12h14"/></svg>),
  close: (p: P) => (<svg {...base(p)}><path d="M18 6 6 18M6 6l12 12"/></svg>),
  check: (p: P) => (<svg {...base(p)}><path d="m20 6-11 11-5-5"/></svg>),
  edit: (p: P) => (<svg {...base(p)}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>),
  trash: (p: P) => (<svg {...base(p)}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>),
  printer: (p: P) => (<svg {...base(p)}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>),
  cart: (p: P) => (<svg {...base(p)}><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.5 13h11l2-9H6"/></svg>),
  download: (p: P) => (<svg {...base(p)}><path d="M12 3v12M7 11l5 4 5-4M5 21h14"/></svg>),
  upload: (p: P) => (<svg {...base(p)}><path d="M12 21V9M7 13l5-4 5 4M5 3h14"/></svg>),
  logout: (p: P) => (<svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>),
  lock: (p: P) => (<svg {...base(p)}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>),
  eye: (p: P) => (<svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>),
  eyeOff: (p: P) => (<svg {...base(p)}><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M7 7C4.5 8.3 2.7 10.4 2 12c1.2 2.3 4.5 7 10 7a10 10 0 0 0 4.3-1M14 5.2A10 10 0 0 1 12 5c-5.5 0-8.8 4.7-10 7a17 17 0 0 0 2.3 3.2M9.9 4.2 4 10M15 9l5 5M2 2l20 20"/><path d="M14.1 14.1A3 3 0 0 1 9.9 9.9"/></svg>),
  user: (p: P) => (<svg {...base(p)}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>),
  trend: (p: P) => (<svg {...base(p)}><path d="m3 17 6-6 4 4 8-8M21 7h-5M21 7v5"/></svg>),
  alert: (p: P) => (<svg {...base(p)}><path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>),
  shield: (p: P) => (<svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>),
  database: (p: P) => (<svg {...base(p)}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>),
  tag: (p: P) => (<svg {...base(p)}><path d="M20 12 12 20l-9-9V3h8Z"/><circle cx="7.5" cy="7.5" r="1.3"/></svg>),
  qr: (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7M17 21h4M14 18v3"/></svg>),
  menu: (p: P) => (<svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h16"/></svg>),
  arrow: (p: P) => (<svg {...base(p)}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>),
};

export type IconName = keyof typeof I;
