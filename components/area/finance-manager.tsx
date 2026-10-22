"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { ArrowDownToLine, CircleCheck, CircleDollarSign, Clock3, HandCoins, Plus, ReceiptText, TrendingUp, Eye } from "lucide-react"
import { areaFetch } from "@/lib/area-client"
import type { Socio } from "@/lib/firebase-firestore"
import { formatXof } from "@/lib/area-currency"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface Quota { id: string; socioId: string; socioNome: string; periodo: string; vencimento: string; valorMinor: number; pagoMinor: number; emDividaMinor: number; estado: "pendente" | "parcial" | "paga" | "em_atraso" }
interface Receipt { id: string; tipo: "quota" | "doacao"; valorMinor: number; data: string; metodo: string; socioNome?: string; periodo?: string; doador?: string; anonymous?: boolean; notas?: string }
const today = () => new Date().toISOString().slice(0, 10)
const formatAmount = formatXof

export function FinanceManager({ readOnly = false }: { readOnly?: boolean }) {
  const [quotas, setQuotas] = useState<Quota[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const [quotaOpen, setQuotaOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [quotaDetail, setQuotaDetail] = useState<Quota | null>(null)
  const [quotaDetailOpen, setQuotaDetailOpen] = useState(false)
  const [receiptType, setReceiptType] = useState<"quota" | "doacao">("doacao")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [quotaForm, setQuotaForm] = useState({ socioId: "", periodo: new Date().toISOString().slice(0, 7), vencimento: today(), valor: "" })
  const [receiptForm, setReceiptForm] = useState({ obligationId: "", socioId: "", valor: "", data: today(), metodo: "transferencia", doador: "", anonymous: false, notas: "" })

  const refresh = useCallback(async () => {
    const [quotaData, receiptData, socioData] = await Promise.all([
      areaFetch<{ quotas: Quota[] }>("/api/area/quotas"),
      areaFetch<{ transactions: Receipt[] }>("/api/area/transactions"),
      areaFetch<{ socios: Socio[] }>("/api/area/socios"),
    ])
    setQuotas(quotaData.quotas)
    setReceipts(receiptData.transactions)
    setSocios(socioData.socios)
  }, [])

  useEffect(() => { void refresh().catch((e) => setError(e.message)) }, [refresh])

  const openQuotas = useMemo(() => quotas.filter((quota) => quota.emDividaMinor > 0), [quotas])
  const donations = useMemo(() => receipts.filter((receipt) => receipt.tipo === "doacao"), [receipts])
  const donationsTotal = donations.reduce((total, receipt) => total + receipt.valorMinor, 0)
  const quotasOpenTotal = openQuotas.reduce((total, quota) => total + quota.emDividaMinor, 0)
  const quotasPaidTotal = quotas.reduce((total, quota) => total + quota.pagoMinor, 0)
  const quotasTotal = quotas.reduce((total, quota) => total + quota.valorMinor, 0)
  const overdueQuotas = openQuotas.filter((quota) => quota.estado === "em_atraso")
  const overdueTotal = overdueQuotas.reduce((total, quota) => total + quota.emDividaMinor, 0)
  const paymentProgress = quotasTotal > 0 ? Math.min(100, Math.round((quotasPaidTotal / quotasTotal) * 100)) : 0

  const createQuota = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(""); setNotice("")
    try {
      await areaFetch("/api/area/quotas", { method: "POST", body: JSON.stringify(quotaForm) })
      setQuotaOpen(false); setQuotaForm((form) => ({ ...form, socioId: "", valor: "" })); setNotice("Quota criada com sucesso."); await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível criar a quota.") }
    finally { setLoading(false) }
  }

  const createReceipt = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(""); setNotice("")
    try {
      await areaFetch("/api/area/transactions", { method: "POST", body: JSON.stringify({ ...receiptForm, tipo: receiptType }) })
      setReceiptOpen(false); setReceiptForm({ obligationId: "", socioId: "", valor: "", data: today(), metodo: "transferencia", doador: "", anonymous: false, notas: "" }); setNotice(receiptType === "doacao" ? "Doação registada." : "Pagamento registado e quota reconciliada."); await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível registar o recebimento.") }
    finally { setLoading(false) }
  }

  const selectedPaymentQuota = openQuotas.find((quota) => quota.id === receiptForm.obligationId)

  return <div className="space-y-5">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {notice && <Alert><AlertDescription>{notice}</AlertDescription></Alert>}
    {readOnly ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="site-card"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Total em dívida</p><p className="mt-1 text-xl font-semibold">{formatAmount(quotasOpenTotal)}</p><p className="mt-1 text-xs text-muted-foreground">{openQuotas.length} quota{openQuotas.length === 1 ? "" : "s"} por regularizar</p></div><ArrowDownToLine className="h-5 w-5 text-primary"/></CardContent></Card>
      <Card className="site-card"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Em atraso</p><p className="mt-1 text-xl font-semibold">{formatAmount(overdueTotal)}</p><p className="mt-1 text-xs text-muted-foreground">{overdueQuotas.length} quota{overdueQuotas.length === 1 ? "" : "s"} após o vencimento</p></div><Clock3 className={`h-5 w-5 ${overdueQuotas.length ? "text-destructive" : "text-primary"}`}/></CardContent></Card>
      <Card className="site-card"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Total pago</p><p className="mt-1 text-xl font-semibold">{formatAmount(quotasPaidTotal)}</p><p className="mt-1 text-xs text-muted-foreground">De {formatAmount(quotasTotal)} em quotas</p></div><CircleCheck className="h-5 w-5 text-primary"/></CardContent></Card>
      <Card className="site-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Progresso das quotas</p><p className="mt-1 text-xl font-semibold">{paymentProgress}%</p></div><TrendingUp className="h-5 w-5 text-primary"/></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${paymentProgress}%` }}/></div><p className="mt-2 text-xs text-muted-foreground">{quotas.length} período{quotas.length === 1 ? "" : "s"} acompanhado{quotas.length === 1 ? "" : "s"}</p></CardContent></Card>
    </div> : <div className="grid gap-3 sm:grid-cols-3">
      <Card className="site-card"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Quotas em dívida</p><p className="mt-1 text-xl font-semibold">{formatAmount(quotasOpenTotal)}</p></div><ArrowDownToLine className="h-5 w-5 text-primary"/></CardContent></Card>
      <Card className="site-card"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Doações registadas</p><p className="mt-1 text-xl font-semibold">{formatAmount(donationsTotal)}</p></div><HandCoins className="h-5 w-5 text-primary"/></CardContent></Card>
      <Card className="site-card"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Movimentos registados</p><p className="mt-1 text-xl font-semibold">{receipts.length}</p></div><ReceiptText className="h-5 w-5 text-primary"/></CardContent></Card>
    </div>}

    <Tabs defaultValue="quotas" className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><TabsList><TabsTrigger value="quotas">Quotas</TabsTrigger><TabsTrigger value="receipts">Recebimentos e doações</TabsTrigger></TabsList>{!readOnly && <div className="flex gap-2"><Button variant="outline" onClick={() => { setError(""); setQuotaOpen(true) }}><Plus className="mr-2 h-4 w-4"/>Criar quota</Button><Button onClick={() => { setError(""); setReceiptType("doacao"); setReceiptOpen(true) }}><CircleDollarSign className="mr-2 h-4 w-4"/>Registar recebimento</Button></div>}</div>
      <TabsContent value="quotas"><Card className="site-card overflow-hidden"><CardHeader><CardTitle className="text-lg">Quotas por sócio e período</CardTitle><p className="text-sm text-muted-foreground">O saldo é calculado a partir dos pagamentos registados; os movimentos ficam no histórico.</p></CardHeader><CardContent>
        {quotas.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{readOnly ? "Ainda não há quotas associadas ao teu registo." : "Ainda não há quotas criadas."}</div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow>{!readOnly && <TableHead>Sócio</TableHead>}<TableHead>Período</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Pago</TableHead><TableHead>Em dívida</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{quotas.map((quota) => <TableRow key={quota.id}>{!readOnly && <TableCell className="font-medium">{quota.socioNome}</TableCell>}<TableCell>{quota.periodo}</TableCell><TableCell>{quota.vencimento}</TableCell><TableCell>{formatAmount(quota.valorMinor)}</TableCell><TableCell>{formatAmount(quota.pagoMinor)}</TableCell><TableCell className={quota.emDividaMinor > 0 ? "font-medium" : "text-muted-foreground"}>{formatAmount(quota.emDividaMinor)}</TableCell><TableCell><Badge variant={quota.estado === "paga" ? "default" : quota.estado === "parcial" ? "secondary" : quota.estado === "em_atraso" ? "destructive" : "outline"}>{quota.estado === "paga" ? "Paga" : quota.estado === "parcial" ? "Parcial" : quota.estado === "em_atraso" ? "Em atraso" : "Pendente"}</Badge></TableCell><TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => { setQuotaDetail(quota); setQuotaDetailOpen(true) }}><Eye className="mr-1.5 h-4 w-4"/><span className="sr-only sm:not-sr-only">Detalhes</span></Button>{!readOnly && quota.emDividaMinor > 0 && <Button size="sm" variant="outline" onClick={() => { setReceiptType("quota"); setReceiptForm((form) => ({ ...form, obligationId: quota.id, valor: String(quota.emDividaMinor) })); setReceiptOpen(true) }}>Registar pagamento</Button>}</div></TableCell></TableRow>)}</TableBody></Table></div>}
      </CardContent></Card></TabsContent>
      <TabsContent value="receipts"><Card className="site-card overflow-hidden"><CardHeader><CardTitle className="text-lg">Histórico de recebimentos</CardTitle><p className="text-sm text-muted-foreground">Os movimentos não podem ser editados ou eliminados nesta versão.</p></CardHeader><CardContent>
        {receipts.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Ainda não há recebimentos ou doações registados.</div> : <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Origem</TableHead><TableHead>Método</TableHead><TableHead>Valor</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader><TableBody>{receipts.map((receipt) => <TableRow key={receipt.id}><TableCell>{receipt.data}</TableCell><TableCell><Badge variant={receipt.tipo === "doacao" ? "secondary" : "outline"}>{receipt.tipo === "doacao" ? "Doação" : "Quota"}</Badge></TableCell><TableCell>{receipt.tipo === "doacao" ? (receipt.anonymous ? "Anónima" : receipt.doador || "—") : `${receipt.socioNome || "Sócio"} · ${receipt.periodo || ""}`}</TableCell><TableCell className="capitalize">{receipt.metodo}</TableCell><TableCell className="font-medium">{formatAmount(receipt.valorMinor)}</TableCell><TableCell className="max-w-48 truncate text-muted-foreground">{receipt.notas || "—"}</TableCell></TableRow>)}</TableBody></Table>}
      </CardContent></Card></TabsContent>
    </Tabs>

    <Sheet open={quotaDetailOpen} onOpenChange={setQuotaDetailOpen}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pr-8">
          <SheetTitle>Quota · {quotaDetail?.periodo}</SheetTitle>
          <SheetDescription>{quotaDetail?.socioNome} · vence a {quotaDetail?.vencimento}</SheetDescription>
        </SheetHeader>
        {quotaDetail && <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between rounded-lg border bg-card p-4"><span className="text-sm text-muted-foreground">Estado</span><Badge variant={quotaDetail.estado === "paga" ? "default" : quotaDetail.estado === "parcial" ? "secondary" : quotaDetail.estado === "em_atraso" ? "destructive" : "outline"}>{quotaDetail.estado === "paga" ? "Paga" : quotaDetail.estado === "parcial" ? "Parcial" : quotaDetail.estado === "em_atraso" ? "Em atraso" : "Pendente"}</Badge></div>
          <div className="grid grid-cols-3 gap-2">{[{ label: "Valor", amount: quotaDetail.valorMinor }, { label: "Pago", amount: quotaDetail.pagoMinor }, { label: "Em dívida", amount: quotaDetail.emDividaMinor }].map((item) => <div key={item.label} className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-sm font-semibold">{formatAmount(item.amount)}</p></div>)}</div>
          <section className="space-y-2"><h3 className="text-sm font-semibold">Movimentos desta quota</h3>{receipts.filter((receipt) => receipt.tipo === "quota" && receipt.socioNome === quotaDetail.socioNome && receipt.periodo === quotaDetail.periodo).length ? <div className="divide-y rounded-lg border">{receipts.filter((receipt) => receipt.tipo === "quota" && receipt.socioNome === quotaDetail.socioNome && receipt.periodo === quotaDetail.periodo).map((receipt) => <div key={receipt.id} className="flex items-center justify-between gap-3 p-3 text-sm"><div><p className="font-medium">{receipt.data}</p><p className="text-xs capitalize text-muted-foreground">{receipt.metodo}</p></div><span className="font-medium">{formatAmount(receipt.valorMinor)}</span></div>)}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Ainda não há pagamentos associados a este período.</p>}</section>
        </div>}
      </SheetContent>
    </Sheet>

    {!readOnly && <Dialog open={quotaOpen} onOpenChange={setQuotaOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Criar quota</DialogTitle><DialogDescription>Regista a obrigação do sócio por um período. Pagamentos podem ser feitos em parcelas.</DialogDescription></DialogHeader><form id="quota-form" onSubmit={createQuota} className="space-y-4"><div className="space-y-2"><Label>Sócio</Label><Select value={quotaForm.socioId} onValueChange={(socioId) => setQuotaForm({ ...quotaForm, socioId })}><SelectTrigger><SelectValue placeholder="Selecionar sócio"/></SelectTrigger><SelectContent>{socios.filter((s) => s.estado === "ativo").map((socio) => <SelectItem key={socio.id} value={socio.id}>{socio.nome}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="quota-period">Período</Label><Input id="quota-period" type="month" required value={quotaForm.periodo} onChange={(e) => setQuotaForm({ ...quotaForm, periodo: e.target.value })}/></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quota-due">Vencimento</Label><Input id="quota-due" type="date" required value={quotaForm.vencimento} onChange={(e) => setQuotaForm({ ...quotaForm, vencimento: e.target.value })}/></div><div className="space-y-2"><Label htmlFor="quota-amount">Valor (XOF)</Label><Input id="quota-amount" type="number" min="1" step="1" required value={quotaForm.valor} onChange={(e) => setQuotaForm({ ...quotaForm, valor: e.target.value })}/></div></div></form><DialogFooter><Button variant="outline" type="button" onClick={() => setQuotaOpen(false)}>Cancelar</Button><Button form="quota-form" type="submit" disabled={loading || socios.every((s) => s.estado !== "ativo")}>{loading ? "A guardar…" : "Criar quota"}</Button></DialogFooter></DialogContent></Dialog>}

    {!readOnly && <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Registar recebimento</DialogTitle><DialogDescription>Este movimento será guardado no histórico e não poderá ser apagado.</DialogDescription></DialogHeader><form id="receipt-form" onSubmit={createReceipt} className="space-y-4"><div className="space-y-2"><Label>Tipo</Label><Select value={receiptType} onValueChange={(value: "quota" | "doacao") => { setReceiptType(value); setReceiptForm({ ...receiptForm, obligationId: "" }) }}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="doacao">Doação</SelectItem><SelectItem value="quota">Pagamento de quota</SelectItem></SelectContent></Select></div>
      {receiptType === "quota" ? <div className="space-y-2"><Label>Quota</Label><Select value={receiptForm.obligationId} onValueChange={(obligationId) => { const quota = openQuotas.find((item) => item.id === obligationId); setReceiptForm({ ...receiptForm, obligationId, valor: quota ? String(quota.emDividaMinor) : "" }) }}><SelectTrigger><SelectValue placeholder="Selecionar sócio e período"/></SelectTrigger><SelectContent>{openQuotas.map((quota) => <SelectItem key={quota.id} value={quota.id}>{quota.socioNome} · {quota.periodo} · dívida {formatAmount(quota.emDividaMinor)}</SelectItem>)}</SelectContent></Select></div> : <><div className="space-y-2"><Label htmlFor="donor-name">Nome do doador</Label><Input id="donor-name" value={receiptForm.doador} disabled={receiptForm.anonymous} required={!receiptForm.anonymous} onChange={(e) => setReceiptForm({ ...receiptForm, doador: e.target.value })}/><label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={receiptForm.anonymous} onChange={(e) => setReceiptForm({ ...receiptForm, anonymous: e.target.checked })}/>Registar como doação anónima</label></div><div className="space-y-2"><Label htmlFor="donation-member">Associar a sócio (opcional)</Label><Select value={receiptForm.socioId || "none"} onValueChange={(socioId) => setReceiptForm({ ...receiptForm, socioId: socioId === "none" ? "" : socioId })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Sem associação</SelectItem>{socios.map((socio) => <SelectItem key={socio.id} value={socio.id}>{socio.nome}</SelectItem>)}</SelectContent></Select></div></>}
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="receipt-amount">Valor (XOF)</Label><Input id="receipt-amount" type="number" min="1" step="1" required value={receiptForm.valor} max={receiptType === "quota" && selectedPaymentQuota ? String(selectedPaymentQuota.emDividaMinor) : undefined} onChange={(e) => setReceiptForm({ ...receiptForm, valor: e.target.value })}/></div><div className="space-y-2"><Label htmlFor="receipt-date">Data</Label><Input id="receipt-date" type="date" required value={receiptForm.data} onChange={(e) => setReceiptForm({ ...receiptForm, data: e.target.value })}/></div></div>
      <div className="space-y-2"><Label>Método</Label><Select value={receiptForm.metodo} onValueChange={(metodo) => setReceiptForm({ ...receiptForm, metodo })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="transferencia">Transferência</SelectItem><SelectItem value="multicaixa">Multicaixa</SelectItem><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="receipt-notes">Referência / observações</Label><Input id="receipt-notes" maxLength={1000} value={receiptForm.notas} onChange={(e) => setReceiptForm({ ...receiptForm, notas: e.target.value })}/></div>
    </form><DialogFooter><Button variant="outline" type="button" onClick={() => setReceiptOpen(false)}>Cancelar</Button><Button type="submit" form="receipt-form" disabled={loading || (receiptType === "quota" && openQuotas.length === 0)}>{loading ? "A registar…" : "Confirmar recebimento"}</Button></DialogFooter></DialogContent></Dialog>}
  </div>
}
