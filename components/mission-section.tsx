"use client"

import Image from "next/image"
import { motion } from "framer-motion"

export default function MissionSection() {
  return (
    <section id="missao" className="py-20 bg-muted/50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-montserrat mb-4">
            Sobre <span className="text-primary">nós</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Melhorar a qualidade de vida nas comunidades, com foco em educação, saúde e desporto.
          </p>
        </motion.div>
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-4 text-lg leading-relaxed"
          >
            <p>
              Melhorar a qualidade de vida nas comunidades, proporcionando apoio e oportunidades na educação, saúde,
              desporto e serviços comunitários. Estamos empenhados em promover a inclusão, o empoderamento e o
              desenvolvimento sustentável para criar mudanças positivas duradouras.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="relative aspect-video lg:aspect-square"
          >
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/fundacao-tony-bana.firebasestorage.app/o/Imagem%20WhatsApp%202025-04-05%20%C3%A0s%2020.52.26_4c1ed23d.jpg?alt=media&token=a981c4d7-1b24-496c-8204-0ad21f370b03"
              alt="Missão"
              fill
              className="object-cover rounded-lg shadow-xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
