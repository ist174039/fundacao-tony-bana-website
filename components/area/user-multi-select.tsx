'use client'
import { useMemo,useState } from 'react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

export type SelectableUser={uid:string;displayName:string;email:string;linkedSocio?:string|null;disabled?:boolean}
export function UserMultiSelect({users,value,onChange,loading=false,disabled=false}:{users:SelectableUser[];value:string[];onChange:(uids:string[])=>void;loading?:boolean;disabled?:boolean}){
 const [query,setQuery]=useState('')
 const available=useMemo(()=>users.filter(u=>!u.disabled).sort((a,b)=>(a.displayName||a.linkedSocio||a.email).localeCompare(b.displayName||b.linkedSocio||b.email,'pt-PT')),[users])
 const filtered=useMemo(()=>available.filter(u=>[u.displayName,u.linkedSocio,u.email].join(' ').toLocaleLowerCase('pt-PT').includes(query.toLocaleLowerCase('pt-PT'))),[available,query])
 const chosen=available.filter(u=>value.includes(u.uid))
 const selectedUnlisted=value.filter(uid=>!users.some(u=>u.uid===uid))
 const toggle=(uid:string,checked:boolean)=>onChange(checked?[...new Set([...value,uid])]:value.filter(item=>item!==uid))
 return <div className='space-y-3'>
  <p className='text-xs text-muted-foreground'>Seleciona os utilizadores registados. Os identificadores são guardados internamente, sem introdução manual.</p>
  <Input aria-label='Pesquisar utilizadores' placeholder='Pesquisar por nome ou email…' value={query} onChange={e=>setQuery(e.target.value)} disabled={disabled||loading}/>
  {loading?<p className='text-sm text-muted-foreground'>A carregar utilizadores…</p>:<div className='max-h-56 space-y-1 overflow-y-auto rounded-md border p-2' role='group' aria-label='Utilizadores disponíveis'>
   {filtered.map(user=><label key={user.uid} className='flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/70'>
    <Checkbox checked={value.includes(user.uid)} onCheckedChange={v=>toggle(user.uid,v===true)} disabled={disabled||(!value.includes(user.uid)&&value.length>=50)}/>
    <span className='min-w-0 text-sm'><span className='block font-medium'>{user.displayName||user.linkedSocio||user.email||'Utilizador sem nome'}</span>{(user.displayName||user.linkedSocio)&&<span className='block truncate text-xs text-muted-foreground'>{user.email}</span>}</span>
   </label>)}
   {!filtered.length&&<p className='p-3 text-sm text-muted-foreground'>Nenhum utilizador encontrado.</p>}
  </div>}
  <div className='flex items-center justify-between'><p className='text-sm font-medium'>Selecionados ({value.length}/50)</p>{value.length>0&&<Button type='button' size='sm' variant='outline' onClick={()=>onChange([])} disabled={disabled}>Limpar</Button>}</div>
  <div className='flex flex-wrap gap-2'>{chosen.map(user=><span key={user.uid} className='rounded-full bg-muted px-3 py-1 text-xs'>{user.displayName||user.linkedSocio||user.email}<button type='button' className='ml-2 font-bold' aria-label={'Remover '+(user.displayName||user.email)} onClick={()=>toggle(user.uid,false)} disabled={disabled}>×</button></span>)}{selectedUnlisted.map(uid=><span key={uid} className='rounded-full border border-amber-500 px-3 py-1 text-xs'>Conta indisponível ({uid.slice(0,6)}…) <button type='button' onClick={()=>toggle(uid,false)} disabled={disabled} aria-label='Remover conta indisponível'>×</button></span>)}</div>
 </div>
}
