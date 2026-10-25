"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, LayoutDashboard, ShieldCheck, Users, WalletCards, UserRoundCog, School, PackageCheck } from "lucide-react"
import { AreaOverview } from "@/components/area/area-overview"
import { SociosManager } from "@/components/area/socios-manager"
import { UsersManager } from "@/components/area/users-manager"
import { FinanceManager } from "@/components/area/finance-manager"
import { IntentionsManager } from "@/components/area/intentions-manager"
import { ProfileSettings } from "@/components/area/profile-settings"
import { SchoolsManager } from "@/components/area/schools-manager"
import { MaterialReceptionsManager } from "@/components/area/material-receptions-manager"
import { MembershipLink } from "@/components/area/membership-link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { onAuthChange, signOut } from "@/lib/firebase-auth"
import { areaFetch } from "@/lib/area-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WorkspaceTemplate } from "@/components/workspace/app-shell"

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

  const isAdmin = role === "admin"
  return <Tabs defaultValue="overview">
    <WorkspaceTemplate product={isAdmin ? "Gestão da Fundação" : "Portal de sócio"} title={isAdmin ? "Sócios e finanças" : "A minha área"} subtitle={isAdmin ? "Sócios, acessos e movimento financeiro" : "Registo associativo, quotas e pagamentos"} email={email} onLogout={logout} headerLink={isAdmin ? { href: "/platform/admin", label: "Conteúdos do site" } : undefined} sidebar={role ? <div className="space-y-3"><div className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:pt-0">{isAdmin ? "Fundação" : "A minha conta"}</div><TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg bg-transparent p-0 lg:flex-col lg:items-stretch lg:overflow-visible">
      <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="overview"><LayoutDashboard className="mr-2 h-4 w-4"/>Visão geral</TabsTrigger>
      <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="socios"><Users className="mr-2 h-4 w-4"/>{isAdmin ? "Sócios" : "Meu registo"}</TabsTrigger>
      <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="finance"><WalletCards className="mr-2 h-4 w-4"/>{isAdmin ? "Quotas e finanças" : "Quotas e pagamentos"}</TabsTrigger>
      {isAdmin && <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="intentions"><ClipboardList className="mr-2 h-4 w-4"/>Contactos e pedidos</TabsTrigger>}
      {isAdmin && <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="users"><ShieldCheck className="mr-2 h-4 w-4"/>Utilizadores</TabsTrigger>
      {isAdmin && <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm" value="schools"><School className="mr-2 h-4 w-4"/>Escolas</TabsTrigger>}
      {isAdmin && <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm" value="material"><PackageCheck className="mr-2 h-4 w-4"/>Doações materiais</TabsTrigger>}}
      <TabsTrigger className="justify-start whitespace-nowrap rounded-md px-3 py-2 text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none" value="profile"><UserRoundCog className="mr-2 h-4 w-4"/>O meu perfil</TabsTrigger>
    </TabsList></div> : <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">Inicia sessão para consultar o teu espaço de trabalho.</div>}>
      <div className="mb-6 flex items-start gap-3 border-b border-border/70 pb-5"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5"/></div><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{isAdmin ? "Gestão da Fundação" : "Espaço pessoal"}</div><h1 className="mt-1 text-2xl font-semibold tracking-tight">{isAdmin ? "Sócios e finanças" : "Acompanha as tuas quotas"}</h1><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Acompanha sócios, acessos, quotas e doações." : "Consulta o teu registo, pagamentos e situação das quotas."}</p></div></div>
      {accessError ? <><Alert variant="destructive"><AlertDescription>{accessError}</AlertDescription></Alert><MembershipLink/></> : <div className="space-y-5">
        <TabsContent value="overview"><AreaOverview role={role!}/></TabsContent>
        <TabsContent value="socios"><SociosManager readOnly={role === "socio"}/></TabsContent>
        <TabsContent value="finance"><FinanceManager readOnly={role === "socio"}/></TabsContent>
        {role === "admin" && <TabsContent value="intentions"><IntentionsManager/></TabsContent>}
        {role === "admin" && <TabsContent value="users"><UsersManager/></TabsContent>}
        {isAdmin && <TabsContent value="schools"><SchoolsManager/></TabsContent>}
        {isAdmin && <TabsContent value="material"><MaterialReceptionsManager/></TabsContent>}
        <TabsContent value="profile"><ProfileSettings/></TabsContent>
      </div>}
    </WorkspaceTemplate>
  </Tabs>
}
