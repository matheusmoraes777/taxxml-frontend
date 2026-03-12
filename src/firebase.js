import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCTVrMKYJNrmSQAhrr6H8RY2kv8RR5Sp8g",
  authDomain: "taxxml-54453.firebaseapp.com",
  projectId: "taxxml-54453",
  storageBucket: "taxxml-54453.firebasestorage.app",
  messagingSenderId: "547191679553",
  appId: "1:547191679553:web:7202ce12b6bc8cddc8f4c0",
  measurementId: "G-NMGXH7MVQX"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa a Autenticação e o provedor do Google
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Função pronta para o botão de "Entrar com Google"
export const loginComGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Erro ao logar com Google:", error);
    return null;
  }
};

// Função para sair da conta
export const sairDaConta = async () => {
  await signOut(auth);
};