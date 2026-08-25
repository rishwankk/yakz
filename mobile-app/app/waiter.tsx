import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert, ActivityIndicator, Image, Platform, UIManager, LayoutAnimation } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android') {
  try {
    if (UIManager && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  } catch (e) {
    console.log('LayoutAnimation setup failed', e);
  }
}

export default function WaiterApp() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<{ product: any, quantity: number }[]>([]);
  const [table, setTable] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prodData: any[] = [];
      const catSet = new Set<string>();
      
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as any;
        prodData.push(data);
        if (data.category) catSet.add(data.category);
      });
      
      setProducts(prodData);
      setCategories(Array.from(catSet).map(c => ({ name: c })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const animateCart = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const addToCart = (product: any) => {
    animateCart();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    animateCart();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const sendOrder = async () => {
    if (!table) return Alert.alert("Hold on!", "Please enter a table number.");
    if (cart.length === 0) return Alert.alert("Empty Order", "Please add some items to the cart.");
    
    setLoading(true);
    try {
      const items = cart.map(c => ({
        productId: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        price: c.product.price,
        category: c.product.category || 'Unknown'
      }));
      
      const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

      await addDoc(collection(db, 'orders'), {
        table_number: table,
        items,
        total,
        status: 'pending', // Cashier will see this
        created_at: serverTimestamp()
      });
      
      Alert.alert("Success", "Order confirmed and sent to Cashier!");
      animateCart();
      setCart([]);
      setTable('');
    } catch (err) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#F97316" /></View>;

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });
  
  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Ionicons name="restaurant" size={20} color="#F97316" />
          </View>
          <Text style={styles.headerTitle}>New Order</Text>
        </View>
        <View style={styles.tableInputContainer}>
          <Text style={styles.tableLabel}>Table</Text>
          <TextInput 
            style={styles.tableInput} 
            value={table} 
            onChangeText={setTable} 
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search for dishes..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={styles.categories}>
        <FlatList 
          horizontal 
          showsHorizontalScrollIndicator={false}
          data={[{name: 'All'}, ...categories]}
          keyExtractor={item => item.name}
          renderItem={({item}) => (
            <TouchableOpacity 
              style={[styles.catBtn, activeCategory === item.name && styles.catBtnActive]}
              onPress={() => setActiveCategory(item.name)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catText, activeCategory === item.name && styles.catTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Products Grid */}
      <FlatList 
        data={filteredProducts}
        keyExtractor={item => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.productList, { paddingBottom: cart.length > 0 ? 360 : 40 }]}
        renderItem={({item}) => {
          const cartItem = cart.find(c => c.product.id === item.id);
          return (
            <TouchableOpacity 
              style={[styles.productCard, cartItem ? styles.productCardActive : null]} 
              onPress={() => addToCart(item)}
              activeOpacity={0.8}
            >
              <View style={styles.productIconWrapper}>
                <Ionicons name="fast-food-outline" size={32} color={cartItem ? "#F97316" : "#D1D5DB"} />
                {cartItem && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartItem.quantity}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productPrice}>₹{item.price.toFixed(0)}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
            <Text style={{ color: '#9CA3AF', marginTop: 10, fontSize: 16 }}>No products found</Text>
          </View>
        }
      />

      {/* Modern Cart Summary (Bottom Sheet Style) */}
      {cart.length > 0 && (
        <View style={styles.cartContainer}>
          <View style={styles.cartHeader}>
            <View>
              <Text style={styles.cartTitle}>Current Order</Text>
              <Text style={styles.cartSubtitle}>{cart.reduce((s, c) => s + c.quantity, 0)} items</Text>
            </View>
            <Text style={styles.cartTotalMain}>₹{total.toFixed(0)}</Text>
          </View>

          <View style={{ maxHeight: 220, marginBottom: 16 }}>
            <FlatList 
              data={cart}
              keyExtractor={(item) => item.product.id}
              showsVerticalScrollIndicator={false}
              renderItem={({item: c}) => (
                <View style={styles.cartItemRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{c.product.name}</Text>
                    <Text style={styles.cartItemPrice}>₹{(c.product.price * c.quantity).toFixed(0)}</Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(c.product.id)}>
                      <Ionicons name="remove" size={20} color="#F97316" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{c.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(c.product)}>
                      <Ionicons name="add" size={20} color="#F97316" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
          
          <TouchableOpacity style={styles.sendBtn} onPress={sendOrder} activeOpacity={0.8}>
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              style={styles.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.sendBtnText}>Send to Kitchen</Text>
              <Ionicons name="paper-plane-outline" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    paddingTop: 48, // Assuming some safe area padding
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  
  tableInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  tableLabel: { fontSize: 16, fontWeight: '700', color: '#6B7280', marginRight: 8 },
  tableInput: { fontSize: 20, fontWeight: '800', color: '#111827', minWidth: 40, textAlign: 'center' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '500' },
  
  categories: { padding: 16, paddingBottom: 8 },
  catBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, backgroundColor: '#FFFFFF', marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  catBtnActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  catText: { fontWeight: '600', color: '#6B7280', fontSize: 15 },
  catTextActive: { color: '#FFFFFF', fontWeight: '700' },
  
  productList: { paddingHorizontal: 8, paddingBottom: 40 },
  productCard: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    margin: 8, 
    padding: 16, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, 
    shadowRadius: 12, 
    elevation: 3,
    height: 140
  },
  productCardActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  productIconWrapper: { marginBottom: 12, position: 'relative' },
  badge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#F97316', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  productName: { fontWeight: '700', textAlign: 'center', marginBottom: 6, color: '#111827', fontSize: 15 },
  productPrice: { color: '#F97316', fontWeight: '800', fontSize: 16 },
  
  cartContainer: { 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08, 
    shadowRadius: 20, 
    elevation: 24,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingBottom: 16 },
  cartTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  cartSubtitle: { color: '#6B7280', fontWeight: '600', fontSize: 14, marginTop: 2 },
  cartTotalMain: { fontSize: 24, fontWeight: '900', color: '#F97316' },
  
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cartItemName: { fontSize: 16, color: '#111827', fontWeight: '700', marginBottom: 4 },
  cartItemPrice: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20, padding: 4 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  qtyText: { fontSize: 16, fontWeight: '800', width: 32, textAlign: 'center', color: '#111827' },
  
  sendBtn: { marginTop: 8, borderRadius: 16, overflow: 'hidden', shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  gradientBtn: { flexDirection: 'row', padding: 18, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});
