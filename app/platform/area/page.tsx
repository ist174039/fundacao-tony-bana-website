"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, LayoutDashboard, ShieldCheck, Users, WalletCards, UserRoundCog, School, PackageCheck, GraduationCap, FileText, Truck, Settings2, History, ChevronDown } from "lucide-react"
import { AreaOverview } from "@/components/area/area-overview"
import { SociosManager } from "@/components/area/socios-manager"
import { UsersManager } from "@/components/area/users-manager"
import { FinanceManager } from "@/components/area/finance-manager"
import { IntentionsManager } from "@/components/area/intentions-manager"
import { ProfileSettings } from "@/components/area/profile-settings"
import { SchoolsManager } from "@/components/area/schools-manager"
import { StudentsManager } from "@/components/area/students-manager"
import { SocialImpactDashboard } from "@/components/area/social-impact-dashboard"
import { MaterialReceptionsManager } from "@/components/area/material-receptions-manager"
import { MaterialDeliveriesManager } from "@/components/area/material-deliveries-manager"
import { DocumentWorkspaceManager } from "@/components/area/document-workspace-manager"
import { ModuleSettingsManager } from "@/components/area/module-settings-manager"
import { AuditLogManager } from "@/components/area/audit-log-manager"
import { MembershipLink } from "@/components/area/membership-link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { onAuthChange, signOut } from "@/lib/firebase-auth"
import { areaFetch } from "@/lib/area-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WorkspaceTemplate } from "@/components/workspace/app-shell"

