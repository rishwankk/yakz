import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Animated, LayoutAnimation, Platform, UIManager, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

if (Platform.OS === 'android') {
  try {
    if (UIManager && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  } catch (e) {
    console.log('LayoutAnimation setup failed', e);
  }
}

export default function AdminApp() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  
  const [salesData, setSalesData] = useState<any[]>([]);
  const [monthSales, setMonthSales] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [products, setProducts] = useState<any[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [newPin, setNewPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Fetch Sales
    const q = query(collection(db, 'orders'), where('status', '==', 'paid'));
    const unsubscribeSales = onSnapshot(q, (snapshot) => {
      const allSales: any[] = [];
      let monthTotal = 0;
      const now = new Date();
      const monthStr = now.getMonth() + '-' + now.getFullYear();

      snapshot.forEach(doc => {
        const data = doc.data();
        allSales.push({ id: doc.id, ...data });
        
        if (data.created_at) {
          const orderDate = new Date(data.created_at.seconds * 1000);
          if ((orderDate.getMonth() + '-' + orderDate.getFullYear()) === monthStr) monthTotal += data.total;
        }
      });
      allSales.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
      setMonthSales(monthTotal);
      setSalesData(allSales);
    });

    // Fetch Products (just to lookup categories for old orders)
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prodList: any[] = [];
      snapshot.forEach(doc => {
        prodList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(prodList);
    });

    return () => {
      unsubscribeSales();
      unsubscribeProducts();
    };
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!pin) return;
    setIsLoadingAuth(true);
    try {
      const docRef = doc(db, 'settings', 'admin');
      const docSnap = await getDoc(docRef);
      
      let correctPin = '33335005';
      if (docSnap.exists()) {
        correctPin = docSnap.data().pin;
      } else {
        await setDoc(docRef, { pin: '33335005' });
      }

      if (pin === correctPin) {
        setIsAuthenticated(true);
      } else {
        Alert.alert('Error', 'Incorrect PIN');
        setPin('');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not connect to database');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleChangePin = async () => {
    if (newPin.length < 4) {
      return Alert.alert('Error', 'PIN must be at least 4 digits');
    }
    setIsChangingPin(true);
    try {
      const docRef = doc(db, 'settings', 'admin');
      await setDoc(docRef, { pin: newPin }, { merge: true });
      Alert.alert('Success', 'Admin PIN has been updated successfully!');
      setNewPin('');
    } catch (err) {
      Alert.alert('Error', 'Failed to update PIN');
    } finally {
      setIsChangingPin(false);
    }
  };

  const shiftDate = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  const toggleCategory = (catName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === catName ? null : catName);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authBox}>
          <View style={styles.iconWrapper}>
            <Ionicons name="stats-chart" size={40} color="#0EA5E9" />
          </View>
          <Text style={styles.authTitle}>Dashboard</Text>
          <Text style={styles.authSubtitle}>Enter Admin PIN to access</Text>
          <TextInput 
            style={styles.authInput} 
            placeholder="****" 
            placeholderTextColor="#9CA3AF"
            value={pin} 
            onChangeText={setPin} 
            keyboardType="numeric" 
            secureTextEntry
          />
          <TouchableOpacity style={styles.authBtn} onPress={handleLogin} disabled={isLoadingAuth}>
            <Text style={styles.authBtnText}>{isLoadingAuth ? 'Verifying...' : 'Unlock'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 24 }} onPress={() => router.push('/')}>
            <Text style={{ color: '#6B7280', fontWeight: '600' }}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selectedDateStr = selectedDate.toLocaleDateString();
  let selectedDaySales = 0;
  const categoryMap: Record<string, number> = {};
  const categoryDetails: Record<string, {name: string, quantity: number, total: number}[]> = {};
  const itemMap: Record<string, number> = {};

  salesData.forEach(sale => {
    if (sale.created_at) {
      const orderDate = new Date(sale.created_at.seconds * 1000).toLocaleDateString();
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

  const graphLabels: string[] = [];
  const graphValues: number[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();
    graphLabels.push(dateStr.substring(0, 5));
    
    let dayTotal = 0;
    salesData.forEach(sale => {
      if (sale.created_at && new Date(sale.created_at.seconds * 1000).toLocaleDateString() === dateStr) {
        dayTotal += sale.total;
      }
    });
    graphValues.push(dayTotal);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateArrowBtn}>
            <Ionicons name="chevron-back" size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.dateSelectorText}>
            {selectedDateStr === new Date().toLocaleDateString() ? "Today" : selectedDateStr}
          </Text>
          <TouchableOpacity onPress={() => shiftDate(1)} style={styles.dateArrowBtn} disabled={selectedDateStr === new Date().toLocaleDateString()}>
            <Ionicons name="chevron-forward" size={24} color={selectedDateStr === new Date().toLocaleDateString() ? '#D1D5DB' : '#4B5563'} />
          </TouchableOpacity>
        </View>

        {/* Sales Summary */}
        <View style={styles.row}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Day Revenue</Text>
            <Text style={styles.statValue}>₹{selectedDaySales.toFixed(0)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Month Revenue</Text>
            <Text style={styles.statValue}>₹{monthSales.toFixed(0)}</Text>
          </View>
        </View>

        {/* Graph */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sales Trend</Text>
          {Math.max(...graphValues) > 0 ? (
            <LineChart
              data={{ labels: graphLabels, datasets: [{ data: graphValues }] }}
              width={Dimensions.get('window').width - 80}
              height={220}
              yAxisLabel="₹"
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#FFF',
                backgroundGradientFrom: '#FFF',
                backgroundGradientTo: '#FFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#0EA5E9" },
              }}
              bezier
              style={{ borderRadius: 16, marginTop: 10, marginLeft: -10 }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trending-up" size={48} color="#E5E7EB" />
              <Text style={styles.emptyStateText}>No sales data for graph yet</Text>
            </View>
          )}
        </View>

        {/* Category Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category Split</Text>
          {categoryStats.length > 0 ? categoryStats.map((cat, idx) => (
            <View key={idx} style={styles.categoryContainer}>
              <TouchableOpacity style={styles.splitRow} onPress={() => toggleCategory(cat.name)} activeOpacity={0.7}>
                <View style={styles.categoryLeft}>
                  <View style={styles.categoryColorDot} />
                  <Text style={styles.splitName}>{cat.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.splitTotal}>₹{cat.total.toFixed(0)}</Text>
                  <Ionicons 
                    name={expandedCategory === cat.name ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#9CA3AF" 
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </TouchableOpacity>
              
              {/* Expandable Details */}
              {expandedCategory === cat.name && (
                <View style={styles.expandedDetails}>
                  <View style={styles.expandedHeader}>
                    <Text style={[styles.expandedText, { flex: 2, color: '#6B7280' }]}>Product</Text>
                    <Text style={[styles.expandedText, { flex: 1, textAlign: 'center', color: '#6B7280' }]}>Qty</Text>
                    <Text style={[styles.expandedText, { flex: 1, textAlign: 'right', color: '#6B7280' }]}>Total</Text>
                  </View>
                  {categoryDetails[cat.name].sort((a,b) => b.total - a.total).map((item, i) => (
                    <View key={i} style={styles.expandedItemRow}>
                      <Text style={[styles.expandedText, { flex: 2, fontWeight: '500' }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.expandedText, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
                      <Text style={[styles.expandedText, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>₹{item.total.toFixed(0)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyStateText}>No sales for this date</Text>
            </View>
          )}
        </View>

        {/* Top Products */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Products</Text>
          {topItems.length > 0 ? topItems.map((item, idx) => (
            <View key={idx} style={[styles.splitRow, idx === topItems.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={styles.rankBadge}>{idx + 1}</Text>
                <Text style={[styles.splitName, { flex: 1 }]} numberOfLines={1}>{item.name}</Text>
              </View>
              <Text style={styles.splitCount}>{item.quantity} sold</Text>
            </View>
          )) : (
            <View style={styles.emptyState}>
              <Ionicons name="basket-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyStateText}>No data available</Text>
            </View>
          )}
        </View>

        {/* Settings / Security */}
        <View style={[styles.card, { marginTop: 10 }]}>
          <Text style={styles.cardTitle}>Security Settings</Text>
          <Text style={styles.label}>Change Admin PIN</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0 }]} 
              placeholder="New PIN" 
              placeholderTextColor="#9CA3AF"
              value={newPin} 
              onChangeText={setNewPin} 
              keyboardType="numeric"
              secureTextEntry
            />
            <TouchableOpacity 
              style={[styles.btn, { paddingHorizontal: 24, backgroundColor: '#0EA5E9' }]} 
              onPress={handleChangePin}
              disabled={isChangingPin}
            >
              <Text style={[styles.btnText, { color: '#FFF' }]}>{isChangingPin ? 'Saving...' : 'Update'}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  // Auth Styles
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20 },
  authBox: { backgroundColor: '#FFF', padding: 32, borderRadius: 24, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 10 },
  iconWrapper: { backgroundColor: '#F0F9FF', padding: 16, borderRadius: 20, marginBottom: 20 },
  authTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  authSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  authInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, fontSize: 24, width: '100%', color: '#111827', textAlign: 'center', marginBottom: 24, letterSpacing: 8 },
  authBtn: { backgroundColor: '#0EA5E9', width: '100%', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  authBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 24, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F3F4F6' },
  backBtn: { width: 44, height: 44, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  
  // Date Selector
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 8, borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 },
  dateArrowBtn: { width: 44, height: 44, backgroundColor: '#F9FAFB', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateSelectorText: { fontSize: 16, fontWeight: '700', color: '#111827' },

  // Stats
  row: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, flex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 3 },
  statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 28, fontWeight: '900', color: '#0EA5E9' },

  // Cards
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20, color: '#111827' },
  
  // List Rows
  categoryContainer: { borderBottomWidth: 1, borderColor: '#F3F4F6' },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center' },
  categoryColorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0EA5E9', marginRight: 12 },
  splitName: { color: '#374151', fontWeight: '600', fontSize: 15 },
  splitTotal: { color: '#111827', fontWeight: '800', fontSize: 16 },
  
  // Badges
  rankBadge: { backgroundColor: '#F3F4F6', color: '#4B5563', width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, fontWeight: '700', fontSize: 12, marginRight: 12, overflow: 'hidden' },
  splitCount: { color: '#0EA5E9', fontWeight: '700', fontSize: 14, backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  
  // Expandable Details
  expandedDetails: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginTop: 4, marginBottom: 12 },
  expandedHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  expandedItemRow: { flexDirection: 'row', paddingVertical: 6 },
  expandedText: { fontSize: 13, color: '#374151' },
  
  // Forms & Settings
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, fontSize: 16, color: '#111827' },
  btn: { backgroundColor: '#0EA5E9', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyStateText: { color: '#9CA3AF', marginTop: 12, fontSize: 15, fontWeight: '500' }
});
