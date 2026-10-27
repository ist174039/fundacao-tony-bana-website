"use client"

import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import { areaFetch } from "./area-client"

export interface Evento {
  id: string
  nome: string
  tipo: string
  data: string
  descricao: string
  parceiros?: string[]
  flags?: string[]
  destaque: boolean
  imagem?: string
  galeria?: {
    imagens?: string[]
    videos?: string[]
  }
}

export interface Programa {
  id: string
  nome: string
  descricao: string
  data_inicio: string
  data_fim: string
  patrocinadores?: string[]
}

export interface AgendaItem {
  id: string
  nome: string
  tipo: string
  flag?: string
  descricao: string
  data_inicio: string
  data_fim: string
  parceiros?: string[]
  inscricao?: string
  destaque: boolean
  galeria?: {
    imagens?: string[]
    videos?: string[]
  }
}

export interface Noticia {
  id: string
  titulo: string
  data: string
  descricao: string
  link: string
  imagem?: string
  destaque: boolean
}

export interface Membro {
  id: string
  nome: string
  cargo: string
  descricao: string
  imagem?: string
}

export interface Parceiro {
  id: string
  nome: string
  descricao: string
  website?: string
  logo?: string
}

export interface CarrosselItem {
  id: string
  titulo?: string
  descricao?: string
  data?: string
  imagem?: string
  categoria?: "desporto" | "educacao" | "saude" | "comunidade"
}

export interface Socio {
  id: string
  uid?: string
  nome: string
  email: string
  telefone?: string
  numeroSocio?: string
  estado: "ativo" | "inativo"
  dataAdesao: string
  observacoes?: string
}

export const COLLECTIONS = {
  EVENTOS: "eventos",
  PROGRAMAS: "programas",
  AGENDA: "agenda",
  NOTICIAS: "noticias",
  MEMBROS: "membros",
  PARCEIROS: "parceiros",
  CARROSSEL: "carrossel",
  SOCIOS: "socios",
}

// Remove undefined, functions and File objects from payloads before sending to Firestore
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "function") return undefined
  if (obj instanceof File) return undefined
  if (Array.isArray(obj)) {
    return obj
      .map((v) => sanitizeForFirestore(v))
      .filter((v) => v !== undefined)
  }
  if (typeof obj === "object") {
    const out: any = {}
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue
      const cleaned = sanitizeForFirestore(v)
      if (cleaned !== undefined) out[k] = cleaned
    }
    return out
  }
  return obj
}

// Return list of problematic paths that are not serializable to Firestore (functions, File, Symbol, BigInt)
function findNonSerializableFields(obj: any, basePath = ""): string[] {
  const problems: string[] = []
  if (obj === null || obj === undefined) return problems
  if (typeof obj === "function") return [basePath || "<root>"]
  if (obj instanceof File) return [basePath || "<root>"]
  if (typeof obj === "symbol" || typeof obj === "bigint") return [basePath || "<root>"]
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      problems.push(...findNonSerializableFields(v, `${basePath}[${i}]`))
    })
    return problems
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue
      if (typeof v === "function" || v instanceof File || typeof v === "symbol" || typeof v === "bigint") {
        problems.push(basePath ? `${basePath}.${k}` : k)
        continue
      }
      problems.push(...findNonSerializableFields(v, basePath ? `${basePath}.${k}` : k))
    }
  }
  return problems
}

// Get all documents from a collection
export async function getCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const q = query(collection(db, collectionName))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[]
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error)
    throw error
  }
}

// Get a single document
export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T
    }
    return null
  } catch (error) {
    console.error(`Error getting document ${id} from ${collectionName}:`, error)
    throw error
  }
}

// Add a new document
// All public-site content mutations now go through the authorised, transactional
// server endpoint. Direct Firestore client writes would bypass the audit trail.
export async function addDocument<T>(collectionName:string,data:Partial<T>):Promise<string>{
 const payload=sanitizeForFirestore(data)
 const result=await areaFetch<{id:string}>('/api/area/site-content',{method:'POST',body:JSON.stringify({collectionName,data:payload})})
 return result.id
}
export async function updateDocument<T>(collectionName:string,id:string,data:Partial<T>):Promise<void>{
 const payload=sanitizeForFirestore(data)
 await areaFetch('/api/area/site-content',{method:'PATCH',body:JSON.stringify({collectionName,id,data:payload})})
}
export async function deleteDocument(collectionName:string,id:string):Promise<void>{
 await areaFetch('/api/area/site-content',{method:'DELETE',body:JSON.stringify({collectionName,id})})
}

// Media mutations are authenticated server operations with durable audit intent
// and completion events; a direct client Storage write would bypass this trail.
export async function uploadImage(file: File, path: string): Promise<string> {
 const folder=path.split('/')[0]
 const form=new FormData()
 form.append('file',file)
 form.append('folder',folder)
 const response=await areaFetch<{url:string}>('/api/area/site-content/media',{method:'POST',body:form})
 return response.url
}
export async function deleteImage(path: string): Promise<void> {
 await areaFetch('/api/area/site-content/media',{method:'DELETE',body:JSON.stringify({path})})
}
