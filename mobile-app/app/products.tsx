import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProductsApp() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  
  const [products, setProducts] = useState<any[]>([]);
  const [editProduct, setEditProduct] = useState<any>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prodList: any[] = [];
      snapshot.forEach(doc => {
        prodList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(prodList);
    });

    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const catList: any[] = [];
      snapshot.forEach(doc => {
        catList.push({ id: doc.id, ...doc.data() });
      });
      if (catList.length === 0) {
        setCategories([{ id: 'default', name: 'General' }]);
      } else {
        setCategories(catList);
        if (!catList.find(c => c.name === category)) {
          setCategory(catList[0].name);
        }
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!pin) return;
    setIsLoadingAuth(true);
    try {
      const docRef = doc(db, 'settings', 'products');
      const docSnap = await getDoc(docRef);
      
      let correctPin = '5555';
      if (docSnap.exists()) {
        correctPin = docSnap.data().pin;
      } else {
        await setDoc(docRef, { pin: '5555' });
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

  const handleAddProduct = async () => {
    const finalCategory = customCategory || category;
    if (!name || !price || !finalCategory) return Alert.alert('Error', 'Fill all fields');
    
    try {
      await addDoc(collection(db, 'products'), {
        name,
        price: parseFloat(price),
        category: finalCategory
      });
      Alert.alert('Success', 'Product added!');
      setName('');
      setPrice('');
      setCustomCategory('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add product');
    }
  };

  const handleUpdateProduct = async () => {
    if (!editProduct?.name || !editProduct?.price) return Alert.alert('Error', 'Fill all fields');
    
    try {
      await updateDoc(doc(db, 'products', editProduct.id), {
        name: editProduct.name,
        price: parseFloat(editProduct.price),
        category: editProduct.category || ''
      });
      Alert.alert('Success', 'Product updated!');
      setEditProduct(null);
    } catch (err: any) {
      Alert.alert('Error', 'Could not update product');
    }
  };

  const handleDeleteProduct = (id: string) => {
    Alert.alert("Delete", "Are you sure you want to delete this product?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'products', id));
        } catch (err) {
          Alert.alert('Error', 'Could not delete');
        }
      }}
    ]);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return Alert.alert('Error', 'Enter category name');
    try {
      await addDoc(collection(db, 'categories'), { name: newCategoryName });
      setNewCategoryName('');
      Alert.alert('Success', 'Category added!');
    } catch (err: any) {
      Alert.alert('Error', 'Could not add category');
    }
  };

  const handleDeleteCategory = (id: string) => {
    Alert.alert("Delete", "Delete this category?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'categories', id));
        } catch (err) {
          Alert.alert('Error', 'Could not delete');
        }
      }}
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authBox}>
          <View style={[styles.iconWrapper, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="cube-outline" size={40} color="#22C55E" />
          </View>
          <Text style={styles.authTitle}>Products</Text>
          <Text style={styles.authSubtitle}>Enter Product Mgmt PIN</Text>
          <TextInput 
            style={styles.authInput} 
            placeholder="****" 
            placeholderTextColor="#9CA3AF"
            value={pin} 
            onChangeText={setPin} 
            keyboardType="numeric" 
            secureTextEntry
          />
          <TouchableOpacity style={[styles.authBtn, { backgroundColor: '#22C55E', shadowColor: '#22C55E' }]} onPress={handleLogin} disabled={isLoadingAuth}>
            <Text style={styles.authBtnText}>{isLoadingAuth ? 'Verifying...' : 'Unlock'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 24 }} onPress={() => router.push('/')}>
            <Text style={{ color: '#6B7280', fontWeight: '600' }}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Manage Categories */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manage Categories</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0 }]} 
              placeholder="New Category Name" 
              placeholderTextColor="#9CA3AF"
              value={newCategoryName} 
              onChangeText={setNewCategoryName} 
            />
            <TouchableOpacity style={[styles.btn, { paddingHorizontal: 24 }]} onPress={handleAddCategory}>
              <Text style={styles.btnText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {categories.map(c => (
              <View key={c.id} style={styles.catChip}>
                <Text style={styles.catChipText}>{c.name}</Text>
                {c.id !== 'default' && (
                  <TouchableOpacity onPress={() => handleDeleteCategory(c.id)} style={{ marginLeft: 8 }}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Add Product */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add New Product</Text>
          
          <Text style={styles.label}>Select Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.catSelectBtn, category === cat.name && !customCategory ? styles.catSelectBtnActive : null]}
                onPress={() => { setCategory(cat.name); setCustomCategory(''); }}
              >
                <Text style={{ color: category === cat.name && !customCategory ? '#FFF' : '#4B5563', fontWeight: '600' }}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.label}>Custom Category (Optional)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Type here..." 
            placeholderTextColor="#9CA3AF"
            value={customCategory} 
            onChangeText={setCustomCategory} 
          />

          <Text style={styles.label}>Product Details</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Name (e.g. Espresso)" 
            placeholderTextColor="#9CA3AF"
            value={name} 
            onChangeText={setName} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Price (e.g. 150)" 
            placeholderTextColor="#9CA3AF"
            value={price} 
            onChangeText={setPrice} 
            keyboardType="numeric" 
          />
          
          <TouchableOpacity style={styles.btn} onPress={handleAddProduct}>
            <Text style={styles.btnText}>Save Product</Text>
          </TouchableOpacity>
        </View>

        {/* Manage Products */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inventory</Text>
          {products.map(p => {
            if (!p) return null;
            return (
            <View key={p.id} style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>{p?.name || 'Unnamed'}</Text>
                <Text style={styles.prodDetails}>₹{Number(p?.price || 0).toFixed(2)} • {p?.category || 'No Category'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setEditProduct({ ...p, price: p?.price?.toString() || '0' })} style={styles.actionBtn}>
                  <Text style={{ color: '#0EA5E9', fontWeight: '700' }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteProduct(p?.id)} style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={{ color: '#EF4444', fontWeight: '700' }}>Del</Text>
                </TouchableOpacity>
              </View>
            </View>
            );
          })}
          {products.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Ionicons name="cube-outline" size={40} color="#E5E7EB" />
              <Text style={{ color: '#9CA3AF', marginTop: 10 }}>No products yet</Text>
            </View>
          )}
        </View>

        {/* Edit Modal */}
        {editProduct && (
          <Modal visible transparent animationType="fade">
            <View style={styles.modalBg}>
              <View style={styles.modalCard}>
                <Text style={[styles.cardTitle, { marginBottom: 16 }]}>Edit Product</Text>
                
                <Text style={styles.label}>Name</Text>
                <TextInput 
                  style={styles.input} 
                  value={editProduct?.name || ''} 
                  onChangeText={t => setEditProduct({...editProduct, name: t})} 
                  placeholderTextColor="#9CA3AF"
                />
                
                <Text style={styles.label}>Price</Text>
                <TextInput 
                  style={styles.input} 
                  value={editProduct?.price || ''} 
                  onChangeText={t => setEditProduct({...editProduct, price: t})} 
                  keyboardType="numeric" 
                  placeholderTextColor="#9CA3AF"
                />
                
                <Text style={styles.label}>Category</Text>
                <TextInput 
                  style={styles.input} 
                  value={editProduct?.category || ''} 
                  onChangeText={t => setEditProduct({...editProduct, category: t})} 
                  placeholderTextColor="#9CA3AF"
                />
                
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: '#F3F4F6', shadowOpacity: 0 }]} onPress={() => setEditProduct(null)}>
                    <Text style={[styles.btnText, { color: '#4B5563' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={handleUpdateProduct}>
                    <Text style={styles.btnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
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
  
  // Cards
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20, color: '#111827' },
  
  // Form Elements
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16, fontSize: 16, color: '#111827' },
  btn: { backgroundColor: '#0EA5E9', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  
  // Categories
  catChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  catChipText: { color: '#374151', fontWeight: '600' },
  catSelectBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  catSelectBtnActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  
  // Products
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  prodName: { fontWeight: '700', fontSize: 16, color: '#111827', marginBottom: 4 },
  prodDetails: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  actionBtn: { backgroundColor: '#F0F9FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
});
