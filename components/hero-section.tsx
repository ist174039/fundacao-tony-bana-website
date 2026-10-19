"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="container py-20 md:py-32">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-balance font-montserrat"
          >
            Transformando comunidades através do <span className="text-primary">desporto</span>,{" "}
            <span className="text-primary">educação</span> e <span className="text-primary">saúde</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg text-muted-foreground text-pretty max-w-2xl"
          >
            Junte-se a nós para criar oportunidades sustentáveis e inclusivas.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button size="lg" className="group" asChild>
              <a href="#membros">
                Junte-se
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#pilares">Saiba mais</a>
            </Button>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative aspect-square lg:aspect-auto lg:h-[600px]"
        >
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/fundacao-tony-bana.firebasestorage.app/o/Imagem%20WhatsApp%202025-04-05%20%C3%A0s%2021.11.19_11243c0b.jpg?alt=media"
            alt="Fundação Tony Bana"
            fill
            className="object-cover rounded-lg shadow-2xl"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-lg" />
        </motion.div>
      </div>
    </section>
  )
}
