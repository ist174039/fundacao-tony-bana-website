"use client"

import { useEffect, useState, type FormEvent } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { KeyRound, Save, UserRoundCog } from "lucide-react"
import { auth } from "@/lib/firebase"
import { areaFetch } from "@/lib/area-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Profile { email: string; displayName: string; role: "admin" | "socio" }

export function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    void areaFetch<Profile>("/api/area/profile").then((value) => { setProfile(value); setName(value.displayName) }).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar o perfil."))
  }, [])

  const save = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(""); setNotice("")
    try {
      const value = await areaFetch<{ displayName: string }>("/api/area/profile", { method: "PATCH", body: JSON.stringify({ displayName: name }) })
      setName(value.displayName); setNotice("Nome atualizado.")
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar o perfil.") }
    finally { setLoading(false) }
  }

  const resetPassword = async () => {
    setError(""); setNotice("")
    if (!profile?.email) return
    try { await sendPasswordResetEmail(auth, profile.email); setNotice(`Enviámos para ${profile.email} um link seguro para alterar a senha.`) }
    catch { setError("Não foi possível enviar o email para alterar a senha. Tenta novamente mais tarde.") }
  }

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
    <Card className="site-card"><CardHeader><CardTitle className="flex items-center gap-2"><UserRoundCog className="h-5 w-5 text-primary"/>O meu perfil</CardTitle><CardDescription>Atualiza os teus dados de acesso à Fundação.</CardDescription></CardHeader><CardContent>
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}{notice && <Alert className="mb-4"><AlertDescription>{notice}</AlertDescription></Alert>}
      <form onSubmit={save} className="max-w-xl space-y-4"><div className="space-y-2"><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required /></div><div className="space-y-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" value={profile?.email ?? ""} readOnly disabled/><p className="text-xs text-muted-foreground">Para alterar o email, contacta um administrador.</p></div><Button disabled={loading || !name.trim()}><Save className="mr-2 h-4 w-4"/>{loading ? "A guardar…" : "Guardar alterações"}</Button></form>
    </CardContent></Card>
    <Card className="site-card"><CardHeader><CardTitle>Segurança</CardTitle><CardDescription>Altera a senha através de um link enviado para o email da conta.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-xl border bg-muted/30 p-4"><p className="text-sm font-medium">Senha de acesso</p><p className="mt-1 text-sm text-muted-foreground">Receberás um link seguro para definir uma nova senha.</p></div><Button variant="outline" onClick={() => void resetPassword()} disabled={!profile?.email}><KeyRound className="mr-2 h-4 w-4"/>Enviar link para alterar senha</Button></CardContent></Card>
  </div>
}
