"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Clock3, Eye, MessageCircle, X } from "lucide-react"
import { areaFetch } from "@/lib/area-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ListControls } from "@/components/workspace/list-controls"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Intention = { id: string; tipo?: "duvida" | "adesao"; nome: string; email: string; telefone?: string; mensagem?: string; estado: "pendente" | "aceite" | "rejeitado" | "respondido"; criadoEm: string; revistoEm?: string }

export function IntentionsManager() {
  const [intentions, setIntentions] = useState<Intention[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Intention | null>(null)
  const refresh = useCallback(async () => { const result = await areaFetch<{ intentions: Intention[] }>("/api/area/intentions"); setIntentions(result.intentions) }, [])
  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar os pedidos.")) }, [refresh])

  async function review(item: Intention, estado: "aceite" | "rejeitado" | "respondido") {
    setBusy(item.id); setError("")
    try { await areaFetch(`/api/area/intentions/${item.id}`, { method: "PATCH", body: JSON.stringify({ estado }) }); await refresh(); setSelected(null) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o pedido.") }
    finally { setBusy("") }
  }
  const pendingCount = intentions.filter((item) => item.estado === "pendente").length
  const filtered = intentions.filter((item) => `${item.nome} ${item.email} ${item.telefone || ""} ${item.mensagem || ""}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === "all" || item.estado === statusFilter) && (typeFilter === "all" || (typeFilter === "question" ? item.tipo === "duvida" : item.tipo !== "duvida")))
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10))
  const paged = filtered.slice((page - 1) * 10, page * 10)
  return <div className="space-y-5">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <Card className="site-card overflow-hidden">
      <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary"/>Contactos e pedidos <Badge variant="secondary">{pendingCount} por tratar</Badge></CardTitle><p className="text-sm text-muted-foreground">Aqui aparecem as dúvidas enviadas pelo site e as intenções de adesão. Aceitar uma intenção cria o registo oficial de sócio.</p></CardHeader>
      <CardContent className="space-y-3">
        <ListControls search={search} onSearchChange={(value) => { setSearch(value); setPage(1) }} placeholder="Pesquisar nome, email ou mensagem" filter={statusFilter} onFilterChange={(value) => { setStatusFilter(value); setPage(1) }} filterOptions={[{ value: "all", label: "Todos os estados" }, { value: "pendente", label: "Por tratar" }, { value: "aceite", label: "Aceites" }, { value: "respondido", label: "Respondidos" }, { value: "rejeitado", label: "Rejeitados" }]} page={page} pageCount={pageCount} total={filtered.length} onPageChange={setPage}/>
        <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Tipo:</span><Button size="sm" variant={typeFilter === "all" ? "secondary" : "ghost"} onClick={() => { setTypeFilter("all"); setPage(1) }}>Todos</Button><Button size="sm" variant={typeFilter === "question" ? "secondary" : "ghost"} onClick={() => { setTypeFilter("question"); setPage(1) }}>Dúvidas</Button><Button size="sm" variant={typeFilter === "membership" ? "secondary" : "ghost"} onClick={() => { setTypeFilter("membership"); setPage(1) }}>Adesões</Button></div>
        {filtered.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{intentions.length ? "Nenhum pedido corresponde aos filtros." : "Ainda não há contactos ou pedidos."}</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Contacto</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Recebido</TableHead><TableHead className="text-right">Detalhes</TableHead></TableRow></TableHeader><TableBody>{paged.map((item) => <TableRow key={item.id}><TableCell><div className="font-medium">{item.nome}</div><div className="text-xs text-muted-foreground">{item.email}</div></TableCell><TableCell>{item.tipo === "duvida" ? "Dúvida" : "Adesão"}</TableCell><TableCell><Badge variant={item.estado === "pendente" ? "secondary" : item.estado === "aceite" ? "default" : "outline"}>{item.estado === "pendente" ? "Por tratar" : item.estado === "aceite" ? "Sócio registado" : item.estado === "respondido" ? "Respondido" : "Rejeitado"}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{new Date(item.criadoEm).toLocaleDateString("pt-PT")}</TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setSelected(item)}><Eye className="mr-1.5 h-4 w-4"/>Ver</Button></TableCell></TableRow>)}</TableBody></Table></div>}
      </CardContent>
    </Card>
    <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{selected?.nome}</SheetTitle><SheetDescription>{selected?.tipo === "duvida" ? "Pedido de esclarecimento" : "Intenção de adesão a sócio"}</SheetDescription></SheetHeader>{selected && <div className="mt-6 space-y-4"><div className="space-y-1 text-sm"><a className="underline underline-offset-2" href={`mailto:${selected.email}`}>{selected.email}</a>{selected.telefone && <p className="text-muted-foreground">{selected.telefone}</p>}<p className="text-xs text-muted-foreground">Recebido em {new Date(selected.criadoEm).toLocaleString("pt-PT")}</p></div><div className="rounded-lg border p-4 text-sm leading-6"><p className="whitespace-pre-wrap">{selected.mensagem || "Sem mensagem."}</p></div><Badge variant={selected.estado === "pendente" ? "secondary" : "outline"}>{selected.estado}</Badge>{selected.estado === "pendente" && <div className="flex flex-wrap gap-2">{selected.tipo === "duvida" ? <Button disabled={Boolean(busy)} onClick={() => void review(selected, "respondido")}><Check className="mr-2 h-4 w-4"/>Marcar respondido</Button> : <><Button disabled={Boolean(busy)} onClick={() => void review(selected, "aceite")}><Check className="mr-2 h-4 w-4"/>Aceitar e registar</Button><Button variant="outline" disabled={Boolean(busy)} onClick={() => void review(selected, "rejeitado")}><X className="mr-2 h-4 w-4"/>Rejeitar</Button></>}</div>}</div>}</SheetContent></Sheet>
  </div>
}
