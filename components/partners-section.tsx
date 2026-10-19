"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"
import { getCollection, COLLECTIONS, Parceiro } from "@/lib/firebase-firestore"

export default function PartnersSection() {
  const [partners, setPartners] = useState<Parceiro[]>([])

  useEffect(() => {
    let mounted = true
    getCollection<Parceiro>(COLLECTIONS.PARCEIROS)
      .then((items) => {
        if (!mounted) return
        setPartners(items)
      })
      .catch((err) => console.error(err))
    return () => {
      mounted = false
    }
  }, [])

  if (partners.length === 0) return null

  return (
    <section id="parceiros" className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold mb-4 text-balance">
            Nossos <span className="text-primary">Parceiros</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
            Trabalhamos em conjunto com organizações que compartilham nossa visão de transformação social
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {partners.map((partner, index) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50">
                <CardContent className="p-8">
                  <div className="mb-6 flex items-center justify-center">
                    {partner.logo ? (
                      <div className="w-80 h-40 flex items-center justify-center bg-white p-2 rounded-md overflow-hidden">
                        <a href={partner.website || '#'} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                          <Image
                            src={partner.logo}
                            alt={partner.nome}
                            width={320}
                            height={160}
                            className="object-contain w-full h-full"
                          />
                        </a>
                      </div>
                    ) : (
                      <div className="w-40 h-20 flex items-center justify-center bg-muted rounded-md">
                        <span className="text-sm text-muted-foreground">
                          {partner.nome?.split(" ")
                            .slice(0, 2)
                            .map((n) => n?.[0])
                            .join("") || "PT"}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-montserrat text-2xl font-bold mb-4 text-primary">{partner.nome}</h3>
                  <p className="text-foreground mb-4 leading-relaxed">{partner.descricao}</p>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{partner.website}</p>
                  <Button variant="outline" className="group bg-transparent" asChild>
                    <a href={partner.website || "#"} target="_blank" rel="noopener noreferrer">
                      Visitar Website
                      <ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
