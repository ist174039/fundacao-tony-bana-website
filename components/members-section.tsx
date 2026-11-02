"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const filteredMembers = members.filter((member) =>
    `${member.nome} ${member.cargo} ${member.descricao}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const visibleMembers = showAll
    ? filteredMembers.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize)
    : members.slice(0, 3);

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

        {showAll && (
          <div className="mb-4 space-y-2">
            <div className="relative mx-auto max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Pesquisar por nome ou função"
                aria-label="Pesquisar membros da equipa"
                className="pl-9"
              />
            </div>
            <p className="text-center text-xs text-muted-foreground" aria-live="polite">
              {filteredMembers.length} {filteredMembers.length === 1 ? "membro encontrado" : "membros encontrados"}
            </p>
          </div>
        )}

        {showAll && filteredMembers.length === 0 && (
          <p className="mb-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Não foram encontrados membros com essa pesquisa.</p>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMembers.map((member, index) => (
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
        {showAll && (
          <div className="mt-6">
            {filteredMembers.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Não foram encontrados membros com essa pesquisa.</p>
            ) : (
              <nav aria-label="Paginação de membros" className="flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground" aria-live="polite">Página {Math.min(page, pageCount)} de {pageCount} · {filteredMembers.length} membros</span>
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} aria-label="Página seguinte">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
