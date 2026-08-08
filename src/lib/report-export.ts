/** Client-side professional Excel + print/PDF helpers (TransferDeliverySlip style) */

export type ReportBrand = {
  businessName?: string | null;
  businessLogo?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
};

export type ProfessionalReportOpts = {
  title: string;
  subtitle?: string;
  docLabel?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  summaryCards?: { label: string; value: string }[];
  summaryLines?: string[];
  brand?: ReportBrand;
  operatorName?: string | null;
  meta?: { label: string; value: string }[];
};

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cell(v: string | number | null | undefined) {
  return escapeHtml(v == null ? "—" : String(v));
}

function buildProfessionalHtml(opts: ProfessionalReportOpts) {
  const brand = opts.brand ?? {};
  const name = brand.businessName?.trim() || "فروشگاه";
  const now = new Date();
  const dateFa = now.toLocaleDateString("fa-IR");
  const timeFa = now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

  const logo = brand.businessLogo?.trim()
    ? `<img class="logo" src="${escapeHtml(brand.businessLogo)}" alt="${escapeHtml(name)}"/>`
    : `<div class="logo-fallback">${escapeHtml(name.charAt(0))}</div>`;

  const cards = (opts.summaryCards ?? []).map((c) =>
    `<div class="card"><small>${escapeHtml(c.label)}</small><b>${escapeHtml(c.value)}</b></div>`
  ).join("");

  const meta = (opts.meta ?? []).map((m) =>
    `<div class="card"><small>${escapeHtml(m.label)}</small><b>${escapeHtml(m.value)}</b></div>`
  ).join("");

  const th = opts.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = opts.rows.length
    ? opts.rows.map((r, i) =>
      `<tr><td class="c">${escapeHtml(String(i + 1).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]))}</td>${
        r.map((c) => `<td>${cell(c)}</td>`).join("")
      }</tr>`
    ).join("")
    : `<tr><td colspan="${opts.headers.length + 1}" class="c">بدون داده</td></tr>`;

  const summary = (opts.summaryLines ?? []).map((l) => `<p>${escapeHtml(l)}</p>`).join("");

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(opts.title)}</title>
<link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet"/>
<style>
  @page { size: A4 portrait; margin: 10mm 11mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body {
    margin: 0; padding: 0;
    font-family: Vazirmatn, Tahoma, sans-serif;
    color: #111827; background: #fff;
    font-size: 11px; line-height: 1.55;
  }
  .sheet { width: 100%; max-width: 190mm; margin: 0 auto; }
  .letterhead {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding-bottom: 10px; border-bottom: 2.5px solid #0f172a;
  }
  .brand-block { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .logo { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; }
  .logo-fallback {
    width: 52px; height: 52px; border-radius: 10px; background: #0f172a; color: #fff;
    display: grid; place-items: center; font-size: 22px; font-weight: 900;
  }
  .brand-name { font-size: 18px; font-weight: 900; margin: 0; }
  .brand-sub { margin: 2px 0 0; color: #475569; font-size: 10px; }
  .brand-contact { margin: 0; color: #64748b; font-size: 9.5px; direction: ltr; text-align: right; }
  .doc-stamp {
    text-align: left; flex-shrink: 0; border: 1.5px solid #0f172a; border-radius: 10px;
    padding: 8px 12px; min-width: 130px;
  }
  .doc-stamp .label { font-size: 9px; color: #64748b; margin: 0; }
  .doc-stamp .num { font-size: 12px; font-weight: 800; margin: 2px 0 0; }
  .hero {
    margin: 12px 0; background: #0f172a; color: #fff; border-radius: 11px;
    padding: 13px 15px; display: flex; justify-content: space-between; align-items: center; gap: 12px;
  }
  .hero h1 { margin: 0; font-size: 18px; }
  .hero p { margin: 3px 0 0; color: #cbd5e1; font-size: 11px; }
  .generated { text-align: left; font-size: 9.5px; color: #e2e8f0; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin: 12px 0; }
  .card { border: 1px solid #dbe2ea; border-radius: 8px; padding: 8px; background: #f8fafc; }
  .card small { display: block; color: #64748b; font-size: 8.5px; }
  .card b { display: block; margin-top: 2px; font-size: 11px; }
  h3 { font-size: 12px; border-right: 3px solid #0f172a; padding-right: 7px; margin: 14px 0 7px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 7px; text-align: right; vertical-align: middle; }
  th { background: #0f172a; color: #fff; font-size: 9.5px; }
  td { font-size: 9.7px; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .c { text-align: center; }
  .summary { margin-top: 12px; font-size: 11px; color: #334155; }
  .foot {
    margin-top: 18px; padding-top: 8px; border-top: 1px solid #dbe2ea;
    color: #64748b; font-size: 9px; display: flex; justify-content: space-between; gap: 8px;
  }
  .toolbar { margin: 0 0 14px; display: flex; gap: 8px; }
  .toolbar button {
    border: 0; border-radius: 10px; padding: 9px 14px; font: inherit; font-weight: 700;
    background: #0f172a; color: #fff; cursor: pointer;
  }
  @media screen {
    body { background: #e2e8f0; padding: 18px; }
    .sheet { background: #fff; padding: 12mm; box-shadow: 0 8px 28px #0f172a22; border-radius: 12px; }
  }
  @media print {
    .toolbar { display: none !important; }
    .sheet { max-width: none; box-shadow: none; padding: 0; }
    body { background: #fff; padding: 0; }
  }
  @media (max-width: 700px) {
    .meta { grid-template-columns: 1fr 1fr; }
    .letterhead, .hero { display: block; }
    .doc-stamp { margin-top: 10px; }
  }
</style>
</head>
<body>
<main class="sheet">
  <div class="toolbar">
    <button onclick="window.print()">چاپ / ذخیره PDF</button>
  </div>
  <header class="letterhead">
    <div class="brand-block">
      ${logo}
      <div>
        <p class="brand-name">${escapeHtml(name)}</p>
        ${brand.address ? `<p class="brand-sub">${escapeHtml(brand.address)}</p>` : ""}
        <p class="brand-contact">${escapeHtml([brand.phone, brand.website].filter(Boolean).join(" · "))}</p>
      </div>
    </div>
    <div class="doc-stamp">
      <p class="label">${escapeHtml(opts.docLabel || "گزارش")}</p>
      <p class="num">${escapeHtml(dateFa)}</p>
    </div>
  </header>
  <section class="hero">
    <div>
      <h1>${escapeHtml(opts.title)}</h1>
      ${opts.subtitle ? `<p>${escapeHtml(opts.subtitle)}</p>` : ""}
    </div>
    <div class="generated">تاریخ چاپ: ${escapeHtml(dateFa)}<br/>ساعت: ${escapeHtml(timeFa)}</div>
  </section>
  ${meta || cards ? `<section class="meta">${meta}${cards}</section>` : ""}
  <h3>جزئیات گزارش</h3>
  <table>
    <thead><tr><th class="c">ردیف</th>${th}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  ${summary ? `<div class="summary">${summary}</div>` : ""}
  <footer class="foot">
    <span>این گزارش به‌صورت خودکار از سامانه حسابداری تولید شده است.</span>
    <span>${opts.operatorName ? `تهیه‌کننده: ${escapeHtml(opts.operatorName)}` : ""}</span>
  </footer>
</main>
</body>
</html>`;
}

/** Download a styled Excel-compatible (.xls) file */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  opts?: { title?: string; brand?: ReportBrand; summaryLines?: string[] },
) {
  const title = opts?.title || filename.replace(/\.(csv|xls|xlsx)$/i, "");
  const brandName = opts?.brand?.businessName?.trim() || "فروشگاه";
  const esc = (v: string | number | null | undefined) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const th = headers.map((h) =>
    `<th style="background:#0f172a;color:#fff;font-weight:bold;padding:8px;border:1px solid #0f172a">${esc(h)}</th>`
  ).join("");
  const body = rows.map((r, i) =>
    `<tr style="background:${i % 2 ? "#f8fafc" : "#fff"}">${
      r.map((c) => `<td style="padding:7px;border:1px solid #cbd5e1;mso-number-format:'\\@'">${esc(c)}</td>`).join("")
    }</tr>`
  ).join("");
  const summary = (opts?.summaryLines ?? []).map((l) => `<p style="margin:4px 0;font-size:12px">${esc(l)}</p>`).join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" lang="fa" dir="rtl">
<head><meta charset="utf-8" />
<style>
  body{font-family:Tahoma,Arial,sans-serif;color:#111827}
  .head{margin-bottom:12px}
  .title{font-size:18px;font-weight:bold;margin:0}
  .sub{color:#64748b;font-size:12px;margin:4px 0 0}
</style></head>
<body>
<div class="head">
  <p class="title">${esc(brandName)} — ${esc(title)}</p>
  <p class="sub">تاریخ خروجی: ${esc(new Date().toLocaleString("fa-IR"))}</p>
</div>
<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%">
<thead><tr>${th}</tr></thead>
<tbody>${body || `<tr><td colspan="${headers.length}">بدون داده</td></tr>`}</tbody>
</table>
${summary ? `<div style="margin-top:14px">${summary}</div>` : ""}
</body></html>`;

  const bom = "\uFEFF";
  const blob = new Blob([bom + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = filename.replace(/\.(csv|xls|xlsx)$/i, "");
  a.download = `${base}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Open print/PDF dialog for a professional report.
 * Prefer a hidden iframe (never blocked by popup blockers).
 * Fall back to window.open WITHOUT "noopener" — Chrome returns null when noopener is set,
 * which falsely triggered "اجازه پاپ‌آپ" even when print was possible.
 */
export function openPrintReport(opts: ProfessionalReportOpts): boolean {
  const html = buildProfessionalHtml(opts);

  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "report-print");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;z-index:-1";
    document.body.appendChild(iframe);
    const idoc = iframe.contentDocument || iframe.contentWindow?.document;
    const iwin = iframe.contentWindow;
    if (idoc && iwin) {
      idoc.open();
      idoc.write(html);
      idoc.close();
      const cleanup = () => {
        try { iframe.remove(); } catch { /* ignore */ }
      };
      iwin.addEventListener("afterprint", cleanup);
      setTimeout(() => {
        try {
          iwin.focus();
          iwin.print();
        } catch {
          cleanup();
        }
        setTimeout(cleanup, 120_000);
      }, 500);
      return true;
    }
    iframe.remove();
  } catch {
    /* fall through to popup */
  }

  // Same reliable pattern as TransferDeliverySlip / InvoiceReceipt — no noopener
  const w = window.open("", "_blank", "width=980,height=780");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch { /* ignore */ }
  }, 450);
  return true;
}

export function buildReportHtml(opts: ProfessionalReportOpts) {
  return buildProfessionalHtml(opts);
}
