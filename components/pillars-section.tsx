"use client"

import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Heart, Users, Trophy, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

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
]

export default function PillarsSection() {
  return (
    <section id="pilares" className="py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 max-w-3xl"
        >
          <p className="mono-label mb-4 text-accent">02 / Como trabalhamos</p>
          <h2 className="mb-4 font-montserrat text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Um trabalho com <span className="text-primary">várias frentes.</span>
          </h2>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Apoiamos através de programas focados e inclusivos.
          </p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="group h-full rounded-2xl border border-white/10 bg-card/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:bg-card hover:shadow-xl hover:shadow-black/20">
                <CardContent className="p-6 md:p-7">
                  <p className="mono-label mb-5 text-muted-foreground">Área 0{index + 1}</p>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"
                  >
                    <pillar.icon className="h-6 w-6" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-3 font-montserrat group-hover:text-primary transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{pillar.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
