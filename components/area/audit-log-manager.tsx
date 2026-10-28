'use client'
import { useEffect,useMemo,useState } from 'react'
import { History,RefreshCw,Eye } from 'lucide-react'
import { areaFetch } from '@/lib/area-client'
import { Card,CardHeader,CardTitle,CardContent } from '@/components/ui/card'
import { Alert,AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Sheet,SheetHeader,SheetTitle,SheetDescription,SheetContent } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '@/components/ui/table'
import { RecordListControls } from '@/components/workspace/record-list-controls'
type Event={id:string;module:string;action:string;recordPath:string;actorUid:string;actorName:string;at:string;changedFields:string[];snapshotProtected:boolean;snapshotAvailable:boolean;source:string}
export function AuditLogManager(){
 const [rows,setRows]=useState<Event[]>([]),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[sort,setSort]=useState('desc'),[page,setPage]=useState(1),[selected,setSelected]=useState<Event|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const load=async()=>{setLoading(true);try{const x=await areaFetch<{events:Event[]}>('/api/area/config/audit',{cache:'no-store'});setRows(x.events);setError('')}catch(e){setError(e instanceof Error?e.message:'Falha ao consultar o histórico.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[])
 const filtered=useMemo(()=>rows.filter(x=>(filter==='all'||x.action===filter)&&[x.recordPath,x.module,x.actorName,x.actorUid,x.action,...x.changedFields].join(' ').toLocaleLowerCase('pt-PT').includes(search.toLocaleLowerCase('pt-PT'))).sort((a,b)=>(sort==='asc'?1:-1)*String(b.at).localeCompare(String(a.at))),[rows,filter,search,sort])
 const pages=Math.max(1,Math.ceil(filtered.length/10)),current=Math.min(page,pages),shown=filtered.slice((current-1)*10,current*10)
 return <div className='space-y-4'>
  <p className='rounded-lg border bg-muted/40 p-3 text-sm'>Histórico administrativo de alterações. Os valores pessoais não são apresentados em texto claro; os eventos novos são criados no servidor. A cobertura de módulos antigos ainda tem de ser validada.</p>
  {error&&<Alert variant='destructive'><AlertDescription>{error}</AlertDescription></Alert>}
  <Card className='site-card overflow-hidden'><CardHeader className='flex flex-row items-center justify-between gap-3'><CardTitle className='flex items-center gap-2'><History className='h-5 w-5 text-primary'/>Auditoria</CardTitle><Button variant='outline' size='sm' onClick={()=>void load()} disabled={loading}><RefreshCw className='mr-2 h-4 w-4'/>Atualizar</Button></CardHeader><CardContent className='p-0'>
  <RecordListControls search={search} onSearchChange={v=>{setSearch(v);setPage(1)}} placeholder='Procurar registo, utilizador ou operação' filter={filter} onFilterChange={v=>{setFilter(v);setPage(1)}} filterOptions={[{value:'all',label:'Todas'},{value:'create',label:'Criação'},{value:'update',label:'Alteração'},{value:'delete',label:'Eliminação'},{value:'confirm',label:'Confirmação'},{value:'share',label:'Partilha'},{value:'activate',label:'Ativação'},{value:'deactivate',label:'Desativação'}]} sort={sort} onSortChange={v=>{setSort(v);setPage(1)}} sortOptions={[{value:'desc',label:'Mais recentes'},{value:'asc',label:'Mais antigos'}]} page={current} pageCount={pages} total={filtered.length} onPageChange={setPage}/>
  {loading?<p className='p-8 text-center text-sm text-muted-foreground'>A carregar...</p>:!shown.length?<p className='p-8 text-center text-sm text-muted-foreground'>Sem eventos para os filtros atuais.</p>:<div className='overflow-x-auto'><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Módulo</TableHead><TableHead>Operação</TableHead><TableHead>Por</TableHead><TableHead>Registo</TableHead><TableHead className='text-right'>Detalhes</TableHead></TableRow></TableHeader><TableBody>{shown.map(x=><TableRow key={x.id}><TableCell className='whitespace-nowrap'>{new Date(x.at).toLocaleString('pt-PT')}</TableCell><TableCell>{x.module}</TableCell><TableCell><Badge variant='secondary'>{x.action}</Badge></TableCell><TableCell className='max-w-48 truncate' title={x.actorUid}>{x.actorName||'Utilizador não identificado'}</TableCell><TableCell className='max-w-52 truncate'>{x.recordPath}</TableCell><TableCell className='text-right'><Button size='sm' variant='outline' onClick={()=>setSelected(x)}><Eye className='mr-1.5 h-4 w-4'/>Ver</Button></TableCell></TableRow>)}</TableBody></Table></div>}
 </CardContent></Card>
 <Sheet open={selected!==null} onOpenChange={v=>{if(!v)setSelected(null)}}><SheetContent side='right' className='w-full overflow-y-auto sm:max-w-xl'><SheetHeader><SheetTitle>Evento de auditoria</SheetTitle><SheetDescription>Metadados da alteração, sem revelar dados pessoais.</SheetDescription></SheetHeader>{selected&&<dl className='mt-6 grid gap-3 text-sm'>{[['Data',selected.at],['Ação',selected.action],['Módulo',selected.module],['Registo',selected.recordPath],['Autor',selected.actorName||'Utilizador não identificado'],['UID interno',selected.actorUid],['Origem',selected.source],['Campos alterados',selected.changedFields.join(', ')||'—'],['Valores históricos cifrados',selected.snapshotProtected?'Sim':'Não — apenas metadados']].map(([k,v])=><div className='rounded-lg border p-3' key={k}><dt className='text-muted-foreground'>{k}</dt><dd className='mt-1 break-all font-medium'>{v}</dd></div>)}</dl>}</SheetContent></Sheet>
 </div>
}
