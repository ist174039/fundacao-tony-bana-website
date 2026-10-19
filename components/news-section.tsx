"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, Newspaper } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCollection, COLLECTIONS, Noticia } from "@/lib/firebase-firestore";

export default function NewsSection() {
  const [newsItems, setNewsItems] = useState<Noticia[]>([]);
  const [selected, setSelected] = useState<Noticia | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCollection<Noticia>(COLLECTIONS.NOTICIAS)
      .then((items) => {
        if (!mounted) return;
        // sort by date or createdAt if available
        const sorted = items.sort((a: any, b: any) => {
          const da = new Date(a.data || a.createdAt?.toDate?.() || 0).getTime();
          const db = new Date(b.data || b.createdAt?.toDate?.() || 0).getTime();
          return db - da;
        });
        setNewsItems(sorted);
      })
      .catch((err) => console.error(err));
    return () => {
      mounted = false;
    };
  }, []);

  if (newsItems.length === 0) return null;

  return (
    <section
      id="noticias"
      className="border-y border-border/70 bg-muted/40 py-20"
    >
      <div className="container">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              <Newspaper className="h-4 w-4" /> Acompanhe o nosso trabalho
            </p>
            <h2 className="font-montserrat text-3xl font-bold text-balance md:text-4xl">
              Notícias e <span className="text-primary">actividades</span>
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Histórias, iniciativas e conquistas recentes da Fundação.
            </p>
          </div>
          {newsItems.length > 3 && (
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="shrink-0"
            >
              {showAll ? "Mostrar menos" : "Ver todas as notícias"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(showAll ? newsItems : newsItems.slice(0, 3)).map((item, index) => (
            <motion.div
              key={item.id}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <Card className="group h-full overflow-hidden rounded-2xl border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-52 overflow-hidden">
                  {item.imagem ? (
                    <img
                      src={item.imagem}
                      alt={item.titulo}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-primary/5 text-primary/50">
                      <Newspaper className="h-12 w-12" aria-hidden="true" />
                    </div>
                  )}
                  {item.imagem && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{item.data}</span>
                  </div>
                  <h3 className="mb-3 font-montserrat text-xl font-bold text-balance transition-colors group-hover:text-primary">
                    {item.titulo}
                  </h3>
                  <p className="mb-5 line-clamp-3 leading-relaxed text-muted-foreground text-pretty">
                    {item.descricao}
                  </p>
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
          ))}
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
                <img
                  src={selected.imagem}
                  alt={selected.titulo}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {selected?.data && (
              <div className="text-sm text-muted-foreground">
                {selected.data}
              </div>
            )}
            {selected?.descricao && (
              <div className="prose">{selected.descricao}</div>
            )}
            {selected?.link && (
              <div>
                <a
                  href={selected.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Abrir link da notícia
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
