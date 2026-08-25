import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [message, setMessage] = useState('Payment Required. Please contact the developer.');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'subscription'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.is_locked === true) {
          setIsLocked(true);
          if (data.message) setMessage(data.message);
        } else {
          setIsLocked(false);
        }
      } else {
        // If document doesn't exist, default to unlocked
        setIsLocked(false);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Subscription fetch error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFBF7' }}>
        <ActivityIndicator size="large" color="#C27803" />
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockTitle}>APP LOCKED</Text>
        <Text style={styles.lockMessage}>{message}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function Layout() {
  return (
    <SubscriptionGate>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Yakz Billing' }} />
        <Stack.Screen name="waiter" options={{ title: 'Waiter App' }} />
        <Stack.Screen name="cashier" options={{ title: 'Cashier Tab' }} />
      </Stack>
    </SubscriptionGate>
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  lockTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 20,
    letterSpacing: 2
  },
  lockMessage: {
    color: '#FEF2F2',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 26
  }
});
