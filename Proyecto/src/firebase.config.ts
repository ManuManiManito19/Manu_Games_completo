import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCl9rozO-k1Uhftwi8mcJKU041S59X4uYQ",
  authDomain: "manugames-d4df7.firebaseapp.com",
  projectId: "manugames-d4df7",
  storageBucket: "manugames-d4df7.firebasestorage.app",
  messagingSenderId: "789901568489",
  appId: "1:789901568489:web:e3f8d59ba5430e21a08378",
  measurementId: "G-SEEMMB6S0K"
};

// Exportamos app y db
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);