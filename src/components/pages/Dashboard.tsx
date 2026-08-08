"use client";

import { Glass, SectionTitle, Badge, Btn } from "../ui";
import { I } from "../icons";
import { LineChart, BarChart, Donut, HBars } from "../charts";
import { salesTrend, monthlyRevenue, topCategories, warehouseCompare, products, orders, sellerRanking } from "@/lib/data";
import { toman, tomanShort, faNumber, faDate } from "@/lib/format";
import { useApp } from "../context";

function Stat({ icon, label, value, change, tone = "brand" }: {
  icon: React.ReactNode; label: string; value: string; change?: string; tone?: string;
}) {
  const tones: Record<string, string> = {
    brand:  "from-brand-500/20  to-brand-500/5  text-brand-500",
    green:  "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
    amber:  "from-amber-500/20  to-amber-500/5  text-amber-500",
    red:    "from-rose-500/20   to-rose-500/5   text-rose-500",
    sky:    "from-sky-500/20    to-sky-500/5    text-sky-500",
    cyan:   "from-cyan-500/20   to-cyan-500/5   text-cyan-500",
  };
  return (
    <Glass hover className="p-5">
      <div className="flex items-start justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${tones[tone] ?? tones.brand}`}>
          {icon}
        </div>
        {change && (
          <Badge tone={change.startsWith("-") ? "red" : "green"}>{change}</Badge>
        )}
      </div>
      <p className="mt-4 text-2xl font-extrabold text-strong">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </Glass>
  );
}

