"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Handshake } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { getCollection, COLLECTIONS, Parceiro } from "@/lib/firebase-firestore";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function PartnersSection() {
  const [partners, setPartners] = useState<Parceiro[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCollection<Parceiro>(COLLECTIONS.PARCEIROS)
      .then((items) => {
        if (mounted) setPartners(items);
      })
      .catch((err) => console.error(err));
    return () => {
      mounted = false;
    };
  }, []);

  if (!partners.length) return null;

  return (
    <section
      id="parceiros"
      className="border-y border-border/60 bg-muted/30 py-20 md:py-28"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex max-w-3xl flex-col gap-5 md:mb-12 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Handshake className="h-4 w-4" aria-hidden="true" /> Juntos
              fazemos mais
            </p>
            <h2 className="font-montserrat text-3xl font-bold tracking-tight text-balance md:text-5xl">
              Parceiros que{" "}
              <span className="text-primary">fortalecem a missão</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Organizações que apoiam a missão da Fundação.
            </p>
          </div>
          {partners.length > 3 && (
            <Button
              variant="outline"
              className="w-fit shrink-0 rounded-full px-5"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? "Mostrar menos" : "Ver mais parceiros"}
            </Button>
          )}
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(showAll ? partners : partners.slice(0, 3)).map((partner, index) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
            >
              <Card className="group h-full overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="flex h-full flex-col p-5 sm:p-6">
                  <div className="mb-5 flex min-h-[9rem] items-center justify-center rounded-2xl border border-border/60 bg-background p-6">
                    {partner.logo ? (
                      <Image
                        src={partner.logo}
                        alt={`Logótipo de ${partner.nome}`}
                        width={320}
                        height={160}
                        className="max-h-24 w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div
                        className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-lg font-bold text-primary ring-1 ring-primary/10"
                        aria-label={`Iniciais de ${partner.nome}`}
                      >
                        {initials(partner.nome)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h3 className="font-montserrat text-xl font-bold leading-snug text-foreground">
                      {partner.nome}
                    </h3>
                    {partner.descricao && (
                      <p className="mt-3 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">
                        {partner.descricao}
                      </p>
                    )}
                    {partner.website && (
                      <Button
                        variant="outline"
                        className="group/link mt-5 w-fit rounded-full px-4"
                        asChild
                      >
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visitar website
                          <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
