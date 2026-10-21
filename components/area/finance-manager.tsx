"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { ArrowDownToLine, CircleDollarSign, HandCoins, Plus, ReceiptText } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface Quota { id: string; socioId: string; socioNome: string; periodo: string; vencimento: string; valorMinor: number; pagoMinor: number; emDividaMinor: number; estado: "pendente" | "parcial" | "paga" }
interface Receipt { id: string; tipo: "quota" | "doacao"; valorMinor: number; data: string; metodo: string; socioNome?: string; periodo?: string; doador?: string; anonymous?: boolean; notas?: string }
const today = () => new Date().toISOString().slice(0, 10)
const eurosAOA = (minor: number) => new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" }).format(minor / 100)

export function FinanceManager({ readOnly = false }: { readOnly?: boolean }) {
  const [quotas, setQuotas] = useState<Quota[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const [quotaOpen, setQuotaOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
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

  const selectedQuota = openQuotas.find((quota) => quota.id === receiptForm.obligationId)

  return <div className="space-y-5">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {notice && <Alert><AlertDescription>{notice}</AlertDescription></Alert>}
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="site-card"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Quotas em dívida</p><p className="mt-1 text-xl font-semibold">{eurosAOA(quotasOpenTotal)}</p></div><ArrowDownToLine className="h-5 w-5 text-primary"/></CardContent></Card>
      <Card className="site-card"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Doações registadas</p><p className="mt-1 text-xl font-semibold">{eurosAOA(donationsTotal)}</p></div><HandCoins className="h-5 w-5 text-primary"/></CardContent></Card>
      <Card className="site-card"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Movimentos registados</p><p className="mt-1 text-xl font-semibold">{receipts.length}</p></div><ReceiptText className="h-5 w-5 text-primary"/></CardContent></Card>
    </div>

    <Tabs defaultValue="quotas" className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><TabsList><TabsTrigger value="quotas">Quotas</TabsTrigger><TabsTrigger value="receipts">Recebimentos e doações</TabsTrigger></TabsList>{!readOnly && <div className="flex gap-2"><Button variant="outline" onClick={() => { setError(""); setQuotaOpen(true) }}><Plus className="mr-2 h-4 w-4"/>Criar quota</Button><Button onClick={() => { setError(""); setReceiptType("doacao"); setReceiptOpen(true) }}><CircleDollarSign className="mr-2 h-4 w-4"/>Registar recebimento</Button></div>}</div>
      <TabsContent value="quotas"><Card className="site-card overflow-hidden"><CardHeader><CardTitle className="text-lg">Quotas por sócio e período</CardTitle><p className="text-sm text-muted-foreground">O saldo é calculado a partir dos pagamentos registados; os movimentos ficam no histórico.</p></CardHeader><CardContent>
        {quotas.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Ainda não há quotas criadas.</div> : <Table><TableHeader><TableRow><TableHead>Sócio</TableHead><TableHead>Período</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Pago</TableHead><TableHead>Em dívida</TableHead><TableHead>Estado</TableHead>{!readOnly && <TableHead/>}</TableRow></TableHeader><TableBody>{quotas.map((quota) => <TableRow key={quota.id}><TableCell className="font-medium">{quota.socioNome}</TableCell><TableCell>{quota.periodo}</TableCell><TableCell>{quota.vencimento}</TableCell><TableCell>{eurosAOA(quota.valorMinor)}</TableCell><TableCell>{eurosAOA(quota.pagoMinor)}</TableCell><TableCell>{eurosAOA(quota.emDividaMinor)}</TableCell><TableCell><Badge variant={quota.estado === "paga" ? "default" : quota.estado === "parcial" ? "secondary" : "outline"}>{quota.estado === "paga" ? "Paga" : quota.estado === "parcial" ? "Parcial" : "Pendente"}</Badge></TableCell>{!readOnly && <TableCell>{quota.emDividaMinor > 0 && <Button size="sm" variant="outline" onClick={() => { setReceiptType("quota"); setReceiptForm((form) => ({ ...form, obligationId: quota.id, valor: (quota.emDividaMinor / 100).toFixed(2) })); setReceiptOpen(true) }}>Registar pagamento</Button>}</TableCell>}</TableRow>)}</TableBody></Table>}
      </CardContent></Card></TabsContent>
      <TabsContent value="receipts"><Card className="site-card overflow-hidden"><CardHeader><CardTitle className="text-lg">Histórico de recebimentos</CardTitle><p className="text-sm text-muted-foreground">Os movimentos não podem ser editados ou eliminados nesta versão.</p></CardHeader><CardContent>
        {receipts.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Ainda não há recebimentos ou doações registados.</div> : <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Origem</TableHead><TableHead>Método</TableHead><TableHead>Valor</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader><TableBody>{receipts.map((receipt) => <TableRow key={receipt.id}><TableCell>{receipt.data}</TableCell><TableCell><Badge variant={receipt.tipo === "doacao" ? "secondary" : "outline"}>{receipt.tipo === "doacao" ? "Doação" : "Quota"}</Badge></TableCell><TableCell>{receipt.tipo === "doacao" ? (receipt.anonymous ? "Anónima" : receipt.doador || "—") : `${receipt.socioNome || "Sócio"} · ${receipt.periodo || ""}`}</TableCell><TableCell className="capitalize">{receipt.metodo}</TableCell><TableCell className="font-medium">{eurosAOA(receipt.valorMinor)}</TableCell><TableCell className="max-w-48 truncate text-muted-foreground">{receipt.notas || "—"}</TableCell></TableRow>)}</TableBody></Table>}
      </CardContent></Card></TabsContent>
    </Tabs>

    {!readOnly && <Dialog open={quotaOpen} onOpenChange={setQuotaOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Criar quota</DialogTitle><DialogDescription>Regista a obrigação do sócio por um período. Pagamentos podem ser feitos em parcelas.</DialogDescription></DialogHeader><form id="quota-form" onSubmit={createQuota} className="space-y-4"><div className="space-y-2"><Label>Sócio</Label><Select value={quotaForm.socioId} onValueChange={(socioId) => setQuotaForm({ ...quotaForm, socioId })}><SelectTrigger><SelectValue placeholder="Selecionar sócio"/></SelectTrigger><SelectContent>{socios.filter((s) => s.estado === "ativo").map((socio) => <SelectItem key={socio.id} value={socio.id}>{socio.nome}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="quota-period">Período</Label><Input id="quota-period" type="month" required value={quotaForm.periodo} onChange={(e) => setQuotaForm({ ...quotaForm, periodo: e.target.value })}/></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quota-due">Vencimento</Label><Input id="quota-due" type="date" required value={quotaForm.vencimento} onChange={(e) => setQuotaForm({ ...quotaForm, vencimento: e.target.value })}/></div><div className="space-y-2"><Label htmlFor="quota-amount">Valor (AOA)</Label><Input id="quota-amount" type="number" min="0.01" step="0.01" required value={quotaForm.valor} onChange={(e) => setQuotaForm({ ...quotaForm, valor: e.target.value })}/></div></div></form><DialogFooter><Button variant="outline" type="button" onClick={() => setQuotaOpen(false)}>Cancelar</Button><Button form="quota-form" type="submit" disabled={loading || socios.every((s) => s.estado !== "ativo")}>{loading ? "A guardar…" : "Criar quota"}</Button></DialogFooter></DialogContent></Dialog>}

    {!readOnly && <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Registar recebimento</DialogTitle><DialogDescription>Este movimento será guardado no histórico e não poderá ser apagado.</DialogDescription></DialogHeader><form id="receipt-form" onSubmit={createReceipt} className="space-y-4"><div className="space-y-2"><Label>Tipo</Label><Select value={receiptType} onValueChange={(value: "quota" | "doacao") => { setReceiptType(value); setReceiptForm({ ...receiptForm, obligationId: "" }) }}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="doacao">Doação</SelectItem><SelectItem value="quota">Pagamento de quota</SelectItem></SelectContent></Select></div>
      {receiptType === "quota" ? <div className="space-y-2"><Label>Quota</Label><Select value={receiptForm.obligationId} onValueChange={(obligationId) => { const quota = openQuotas.find((item) => item.id === obligationId); setReceiptForm({ ...receiptForm, obligationId, valor: quota ? (quota.emDividaMinor / 100).toFixed(2) : "" }) }}><SelectTrigger><SelectValue placeholder="Selecionar sócio e período"/></SelectTrigger><SelectContent>{openQuotas.map((quota) => <SelectItem key={quota.id} value={quota.id}>{quota.socioNome} · {quota.periodo} · dívida {eurosAOA(quota.emDividaMinor)}</SelectItem>)}</SelectContent></Select></div> : <><div className="space-y-2"><Label htmlFor="donor-name">Nome do doador</Label><Input id="donor-name" value={receiptForm.doador} disabled={receiptForm.anonymous} required={!receiptForm.anonymous} onChange={(e) => setReceiptForm({ ...receiptForm, doador: e.target.value })}/><label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={receiptForm.anonymous} onChange={(e) => setReceiptForm({ ...receiptForm, anonymous: e.target.checked })}/>Registar como doação anónima</label></div><div className="space-y-2"><Label htmlFor="donation-member">Associar a sócio (opcional)</Label><Select value={receiptForm.socioId || "none"} onValueChange={(socioId) => setReceiptForm({ ...receiptForm, socioId: socioId === "none" ? "" : socioId })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Sem associação</SelectItem>{socios.map((socio) => <SelectItem key={socio.id} value={socio.id}>{socio.nome}</SelectItem>)}</SelectContent></Select></div></>}
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="receipt-amount">Valor (AOA)</Label><Input id="receipt-amount" type="number" min="0.01" step="0.01" required value={receiptForm.valor} max={receiptType === "quota" && selectedQuota ? (selectedQuota.emDividaMinor / 100).toFixed(2) : undefined} onChange={(e) => setReceiptForm({ ...receiptForm, valor: e.target.value })}/></div><div className="space-y-2"><Label htmlFor="receipt-date">Data</Label><Input id="receipt-date" type="date" required value={receiptForm.data} onChange={(e) => setReceiptForm({ ...receiptForm, data: e.target.value })}/></div></div>
      <div className="space-y-2"><Label>Método</Label><Select value={receiptForm.metodo} onValueChange={(metodo) => setReceiptForm({ ...receiptForm, metodo })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="transferencia">Transferência</SelectItem><SelectItem value="multicaixa">Multicaixa</SelectItem><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="receipt-notes">Referência / observações</Label><Input id="receipt-notes" maxLength={1000} value={receiptForm.notas} onChange={(e) => setReceiptForm({ ...receiptForm, notas: e.target.value })}/></div>
    </form><DialogFooter><Button variant="outline" type="button" onClick={() => setReceiptOpen(false)}>Cancelar</Button><Button type="submit" form="receipt-form" disabled={loading || (receiptType === "quota" && openQuotas.length === 0)}>{loading ? "A registar…" : "Confirmar recebimento"}</Button></DialogFooter></DialogContent></Dialog>}
  </div>
}
