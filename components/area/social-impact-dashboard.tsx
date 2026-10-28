'use client'
import {useEffect,useState} from 'react'
import {areaFetch} from '@/lib/area-client'
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
type Counts={students:number;families:number;assessments:number;deliveries:number;stockLots:number;schools:number}
type Metrics={counts:Counts;recentDeliveryStatuses:{pendente:number;entregue:number;cancelada:number};deliverySampleSize:number}
export function SocialImpactDashboard(){
 const [data,setData]=useState<Metrics|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const load=async()=>{setLoading(true);try{setData(await areaFetch<Metrics>('/api/area/social-impact',{cache:'no-store'}));setError('')}catch(e){setError(e instanceof Error?e.message:'Indicadores indisponíveis.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[])
 const labels:{key:keyof Counts;label:string}[]=[{key:'families',label:'Famílias registadas'},{key:'students',label:'Alunos'},{key:'assessments',label:'Fichas de avaliação'},{key:'schools',label:'Escolas'},{key:'deliveries',label:'Entregas registadas'},{key:'stockLots',label:'Lotes de material'}]
 return <div className='space-y-4'><div className='flex items-center justify-between'><div><h2 className='text-xl font-semibold'>Impacto e operação social</h2><p className='text-sm text-muted-foreground'>Indicadores administrativos agregados; não expõem dados pessoais.</p></div><Button variant='outline' onClick={()=>void load()}>Atualizar</Button></div>
 {error&&<p className='text-sm text-destructive' role='alert'>{error}</p>}
 {loading?<p>A carregar indicadores…</p>:data&&<><div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>{labels.map(({key,label})=><Card key={key}><CardContent className='pt-5'><p className='text-sm text-muted-foreground'>{label}</p><p className='text-3xl font-bold'>{data.counts[key].toLocaleString('pt-PT')}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Estado das últimas entregas</CardTitle></CardHeader><CardContent><div className='grid gap-3 sm:grid-cols-3'>{Object.entries(data.recentDeliveryStatuses).map(([status,count])=><div className='rounded-lg border p-3' key={status}><p className='capitalize'>{status}</p><p className='text-2xl font-semibold'>{count}</p></div>)}</div><p className='mt-3 text-xs text-muted-foreground'>Distribuição calculada sobre as {data.deliverySampleSize} entregas mais recentes, até 200. Não é uma métrica histórica integral.</p></CardContent></Card></>}
 </div>
}
