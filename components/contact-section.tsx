"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, HeartHandshake, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { motion } from "framer-motion"
import { SectionHeading } from "@/components/section-heading"

type ContactType = "duvida" | "adesao"

export default function ContactSection() {
  const [type, setType] = useState<ContactType>("duvida")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const response = await fetch("/api/membership-intentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: type,
          nome: form.get("nome"),
          email: form.get("email"),
          telefone: form.get("telefone"),
          mensagem: form.get("mensagem"),
          website: form.get("website"),
          consentimento: form.get("consentimento") === "on",
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar a mensagem.")
      setSent(true)
      formElement.reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a mensagem.")
    } finally {
      setLoading(false)
    }
  }

  return <section id="contato" className="site-section scroll-mt-24">
    <span id="ser-socio" className="relative -top-24 block" aria-hidden="true" />
    <div className="container">
      <SectionHeading eyebrow="04 / Fale connosco" title={<>Estamos aqui para <span className="text-primary">conversar.</span></>} description="Tira uma dúvida ou partilha o teu interesse em ser sócio. Escolhe o assunto e envia-nos uma mensagem." />
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <motion.div initial={false} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="space-y-5">
          <div><h3 className="text-xl font-semibold">Contactos da Fundação</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">A equipa responderá assim que possível.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <a href="mailto:geral@fundacaotonybana.org" className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Mail className="h-5 w-5"/></span><span><span className="block font-medium">Email</span><span className="text-sm text-muted-foreground">geral@fundacaotonybana.org</span></span></a>
            <a href="tel:+245957728135" className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Phone className="h-5 w-5"/></span><span><span className="block font-medium">Telefone</span><span className="text-sm text-muted-foreground">+245 957 728 135<br/>+245 965 656 071</span></span></a>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 sm:col-span-2 lg:col-span-1"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><MapPin className="h-5 w-5"/></span><span><span className="block font-medium">Localização</span><span className="text-sm leading-6 text-muted-foreground">Avenida Osvaldo Vieira, n.º 5, Bairro Chão de Papel, Bissau, Guiné-Bissau</span></span></div>
          </div>
        </motion.div>

        <motion.div initial={false} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <Card className="site-card border-border/70 shadow-lg shadow-primary/5"><CardContent className="p-6 sm:p-8">
            {sent ? <div className="py-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-primary"/><h3 className="mt-4 text-xl font-semibold">Mensagem recebida</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{type === "adesao" ? "Obrigado pelo interesse em fazer parte da Fundação. A equipa irá analisar o pedido e contactar-te." : "Obrigado pelo contacto. A equipa da Fundação irá responder à tua dúvida."}</p><Button className="mt-6" variant="outline" onClick={() => setSent(false)}>Enviar outra mensagem</Button></div> : <form onSubmit={submit} className="space-y-5">
              <div className="space-y-3"><Label>Como podemos ajudar?</Label><RadioGroup value={type} onValueChange={(value) => setType(value as ContactType)} className="grid gap-3 sm:grid-cols-2">
                <Label htmlFor="contact-question" className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${type === "duvida" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}><RadioGroupItem id="contact-question" value="duvida" className="mt-1"/><span><span className="flex items-center gap-2 font-medium"><MessageCircle className="h-4 w-4 text-primary"/>Tenho uma dúvida</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Uma pergunta sobre a Fundação ou as suas atividades.</span></span></Label>
                <Label htmlFor="contact-membership" className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${type === "adesao" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}><RadioGroupItem id="contact-membership" value="adesao" className="mt-1"/><span><span className="flex items-center gap-2 font-medium"><HeartHandshake className="h-4 w-4 text-primary"/>Quero ser sócio</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Manifesta o teu interesse em fazer parte da Fundação.</span></span></Label>
              </RadioGroup></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="contact-name">Nome completo</Label><Input id="contact-name" name="nome" autoComplete="name" required minLength={2} maxLength={120}/></div><div className="space-y-2"><Label htmlFor="contact-phone">Telefone {type === "adesao" && <span className="text-destructive">*</span>}</Label><Input id="contact-phone" name="telefone" type="tel" autoComplete="tel" minLength={6} maxLength={40} required={type === "adesao"} placeholder="+245 …"/></div></div>
              <div className="space-y-2"><Label htmlFor="contact-email">Email</Label><Input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254}/></div>
              <div className="space-y-2"><Label htmlFor="contact-message">{type === "adesao" ? "Mensagem (opcional)" : "A tua dúvida"}</Label><Textarea id="contact-message" name="mensagem" rows={4} maxLength={1000} required={type === "duvida"} placeholder={type === "adesao" ? "Conta-nos brevemente o que te motiva a juntar à Fundação." : "Escreve aqui a tua pergunta."}/></div>
              <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><Label htmlFor="contact-website">Website</Label><Input id="contact-website" name="website" tabIndex={-1} autoComplete="off"/></div>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-muted-foreground"><input name="consentimento" type="checkbox" required className="mt-1 h-4 w-4 accent-primary"/><span>{type === "adesao" ? "Autorizo a Fundação Tony Bana a usar estes dados para analisar o pedido e contactar-me sobre a adesão." : "Autorizo a Fundação Tony Bana a usar estes dados para responder ao meu contacto."}</span></label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? "A enviar…" : type === "adesao" ? "Enviar interesse em ser sócio" : "Enviar dúvida"}<Send className="ml-2 h-4 w-4"/></Button>
            </form>}
          </CardContent></Card>
        </motion.div>
      </div>
    </div>
  </section>
}
