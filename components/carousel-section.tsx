"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { getCollection, COLLECTIONS, CarrosselItem } from "@/lib/firebase-firestore"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function CarouselSection() {
  const [items, setItems] = useState<CarrosselItem[]>([])
  const [selected, setSelected] = useState<CarrosselItem | null>(null)

  useEffect(() => {
    let mounted = true
    getCollection<CarrosselItem>(COLLECTIONS.CARROSSEL)
      .then((data) => {
        if (!mounted) return
        // sort by date desc if available
        const sorted = data.sort((a, b) => (b.data || "").localeCompare(a.data || ""))
        setItems(sorted)
      })
      .catch((err) => console.error(err))
    return () => {
      mounted = false
    }
  }, [])

  if (items.length === 0) return null

  return (
    <section id="carrossel" className="py-16">
      <div className="container">
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold mb-4 text-balance">
            Galeria <span className="text-primary">De Fotos</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Veja momentos especiais capturados em nossas atividades e eventos
          </p>
        </motion.div>
        <div className="relative">
          <div className="flex gap-6 overflow-x-auto no-scrollbar py-6">
            {items.map((it) => (
              <motion.button
                key={it.id}
                className="flex-shrink-0 w-96 h-60 rounded-lg bg-gray-50 overflow-hidden border"
                onClick={() => setSelected(it)}
                whileHover={{ scale: 1.02 }}
              >
                {it.imagem ? (
                  <Image src={it.imagem} alt={it.titulo || "foto"} width={1200} height={700} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Sem imagem</div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected?.titulo || "Foto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selected?.imagem && (
                <div className="w-full h-96 relative">
                  <Image src={selected.imagem} alt={selected.titulo || "foto"} fill className="object-contain" />
                </div>
              )}
              {selected?.data && <div className="text-sm text-muted-foreground">{selected.data}</div>}
              {selected?.descricao && <div className="prose">{selected.descricao}</div>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
