/* Account-scoped block recommendations; no document content is collected. */
(function(root){
 'use strict';
 const KEY='md-block-usage-v1',DAY=86400000,WINDOW=30*DAY,LIMIT=500,DEFAULTS=['note','embed','mermaid','toggle3'];
 const eligible=id=>typeof id==='string'&&id.length>0&&id.length<=120&&!id.startsWith('action-')&&!id.startsWith('color-')&&id!=='html';
 function read(storage,now=Date.now()){try{const raw=storage.getItem(KEY)||'null';if(raw.length>200000)return [];const w=JSON.parse(raw);if(w?.version!==1||!Array.isArray(w.events))return [];return w.events.filter(e=>e&&eligible(e.command)&&Number.isFinite(e.at)&&e.at<=now+1000&&e.at>=now-WINDOW).slice(-LIMIT)}catch{return []}}
 function record(command,storage,now=Date.now()){if(command==='html')command='embed';if(!eligible(command))return;const events=[...read(storage,now),{command,at:now}].slice(-LIMIT);try{storage.setItem(KEY,JSON.stringify({version:1,events}))}catch{/* Usage history must never block document editing. */}}
 function recommend(catalog,storage,now=Date.now()){
  const allowed=new Set(catalog.map(x=>x[0]).filter(eligible)),stats=new Map();for(const e of read(storage,now)){if(!allowed.has(e.command))continue;const old=stats.get(e.command)||{count:0,last:0};old.count++;old.last=Math.max(old.last,e.at);stats.set(e.command,old)}
  const max=Math.max(1,...[...stats.values()].map(x=>x.count));for(const x of stats.values())x.score=0.6*Math.pow(0.5,Math.max(0,now-x.last)/(7*DAY))+0.4*x.count/max;
  const ranked=[...stats].sort((a,b)=>b[1].score-a[1].score||b[1].last-a[1].last||b[1].count-a[1].count||a[0].localeCompare(b[0])).map(x=>x[0]);for(const id of DEFAULTS)if(allowed.has(id)&&!ranked.includes(id))ranked.push(id);return ranked.slice(0,4);
 }
 function menu(catalog,storage,now=Date.now()){
  const recommended=recommend(catalog,storage,now),byId=new Map(catalog.map(x=>[x[0],x])),groups={note:'고급 블록',embed:'임베드',mermaid:'고급 블록',toggle3:'고급 블록'},order=['기본 블록','미디어','데이터베이스','고급 블록','인라인','임베드','작업','텍스트 색상','배경 색상'];
  const rest=catalog.filter(x=>!recommended.includes(x[0])).map(x=>{const y=x.slice();if(y[3]==='추천')y[3]=groups[y[0]]||'고급 블록';return y}).sort((a,b)=>order.indexOf(a[3])-order.indexOf(b[3]));
  return [...recommended.map(id=>{const x=byId.get(id).slice();x[3]='추천';return x}),...rest];
 }
 const api={read,record,recommend,menu,KEY,WINDOW,LIMIT};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BlockRecommendations=api;
})(typeof globalThis!=='undefined'?globalThis:this);
function recordBlockRecommendation(command){if(typeof BlockRecommendations!=='undefined')BlockRecommendations.record(command,localStorage);}
