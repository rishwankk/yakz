"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface ProductSale {
  name: string;
  quantity: number;
  total: number;
}

interface CategorySale {
  name: string;
  total: number;
  products: ProductSale[];
}

export default function AnalyticsDashboard() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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
      allSales.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
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
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-[#8B5CF6] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const shiftDate = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  const selectedDateStr = selectedDate.toLocaleDateString();
  const todayStr = new Date().toLocaleDateString();
  const monthStr = selectedDate.getMonth() + '-' + selectedDate.getFullYear();

  let selectedDaySales = 0;
  let monthSales = 0;
  
  const categoryMap: Record<string, number> = {};
  const categoryDetails: Record<string, ProductSale[]> = {};
  const itemMap: Record<string, number> = {};

  salesData.forEach(sale => {
    if (sale.created_at) {
      const orderDateObj = new Date(sale.created_at.seconds * 1000);
      const orderDate = orderDateObj.toLocaleDateString();
      const orderMonth = orderDateObj.getMonth() + '-' + orderDateObj.getFullYear();
      
      if (orderMonth === monthStr) {
        monthSales += sale.total;
      }

      if (orderDate === selectedDateStr) {
        selectedDaySales += sale.total;
        
        sale.items?.forEach((item: any) => {
          let cat = item.category;
          if (!cat || cat === 'Unknown') {
            const p = products.find(prod => prod.id === item.productId || prod.name === item.product_name);
            cat = p ? p.category : 'Unknown';
          }
          
          categoryMap[cat] = (categoryMap[cat] || 0) + (item.price * item.quantity);
          itemMap[item.product_name] = (itemMap[item.product_name] || 0) + item.quantity;
          
          if (!categoryDetails[cat]) categoryDetails[cat] = [];
          const existing = categoryDetails[cat].find(i => i.name === item.product_name);
          if (existing) {
            existing.quantity += item.quantity;
            existing.total += (item.price * item.quantity);
          } else {
            categoryDetails[cat].push({ name: item.product_name, quantity: item.quantity, total: (item.price * item.quantity) });
          }
        });
      }
    }
  });

  const categoryStats = Object.keys(categoryMap).map(k => ({ name: k, total: categoryMap[k] })).sort((a,b) => b.total - a.total);
  const topItems = Object.keys(itemMap).map(k => ({ name: k, quantity: itemMap[k] })).sort((a,b) => b.quantity - a.quantity).slice(0, 10);

  const graphData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();
    const shortDate = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) + '/';
    
    let dayTotal = 0;
    salesData.forEach(sale => {
      if (sale.created_at && new Date(sale.created_at.seconds * 1000).toLocaleDateString() === dateStr) {
        dayTotal += sale.total;
      }
    });
    graphData.push({ name: shortDate, Sales: dayTotal });
  }

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans pb-24 overflow-x-hidden">
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6 flex items-center bg-[#0A0A0A] z-10 relative"
      >
        <Link href="/" className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center hover:bg-[#2A2A2A] transition-colors border border-white/5">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-xl font-bold flex-1 text-center pr-10 tracking-wide">Dashboard</h1>
      </motion.header>

      <motion.main 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="max-w-4xl mx-auto px-4 space-y-6"
      >

        {/* Date Selector */}
        <motion.div variants={itemVariants} className="flex items-center justify-between bg-[#111111] p-3 rounded-2xl border border-white/5 shadow-xl">
          <button 
            onClick={() => shiftDate(-1)} 
            className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center hover:bg-[#2A2A2A] transition-colors border border-white/5"
          >
            <ChevronLeft className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
          
          <span className="text-lg font-bold text-white tracking-wide">
            {selectedDateStr === todayStr ? "Today" : selectedDateStr}
          </span>
          
          <button 
            onClick={() => shiftDate(1)} 
            disabled={selectedDateStr === todayStr}
            className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center hover:bg-[#2A2A2A] transition-colors border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className={`w-6 h-6 ${selectedDateStr === todayStr ? 'text-gray-600' : 'text-gray-400 hover:text-white'}`} />
          </button>
        </motion.div>

        {/* Sales Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-[#111111] p-5 sm:p-6 rounded-3xl border border-white/5 shadow-xl">
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Day Revenue</p>
            <p className="text-2xl sm:text-3xl font-black text-[#8B5CF6]">₹{selectedDaySales.toFixed(0)}</p>
          </div>
          <div className="bg-[#111111] p-5 sm:p-6 rounded-3xl border border-white/5 shadow-xl">
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Month Revenue</p>
            <p className="text-2xl sm:text-3xl font-black text-[#8B5CF6]">₹{monthSales.toFixed(0)}</p>
          </div>
        </motion.div>
        
        {/* Sales Trend Chart (Line Chart with Purple Line) */}
        <motion.div variants={itemVariants} className="bg-[#111111] rounded-[24px] p-6 border border-white/5 shadow-xl">
          <h2 className="text-lg font-bold mb-8">Sales Over Time</h2>
          
          <div className="h-[250px] w-full -ml-5 sm:-ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 12 }} 
                  dy={15} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 12 }} 
                  tickFormatter={(value) => `₹${value}`} 
                  width={60}
                />
                <Line 
                  type="monotone" 
                  dataKey="Sales" 
                  stroke="#8B5CF6" 
                  strokeWidth={4} 
                  dot={{ r: 0 }} 
                  activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#0A0A0A', strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Category Split */}
          <motion.div variants={itemVariants} className="bg-[#111111] rounded-[24px] p-6 border border-white/5 shadow-xl">
            <h2 className="text-gray-400 font-semibold mb-6 uppercase tracking-widest text-sm">Category Split</h2>
            
            <div className="flex flex-col gap-5">
              {categoryStats.length > 0 ? categoryStats.map((cat, idx) => (
                <div key={idx} className="flex flex-col">
                  <button 
                    onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                    className="flex items-center justify-between w-full group focus:outline-none"
                  >
                    <span className="text-[15px] font-bold text-white tracking-wide group-hover:text-purple-300 transition-colors">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-bold text-[#A78BFA]">₹{cat.total.toFixed(0)}</span>
                    </div>
                  </button>
                  
                  {/* Expanding Animated Details */}
                  <AnimatePresence>
                    {expandedCategory === cat.name && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-[#1A1A1A] rounded-xl p-4 mt-3 mb-1 border border-white/5">
                          <div className="flex border-b border-white/10 pb-2 mb-2 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                            <span className="flex-[2]">Product</span>
                            <span className="flex-1 text-center">Qty</span>
                            <span className="flex-1 text-right">Total</span>
                          </div>
                          
                          {categoryDetails[cat.name].sort((a,b) => b.total - a.total).map((item, i) => (
                            <div key={i} className="flex py-1.5 items-center">
                              <span className="flex-[2] text-sm text-gray-300 truncate pr-2">{item.name}</span>
                              <span className="flex-1 text-center text-sm text-white font-medium">{item.quantity}</span>
                              <span className="flex-1 text-right text-sm text-[#A78BFA] font-bold">₹{item.total.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )) : (
                <p className="text-gray-600 text-sm italic py-4">No categories sold on this date.</p>
              )}
            </div>
          </motion.div>

          {/* Top Products */}
          <motion.div variants={itemVariants} className="bg-[#111111] rounded-[24px] p-6 border border-white/5 shadow-xl">
            <h2 className="text-gray-400 font-semibold mb-6 uppercase tracking-widest text-sm">Top Products</h2>
            
            <div className="flex flex-col gap-4">
              {topItems.length > 0 ? topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-white tracking-wide truncate pr-4">
                    {item.name}
                  </span>
                  <span className="bg-[#1A1A1A] text-white font-bold text-sm px-3 py-1.5 rounded-lg border border-white/5">
                    {item.quantity}
                  </span>
                </div>
              )) : (
                <p className="text-gray-600 text-sm italic py-4">No products sold on this date.</p>
              )}
            </div>
          </motion.div>

        </div>
      </motion.main>
    </div>
  );
}
