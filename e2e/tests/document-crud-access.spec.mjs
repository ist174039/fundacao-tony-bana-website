import { test, expect } from '@playwright/test'

test('biblioteca documental requer sessão antes de renderizar qualquer dado privado', async ({page})=>{
 await page.goto('/platform/documents',{waitUntil:'domcontentloaded'})
 await expect(page).toHaveURL(/\/platform\/login(?:\?|$)/,{timeout:15_000})
})

test('CRUD documental privado é fail-closed para pedidos sem sessão',async ({request})=>{
 const id='doc_synthetic_001'
 const cases=[
  {method:'PATCH',path:'/api/area/documents/'+id,data:{name:'Teste',folderId:'folder_001',classification:'internal',expectedRevision:0}},
  {method:'DELETE',path:'/api/area/documents/'+id,data:{reason:'Arquivo de demonstração',expectedRevision:0}},
  {method:'PATCH',path:'/api/area/documents/'+id,data:{operation:'restore',reason:'Reposição de demonstração',expectedRevision:1}},
  {method:'POST',path:'/api/area/documents/'+id+'/versions',data:{}},
  {method:'PATCH',path:'/api/area/document-folders/folder_001',data:{name:'Nova pasta de teste'}},
 ]
 for(const item of cases){
  const response=await request.fetch(item.path,{method:item.method,data:item.data,failOnStatusCode:false})
  expect([401,403,404,405,503],item.method+' '+item.path).toContain(response.status())
 }
})
