"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCollection, COLLECTIONS, Membro } from "@/lib/firebase-firestore";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function MembersSection() {
  const [members, setMembers] = useState<Membro[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCollection<Membro>(COLLECTIONS.MEMBROS)
      .then((items) => {
        if (mounted) setMembers(items);
      })
      .catch((err) => console.error(err));
    return () => {
      mounted = false;
    };
  }, []);

  if (!members.length) return null;

  return (
    <section id="membros" className="py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <UsersRound className="h-4 w-4" aria-hidden="true" /> Quem faz
              acontecer
            </p>
            <h2 className="font-montserrat text-3xl font-bold tracking-tight text-balance md:text-5xl">
              Pessoas ao serviço{" "}
              <span className="text-primary">da comunidade</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Conheça os membros que dedicam o seu trabalho à missão da
              Fundação.
            </p>
          </div>
          {members.length > 3 && (
            <Button
              variant="outline"
              onClick={() => setShowAll((value) => !value)}
              className="group w-fit rounded-full px-5"
            >
              {showAll ? "Mostrar menos" : "Ver toda a equipa"}
              <ArrowRight
                className={`ml-2 h-4 w-4 transition-transform ${showAll ? "-rotate-90" : "group-hover:translate-x-1"}`}
              />
            </Button>
          )}
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(showAll ? members : members.slice(0, 3)).map((member, index) => (
            <motion.div
              key={member.id}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
            >
              <Card className="group h-full overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-0">
                  <div className="flex items-center gap-5 p-5 sm:p-6">
                    <div className="relative grid h-[5.5rem] w-[5.5rem] shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-xl font-bold text-primary ring-1 ring-primary/10">
                      {member.imagem ? (
                        <Image
                          src={member.imagem}
                          alt={member.nome}
                          fill
                          sizes="88px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span aria-label={`Iniciais de ${member.nome}`}>
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
