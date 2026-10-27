'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, RefreshCw, Settings2, ShieldCheck } from 'lucide-react'
import { areaFetch } from '@/lib/area-client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecordListControls } from '@/components/workspace/record-list-controls'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Module = {
  id: string; label: string; description: string; desiredEnabled: boolean; enabled: boolean;
  ready: boolean; blockers: string[]; revision: number;
  updatedAt: string | null; updatedBy: string | null
}
const PAGE_SIZE = 10
function statusLabel(m: Module) {
  if (m.enabled) return 'Ativo'
  if (!m.ready) return 'Bloqueado'
  return 'Inativo'
}

/** Consistent with Sócios: central list, filters/order/pagination, side-panel configuration. */
export function ModuleSettingsManager({ onChanged }: { onChanged?: (items: Module[]) => void }) {
  const [modules,setModules] = useState<Module[]>([])
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState<string | null>(null)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [search,setSearch] = useState('')
  const [filter,setFilter] = useState('all')
  const [sort,setSort] = useState('name_asc')
  const [page,setPage] = useState(1)
  const [selectedId,setSelectedId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await areaFetch<{ modules: Module[] }>('/api/area/config/modules', { cache: 'no-store' })
      setModules(response.modules)
      setError('')
      onChanged?.(response.modules)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível consultar a configuração.')
    } finally { setLoading(false) }
  },[onChanged])
  useEffect(() => { void refresh() },[refresh])

  const shownRows = useMemo(() => modules.filter(m => {
    const found = `${m.label} ${m.description}`.toLocaleLowerCase('pt-PT').includes(search.toLocaleLowerCase('pt-PT'))
    return found && (filter === 'all' || (filter === 'active' && m.enabled) || (filter === 'inactive' && !m.desiredEnabled && m.ready) || (filter === 'blocked' && !m.ready))
  }).sort((a,b) => (sort==='name_desc'?-1:1)*a.label.localeCompare(b.label,'pt-PT')),[modules,search,filter,sort])
  const pages = Math.max(1, Math.ceil(shownRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const pageRows = shownRows.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE)
  const selected = modules.find(m=>m.id===selectedId) || null

  const change = async (module: Module, enabled: boolean) => {
    if (busy || (enabled && !module.ready)) return
    setBusy(module.id)
    setError('')
    setNotice('')
    try {
      const response = await areaFetch<{ modules: Module[] }>('/api/area/config/modules', {
        method: 'PUT', body: JSON.stringify({ moduleId: module.id, enabled, expectedRevision: module.revision }),
      })
      setModules(response.modules)
      onChanged?.(response.modules)
      setNotice(`${module.label}: ${enabled ? 'ativação registada' : 'desativação aplicada'}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar o módulo.')
      await refresh()
    } finally { setBusy(null) }
  }

  return <div className='space-y-4'>
    <Alert><ShieldCheck className='h-4 w-4'/><AlertDescription>Um módulo só pode ser ativado quando a infraestrutura e a segurança estiverem configuradas. Desativar bloqueia novas operações no servidor; não elimina dados anteriores. Autenticação, Sócios e Quotas permanecem sempre disponíveis.</AlertDescription></Alert>
    {notice && <Alert><AlertDescription>{notice}</AlertDescription></Alert>}
    {error && <Alert variant='destructive'><AlertDescription>{error}</AlertDescription></Alert>}
    <Card className='site-card overflow-hidden'><CardHeader className='flex flex-row items-center justify-between gap-3'>
      <div><CardTitle className='flex items-center gap-2'><Settings2 className='h-5 w-5 text-primary'/>Configuração de módulos</CardTitle><p className='mt-1 text-sm text-muted-foreground'>Ativa e desativa funcionalidades de forma auditável. Detalhes e alterações no painel lateral.</p></div>
      <Button size='sm' variant='outline' onClick={()=>void refresh()} disabled={loading||!!busy}><RefreshCw className='mr-2 h-4 w-4'/>Atualizar</Button>
    </CardHeader><CardContent className='p-0'>
      <RecordListControls search={search} onSearchChange={v=>{setSearch(v);setPage(1)}} placeholder='Pesquisar módulos' filter={filter} onFilterChange={v=>{setFilter(v);setPage(1)}} filterOptions={[{value:'all',label:'Todos'},{value:'active',label:'Ativos'},{value:'inactive',label:'Inativos'},{value:'blocked',label:'Bloqueados'}]} sort={sort} onSortChange={v=>{setSort(v);setPage(1)}} sortOptions={[{value:'name_asc',label:'Nome A–Z'},{value:'name_desc',label:'Nome Z–A'}]} page={currentPage} pageCount={pages} total={shownRows.length} onPageChange={setPage}/>
      {loading ? <p className='p-8 text-center text-sm text-muted-foreground'>A carregar configuração…</p> : pageRows.length === 0 ? <p className='p-8 text-center text-sm text-muted-foreground'>Nenhum módulo encontrado.</p> : <div className='overflow-x-auto'><Table><TableHeader><TableRow><TableHead>Módulo</TableHead><TableHead>Estado</TableHead><TableHead>Prontidão</TableHead><TableHead>Última alteração</TableHead><TableHead className='text-right'>Configurar</TableHead></TableRow></TableHeader><TableBody>{pageRows.map(m=><TableRow key={m.id}><TableCell><span className='font-medium'>{m.label}</span><p className='max-w-xs text-xs text-muted-foreground'>{m.description}</p></TableCell><TableCell><Badge variant={m.enabled?'default':'secondary'}>{statusLabel(m)}</Badge></TableCell><TableCell className='text-sm'>{m.ready?'Pronto para ativar':`${m.blockers.length} condição(ões) pendente(s)`}</TableCell><TableCell className='text-sm'>{m.updatedAt?new Date(m.updatedAt).toLocaleString('pt-PT'):'Nunca'}</TableCell><TableCell className='text-right'><Button size='sm' variant='outline' onClick={()=>{setSelectedId(m.id);setError('')}}><Eye className='mr-1.5 h-4 w-4'/>Abrir</Button></TableCell></TableRow>)}</TableBody></Table></div>}
    </CardContent></Card>
    <Sheet open={selectedId !== null} onOpenChange={v=>{if(!v)setSelectedId(null)}}><SheetContent side='right' className='w-full overflow-y-auto sm:max-w-xl'><SheetHeader><SheetTitle>{selected?.label||'Módulo'}</SheetTitle><SheetDescription>Configuração operacional e condições obrigatórias de segurança.</SheetDescription></SheetHeader>
      {selected && <div className='mt-6 space-y-5 text-sm'><div className='rounded-lg border p-4'><div className='flex items-center justify-between gap-3'><div><p className='font-medium'>Módulo ativo</p><p className='mt-1 text-muted-foreground'>{selected.enabled?'Disponível para utilização.':selected.ready?'Ativação possível mediante confirmação.':'Ativação bloqueada até resolver as condições.'}</p></div><Switch aria-label={`Ativar ${selected.label}`} checked={selected.desiredEnabled} disabled={!!busy || (!selected.desiredEnabled && !selected.ready)} onCheckedChange={checked=>void change(selected,checked)}/></div></div>
      {selected.desiredEnabled&&!selected.enabled&&<p className='rounded-md border p-3 text-sm'>Ativação solicitada, mas a funcionalidade está bloqueada por condições técnicas ou dependências.</p>}
      {selected.blockers.length>0&&<div className='rounded-lg border p-4'><h3 className='font-medium'>Condições pendentes</h3><ul className='mt-3 list-disc space-y-2 pl-5 text-muted-foreground'>{selected.blockers.map((b,i)=><li key={i}>{b}</li>)}</ul></div>}
      <dl className='grid gap-3 rounded-lg border p-4'><div><dt className='text-muted-foreground'>Estado efetivo</dt><dd className='font-medium'>{statusLabel(selected)}</dd></div><div><dt className='text-muted-foreground'>Revisão</dt><dd>{selected.revision}</dd></div><div><dt className='text-muted-foreground'>Alterado por</dt><dd className='break-all'>{selected.updatedBy||'Sem alterações'}</dd></div><div><dt className='text-muted-foreground'>Data</dt><dd>{selected.updatedAt?new Date(selected.updatedAt).toLocaleString('pt-PT'):'—'}</dd></div></dl>
      <p className='text-xs text-muted-foreground'>A ativação não altera os critérios de lançamento nem autoriza tratar dados reais sem validação. As alterações ficam registadas em auditoria.</p></div>}
    </SheetContent></Sheet>
  </div>
}