export default function AreaPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [activeTab,setActiveTab]=useState("overview")
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>({core:true,education:true,logistics:true,documents:true,administration:false})
  const toggleGroup=(group:string)=>setOpenGroups(prev=>({...prev,[group]:!prev[group]}))
  const chooseTab=(value:string)=>{setActiveTab(value);const section=({overview:"core",socios:"core",finance:"core",profile:"core",schools:"education",students:"education",impact:"education",material:"logistics",deliveries:"logistics",documents:"documents",intentions:"administration",users:"administration",settings:"administration",audit:"administration"} as Record<string,string>)[value];if(section)setOpenGroups(prev=>({...prev,[section]:true}))}
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "socio" | "operational" | null>(null)
  const [accessError, setAccessError] = useState("")
  const [moduleStates,setModuleStates] = useState<Record<string,boolean> | null>(null)
  const [financePermissions,setFinancePermissions] = useState<{read:boolean;create:boolean}>({read:false,create:false})
  const [canReadReports,setCanReadReports]=useState(false)
  const onModuleChanged = useCallback((modules: Array<{id:string;enabled:boolean}>)=>setModuleStates(Object.fromEntries(modules.map(m=>[m.id,m.enabled]))),[])
  useEffect(()=>{if(!role||role==="socio")return; if(role==="admin"){void areaFetch<{ modules: Array<{id:string;enabled:boolean}> }>("/api/area/config/modules",{cache:"no-store"}).then(r=>onModuleChanged(r.modules)).catch(()=>setModuleStates(null))}else{void areaFetch<{modules:Record<string,boolean>;access:{finance:{read:boolean;create:boolean};reports:{read:boolean}}}>("/api/area/workspace-access",{cache:"no-store"}).then(r=>{setModuleStates(r.modules);setFinancePermissions(r.access.finance);setCanReadReports(r.access.reports.read)}).catch(()=>setModuleStates(null))}},[role,onModuleChanged])
  const isModuleEnabled=(id:string)=>moduleStates?.[id]===true

  useEffect(() => onAuthChange((user) => {
    if (!user) {
      router.replace("/platform/login")
      return
    }
    setEmail(user.email || "")
    void areaFetch<{ role: "admin" | "socio" | "operational" }>("/api/area/session")
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
  const isOperator = role === "operational"
  const canOpenModule=(id:string)=> (isAdmin||isOperator)&&isModuleEnabled(id)
  return <Tabs value={activeTab} onValueChange={chooseTab}>
    <WorkspaceTemplate product={isAdmin||isOperator ? "Gestão da Fundação" : "Portal de sócio"} title={isAdmin ? "Sócios e finanças" : isOperator ? "Operações" : "A minha área"} subtitle={isAdmin ? "Sócios, acessos e movimento financeiro" : isOperator ? "Módulos autorizados" : "Registo associativo, quotas e pagamentos"} email={email} onLogout={logout} headerLink={isAdmin ? { href: "/platform/admin", label: "Conteúdos do site" } : undefined} sidebar={role ? <div className="space-y-3"><div className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:pt-0">{isAdmin ? "Fundação" : "A minha conta"}</div><TabsList className="flex h-auto w-full flex-col items-stretch justify-start gap-2 rounded-lg bg-transparent p-0">{(true)&&<div className="w-full min-w-0 rounded-lg border border-border/60 bg-card/40 p-1"><button type="button" aria-expanded={openGroups.core===true} aria-controls="nav-group-core" onClick={()=>toggleGroup("core")} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span>Início e conta</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openGroups.core?'rotate-180':''}`}/></button><div id="nav-group-core" className={openGroups.core?'flex flex-col gap-1 pt-1':'hidden'}>{true&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="overview"><LayoutDashboard className="mr-2 h-4 w-4 shrink-0"/>Visão geral</TabsTrigger>}{!isOperator&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="socios"><Users className="mr-2 h-4 w-4 shrink-0"/>Sócios / Meu registo</TabsTrigger>}{(!isOperator||financePermissions.read)&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="finance"><WalletCards className="mr-2 h-4 w-4 shrink-0"/>Quotas e finanças</TabsTrigger>}{true&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="profile"><UserRoundCog className="mr-2 h-4 w-4 shrink-0"/>O meu perfil</TabsTrigger>}</div></div>}{(canOpenModule("schools")||canOpenModule("students")||((isAdmin||canReadReports)&&isModuleEnabled("students")&&isModuleEnabled("deliveries")))&&<div className="w-full min-w-0 rounded-lg border border-border/60 bg-card/40 p-1"><button type="button" aria-expanded={openGroups.education===true} aria-controls="nav-group-education" onClick={()=>toggleGroup("education")} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span>Educação e apoio</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openGroups.education?'rotate-180':''}`}/></button><div id="nav-group-education" className={openGroups.education?'flex flex-col gap-1 pt-1':'hidden'}>{canOpenModule("schools")&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="schools"><School className="mr-2 h-4 w-4 shrink-0"/>Escolas</TabsTrigger>}{canOpenModule("students")&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="students"><GraduationCap className="mr-2 h-4 w-4 shrink-0"/>Alunos</TabsTrigger>}{(isAdmin||canReadReports)&&isModuleEnabled("students")&&isModuleEnabled("deliveries")&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="impact"><LayoutDashboard className="mr-2 h-4 w-4 shrink-0"/>Impacto social</TabsTrigger>}</div></div>}{(canOpenModule("material")||canOpenModule("deliveries"))&&<div className="w-full min-w-0 rounded-lg border border-border/60 bg-card/40 p-1"><button type="button" aria-expanded={openGroups.logistics===true} aria-controls="nav-group-logistics" onClick={()=>toggleGroup("logistics")} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span>Doações e logística</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openGroups.logistics?'rotate-180':''}`}/></button><div id="nav-group-logistics" className={openGroups.logistics?'flex flex-col gap-1 pt-1':'hidden'}>{canOpenModule("material")&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="material"><PackageCheck className="mr-2 h-4 w-4 shrink-0"/>Doações materiais</TabsTrigger>}{canOpenModule("deliveries")&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="deliveries"><Truck className="mr-2 h-4 w-4 shrink-0"/>Entregas de doações</TabsTrigger>}</div></div>}{(canOpenModule("documents"))&&<div className="w-full min-w-0 rounded-lg border border-border/60 bg-card/40 p-1"><button type="button" aria-expanded={openGroups.documents===true} aria-controls="nav-group-documents" onClick={()=>toggleGroup("documents")} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span>Documentos</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openGroups.documents?'rotate-180':''}`}/></button><div id="nav-group-documents" className={openGroups.documents?'flex flex-col gap-1 pt-1':'hidden'}>{canOpenModule("documents")&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="documents"><FileText className="mr-2 h-4 w-4 shrink-0"/>Biblioteca documental</TabsTrigger>}</div></div>}{(isAdmin)&&<div className="w-full min-w-0 rounded-lg border border-border/60 bg-card/40 p-1"><button type="button" aria-expanded={openGroups.administration===true} aria-controls="nav-group-administration" onClick={()=>toggleGroup("administration")} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span>Administração</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openGroups.administration?'rotate-180':''}`}/></button><div id="nav-group-administration" className={openGroups.administration?'flex flex-col gap-1 pt-1':'hidden'}>{isAdmin&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="intentions"><ClipboardList className="mr-2 h-4 w-4 shrink-0"/>Contactos e pedidos</TabsTrigger>}{isAdmin&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="users"><ShieldCheck className="mr-2 h-4 w-4 shrink-0"/>Utilizadores</TabsTrigger>}{isAdmin&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="settings"><Settings2 className="mr-2 h-4 w-4 shrink-0"/>Configuração</TabsTrigger>}{isAdmin&&<TabsTrigger className="w-full min-h-11 justify-start rounded-md px-3 py-2 text-left text-sm whitespace-normal data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary" value="audit"><History className="mr-2 h-4 w-4 shrink-0"/>Auditoria</TabsTrigger>}</div></div>}</TabsList></div> : <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">Inicia sessão para consultar o teu espaço de trabalho.</div>}>
      <div className="mb-6 flex items-start gap-3 border-b border-border/70 pb-5"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5"/></div><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{isAdmin||isOperator ? "Gestão da Fundação" : "Espaço pessoal"}</div><h1 className="mt-1 text-2xl font-semibold tracking-tight">{isAdmin ? "Sócios e finanças" : isOperator ? "Operações autorizadas" : "Acompanha as tuas quotas"}</h1><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Acompanha sócios, acessos, quotas e doações." : isOperator ? "Os acessos respeitam os perfis e as permissões atribuídas." : "Consulta o teu registo, pagamentos e situação das quotas."}</p></div></div>
      {accessError ? <><Alert variant="destructive"><AlertDescription>{accessError}</AlertDescription></Alert><MembershipLink/></> : <div className="space-y-5">
        <TabsContent value="overview">{isOperator?<div className="rounded-lg border p-5 text-sm"><h2 className="font-semibold">Área operacional</h2><p className="mt-2 text-muted-foreground">Escolhe um módulo autorizado no menu. As ações são verificadas pelo servidor.</p></div>:<AreaOverview role={role} onViewDebts={()=>chooseTab('finance')}/>}</TabsContent>
        {!isOperator && <TabsContent value="socios"><SociosManager readOnly={role === "socio"}/></TabsContent>}
        {(!isOperator||financePermissions.read) && <TabsContent value="finance"><FinanceManager readOnly={role === "socio"||(isOperator&&!financePermissions.create)}/></TabsContent>}
        {role === "admin" && <TabsContent value="intentions"><IntentionsManager/></TabsContent>}
        {isAdmin && <TabsContent value="users"><UsersManager/></TabsContent>}
        {canOpenModule("schools") && <TabsContent value="schools"><SchoolsManager/></TabsContent>}
        {canOpenModule("students") && isModuleEnabled("deliveries") && <TabsContent value="impact"><SocialImpactDashboard/></TabsContent>}
        {canOpenModule("students") && <TabsContent value="students"><StudentsManager/></TabsContent>}
        {canOpenModule("material") && <TabsContent value="material"><MaterialReceptionsManager/></TabsContent>}
        {canOpenModule("deliveries") && <TabsContent value="deliveries"><MaterialDeliveriesManager/></TabsContent>}
        {canOpenModule("documents") && <TabsContent value="documents"><DocumentWorkspaceManager/></TabsContent>}
        {isAdmin && <TabsContent value="settings"><ModuleSettingsManager onChanged={onModuleChanged}/></TabsContent>}
        {isAdmin && <TabsContent value="audit"><AuditLogManager/></TabsContent>}
        <TabsContent value="profile"><ProfileSettings/></TabsContent>
      </div>}
    </WorkspaceTemplate>
  </Tabs>
}
