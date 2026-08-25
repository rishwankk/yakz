"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, DollarSign, Package } from "lucide-react";

export default function AnalyticsDashboard() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Products (to lookup categories if needed)
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prodList: any[] = [];
      snapshot.forEach(doc => {
        prodList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(prodList);
    });

    // Fetch Paid Orders
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 font-medium">Loading live analytics...</p>
        </div>
      </div>
    );
  }

  // --- Compute Analytics ---
  const todayStr = new Date().toLocaleDateString();
  const monthStr = new Date().getMonth() + '-' + new Date().getFullYear();
  
  let dayRevenue = 0;
  let monthRevenue = 0;
  
  const categoryMap: Record<string, number> = {};
  const productMap: Record<string, number> = {};

  salesData.forEach(sale => {
    if (sale.created_at) {
      const orderDateObj = new Date(sale.created_at.seconds * 1000);
      const orderDateStr = orderDateObj.toLocaleDateString();
      const orderMonthStr = orderDateObj.getMonth() + '-' + orderDateObj.getFullYear();
      
      if (orderDateStr === todayStr) dayRevenue += sale.total;
      if (orderMonthStr === monthStr) monthRevenue += sale.total;

      // Only count products/categories for today to match Admin App, or all time?
      // Let's do today's category split
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

  const categoryStats = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] }));
  const topProducts = Object.keys(productMap)
    .map(k => ({ name: k, quantity: productMap[k] }))
    .sort((a,b) => b.quantity - a.quantity)
    .slice(0, 5);

  // 5 Day Sales Trend Graph
  const trendData = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();
    
    let dayTotal = 0;
    salesData.forEach(sale => {
      if (sale.created_at && new Date(sale.created_at.seconds * 1000).toLocaleDateString() === dateStr) {
        dayTotal += sale.total;
      }
    });
    trendData.push({ name: dateStr.substring(0, 5), Sales: dayTotal });
  }

  const COLORS = ['#0EA5E9', '#F97316', '#10B981', '#8B5CF6', '#F43F5E', '#EAB308'];

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans p-4 md:p-8">
      
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yakz Cafe Analytics</h1>
          <p className="text-gray-500 mt-1">Live Revenue & Sales Tracking</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Live Firebase Sync</span>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mr-6">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Today's Revenue</p>
            <h2 className="text-4xl font-black text-blue-500">₹{dayRevenue.toFixed(0)}</h2>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mr-6">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Revenue</p>
            <h2 className="text-4xl font-black text-emerald-500">₹{monthRevenue.toFixed(0)}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart: 5 Day Trend */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Sales Trend (Last 5 Days)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} tickFormatter={(value) => `₹${value}`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#0EA5E9', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="Sales" stroke="#0EA5E9" strokeWidth={4} dot={{ r: 6, fill: '#FFF', stroke: '#0EA5E9', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" /> Top Selling Today
          </h3>
          <div className="flex flex-col gap-4">
            {topProducts.length > 0 ? topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-gray-500 text-sm">
                    {i+1}
                  </div>
                  <span className="font-bold text-gray-800">{p.name}</span>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-lg font-bold text-sm">
                  {p.quantity} sold
                </span>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-400 font-medium">No sales today yet.</div>
            )}
          </div>
        </div>

        {/* Category Split (Pie Chart) */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 lg:col-span-3">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-500" /> Today's Category Split
          </h3>
          {categoryStats.length > 0 ? (
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => [`₹${Number(value).toFixed(0)}`, 'Revenue']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontWeight: '600', color: '#4B5563' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 font-medium">No category data today.</div>
          )}
        </div>

      </div>
    </div>
  );
}
