'use client'
import { useEffect,useState,type FormEvent } from 'react'
import { areaFetch } from '@/lib/area-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
type Assessment=Record<string,string>
type UserOption={uid:string;displayName:string;email:string;linkedSocio?:string|null;disabled:boolean}
const sections:{heading:string;fields:[string,string,string?][]}[]=[
 {heading:'A. Identificação da família',fields:[['dataVisita','Data da visita','date'],['voluntario','Nome do voluntário','volunteer'],['representante','Representante da família'],['comunidade','Comunidade'],['telefone','Telefone']]},
 {heading:'B. Composição familiar',fields:[['pessoas','Pessoas na residência','number'],['adultos','Adultos','number'],['criancas','Crianças e adolescentes','number'],['idosos','Existem idosos?','yesno'],['deficiencia','Existe pessoa com deficiência?','yesno']]},
 {heading:'C. Educação',fields:[['frequentaEscola','Todas as crianças frequentam a escola?','yesno'],['motivoFaltaEscola','Se não, indicar motivo']]},
 {heading:'D. Saúde',fields:[['doencaCronica','Existe doença crónica?','yesno'],['tratamentoEspecializado','Precisa de tratamento especializado?','yesno'],['medicacaoContinua','Utilização contínua de medicamentos?','yesno'],['observacoesSaude','Observações de saúde','textarea']]},
 {heading:'E. Trabalho e rendimento',fields:[['pessoasEmpregadas','Pessoas com trabalho remunerado','work'],['fonteRendimento','Principal fonte de rendimento','income'],['nivelRendimento','Rendimento mensal da família','level']]},
 {heading:'F. Alimentação',fields:[['refeicoesDia','Refeições por dia','meals'],['faltaAlimentos','Faltou alimento nos últimos 30 dias?','food']]},
 {heading:'G. Habitação',fields:[['tipoMoradia','Situação da moradia','housing'],['materialConstrucao','Material predominante','material'],['casaBanho','Possui casa de banho?','yesno'],['aguaPotavel','Acesso a água potável?','yesno'],['eletricidade','Eletricidade?','yesno']]},
 {heading:'Observação do voluntário',fields:[['condicaoHabitacao','Condição da habitação','condition'],['higiene','Condições de higiene','hygiene'],['situacaoGeral','Situação geral','situation']]},
 {heading:'Recomendação',fields:[['recomendacao','Recomendação da avaliação','recommendation'],['justificacao','Justificação','textarea'],['observacoesGerais','Observações gerais','textarea']]}
]
const options:Record<string,string[]>={
 yesno:['Sim','Não'],work:['Nenhuma','1 pessoa','2 pessoas','3 ou mais pessoas'],
 income:['Emprego Formal','Biscato / Trabalho Informal','Agricultura','Apoio Social','Não possui rendimento'],
 level:['Sem rendimento','Baixo','Médio','Alto'],meals:['0 a 1 refeição','2 refeições','3 ou mais refeições'],
 food:['Nunca','Às vezes','Frequentemente'],housing:['Própria','Arrendada','Cedida'],
 material:['Alvenaria','Chapa','Outro'],condition:['Boa','Regular','Precária'],
 hygiene:['Boa','Regular','Má'],situation:['Estável','Vulnerável','Crítica'],
 recommendation:['Assistência Permanente','Assistência Temporária','Encaminhamento para Formação/Emprego','Microcrédito','Não Elegível']
}
export function FamilyAssessmentTab({studentId}:{studentId:string}){
 const [users,setUsers]=useState<UserOption[]>([]),[usersLoading,setUsersLoading]=useState(true),[value,setValue]=useState<Assessment>({}),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('')
 useEffect(()=>{let active=true;setUsersLoading(true);void areaFetch<{users:UserOption[]}>('/api/area/users',{cache:'no-store'}).then(r=>{if(active)setUsers(r.users.filter(u=>!u.disabled))}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Utilizadores indisponíveis.')}).finally(()=>{if(active)setUsersLoading(false)});return()=>{active=false}},[])
 useEffect(()=>{let active=true;setLoading(true);setError('');void areaFetch<{avaliacao:Assessment|null}>(`/api/area/students/${studentId}/family-assessment`,{cache:'no-store'}).then(r=>{if(active)setValue(r.avaliacao||{})}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Avaliação indisponível.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[studentId])
 const save=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setError('');setNotice('');try{await areaFetch(`/api/area/students/${studentId}/family-assessment`,{method:'PUT',body:JSON.stringify({...Object.fromEntries(sections.flatMap(s=>s.fields.map(([key])=>[key,value[key]||'']))),voluntarioUid:value.voluntarioUid||''})});setNotice('Avaliação familiar guardada com auditoria.')}catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar.')}finally{setSaving(false)}}
 return <div className='mt-5 space-y-4'><p className='text-xs text-muted-foreground'>Ficha privada de avaliação socioeconómica, baseada no questionário de Guiné-Bissau. Acesso reservado a administradores autorizados.</p>{loading?<p>A carregar avaliação…</p>:<form onSubmit={save} className='space-y-5'>{sections.map(s=><fieldset key={s.heading} className='space-y-3 rounded-lg border p-3'><legend className='px-2 font-semibold'>{s.heading}</legend>{s.fields.map(([key,label,type])=><label key={key} className='block text-sm'>{label}{type==='volunteer'?<select required className='mt-1 w-full rounded-md border bg-background p-2' value={value.voluntarioUid||''} disabled={usersLoading||saving} onChange={e=>{const user=users.find(u=>u.uid===e.target.value);setValue(v=>({...v,voluntarioUid:user?.uid||'',voluntario:user?.displayName||user?.linkedSocio||user?.email||''}))}}><option value=''>Selecionar utilizador</option>{users.map(user=><option key={user.uid} value={user.uid}>{user.displayName||user.linkedSocio||user.email} ({user.email})</option>)}</select>:type==='textarea'?<textarea className='mt-1 min-h-20 w-full rounded-md border bg-background p-2' maxLength={1500} value={value[key]||''} onChange={e=>setValue(v=>({...v,[key]:e.target.value}))}/>:options[type||'']?<select className='mt-1 w-full rounded-md border bg-background p-2' value={value[key]||''} onChange={e=>setValue(v=>({...v,[key]:e.target.value}))}><option value=''>Selecionar</option>{options[type!].map(o=><option key={o} value={o}>{o}</option>)}</select>:<Input className='mt-1' required={['dataVisita','representante'].includes(key)} type={type||'text'} min={type==='number'?'0':undefined} maxLength={1500} value={value[key]||''} onChange={e=>setValue(v=>({...v,[key]:e.target.value}))}/>}</label>)}</fieldset>)}{error&&<p role='alert' className='text-sm text-destructive'>{error}</p>}{notice&&<p role='status' className='text-sm text-green-700'>{notice}</p>}<Button type='submit' disabled={saving||usersLoading}>{saving?'A guardar…':'Guardar avaliação familiar'}</Button></form>}</div>
}
