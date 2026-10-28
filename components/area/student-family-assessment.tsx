'use client'
import {useCallback,useEffect,useState,type FormEvent} from 'react'
import {ClipboardList,History,Save,ShieldAlert} from 'lucide-react'
import {areaFetch} from '@/lib/area-client'
import {FAMILY_ASSESSMENT_SECTIONS,blankFamilyAssessment} from '@/lib/server/family-assessment.mjs'
import {Alert,AlertDescription} from '@/components/ui/alert'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'

type Field={id:string;label:string;kind:'date'|'text'|'textarea'|'select'|'count';max?:number;options?:readonly {value:string;label:string}[]}
const sections=FAMILY_ASSESSMENT_SECTIONS as readonly {id:string;title:string;fields:readonly Field[]}[]
type Answers=Record<string,string|number>
type Evaluation={revision:number;status:'rascunho'|'concluida';updatedAt:string;updatedBy:string;answers:Answers}
type Revision={revision:number;status:string;updatedAt:string;updatedBy:string}
type Answer={avaliacao:Evaluation|null;currentRevision:number;revisoes:Revision[]}
const title='Avaliação familiar'
export function StudentFamilyAssessment({studentId}:{studentId:string}){
 const [answers,setAnswers]=useState<Answers>(()=>blankFamilyAssessment() as Answers)
 const [currentRevision,setCurrentRevision]=useState(0)
 const [revisions,setRevisions]=useState<Revision[]>([])
 const [status,setStatus]=useState<'rascunho'|'concluida'>('rascunho')
 const [historyRevision,setHistoryRevision]=useState(0)
 const [privacy,setPrivacy]=useState(false)
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const [error,setError]=useState(''),[notice,setNotice]=useState('')
 const base='/api/area/students/'+encodeURIComponent(studentId)+'/family-assessment'
 const load=useCallback(async()=>{
  setLoading(true);setError('');setNotice('')
  try{
   const r=await areaFetch<Answer>(base,{cache:'no-store'})
   setCurrentRevision(r.currentRevision||0);setRevisions(r.revisoes||[])
   setAnswers((r.avaliacao?.answers||blankFamilyAssessment()) as Answers)
   setStatus(r.avaliacao?.status||'rascunho')
   setHistoryRevision(0);setPrivacy(false)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível consultar a avaliação familiar.')}
  finally{setLoading(false)}
 },[base])
 useEffect(()=>{void load()},[load])
 const loadHistory=async(revision:number)=>{
  if(!revision){void load();return}
  setLoading(true);setError('')
  try{
   const r=await areaFetch<Answer>(base+'?revision='+revision,{cache:'no-store'})
   setAnswers((r.avaliacao?.answers||blankFamilyAssessment()) as Answers)
   setHistoryRevision(revision)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível consultar esta revisão.')}
  finally{setLoading(false)}
 }
 const save=async(e:FormEvent,statusToSave:'rascunho'|'concluida')=>{
  e.preventDefault();setBusy(true);setError('');setNotice('')
  try{
   await areaFetch(base,{method:'PUT',body:JSON.stringify({answers,status:statusToSave,expectedRevision:currentRevision,privacyBasisConfirmed:privacy})})
   await load()
   setNotice(statusToSave==='rascunho'?'Rascunho guardado e auditado.':'Avaliação concluída e versão guardada.')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar.')}
  finally{setBusy(false)}
 }
 if(loading)return <p className='mt-4 text-sm text-muted-foreground'>A carregar avaliação familiar…</p>
 return <div className='mt-4 space-y-4'>
  <div className='rounded-lg border bg-muted/40 p-3 text-sm'><div className='flex items-center gap-2 font-medium'><ShieldAlert className='h-4 w-4'/>Dados pessoais e de saúde protegidos</div><p className='mt-1 text-xs text-muted-foreground'>Acesso apenas a administradores autorizados. A recolha exige base legal documentada. Não registes diagnósticos detalhados quando não forem indispensáveis.</p></div>
  {error&&<Alert variant='destructive'><AlertDescription>{error}</AlertDescription></Alert>}
  {notice&&<Alert><AlertDescription>{notice}</AlertDescription></Alert>}
  <div className='flex flex-wrap items-center justify-between gap-3'>
   <div className='flex items-center gap-2'><ClipboardList className='h-4 w-4'/><strong>{title}</strong><Badge variant='outline'>{historyRevision?'Versão histórica':status==='concluida'?'Concluída':'Rascunho'}</Badge></div>
   <span className='text-xs text-muted-foreground'>Revisão atual: {currentRevision}</span>
  </div>
  {revisions.length>0&&<label className='block text-sm'><span className='mb-1 flex items-center gap-2'><History className='h-4 w-4'/>Histórico de avaliações</span><select className='w-full rounded-md border bg-background p-2' value={historyRevision} onChange={e=>void loadHistory(Number(e.target.value))}>
   <option value={0}>Versão atual · editável</option>{revisions.map(r=><option key={r.revision} value={r.revision}>Revisão {r.revision} · {r.updatedAt?.slice(0,10)} · {r.status}</option>)}
  </select></label>}
  <form className='space-y-5' onSubmit={e=>void save(e,'rascunho')}>
   {sections.map(section=><fieldset key={section.id} disabled={busy||historyRevision>0} className='space-y-3 rounded-lg border p-3'>
    <legend className='px-1 text-sm font-semibold'>{section.title}</legend>
    {section.fields.map(field=><label key={field.id} className='block text-sm'><span className='mb-1 block'>{field.label}</span>
     {field.kind==='textarea'?<Textarea maxLength={field.max} rows={3} value={String(answers[field.id]??'')} onChange={e=>setAnswers(s=>({...s,[field.id]:e.target.value}))}/>:
      field.kind==='select'?<select className='w-full rounded-md border bg-background p-2' value={String(answers[field.id]??'')} onChange={e=>setAnswers(s=>({...s,[field.id]:e.target.value}))}><option value=''>Não informado</option>{(field.options||[]).map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select>:
       <Input type={field.kind==='date'?'date':field.kind==='count'?'number':'text'} min={field.kind==='count'?0:undefined} max={field.kind==='count'?99:undefined} maxLength={field.max} value={answers[field.id]??''} onChange={e=>setAnswers(s=>({...s,[field.id]:field.kind==='count'?(e.target.value===''?'':Number(e.target.value)):e.target.value}))}/>}
    </label>)}
   </fieldset>)}
   {!historyRevision&&<div className='space-y-3 rounded-lg border p-3'>
    <label className='flex items-start gap-2 text-sm'><input type='checkbox' checked={privacy} onChange={e=>setPrivacy(e.target.checked)} className='mt-1'/><span>Confirmo que a Fundação documentou a base legal e a necessidade de recolher estes dados, especialmente os de saúde e de menores.</span></label>
    <div className='flex flex-wrap justify-end gap-2'><Button type='submit' variant='outline' disabled={busy||!privacy}><Save className='mr-2 h-4 w-4'/>Guardar rascunho</Button><Button type='button' disabled={busy||!privacy} onClick={e=>void save(e as unknown as FormEvent,'concluida')}>{busy?'A guardar…':'Concluir avaliação'}</Button></div>
    <p className='text-xs text-muted-foreground'>A conclusão regista um parecer fundamentado; não determina automaticamente a atribuição de apoio.</p>
   </div>}
  </form>
 </div>
}
