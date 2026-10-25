"use client"
import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { areaFetch } from "@/lib/area-client"

type Item = { categoria: string; descricao: string; quantidade: number; unidade: string; estado: string }
type Reception = {
  id: string; numero: string; estado: "pendente" | "confirmada";
  doador: { nome: string }; referenciaDocumento: string; itens: Item[]
}
const newItem = (): Item => ({ categoria: "", descricao: "", quantidade: 1, unidade: "un", estado: "novo" })
const newForm = () => ({
  anonimo: false, tipoDoador: "pessoa", nomeDoador: "", emailDoador: "",
  telefoneDoador: "", referenciaDocumento: "", finalidade: "",
  itens: [newItem()]
})

export function MaterialReceptionsManager() {
  const [form, setForm] = useState(newForm)
  const [rows, setRows] = useState<Reception[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function load() {
    try {
      const data = await areaFetch<{ rececoes: Reception[] }>("/api/area/material-receptions")
      setRows(data.rececoes); setError("")
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar as receções.") }
  }
  useEffect(() => { void load() }, [])

  const updateItem = (index: number, patch: Partial<Item>) =>
    setForm(prev => ({ ...prev, itens: prev.itens.map((item, i) => i === index ? { ...item, ...patch } : item) }))

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("")
    try {
      const result = await areaFetch<{ rececao: Reception }>("/api/area/material-receptions", {
        method: "POST", body: JSON.stringify(form)
      })
      setForm(newForm()); await load()
      setMessage("Registo " + result.rececao.numero + " criado. Ainda não está em stock: confirmar a receção física.")
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível guardar.") }
    finally { setBusy(false) }
  }
  const confirm = async (row: Reception) => {
    if (!window.confirm("Confirma que os artigos da guia " + row.numero + " foram conferidos fisicamente? Esta confirmação gera entrada em stock.")) return
    setBusy(true); setError(""); setMessage("")
    try {
      const result = await areaFetch<{ novaConfirmacao: boolean }>(
        "/api/area/material-receptions/" + encodeURIComponent(row.id) + "/confirm", { method: "POST" })
      await load()
      setMessage(result.novaConfirmacao ? "Receção confirmada e stock atualizado." : "Receção anteriormente confirmada.")
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao confirmar.") }
    finally { setBusy(false) }
  }

  return <div className="space-y-6">
    <p className="rounded-md border bg-muted/40 p-3 text-sm">
      Registo de doação material → conferência física → confirmação → entrada em stock.
      A guia física pode ser referenciada. Fotografias digitais permanecem desativadas até ser aprovado o armazenamento privado.
    </p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <Card><CardHeader><CardTitle>Registar doação material</CardTitle></CardHeader><CardContent>
      <form onSubmit={submit} className="space-y-4">
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.anonimo} disabled={busy}
          onChange={e => setForm(p => ({ ...p, anonimo: e.target.checked }))}/> Donativo anónimo</label>
        {!form.anonimo && <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Tipo de doador
            <select className="block w-full rounded-md border bg-background p-2" value={form.tipoDoador}
              onChange={e => setForm(p => ({ ...p, tipoDoador: e.target.value }))}>
              <option value="pessoa">Pessoa</option><option value="organizacao">Organização</option>
            </select>
          </label>
          <label className="text-sm">Nome<Input required value={form.nomeDoador} disabled={busy}
            onChange={e => setForm(p => ({ ...p, nomeDoador: e.target.value }))}/></label>
          <label className="text-sm">Email<Input type="email" value={form.emailDoador} disabled={busy}
            onChange={e => setForm(p => ({ ...p, emailDoador: e.target.value }))}/></label>
          <label className="text-sm">Telefone<Input value={form.telefoneDoador} disabled={busy}
            onChange={e => setForm(p => ({ ...p, telefoneDoador: e.target.value }))}/></label>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Número da guia / comprovativo físico<Input value={form.referenciaDocumento} disabled={busy}
            onChange={e => setForm(p => ({ ...p, referenciaDocumento: e.target.value }))}/></label>
          <label className="text-sm">Finalidade<Input value={form.finalidade} disabled={busy}
            onChange={e => setForm(p => ({ ...p, finalidade: e.target.value }))}/></label>
        </div>
        <h4 className="font-semibold">Artigos</h4>
        {form.itens.map((item, i) => <div key={i} className="grid gap-2 rounded-md border p-3 lg:grid-cols-5">
          <label className="text-xs">Categoria<Input required value={item.categoria} disabled={busy}
            onChange={e => updateItem(i, { categoria: e.target.value })}/></label>
          <label className="text-xs">Descrição<Input required value={item.descricao} disabled={busy}
            onChange={e => updateItem(i, { descricao: e.target.value })}/></label>
          <label className="text-xs">Quantidade<Input type="number" required min="0.001" max="1000000" step="0.001" value={item.quantidade} disabled={busy}
            onChange={e => updateItem(i, { quantidade: Number(e.target.value) })}/></label>
          <label className="text-xs">Unidade<select className="block w-full rounded-md border bg-background p-2" value={item.unidade} disabled={busy}
            onChange={e => updateItem(i, { unidade: e.target.value })}>
            {["un", "kg", "l", "caixa", "pacote", "m", "outro"].map(v => <option key={v}>{v}</option>)}
          </select></label>
          <label className="text-xs">Condição<select className="block w-full rounded-md border bg-background p-2" value={item.estado} disabled={busy}
            onChange={e => updateItem(i, { estado: e.target.value })}>
            <option value="novo">Novo</option><option value="usado_bom">Usado / bom</option>
            <option value="usado_rever">Usado / rever</option>
          </select></label>
          {form.itens.length > 1 && <Button type="button" variant="outline" disabled={busy}
            onClick={() => setForm(p => ({ ...p, itens: p.itens.filter((_, j) => i !== j) }))}>Remover</Button>}
        </div>)}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" disabled={busy || form.itens.length >= 50}
            onClick={() => setForm(p => ({ ...p, itens: [...p.itens, newItem()] }))}>Adicionar artigo</Button>
          <Button type="submit" disabled={busy}>Registar como pendente</Button>
        </div>
      </form>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Receções registadas</CardTitle></CardHeader><CardContent className="space-y-3">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Sem receções ou módulo desativado.</p>}
      {rows.map(row => <div key={row.id} className="flex flex-col justify-between gap-3 rounded-md border p-3 sm:flex-row">
        <div className="text-sm"><strong>{row.numero}</strong> · {row.estado}
          <p>{row.doador.nome} · {row.itens.length} artigos</p>
          {row.referenciaDocumento && <p>Guia: {row.referenciaDocumento}</p>}
          <ul className="list-inside list-disc text-muted-foreground">{row.itens.map((item, i) =>
            <li key={i}>{item.descricao}: {item.quantidade} {item.unidade}</li>)}</ul>
        </div>
        {row.estado === "pendente" && <Button type="button" disabled={busy} onClick={() => void confirm(row)}>Confirmar receção</Button>}
      </div>)}
    </CardContent></Card>
  </div>
}