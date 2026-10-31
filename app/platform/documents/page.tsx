'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DocumentWorkspaceManager } from '@/components/area/document-workspace-manager'
import { onAuthChange } from '@/lib/firebase-auth'
import { areaFetch } from '@/lib/area-client'
import { Alert,AlertDescription } from '@/components/ui/alert'

export default function DocumentsPage(){
 const router=useRouter()
 const [ready,setReady]=useState(false)
 const [allowed,setAllowed]=useState(false)
 const [error,setError]=useState('')
 useEffect(()=>onAuthChange(user=>{
  if(!user){router.replace('/platform/login');return}
  void areaFetch<{modules:Record<string,boolean>}>('/api/area/workspace-access',{cache:'no-store'})
   .then(result=>{setAllowed(result.modules.documents===true);setError('')})
   .catch(cause=>{setAllowed(false);setError(cause instanceof Error?cause.message:'Não foi possível verificar o acesso à biblioteca.')})
   .finally(()=>setReady(true))
 }),[router])
 if(!ready)return <main className='flex min-h-screen items-center justify-center text-sm text-muted-foreground'>A verificar o acesso aos documentos…</main>
 return <main className='mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-8 sm:px-6'>
  <div><Link className='text-sm text-primary underline' href='/platform/area'>Voltar ao portal</Link>
   <h1 className='mt-3 text-2xl font-semibold'>Documentos e equipas</h1>
   <p className='text-sm text-muted-foreground'>Biblioteca privada por equipas — pastas, versões e acesso restrito.</p>
  </div>
  {allowed?<DocumentWorkspaceManager/>:<Alert variant='destructive'><AlertDescription>{error||'Não tens acesso à biblioteca de documentos. Confirma as permissões e a ativação do módulo com a administração.'}</AlertDescription></Alert>}
 </main>
}
