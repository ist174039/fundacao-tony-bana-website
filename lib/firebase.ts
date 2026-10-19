import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

export const firebaseConfig = {
  apiKey: "AIzaSyBC2NH-qlzxxIjy6PY94JaZRh5d0jpZjbo",
  authDomain: "fundacao-tony-bana.firebaseapp.com",
  projectId: "fundacao-tony-bana",
  storageBucket: "fundacao-tony-bana.firebasestorage.app",
  messagingSenderId: "988372046789",
  appId: "1:988372046789:web:f1d03331fc5e2b409471ac",
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
