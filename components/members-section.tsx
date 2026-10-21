"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Membro } from "@/lib/firebase-firestore";
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

export default function MembersSection() {
  const { members } = useSiteContent();
  const [showAll, setShowAll] = useState(false);

  if (!members.length) return null;

  return (
    <section id="membros" className="site-section">
      <div className="container">
        <SectionHeading
          eyebrow="Quem faz acontecer"
          icon={<UsersRound className="h-4 w-4" aria-hidden="true" />}
          title={<>Pessoas ao serviço <span className="text-primary">da comunidade</span></>}
          description="Conheça os membros que dedicam o seu trabalho à missão da Fundação."
          aside={members.length > 3 ? (
            <Button
              variant="outline"
              onClick={() => setShowAll((value) => !value)}
              className="group w-fit rounded-full px-5"
            >
              {showAll ? "Mostrar menos" : "Ver toda a equipa"}
              <ArrowRight className={`ml-2 h-4 w-4 transition-transform ${showAll ? "-rotate-90" : "group-hover:translate-x-1"}`} />
            </Button>
          ) : null}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(showAll ? members : members.slice(0, 3)).map((member, index) => (
            <motion.div
              key={member.id}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
            >
              <Card className="site-card site-card-interactive group h-full overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-5 p-5 sm:p-6">
                    <div className="relative grid h-[5.5rem] w-[5.5rem] shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-xl font-bold text-primary ring-1 ring-primary/10">
                      {member.imagem ? (
                        <Image
                          src={member.imagem}
                          alt=""
                          fill
                          sizes="88px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span aria-hidden="true">
                          {initials(member.nome)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 py-1">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Membro da Fundação
                      </p>
                      <h3 className="font-montserrat text-lg font-bold leading-snug text-foreground sm:text-xl">
                        {member.nome}
                      </h3>
                      {member.cargo && (
                        <p className="mt-1.5 text-sm font-semibold text-primary">
                          {member.cargo}
                        </p>
                      )}
                    </div>
                  </div>
                  {member.descricao && (
                    <p className="border-t border-border/60 px-5 py-4 text-sm leading-6 text-muted-foreground sm:px-6">
                      {member.descricao}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
