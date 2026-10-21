"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, HeartHandshake } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function MembershipIntentionSection() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [consent, setConsent] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch("/api/membership-intentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.get("nome"),
          email: form.get("email"),
          telefone: form.get("telefone"),
          mensagem: form.get("mensagem"),
          website: form.get("website"),
          consentimento: consent,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o pedido.")
      setSent(true)
      event.currentTarget.reset()
      setConsent(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o pedido.")
    } finally {
      setLoading(false)
    }
  }

  return <section id="ser-socio" className="scroll-mt-24 bg-muted/35 py-20 sm:py-24">
    <div className="container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
      <div className="max-w-xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><HeartHandshake className="h-4 w-4"/>Fazer parte</div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Queres ser sócio da Fundação?</h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground">Partilha o teu interesse em apoiar a nossa missão. A equipa irá analisar o pedido e entrar em contacto contigo.</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Este formulário regista apenas uma intenção. A inscrição oficial é feita pela administração depois da análise do pedido.</p>
      </div>
      <Card className="site-card border-border/70 shadow-lg shadow-primary/5">
        <CardContent className="p-6 sm:p-8">
          {sent ? <div className="py-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-primary"/><h3 className="mt-4 text-xl font-semibold">Pedido recebido</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Obrigado pelo teu interesse. A Fundação irá analisar o pedido e contactar-te.</p><Button className="mt-6" variant="outline" onClick={() => setSent(false)}>Enviar outro pedido</Button></div> : <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="intention-name">Nome completo</Label><Input id="intention-name" name="nome" autoComplete="name" required minLength={2} maxLength={120}/></div>
              <div className="space-y-2"><Label htmlFor="intention-phone">Telefone</Label><Input id="intention-phone" name="telefone" type="tel" autoComplete="tel" required minLength={6} maxLength={40}/></div>
            </div>
            <div className="space-y-2"><Label htmlFor="intention-email">Email</Label><Input id="intention-email" name="email" type="email" autoComplete="email" required maxLength={254}/></div>
            <div className="space-y-2"><Label htmlFor="intention-message">Mensagem <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="intention-message" name="mensagem" maxLength={1000} rows={3} placeholder="Conta-nos brevemente o que te motiva a juntar à Fundação."/></div>
            <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><Label htmlFor="intention-website">Website</Label><Input id="intention-website" name="website" tabIndex={-1} autoComplete="off"/></div>
            <div className="flex items-start gap-3"><Checkbox id="intention-consent" checked={consent} onCheckedChange={(value) => setConsent(value === true)} required/><Label htmlFor="intention-consent" className="text-sm font-normal leading-5 text-muted-foreground">Autorizo a Fundação Tony Bana a usar estes dados para analisar o pedido e contactar-me sobre a adesão.</Label></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !consent} className="w-full sm:w-auto">{loading ? "A enviar…" : "Enviar intenção de adesão"}</Button>
          </form>}
        </CardContent>
      </Card>
    </div>
  </section>
}
