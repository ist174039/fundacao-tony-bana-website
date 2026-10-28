/** Unit-aware inventory calculations; never aggregate dissimilar units. */
export function summarizeStock(lots){
 const visible=lots.filter(l=>Number.isFinite(l.quantidadeDisponivel)&&Number.isFinite(l.quantidadeRecebida))
 const available=visible.filter(l=>l.quantidadeDisponivel>0)
 const exhausted=visible.filter(l=>l.quantidadeDisponivel===0)
 const units={}
 for(const row of visible){
  const unit=typeof row.unidade==='string'?row.unidade:'?'
  if(!units[unit])units[unit]={unit,received:0,available:0,distributed:0}
  units[unit].received+=row.quantidadeRecebida
  units[unit].available+=row.quantidadeDisponivel
  units[unit].distributed+=row.quantidadeRecebida-row.quantidadeDisponivel
 }
 for(const value of Object.values(units)){
  for(const key of ['received','available','distributed'])value[key]=Math.round(value[key]*1000)/1000
 }
 return {lots:visible.length,availableLots:available.length,exhaustedLots:exhausted.length,categories:new Set(available.map(x=>x.categoria)).size,units:Object.values(units).sort((a,b)=>a.unit.localeCompare(b.unit))}
}
