/** Public website image policy. Private documents use a different Storage bucket. */
export class MediaPolicyError extends Error { constructor(message){super(message);this.name='MediaPolicyError'} }
export const PUBLIC_MEDIA_FOLDERS=Object.freeze(['membros','noticias','parceiros','carrossel'])
export const MAX_PUBLIC_MEDIA_BYTES=5*1024*1024
export function validatePublicImage(blob,mime,folder){
 if(!PUBLIC_MEDIA_FOLDERS.includes(folder))throw new MediaPolicyError('Pasta de imagem inválida.')
 if(!Buffer.isBuffer(blob)||blob.length===0||blob.length>MAX_PUBLIC_MEDIA_BYTES)throw new MediaPolicyError('Imagem vazia ou demasiado grande.')
 const png=blob.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
 const jpg=blob[0]===255&&blob[1]===216&&blob[2]===255
 const webp=blob.subarray(0,4).toString()==='RIFF'&&blob.subarray(8,12).toString()==='WEBP'
 if(!((mime==='image/png'&&png)||(mime==='image/jpeg'&&jpg)||(mime==='image/webp'&&webp)))
  throw new MediaPolicyError('Formato não autorizado. São permitidas apenas imagens PNG, JPG ou WEBP.')
 return true
}
