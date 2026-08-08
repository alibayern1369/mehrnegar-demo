"use client";

import { useEffect, useMemo, useState } from "react";
import { I, type IconName } from "./icons";
import { Badge } from "./ui";
import { useApp } from "./context";
import { ManagerOverview, UserOverview } from "./pages/Overview";
import { ProductCreate } from "./pages/ProductCreate";
import { Products } from "./pages/Products";
import { SellPage } from "./pages/Sell";
import { ReturnPage } from "./pages/ReturnPage";
import { BarcodeTrackingPage } from "./pages/BarcodeTrackingPage";
import { EditOrderPage } from "./pages/EditOrderPage";
import { WarehousesPage } from "./pages/WarehousesPage";
import { StocktakePage } from "./pages/StocktakePage";
import { ReportsPage } from "./pages/ReportsPage";
import { MyActivity } from "./pages/MyActivity";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SmsPage } from "./pages/SmsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { ReprintInvoicePage } from "./pages/ReprintInvoicePage";
import { hasPermission, hasAnyReportPermission, hasAnyProductPagePermission, PAGE_PERMISSION, type AppPermissionId } from "@/lib/permissions";
import { AppBrand } from "./AppBrand";
import { userEmoji } from "@/lib/user-emoji";
import { faNumber } from "@/lib/format";

type NavItem = { id: string; label: string; icon: IconName; permission?: AppPermissionId };

type StockNotif = {
  id: string;
  emoji: string;
  title: string;
  body: string;
};

const allNav: NavItem[] = [
  { id: "overview",   label: "خانه",              icon: "dashboard" },
  { id: "create",     label: "ثبت محصول",          icon: "plus",      permission: "create_product" },
  { id: "products",   label: "محصولات",             icon: "box" },
  { id: "sell",       label: "ثبت فروش",           icon: "cart",      permission: "sell" },
  { id: "edit-order", label: "ویرایش سفارش",       icon: "edit",      permission: "edit_order" },
  { id: "return",     label: "مرجوعی",             icon: "refresh",   permission: "return" },
  { id: "barcode-tracking", label: "رهگیری بارکد", icon: "scan",      permission: "barcode_tracking" },
  { id: "reprint",    label: "چاپ مجدد فاکتور",    icon: "printer",   permission: "reprint_invoice" },
  { id: "customers",  label: "مشتریان",             icon: "users",     permission: "customers" },
  { id: "warehouses", label: "انبارها",             icon: "warehouse", permission: "warehouses" },
  { id: "stocktake",  label: "انبارگردانی",         icon: "layers",    permission: "stocktake" },
  { id: "sms",        label: "پیامک",              icon: "bell",      permission: "sms" },
  { id: "reports",    label: "گزارش‌ها",           icon: "chart" },
  { id: "users",      label: "کاربران",             icon: "user",      permission: "users" },
  { id: "settings",   label: "تنظیمات",            icon: "settings",  permission: "settings" },
  { id: "my-activity", label: "فعالیت‌های من",     icon: "chart",     permission: "my_activity" },
];

const LOW_STOCK_THRESHOLD = 10;

