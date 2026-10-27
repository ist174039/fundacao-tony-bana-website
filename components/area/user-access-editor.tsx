'use client'
import { useCallback, useEffect, useState } from 'react'
import { areaFetch } from '@/lib/area-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

const profiles = [
  ['school_coordinator','Coordenação escolar'],['education_worker','Acompanhamento educativo'],
  ['logistics','Logística e doações'],['treasurer','Tesouraria'],
  ['document_reviewer','Revisão documental'],['auditor','Auditoria (leitura)'],['associate','Associado'],
] as const
const modules = [
  ['schools','Escolas'],['students','Alunos'],['donations','Doações'],['stock','Stock'],
  ['finance','Finanças'],['documents','Documentos'],['visits','Visitas'],['reports','Relatórios'],
] as const
const actions = [
  ['read','Consultar'],['create','Criar'],['update','Editar'],['approve','Aprovar'],['delete','Eliminar'],['share','Partilhar'],
] as const
type Module = (typeof modules)[number][0]
type Action = (typeof actions)[number][0]
type Override = { module:Module; action:Action; allow:boolean }
type Access = { profiles:string[]; schoolCodes:string[]; overrides:Override[] }
const empty = ():Access=>({profiles:[],schoolCodes:[],overrides:[]})

export function UserAccessEditor({uid, isAdmin}: {uid:string;isAdmin:boolean}) {
  const [record,setRecord]=useState<Access>(empty())
  const [revision,setRevision]=useState(0)
  const [schoolInput,setSchoolInput]=useState('')
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [available,setAvailable]=useState(true)
  const load=useCallback(async()=>{
    try {const v=await areaFetch<{access:Access;revision:number}>(`/api/area/users/${encodeURIComponent(uid)}/access`)
      setRecord(v.access);setRevision(v.revision);setSchoolInput(v.access.schoolCodes.join(', '));setAvailable(true);setError('')
    }catch(e){setAvailable(false);setError(e instanceof Error?e.message:'Gestão de permissões indisponível.')}
  },[uid])
  useEffect(()=>{void load()},[load])
  const toggleProfile=(p:string,checked:boolean)=>setRecord(v=>({...v,profiles:checked?[...v.profiles,p]:v.profiles.filter(x=>x!==p)}))
  const setOverride=(module:Module,action:Action,value:'inherit'|'allow'|'deny')=>setRecord(v=>({
    ...v,overrides:[...v.overrides.filter(x=>x.module!==module||x.action!==action),...(value==='inherit'?[]:[{module,action,allow:value==='allow'}])]
  }))
  const save=async()=>{setBusy(true);setError('');setNotice('');try{
    const schoolCodes=schoolInput.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean)
    const access={...record,schoolCodes}
    const result=await areaFetch<{revision:number}>(`/api/area/users/${encodeURIComponent(uid)}/access`,{
      method:'PUT',body:JSON.stringify({access,expectedRevision:revision})
    })
    setRevision(result.revision);setRecord(access);setNotice('Perfis e permissões guardados. A aplicação de acessos exige autorização na API de cada módulo.')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível atualizar os acessos.')}
  finally{setBusy(false)}}
  return <section className='mt-5 space-y-4 border-t pt-5' aria-label='Perfis e permissões'>
    <div><h3 className='font-semibold'>Perfis e permissões</h3><p className='mt-1 text-xs text-muted-foreground'>Atribuição explícita, com restrições por escola e negação por omissão.</p></div>
    {isAdmin&&<Badge variant='secondary'>Administrador gerido separadamente pelo Firebase</Badge>}
    {error&&<Alert variant='destructive'><AlertDescription>{error}</AlertDescription></Alert>}
    {notice&&<Alert><AlertDescription>{notice}</AlertDescription></Alert>}
    {available&&<><fieldset className='space-y-2'><legend className='text-sm font-medium'>Perfis operacionais</legend>
      {profiles.map(([code,label])=><label key={code} className='flex items-center gap-2 text-sm'><Checkbox checked={record.profiles.includes(code)} onCheckedChange={v=>toggleProfile(code,v===true)}/>{label}</label>)}
    </fieldset>
    <label className='block text-sm'><span className='font-medium'>Escolas autorizadas</span><Input className='mt-1' value={schoolInput} onChange={e=>setSchoolInput(e.target.value)} placeholder='ESC-001, ESC-002'/><span className='mt-1 block text-xs text-muted-foreground'>Códigos separados por vírgula. Sem escolas significa sem acesso a registos escolares.</span></label>
    <div><h4 className='font-medium'>Exceções por funcionalidade</h4><p className='mb-2 text-xs text-muted-foreground'>Herdar usa o perfil; Permitir ou Negar altera a ação específica.</p>
      <div className='max-h-72 space-y-2 overflow-y-auto'>{modules.map(([mod,label])=><div key={mod} className='rounded-md border p-2'><p className='text-sm font-medium'>{label}</p><div className='mt-2 grid grid-cols-2 gap-2'>{actions.map(([action,actionLabel])=>{
        const current=record.overrides.find(x=>x.module===mod&&x.action===action)
        const value=current?(current.allow?'allow':'deny'):'inherit'
        return <label className='text-xs' key={`${mod}:${action}`}><span className='block'>{actionLabel}</span><select className='mt-1 w-full rounded border bg-background p-1.5' value={value} onChange={e=>setOverride(mod,action,e.target.value as 'inherit'|'allow'|'deny')}><option value='inherit'>Herdar</option><option value='allow'>Permitir</option><option value='deny'>Negar</option></select></label>
      })}</div></div>)}</div>
    </div>
    <div className='flex justify-end gap-2'><Button variant='outline' onClick={()=>void load()} disabled={busy}>Recarregar</Button><Button onClick={()=>void save()} disabled={busy}>{busy?'A guardar…':'Guardar permissões'}</Button></div></>}
  </section>
}
