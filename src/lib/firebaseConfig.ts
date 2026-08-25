import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-dummy-key-for-yakz-cafe",
  authDomain: "yakz-cafe.firebaseapp.com",
  projectId: "yakz-cafe",
  storageBucket: "yakz-cafe.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