export function Shell() {
  const { user, logout, theme, toggleTheme, isManager, toasts, toast, branding, token } = useApp();
  const [page, setPage]           = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [userOpen, setUserOpen]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [stockNotifs, setStockNotifs] = useState<StockNotif[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  const can = (perm?: AppPermissionId) => !perm || hasPermission(user, perm);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok && d.demo) setDemoMode(true);
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!token) {
      setStockNotifs([]);
      return;
    }
    let cancelled = false;
    const load = () => {
      fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d.ok || !Array.isArray(d.notifications)) return;
          setStockNotifs(
            (d.notifications as StockNotif[]).map((n) => ({
              id: n.id,
              emoji: n.emoji,
              title: n.title,
              body: n.body,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setStockNotifs([]);
        });
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  const nav = useMemo(() => {
    const allow = (perm?: AppPermissionId) => !perm || hasPermission(user, perm);
    return allNav.filter((n) => {
      if (n.id === "my-activity") return !isManager && allow("my_activity");
      if (n.id === "reports") return hasAnyReportPermission(user);
      if (n.id === "products") return hasAnyProductPagePermission(user);
      if (n.id === "stocktake") return allow("stocktake") || allow("warehouses");
      if (n.permission) return allow(n.permission);
      return true;
    });
  }, [user, isManager]);

  const navigate = (p: string) => {
    if (p === "reports") {
      if (!hasAnyReportPermission(user)) { toast("دسترسی مجاز نیست", "error"); return; }
    } else if (p === "products") {
      if (!hasAnyProductPagePermission(user)) { toast("دسترسی مجاز نیست", "error"); return; }
    } else if (p === "stocktake") {
      if (!can("stocktake") && !can("warehouses")) { toast("دسترسی مجاز نیست", "error"); return; }
    } else if (p === "my-activity") {
      if (isManager || !can("my_activity")) { toast("دسترسی مجاز نیست", "error"); return; }
    } else {
      const need = PAGE_PERMISSION[p];
      if (need && !can(need)) { toast("دسترسی مجاز نیست", "error"); return; }
    }
    setPage(p);
  };

  const pages: Record<string, React.ReactNode> = {
    overview:   isManager ? <ManagerOverview navigate={navigate} /> : <UserOverview navigate={navigate} />,
    create:     can("create_product") ? <ProductCreate /> : null,
    products:   hasAnyProductPagePermission(user) ? <Products /> : null,
    sell:       can("sell") ? <SellPage /> : null,
    "edit-order": can("edit_order") ? <EditOrderPage /> : null,
    return:     can("return") ? <ReturnPage /> : null,
    "barcode-tracking": can("barcode_tracking") ? <BarcodeTrackingPage /> : null,
    reprint:    can("reprint_invoice") ? <ReprintInvoicePage /> : null,
    customers:  can("customers") ? <CustomersPage /> : null,
    warehouses: can("warehouses") ? <WarehousesPage /> : null,
    stocktake:  (can("stocktake") || can("warehouses")) ? <StocktakePage /> : null,
    sms:        can("sms") ? <SmsPage /> : null,
    reports:    hasAnyReportPermission(user) ? <ReportsPage /> : null,
    users:      can("users") ? <UsersPage /> : null,
    settings:   can("settings") ? <SettingsPage /> : null,
    "my-activity": (!isManager && can("my_activity")) ? <MyActivity /> : null,
  };

  const mobileIds = ["overview", "create", "products", "sell", "edit-order", "return", "reports"];
  const mobileNav = nav.filter((n) => mobileIds.includes(n.id)).slice(0, 5);

  return (
    <div className="flex min-h-screen flex-col">
      {demoMode && (
        <div className="z-40 bg-emerald-600 px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm">
          نسخه دمو — داده آزمایشی است؛ سورس کامل خصوصی نگه داشته شده و برای رزومه منتشر شده
        </div>
      )}
      <div className="flex min-h-0 flex-1">
      <aside className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col p-3 transition-[width] duration-300 md:flex ${collapsed ? "w-20" : "w-60"}`}>
        <div className={`modal-panel flex h-full flex-col overflow-hidden rounded-3xl ${collapsed ? "p-2" : "p-3"}`}>
          <div className={`mb-4 flex items-center py-2 ${collapsed ? "justify-center" : "gap-2 px-1"}`}>
            {!collapsed && (
              <AppBrand
                logo={branding.appLogo}
                name={branding.appName}
                sizeClass="h-10 w-10"
                textClass="text-sm"
                subtitle="مدیریت فروشگاه"
                className="min-w-0 flex-1"
              />
            )}
            <button onClick={() => setCollapsed(!collapsed)} className="press shrink-0 rounded-xl p-1.5 text-muted hover:bg-white/10"><I.menu width={18} /></button>
          </div>

          {!collapsed && (
            <div className={`mb-3 rounded-2xl px-3 py-1.5 text-center text-xs font-bold ${isManager ? "bg-brand-500/15 text-brand-400" : "bg-emerald-500/15 text-emerald-400"}`}>
              {isManager ? <><span className="emoji">🛡️</span> مدیر</> : <><span className="emoji">👤</span> کاربر</>}
            </div>
          )}

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {nav.map((n) => {
              const Icon = I[n.icon];
              const active = page === n.id;
              return (
                <button key={n.id} onClick={() => navigate(n.id)} title={n.label}
                  className={`press flex w-full items-center rounded-2xl py-2.5 text-sm font-medium transition ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${active ? "grad-brand text-white shadow-lg shadow-brand-500/25" : "text-muted hover:bg-white/8 hover:text-strong"}`}>
                  <Icon width={19} className="shrink-0" />
                  {!collapsed && <span className="flex-1 text-right">{n.label}</span>}
                </button>
              );
            })}
          </nav>

          <button onClick={logout} className={`press mt-2 flex items-center rounded-2xl py-2.5 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10 ${collapsed ? "justify-center px-0" : "gap-3 px-3"}`}>
            <I.logout width={19} />{!collapsed && "خروج"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 p-3">
          <div className="modal-panel flex items-center gap-3 rounded-3xl px-4 py-3">
            <div className="flex-1">
              <h2 className="text-sm font-bold text-strong">{nav.find((n) => n.id === page)?.label ?? branding.appName}</h2>
            </div>

            <button onClick={toggleTheme} className="press rounded-2xl glass-2 p-2.5 text-muted hover:text-strong">
              {theme === "dark" ? <I.sun width={18} /> : <I.moon width={18} />}
            </button>

            <div className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }} className="press relative rounded-2xl glass-2 p-2.5 text-muted hover:text-strong">
                <I.bell width={18} />
                {stockNotifs.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute left-0 top-14 z-40 w-80 anim-scale-in">
                  <div className="popover rounded-3xl p-3">
                    <p className="mb-2 px-2 text-sm font-bold text-strong">
                      اعلان‌ها
                      {stockNotifs.length > 0 && (
                        <span className="mr-2 text-[11px] font-normal text-muted">
                          ({faNumber(stockNotifs.length)} کمبود موجودی)
                        </span>
                      )}
                    </p>
                    <div className="max-h-72 space-y-1.5 overflow-y-auto">
                      {stockNotifs.length === 0 && (
                        <div className="rounded-2xl glass-2 p-4 text-center">
                          <span className="emoji text-2xl">✅</span>
                          <p className="mt-2 text-xs text-muted">محصولی با موجودی کمتر از {faNumber(LOW_STOCK_THRESHOLD)} عدد نیست</p>
                        </div>
                      )}
                      {stockNotifs.map((n) => (
                        <div key={n.id} className="rounded-2xl glass-2 p-3">
                          <div className="flex items-start gap-2.5">
                            <span className="emoji mt-0.5 shrink-0 text-xl leading-none">{n.emoji}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-strong">{n.title}</p>
                              <p className="mt-0.5 text-xs leading-5 text-muted">{n.body}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }} className="press flex items-center gap-2 rounded-2xl glass-2 p-1.5 pl-3">
                <span className="emoji grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-lg">{userEmoji(user)}</span>
                <span className="hidden text-right sm:block">
                  <span className="block text-xs font-bold text-strong">{user?.name}</span>
                  <span className="block text-[10px] text-muted">{isManager ? "مدیر" : "کاربر"}</span>
                </span>
              </button>
              {userOpen && (
                <div className="absolute left-0 top-14 z-40 w-56 anim-scale-in">
                  <div className="popover rounded-3xl p-3">
                    <div className="mb-3 rounded-2xl glass-2 p-4 text-center">
                      <span className="emoji text-3xl">{userEmoji(user)}</span>
                      <p className="mt-2 font-bold text-strong">{user?.name}</p>
                      <Badge tone={isManager ? "brand" : "green"} className="mt-1.5">{isManager ? "مدیر" : "کاربر"}</Badge>
                    </div>
                    {can("settings") && <button onClick={() => { setUserOpen(false); navigate("settings"); }} className="press flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-strong transition hover:bg-white/8"><I.settings width={16} className="text-muted" /> تنظیمات</button>}
                    <div className="my-1.5 border-t border-white/10" />
                    <button onClick={logout} className="press flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10"><I.logout width={16} /> خروج</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-2 md:pb-8" key={page}>
          <div className="anim-page-in">
            {pages[page] ?? <div className="grid h-64 place-items-center text-muted">دسترسی به این صفحه ندارید</div>}
          </div>
        </main>
      </div>
      </div>

      <nav className="fixed bottom-3 left-3 right-3 z-30 flex justify-around rounded-3xl modal-panel p-2 md:hidden">
        {mobileNav.map((n) => {
          const Icon = I[n.icon];
          return (
            <button key={n.id} onClick={() => navigate(n.id)} className={`press grid place-items-center rounded-2xl px-3 py-2 ${page === n.id ? "text-brand-500" : "text-muted"}`}>
              <Icon width={20} />
            </button>
          );
        })}
      </nav>

      <div className="fixed bottom-5 left-5 z-[110] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="modal-panel flex min-w-[280px] items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-strong anim-scale-in">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-white ${t.kind === "error" ? "bg-rose-500" : t.kind === "info" ? "bg-sky-500" : "bg-emerald-500"}`}>
              {t.kind === "error" ? <I.close width={14} /> : <I.check width={14} />}
            </span>
            <span className="flex-1 leading-5">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
