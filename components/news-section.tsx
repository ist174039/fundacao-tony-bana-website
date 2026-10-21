"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, Newspaper } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Noticia } from "@/lib/firebase-firestore";
import { useSiteContent } from "@/components/site-content-provider";
import { SectionHeading } from "@/components/section-heading";

export default function NewsSection() {
  const { news: newsItems } = useSiteContent();
  const [selected, setSelected] = useState<Noticia | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (newsItems.length === 0) return null;

  return (
    <section
      id="noticias"
      className="site-section border-y border-border/70 bg-muted/40"
    >
      <div className="container">
        <SectionHeading
          eyebrow="Acompanhe o nosso trabalho"
          icon={<Newspaper className="h-4 w-4" aria-hidden="true" />}
          title={<>Notícias e <span className="text-primary">actividades</span></>}
          description="Histórias, iniciativas e conquistas recentes da Fundação."
          aside={newsItems.length > 3 ? (
            <Button variant="outline" onClick={() => setShowAll((value) => !value)} className="w-fit shrink-0 rounded-full px-5">
              {showAll ? "Mostrar menos" : "Ver todas as notícias"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}
        />

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(showAll ? newsItems : newsItems.slice(0, 3)).map((item, index) => (
            <motion.div
              key={item.id}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <Card className="site-card site-card-interactive group h-full overflow-hidden">
                <div className="relative h-52 overflow-hidden">
                  {item.imagem ? (
                    <Image
                      src={item.imagem}
                      alt={item.titulo}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
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
            <DialogDescription>Leia os detalhes da notícia e abra a publicação original, se disponível.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selected?.imagem && (
              <div className="w-full h-64 relative overflow-hidden">
                <Image
                  src={selected.imagem}
                  alt={selected.titulo}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
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
