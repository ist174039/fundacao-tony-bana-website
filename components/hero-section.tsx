"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react"

const focusAreas = ["Desporto", "Educação", "Saúde"]

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/5">
      <div aria-hidden="true" className="site-grid pointer-events-none absolute inset-0 -z-10 opacity-70" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 -z-10 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />

      <div className="container grid min-h-[680px] items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative z-10"
        >
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-foreground/75">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
            <span className="mono-label !text-[0.62rem] !tracking-[0.16em]">Fundação Tony Bana · comunidade</span>
          </div>

          <h1 className="max-w-3xl font-montserrat text-[clamp(2.7rem,6.5vw,5.8rem)] font-bold leading-[0.98] tracking-[-0.055em] text-balance">
            Oportunidades que <span className="text-primary">transformam</span> comunidades.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
            Promovemos uma vida mais inclusiva e com mais oportunidades através do desporto, da educação e da saúde.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="group h-12 rounded-full px-6" asChild>
              <a href="#pilares">Conheça o nosso trabalho <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></a>
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.03] px-6 hover:bg-white/[0.08]" asChild>
              <a href="#contato">Junte-se à Fundação</a>
            </Button>
          </div>

          <div className="mt-12 border-t border-white/10 pt-6">
            <p className="mono-label mb-4 text-muted-foreground">Áreas de atuação</p>
            <div className="flex flex-wrap gap-2">
              {focusAreas.map((area, index) => (
                <span key={area} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-foreground/80">
                  <span className="font-mono text-xs text-accent">0{index + 1}</span>{area}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative mx-auto w-full max-w-[620px] lg:ml-auto"
        >
          <div aria-hidden="true" className="absolute -inset-3 rounded-[2rem] border border-white/10" />
          <div className="group relative aspect-[4/4.6] overflow-hidden rounded-[1.65rem] border border-white/10 bg-secondary shadow-2xl shadow-black/40 sm:aspect-[5/4.6]">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/fundacao-tony-bana.firebasestorage.app/o/Imagem%20WhatsApp%202025-04-05%20%C3%A0s%2021.11.19_11243c0b.jpg?alt=media"
              alt="Actividade da Fundação Tony Bana com a comunidade"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <div className="surface-panel flex items-end justify-between gap-5 p-5 sm:p-6">
                <div>
                  <p className="mono-label mb-2 text-accent">Missão em movimento</p>
                  <p className="max-w-xs font-montserrat text-lg font-semibold leading-snug text-white sm:text-xl">Criar oportunidades sustentáveis e inclusivas.</p>
                </div>
                <a href="#missao" aria-label="Saiba mais sobre a missão" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-primary">
                  <ArrowDown className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-2 text-xs text-white backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Inclusão e desenvolvimento
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
