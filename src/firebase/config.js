import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de la aplicación web GoldenTicket.
// Estos datos identifican la aplicación Firebase; no son contraseñas de usuarios.
const firebaseConfig = {
  apiKey: "AIzaSyDvXZwDj2rQCD70TJKOa9p3QdHS_G3Uzj0",
  authDomain: "goldenticket-61b02.firebaseapp.com",
  projectId: "goldenticket-61b02",
  storageBucket: "goldenticket-61b02.firebasestorage.app",
  messagingSenderId: "1047023407897",
  appId: "1:1047023407897:web:7cbc9fc42ab9bc54346b88",
  measurementId: "G-YF8L90Q1JV",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
