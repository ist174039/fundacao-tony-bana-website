"use client"

import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "./firebase"

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    }
  } catch (error: any) {
    console.error("Error signing in:", error)
    throw new Error(error.message || "Erro ao fazer login")
  }
}

export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth)
  } catch (error: any) {
    console.error("Error signing out:", error)
    throw new Error(error.message || "Erro ao fazer logout")
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      unsubscribe()
      if (user) {
        resolve({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        })
      } else {
        resolve(null)
      }
    })
  })
}

export function onAuthChange(callback: (user: AuthUser | null) => void) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      })
    } else {
      callback(null)
    }
  })
}
