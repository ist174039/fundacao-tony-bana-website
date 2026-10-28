'use client'
import {useEffect,useState,type FormEvent} from 'react'
import {areaFetch} from '@/lib/area-client'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
type Family={id:string;representante:string;comunidade:string}
export function FamilyLinkTab({studentId}:{studentId:string}){
 const [families,setFamilies]=useState<Family[]>([]),[familyId,setFamilyId]=useState(''),[chosen,setChosen]=useState(''),[name,setName]=useState(''),[community,setCommunity]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const load=async()=>{const [f,l]=await Promise.all([areaFetch<{families:Family[]}>('/api/area/families'),areaFetch<{familyId:string|null}>(`/api/area/students/${studentId}/family`)]);setFamilies(f.families);setFamilyId(l.familyId||'')}
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Não foi possível consultar famílias.'))},[studentId])
 const create=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const r=await areaFetch<{family:Family}>('/api/area/families',{method:'POST',body:JSON.stringify({representante:name,comunidade:community})});setFamilies(p=>[r.family,...p]);setChosen(r.family.id);setName('');setCommunity('');setNotice('Agregado criado. Associa agora o aluno.')}catch(e){setError(e instanceof Error?e.message:'Falha ao registar agregado.')}finally{setBusy(false)}}
 const link=async()=>{setBusy(true);setError('');try{await areaFetch(`/api/area/students/${studentId}/family`,{method:'PUT',body:JSON.stringify({familyId:chosen})});setFamilyId(chosen);setNotice('Aluno associado ao agregado familiar.')}catch(e){setError(e instanceof Error?e.message:'Falha ao associar aluno.')}finally{setBusy(false)}}
 return <div className='mt-5 space-y-4 text-sm'><p className='text-muted-foreground'>Associa os irmãos ao mesmo agregado. As avaliações anteriores continuam no registo individual até migração controlada.</p>
 {error&&<p role='alert' className='text-destructive'>{error}</p>}{notice&&<p role='status'>{notice}</p>}
 {familyId?<div className='rounded-lg border p-3'><strong>Agregado associado</strong><p>{families.find(f=>f.id===familyId)?.representante||'Família registada'} · {families.find(f=>f.id===familyId)?.comunidade||''}</p><p className='text-xs text-muted-foreground'>A transferência para outra família exige validação administrativa.</p></div>:<>
 <label className='block'>Associar agregado existente<select className='mt-1 w-full rounded-md border bg-background p-2' value={chosen} onChange={e=>setChosen(e.target.value)}><option value=''>Selecionar família</option>{families.map(f=><option key={f.id} value={f.id}>{f.representante} · {f.comunidade}</option>)}</select></label>
 <Button type='button' disabled={!chosen||busy} onClick={()=>void link()}>Associar aluno</Button>
 <form onSubmit={create} className='space-y-3 rounded-lg border p-3'><h3 className='font-semibold'>Ou criar novo agregado</h3><label className='block'>Representante<Input required minLength={2} maxLength={140} value={name} onChange={e=>setName(e.target.value)}/></label><label className='block'>Comunidade<Input maxLength={140} value={community} onChange={e=>setCommunity(e.target.value)}/></label><Button type='submit' disabled={busy}>Criar família</Button></form></>}
 </div>
}
