import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAHT4Mog8ZhLuDxBxDOlUwpjwblaE34Kvo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chatbot-e01fa.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chatbot-e01fa',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'chatbot-e01fa.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '742424129257',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:742424129257:web:42618aaf9fd2e96c7d4a78',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-PC5G9LJGFX',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider, db };
