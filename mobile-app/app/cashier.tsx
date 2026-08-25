import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator, Image, Modal, Platform, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import * as Print from 'expo-print';
import BluetoothPrinter, { BluetoothDevice } from 'expo-bluetooth-printer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function CashierApp() {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);

  // Menu & Edit State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editCart, setEditCart] = useState<{ product: any, quantity: number }[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Bluetooth State
  const [isPrinterModalVisible, setPrinterModalVisible] = useState(false);
  const [btDevices, setBtDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Bluetooth Listeners & Auto-Connect
    let foundSub: any, scanStartSub: any, scanEndSub: any, connectSub: any, disconnectSub: any;

    const initBluetooth = async () => {
      if (Platform.OS !== 'web' && BluetoothPrinter && BluetoothPrinter.addListener) {
        try {
          foundSub = BluetoothPrinter.addListener('onDeviceFound', (event: any) => {
            if (event.devices) setBtDevices(event.devices);
          });
          scanStartSub = BluetoothPrinter.addListener('onScanStarted', () => setIsScanning(true));
          scanEndSub = BluetoothPrinter.addListener('onScanCompleted', () => setIsScanning(false));
          connectSub = BluetoothPrinter.addListener('onConnectSuccess', () => {
            // Alert.alert("Success", "Printer connected successfully!");
          });
          disconnectSub = BluetoothPrinter.addListener('onDisconnectSuccess', () => {
            setConnectedDevice(null);
          });

          // Auto-connect if previously saved
          const savedStr = await AsyncStorage.getItem('SAVED_PRINTER');
          if (savedStr) {
            const savedDevice = JSON.parse(savedStr);
            if (BluetoothPrinter.isBluetoothEnabled()) {
               await BluetoothPrinter.connectToDevice(savedDevice.name, savedDevice.address, savedDevice.type);
               setConnectedDevice(savedDevice);
            }
          }
        } catch (e) {
          console.warn("Bluetooth not supported in this environment");
        }
      }
    };
    initBluetooth();

    // Fetch pending and paid orders
    const q = query(collection(db, 'orders'), where('status', 'in', ['pending', 'paid']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pOrders: any[] = [];
      const cOrders: any[] = [];
      let sales = 0;
      
      const todayStr = new Date().toLocaleDateString();

      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as any;
        
        if (data.status === 'pending') {
          pOrders.push(data);
        } else if (data.status === 'paid') {
          if (data.created_at) {
            const orderDate = new Date(data.created_at.seconds * 1000);
            if (orderDate.toLocaleDateString() === todayStr) {
              cOrders.push(data);
              sales += data.total;
            }
          }
        }
      });
      
      pOrders.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
      cOrders.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
      
      setPendingOrders(pOrders);
      setCompletedOrders(cOrders);
      setTodaySales(sales);
      setLoading(false);
    });

    const productsUnsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prodData: any[] = [];
      const catSet = new Set<string>();
      
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as any;
        prodData.push(data);
        if (data.category) catSet.add(data.category);
      });
      
      setProducts(prodData);
      setCategories(Array.from(catSet).map(c => ({ name: c })));
    });

    return () => {
      unsubscribe();
      productsUnsubscribe();
      if (foundSub) foundSub.remove();
      if (scanStartSub) scanStartSub.remove();
      if (scanEndSub) scanEndSub.remove();
      if (connectSub) connectSub.remove();
      if (disconnectSub) disconnectSub.remove();
    };
  }, []);

  const startScan = async () => {
    try {
      if (Platform.OS === 'web') return Alert.alert("Error", "Bluetooth not supported on web");
      
      // Explicitly check if the native module is actually linked (fails in Expo Go)
      if (!BluetoothPrinter || !BluetoothPrinter.requestPermissions) {
         Alert.alert(
           "Native Build Required", 
           "Bluetooth requires a custom APK build. It does not work in Expo Go. Please run 'npx eas-cli build -p android --profile preview' to build your app."
         );
         return;
      }

      await BluetoothPrinter.requestPermissions();
      if (!BluetoothPrinter.isBluetoothEnabled()) {
        BluetoothPrinter.enableBluetooth();
      }
      setBtDevices([]);
      // The library requires passing 'SP02' to fetch paired Classic Bluetooth devices (thermal printers are usually classic, not BLE)
      await BluetoothPrinter.scanForBtDevices("SP02");
    } catch (e) {
      Alert.alert("Scan Error", "Failed to scan. Are you running this inside Expo Go? You need to build an APK.");
    }
  };

  const connectToPrinter = async (device: BluetoothDevice) => {
    try {
      await BluetoothPrinter.connectToDevice(device.name, device.address, device.type);
      setConnectedDevice(device);
      await AsyncStorage.setItem('SAVED_PRINTER', JSON.stringify(device));
      Alert.alert("Success", "Connected to " + device.name);
      setPrinterModalVisible(false);
    } catch (e) {
      Alert.alert("Connection Error", "Could not connect to " + device.name);
    }
  };

  const disconnectPrinter = async () => {
    try {
      await BluetoothPrinter.disconnectFromDevice();
      await AsyncStorage.removeItem('SAVED_PRINTER');
    } catch (e) {
      // ignore
    }
  };

  const openEditMode = (order: any) => {
    setEditingOrder(order);
    setEditCart(order.items.map((item: any) => ({
      product: {
        id: item.productId || `tmp-${Math.random()}`,
        name: item.product_name,
        price: item.price,
        category: item.category || 'Unknown'
      },
      quantity: item.quantity
    })));
  };

  const addToEditCart = (product: any) => {
    setEditCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromEditCart = (productId: string) => {
    setEditCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const saveEditOrder = async () => {
    if (!editingOrder) return;
    if (editCart.length === 0) {
      Alert.alert("Empty Order", "Order must have at least one item. Use delete to remove the order entirely.");
      return;
    }
    
    setLoading(true);
    try {
      const items = editCart.map(c => ({
        productId: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        price: c.product.price,
        category: c.product.category || 'Unknown'
      }));
      
      const total = editCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

      await updateDoc(doc(db, 'orders', editingOrder.id), {
        items,
        total
      });
      
      setEditingOrder(null);
    } catch (err) {
      Alert.alert("Error", "Failed to update order.");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    Alert.alert("Delete Order", "Are you sure you want to delete this order entirely?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'orders', orderId));
          } catch (err) {
            Alert.alert("Error", "Failed to delete order");
          }
        }
      }
    ]);
  };

  const printKitchenCopy = async (order: any) => {
    // Mark as printed to prevent loops
    await updateDoc(doc(db, 'orders', order.id), { kitchen_printed: true });

    if (connectedDevice && Platform.OS !== 'web') {
      try {
        await BluetoothPrinter.printText("*** KITCHEN COPY ***\n", "center");
        await BluetoothPrinter.printSeparator();
        await BluetoothPrinter.printText(`TABLE: ${order.table_number}\n`, "left");
        await BluetoothPrinter.printText(`Time: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n`, "left");
        await BluetoothPrinter.printSeparator();
        
        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i];
          await BluetoothPrinter.printText(`${item.quantity} x  ${item.product_name}\n`, "left");
        }
        await BluetoothPrinter.printSeparator();
        await BluetoothPrinter.skipLines(3);
        return;
      } catch (e) {
        console.warn("Kitchen print failed", e);
      }
    }

    // Fallback to Expo Print (HTML)
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: monospace; font-size: 16px; width: 300px; padding: 10px; margin: 0 auto; color: black; }
            h1 { text-align: center; font-size: 22px; margin-bottom: 10px; }
            .divider { border-bottom: 2px dashed black; margin: 10px 0; }
            .item-row { margin-bottom: 8px; font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <h1>*** KITCHEN COPY ***</h1>
          <div class="divider"></div>
          <h2>TABLE: ${order.table_number}</h2>
          <p>Time: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          <div class="divider"></div>
          ${order.items.map((item: any) => `
            <div class="item-row">${item.quantity} x ${item.product_name}</div>
          `).join('')}
          <div class="divider"></div>
        </body>
      </html>
    `;
    try {
      await Print.printAsync({ html: htmlContent });
    } catch (e) {
      console.warn("Kitchen print HTML failed", e);
    }
  };

  const handlePrint = async (order: any, isReprint: boolean = false) => {
    if (connectedDevice && Platform.OS !== 'web') {
      try {
        await BluetoothPrinter.printText("YAKZ CAFE\n", "center");
        await BluetoothPrinter.printText("Thangalpadi, Naduvath\n", "center");
        await BluetoothPrinter.printText("Mob: 8891410139, 9067345005\n", "center");
        await BluetoothPrinter.printSeparator();
        
        await BluetoothPrinter.printText(`Table: ${order.table_number}   Time: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n`, "left");
        await BluetoothPrinter.printText(`Date: ${new Date().toLocaleDateString()}\n`, "left");
        await BluetoothPrinter.printSeparator();
        
        await BluetoothPrinter.printLabelValue("ITEM", "PRICE");
        await BluetoothPrinter.printSeparator();

        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i];
          await BluetoothPrinter.printLabelValue(`${item.quantity}x ${item.product_name}`, `${(item.price * item.quantity).toFixed(2)}`);
        }
        
        await BluetoothPrinter.printSeparator();
        await BluetoothPrinter.printLabelValue("TOTAL", `Rs. ${order.total.toFixed(2)}`);
        await BluetoothPrinter.printSeparator();
        
        await BluetoothPrinter.printText("Thank you for visiting!\n", "center");
        await BluetoothPrinter.printText("Visit Again!\n", "center");
        
        if (isReprint) {
          await BluetoothPrinter.printText("*** REPRINT ***\n", "center");
        }
        await BluetoothPrinter.skipLines(3);
        return;
      } catch (error) {
        Alert.alert("Print Error", "Failed to print over Bluetooth.");
        throw error;
      }
    }

    // Fallback to Expo Print (HTML)
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: monospace; font-size: 14px; width: 300px; padding: 10px; margin: 0 auto; color: black; }
            h1 { text-align: center; font-size: 26px; margin-bottom: 2px; }
            .address { text-align: center; font-size: 14px; margin: 0; }
            .contact { text-align: center; font-size: 13px; margin-bottom: 15px; font-weight: bold; }
            .info-row { display: flex; justify-content: space-between; font-size: 13px; margin: 5px 0; }
            .divider { border-bottom: 1px dashed black; margin: 10px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .item-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 25px; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>YAKZ CAFE</h1>
          <p class="address">Thangalpadi, Naduvath</p>
          <p class="contact">Mob: 8891410139, 9067345005</p>
          
          <div class="divider"></div>
          <div class="info-row">
            <span>Table: ${order.table_number}</span>
            <span>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <div class="info-row">
            <span>Date: ${new Date().toLocaleDateString()}</span>
          </div>
          <div class="divider"></div>
          
          <div class="item-header">
            <span>ITEM</span>
            <span>PRICE</span>
          </div>
          <div class="divider"></div>

          ${order.items.map((item: any) => `
            <div class="item-row">
              <span>${item.quantity}x ${item.product_name}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          <div class="total-row">
            <span>TOTAL</span>
            <span>Rs. ${order.total.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          
          <p class="footer">Thank you for visiting!<br>Visit Again!</p>
          ${isReprint ? '<p class="footer" style="margin-top: 10px; color: #555;">*** REPRINT ***</p>' : ''}
        </body>
      </html>
    `;

    try {
      await Print.printAsync({
        html: htmlContent,
      });
    } catch (error) {
      Alert.alert("Print Error", "Could not connect to printer.");
      throw error; 
    }
  };

  const printAndSave = async (order: any) => {
    try {
      await handlePrint(order);
      await updateDoc(doc(db, 'orders', order.id), { status: 'paid' });
    } catch (err) {
      // Print failed or user cancelled
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#C27803" /></View>;

  const displayOrders = activeTab === 'pending' ? pendingOrders : completedOrders;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>Cashier</Text>
        <View style={{ flex: 1 }} />
        
        <TouchableOpacity style={styles.btStatusBtn} onPress={() => setPrinterModalVisible(true)}>
          <Text style={styles.btStatusText}>{connectedDevice ? 'BT: ON' : 'BT: OFF'}</Text>
        </TouchableOpacity>

        <View style={styles.salesBadge}>
          <Text style={styles.salesBadgeText}>Today: ₹{todaySales.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]} 
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]} 
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList 
        data={displayOrders}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.tableNumber}>Table {item.table_number}</Text>
              <Text style={item.status === 'pending' ? styles.statusPending : styles.statusPaid}>
                {item.status === 'pending' ? 'NEW ORDER' : 'PAID'}
              </Text>
            </View>

            <View style={styles.itemsList}>
              {item.items.map((oi: any, idx: number) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemText}>{oi.quantity}x {oi.product_name}</Text>
                  <Text style={styles.itemPrice}>₹{(oi.price * oi.quantity).toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.totalText}>Total: ₹{item.total.toFixed(2)}</Text>
              
              <View style={styles.actionRow}>
                {item.status === 'pending' ? (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#3B82F6'}]} onPress={() => openEditMode(item)}>
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#EF4444'}]} onPress={() => deleteOrder(item.id)}>
                      <Text style={styles.actionBtnText}>Del</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#10B981'}]} onPress={() => printKitchenCopy(item)}>
                      <Text style={styles.actionBtnText}>KOT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#C27803'}]} onPress={() => printAndSave(item)}>
                      <Text style={styles.actionBtnText}>Pay</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.reprintBtn} onPress={() => handlePrint(item, true)}>
                    <Text style={styles.reprintBtnText}>Reprint Receipt</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No {activeTab} orders</Text>}
      />

      {/* Printer Modal */}
      <Modal visible={isPrinterModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bluetooth Printer Settings</Text>
            
            {connectedDevice ? (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#059669', marginBottom: 10 }}>Connected to: {connectedDevice.name}</Text>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#DC2626' }]} onPress={disconnectPrinter}>
                  <Text style={styles.btnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, color: '#8A7061', marginBottom: 10 }}>No printer connected.</Text>
                <TouchableOpacity style={styles.btn} onPress={startScan} disabled={isScanning}>
                  <Text style={styles.btnText}>{isScanning ? 'Scanning...' : 'Scan for Printers'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              data={btDevices}
              keyExtractor={(d) => d.address}
              style={{ maxHeight: 200 }}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.deviceRow} onPress={() => connectToPrinter(item)}>
                  <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
                  <Text style={styles.deviceAddress}>{item.address}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#A89F91', padding: 20 }}>No devices found</Text>}
            />

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#F5EFE6', marginTop: 10 }]} onPress={() => setPrinterModalVisible(false)}>
              <Text style={[styles.btnText, { color: '#8A7061' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Order Modal */}
      <Modal visible={!!editingOrder} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#FDFBF7', paddingTop: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E7D8C9' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#2C1E16' }}>Edit Table {editingOrder?.table_number}</Text>
            <TouchableOpacity onPress={() => setEditingOrder(null)}>
              <Text style={{ fontSize: 16, color: '#DC2626', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {/* Left: Products Menu */}
            <View style={{ flex: 2, borderRightWidth: 1, borderColor: '#E7D8C9' }}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#A89F91" style={styles.searchIcon} />
                <TextInput 
                  style={styles.searchInput}
                  placeholder="Search menu..."
                  placeholderTextColor="#A89F91"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

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
                    >
                      <Text style={[styles.catText, activeCategory === item.name && styles.catTextActive]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              <FlatList 
                data={products.filter(p => (activeCategory === 'All' || p.category === activeCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={styles.productList}
                renderItem={({item}) => (
                  <TouchableOpacity style={styles.productCard} onPress={() => addToEditCart(item)}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Right: Cart */}
            <View style={{ flex: 1.5, backgroundColor: '#FFFFFF' }}>
              <FlatList 
                data={editCart}
                keyExtractor={(item) => item.product.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({item: c}) => (
                  <View style={styles.cartItemRow}>
                    <Text style={styles.cartItemName} numberOfLines={2}>{c.product.name}</Text>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromEditCart(c.product.id)}>
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{c.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => addToEditCart(c.product)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#E7D8C9' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'right' }}>Total: ₹{editCart.reduce((s, i) => s + i.product.price * i.quantity, 0).toFixed(2)}</Text>
                <TouchableOpacity style={styles.sendBtn} onPress={saveEditOrder}>
                  <Text style={styles.sendBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFBF7' },
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    paddingTop: 20,
    backgroundColor: '#FFFFFF', 
  },
  headerLogo: { width: 32, height: 32, marginRight: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#2C1E16' },
  btStatusBtn: { backgroundColor: '#E7D8C9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginRight: 10 },
  btStatusText: { fontSize: 12, fontWeight: '800', color: '#2C1E16' },
  salesBadge: { backgroundColor: '#F5EFE6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  salesBadgeText: { fontSize: 14, fontWeight: '800', color: '#C27803' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E7D8C9' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderColor: 'transparent' },
  tabActive: { borderColor: '#C27803' },
  tabText: { fontSize: 16, fontWeight: '600', color: '#8A7061' },
  tabTextActive: { color: '#C27803', fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: {width: 0, height: 4}, elevation: 3, borderWidth: 1, borderColor: '#E7D8C9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#F5EFE6', paddingBottom: 12, marginBottom: 12 },
  tableNumber: { fontSize: 22, fontWeight: '800', color: '#2C1E16' },
  statusPending: { fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FEF3C7', color: '#D97706' },
  statusPaid: { fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', backgroundColor: '#D1FAE5', color: '#059669' },
  itemsList: { marginBottom: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemText: { fontSize: 16, color: '#2C1E16', fontWeight: '500' },
  itemPrice: { fontSize: 16, color: '#8A7061', fontWeight: '600' },
  cardFooter: { flexDirection: 'column', borderTopWidth: 1, borderColor: '#F5EFE6', paddingTop: 16, gap: 16 },
  totalText: { fontSize: 20, fontWeight: '800', color: '#2C1E16' },
  actionRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  actionBtn: { paddingHorizontal: 4, paddingVertical: 12, borderRadius: 12, flex: 1, alignItems: 'center', marginHorizontal: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  actionBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  deleteBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flex: 0.4, alignItems: 'center' },
  deleteBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
  printSaveBtn: { backgroundColor: '#C27803', paddingHorizontal: 10, paddingVertical: 12, borderRadius: 12, flex: 0.6, alignItems: 'center', shadowColor: '#C27803', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  printSaveBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  reprintBtn: { backgroundColor: '#F5EFE6', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flex: 1, alignItems: 'center' },
  reprintBtnText: { color: '#8A7061', fontWeight: '800', fontSize: 15 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 18, color: '#A89F91', fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(44, 30, 22, 0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#2C1E16', marginBottom: 20, textAlign: 'center' },
  btn: { backgroundColor: '#C27803', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  deviceRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F5EFE6' },
  deviceName: { fontSize: 16, fontWeight: '700', color: '#2C1E16' },
  deviceAddress: { fontSize: 12, color: '#8A7061' },
  
  // Edit Modal Styles
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E7D8C9' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 16, color: '#2C1E16' },
  categories: { padding: 16, paddingBottom: 8 },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, backgroundColor: '#FFFFFF', marginRight: 10, borderWidth: 1, borderColor: '#E7D8C9' },
  catBtnActive: { backgroundColor: '#2C1E16', borderColor: '#2C1E16' },
  catText: { fontWeight: '600', color: '#8A7061', fontSize: 15 },
  catTextActive: { color: '#FFFFFF' },
  productList: { paddingHorizontal: 8, paddingBottom: 20 },
  productCard: { flex: 1, backgroundColor: '#FFFFFF', margin: 8, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7D8C9', height: 90 },
  productName: { fontWeight: '700', textAlign: 'center', marginBottom: 4, color: '#2C1E16', fontSize: 13 },
  productPrice: { color: '#C27803', fontWeight: '800', fontSize: 14 },
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cartItemName: { fontSize: 14, flex: 1, color: '#2C1E16', fontWeight: '500', paddingRight: 8 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5EFE6', borderRadius: 20, paddingHorizontal: 4 },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  qtyBtnText: { fontSize: 16, fontWeight: '800', color: '#C27803' },
  qtyText: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center', color: '#2C1E16' },
  sendBtn: { backgroundColor: '#C27803', padding: 16, borderRadius: 16, alignItems: 'center' },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
