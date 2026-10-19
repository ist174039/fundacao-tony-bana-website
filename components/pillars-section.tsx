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
    <section id="pilares" className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-montserrat mb-4">
            Pilares da <span className="text-primary">Fundação</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
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
              <Card className="border-2 hover:border-primary transition-all duration-300 hover:shadow-xl hover:-translate-y-2 h-full group">
                <CardContent className="pt-6">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground group-hover:shadow-lg"
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
