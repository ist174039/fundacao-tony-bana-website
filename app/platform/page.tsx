"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpRight, LayoutDashboard, LogOut, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { onAuthChange, signOut } from "@/lib/firebase-auth"
import { areaFetch } from "@/lib/area-client"

type AccessRole = "admin" | "socio"

export default function PlatformPage() {
  const router = useRouter()
  const [role, setRole] = useState<AccessRole | null>(null)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)

  useEffect(() => onAuthChange((user) => {
    if (!user) {
      router.replace("/platform/login")
      return
    }
    setEmail(user.email || "")
    void areaFetch<{ role: AccessRole }>("/api/area/session")
      .then((access) => { setRole(access.role); setError("") })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar as permissões da conta."))
      .finally(() => setReady(true))
  }), [router])

  const logout = async () => {
    await signOut()
    router.replace("/platform/login")
  }

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">A carregar a plataforma…</main>

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border/70 bg-background/90">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Image src="/logo.jpg" alt="Fundação Tony Bana" width={40} height={40} className="rounded-full"/><div><p className="font-semibold">Plataforma da Fundação</p><p className="hidden text-xs text-muted-foreground sm:block">{email}</p></div></div>
        <Button variant="ghost" size="sm" onClick={() => void logout()}><LogOut className="mr-2 h-4 w-4"/>Sair</Button>
      </div>
    </header>
    <main className="container max-w-5xl py-10 md:py-14">
      <div className="mb-8 max-w-2xl"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Espaço de trabalho</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Onde queres trabalhar?</h1><p className="mt-3 text-muted-foreground">As opções apresentadas dependem das permissões da tua conta.</p></div>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : <div className="grid gap-5 md:grid-cols-2">
        {role === "admin" && <Link href="/platform/admin" className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="site-card h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg"><CardHeader><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><LayoutDashboard className="h-6 w-6"/></div><CardTitle className="flex items-center justify-between">Administração do site<ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/></CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Gere notícias, equipa, parceiros e galerias publicados no site.</p></CardContent></Card></Link>}
        <Link href="/platform/area" className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="site-card h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg"><CardHeader><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><UsersRound className="h-6 w-6"/></div><CardTitle className="flex items-center justify-between">{role === "admin" ? "Gestão de sócios e finanças" : "Área do sócio"}<ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/></CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{role === "admin" ? "Acompanha sócios, acessos, quotas, pagamentos e doações." : "Consulta o teu registo associativo, quotas e recebimentos."}</p></CardContent></Card></Link>
      </div>}
    </main>
  </div>
}
