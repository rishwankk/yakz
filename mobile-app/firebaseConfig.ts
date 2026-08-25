import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// TODO: Replace with your Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCClg_shaOxVXq3GZHsfLXUogax0SDq2I8",
  authDomain: "yakz-cafe.firebaseapp.com",
  projectId: "yakz-cafe",
  storageBucket: "yakz-cafe.firebasestorage.app",
  messagingSenderId: "1016345426177",
  appId: "1:1016345426177:web:815c72452a06c6d5f3c300",
  measurementId: "G-PNLNHXY5XH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
