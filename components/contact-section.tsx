"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Send, Mail, MapPin, Phone } from "lucide-react"

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement Firebase form submission
    console.log("Form submitted:", formData)
  }

  return (
    <section id="contato" className="py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 max-w-3xl"
        >
          <p className="mono-label mb-4 text-accent">04 / Fale connosco</p>
          <h2 className="mb-4 font-montserrat text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Vamos conversar sobre <span className="text-primary">oportunidades.</span>
          </h2>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Tem alguma dúvida ou quer se juntar a nós? Envie-nos uma mensagem.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-2xl font-bold font-montserrat mb-6">Informações de Contato</h3>
              <div className="space-y-4">
                <motion.div
                  whileHover={{ x: 10 }}
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-card/70 p-4 transition-colors hover:border-primary/40"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Email</p>
                    <p className="text-muted-foreground text-sm">geral@fundacaotonybana.org</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ x: 10 }}
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-card/70 p-4 transition-colors hover:border-primary/40"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Telefone</p>
                    <p className="text-muted-foreground text-sm">+245 957728135</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ x: 10 }}
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-card/70 p-4 transition-colors hover:border-primary/40"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Telefone</p>
                    <p className="text-muted-foreground text-sm">+245 965656071</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ x: 10 }}
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-card/70 p-4 transition-colors hover:border-primary/40"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Localização</p>
                    <p className="text-muted-foreground text-sm">Avenida Osvaldo Vieira, no. 5, no Bairro Chao de Papel, Bissau, Guine-Bissau</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="rounded-2xl border border-white/10 bg-card/70 transition-colors hover:border-primary/40">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Nome
                    </label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium">
                      Mensagem
                    </label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full group">
                    Enviar Mensagem
                    <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
