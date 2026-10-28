"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Ban, Eye, KeyRound, Link2, Plus, ShieldCheck, UserRound, UserRoundPlus } from "lucide-react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { areaFetch } from "@/lib/area-client"
import type { Socio } from "@/lib/firebase-firestore"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Drawer as Dialog, DrawerContent as DialogContent, DrawerDescription as DialogDescription, DrawerFooter as DialogFooter, DrawerHeader as DialogHeader, DrawerTitle as DialogTitle } from "@/components/workspace/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListControls } from "@/components/workspace/list-controls"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { UserAccessEditor } from "@/components/area/user-access-editor"

interface AreaUser { uid: string; email: string; displayName: string; disabled: boolean; createdAt: string; lastSignInAt: string | null; isAdmin: boolean; managedAdmin: boolean; linkedSocio: string | null }

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
  const [search, setSearch] = useState("")
  const [userFilter, setUserFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<AreaUser | null>(null)

  const refresh = useCallback(async () => {
    const [userData, socioData] = await Promise.all([
      areaFetch<{ users: AreaUser[] }>("/api/area/users"),
      areaFetch<{ socios: Socio[] }>("/api/area/socios"),
    ])
    setUsers(userData.users)
    setSocios(socioData.socios)
  }, [])

  useEffect(() => { void refresh().catch((e) => setError(e.message)) }, [refresh])

  const filteredUsers = users.filter((user) => `${user.displayName} ${user.email} ${user.linkedSocio || ""}`.toLowerCase().includes(search.toLowerCase()) && (userFilter === "all" || (userFilter === "active" && !user.disabled) || (userFilter === "disabled" && user.disabled) || (userFilter === "admin" && user.isAdmin) || (userFilter === "member" && !user.isAdmin)))
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / 10))
  const pageUsers = filteredUsers.slice((page - 1) * 10, page * 10)

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

  const changeRole = async (user: AreaUser) => {
    setError(""); setNotice("")
    try {
      await areaFetch("/api/area/users", { method: "PATCH", body: JSON.stringify({ uid: user.uid, admin: !user.isAdmin }) })
      setNotice(user.isAdmin ? `Permissões administrativas removidas de ${user.email}.` : `${user.email} agora tem permissões de administrador. A pessoa terá de iniciar sessão novamente.`)
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível alterar as permissões.") }
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
        <ListControls search={search} onSearchChange={(value) => { setSearch(value); setPage(1) }} placeholder="Pesquisar utilizador, email ou sócio" filter={userFilter} onFilterChange={(value) => { setUserFilter(value); setPage(1) }} filterOptions={[{ value: "all", label: "Todos os perfis" }, { value: "active", label: "Ativos" }, { value: "disabled", label: "Desativados" }, { value: "admin", label: "Administradores" }, { value: "member", label: "Utilizadores" }]} page={page} pageCount={pageCount} total={filteredUsers.length} onPageChange={setPage}/>
        {filteredUsers.length > 0 && <div className="space-y-3 md:hidden" aria-label="Utilizadores">{pageUsers.map(user=><article key={user.uid} className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{user.displayName||"Sem nome"}</p><p className="break-all text-xs text-muted-foreground">{user.email}</p></div><Badge variant={user.disabled?"destructive":"outline"}>{user.disabled?"Desativado":"Ativo"}</Badge></div><div className="mt-3 flex flex-wrap gap-2">{user.isAdmin?<Badge>Administrador</Badge>:<Badge variant="secondary">Utilizador</Badge>}{user.linkedSocio&&<Badge variant="outline">Sócio associado</Badge>}</div><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" className="col-span-2 min-h-11" onClick={()=>setSelectedUser(user)}><Eye className="mr-2 h-4 w-4"/>Detalhes e permissões</Button>{!user.linkedSocio&&<Button size="sm" variant="outline" className="min-h-11" onClick={()=>{setLinkingUser(user);setLinkSocioId("")}}>Associar sócio</Button>}{!user.disabled&&(user.managedAdmin||!user.isAdmin)&&<Button size="sm" variant="outline" className="min-h-11" onClick={()=>void changeRole(user)}>{user.isAdmin?"Remover admin":"Dar admin"}</Button>}<Button size="sm" variant="outline" className="min-h-11" disabled={user.disabled} onClick={()=>void resend(user)}>Reenviar acesso</Button><Button size="sm" variant="outline" className="min-h-11" onClick={()=>void toggle(user)}>{user.disabled?"Reativar":"Desativar"}</Button></div></article>)}</div>}
        {filteredUsers.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{users.length ? "Nenhum utilizador corresponde aos filtros." : "Ainda não existem utilizadores."}</div> : <div className="hidden overflow-x-auto md:block"><Table>
          <TableHeader><TableRow><TableHead>Utilizador</TableHead><TableHead>Perfil</TableHead><TableHead>Estado</TableHead><TableHead>Último acesso</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>{pageUsers.map((user) => <TableRow key={user.uid}>
            <TableCell><div className="font-medium">{user.displayName || "Sem nome"}</div><div className="text-xs text-muted-foreground">{user.email}{user.linkedSocio ? ` · Sócio: ${user.linkedSocio}` : ""}</div></TableCell>
            <TableCell>{user.isAdmin ? <Badge><ShieldCheck className="mr-1 h-3 w-3"/>Administrador</Badge> : <Badge variant="secondary"><UserRound className="mr-1 h-3 w-3"/>Utilizador</Badge>}</TableCell>
            <TableCell><Badge variant={user.disabled ? "destructive" : "outline"}>{user.disabled ? "Desativado" : "Ativo"}</Badge></TableCell>
            <TableCell className="text-sm text-muted-foreground">{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString("pt-PT") : "Nunca"}</TableCell>
            <TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setSelectedUser(user)}><Eye className="mr-1.5 h-4 w-4"/><span className="hidden sm:inline">Detalhes</span></Button>{!user.linkedSocio && <Button size="sm" variant="outline" onClick={() => { setLinkingUser(user); setLinkSocioId("") }}><Link2 className="mr-1.5 h-4 w-4"/><span className="hidden sm:inline">Associar sócio</span></Button>}{!user.disabled && (user.managedAdmin || !user.isAdmin) && <Button size="sm" variant="outline" onClick={() => void changeRole(user)}><ShieldCheck className="mr-1.5 h-4 w-4"/><span className="hidden sm:inline">{user.isAdmin ? "Remover admin" : "Dar admin"}</span></Button>}<Button size="sm" variant="outline" onClick={() => void resend(user)} disabled={user.disabled}><KeyRound className="mr-1.5 h-4 w-4"/><span className="hidden sm:inline">Reenviar acesso</span></Button><Button size="icon" variant="ghost" aria-label={user.disabled ? `Reativar ${user.email}` : `Desativar ${user.email}`} onClick={() => void toggle(user)}>{user.disabled ? <UserRoundPlus className="h-4 w-4"/> : <Ban className="h-4 w-4"/>}</Button></div></TableCell>
          </TableRow>)}</TableBody>
        </Table></div>}
      </CardContent>
    </Card>
    <Sheet open={Boolean(selectedUser)} onOpenChange={(value) => { if (!value) setSelectedUser(null) }}><SheetContent side="right" className="w-full max-w-full overflow-y-auto p-4 sm:max-w-lg sm:p-6"><SheetHeader><SheetTitle>{selectedUser?.displayName || "Utilizador"}</SheetTitle><SheetDescription>Detalhes e permissões da conta.</SheetDescription></SheetHeader>{selectedUser && <div className="mt-6 space-y-3 text-sm"><Detail label="Email" value={selectedUser.email}/><Detail label="Perfil" value={selectedUser.isAdmin ? "Administrador" : "Utilizador"}/><Detail label="Estado" value={selectedUser.disabled ? "Desativado" : "Ativo"}/><Detail label="Sócio associado" value={selectedUser.linkedSocio || "Sem associação"}/><Detail label="Criado em" value={selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("pt-PT") : "—"}/><Detail label="Último acesso" value={selectedUser.lastSignInAt ? new Date(selectedUser.lastSignInAt).toLocaleString("pt-PT") : "Nunca"}/><UserAccessEditor uid={selectedUser.uid} isAdmin={selectedUser.isAdmin}/></div>}</SheetContent></Sheet>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Dar acesso a um sócio</DialogTitle><DialogDescription>A conta será associada ao registo escolhido; o sócio só verá os próprios dados. Será enviado um email para definir a senha.</DialogDescription></DialogHeader><form id="invite-user-form" onSubmit={invite} className="space-y-4"><div className="space-y-2"><Label>Sócio</Label><Select value={socioId} onValueChange={(value) => { const socio = socios.find((item) => item.id === value); setSocioId(value); setName(socio?.nome || ""); setEmail(socio?.email || "") }}><SelectTrigger><SelectValue placeholder="Selecionar sócio sem conta"/></SelectTrigger><SelectContent>{socios.filter((socio) => socio.estado === "ativo" && !socio.uid).map((socio) => <SelectItem key={socio.id} value={socio.id}>{socio.nome} · {socio.email}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="invite-name">Nome</Label><Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2}/></div><div className="space-y-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/></div></form><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" form="invite-user-form" disabled={loading || !socioId}>{loading ? "A criar…" : <><Plus className="mr-2 h-4 w-4"/>Criar conta</>}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(linkingUser)} onOpenChange={(value) => { if (!value) setLinkingUser(null) }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Associar conta existente</DialogTitle><DialogDescription>A conta {linkingUser?.email} será associada a um sócio com o mesmo email. Depois poderá consultar apenas o próprio registo.</DialogDescription></DialogHeader><form id="link-user-form" onSubmit={linkExistingUser} className="space-y-4"><div className="space-y-2"><Label>Sócio</Label><Select value={linkSocioId} onValueChange={setLinkSocioId}><SelectTrigger><SelectValue placeholder="Selecionar sócio sem conta"/></SelectTrigger><SelectContent>{socios.filter((socio) => socio.estado === "ativo" && !socio.uid).map((socio) => <SelectItem key={socio.id} value={socio.id}>{socio.nome} · {socio.email}</SelectItem>)}</SelectContent></Select></div></form><DialogFooter><Button type="button" variant="outline" onClick={() => setLinkingUser(null)}>Cancelar</Button><Button type="submit" form="link-user-form" disabled={loading || !linkSocioId}>{loading ? "A associar…" : "Associar conta"}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

function Detail({ label, value }: { label: string; value?: string }) { return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value || "—"}</p></div> }
