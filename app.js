'use strict';
const $=s=>document.querySelector(s);
let modules=[],summaries={};
try{summaries=JSON.parse(PortalStorage.getItem('3hs-summaries-v1')||'{}')||{}}catch{}
const frames=new Map();
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function date(value){const d=new Date(value);return Number.isNaN(+d)?'날짜 없음':d.toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function render(){
 const cards=$('#cards');cards.replaceChildren();
 const query=$('#search').value.trim().toLowerCase();
 for(const m of modules){
  if(!`${m.name} ${m.category}`.toLowerCase().includes(query))continue;
  const s=summaries[m.id],card=node('article',undefined,'card '+m.color);
  const top=node('div',undefined,'card-top');top.append(node('span',m.icon,'app-icon'),node('span',m.tag,'tag'));card.append(top,node('h3',m.name),node('p',m.description,'description'));
  const stats=node('div',undefined,'stats');
  for(const [label,value] of s?.metrics||[[m.metric,'—']]){const stat=node('div');stat.append(node('strong',String(value)),node('small',label));stats.append(stat)}card.append(stats);
  card.append(node('div',s?'최근 확인 '+date(s.updatedAt):'메뉴를 열면 실제 요약이 연결됩니다.','sync-status'));
  const link=node('a','앱 열기 →','open-app');link.href='#'+m.id;card.append(link);cards.append(card);
 }
 $('#no-results').hidden=!!cards.children.length;
 $('#app-count').textContent=modules.length;$('#count-badge').textContent=modules.length;
 const known=modules.filter(m=>summaries[m.id]);$('#total').textContent=known.length?known.reduce((sum,m)=>sum+(Number(summaries[m.id].metrics[0]?.[1])||0),0):'—';
 $('#visited').replaceChildren(document.createTextNode(known.length),node('span',' / '+modules.length,'unit'));
 const activity=$('#activity');activity.replaceChildren();
 const recent=modules.flatMap(m=>(summaries[m.id]?.items||[]).map(item=>({...item,module:m}))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,6);
 if(!recent.length){const empty=node('div',undefined,'empty');empty.append(node('span','▤','empty-icon'),node('strong','작업의 첫 페이지를 열어보세요'),node('p','앱을 열면 문서, 프로젝트, 대시보드의 최근 항목이 여기에 표시됩니다.'));activity.append(empty)}
 for(const item of recent){const row=node('a',undefined,'activity-row');row.href='#'+item.module.id;row.append(node('span',item.module.icon,'mini-icon '+item.module.color),node('b',item.name),node('span',item.module.name,'activity-module'),node('time',date(item.date)));activity.append(row)}
}
function route(){const id=location.hash.slice(1)||'home',m=modules.find(m=>m.id===id);const home=!m;$('#home').hidden=!home;$('#app-view').hidden=home;
 document.querySelectorAll('nav a').forEach(a=>{const active=a.hash==='#'+(home?'home':id);a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 $('#breadcrumb').textContent='워크스페이스 / '+(m?.name||'홈');
 if(home){render();return}
 if(!frames.has(id)){const f=document.createElement('iframe');f.src='/portal01/apps/'+id+'/';f.title=m.name;frames.set(id,f);$('#frames').append(f)}
 for(const [key,f] of frames)f.hidden=key!==id;
 $('#app-title').textContent=m.name;$('#standalone').href='/portal01/apps/'+id+'/';
}
addEventListener('message',event=>{
 if(event.origin!==location.origin)return;
 const d=event.data;if(!d||d.type!=='3hs:summary'||d.version!==1||!modules.some(m=>m.id===d.id)||event.source!==frames.get(d.id)?.contentWindow)return;
 if(!Array.isArray(d.metrics)||!d.metrics.length||!d.metrics.every(v=>Array.isArray(v)&&typeof v[0]==='string'&&Number.isFinite(v[1]))||!Array.isArray(d.items))return;
 summaries[d.id]={metrics:d.metrics.slice(0,5),items:d.items.filter(i=>i&&typeof i.name==='string').slice(0,5),updatedAt:d.updatedAt};
 try{PortalStorage.setItem('3hs-summaries-v1',JSON.stringify(summaries))}catch{}
 render();
});
$('#search').addEventListener('input',render);
$('#refresh').onclick=()=>{for(const f of frames.values())f.contentWindow.postMessage({type:'3hs:refresh'},location.origin);render();$('#refresh').textContent='✓ 마지막 수신 요약 표시';setTimeout(()=>$('#refresh').textContent='↻ 요약 새로고침',1800)};
addEventListener('hashchange',route);
$('#today').textContent=new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
fetch('/portal01/modules.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{modules=data;for(const m of modules){const f=document.createElement('iframe');f.src='/portal01/apps/'+m.id+'/';f.title=m.name;f.hidden=true;frames.set(m.id,f);$('#frames').append(f);const a=node('a');a.href='#'+m.id;a.append(node('span',m.icon,'nav-icon'),node('span',m.name));$('#nav').append(a)}render();route()}).catch(()=>{$('#cards').textContent='메뉴를 불러오지 못했습니다. 서버 연결을 확인하고 새로고침하세요.'});
