"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  COLLECTIONS,
  getCollection,
  type CarrosselItem,
  type Membro,
  type Noticia,
  type Parceiro,
} from "@/lib/firebase-firestore"

interface SiteContent {
  members: Membro[]
  news: Noticia[]
  partners: Parceiro[]
  gallery: CarrosselItem[]
}

const SiteContentContext = createContext<SiteContent | null>(null)

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>({
    members: [],
    news: [],
    partners: [],
    gallery: [],
  })

  useEffect(() => {
    let active = true

    Promise.all([
      getCollection<Membro>(COLLECTIONS.MEMBROS).catch(() => []),
      getCollection<Noticia>(COLLECTIONS.NOTICIAS).catch(() => []),
      getCollection<Parceiro>(COLLECTIONS.PARCEIROS).catch(() => []),
      getCollection<CarrosselItem>(COLLECTIONS.CARROSSEL).catch(() => []),
    ]).then(([members, news, partners, gallery]) => {
      if (!active) return
      setContent({
        members,
        news: [...news].sort((a, b) => (b.data || "").localeCompare(a.data || "")),
        partners,
        gallery: [...gallery].sort((a, b) => (b.data || "").localeCompare(a.data || "")),
      })
    })

    return () => {
      active = false
    }
  }, [])

  return (
    <SiteContentContext.Provider value={content}>
      {children}
    </SiteContentContext.Provider>
  )
}

export function useSiteContent() {
  const content = useContext(SiteContentContext)
  if (!content) {
    throw new Error("useSiteContent must be used inside SiteContentProvider")
  }
  return content
}
