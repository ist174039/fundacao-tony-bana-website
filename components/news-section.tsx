"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCollection, COLLECTIONS, Noticia } from "@/lib/firebase-firestore"

export default function NewsSection() {
  const [newsItems, setNewsItems] = useState<Noticia[]>([])
  const [selected, setSelected] = useState<Noticia | null>(null)

  useEffect(() => {
    let mounted = true
    getCollection<Noticia>(COLLECTIONS.NOTICIAS)
      .then((items) => {
        if (!mounted) return
        // sort by date or createdAt if available
        const sorted = items.sort((a: any, b: any) => {
          const da = new Date(a.data || a.createdAt?.toDate?.() || 0).getTime()
          const db = new Date(b.data || b.createdAt?.toDate?.() || 0).getTime()
          return db - da
        })
        setNewsItems(sorted)
      })
      .catch((err) => console.error(err))
    return () => {
      mounted = false
    }
  }, [])

  if (newsItems.length === 0) return null

  return (
    <section id="noticias" className="py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold mb-4 text-balance">
            Últimas <span className="text-primary">Notícias</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Fique por dentro das nossas atividades e conquistas recentes
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {newsItems.length === 0 ? (
            <div className="text-center text-muted-foreground col-span-full py-12">Nenhuma notícia publicada ainda.</div>
          ) : (
            newsItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={item.imagem || "/placeholder.svg"}
                      alt={item.titulo}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="h-4 w-4" />
                      <span>{item.data}</span>
                    </div>
                    <h3 className="font-montserrat text-xl font-bold mb-3 text-balance group-hover:text-primary transition-colors">
                      {item.titulo}
                    </h3>
                    <p className="text-muted-foreground mb-4 leading-relaxed text-pretty">{item.descricao}</p>
                    <Button
                      variant="ghost"
                      className="group/btn p-0 h-auto font-semibold"
                      onClick={() => setSelected(item)}
                    >
                      Ler mais
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selected?.imagem && (
              <div className="w-full h-64 relative overflow-hidden">
                <img src={selected.imagem} alt={selected.titulo} className="w-full h-full object-contain" />
              </div>
            )}
            {selected?.data && <div className="text-sm text-muted-foreground">{selected.data}</div>}
            {selected?.descricao && <div className="prose">{selected.descricao}</div>}
            {selected?.link && (
              <div>
                <a href={selected.link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Abrir link da notícia
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
