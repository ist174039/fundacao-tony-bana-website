"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, CircleAlert, HandCoins, Users, WalletCards } from "lucide-react"
import { areaFetch } from "@/lib/area-client"
import { formatXof } from "@/lib/area-currency"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

type Role = "admin" | "socio"
type Summary = { members: number; activeMembers: number; pendingRequests: number; unpaid: number; overdue: number; paid: number; donations: number; quotaCount: number }
type Quota = { id:string; periodo:string; vencimento:string; valorMinor: number; pagoMinor: number; emDividaMinor: number; estado: string }
type Receipt = { tipo: "quota" | "doacao"; valorMinor: number }

const emptySummary: Summary = { members: 0, activeMembers: 0, pendingRequests: 0, unpaid: 0, overdue: 0, paid: 0, donations: 0, quotaCount: 0 }

export function AreaOverview({ role, onViewDebts }: { role: Role; onViewDebts?:()=>void }) {
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [debts,setDebts]=useState<Quota[]>([])
  const [selectedDebt,setSelectedDebt]=useState<Quota|null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError("")
      try {
        const [socioData, quotaData, receiptData, intentionData] = await Promise.all([
          areaFetch<{ socios: Array<{ estado?: string }> }>("/api/area/socios"),
          areaFetch<{ quotas: Quota[] }>("/api/area/quotas"),
          areaFetch<{ transactions: Receipt[] }>("/api/area/transactions"),
          role === "admin" ? areaFetch<{ intentions: Array<{ estado: string }> }>("/api/area/intentions") : Promise.resolve({ intentions: [] }),
        ])
        if (!active) return
        const quotas = quotaData.quotas
        setDebts(role==="socio"?quotas.filter(quota=>quota.emDividaMinor>0).sort((a,b)=>a.vencimento.localeCompare(b.vencimento)):[])
        const receipts = receiptData.transactions
        setSummary({
          members: socioData.socios.length,
          activeMembers: socioData.socios.filter((socio) => socio.estado === "ativo").length,
          pendingRequests: intentionData.intentions.filter((item) => item.estado === "pendente").length,
          unpaid: quotas.reduce((total, quota) => total + quota.emDividaMinor, 0),
          overdue: quotas.filter((quota) => quota.estado === "em_atraso").length,
          paid: quotas.reduce((total, quota) => total + quota.pagoMinor, 0),
          donations: receipts.filter((receipt) => receipt.tipo === "doacao").reduce((total, receipt) => total + receipt.valorMinor, 0),
          quotaCount: quotas.length,
        })
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o resumo.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [role])

  const metrics = role === "admin" ? [
    { label: "Sócios ativos", value: loading ? "—" : `${summary.activeMembers} / ${summary.members}`, detail: "Registos de sócios", icon: Users },
    { label: "Pedidos por tratar", value: loading ? "—" : String(summary.pendingRequests), detail: "Adesões e contactos", icon: CircleAlert },
    { label: "Quotas em dívida", value: loading ? "—" : formatXof(summary.unpaid), detail: "Saldo por regularizar", icon: WalletCards },
    { label: "Doações registadas", value: loading ? "—" : formatXof(summary.donations), detail: "Total recebido", icon: HandCoins },
  ] : [
    { label: "Saldo em dívida", value: loading ? "—" : formatXof(summary.unpaid), detail: "Valor por regularizar", icon: CircleAlert },
    { label: "Quotas por regularizar", value: loading ? "—" : String(debts.length), detail: "Períodos pendentes", icon: WalletCards },
    { label: "Quotas em atraso", value: loading ? "—" : String(summary.overdue), detail: "Após a data de vencimento", icon: CircleAlert },
    { label: "Total pago", value: loading ? "—" : formatXof(summary.paid), detail: "Pagamentos associados", icon: BadgeCheck },
  ]

  return <div className="space-y-5">
    <div className="border-b border-border/70 pb-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Visão geral</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{role === "admin" ? "Resumo da gestão" : "Resumo da tua conta"}</h2><p className="mt-1 text-sm text-muted-foreground">{role === "admin" ? "Acompanha os principais indicadores associativos e financeiros." : "Consulta rapidamente a situação das tuas quotas e pagamentos."}</p></div>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, detail, icon: Icon }) => <Card key={label} className="site-card"><CardContent className="flex min-h-32 items-start justify-between gap-3 p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 truncate text-xl font-semibold tracking-tight" aria-live="polite">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4"/></span></CardContent></Card>)}</div>
    {role==="socio"&&<Card className="site-card"><CardContent className="p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">As minhas dívidas</h3><p className="mt-1 text-sm text-muted-foreground">Consulta cada quota em aberto, o vencimento e o saldo por regularizar.</p></div>{onViewDebts&&<Button variant="outline" onClick={onViewDebts}>Ver todas as quotas</Button>}</div>{loading?<p className="mt-4 text-sm text-muted-foreground">A carregar quotas…</p>:debts.length===0?<p className="mt-4 rounded-lg border p-4 text-sm">Não tens quotas por regularizar.</p>:<div className="mt-4 space-y-2">{debts.slice(0,5).map(debt=><div key={debt.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium">Quota {debt.periodo}</p><p className="text-xs text-muted-foreground">Vencimento: {debt.vencimento} · {debt.estado==="em_atraso"?"Em atraso":debt.estado==="parcial"?"Parcial":"Pendente"}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><strong className="text-base">{formatXof(debt.emDividaMinor)}</strong><Button size="sm" variant="outline" onClick={()=>setSelectedDebt(debt)}>Detalhes</Button></div></div>)}</div>}</CardContent></Card>}
    <Sheet open={Boolean(selectedDebt)} onOpenChange={open=>{if(!open)setSelectedDebt(null)}}><SheetContent side="right" className="w-full max-w-full overflow-y-auto p-4 sm:max-w-lg sm:p-6"><SheetHeader><SheetTitle>Detalhes da quota {selectedDebt?.periodo}</SheetTitle><SheetDescription>Valores e estado associados ao teu registo de sócio.</SheetDescription></SheetHeader>{selectedDebt&&<div className="mt-6 space-y-3">{([{label:"Valor da quota",value:formatXof(selectedDebt.valorMinor)},{label:"Total pago",value:formatXof(selectedDebt.pagoMinor)},{label:"Em dívida",value:formatXof(selectedDebt.emDividaMinor)},{label:"Vencimento",value:selectedDebt.vencimento},{label:"Estado",value:selectedDebt.estado==="em_atraso"?"Em atraso":selectedDebt.estado==="parcial"?"Parcial":selectedDebt.estado==="paga"?"Paga":"Pendente"}]).map(item=><div key={item.label} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-semibold">{item.value}</p></div>)}{onViewDebts&&<Button onClick={()=>{setSelectedDebt(null);onViewDebts()}}>Consultar movimentos e pagamentos</Button>}</div>}</SheetContent></Sheet>
    <Card className="site-card"><CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{role === "admin" ? "Gestão num só lugar" : "Acompanha a tua situação"}</p><p className="mt-1 text-sm text-muted-foreground">{role === "admin" ? "Usa a navegação para gerir sócios, utilizadores, pedidos e movimentos financeiros." : "Consulta os detalhes de cada período e o histórico de pagamentos nas respetivas secções."}</p></div><span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex"><Users className="h-5 w-5"/></span></CardContent></Card>
  </div>
}
