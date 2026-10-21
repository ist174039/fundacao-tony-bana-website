"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, LayoutDashboard, LogOut, ShieldCheck, Users, WalletCards } from "lucide-react"
import { SociosManager } from "@/components/area/socios-manager"
import { UsersManager } from "@/components/area/users-manager"
import { FinanceManager } from "@/components/area/finance-manager"
import { IntentionsManager } from "@/components/area/intentions-manager"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { onAuthChange, signOut } from "@/lib/firebase-auth"
import { areaFetch } from "@/lib/area-client"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AreaPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "socio" | null>(null)
  const [accessError, setAccessError] = useState("")

  useEffect(() => onAuthChange((user) => {
    if (!user) {
      router.replace("/platform/login")
      return
    }
    setEmail(user.email || "")
    void areaFetch<{ role: "admin" | "socio" }>("/api/area/session")
      .then((access) => { setRole(access.role); setAccessError("") })
      .catch((error) => setAccessError(error instanceof Error ? error.message : "Esta conta não tem acesso à área."))
      .finally(() => setReady(true))
  }), [router])

  const logout = async () => {
    await signOut()
    router.replace("/platform/login")
  }

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">A verificar a sessão…</main>

  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Image src="/logo.jpg" alt="Fundação Tony Bana" width={40} height={40} className="rounded-full"/><div><h1 className="font-semibold">Área de trabalho</h1><p className="hidden text-xs text-muted-foreground sm:block">Fundação Tony Bana</p></div></div>
        <div className="flex items-center gap-3"><span className="hidden text-sm text-muted-foreground md:inline">{email}</span>{role === "admin" && <Button asChild variant="outline" size="sm"><Link href="/platform/admin"><LayoutDashboard className="mr-2 h-4 w-4"/>Conteúdos do site</Link></Button>}<Button variant="ghost" size="sm" onClick={() => void logout()} aria-label="Terminar sessão"><LogOut className="h-4 w-4"/><span className="ml-2 hidden sm:inline">Sair</span></Button></div>
      </div>
    </header>
    <main className="container max-w-7xl py-8 md:py-10">
      <div className="mb-7 max-w-2xl"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><ShieldCheck className="h-4 w-4"/>Gestão da Fundação</div><h2 className="text-3xl font-bold tracking-tight">{role === "socio" ? "Área do sócio" : "Sócios e finanças"}</h2><p className="mt-2 text-sm text-muted-foreground">{role === "socio" ? "Consulta o teu registo associativo, quotas e recebimentos." : "Um espaço de trabalho para acompanhar sócios, acessos, quotas e doações."}</p></div>
      {accessError ? <Alert variant="destructive"><AlertDescription>{accessError}</AlertDescription></Alert> :
      <Tabs defaultValue="socios" className="space-y-5">
        <TabsList className={`grid h-auto w-full gap-1 rounded-xl border border-border/70 bg-card p-1.5 ${role === "admin" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
          <TabsTrigger value="socios"><Users className="mr-2 h-4 w-4"/>{role === "socio" ? "Meu registo" : "Sócios"}</TabsTrigger>
          <TabsTrigger value="finance"><WalletCards className="mr-2 h-4 w-4"/>{role === "socio" ? "Quotas e pagamentos" : "Quotas e finanças"}</TabsTrigger>
          {role === "admin" && <TabsTrigger value="intentions"><ClipboardList className="mr-2 h-4 w-4"/>Pedidos de adesão</TabsTrigger>}
          {role === "admin" && <TabsTrigger value="users"><ShieldCheck className="mr-2 h-4 w-4"/>Utilizadores</TabsTrigger>}
        </TabsList>
        <TabsContent value="socios"><SociosManager readOnly={role === "socio"}/></TabsContent>
        <TabsContent value="finance"><FinanceManager readOnly={role === "socio"}/></TabsContent>
        {role === "admin" && <TabsContent value="intentions"><IntentionsManager/></TabsContent>}
        {role === "admin" && <TabsContent value="users"><UsersManager/></TabsContent>}
      </Tabs>
      }
      <p className="mt-6 text-xs text-muted-foreground">Acesso administrativo autorizado apenas a contas designadas pela Fundação.</p>
    </main>
  </div>
}
