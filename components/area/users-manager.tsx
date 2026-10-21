"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Ban, KeyRound, Link2, Plus, ShieldCheck, UserRound, UserRoundPlus } from "lucide-react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { areaFetch } from "@/lib/area-client"
import type { Socio } from "@/lib/firebase-firestore"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AreaUser { uid: string; email: string; displayName: string; disabled: boolean; createdAt: string; lastSignInAt: string | null; isAdmin: boolean; linkedSocio: string | null }

export function UsersManager() {
  const [users, setUsers] = useState<AreaUser[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const [open, setOpen] = useState(false)
  const [linkingUser, setLinkingUser] = useState<AreaUser | null>(null)
  const [linkSocioId, setLinkSocioId] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [socioId, setSocioId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const refresh = useCallback(async () => {
    const [userData, socioData] = await Promise.all([
      areaFetch<{ users: AreaUser[] }>("/api/area/users"),
      areaFetch<{ socios: Socio[] }>("/api/area/socios"),
    ])
    setUsers(userData.users)
    setSocios(socioData.socios)
  }, [])

  useEffect(() => { void refresh().catch((e) => setError(e.message)) }, [refresh])

  const invite = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setNotice("")
    try {
      const result = await areaFetch<{ linkedSocio: boolean }>("/api/area/users", { method: "POST", body: JSON.stringify({ displayName: name, email, socioId }) })
      try {
        await sendPasswordResetEmail(auth, email)
        setNotice(`A conta${result.linkedSocio ? " do sócio" : ""} foi criada e foi enviado um email para ${email} definir a senha.`)
      } catch {
        setNotice(`A conta foi criada, mas o email de definição de senha não foi enviado. Usa “Reenviar acesso” na lista.`)
      }
      setOpen(false)
      setName("")
      setEmail("")
      setSocioId("")
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o utilizador.")
    } finally {
      setLoading(false)
    }
  }

  const toggle = async (user: AreaUser) => {
    setError("")
    setNotice("")
    try {
      await areaFetch("/api/area/users", { method: "PATCH", body: JSON.stringify({ uid: user.uid, disabled: !user.disabled }) })
      setNotice(user.disabled ? "Utilizador reativado." : "Acesso do utilizador desativado.")
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar o acesso.")
    }
  }

  const resend = async (user: AreaUser) => {
    setError("")
    setNotice("")
    try {
      await sendPasswordResetEmail(auth, user.email)
      setNotice(`Email para definir a senha enviado para ${user.email}.`)
    } catch {
      setError("Não foi possível enviar o email. Confirma a configuração do Firebase Authentication.")
    }
  }

  const linkExistingUser = async (event: FormEvent) => {
    event.preventDefault()
    if (!linkingUser || !linkSocioId) return
    setLoading(true); setError(""); setNotice("")
    try {
      await areaFetch("/api/area/users", { method: "PATCH", body: JSON.stringify({ uid: linkingUser.uid, linkSocioId }) })
      setNotice("Conta associada ao registo do sócio.")
      setLinkingUser(null); setLinkSocioId("")
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível associar a conta.") }
    finally { setLoading(false) }
  }

  return <div className="space-y-5">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {notice && <Alert><AlertDescription>{notice}</AlertDescription></Alert>}
    <Card className="site-card overflow-hidden">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/>Utilizadores</CardTitle><p className="mt-1 text-sm text-muted-foreground">Contas de acesso ao espaço de trabalho.</p></div>
        <Button onClick={() => { setError(""); setOpen(true) }}><UserRoundPlus className="mr-2 h-4 w-4"/>Convidar utilizador</Button>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Ainda não existem utilizadores.</div> : <Table>
          <TableHeader><TableRow><TableHead>Utilizador</TableHead><TableHead>Perfil</TableHead><TableHead>Estado</TableHead><TableHead>Último acesso</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>{users.map((user) => <TableRow key={user.uid}>
            <TableCell><div className="font-medium">{user.displayName || "Sem nome"}</div><div className="text-xs text-muted-foreground">{user.email}{user.linkedSocio ? ` · Sócio: ${user.linkedSocio}` : ""}</div></TableCell>
            <TableCell>{user.isAdmin ? <Badge><ShieldCheck className="mr-1 h-3 w-3"/>Administrador</Badge> : <Badge variant="secondary"><UserRound className="mr-1 h-3 w-3"/>Utilizador</Badge>}</TableCell>
            <TableCell><Badge variant={user.disabled ? "destructive" : "outline"}>{user.disabled ? "Desativado" : "Ativo"}</Badge></TableCell>
            <TableCell className="text-sm text-muted-foreground">{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString("pt-PT") : "Nunca"}</TableCell>
            <TableCell><div className="flex justify-end gap-2">{!user.linkedSocio && !user.isAdmin && <Button size="sm" variant="outline" onClick={() => { setLinkingUser(user); setLinkSocioId("") }}><Link2 className="mr-1.5 h-4 w-4"/><span className="hidden sm:inline">Associar sócio</span></Button>}<Button size="sm" variant="outline" onClick={() => void resend(user)} disabled={user.disabled}><KeyRound className="mr-1.5 h-4 w-4"/><span className="hidden sm:inline">Reenviar acesso</span></Button><Button size="icon" variant="ghost" aria-label={user.disabled ? `Reativar ${user.email}` : `Desativar ${user.email}`} onClick={() => void toggle(user)}>{user.disabled ? <UserRoundPlus className="h-4 w-4"/> : <Ban className="h-4 w-4"/>}</Button></div></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Dar acesso a um sócio</DialogTitle><DialogDescription>A conta será associada ao registo escolhido; o sócio só verá os próprios dados. Será enviado um email para definir a senha.</DialogDescription></DialogHeader><form id="invite-user-form" onSubmit={invite} className="space-y-4"><div className="space-y-2"><Label>Sócio</Label><Select value={socioId} onValueChange={(value) => { const socio = socios.find((item) => item.id === value); setSocioId(value); setName(socio?.nome || ""); setEmail(socio?.email || "") }}><SelectTrigger><SelectValue placeholder="Selecionar sócio sem conta"/></SelectTrigger><SelectContent>{socios.filter((socio) => socio.estado === "ativo" && !socio.uid).map((socio) => <SelectItem key={socio.id} value={socio.id}>{socio.nome} · {socio.email}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="invite-name">Nome</Label><Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2}/></div><div className="space-y-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/></div></form><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" form="invite-user-form" disabled={loading || !socioId}>{loading ? "A criar…" : <><Plus className="mr-2 h-4 w-4"/>Criar conta</>}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(linkingUser)} onOpenChange={(value) => { if (!value) setLinkingUser(null) }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Associar conta existente</DialogTitle><DialogDescription>A conta {linkingUser?.email} será associada a um sócio com o mesmo email. Depois poderá consultar apenas o próprio registo.</DialogDescription></DialogHeader><form id="link-user-form" onSubmit={linkExistingUser} className="space-y-4"><div className="space-y-2"><Label>Sócio</Label><Select value={linkSocioId} onValueChange={setLinkSocioId}><SelectTrigger><SelectValue placeholder="Selecionar sócio sem conta"/></SelectTrigger><SelectContent>{socios.filter((socio) => socio.estado === "ativo" && !socio.uid).map((socio) => <SelectItem key={socio.id} value={socio.id}>{socio.nome} · {socio.email}</SelectItem>)}</SelectContent></Select></div></form><DialogFooter><Button type="button" variant="outline" onClick={() => setLinkingUser(null)}>Cancelar</Button><Button type="submit" form="link-user-form" disabled={loading || !linkSocioId}>{loading ? "A associar…" : "Associar conta"}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
