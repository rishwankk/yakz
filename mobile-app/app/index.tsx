import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // We can use Ionicons or similar if available, or just text emojis. Since Expo includes @expo/vector-icons, I will use them.

const { width } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBg}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Yakz Cafe</Text>
        <Text style={styles.subtitle}>Management OS</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <View style={styles.row}>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/waiter')}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Text style={styles.emoji}>📝</Text>
            </View>
            <Text style={styles.cardTitle}>Waiter Menu</Text>
            <Text style={styles.cardDesc}>Take orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.card} onPress={() => router.push('/cashier')}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Text style={styles.emoji}>💵</Text>
            </View>
            <Text style={styles.cardTitle}>Cashier</Text>
            <Text style={styles.cardDesc}>Settle bills</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/products')}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Text style={styles.emoji}>📦</Text>
            </View>
            <Text style={styles.cardTitle}>Products</Text>
            <Text style={styles.cardDesc}>Manage items</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/admin')}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Text style={styles.emoji}>📊</Text>
            </View>
            <Text style={styles.cardTitle}>Dashboard</Text>
            <Text style={styles.cardDesc}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A', // Deep Charcoal
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoBg: {
    backgroundColor: '#111111',
    padding: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#222222',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  buttonContainer: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 24,
    padding: 24,
    flex: 1,
    alignItems: 'flex-start',
  },
  iconBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 24,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDesc: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '500',
  }
});
