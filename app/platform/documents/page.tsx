'use client'
import Link from 'next/link'
import { DocumentWorkspaceManager } from '@/components/area/document-workspace-manager'
export default function DocumentsPage(){
 return <main className='mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-8 sm:px-6'><div><Link className='text-sm text-primary underline' href='/platform/area'>Voltar ao portal</Link><h1 className='mt-3 text-2xl font-semibold'>Documentos e equipas</h1><p className='text-sm text-muted-foreground'>Bibliotecas privadas ao estilo Teams — pastas, versões e acesso por equipa.</p></div><DocumentWorkspaceManager/></main>
}
