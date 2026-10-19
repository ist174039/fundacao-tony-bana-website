"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { motion } from "framer-motion"
import { getCollection, COLLECTIONS, Membro } from "@/lib/firebase-firestore"

export default function MembersSection() {
  const [members, setMembers] = useState<Membro[]>([])

  useEffect(() => {
    let mounted = true
    getCollection<Membro>(COLLECTIONS.MEMBROS)
      .then((items) => {
        if (!mounted) return
        setMembers(items)
      })
      .catch((err) => console.error(err))
    return () => {
      mounted = false
    }
  }, [])

  if (members.length === 0) return null

  return (
    <section id="membros" className="py-20 bg-muted/50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-montserrat mb-4">
            <span className="text-primary">Membros</span>
          </h2>
          <p className="text-lg text-muted-foreground">Equipa e voluntários</p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {members.length === 0 ? (
            <div className="text-center text-muted-foreground col-span-full py-12">Nenhum membro registado ainda.</div>
          ) : (
            members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 h-full">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="relative h-32 w-32 mb-4"
                      >
                        <Image
                          src={member.imagem || "/placeholder.svg"}
                          alt={member.nome}
                          fill
                          className="object-cover rounded-full ring-4 ring-primary/20 hover:ring-primary/50 transition-all"
                        />
                      </motion.div>
                      <h4 className="text-xl font-semibold mb-1 font-montserrat">{member.nome}</h4>
                      <p className="text-sm text-primary font-medium mb-3">{member.cargo}</p>
                      <p className="text-muted-foreground text-sm">{member.descricao}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
