"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { areaFetch } from "@/lib/area-client"

type School = { id: string; codigo: string; nome: string; pais: string; regiao?: string; estado: string }
type Contact = { id: string; nome: string; cargo: string; email: string; telefone: string }
const emptySchool = { codigo: "", nome: "", pais: "", regiao: "", municipio: "", localidade: "" }
const emptyContact = { nome: "", cargo: "", telefone: "", email: "" }

export function SchoolsManager() {
  const [form, setForm] = useState(emptySchool)
  const [rows, setRows] = useState<School[]>([])
  const [selected, setSelected] = useState("")
  const [contact, setContact] = useState(emptyContact)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const result = await areaFetch<{ escolas: School[] }>("/api/area/schools")
      setRows(result.escolas); setError("")
    } catch (e) { setError(e instanceof Error ? e.message : "Falha no registo de escolas.") }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!selected) return
    let alive = true
    void areaFetch<{ contactos: Contact[] }>("/api/area/schools/" + encodeURIComponent(selected) + "/contacts")
      .then(v => { if (alive) setContacts(v.contactos) })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : "Erro nos contactos.") })
    return () => { alive = false }
  }, [selected])

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("")
    try {
      const r = await areaFetch<{ escola: School }>("/api/area/schools", { method: "POST", body: JSON.stringify(form) })
      setForm(emptySchool); await load(); setSelected(r.escola.codigo)
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao criar escola.") }
    finally { setBusy(false) }
  }
  const saveContact = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("")
    try {
      const r = await areaFetch<{ contacto: Contact }>("/api/area/schools/" + encodeURIComponent(selected) + "/contacts", {
        method: "POST", body: JSON.stringify(contact)
      })
      setContacts(p => [...p, r.contacto]); setContact(emptyContact)
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao guardar contacto.") }
    finally { setBusy(false) }
  }
  return <div className="space-y-5">
    <p className="rounded-md border bg-muted/40 p-3 text-sm">Escolas e responsáveis institucionais. Não introduzir dados de alunos nesta fase.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Registar escola</CardTitle></CardHeader><CardContent>
        <form className="space-y-3" onSubmit={save}>
          {(["codigo", "nome", "pais", "regiao", "municipio", "localidade"] as const).map(field =>
            <label key={field} className="block text-sm">
              <span>{field === "codigo" ? "Código único" : field === "nome" ? "Nome" : field === "pais" ? "País" : field === "regiao" ? "Região" : field === "municipio" ? "Município" : "Localidade"}</span>
              <Input value={form[field]} required={["codigo", "nome", "pais"].includes(field)} disabled={busy}
                onChange={e => setForm(v => ({ ...v, [field]: e.target.value }))}/>
            </label>)}
          <Button disabled={busy} type="submit">Registar escola</Button>
        </form>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Escolas registadas</CardTitle></CardHeader><CardContent className="space-y-2">
        {!rows.length && <p className="text-sm text-muted-foreground">Sem escolas registadas ou módulo desativado.</p>}
        {rows.map(s => <button key={s.id} type="button" onClick={() => setSelected(s.codigo)}
          className={"w-full rounded-md border p-3 text-left text-sm " + (selected === s.codigo ? "border-primary" : "")}>
          <strong className="block">{s.nome}</strong>
          <span className="text-muted-foreground">{s.codigo} · {s.pais} · {s.regiao || "Sem região"}</span>
        </button>)}
      </CardContent></Card>
    </div>
    {selected && <Card><CardHeader><CardTitle>Responsáveis da escola {selected}</CardTitle></CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {!contacts.length && <p className="text-sm text-muted-foreground">Sem contactos registados.</p>}
          {contacts.map(c => <div className="rounded-md border p-3 text-sm" key={c.id}>
            <strong>{c.nome}</strong><p>{c.cargo}</p><p>{c.email}</p><p>{c.telefone}</p>
          </div>)}
        </div>
        <form onSubmit={saveContact} className="space-y-3">
          {(["nome", "cargo", "telefone", "email"] as const).map(field => <label key={field} className="block text-sm">
            <span>{field === "nome" ? "Nome" : field === "cargo" ? "Cargo" : field === "telefone" ? "Telefone" : "Email"}</span>
            <Input value={contact[field]} disabled={busy} type={field === "email" ? "email" : "text"}
              required={field === "nome" || field === "cargo"}
              onChange={e => setContact(v => ({ ...v, [field]: e.target.value }))}/>
          </label>)}
          <p className="text-xs text-muted-foreground">Indicar pelo menos telefone ou email.</p>
          <Button disabled={busy} type="submit">Adicionar responsável</Button>
        </form>
      </CardContent>
    </Card>}
  </div>
}