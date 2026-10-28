import {NextResponse} from 'next/server'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 if(!isFirebaseAdminConfigured())return NextResponse.json({error:'Configuração indisponível.'},{status:503})
 if(!(await requireAreaAdmin(request)))return NextResponse.json({error:'Sem permissão.'},{status:403})
 try{
  const docs=await getFirebaseAdminFirestore().collection('area_schools').limit(500).get()
  return NextResponse.json({escolas:docs.docs.filter(d=>d.get('estado')==='ativa').map(d=>({codigo:d.id,nome:d.get('nome')||d.id,estado:'ativa'})).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-PT'))},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Não foi possível consultar escolas autorizáveis.'},{status:500})}
}
