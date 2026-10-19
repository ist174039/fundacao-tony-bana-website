"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CarrosselItem,
  COLLECTIONS,
  getCollection,
} from "@/lib/firebase-firestore";

const galleries = [
  { id: "desporto", title: "Desporto" },
  { id: "educacao", title: "Educação" },
  { id: "saude", title: "Saúde" },
  { id: "comunidade", title: "Comunidade" },
] as const;

export default function CarouselSection() {
  const [items, setItems] = useState<CarrosselItem[]>([]);
  const [selected, setSelected] = useState<CarrosselItem | null>(null);
  const [category, setCategory] = useState<string>("todas");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCollection<CarrosselItem>(COLLECTIONS.CARROSSEL)
      .then((data) => {
        if (!mounted) return;
        setItems(
          data.sort((a, b) => (b.data || "").localeCompare(a.data || "")),
        );
      })
      .catch((error) => console.error(error));
    return () => {
      mounted = false;
    };
  }, []);

  const availableGalleries = useMemo(
    () =>
      galleries.filter((gallery) =>
        items.some((item) => (item.categoria || "comunidade") === gallery.id),
      ),
    [items],
  );

  const filteredItems = useMemo(
    () =>
      category === "todas"
        ? items
        : items.filter((item) => (item.categoria || "comunidade") === category),
    [category, items],
  );

  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, 6);
  const selectedIndex = selected
    ? filteredItems.findIndex((item) => item.id === selected.id)
    : -1;

  const movePhoto = (direction: -1 | 1) => {
    if (selectedIndex < 0 || filteredItems.length < 2) return;
    const nextIndex =
      (selectedIndex + direction + filteredItems.length) % filteredItems.length;
    setSelected(filteredItems[nextIndex]);
  };

  useEffect(() => {
    if (!selected || filteredItems.length < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") movePhoto(-1);
      if (event.key === "ArrowRight") movePhoto(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, selectedIndex, filteredItems]);

  if (items.length === 0) return null;

  return (
    <section
      id="carrossel"
      className="border-y border-border bg-white/70 py-16 md:py-24"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Images className="h-4 w-4" aria-hidden="true" /> Vida da Fundação
            </p>
            <h2 className="font-montserrat text-3xl font-bold tracking-tight text-balance md:text-5xl">
              Histórias em <span className="text-primary">imagens</span>
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
              Momentos das atividades e das pessoas que fazem parte da nossa
              comunidade.
            </p>
          </div>
          {filteredItems.length > 6 && (
            <Button
              variant="outline"
              className="w-fit shrink-0 rounded-full px-5"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll
                ? "Mostrar menos"
                : `Ver todas (${filteredItems.length})`}
            </Button>
          )}
        </motion.div>

        <div
          className="mb-7 flex flex-wrap gap-2"
          aria-label="Filtrar galeria por tema"
        >
          <button
            type="button"
            onClick={() => {
              setCategory("todas");
              setShowAll(false);
            }}
            aria-pressed={category === "todas"}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${category === "todas" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
          >
            Todas as fotografias
          </button>
          {availableGalleries.map((gallery) => (
            <button
              key={gallery.id}
              type="button"
              onClick={() => {
                setCategory(gallery.id);
                setShowAll(false);
              }}
              aria-pressed={category === gallery.id}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${category === gallery.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
            >
              {gallery.title}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item, index) => {
            const title = item.titulo || "Momento da Fundação";
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (index % 3) * 0.06 }}
                className={`group relative min-h-64 overflow-hidden rounded-2xl border border-border/70 bg-secondary text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${index === 0 ? "sm:col-span-2 sm:row-span-2 sm:min-h-[32rem]" : "min-h-64"}`}
              >
                {item.imagem ? (
                  <Image
                    src={item.imagem}
                    alt={title}
                    fill
                    sizes={
                      index === 0
                        ? "(max-width: 640px) 100vw, 66vw"
                        : "(max-width: 640px) 100vw, 33vw"
                    }
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-primary/5 text-primary/50">
                    <Images className="h-10 w-10" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  {item.data && (
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/75">
                      {item.data}
                    </p>
                  )}
                  <p className="font-montserrat text-lg font-semibold leading-snug sm:text-xl">
                    {title}
                  </p>
                  <span className="mt-3 inline-flex items-center text-sm font-medium text-white/90">
                    Ver fotografia{" "}
                    <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-h-[94vh] max-w-6xl gap-0 overflow-hidden rounded-3xl border-0 bg-[#171614] p-0 text-white shadow-2xl sm:w-[calc(100%-3rem)]">
          <DialogHeader className="flex-row items-center justify-between gap-4 px-5 pb-4 pt-5 pr-14 text-left sm:px-7 sm:pt-6">
            <div className="min-w-0">
              <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/55">
                {galleries.find(
                  (gallery) =>
                    gallery.id === (selected?.categoria || "comunidade"),
                )?.title || "Fundação Tony Bana"}
              </p>
              <DialogTitle className="truncate text-lg font-semibold text-white sm:text-xl">
                {selected?.titulo || "Momento da Fundação"}
              </DialogTitle>
            </div>
            {selectedIndex >= 0 && (
              <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/65">
                {String(selectedIndex + 1).padStart(2, "0")} /{" "}
                {String(filteredItems.length).padStart(2, "0")}
              </span>
            )}
          </DialogHeader>

          <div className="relative mx-3 overflow-hidden rounded-2xl bg-black sm:mx-5">
            <div className="relative aspect-[4/3] max-h-[68vh] min-h-56 w-full sm:aspect-[16/10]">
              {selected?.imagem && (
                <Image
                  key={selected.id}
                  src={selected.imagem}
                  alt={selected.titulo || "Fotografia da Fundação"}
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 90vw"
                />
              )}
            </div>
            {filteredItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => movePhoto(-1)}
                  aria-label="Fotografia anterior"
                  className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-5 sm:h-12 sm:w-12"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => movePhoto(1)}
                  aria-label="Fotografia seguinte"
                  className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5 sm:h-12 sm:w-12"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 px-5 pb-5 pt-4 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:pb-6">
            <div className="min-w-0">
              {selected?.descricao && (
                <p className="max-w-3xl text-sm leading-6 text-white/70">
                  {selected.descricao}
                </p>
              )}
              {selected?.data && (
                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-white/45">
                  {selected.data}
                </p>
              )}
            </div>
            {filteredItems.length > 1 && (
              <p className="shrink-0 text-xs text-white/45">
                Usa as setas do teclado para navegar
              </p>
            )}
          </div>
          {filteredItems.length > 1 && selectedIndex >= 0 && (
            <div className="h-1 w-full bg-white/10">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((selectedIndex + 1) / filteredItems.length) * 100}%`,
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
