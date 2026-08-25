"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, IndianRupee, Package, PieChart as PieChartIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function AnalyticsDashboard() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prodList: any[] = [];
      snapshot.forEach(doc => {
        prodList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(prodList);
    });

    const q = query(collection(db, 'orders'), where('status', '==', 'paid'));
    const unsubscribeSales = onSnapshot(q, (snapshot) => {
      const allSales: any[] = [];
      snapshot.forEach(doc => {
        allSales.push({ id: doc.id, ...doc.data() });
      });
      setSalesData(allSales);
      setLoading(false);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSales();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
          <p className="text-[#888] font-medium tracking-widest text-sm uppercase">Loading Live Data</p>
        </motion.div>
      </div>
    );
  }

  // --- Date Calculations ---
  const today = new Date();
  const todayStr = today.toLocaleDateString();
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString();

  let todayRevenue = 0;
  let yesterdayRevenue = 0;
  
  const categoryMap: Record<string, number> = {};
  const productMap: Record<string, number> = {};

  salesData.forEach(sale => {
    if (sale.created_at) {
      const orderDateObj = new Date(sale.created_at.seconds * 1000);
      const orderDateStr = orderDateObj.toLocaleDateString();
      
      if (orderDateStr === todayStr) todayRevenue += sale.total;
      if (orderDateStr === yesterdayStr) yesterdayRevenue += sale.total;

      if (orderDateStr === todayStr) {
        sale.items?.forEach((item: any) => {
          let cat = item.category;
          if (!cat || cat === 'Unknown') {
            const p = products.find(prod => prod.id === item.productId || prod.name === item.product_name);
            cat = p ? p.category : 'Unknown';
          }
          categoryMap[cat] = (categoryMap[cat] || 0) + (item.price * item.quantity);
          productMap[item.product_name] = (productMap[item.product_name] || 0) + item.quantity;
        });
      }
    }
  });

  // --- Growth Calculation ---
  let growthPercentage = 0;
  let isPositiveGrowth = true;
  if (yesterdayRevenue === 0 && todayRevenue > 0) {
    growthPercentage = 100; // 100% growth if yesterday was 0
  } else if (yesterdayRevenue > 0) {
    const diff = todayRevenue - yesterdayRevenue;
    growthPercentage = Math.abs((diff / yesterdayRevenue) * 100);
    isPositiveGrowth = diff >= 0;
  }

  // --- Chart Data Formatting ---
  const categoryStats = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] }));
  const topProducts = Object.keys(productMap)
    .map(k => ({ name: k, quantity: productMap[k] }))
    .sort((a,b) => b.quantity - a.quantity)
    .slice(0, 5);

  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();
    const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    let dayTotal = 0;
    salesData.forEach(sale => {
      if (sale.created_at && new Date(sale.created_at.seconds * 1000).toLocaleDateString() === dateStr) {
        dayTotal += sale.total;
      }
    });
    trendData.push({ name: shortDate, Sales: dayTotal });
  }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* Background Ambient Glow */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* PWA App Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="font-black text-xl text-black">Y</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Yakz Cafe</h1>
            <p className="text-[10px] text-[#888] font-medium tracking-widest uppercase">Live Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-400 tracking-wide">SYNCED</span>
        </div>
      </header>

      <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto relative z-10 pb-24">
        
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* Main Revenue Card */}
          <motion.div variants={itemVariants} className="relative overflow-hidden bg-[#111] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4">
              <IndianRupee className="w-48 h-48" />
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/10 rounded-2xl">
                <IndianRupee className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-gray-400 font-semibold tracking-wide uppercase text-sm">Today's Revenue</h2>
            </div>
            
            <div className="mb-6">
              <span className="text-6xl font-black text-white tracking-tighter">₹{todayRevenue.toFixed(0)}</span>
            </div>

            <div className="flex items-center gap-4 bg-black/40 rounded-2xl p-4 border border-white/5">
              <div>
                <p className="text-gray-500 text-xs font-medium mb-1">Yesterday</p>
                <p className="text-xl font-bold text-gray-300">₹{yesterdayRevenue.toFixed(0)}</p>
              </div>
              
              <div className="h-10 w-px bg-white/10 mx-2" />
              
              <div>
                <p className="text-gray-500 text-xs font-medium mb-1">vs Yesterday</p>
                <div className={`flex items-center gap-1 font-bold ${isPositiveGrowth ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositiveGrowth ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{growthPercentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 7-Day Trend Chart */}
            <motion.div variants={itemVariants} className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" /> Sales Trend
                </h3>
                <span className="text-xs font-semibold text-[#666] bg-black/50 px-3 py-1 rounded-full border border-white/5">Last 7 Days</span>
              </div>
              
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} tickFormatter={(value) => `₹${value}`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1A1A1A', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF' }}
                      itemStyle={{ color: '#10B981', fontWeight: 'bold' }}
                      formatter={(value: any) => [`₹${Number(value).toFixed(0)}`, 'Revenue']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Sales" 
                      stroke="#10B981" 
                      strokeWidth={4} 
                      dot={{ r: 4, fill: '#111', stroke: '#10B981', strokeWidth: 2 }} 
                      activeDot={{ r: 8, fill: '#10B981', stroke: '#FFF' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Top Products */}
            <motion.div variants={itemVariants} className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" /> Top Selling Today
              </h3>
              
              <div className="flex-1 flex flex-col gap-3">
                {topProducts.length > 0 ? topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#222] group-hover:bg-amber-400/20 text-[#888] group-hover:text-amber-400 flex items-center justify-center font-bold text-sm transition-colors">
                        {i+1}
                      </div>
                      <span className="font-semibold text-gray-200">{p.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-black text-amber-400">{p.quantity}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Sold</span>
                    </div>
                  </div>
                )) : (
                  <div className="flex-1 flex items-center justify-center text-[#555] font-medium border-2 border-dashed border-[#222] rounded-2xl p-8">
                    No items sold today.
                  </div>
                )}
              </div>
            </motion.div>

            {/* Category Split */}
            <motion.div variants={itemVariants} className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-xl lg:col-span-2">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-400" /> Category Breakdown
              </h3>
              
              {categoryStats.length > 0 ? (
                <div className="h-[280px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => [`₹${Number(value).toFixed(0)}`, 'Revenue']}
                        contentStyle={{ backgroundColor: '#1A1A1A', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center" 
                        wrapperStyle={{ paddingTop: '20px', fontWeight: '600', color: '#9CA3AF', fontSize: '12px' }} 
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-[#555] font-medium">
                  No category data available today.
                </div>
              )}
            </motion.div>

          </div>
        </motion.div>

      </main>
    </div>
  );
}
