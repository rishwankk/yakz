"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  IndianRupee,
  CalendarDays,
  Layers3,
  Trophy,
  Package,
  Lock,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface ProductSale {
  name: string;
  quantity: number;
  total: number;
}

/* ─── Cookie helpers ────────────────────────── */
function setCookie(name: string, value: string, days: number) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

export default function AnalyticsDashboard() {
  /* ─── Auth state ──────────────────────────── */
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [salesData, setSalesData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  /* ─── Check cookie on mount ───────────────── */
  useEffect(() => {
    const saved = getCookie("yakz_admin_auth");
    if (saved === "true") {
      setIsAuthenticated(true);
    }
    setAuthChecking(false);
  }, []);

  /* ─── PIN login handler ───────────────────── */
  const handleLogin = async () => {
    if (!pin) return;
    setVerifying(true);
    setPinError("");
    try {
      const docRef = doc(db, "settings", "admin");
      const docSnap = await getDoc(docRef);

      let correctPin = "33335005";
      if (docSnap.exists()) {
        correctPin = docSnap.data().pin;
      } else {
        await setDoc(docRef, { pin: "33335005" });
      }

      if (pin === correctPin) {
        setCookie("yakz_admin_auth", "true", 30); // 30-day cookie
        setIsAuthenticated(true);
      } else {
        setPinError("Incorrect PIN. Try again.");
        setPin("");
      }
    } catch {
      setPinError("Could not connect. Check your network.");
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    deleteCookie("yakz_admin_auth");
    setIsAuthenticated(false);
    setPin("");
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const prodList: any[] = [];
        snapshot.forEach((doc) => {
          prodList.push({ id: doc.id, ...doc.data() });
        });
        setProducts(prodList);
      }
    );

    const q = query(collection(db, "orders"), where("status", "==", "paid"));
    const unsubscribeSales = onSnapshot(q, (snapshot) => {
      const allSales: any[] = [];
      snapshot.forEach((doc) => {
        allSales.push({ id: doc.id, ...doc.data() });
      });
      allSales.sort(
        (a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)
      );
      setSalesData(allSales);
      setLoading(false);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSales();
    };
  }, [isAuthenticated]);

  /* ─── Auth checking splash ────────────────── */
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#060609] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full"
        />
      </div>
    );
  }

  /* ─── Login Screen ───────────────────────── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060609] flex items-center justify-center px-4">
        {/* Ambient glow */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/[0.08] blur-[140px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring" as const, stiffness: 120, damping: 14 }}
          className="relative z-10 w-full max-w-sm"
        >
          <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] p-8 backdrop-blur-xl">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
              <Lock className="w-7 h-7 text-violet-400" />
            </div>

            <h1 className="text-2xl font-bold text-white text-center mb-1">Admin Dashboard</h1>
            <p className="text-sm text-white/40 text-center mb-8">Enter your PIN to access analytics</p>

            {/* PIN Input */}
            <input
              type="password"
              inputMode="numeric"
              placeholder="• • • •"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setPinError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full h-14 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-center text-2xl tracking-[0.5em] placeholder:text-white/15 placeholder:tracking-[0.3em] focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all mb-4"
            />

            {/* Error */}
            <AnimatePresence>
              {pinError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-xs text-center mb-4"
                >
                  {pinError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              onClick={handleLogin}
              disabled={verifying || !pin}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]"
            >
              {verifying ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                "Unlock"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── Loading ─────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060609] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full"
          />
          <span className="text-sm text-white/40 tracking-widest uppercase">
            Loading analytics…
          </span>
        </div>
      </div>
    );
  }

  /* ─── Date helpers ────────────────────────── */
  const shiftDate = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + days);
    setSelectedDate(next);
  };

  const selStr = selectedDate.toLocaleDateString();
  const todayStr = new Date().toLocaleDateString();
  const monthKey =
    selectedDate.getMonth() + "-" + selectedDate.getFullYear();

  const friendlyDate =
    selStr === todayStr
      ? "Today"
      : selStr ===
        new Date(Date.now() - 86400000).toLocaleDateString()
      ? "Yesterday"
      : selectedDate.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });

  /* ─── Crunch numbers ──────────────────────── */
  let dayTotal = 0;
  let monthTotal = 0;
  let dayOrders = 0;
  const catMap: Record<string, number> = {};
  const catItems: Record<string, ProductSale[]> = {};
  const itemMap: Record<string, number> = {};

  salesData.forEach((sale) => {
    if (!sale.created_at) return;
    const d = new Date(sale.created_at.seconds * 1000);
    const dStr = d.toLocaleDateString();
    const mKey = d.getMonth() + "-" + d.getFullYear();

    if (mKey === monthKey) monthTotal += sale.total;
    if (dStr === selStr) {
      dayTotal += sale.total;
      dayOrders++;
      sale.items?.forEach((it: any) => {
        let cat = it.category;
        if (!cat || cat === "Unknown") {
          const p = products.find(
            (pr) => pr.id === it.productId || pr.name === it.product_name
          );
          cat = p ? p.category : "Other";
        }
        catMap[cat] = (catMap[cat] || 0) + it.price * it.quantity;
        itemMap[it.product_name] =
          (itemMap[it.product_name] || 0) + it.quantity;

        if (!catItems[cat]) catItems[cat] = [];
        const ex = catItems[cat].find((x) => x.name === it.product_name);
        if (ex) {
          ex.quantity += it.quantity;
          ex.total += it.price * it.quantity;
        } else {
          catItems[cat].push({
            name: it.product_name,
            quantity: it.quantity,
            total: it.price * it.quantity,
          });
        }
      });
    }
  });

  const cats = Object.entries(catMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  const topItems = Object.entries(itemMap)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  /* ─── Graph data (last 7 days ending at selectedDate) */
  const graphData = [];
  for (let i = 6; i >= 0; i--) {
    const gd = new Date(selectedDate);
    gd.setDate(gd.getDate() - i);
    const gStr = gd.toLocaleDateString();
    let gTotal = 0;
    salesData.forEach((s) => {
      if (
        s.created_at &&
        new Date(s.created_at.seconds * 1000).toLocaleDateString() === gStr
      )
        gTotal += s.total;
    });
    graphData.push({
      day: gd.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: gTotal,
    });
  }

  /* ─── Framer variants ─────────────────────── */
  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const rise = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 120, damping: 14 },
    },
  };

  /* Category colour palette */
  const palette = [
    "from-violet-500/20 to-violet-500/5 border-violet-500/20",
    "from-sky-500/20 to-sky-500/5 border-sky-500/20",
    "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20",
    "from-amber-500/20 to-amber-500/5 border-amber-500/20",
    "from-rose-500/20 to-rose-500/5 border-rose-500/20",
    "from-teal-500/20 to-teal-500/5 border-teal-500/20",
    "from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-500/20",
  ];
  const dotColors = [
    "bg-violet-500",
    "bg-sky-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-teal-500",
    "bg-fuchsia-500",
  ];

  /* ─── Render ──────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#060609] text-white pb-24">
      {/* ── Ambient glow ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-violet-600/[0.07] blur-[140px]" />
      </div>

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-[#060609]/80 border-b border-white/[0.04]"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm hidden sm:inline">Back</span>
          </Link>
          <h1 className="text-base font-semibold tracking-wide text-white/90">
            Admin Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-white/40 hover:text-red-400 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </motion.header>

      <motion.main
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-5"
      >
        {/* ── Date Picker ── */}
        <motion.div variants={rise} className="flex items-center justify-center gap-3">
          <button
            onClick={() => shiftDate(-1)}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.06] flex items-center justify-center transition-all active:scale-90"
          >
            <ChevronLeft className="w-4 h-4 text-white/60" />
          </button>
          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.06]">
            <CalendarDays className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-white/80 min-w-[90px] text-center">
              {friendlyDate}
            </span>
          </div>
          <button
            onClick={() => shiftDate(1)}
            disabled={selStr === todayStr}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.06] flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </motion.div>

        {/* ── Stat Cards ── */}
        <motion.div variants={rise} className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Day Revenue */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-violet-600/5 to-transparent border border-violet-500/10 p-5">
            <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">
              Day Revenue
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white">
              ₹{dayTotal.toLocaleString("en-IN")}
            </p>
          </div>

          {/* Month Revenue */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600/20 via-sky-600/5 to-transparent border border-sky-500/10 p-5">
            <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">
              Month Revenue
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white">
              ₹{monthTotal.toLocaleString("en-IN")}
            </p>
          </div>

          {/* Orders count */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/20 via-emerald-600/5 to-transparent border border-emerald-500/10 p-5 col-span-2 sm:col-span-1">
            <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">
              Orders Today
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white">
              {dayOrders}
            </p>
          </div>
        </motion.div>

        {/* ── Revenue Chart ── */}
        <motion.div
          variants={rise}
          className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white/70">
              Revenue · Last 7 days
            </h2>
          </div>
          <div className="h-[220px] sm:h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={graphData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                  dy={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }}
                  tickFormatter={(v: any) => (v === 0 ? "" : `₹${v}`)}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181B",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    fontSize: 13,
                    color: "#fff",
                  }}
                  formatter={(value: any) => [
                    `₹${Number(value).toLocaleString("en-IN")}`,
                    "Revenue",
                  ]}
                  labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  fill="url(#grad)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#8B5CF6",
                    stroke: "#060609",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── Two columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Category Split */}
          <motion.div
            variants={rise}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Layers3 className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white/70">
                Category Breakdown
              </h2>
            </div>

            {cats.length > 0 ? (
              <div className="space-y-2">
                {cats.map((cat, i) => {
                  const pct =
                    dayTotal > 0
                      ? Math.round((cat.total / dayTotal) * 100)
                      : 0;
                  const isOpen = expandedCategory === cat.name;
                  return (
                    <div key={i}>
                      <button
                        onClick={() =>
                          setExpandedCategory(isOpen ? null : cat.name)
                        }
                        className={`w-full rounded-xl bg-gradient-to-r ${palette[i % palette.length]} border p-3.5 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${dotColors[i % dotColors.length]}`}
                          />
                          <span className="text-sm font-semibold text-white/90">
                            {cat.name}
                          </span>
                          <span className="text-[11px] text-white/30 font-medium">
                            {pct}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white/80">
                            ₹{cat.total.toLocaleString("en-IN")}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-white/30" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-white/30" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1.5 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3">
                              <div className="flex text-[10px] uppercase tracking-wider text-white/25 font-semibold pb-2 border-b border-white/[0.05]">
                                <span className="flex-[2]">Product</span>
                                <span className="flex-1 text-center">Qty</span>
                                <span className="flex-1 text-right">Total</span>
                              </div>
                              {catItems[cat.name]
                                .sort((a, b) => b.total - a.total)
                                .map((item, j) => (
                                  <div
                                    key={j}
                                    className="flex items-center py-2 border-b border-white/[0.03] last:border-0"
                                  >
                                    <span className="flex-[2] text-xs text-white/60 truncate pr-2">
                                      {item.name}
                                    </span>
                                    <span className="flex-1 text-center text-xs text-white/50 font-medium">
                                      {item.quantity}
                                    </span>
                                    <span className="flex-1 text-right text-xs text-white/70 font-semibold">
                                      ₹{item.total.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Layers3 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/20">No sales for this date</p>
              </div>
            )}
          </motion.div>

          {/* Top Products */}
          <motion.div
            variants={rise}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white/70">
                Top Sellers
              </h2>
            </div>

            {topItems.length > 0 ? (
              <div className="space-y-2.5">
                {topItems.map((item, idx) => {
                  const medalColors =
                    idx === 0
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : idx === 1
                      ? "text-gray-300 bg-gray-500/10 border-gray-500/20"
                      : idx === 2
                      ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                      : "text-white/40 bg-white/[0.04] border-white/[0.06]";
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors"
                    >
                      <span
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border ${medalColors}`}
                      >
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-white/80 truncate">
                        {item.name}
                      </span>
                      <span className="text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/15 px-2.5 py-1 rounded-lg">
                        {item.quantity} sold
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Trophy className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/20">No data available</p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
