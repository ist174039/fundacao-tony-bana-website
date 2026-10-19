"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export default function MissionSection() {
  return (
    <section
      id="missao"
      className="relative overflow-hidden border-y border-border bg-muted/50 py-20 md:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-[100px]"
      />
      <div className="container relative">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 max-w-3xl"
        >
          <p className="mono-label mb-4 text-accent">01 / A Fundação</p>
          <h2 className="mb-4 font-montserrat text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            A nossa missão é abrir{" "}
            <span className="text-primary">caminhos.</span>
          </h2>
          <p className="max-w-2xl text-lg leading-7 text-muted-foreground">
            Melhorar a qualidade de vida nas comunidades, com foco em educação,
            saúde e desporto.
          </p>
        </motion.div>
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-start justify-center"
          >
            <p className="max-w-xl text-lg leading-8 text-foreground/85">
              Melhorar a qualidade de vida nas comunidades, proporcionando apoio
              e oportunidades na educação, saúde, desporto e serviços
              comunitários. Estamos empenhados em promover a inclusão, o
              empoderamento e o desenvolvimento sustentável para criar mudanças
              positivas duradouras.
            </p>
            <a
              href="#pilares"
              className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-foreground"
            >
              Conheça as áreas de atuação{" "}
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </motion.div>
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="group relative aspect-video lg:aspect-[1.15]"
          >
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/fundacao-tony-bana.firebasestorage.app/o/Imagem%20WhatsApp%202025-04-05%20%C3%A0s%2020.52.26_4c1ed23d.jpg?alt=media&token=a981c4d7-1b24-496c-8204-0ad21f370b03"
              alt="Missão"
              fill
              className="rounded-2xl border border-border object-cover shadow-2xl shadow-foreground/15 transition duration-700 group-hover:scale-[1.01]"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-sm text-white backdrop-blur-md sm:bottom-6 sm:left-6">
              <span className="mono-label block text-accent">Compromisso</span>
              <span className="mt-1 block font-medium">
                Inclusão · empoderamento · desenvolvimento
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
