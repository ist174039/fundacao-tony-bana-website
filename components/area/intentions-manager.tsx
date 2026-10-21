"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Clock3, X } from "lucide-react"
import { areaFetch } from "@/lib/area-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Intention = { id: string; nome: string; email: string; telefone: string; mensagem?: string; estado: "pendente" | "aceite" | "rejeitado"; criadoEm: string; revistoEm?: string }

export function IntentionsManager() {
  const [intentions, setIntentions] = useState<Intention[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")
  const refresh = useCallback(async () => { const result = await areaFetch<{ intentions: Intention[] }>("/api/area/intentions"); setIntentions(result.intentions) }, [])
  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar os pedidos.")) }, [refresh])

  async function review(item: Intention, estado: "aceite" | "rejeitado") {
    setBusy(item.id); setError("")
    try { await areaFetch(`/api/area/intentions/${item.id}`, { method: "PATCH", body: JSON.stringify({ estado }) }); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o pedido.") }
    finally { setBusy("") }
  }
  const pendingCount = intentions.filter((item) => item.estado === "pendente").length
  return <div className="space-y-5">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <Card className="site-card overflow-hidden">
      <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary"/>Pedidos de adesão <Badge variant="secondary">{pendingCount} pendentes</Badge></CardTitle><p className="text-sm text-muted-foreground">Os pedidos enviados pela página inicial só criam um registo de sócio depois de serem aceites.</p></CardHeader>
      <CardContent className="space-y-3">
        {intentions.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Ainda não há pedidos de adesão.</div> : intentions.map((item) => <article key={item.id} className="rounded-xl border border-border/70 p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.nome}</h3><Badge variant={item.estado === "pendente" ? "outline" : item.estado === "aceite" ? "default" : "secondary"}>{item.estado === "pendente" ? "Pendente" : item.estado === "aceite" ? "Aceite" : "Rejeitado"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.email} · {item.telefone}</p><p className="mt-1 text-xs text-muted-foreground">Recebido em {new Date(item.criadoEm).toLocaleString("pt-PT")}</p>{item.mensagem && <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.mensagem}</p>}</div>{item.estado === "pendente" && <div className="flex shrink-0 gap-2"><Button size="sm" disabled={Boolean(busy)} onClick={() => void review(item, "aceite")}><Check className="mr-1.5 h-4 w-4"/>{busy === item.id ? "A guardar…" : "Aceitar e registar"}</Button><Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void review(item, "rejeitado")}><X className="mr-1.5 h-4 w-4"/>Rejeitar</Button></div>}</div></article>)}
      </CardContent>
    </Card>
  </div>
}
