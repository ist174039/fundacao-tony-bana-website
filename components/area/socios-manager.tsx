"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Eye, Pencil, Plus, UserRound, UserRoundCheck, UserRoundX } from "lucide-react"
import { areaFetch } from "@/lib/area-client"
import type { Socio } from "@/lib/firebase-firestore"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Drawer as Dialog, DrawerContent as DialogContent, DrawerDescription as DialogDescription, DrawerFooter as DialogFooter, DrawerHeader as DialogHeader, DrawerTitle as DialogTitle } from "@/components/workspace/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ListControls } from "@/components/workspace/list-controls"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

type SocioForm = Omit<Socio, "id" | "estado"> & { id?: string }
const emptyForm = (): SocioForm => ({ nome: "", email: "", telefone: "", numeroSocio: "", dataAdesao: new Date().toISOString().slice(0, 10), observacoes: "" })

export function SociosManager({ readOnly = false }: { readOnly?: boolean }) {
  const [socios, setSocios] = useState<Socio[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null)
  const [form, setForm] = useState<SocioForm>(emptyForm())
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    const data = await areaFetch<{ socios: Socio[] }>("/api/area/socios")
    setSocios(data.socios)
  }, [])

  useEffect(() => { void refresh().catch((e) => setError(e.message)) }, [refresh])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      if (form.id) {
        await areaFetch(`/api/area/socios/${form.id}`, { method: "PATCH", body: JSON.stringify(form) })
      } else {
        await areaFetch("/api/area/socios", { method: "POST", body: JSON.stringify(form) })
      }
      setOpen(false)
      setForm(emptyForm())
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível guardar o sócio.")
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (socio: Socio) => {
    setError("")
    try {
      await areaFetch(`/api/area/socios/${socio.id}`, { method: "PATCH", body: JSON.stringify({ ...socio, estado: socio.estado === "ativo" ? "inativo" : "ativo" }) })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar o estado do sócio.")
    }
  }

  const filtered = socios.filter((socio) => `${socio.nome} ${socio.email} ${socio.numeroSocio || ""}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === "all" || socio.estado === statusFilter))
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10))
  const pagedSocios = filtered.slice((page - 1) * 10, page * 10)

  return <div className="space-y-5">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <Card className="site-card overflow-hidden">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary"/>Sócios</CardTitle><p className="mt-1 text-sm text-muted-foreground">Registos de adesão, contacto e estado associativo.</p></div>
        {!readOnly && <Button onClick={() => { setForm(emptyForm()); setError(""); setOpen(true) }}><Plus className="mr-2 h-4 w-4"/>Novo sócio</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        <ListControls search={search} onSearchChange={(value) => { setSearch(value); setPage(1) }} placeholder="Pesquisar sócio por nome, email ou número" filter={statusFilter} onFilterChange={(value) => { setStatusFilter(value); setPage(1) }} filterOptions={[{ value: "all", label: "Todos os estados" }, { value: "ativo", label: "Ativos" }, { value: "inativo", label: "Inativos" }]} page={page} pageCount={pageCount} total={filtered.length} onPageChange={setPage}/>
        {filtered.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{socios.length ? "Nenhum sócio corresponde à pesquisa." : "Ainda não existem sócios registados."}</div> : <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Sócio</TableHead><TableHead>Número</TableHead><TableHead>Adesão</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>{pagedSocios.map((socio) => <TableRow key={socio.id}>
            <TableCell><div className="font-medium">{socio.nome}</div><div className="text-xs text-muted-foreground">{socio.email}{socio.telefone ? ` · ${socio.telefone}` : ""}</div></TableCell>
            <TableCell>{socio.numeroSocio || "—"}</TableCell><TableCell>{socio.dataAdesao}</TableCell>
            <TableCell><Badge variant={socio.estado === "ativo" ? "default" : "secondary"}>{socio.estado === "ativo" ? "Ativo" : "Inativo"}</Badge></TableCell>
            <TableCell><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setSelectedSocio(socio)}><Eye className="mr-1.5 h-4 w-4"/>Ver</Button>{!readOnly && <><Button variant="outline" size="sm" onClick={() => { setForm({ ...socio }); setError(""); setOpen(true) }}><Pencil className="mr-1.5 h-4 w-4"/>Editar</Button><Button variant="ghost" size="icon" aria-label={socio.estado === "ativo" ? `Desativar ${socio.nome}` : `Ativar ${socio.nome}`} onClick={() => void toggleStatus(socio)}>{socio.estado === "ativo" ? <UserRoundX className="h-4 w-4"/> : <UserRoundCheck className="h-4 w-4"/>}</Button></>}</div></TableCell>
          </TableRow>)}</TableBody>
        </Table></div>}
      </CardContent>
    </Card>

    <Sheet open={Boolean(selectedSocio)} onOpenChange={(value) => { if (!value) setSelectedSocio(null) }}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{selectedSocio?.nome}</SheetTitle><SheetDescription>Detalhes do registo associativo.</SheetDescription></SheetHeader>{selectedSocio && <div className="mt-6 space-y-4 text-sm"><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Estado</p><Badge className="mt-2" variant={selectedSocio.estado === "ativo" ? "default" : "secondary"}>{selectedSocio.estado === "ativo" ? "Ativo" : "Inativo"}</Badge></div><Detail label="Email" value={selectedSocio.email}/><Detail label="Telefone" value={selectedSocio.telefone}/><Detail label="Número de sócio" value={selectedSocio.numeroSocio}/><Detail label="Data de adesão" value={selectedSocio.dataAdesao}/><Detail label="Observações" value={selectedSocio.observacoes}/></div>}</SheetContent></Sheet>

    {!readOnly && <Dialog open={open} onOpenChange={setOpen}><DialogContent className="overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{form.id ? "Editar sócio" : "Registar sócio"}</DialogTitle><DialogDescription>Os dados do sócio são guardados na área privada da Fundação.</DialogDescription></DialogHeader>
      <form id="socio-form" onSubmit={save} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="socio-name">Nome completo</Label><Input id="socio-name" required minLength={2} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}/></div>
        <div className="space-y-2"><Label htmlFor="socio-email">Email</Label><Input id="socio-email" type="email" required disabled={Boolean(form.id)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="socio-phone">Telefone</Label><Input id="socio-phone" value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })}/></div><div className="space-y-2"><Label htmlFor="socio-number">N.º de sócio</Label><Input id="socio-number" value={form.numeroSocio || ""} onChange={(e) => setForm({ ...form, numeroSocio: e.target.value })}/></div></div>
        {!form.id && <div className="space-y-2"><Label htmlFor="socio-joined">Data de adesão</Label><Input id="socio-joined" type="date" required value={form.dataAdesao} onChange={(e) => setForm({ ...form, dataAdesao: e.target.value })}/></div>}
        <div className="space-y-2"><Label htmlFor="socio-notes">Observações</Label><Textarea id="socio-notes" maxLength={1000} value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}/></div>
      </form>
      <DialogFooter><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" form="socio-form" disabled={loading}>{loading ? "A guardar…" : "Guardar sócio"}</Button></DialogFooter>
    </DialogContent></Dialog>}
  </div>
}

function Detail({ label, value }: { label: string; value?: string }) { return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap font-medium">{value || "—"}</p></div> }
