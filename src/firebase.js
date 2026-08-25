import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6uwuyi-wwL-ZYlRqqP8z-oi2_M5la0nQ",
  authDomain: "bubududu-e2544.firebaseapp.com",
  projectId: "bubududu-e2544",
  storageBucket: "bubududu-e2544.firebasestorage.app",
  messagingSenderId: "371279654503",
  appId: "1:371279654503:web:a28f4b483c75971d74aec2",
  measurementId: "G-BWES8H1NYC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);