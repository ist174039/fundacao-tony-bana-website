"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  getCollection,
  COLLECTIONS,
  CarrosselItem,
} from "@/lib/firebase-firestore";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Images } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CarouselSection() {
  const [items, setItems] = useState<CarrosselItem[]>([]);
  const [selected, setSelected] = useState<CarrosselItem | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const galleries = [
    {
      id: "desporto",
      title: "Desporto",
      description: "Actividades desportivas e momentos de equipa.",
    },
    {
      id: "educacao",
      title: "Educação",
      description: "Iniciativas de aprendizagem e desenvolvimento.",
    },
    {
      id: "saude",
      title: "Saúde",
      description: "Acções de saúde e bem-estar comunitário.",
    },
    {
      id: "comunidade",
      title: "Comunidade",
      description: "Outros momentos e registos da Fundação.",
    },
  ] as const;

  useEffect(() => {
    let mounted = true;
    getCollection<CarrosselItem>(COLLECTIONS.CARROSSEL)
      .then((data) => {
        if (!mounted) return;
        // sort by date desc if available
        const sorted = data.sort((a, b) =>
          (b.data || "").localeCompare(a.data || ""),
        );
        setItems(sorted);
      })
      .catch((err) => console.error(err));
    return () => {
      mounted = false;
    };
  }, []);

  const populatedGalleries = galleries
    .map((gallery) => ({
      ...gallery,
      items: items.filter(
        (item) => (item.categoria || "comunidade") === gallery.id,
      ),
    }))
    .filter((gallery) => gallery.items.length > 0);

  if (items.length === 0) return null;

  return (
    <section
      id="carrossel"
      className="border-y border-border/70 bg-muted/40 py-20"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              <Images className="h-4 w-4" /> Momentos da comunidade
            </p>
            <h2 className="font-montserrat text-3xl font-bold text-balance md:text-4xl">
              Galeria de <span className="text-primary">fotografias</span>
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Registos das actividades e dos encontros da Fundação.
            </p>
          </div>
        </motion.div>
        <div className="space-y-12">
          {populatedGalleries.map((gallery) => {
            const galleryItems = gallery.items;
            const expanded = expandedCategories.includes(gallery.id);
            const visibleItems = expanded
              ? galleryItems
              : galleryItems.slice(0, 3);
            return (
              <section
                key={gallery.id}
                aria-labelledby={`gallery-${gallery.id}`}
              >
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3
                      id={`gallery-${gallery.id}`}
                      className="font-montserrat text-2xl font-bold"
                    >
                      {gallery.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {gallery.description}
                    </p>
                  </div>
                  {galleryItems.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedCategories((current) =>
                          expanded
                            ? current.filter((id) => id !== gallery.id)
                            : [...current, gallery.id],
                        )
                      }
                    >
                      {expanded
                        ? "Mostrar menos"
                        : `Ver todas (${galleryItems.length})`}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleItems.map((it, index) => (
                    <motion.button
                      key={it.id}
                      className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => setSelected(it)}
                      whileHover={{ y: -3 }}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: (index % 3) * 0.07 }}
                    >
                      {it.imagem ? (
                        <Image
                          src={it.imagem}
                          alt={
                            it.titulo ||
                            `Fotografia da galeria ${gallery.title}`
                          }
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          Sem imagem
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        {it.data && (
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/75">
                            {it.data}
                          </p>
                        )}
                        <p className="font-montserrat text-lg font-semibold">
                          {it.titulo || "Momento da Fundação"}
                        </p>
                        <span className="mt-2 inline-flex items-center text-sm font-medium text-white/90">
                          Ver fotografia{" "}
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected?.titulo || "Foto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selected?.imagem && (
                <div className="w-full h-96 relative">
                  <Image
                    src={selected.imagem}
                    alt={selected.titulo || "foto"}
                    fill
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
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
