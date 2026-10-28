'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Eye,Boxes,RefreshCw} from 'lucide-react'
import {areaFetch} from '@/lib/area-client'
import {summarizeStock} from '@/lib/server/stock-summary.mjs'
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {Alert,AlertDescription} from '@/components/ui/alert'
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table'
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet'
import {RecordListControls} from '@/components/workspace/record-list-controls'

type Lot={id:string;categoria:string;descricao:string;quantidadeRecebida:number;quantidadeDisponivel:number;unidade:string;estado:string;rececaoId:string;atualizadoEm?:string|null}
type Movement={id:string;tipo:string;quantidade:number;unidade:string;criadoEm:string;criadoPor:string;rececaoId?:string|null;entregaId?:string|null}
const PAGE_SIZE=10
const number=(n:number)=>new Intl.NumberFormat('pt-PT',{maximumFractionDigits:3}).format(n)
export function StockAnalysisManager(){
 const [rows,setRows]=useState<Lot[]>([]),[search,setSearch]=useState(''),[filter,setFilter]=useState('available'),[sort,setSort]=useState('description'),[page,setPage]=useState(1)
 const [selected,setSelected]=useState<Lot|null>(null),[movements,setMovements]=useState<Movement[]>([]),[movesLoading,setMovesLoading]=useState(false)
 const [loading,setLoading]=useState(true),[truncated,setTruncated]=useState(false),[error,setError]=useState('')
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{const r=await areaFetch<{lotes:Lot[];truncated:boolean}>('/api/area/material-stock',{cache:'no-store'});setRows(r.lotes);setTruncated(r.truncated)}catch(e){setError(e instanceof Error?e.message:'Não foi possível consultar o stock.')}finally{setLoading(false)}},[])
 useEffect(()=>{void refresh()},[refresh])
 const total=useMemo(()=>summarizeStock(rows),[rows])
 const categories=useMemo(()=>[...new Set(rows.map(r=>r.categoria))].sort((a,b)=>a.localeCompare(b,'pt-PT')),[rows])
 const filtered=useMemo(()=>rows.filter(r=>(r.descricao+' '+r.categoria+' '+r.id+' '+(r.rececaoId||'')).toLocaleLowerCase('pt-PT').includes(search.toLocaleLowerCase('pt-PT'))&&
  (filter==='all'||filter==='available'&&r.quantidadeDisponivel>0||filter==='exhausted'&&r.quantidadeDisponivel===0||filter.startsWith('category:')&&r.categoria===filter.slice(9)))
  .sort((a,b)=>sort==='most'?(b.quantidadeDisponivel-a.quantidadeDisponivel):sort==='least'?(a.quantidadeDisponivel-b.quantidadeDisponivel):sort==='category'?a.categoria.localeCompare(b.categoria,'pt-PT'):a.descricao.localeCompare(b.descricao,'pt-PT')),[rows,search,filter,sort])
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),shown=filtered.slice((Math.min(page,pages)-1)*PAGE_SIZE,Math.min(page,pages)*PAGE_SIZE)
 const inspect=(lot:Lot)=>{setSelected(lot);setMovesLoading(true);setMovements([]);void areaFetch<{movimentos:Movement[]}>('/api/area/material-stock/'+encodeURIComponent(lot.id)+'/movements',{cache:'no-store'}).then(x=>setMovements(x.movimentos)).catch(e=>setError(e instanceof Error?e.message:'Não foi possível consultar os movimentos.')).finally(()=>setMovesLoading(false))}
 return <div className='space-y-4'>
  <p className='rounded-lg border bg-muted/40 px-4 py-3 text-sm'>Stock de bens recebidos e confirmados fisicamente. A disponibilidade já desconta entregas confirmadas, sem reservar stock para guias pendentes. Quantidades de unidades diferentes não são somadas.</p>
  {error&&<Alert variant='destructive'><AlertDescription>{error}</AlertDescription></Alert>}
  {truncated&&<Alert><AlertDescription>A vista está limitada aos primeiros 500 lotes. Os totais apresentados referem-se apenas aos lotes carregados; é necessária paginação de servidor para um inventário maior.</AlertDescription></Alert>}
  <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
   {([['Lotes disponíveis',total.availableLots],['Lotes esgotados',total.exhaustedLots],['Categorias disponíveis',total.categories],['Lotes consultados',total.lots]] as [string,number][]).map(([label,value])=><Card key={label}><CardContent className='py-4'><p className='text-xs text-muted-foreground'>{label}</p><p className='mt-1 text-2xl font-semibold'>{value}</p></CardContent></Card>)}
  </div>
  {total.units.length>0&&<Card><CardHeader><CardTitle className='text-base'>Quantidades por unidade</CardTitle></CardHeader><CardContent><div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>{total.units.map(unit=><div key={unit.unit} className='rounded-lg border p-3 text-sm'><strong>{unit.unit}</strong><p>Recebidos: {number(unit.received)}</p><p>Disponíveis: {number(unit.available)}</p><p>Entregues: {number(unit.distributed)}</p></div>)}</div></CardContent></Card>}
  <Card className='site-card overflow-hidden'><CardHeader className='flex flex-row items-center justify-between gap-3'><div><CardTitle className='flex items-center gap-2'><Boxes className='h-5 w-5 text-primary'/>Stock disponível para doação</CardTitle><p className='mt-1 text-sm text-muted-foreground'>Consulta do inventário, lotes e movimentos confirmados.</p></div><Button variant='outline' onClick={()=>void refresh()} disabled={loading}><RefreshCw className='mr-2 h-4 w-4'/>Atualizar</Button></CardHeader><CardContent className='p-0'>
   <RecordListControls search={search} onSearchChange={v=>{setSearch(v);setPage(1)}} placeholder='Pesquisar artigo, categoria ou lote' filter={filter} onFilterChange={v=>{setFilter(v);setPage(1)}} filterOptions={[{value:'available',label:'Disponíveis'},{value:'all',label:'Todos os lotes'},{value:'exhausted',label:'Esgotados'},...categories.map(c=>({value:'category:'+c,label:c}))]} sort={sort} onSortChange={v=>{setSort(v);setPage(1)}} sortOptions={[{value:'description',label:'Artigo A–Z'},{value:'category',label:'Categoria'},{value:'most',label:'Maior quantidade'},{value:'least',label:'Menor quantidade'}]} page={Math.min(page,pages)} pageCount={pages} total={filtered.length} onPageChange={setPage}/>
   {loading?<p className='p-8 text-center text-sm text-muted-foreground'>A carregar stock…</p>:!shown.length?<p className='p-8 text-center text-sm text-muted-foreground'>Não existem lotes para os filtros selecionados.</p>:<div className='overflow-x-auto'><Table><TableHeader><TableRow><TableHead>Artigo</TableHead><TableHead>Categoria</TableHead><TableHead>Recebido</TableHead><TableHead>Disponível</TableHead><TableHead>Estado</TableHead><TableHead className='text-right'>Detalhes</TableHead></TableRow></TableHeader><TableBody>{shown.map(l=><TableRow key={l.id}><TableCell><p className='font-medium'>{l.descricao}</p><p className='text-xs text-muted-foreground'>Lote {l.id}</p></TableCell><TableCell>{l.categoria}</TableCell><TableCell>{number(l.quantidadeRecebida)} {l.unidade}</TableCell><TableCell className='font-semibold'>{number(l.quantidadeDisponivel)} {l.unidade}</TableCell><TableCell><Badge variant={l.quantidadeDisponivel>0?'default':'secondary'}>{l.quantidadeDisponivel>0?'Disponível':'Esgotado'}</Badge></TableCell><TableCell className='text-right'><Button variant='outline' size='sm' onClick={()=>inspect(l)}><Eye className='mr-1 h-4 w-4'/>Ver</Button></TableCell></TableRow>)}</TableBody></Table></div>}
  </CardContent></Card>
  <Sheet open={selected!==null} onOpenChange={v=>{if(!v)setSelected(null)}}><SheetContent side='right' className='w-full overflow-y-auto sm:max-w-2xl'><SheetHeader><SheetTitle>{selected?.descricao||'Detalhes do lote'}</SheetTitle><SheetDescription>Movimentos de entrada e de saída do stock, sem alteração direta de saldos.</SheetDescription></SheetHeader>{selected&&<div className='mt-5 space-y-4 text-sm'>
   <div className='grid grid-cols-2 gap-3'>{([['Lote',selected.id],['Categoria',selected.categoria],['Condição',selected.estado],['Guia de receção',selected.rececaoId],['Quantidade recebida',number(selected.quantidadeRecebida)+' '+selected.unidade],['Disponível',number(selected.quantidadeDisponivel)+' '+selected.unidade],['Quantidade distribuída',number(selected.quantidadeRecebida-selected.quantidadeDisponivel)+' '+selected.unidade],['Última atualização',selected.atualizadoEm||'—']] as [string,string][]).map(([k,v])=><div className='rounded-lg border p-3' key={k}><p className='text-muted-foreground'>{k}</p><p className='mt-1 break-words font-medium'>{v||'—'}</p></div>)}</div>
   <h3 className='font-semibold'>Histórico de movimentos</h3>{movesLoading?<p>A carregar movimentos…</p>:movements.length===0?<p className='text-muted-foreground'>Sem movimentos registados.</p>:movements.map(m=><div key={m.id} className='rounded-lg border p-3'><div className='flex justify-between gap-2'><strong>{m.tipo==='entrada'?'Entrada':'Saída'}</strong><span>{number(m.quantidade)} {m.unidade}</span></div><p className='mt-1 text-xs text-muted-foreground'>{m.criadoEm?new Date(m.criadoEm).toLocaleString('pt-PT'):'—'} · {m.rececaoId?'Receção '+m.rececaoId:m.entregaId?'Entrega '+m.entregaId:''}</p></div>)}
  </div>}</SheetContent></Sheet>
 </div>
}
