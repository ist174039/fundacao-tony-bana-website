'use client'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { FileText, Download, Archive, FilePenLine, Folder, FolderPlus, History, Pencil, Plus, RotateCcw, Share2, UsersRound } from 'lucide-react'
import { areaFetch } from '@/lib/area-client'
import { auth } from '@/lib/firebase'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RecordListControls } from '@/components/workspace/record-list-controls'
import { UserMultiSelect, type SelectableUser } from '@/components/area/user-multi-select'

type Team={id:string;name:string;memberUids?:string[];revision:number;permissions?:{create:boolean;update:boolean;delete:boolean}}
type Folder={id:string;name:string;teamId:string;parentId:string|null}
type Doc={id:string;name:string;teamId:string;folderId:string;classification:string;mimeType:string;latestVersion:number;updatedAt:string;createdBy:string;acl:{teamIds:string[];userUids:string[]};revision?:number;status?:'active'|'archived';permissions?:{download:boolean;update:boolean;delete:boolean;restore:boolean;share:boolean}}
type Version={version:number;sha256:string;byteLength:number;createdAt:string;createdBy:string}
const PAGE_SIZE=10
async function binaryFetch(path:string,init:RequestInit={}){
 const user=auth.currentUser
 if(!user)throw new Error('Sessão terminada. Inicia sessão novamente.')
 const response=await fetch(path,{...init,headers:{Authorization:`Bearer ${await user.getIdToken(true)}`,...init.headers},cache:'no-store'})
 if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(typeof data.error==='string'?data.error:'Operação indisponível.')}
 return response
}
export function DocumentWorkspaceManager(){
 const [teams,setTeams]=useState<Team[]>([]),[folders,setFolders]=useState<Folder[]>([]),[docs,setDocs]=useState<Doc[]>([]),[isAdmin,setIsAdmin]=useState(false)
 const [teamId,setTeamId]=useState('all'),[folderId,setFolderId]=useState('all'),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[sort,setSort]=useState('desc'),[page,setPage]=useState(1)
 const [mode,setMode]=useState<'team'|'members'|'folder'|'rename-folder'|'upload'|'document'|'edit-document'|'archive-document'|'restore-document'|null>(null),[selected,setSelected]=useState<Doc|null>(null)
 const [actionTeamId,setActionTeamId]=useState(''),[actionFolderId,setActionFolderId]=useState(''),[selectedFolderId,setSelectedFolderId]=useState(''),[teamName,setTeamName]=useState(''),[memberUids,setMemberUids]=useState<string[]>([]),[users,setUsers]=useState<SelectableUser[]>([]),[usersLoading,setUsersLoading]=useState(false),[folderName,setFolderName]=useState(''),[parentId,setParentId]=useState(''),[file,setFile]=useState<File|null>(null),[classification,setClassification]=useState('internal')
 const [showArchived,setShowArchived]=useState(false),[editName,setEditName]=useState(''),[editFolderId,setEditFolderId]=useState(''),[editClassification,setEditClassification]=useState('internal'),[changeReason,setChangeReason]=useState('')
 const [versions,setVersions]=useState<Version[]>([]),[shareUids,setShareUids]=useState<string[]>([]),[versionFile,setVersionFile]=useState<File|null>(null)
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const refresh=useCallback(async()=>{
  // Do not discard an otherwise successful folder/team refresh when a document list fails.
  const [t,f,d]=await Promise.allSettled([
   areaFetch<{teams:Team[];admin:boolean}>('/api/area/document-teams'),
   areaFetch<{folders:Folder[]}>('/api/area/document-folders'),
   areaFetch<{documents:Doc[]}>('/api/area/documents'),
  ])
  const errors:string[]=[]
  if(t.status==='fulfilled'){setTeams(t.value.teams);setIsAdmin(t.value.admin===true)}
  else errors.push('Equipas: '+(t.reason instanceof Error?t.reason.message:'erro de consulta'))
  if(f.status==='fulfilled')setFolders(f.value.folders)
  else errors.push('Pastas: '+(f.reason instanceof Error?f.reason.message:'erro de consulta'))
  if(d.status==='fulfilled')setDocs(d.value.documents)
  else errors.push('Documentos: '+(d.reason instanceof Error?d.reason.message:'erro de consulta'))
  if(errors.length)throw new Error(errors.join(' · '))
 },[])
 useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:'Biblioteca indisponível.'))},[refresh])
 const visibleFolders=folders.filter(f=>teamId==='all'||f.teamId===teamId)
 const teamCan=(id:string,action:'create'|'update'|'delete')=>teams.some(t=>t.id===id&&t.permissions?.[action]===true)
 const writableTeams=teams.filter(t=>t.permissions?.create===true)
 const writableFolders=folders.filter(f=>teamCan(f.teamId,'create'))
 const canCreateFolder=writableTeams.length>0
 const canUploadDocument=writableFolders.length>0
 const filtered=useMemo(()=>docs.filter(d=>(d.status==='archived')===showArchived&&(teamId==='all'||d.teamId===teamId)&&(folderId==='all'||d.folderId===folderId)&&(filter==='all'||d.classification===filter)&&`${d.name} ${teams.find(t=>t.id===d.teamId)?.name||''}`.toLocaleLowerCase('pt-PT').includes(search.toLocaleLowerCase('pt-PT'))).sort((a,b)=>(sort==='asc'?1:-1)*String(a.updatedAt).localeCompare(String(b.updatedAt))),[docs,showArchived,teamId,folderId,filter,search,sort,teams])
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),shown=filtered.slice((Math.min(page,pages)-1)*PAGE_SIZE,Math.min(page,pages)*PAGE_SIZE)
 const loadUsers=async()=>{setUsersLoading(true);try{const result=await areaFetch<{users:SelectableUser[]}>('/api/area/users',{cache:'no-store'});setUsers(result.users)}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os utilizadores.')}finally{setUsersLoading(false)}}
 const close=()=>{setMode(null);setError('');setFile(null);setVersionFile(null);setSelectedFolderId('');setChangeReason('')}
 const start=(next:typeof mode)=>{
  setMode(next);setError('');setNotice('');setSelected(null);setTeamName('');setMemberUids([])
  if(next==='team')void loadUsers()
  setFolderName('');setParentId('')
  setActionTeamId(teamId!=='all'&&teamCan(teamId,'create')?teamId:(writableTeams[0]?.id||''))
  setActionFolderId(folderId!=='all'&&writableFolders.some(f=>f.id===folderId)?folderId:(writableFolders[0]?.id||''))
  setFile(null)
 }
 const startRename=(folder:Folder)=>{
  if(!teamCan(folder.teamId,'update'))return
  setMode('rename-folder');setSelectedFolderId(folder.id);setFolderName(folder.name);setError('');setNotice('')
 }
 const submit=async(fn:()=>Promise<unknown>,success:string,onSuccess?:(value:unknown)=>void)=>{
  setBusy(true);setError('')
  try{
   const value=await fn()
   let refreshWarning=''
   try{await refresh()}catch(e){refreshWarning=' O registo foi guardado, mas a lista não foi totalmente atualizada: '+(e instanceof Error?e.message:'erro de consulta')}
   onSuccess?.(value)
   close()
   setNotice(success+refreshWarning)
  }catch(e){setError(e instanceof Error?e.message:'Operação não concluída.')}
  finally{setBusy(false)}
 }
 const parseUids=(text:string)=>text.split(/[\s,;]+/).map(v=>v.trim()).filter(Boolean)
 const createTeam=async(e:FormEvent)=>{e.preventDefault();await submit(()=>areaFetch<{team:Team}>('/api/area/document-teams',{method:'POST',body:JSON.stringify({name:teamName,memberUids})}),'Equipa criada. Agora podes organizar os documentos em pastas.',value=>{const result=value as {team:Team};setTeamId(result.team.id);setFolderId('all')})}
 const saveMembers=async(e:FormEvent)=>{e.preventDefault();const t=teams.find(t=>t.id===teamId);if(!t)return;await submit(()=>areaFetch(`/api/area/document-teams/${encodeURIComponent(t.id)}`,{method:'PATCH',body:JSON.stringify({name:t.name,memberUids,expectedRevision:t.revision})}),'Permissões da equipa atualizadas.')}
 const createFolder=async(e:FormEvent)=>{e.preventDefault();await submit(()=>areaFetch<{folder:Folder}>('/api/area/document-folders',{method:'POST',body:JSON.stringify({name:folderName,teamId:actionTeamId,parentId:parentId||null})}),'Pasta criada com sucesso. Já podes adicionar documentos nesta pasta.',value=>{const result=value as {folder:Folder};setTeamId(result.folder.teamId);setFolderId(result.folder.id);setPage(1)})}
 const renameFolder=async(e:FormEvent)=>{
  e.preventDefault()
  const folder=folders.find(f=>f.id===selectedFolderId)
  if(!folder||!teamCan(folder.teamId,'update'))return setError('Não tens permissão para renomear esta pasta.')
  await submit(()=>areaFetch(`/api/area/document-folders/${encodeURIComponent(folder.id)}`,{method:'PATCH',body:JSON.stringify({name:folderName})}),'Nome da pasta atualizado.')
 }
 const upload=async(e:FormEvent)=>{e.preventDefault();if(!file)return setError('Seleciona um ficheiro.');await submit(async()=>{const data=new FormData();data.set('file',file);data.set('folderId',actionFolderId);data.set('classification',classification);await binaryFetch('/api/area/documents',{method:'POST',body:data})},'Documento carregado com a versão 1.')}
 const startDocumentAction=(next:'edit-document'|'archive-document'|'restore-document',doc:Doc)=>{
  setSelected(doc);setMode(next);setError('');setNotice('');setEditName(doc.name);setEditFolderId(doc.folderId);setEditClassification(doc.classification);setChangeReason('')
 }
 const saveDocument=async(e:FormEvent)=>{
  e.preventDefault();if(!selected||!selected.permissions?.update)return
  await submit(()=>areaFetch(`/api/area/documents/${selected.id}`,{method:'PATCH',body:JSON.stringify({
   name:editName,folderId:editFolderId,classification:editClassification,expectedRevision:selected.revision||0
  })}),'Documento atualizado. As versões originais foram preservadas.')
 }
 const archiveDocument=async(e:FormEvent)=>{
  e.preventDefault();if(!selected||!selected.permissions?.delete)return
  await submit(()=>areaFetch(`/api/area/documents/${selected.id}`,{method:'DELETE',
   body:JSON.stringify({expectedRevision:selected.revision||0,reason:changeReason})}),
   'Documento arquivado. O histórico e os ficheiros foram preservados; deixa de estar acessível para consulta.')
 }
 const restoreDocument=async(e:FormEvent)=>{
  e.preventDefault();if(!selected||!selected.permissions?.restore)return
  await submit(()=>areaFetch(`/api/area/documents/${selected.id}`,{method:'PATCH',
   body:JSON.stringify({operation:'restore',expectedRevision:selected.revision||0,reason:changeReason})}),
   'Documento restaurado com o histórico de versões intacto.')
 }
 const openDocument=(doc:Doc)=>{setSelected(doc);setShareUids(doc.acl?.userUids||[]);setMode('document');if(isAdmin)void loadUsers();setError('');setVersions([]);if(doc.status!=='archived')void areaFetch<{versions:Version[]}>(`/api/area/documents/${doc.id}/versions`).then(r=>setVersions(r.versions)).catch(e=>setError(e instanceof Error?e.message:'Erro ao consultar versões.'))}
 const download=async(d:Doc,version?:number)=>{setBusy(true);setError('');try{const result=await binaryFetch(`/api/area/documents/${d.id}/download${version?`?version=${version}`:''}`);const blob=await result.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=d.name;a.click();URL.revokeObjectURL(url)}catch(e){setError(e instanceof Error?e.message:'Falha no download.')}finally{setBusy(false)}}
 const uploadVersion=async(e:FormEvent)=>{e.preventDefault();if(!selected||!versionFile)return;setBusy(true);setError('');try{const data=new FormData();data.set('file',versionFile);data.set('expectedVersion',String(selected.latestVersion));await binaryFetch(`/api/area/documents/${selected.id}/versions`,{method:'POST',body:data});await refresh();close();setNotice('Nova versão guardada sem substituir a anterior.')}catch(e){setError(e instanceof Error?e.message:'Falha na atualização.')}finally{setBusy(false)}}
 const share=async(e:FormEvent)=>{e.preventDefault();if(!selected)return;await submit(()=>areaFetch(`/api/area/documents/${selected.id}/share`,{method:'PUT',body:JSON.stringify({acl:{teamIds:[selected.teamId],userUids:shareUids},expectedRevision:selected.revision||0})}),'Permissões de partilha atualizadas. Apenas membros desta equipa podem receber acesso.')}
 const selectTeam=(value:string)=>{setTeamId(value);setFolderId('all');setPage(1)}
 return <div className='space-y-4'>
  <p className='rounded-lg border bg-muted/40 px-4 py-3 text-sm'>Biblioteca privada por equipas, como no Teams: pastas, documentos com versões, permissões explícitas, histórico e acesso controlado. A partilha externa não está ativa.</p>
  {error&&<Alert variant='destructive'><AlertDescription>{error}</AlertDescription></Alert>}{notice&&<Alert><AlertDescription>{notice}</AlertDescription></Alert>}
  <div className='flex flex-wrap items-center gap-2'><label className='text-sm font-medium'>Equipa<select className='ml-2 rounded-md border bg-background p-2' value={teamId} onChange={e=>selectTeam(e.target.value)}><option value='all'>Todas as equipas</option>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label className='text-sm font-medium'>Pasta<select className='ml-2 rounded-md border bg-background p-2' value={folderId} onChange={e=>{setFolderId(e.target.value);setPage(1)}}><option value='all'>Todas as pastas</option>{visibleFolders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label></div>
  <Card className='site-card'><CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3'><div><CardTitle className='flex items-center gap-2'><Folder className='h-5 w-5 text-primary'/>Pastas da biblioteca</CardTitle><p className='mt-1 text-sm text-muted-foreground'>Seleciona uma pasta para filtrar os documentos ou renomeia-a se tiveres permissão.</p></div>{folderId!=='all'&&<Button size='sm' variant='outline' onClick={()=>{setFolderId('all');setPage(1)}}>Ver todas as pastas</Button>}</CardHeader><CardContent className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
  {visibleFolders.length===0&&<p className='col-span-full text-sm text-muted-foreground'>Ainda não há pastas nesta equipa. Cria a primeira pasta para começar a carregar documentos.</p>}
  {visibleFolders.map(folder=>{
   const team=teams.find(t=>t.id===folder.teamId)
   const active=folderId===folder.id
   return <div key={folder.id} className={`min-w-0 rounded-xl border p-3 ${active?'border-primary bg-primary/5':'bg-background'}`}>
    <button type='button' className='flex w-full items-start gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary' aria-pressed={active} onClick={()=>{setTeamId(folder.teamId);setFolderId(folder.id);setPage(1)}}>
     <Folder className='mt-0.5 h-5 w-5 shrink-0 text-primary'/><span className='min-w-0 flex-1'><span className='block break-words text-sm font-semibold'>{folder.name}</span><span className='block text-xs text-muted-foreground'>{team?.name||'Equipa'}{folder.parentId?' · Subpasta':''}</span></span>
    </button>
    {teamCan(folder.teamId,'update')&&<Button variant='ghost' size='sm' className='mt-2' onClick={()=>startRename(folder)}><Pencil className='mr-1 h-3.5 w-3.5'/>Renomear</Button>}
   </div>
  })}
 </CardContent></Card>
  <Card className='site-card overflow-hidden'><CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3'><div><CardTitle className='flex items-center gap-2'><FileText className='h-5 w-5 text-primary'/>Gestão de documentos</CardTitle><p className='mt-1 text-sm text-muted-foreground'>Ficheiros, versões e acesso por equipa. Os detalhes abrem no painel lateral.</p>{isAdmin&&<label className='mt-3 flex items-center gap-2 text-xs text-muted-foreground'><input type='checkbox' checked={showArchived} onChange={e=>{setShowArchived(e.target.checked);setPage(1)}}/>Ver documentos arquivados</label>}</div><div className='grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap'>
   {isAdmin&&<Button size='sm' variant='outline' onClick={()=>start('team')}><UsersRound className='mr-1 h-4 w-4'/>Nova equipa</Button>}
   {isAdmin&&teamId!=='all'&&<Button size='sm' variant='outline' onClick={()=>{const t=teams.find(t=>t.id===teamId);if(t){setMemberUids(t.memberUids||[]);setMode('members');void loadUsers();setError('')}}}><Share2 className='mr-1 h-4 w-4'/>Membros</Button>}
   {canCreateFolder&&<Button data-testid='document-create-folder' size='sm' variant='outline' onClick={()=>start('folder')}><FolderPlus className='mr-1 h-4 w-4'/>Nova pasta</Button>}
   {canUploadDocument&&<Button data-testid='document-upload' size='sm' onClick={()=>start('upload')}><Plus className='mr-1 h-4 w-4'/>Adicionar documento</Button>}
  </div></CardHeader><CardContent className='p-0'>
   {teams.length===0&&<div className='mx-3 mb-3 rounded-lg border border-dashed p-4 text-sm'><p className='font-medium'>Ainda não existem equipas documentais.</p><p className='mt-1 text-muted-foreground'>Cria uma equipa para organizar o acesso, depois cria uma pasta e adiciona documentos.</p>{isAdmin&&<Button className='mt-3' onClick={()=>start('team')}>Criar primeira equipa</Button>}</div>}
   {teams.length>0&&folders.length===0&&<div className='mx-3 mb-3 rounded-lg border border-dashed p-4 text-sm'><p>Para carregar documentos, começa por criar uma pasta na equipa pretendida.</p>{canCreateFolder?<Button className='mt-3' onClick={()=>start('folder')}><FolderPlus className='mr-2 h-4 w-4'/>Criar primeira pasta</Button>:<p className='mt-2 text-muted-foreground'>Tens acesso de consulta. Pede a um administrador a permissão de criação de documentos nesta equipa.</p>}</div>}
   <RecordListControls search={search} onSearchChange={v=>{setSearch(v);setPage(1)}} placeholder='Pesquisar documentos ou equipas' filter={filter} onFilterChange={v=>{setFilter(v);setPage(1)}} filterOptions={[{value:'all',label:'Todas as classes'},{value:'internal',label:'Internos'},{value:'confidential',label:'Confidenciais'},{value:'minor',label:'Dados de menores'}]} sort={sort} onSortChange={v=>{setSort(v);setPage(1)}} sortOptions={[{value:'desc',label:'Alterados recentemente'},{value:'asc',label:'Alterados mais antigos'}]} page={Math.min(page,pages)} pageCount={pages} total={filtered.length} onPageChange={setPage}/>
   {shown.length===0?<p className='p-8 text-center text-sm text-muted-foreground'>{showArchived?'Não existem documentos arquivados para estes filtros.':'Nenhum documento disponível para estes filtros.'}</p>:<div className='overflow-x-auto'><Table><TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Equipa</TableHead><TableHead>Pasta</TableHead><TableHead>Versão</TableHead><TableHead>Classificação</TableHead><TableHead>Atualização</TableHead><TableHead className='text-right'>Ações</TableHead></TableRow></TableHeader><TableBody>{shown.map(d=><TableRow key={d.id}><TableCell className='font-medium'>{d.name}</TableCell><TableCell>{teams.find(t=>t.id===d.teamId)?.name||'—'}</TableCell><TableCell>{folders.find(f=>f.id===d.folderId)?.name||'—'}</TableCell><TableCell>v{d.latestVersion}</TableCell><TableCell><Badge variant='secondary'>{d.classification==='internal'?'Interno':d.classification==='minor'?'Menor':'Confidencial'}</Badge></TableCell><TableCell>{d.updatedAt?.slice(0,10)||'—'}</TableCell><TableCell className='text-right'><div className='flex justify-end gap-1'><Button size='sm' variant='outline' onClick={()=>openDocument(d)}><History className='mr-1 h-4 w-4'/>Detalhes</Button>{d.permissions?.update&&<Button size='sm' variant='outline' aria-label={'Editar '+d.name} onClick={()=>startDocumentAction('edit-document',d)}><Pencil className='h-4 w-4'/></Button>}{d.permissions?.delete&&<Button size='sm' variant='outline' aria-label={'Arquivar '+d.name} onClick={()=>startDocumentAction('archive-document',d)}><Archive className='h-4 w-4'/></Button>}{d.permissions?.restore&&<Button size='sm' variant='outline' aria-label={'Restaurar '+d.name} onClick={()=>startDocumentAction('restore-document',d)}><RotateCcw className='h-4 w-4'/></Button>}</div></TableCell></TableRow>)}</TableBody></Table></div>}
  </CardContent></Card>
  <Sheet open={mode!==null} onOpenChange={v=>{if(!v)close()}}><SheetContent side='right' className='w-full max-w-full overflow-y-auto p-4 sm:max-w-2xl sm:p-6'><SheetHeader><SheetTitle>{mode==='team'?'Nova equipa':mode==='members'?'Gestão de membros':mode==='folder'?'Nova pasta':mode==='rename-folder'?'Renomear pasta':mode==='upload'?'Carregar documento':mode==='edit-document'?'Editar documento':mode==='archive-document'?'Arquivar documento':mode==='restore-document'?'Restaurar documento':selected?.name||'Documento'}</SheetTitle><SheetDescription>Gestão de acesso, partilha, histórico e alterações no painel lateral.</SheetDescription></SheetHeader>{error&&<p className='mt-4 text-sm text-destructive'>{error}</p>}
   {mode==='team'&&<form onSubmit={createTeam} className='mt-6 space-y-3 text-sm'><label className='block'>Nome da equipa<Input required value={teamName} onChange={e=>setTeamName(e.target.value)}/></label><div><h3 className='mb-2 font-medium'>Membros da equipa</h3><UserMultiSelect users={users} value={memberUids} onChange={setMemberUids} loading={usersLoading} disabled={busy}/></div><Button type='submit' disabled={busy||usersLoading}>Criar equipa</Button></form>}
   {mode==='members'&&<form onSubmit={saveMembers} className='mt-6 space-y-3 text-sm'><p>Membros da equipa {teams.find(t=>t.id===teamId)?.name}</p><div><h3 className='mb-2 font-medium'>Selecionar utilizadores autorizados</h3><UserMultiSelect users={users} value={memberUids} onChange={setMemberUids} loading={usersLoading} disabled={busy}/></div><p className='text-muted-foreground'>Só utilizadores Firebase existentes podem ser incluídos. A remoção revoga o acesso nas verificações seguintes.</p><Button disabled={busy||usersLoading} type='submit'>Guardar membros</Button></form>}
   {mode==='folder'&&<form onSubmit={createFolder} className='mt-6 space-y-3 text-sm'><label className='block'>Equipa<select required className='mt-1 w-full rounded-md border bg-background p-2' value={actionTeamId} onChange={e=>{setActionTeamId(e.target.value);setParentId('')}}><option value=''>Selecionar equipa</option>{writableTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className='block'>Nome da pasta<Input required minLength={2} maxLength={140} value={folderName} onChange={e=>setFolderName(e.target.value)}/></label><label className='block'>Pasta superior<select className='mt-1 w-full rounded-md border bg-background p-2' value={parentId} onChange={e=>setParentId(e.target.value)}><option value=''>Raiz da equipa</option>{folders.filter(f=>f.teamId===actionTeamId).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><Button disabled={busy||!actionTeamId} type='submit'>Criar pasta</Button></form>}
   {mode==='rename-folder'&&<form onSubmit={renameFolder} className='mt-6 space-y-3 text-sm'><p className='text-muted-foreground'>A pasta mantém a equipa, a localização e os documentos associados. Apenas o nome é alterado.</p><label className='block'>Nome da pasta<Input required minLength={2} maxLength={140} value={folderName} onChange={e=>setFolderName(e.target.value)}/></label><Button disabled={busy} type='submit'>Guardar nome</Button></form>}
   {mode==='upload'&&<form onSubmit={upload} className='mt-6 space-y-3 text-sm'><label className='block'>Pasta de destino<select required className='mt-1 w-full rounded-md border bg-background p-2' value={actionFolderId} onChange={e=>setActionFolderId(e.target.value)}><option value=''>Selecionar pasta</option>{writableFolders.map(f=><option key={f.id} value={f.id}>{teams.find(t=>t.id===f.teamId)?.name||'Equipa'} / {f.name}</option>)}</select></label><label className='block'>Ficheiro (PDF, imagem ou texto; até 10 MB)<Input required type='file' accept='.pdf,.jpg,.jpeg,.png,.webp,.txt' onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label className='block'>Classificação<select className='mt-1 w-full rounded-md border bg-background p-2' value={classification} onChange={e=>setClassification(e.target.value)}><option value='internal'>Interno</option><option value='confidential'>Confidencial</option><option value='minor'>Dados de menores</option></select></label><p className='text-muted-foreground'>Cada carregamento cria uma versão imutável num armazenamento privado. Documentos confidenciais exigem permissões explícitas.</p><Button disabled={busy||!actionFolderId||!file} type='submit'>Adicionar documento</Button></form>}
   {mode==='edit-document'&&selected&&<form onSubmit={saveDocument} className='mt-6 space-y-4 text-sm'>
    <p className='text-muted-foreground'>Editar o nome, pasta de destino ou classificação não altera o ficheiro nem apaga as versões anteriores.</p>
    <label className='block'>Nome do documento<Input required minLength={2} maxLength={180} value={editName} onChange={e=>setEditName(e.target.value)}/></label>
    <label className='block'>Pasta<select className='mt-1 w-full rounded-md border bg-background p-2' required value={editFolderId} onChange={e=>setEditFolderId(e.target.value)}>{folders.filter(f=>f.teamId===selected.teamId).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
    <label className='block'>Classificação<select disabled={!isAdmin} className='mt-1 w-full rounded-md border bg-background p-2' value={editClassification} onChange={e=>setEditClassification(e.target.value)}><option value='internal'>Interno</option><option value='confidential'>Confidencial</option><option value='minor'>Dados de menores</option></select></label>
    {!isAdmin&&<p className='text-muted-foreground'>A classificação é alterada exclusivamente pelo administrador.</p>}
    <Button type='submit' disabled={busy}><FilePenLine className='mr-2 h-4 w-4'/>Guardar alterações</Button>
   </form>}
   {(mode==='archive-document'||mode==='restore-document')&&selected&&<form className='mt-6 space-y-4 text-sm' onSubmit={mode==='archive-document'?archiveDocument:restoreDocument}>
    <p className='font-medium'>{mode==='archive-document'?'Queres arquivar este documento?':'Queres restaurar este documento?'}</p>
    <p className='text-muted-foreground'>{mode==='archive-document'?'Ao arquivar, o ficheiro deixa de estar disponível para pesquisa e download. As versões permanecem privadas para permitir recuperação auditada.':'A restauração torna o documento novamente acessível de acordo com as permissões originais da equipa e do ficheiro.'}</p>
    <label className='block'>Justificação (obrigatória)<textarea className='mt-1 w-full rounded-md border bg-background p-3' rows={3} required minLength={8} maxLength={500} value={changeReason} onChange={e=>setChangeReason(e.target.value)} placeholder='Motivo institucional da alteração'/></label>
    <Button type='submit' disabled={busy||changeReason.trim().length<8} variant={mode==='archive-document'?'destructive':'default'}>{mode==='archive-document'?'Confirmar arquivamento':'Restaurar documento'}</Button>
   </form>}
   {mode==='document'&&selected&&<div className='mt-6 space-y-5 text-sm'><div className='grid grid-cols-2 gap-3'>{([['Equipa',teams.find(t=>t.id===selected.teamId)?.name],['Pasta',folders.find(f=>f.id===selected.folderId)?.name],['Classificação',selected.classification],['Versão atual',`v${selected.latestVersion}`],['Criado por',selected.createdBy]] as [string,string|undefined][]).map(([k,v])=><div className='rounded-lg border p-3' key={k}><p className='text-muted-foreground'>{k}</p><p className='mt-1 break-words font-medium'>{v||'—'}</p></div>)}</div><div className='flex flex-wrap gap-2'>{selected.permissions?.download&&<Button disabled={busy} onClick={()=>void download(selected)}><Download className='mr-1 h-4 w-4'/>Descarregar versão atual</Button>}{selected.permissions?.update&&<Button variant='outline' disabled={busy} onClick={()=>startDocumentAction('edit-document',selected)}><Pencil className='mr-1 h-4 w-4'/>Editar documento</Button>}{selected.permissions?.delete&&<Button variant='outline' disabled={busy} onClick={()=>startDocumentAction('archive-document',selected)}><Archive className='mr-1 h-4 w-4'/>Arquivar documento</Button>}{selected.permissions?.restore&&<Button variant='outline' disabled={busy} onClick={()=>startDocumentAction('restore-document',selected)}><RotateCcw className='mr-1 h-4 w-4'/>Restaurar documento</Button>}</div>
    {selected.status!=='archived'&&<section className='space-y-2 border-t pt-4'><h3 className='font-semibold'>Histórico de versões</h3>{versions.map(v=><div key={v.version} className='flex items-center justify-between rounded-lg border p-3'><div><strong>Versão {v.version}</strong><p className='text-muted-foreground'>{v.createdAt?.slice(0,16).replace('T',' ')} · {v.byteLength} bytes · {v.createdBy}</p><p className='break-all font-mono text-xs text-muted-foreground'>SHA-256 {v.sha256}</p></div><Button disabled={busy} size='sm' variant='outline' onClick={()=>void download(selected,v.version)}><Download className='h-4 w-4'/></Button></div>)}</section>}
    {selected.permissions?.update===true?<form className='space-y-2 border-t pt-4' onSubmit={uploadVersion}><h3 className='font-semibold'>Carregar nova versão</h3><Input required type='file' accept='.pdf,.jpg,.jpeg,.png,.webp,.txt' onChange={e=>setVersionFile(e.target.files?.[0]||null)}/><Button disabled={busy||!versionFile} type='submit'>Criar versão {selected.latestVersion+1}</Button></form>:selected.status!=='archived'?<p className='border-t pt-3 text-sm text-muted-foreground'>Tens acesso de leitura. Para carregar uma nova versão, pede permissão de edição sobre este documento.</p>:<p className='border-t pt-3 text-sm text-muted-foreground'>Documento arquivado: restaura-o antes de realizar novas operações.</p>}
    {selected.permissions?.share&&<form className='space-y-2 border-t pt-4' onSubmit={share}><h3 className='font-semibold'>Partilha e permissões</h3><p className='text-muted-foreground'>Seleciona os membros da equipa que podem aceder ao documento. Sem links públicos.</p><UserMultiSelect users={users.filter(u=>teams.find(t=>t.id===selected.teamId)?.memberUids?.includes(u.uid))} value={shareUids} onChange={setShareUids} loading={usersLoading} disabled={busy}/><Button disabled={busy} type='submit'><Share2 className='mr-1 h-4 w-4'/>Guardar acesso</Button></form>}
   </div>}
  </SheetContent></Sheet>
 </div>
}
