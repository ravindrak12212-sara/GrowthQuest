// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add your own Firebase configuration from your Firebase project console
const firebaseConfig = {
  apiKey: "AIzaSyBZurho7cvsc2JuKbiPYp5Zg-py39m9jK4",
  authDomain: "growth-quest-e79f3.firebaseapp.com",
  projectId: "growth-quest-e79f3",
  storageBucket: "growth-quest-e79f3.firebasestorage.app",
  messagingSenderId: "925577522690",
  appId: "1:925577522690:web:bffe9a0eafc3161c4b811b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
