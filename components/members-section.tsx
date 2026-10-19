"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCollection, COLLECTIONS, Membro } from "@/lib/firebase-firestore"

export default function MembersSection() {
  const [members, setMembers] = useState<Membro[]>([])
  const [showAll, setShowAll] = useState(false)

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
    <section id="membros" className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary"><UsersRound className="h-4 w-4" /> Quem faz acontecer</p>
            <h2 className="font-montserrat text-3xl font-bold tracking-tight md:text-4xl">A nossa <span className="text-primary">equipa</span></h2>
            <p className="mt-3 text-muted-foreground">Pessoas dedicadas a servir e fortalecer as comunidades.</p>
          </div>
          {members.length > 3 && <Button variant="outline" onClick={() => setShowAll(!showAll)}>{showAll ? "Mostrar menos" : "Ver toda a equipa"}<ArrowRight className="ml-2 h-4 w-4" /></Button>}
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {members.length === 0 ? (
            <div className="text-center text-muted-foreground col-span-full py-12">Nenhum membro registado ainda.</div>
          ) : (
            (showAll ? members : members.slice(0, 3)).map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <Card className="h-full rounded-2xl border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 text-left">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/15"
                      >
                        <Image
                          src={member.imagem || "/placeholder.svg"}
                          alt={member.nome}
                          fill
                          className="rounded-full object-cover"
                        />
                      </motion.div>
                      <div className="min-w-0">
                        <h3 className="truncate font-montserrat text-lg font-bold">{member.nome}</h3>
                        <p className="mt-1 text-sm font-medium text-primary">{member.cargo}</p>
                      </div>
                    </div>
                    {member.descricao && <p className="mt-5 border-t pt-4 text-sm leading-relaxed text-muted-foreground">{member.descricao}</p>}
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
