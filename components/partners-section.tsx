"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ChevronDown, Handshake } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Parceiro } from "@/lib/firebase-firestore";
import { useSiteContent } from "@/components/site-content-provider";
import { SectionHeading } from "@/components/section-heading";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function PartnersSection() {
  const { partners } = useSiteContent();
  const [showAll, setShowAll] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<string[]>(
    [],
  );

  if (!partners.length) return null;

  return (
    <section
      id="parceiros"
      className="site-section border-y border-border/60 bg-muted/30"
    >
      <div className="container">
        <SectionHeading
          eyebrow="Juntos fazemos mais"
          icon={<Handshake className="h-4 w-4" aria-hidden="true" />}
          title={<>Parceiros que <span className="text-primary">fortalecem a missão</span></>}
          description="Organizações que apoiam a missão da Fundação."
          aside={partners.length > 3 ? (
            <Button variant="outline" className="w-fit shrink-0 rounded-full px-5" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Mostrar menos" : `Ver todos os parceiros (${partners.length})`}
            </Button>
          ) : null}
        />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(showAll ? partners : partners.slice(0, 3)).map((partner, index) => (
            <motion.div
              key={partner.id}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
            >
              <Card className="site-card site-card-interactive group h-full overflow-hidden">
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
                        aria-hidden="true"
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
                      <>
                        <p
                          className={`mt-3 flex-1 text-sm leading-6 text-muted-foreground ${expandedDescriptions.includes(partner.id) ? "" : "line-clamp-2"}`}
                        >
                          {partner.descricao}
                        </p>
                        {partner.descricao.length > 110 && (
                          <button
                            type="button"
                            className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-expanded={expandedDescriptions.includes(
                              partner.id,
                            )}
                            onClick={() =>
                              setExpandedDescriptions((current) =>
                                current.includes(partner.id)
                                  ? current.filter((id) => id !== partner.id)
                                  : [...current, partner.id],
                              )
                            }
                          >
                            {expandedDescriptions.includes(partner.id)
                              ? "Ver menos"
                              : "Ver mais"}
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${expandedDescriptions.includes(partner.id) ? "rotate-180" : ""}`}
                            />
                          </button>
                        )}
                      </>
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