/* ---- باکس رتبه‌بندی فروشندگان ---- */
function SellerRanking() {
  const medals = ["🥇", "🥈", "🥉"];
  const barColors = [
    "from-amber-400 to-yellow-300",
    "from-slate-400 to-slate-300",
    "from-amber-700 to-amber-500",
    "from-brand-500 to-brand-400",
  ];
  const maxSales = sellerRanking[0].sales;

  return (
    <Glass className="p-5">
      {/* هدر */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl grad-brand text-white">
            <I.trend width={18} />
          </div>
          <div>
            <h3 className="font-bold text-strong">رتبه‌بندی فروشندگان</h3>
            <p className="text-xs text-muted">این ماه — اسفند ۱۴۰۳</p>
          </div>
        </div>
        <Badge tone="brand">ماهانه</Badge>
      </div>

      {/* نفر اول — پودیوم ویژه */}
      <div className="mb-4 overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))", border: "1px solid rgba(251,191,36,0.25)" }}>
        <div className="flex items-center gap-4 p-4">
          <div className="relative">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/20 text-3xl">
              {sellerRanking[0].avatar}
            </span>
            <span className="absolute -right-1.5 -top-1.5 text-lg">🥇</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-strong">{sellerRanking[0].name}</p>
              <Badge tone="amber">برترین فروشنده</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted">{sellerRanking[0].role}</p>
            <p className="mt-1.5 text-lg font-extrabold grad-text">{tomanShort(sellerRanking[0].sales)} تومان</p>
          </div>
          <div className="text-left">
            <span className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-sm font-bold text-emerald-500">
              {sellerRanking[0].change}
            </span>
          </div>
        </div>
        {/* نوار پیشرفت */}
        <div className="mx-4 mb-4 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-l from-amber-400 to-yellow-300 transition-all duration-1000"
            style={{ width: "100%" }} />
        </div>
      </div>

      {/* بقیه رتبه‌ها */}
      <div className="space-y-3">
        {sellerRanking.slice(1).map((s, idx) => {
          const i = idx + 1;
          const pct = Math.round((s.sales / maxSales) * 100);
          return (
            <div key={s.rank} className="flex items-center gap-3 rounded-2xl glass-2 p-3">
              {/* رتبه */}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-lg font-extrabold"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                {medals[i] ?? `${faNumber(s.rank)}`}
              </span>
              {/* آواتار */}
              <span className="text-2xl">{s.avatar}</span>
              {/* اطلاعات */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-strong">{s.name}</p>
                  <span className={`shrink-0 text-xs font-bold ${s.trend === "up" ? "text-emerald-500" : "text-rose-500"}`}>
                    {s.change}
                  </span>
                </div>
                {/* نوار */}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-l ${barColors[i]} transition-all duration-1000`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-muted">{tomanShort(s.sales)} تومان</p>
                  <p className="text-xs text-muted">{faNumber(s.items)} فروش</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* فوتر مقایسه */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl glass-2 p-3 text-center">
          <p className="text-xs text-muted">مجموع فروش تیم</p>
          <p className="mt-1 font-extrabold grad-text">{tomanShort(sellerRanking.reduce((a, s) => a + s.sales, 0))} ت</p>
        </div>
        <div className="rounded-xl glass-2 p-3 text-center">
          <p className="text-xs text-muted">میانگین هر فروشنده</p>
          <p className="mt-1 font-extrabold text-strong">
            {tomanShort(Math.round(sellerRanking.reduce((a, s) => a + s.sales, 0) / sellerRanking.length))} ت
          </p>
        </div>
      </div>
    </Glass>
  );
}

/* ---- داشبورد اصلی ---- */
export function Dashboard() {
  const { toast } = useApp();
  const totalInv = products.reduce((a, p) =>
    a + (Object.values(p.warehouseStock).reduce((x, y) => x + y, 0) + p.webStock + p.digikalaStock) * p.purchasePrice, 0);
  const low  = products.filter((p) => p.status === "low").length;
  const out  = products.filter((p) => p.status === "out").length;
  const best  = [...products].sort((a, b) => b.sold30 - a.sold30).slice(0, 5).map((p) => ({ label: p.name.split(" ").slice(0, 3).join(" "), value: p.sold30 }));
  const worst = [...products].sort((a, b) => a.sold30 - b.sold30).slice(0, 5).map((p) => ({ label: p.name.split(" ").slice(0, 3).join(" "), value: p.sold30 }));

  return (
    <div>
      <SectionTitle
        icon={<I.dashboard />}
        title="داشبورد مدیریتی"
        sub={`کامفی فیتس • ${faDate()}`}
        action={
          <Btn variant="soft" onClick={() => toast("گزارش اجرایی آماده دانلود شد")}>
            <I.download width={16} /> گزارش اجرایی
          </Btn>
        }
      />

      {/* کارت‌های آماری */}
      <div className="stagger grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Stat icon={<I.bag />}       label="فروش امروز"           value={toman(12400000)}              change="+۱۸٪"  tone="green"  />
        <Stat icon={<I.trend />}     label="فروش این ماه"         value={tomanShort(3190000000) + " ت"} change="+۱۲٪"  tone="brand"  />
        <Stat icon={<I.box />}       label="ارزش موجودی"          value={tomanShort(totalInv) + " ت"}                  tone="cyan"   />
        <Stat icon={<I.alert />}     label="موجودی بحرانی"        value={faNumber(low)}                 change="-۱"    tone="amber"  />
        <Stat icon={<I.close />}     label="ناموجود"              value={faNumber(out)}                                tone="red"    />
        <Stat icon={<I.cart />}      label="سفارش در انتظار"      value={faNumber(3)}                                  tone="sky"    />
        <Stat icon={<I.globe />}     label="موجودی وب‌سایت"       value={faNumber(69)}                                 tone="sky"    />
        <Stat icon={<I.bag />}       label="موجودی دیجی‌کالا"     value={faNumber(46)}                                 tone="red"    />
        <Stat icon={<I.warehouse />} label="انتقال‌های انبار"      value={faNumber(4)}                                  tone="brand"  />
        <Stat icon={<I.users />}     label="فروشندگان فعال"        value={faNumber(4)}                   change="+۱"    tone="green"  />
      </div>

      {/* ردیف اول چارت ها + رتبه‌بندی */}
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Glass className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-strong">روند فروش هفتگی</h3>
            <Badge tone="green"><I.trend width={14} /> رشد ۱۲٪</Badge>
          </div>
          <LineChart data={salesTrend} />
        </Glass>
        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong">سهم دسته‌بندی‌ها</h3>
          <Donut data={topCategories} />
        </Glass>
      </div>

      {/* ردیف دوم — رتبه‌بندی فروشندگان + چارت‌ها */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {/* رتبه‌بندی فروشندگان */}
        <SellerRanking />

        {/* درآمد ماهانه */}
        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong">درآمد ماهانه (میلیون تومان)</h3>
          <BarChart data={monthlyRevenue} />
        </Glass>

        {/* مقایسه انبارها */}
        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong">مقایسه انبارها</h3>
          <HBars data={warehouseCompare} color="#06b6d4" />
        </Glass>
      </div>

      {/* ردیف سوم */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong">پرفروش‌ترین لباس‌ها</h3>
          <HBars data={best} color="#10b981" />
        </Glass>
        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong">کم‌فروش‌ترین لباس‌ها</h3>
          <HBars data={worst} color="#f43f5e" />
        </Glass>
        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong">آخرین سفارش‌ها</h3>
          <div className="space-y-2">
            {orders.slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-2xl glass-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 text-brand-500">
                    <I.cart width={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-strong">{o.customer}</p>
                    <p className="text-xs text-muted">#{o.id} • {o.channel}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-strong">{toman(o.amount)}</p>
                  <Badge tone={o.status === "تکمیل شده" ? "green" : o.status === "در انتظار" ? "amber" : "sky"} className="mt-1">
                    {o.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Glass>
      </div>
    </div>
  );
}
