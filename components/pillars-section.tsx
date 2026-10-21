"use client";

import { motion } from "framer-motion";
import { BookOpen, Heart, Sparkles, Trophy, Users } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";

const pillars = [
  {
    icon: Trophy,
    title: "Desporto",
    description:
      "Utilizar o desporto como uma ferramenta para a inclusão, o trabalho em equipa e o desenvolvimento pessoal, garantindo que todos, incluindo os que têm deficiência, possam participar.",
  },
  {
    icon: Heart,
    title: "Saúde",
    description:
      "Melhorar a saúde da comunidade através de programas de sensibilização, assistência médica e apoio a pessoas com deficiência.",
  },
  {
    icon: Users,
    title: "Capacitar",
    description:
      "Oferecer formação vocacional, apoio ao empreendedorismo e iniciativas de desenvolvimento comunitário para promover a autossuficiência.",
  },
  {
    icon: BookOpen,
    title: "Educação",
    description:
      "Apoiar o acesso a uma educação de qualidade através da construção de bibliotecas, salas de estudo e do fornecimento de materiais de aprendizagem.",
  },
  {
    icon: Sparkles,
    title: "Inclusão",
    description:
      "Criar espaços e programas que abracem a diversidade e garantam a igualdade de oportunidades para todos.",
  },
];

export default function PillarsSection() {
  return (
    <section id="pilares" className="site-section relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 top-12 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="container relative">
        <SectionHeading
          eyebrow="02 / Como trabalhamos"
          title={<>Um trabalho com <span className="text-primary">várias frentes.</span></>}
          aside={
            <p className="max-w-sm text-base leading-7 text-muted-foreground md:text-right">
            Cada área abre um caminho. Juntas, criam mais oportunidades para
            todos.
            </p>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:auto-rows-[minmax(220px,auto)]">
          {pillars.map((pillar, index) => {
            const featured = index === 0;
            const Icon = pillar.icon;
            return (
              <motion.article
                key={pillar.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: (index % 3) * 0.06 }}
                whileHover={{ y: -5 }}
                className={`group relative isolate flex min-h-[260px] flex-col overflow-hidden rounded-2xl border p-6 shadow-sm transition-[border-color,box-shadow] duration-300 md:p-8 ${featured ? "border-primary bg-primary text-primary-foreground shadow-primary/15 lg:col-span-3 lg:row-span-2" : "border-border/80 bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 lg:col-span-3"}`}
              >
                {featured && (
                  <div
                    aria-hidden="true"
                    className="absolute -right-10 -top-12 -z-10 h-56 w-56 rounded-full border-[28px] border-white/10 transition-transform duration-700 group-hover:scale-110"
                  />
                )}
                <div className="flex items-start justify-between">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl transition duration-300 group-hover:rotate-[-8deg] group-hover:scale-110 ${featured ? "bg-white/15 text-white" : "bg-primary/10 text-primary"}`}
                  >
                    <Icon
                      className="h-6 w-6"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </div>
                  <span
                    className={`font-mono text-sm tracking-widest ${featured ? "text-white/45" : "text-muted-foreground/60"}`}
                  >
                    0{index + 1}
                  </span>
                </div>
                <div className="mt-auto pt-10">
                  <h3
                    className={`font-montserrat text-2xl font-bold tracking-tight ${featured ? "text-white md:text-3xl" : "text-foreground group-hover:text-primary"}`}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    className={`mt-3 max-w-xl text-sm leading-6 ${featured ? "text-white/80 md:text-base md:leading-7" : "text-muted-foreground"}`}
                  >
                    {pillar.description}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className={`absolute bottom-8 right-8 h-[2px] w-9 rounded-full transition-[width] duration-300 group-hover:w-16 ${featured ? "bg-white/45" : "bg-primary/35"}`}
                />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
