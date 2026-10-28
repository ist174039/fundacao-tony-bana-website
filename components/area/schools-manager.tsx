'use client'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Eye, Pencil, Plus, School, UserRoundPlus, Trash2 } from 'lucide-react'
import { areaFetch } from '@/lib/area-client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RecordListControls } from '@/components/workspace/record-list-controls'

type SchoolItem = { id: string; codigo: string; nome: string; pais: string; regiao?: string; municipio?: string; localidade?: string; endereco?: string; telefone?: string; email?: string; estado: 'ativa' | 'inativa' }
type Contact = { id: string; nome: string; cargo: string; email?: string; telefone?: string; principal?: boolean }
type FormState = { codigo: string; nome: string; pais: string; regiao: string; municipio: string; localidade: string; endereco: string; telefone: string; email: string; estado: 'ativa' | 'inativa' }
const fresh = (): FormState => ({ codigo:'',nome:'',pais:'',regiao:'',municipio:'',localidade:'',endereco:'',telefone:'',email:'',estado:'ativa' })
const freshContact = () => ({ nome:'',cargo:'',email:'',telefone:'',principal:false })
const PAGE_SIZE = 10
export function SchoolsManager() {
  const [rows,setRows]=useState<SchoolItem[]>([]),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[sort,setSort]=useState('name_asc'),[page,setPage]=useState(1)
  const [mode,setMode]=useState<'new'|'view'|'edit'|null>(null),[selected,setSelected]=useState<SchoolItem|null>(null),[form,setForm]=useState<FormState>(fresh())
  const [contacts,setContacts]=useState<Contact[]>([]),[contact,setContact]=useState(freshContact()),[editingContactId,setEditingContactId]=useState<string|null>(null),[contactBusy,setContactBusy]=useState(false)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const refresh=useCallback(async()=>{const result=await areaFetch<{escolas:SchoolItem[]}>('/api/area/schools');setRows(result.escolas)},[])
  useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:'Não foi possível consultar escolas.'))},[refresh])
  const filtered=useMemo(()=>rows.filter(r=>`${r.codigo} ${r.nome} ${r.pais} ${r.regiao||''} ${r.municipio||''}`.toLocaleLowerCase('pt-PT').includes(search.toLocaleLowerCase('pt-PT'))&&(filter==='all'||r.estado===filter)).sort((a,b)=>{
    const key=sort==='code_asc'?'codigo':'nome';const dir=sort==='name_desc'?-1:1;return dir*String(a[key]).localeCompare(String(b[key]),'pt-PT',{numeric:true})
  }),[rows,search,filter,sort])
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),shown=filtered.slice((Math.min(page,pages)-1)*PAGE_SIZE,Math.min(page,pages)*PAGE_SIZE)
  const close=()=>{setMode(null);setSelected(null);setContacts([]);setEditingContactId(null);setContact(freshContact());setError('')}
  const openNew=()=>{setForm(fresh());setSelected(null);setMode('new');setError('');setNotice('')}
  const openSchool=(row:SchoolItem,edit=false)=>{setSelected(row);setForm({...fresh(),...row});setMode(edit?'edit':'view');setContacts([]);setEditingContactId(null);setContact(freshContact());setError('');void areaFetch<{contactos:Contact[]}>(`/api/area/schools/${encodeURIComponent(row.codigo)}/contacts`).then(r=>setContacts(r.contactos)).catch(e=>setError(e instanceof Error?e.message:'Falha ao consultar os responsáveis.'))}
  const archive=async(row:SchoolItem)=>{if(!window.confirm(`Arquivar a escola ${row.nome}? Os registos históricos serão mantidos.`))return;setBusy(true);setError('');try{await areaFetch(`/api/area/schools/${encodeURIComponent(row.codigo)}`,{method:'DELETE'});await refresh();close();setNotice('Escola arquivada.')}catch(e){setError(e instanceof Error?e.message:'Falha ao arquivar escola.')}finally{setBusy(false)}}
  const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{
    if(mode==='edit'&&selected){const {codigo,...update}=form;await areaFetch(`/api/area/schools/${encodeURIComponent(selected.codigo)}`,{method:'PATCH',body:JSON.stringify(update)})}
    else await areaFetch('/api/area/schools',{method:'POST',body:JSON.stringify(form)})
    await refresh();setNotice(mode==='edit'?'Escola atualizada.':'Escola registada.');close()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar a escola.')}finally{setBusy(false)}}
  const saveContact=async(e:FormEvent)=>{e.preventDefault();if(!selected)return;setContactBusy(true);setError('');try{
    const url=`/api/area/schools/${encodeURIComponent(selected.codigo)}/contacts${editingContactId?'/'+encodeURIComponent(editingContactId):''}`
    await areaFetch(url,{method:editingContactId?'PATCH':'POST',body:JSON.stringify(contact)})
    const response=await areaFetch<{contactos:Contact[]}>(`/api/area/schools/${encodeURIComponent(selected.codigo)}/contacts`)
    setContacts(response.contactos);setEditingContactId(null);setContact(freshContact());setNotice(editingContactId?'Responsável atualizado.':'Responsável adicionado.')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar o responsável.')}finally{setContactBusy(false)}}
  const removeContact=async(c:Contact)=>{if(!selected||contactBusy)return;if(!window.confirm(`Eliminar o responsável ${c.nome} desta escola? Esta operação será auditada.`))return;setContactBusy(true);setError('');try{
    await areaFetch(`/api/area/schools/${encodeURIComponent(selected.codigo)}/contacts/${encodeURIComponent(c.id)}`,{method:'DELETE'})
    setContacts(p=>p.filter(x=>x.id!==c.id));if(editingContactId===c.id){setEditingContactId(null);setContact(freshContact())}setNotice('Responsável eliminado.')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível eliminar o responsável.')}finally{setContactBusy(false)}}
  const editContact=(c:Contact)=>{setEditingContactId(c.id);setContact({nome:c.nome,cargo:c.cargo,email:c.email||'',telefone:c.telefone||'',principal:c.principal===true});setError('')}
  return <div className='space-y-4'>
    {notice&&<Alert><AlertDescription>{notice}</AlertDescription></Alert>}
    {error&&<Alert variant='destructive'><AlertDescription>{error}</AlertDescription></Alert>}
    <Card className='site-card overflow-hidden'><CardHeader className='flex flex-row items-center justify-between gap-3'><div><CardTitle className='flex items-center gap-2'><School className='h-5 w-5 text-primary'/>Escolas</CardTitle><p className='mt-1 text-sm text-muted-foreground'>Cadastro institucional e responsáveis. Gestão no painel lateral.</p></div><Button onClick={openNew}><Plus className='mr-2 h-4 w-4'/>Nova escola</Button></CardHeader>
      <CardContent className='space-y-2 p-0'><RecordListControls search={search} onSearchChange={v=>{setSearch(v);setPage(1)}} placeholder='Pesquisar por escola, código ou localização' filter={filter} onFilterChange={v=>{setFilter(v);setPage(1)}} filterOptions={[{value:'all',label:'Todas'},{value:'ativa',label:'Ativas'},{value:'inativa',label:'Inativas'}]} sort={sort} onSortChange={v=>{setSort(v);setPage(1)}} sortOptions={[{value:'name_asc',label:'Nome A–Z'},{value:'name_desc',label:'Nome Z–A'},{value:'code_asc',label:'Código'}]} page={Math.min(page,pages)} pageCount={pages} total={filtered.length} onPageChange={setPage}/>
      {filtered.length===0?<p className='p-8 text-center text-sm text-muted-foreground'>Sem escolas para estes filtros.</p>:<div className='overflow-x-auto'><Table><TableHeader><TableRow><TableHead>Escola</TableHead><TableHead>Código</TableHead><TableHead>País / região</TableHead><TableHead>Estado</TableHead><TableHead className='text-right'>Ações</TableHead></TableRow></TableHeader><TableBody>{shown.map(row=><TableRow key={row.id}><TableCell className='font-medium'>{row.nome}</TableCell><TableCell>{row.codigo}</TableCell><TableCell>{row.pais}{row.regiao?` · ${row.regiao}`:''}</TableCell><TableCell><Badge variant={row.estado==='ativa'?'default':'secondary'}>{row.estado==='ativa'?'Ativa':'Inativa'}</Badge></TableCell><TableCell className='text-right'><Button variant='ghost' size='sm' onClick={()=>openSchool(row)}><Eye className='mr-1.5 h-4 w-4'/>Ver</Button><Button variant='outline' size='sm' onClick={()=>openSchool(row,true)}><Pencil className='mr-1.5 h-4 w-4'/>Editar</Button></TableCell></TableRow>)}</TableBody></Table></div>}
      </CardContent></Card>
    <Sheet open={mode!==null} onOpenChange={v=>{if(!v)close()}}><SheetContent side='right' className='w-full overflow-y-auto sm:max-w-xl'><SheetHeader><SheetTitle>{mode==='new'?'Nova escola':mode==='edit'?'Editar escola':selected?.nome||'Escola'}</SheetTitle><SheetDescription>Registos institucionais privados. Dados de alunos têm módulo próprio e permanecem desativados.</SheetDescription></SheetHeader>
      {error&&<p role='alert' className='mt-4 text-sm text-destructive'>{error}</p>}
      {(mode==='new'||mode==='edit')&&<form className='mt-6 space-y-3' onSubmit={save}>{(['codigo','nome','pais','regiao','municipio','localidade','endereco','telefone','email'] as const).map(key=><label key={key} className='block text-sm'><span className='mb-1 block capitalize'>{key==='codigo'?'Código único':key}</span><Input disabled={busy||(mode==='edit'&&key==='codigo')} required={['codigo','nome','pais'].includes(key)} type={key==='email'?'email':'text'} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/></label>)}<label className='block text-sm'>Estado<select className='mt-1 block w-full rounded-md border bg-background p-2' value={form.estado} disabled={busy} onChange={e=>setForm(p=>({...p,estado:e.target.value as FormState['estado']}))}><option value='ativa'>Ativa</option><option value='inativa'>Inativa</option></select></label><div className='flex justify-end gap-2 pt-4'><Button type='button' variant='outline' onClick={close}>Cancelar</Button><Button type='submit' disabled={busy}>{busy?'A guardar…':'Guardar escola'}</Button></div></form>}
      {mode==='view'&&selected&&<div className='mt-6 space-y-5'><dl className='grid grid-cols-2 gap-3 text-sm'>{([['Código',selected.codigo],['País',selected.pais],['Região',selected.regiao],['Município',selected.municipio],['Localidade',selected.localidade],['Telefone institucional',selected.telefone],['Email institucional',selected.email]] as [string,string|undefined][]).map(([k,v])=><div key={k} className='rounded-lg border p-3'><dt className='text-muted-foreground'>{k}</dt><dd className='mt-1 break-words font-medium'>{v||'—'}</dd></div>)}</dl><div className='flex justify-between'><h3 className='font-semibold'>Responsáveis</h3><Button size='sm' variant='outline' onClick={()=>openSchool(selected,true)}><Pencil className='mr-1.5 h-4 w-4'/>Editar escola</Button></div>{contacts.map(c=><div key={c.id} className='rounded-lg border p-3 text-sm'><strong>{c.nome}</strong> · {c.cargo}<p>{c.email||c.telefone||'Sem contacto'}</p><div className='mt-2 flex gap-2'><Button type='button' size='sm' variant='outline' disabled={contactBusy} onClick={()=>editContact(c)}><Pencil className='mr-1 h-3.5 w-3.5'/>Editar</Button><Button type='button' size='sm' variant='destructive' disabled={contactBusy} onClick={()=>void removeContact(c)}><Trash2 className='mr-1 h-3.5 w-3.5'/>Eliminar</Button></div></div>)}{!contacts.length&&<p className='text-sm text-muted-foreground'>Ainda não existem responsáveis associados.</p>}<form onSubmit={saveContact} className='space-y-2 rounded-lg border p-4'><h4 className='flex items-center gap-2 font-medium'><UserRoundPlus className='h-4 w-4'/>{editingContactId?'Editar responsável':'Adicionar responsável'}</h4>{(['nome','cargo','telefone','email'] as const).map(key=><label key={key} className='block text-sm'><span className='capitalize'>{key}</span><Input type={key==='email'?'email':'text'} required={key==='nome'||key==='cargo'} value={contact[key]} disabled={contactBusy} onChange={e=>setContact(p=>({...p,[key]:e.target.value}))}/></label>)}<p className='text-xs text-muted-foreground'>Indica pelo menos telefone ou email; o servidor valida.</p><div className='flex gap-2'><Button type='submit' disabled={contactBusy}>{contactBusy?'A guardar…':editingContactId?'Guardar alterações':'Adicionar'}</Button>{editingContactId&&<Button type='button' variant='outline' disabled={contactBusy} onClick={()=>{setEditingContactId(null);setContact(freshContact())}}>Cancelar edição</Button>}</div></form></div>}
    </SheetContent></Sheet>
  </div>
}
