const appPageVersions={"markdown":"2c2c0b20aa23","insight":"34a8ef9b4175","projects":"a7c462a3475e"};
'use strict';
const $=s=>document.querySelector(s);
let modules=[],summaries={};
try{summaries=JSON.parse(PortalStorage.getItem('3hs-summaries-v1')||'{}')||{}}catch{}
const frames=new Map();
const preferencesKey='3hs-portal-preferences-v1';
let hiddenApps=new Set(),favoriteApps=new Set(),appOrder=[],showFavorites=true;
try{
 const saved=JSON.parse(PortalStorage.getItem(preferencesKey)||'null');
 if(saved?.version===1){
  if(Array.isArray(saved.hiddenApps))hiddenApps=new Set(saved.hiddenApps.filter(id=>typeof id==='string'));
  if(Array.isArray(saved.favorites))favoriteApps=new Set(saved.favorites.filter(id=>typeof id==='string'));
  if(Array.isArray(saved.appOrder))appOrder=[...new Set(saved.appOrder.filter(id=>typeof id==='string'))];
  if(typeof saved.showFavorites==='boolean')showFavorites=saved.showFavorites;
 }
}catch{}
function orderedModules(){const known=new Map(modules.map(m=>[m.id,m]));return [...appOrder.filter(id=>known.has(id)).map(id=>known.get(id)),...modules.filter(m=>!appOrder.includes(m.id))]}
function visibleModules(){return orderedModules().filter(m=>!hiddenApps.has(m.id))}
function preferenceRecord(overrides={}){return {version:1,hiddenApps:[...hiddenApps],favorites:[...favoriteApps],appOrder:[...appOrder],showFavorites,...overrides}}
function menuLink(m,favorite=false){
 const a=node('a');a.href='#'+m.id;a.dataset[favorite?'favorite':'application']=m.id;a.setAttribute('aria-label',m.name);
 const icon=appIcon(m,'nav-icon');icon.setAttribute('aria-hidden','true');a.append(icon,node('span',m.name,'nav-text'));return a;
}
function starIcon(){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(k,v);
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','m12 3 2.8 5.7 6.3.9-4.55 4.45 1.07 6.28L12 17.36l-5.62 2.97 1.07-6.28L2.9 9.6l6.3-.9z');svg.append(path);return svg;
}
function toggleFavorite(id){
 const next=new Set(favoriteApps);if(next.has(id))next.delete(id);else next.add(id);
 try{PortalStorage.setItem(preferencesKey,JSON.stringify(preferenceRecord({favorites:[...next]})))}catch{
  $('#settings-status').textContent='즐겨찾기를 저장하지 못했습니다. 브라우저 저장소를 확인해 주세요.';return;
 }
 favoriteApps=next;renderNavigation();route();
 const button=[...$('#application-links').querySelectorAll('button')].find(b=>b.dataset.favoriteToggle===id);button?.focus();
 $('#settings-status').textContent='즐겨찾기를 '+(favoriteApps.has(id)?'추가했습니다.':'해제했습니다.');
}
function renderNavigation(){
 const list=$('#application-links'),favorites=$('#favorites-list');list.replaceChildren();favorites.replaceChildren();
 for(const m of visibleModules()){
  const row=node('div',undefined,'application-menu-row'),button=node('button',undefined,'favorite-toggle');button.type='button';button.dataset.favoriteToggle=m.id;
  button.setAttribute('aria-label',m.name+' 즐겨찾기 '+(favoriteApps.has(m.id)?'해제':'추가'));button.title=button.getAttribute('aria-label');button.setAttribute('aria-pressed',String(favoriteApps.has(m.id)));button.append(starIcon());button.addEventListener('click',()=>toggleFavorite(m.id));row.append(menuLink(m),button);list.append(row);
  if(favoriteApps.has(m.id))favorites.append(menuLink(m,true));
 }
 $('#favorites-section').hidden=!showFavorites;$('#favorites-empty').hidden=!!favorites.children.length;
}
const settingsDialog=$('#portal-settings');
function updateOrderButtons(){
 const rows=[...$('#application-options').querySelectorAll('.application-option')];
 rows.forEach((row,index)=>{row.querySelector('[data-move="up"]').disabled=index===0;row.querySelector('[data-move="down"]').disabled=index===rows.length-1});
}
function openSettings(){
 const options=$('#application-options');options.querySelectorAll('.application-option').forEach(n=>n.remove());
 for(const m of orderedModules()){
  const row=node('div',undefined,'application-option');row.dataset.applicationId=m.id;
  const label=node('label',undefined,'application-option-main'),checkbox=node('input');checkbox.type='checkbox';checkbox.name='visible-app';checkbox.value=m.id;checkbox.checked=!hiddenApps.has(m.id);
  const text=node('span',undefined,'application-option-text');text.append(node('strong',m.name),node('small',m.category));label.append(appIcon(m,'settings-app-icon '+m.color),text,checkbox);row.append(label);
  const controls=node('div',undefined,'application-order-controls');
  for(const [direction,symbol,description]of [['up','↑','위로 이동'],['down','↓','아래로 이동']]){
   const button=node('button',symbol);button.type='button';button.dataset.move=direction;button.setAttribute('aria-label',m.name+' '+description);button.title=description;
   button.addEventListener('click',()=>{
    if(direction==='up'&&row.previousElementSibling?.classList.contains('application-option'))options.insertBefore(row,row.previousElementSibling);
    if(direction==='down'&&row.nextElementSibling)options.insertBefore(row.nextElementSibling,row);
    updateOrderButtons();const focusTarget=button.disabled?controls.querySelector(direction==='up'?'[data-move="down"]':'[data-move="up"]'):button;focusTarget?.focus();
   });controls.append(button);
  }
  row.append(controls);options.append(row);
 }
 updateOrderButtons();$('#show-favorites').checked=showFavorites;
 $('#settings-error').hidden=true;settingsDialog.showModal();
}
$('#open-settings').addEventListener('click',openSettings);
for(const id of ['close-settings','cancel-settings'])$('#'+id).addEventListener('click',()=>settingsDialog.close());
settingsDialog.addEventListener('close',()=>$('#open-settings').focus());
$('#portal-settings-form').addEventListener('submit',event=>{
 event.preventDefault();const next=new Set([...$('#application-options').querySelectorAll('input:not(:checked)')].map(input=>input.value));
 const order=[...$('#application-options').querySelectorAll('.application-option')].map(row=>row.dataset.applicationId),favoritesVisible=$('#show-favorites').checked;
 try{PortalStorage.setItem(preferencesKey,JSON.stringify(preferenceRecord({hiddenApps:[...next],appOrder:order,showFavorites:favoritesVisible})))}catch{
  $('#settings-error').textContent='설정을 저장하지 못했습니다. 브라우저 저장 공간 또는 저장소 접근 권한을 확인해 주세요.';$('#settings-error').hidden=false;return;
 }
 hiddenApps=next;appOrder=order;showFavorites=favoritesVisible;renderNavigation();render();
 const active=location.hash.slice(1);if(hiddenApps.has(active))location.hash='#home';else route();
 settingsDialog.close();$('#settings-status').textContent='애플리케이션 표시 설정을 저장했습니다.';
});


const sidebarToggle=$('#sidebar-toggle');
function setSidebarCollapsed(collapsed){
 document.body.classList.toggle('sidebar-collapsed',collapsed);
 sidebarToggle.setAttribute('aria-expanded',String(!collapsed));
 const label=collapsed?'사이드바 표시':'사이드바 숨기기';
 sidebarToggle.setAttribute('aria-label',label);
 try{PortalStorage.setItem('3hs-sidebar-collapsed',String(collapsed))}catch{}
 requestAnimationFrame(()=>{for(const frame of frames.values()){try{frame.contentWindow.dispatchEvent(new Event('resize'))}catch{}}});
}
let savedSidebarCollapsed=false;
try{savedSidebarCollapsed=PortalStorage.getItem('3hs-sidebar-collapsed')==='true'}catch{}
setSidebarCollapsed(savedSidebarCollapsed);
sidebarToggle.addEventListener('click',()=>setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed')));

function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function appIcon(module,cls){
 const shapes={
  markdown:['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M8 13h8M8 17h5'],
  projects:['M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z','M3 8h18M9 8v13M15 8v13','M5.5 12h1M11 12h2M17 12h2M5.5 16h1M11 16h2'],
  insight:['M3 3v18h18','M7 17v-4M12 17V9M17 17V5','M6 8l5-4 4 1 5-3']
 };
 const wrapper=node('span',undefined,cls),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [key,value]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(key,value);
 for(const shape of shapes[module.id]||shapes.markdown){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',shape);svg.append(path)}
 wrapper.append(svg);return wrapper;
}
function date(value){const d=new Date(value);return Number.isNaN(+d)?'날짜 없음':d.toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function render(){
 const cards=$('#cards');cards.replaceChildren();
 const query=$('#search').value.trim().toLowerCase(),visible=visibleModules();
 for(const m of visible){
  if(!`${m.name} ${m.category}`.toLowerCase().includes(query))continue;
  const s=summaries[m.id],card=node('article',undefined,'card '+m.color);
  const top=node('div',undefined,'card-top');top.append(appIcon(m,'app-icon'),node('span',m.tag,'tag'));card.append(top,node('h3',m.name),node('p',m.description,'description'));
  const stats=node('div',undefined,'stats');
  for(const [label,value] of s?.metrics||[[m.metric,'—']]){const stat=node('div');stat.append(node('strong',String(value)),node('small',label));stats.append(stat)}card.append(stats);
  card.append(node('div',s?'최근 확인 '+date(s.updatedAt):'메뉴를 열면 실제 요약이 연결됩니다.','sync-status'));
  const link=node('a','앱 열기 →','open-app');link.href='#'+m.id;card.append(link);cards.append(card);
 }
 $('#no-results').hidden=!!cards.children.length;$('#no-results').textContent=visible.length?'검색 결과가 없습니다.':'표시할 앱이 없습니다. 설정에서 Application을 선택해 주세요.';
 $('#app-count').textContent=visible.length;$('#count-badge').textContent=visible.length;
 const known=visible.filter(m=>summaries[m.id]);$('#total').textContent=known.length?known.reduce((sum,m)=>sum+(Number(summaries[m.id].metrics[0]?.[1])||0),0):'—';
 $('#visited').replaceChildren(document.createTextNode(known.length),node('span',' / '+visible.length,'unit'));
 const activity=$('#activity');activity.replaceChildren();
 const recent=visible.flatMap(m=>(summaries[m.id]?.items||[]).map(item=>({...item,module:m}))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,6);
 if(!recent.length){const empty=node('div',undefined,'empty');empty.append(node('span','▤','empty-icon'),node('strong','작업의 첫 페이지를 열어보세요'),node('p','앱을 열면 문서, 프로젝트, 대시보드의 최근 항목이 여기에 표시됩니다.'));activity.append(empty)}
 for(const item of recent){const row=node('a',undefined,'activity-row');row.href='#'+item.module.id;row.append(appIcon(item.module,'mini-icon '+item.module.color),node('b',item.name),node('span',item.module.name,'activity-module'),node('time',date(item.date)));activity.append(row)}
}
function route(){const id=location.hash.slice(1)||'home',m=visibleModules().find(m=>m.id===id);const home=!m;if(home&&id!=='home')history.replaceState(null,'',location.pathname+location.search+'#home');$('#home').hidden=!home;$('#app-view').hidden=home;
 document.querySelectorAll('nav a').forEach(a=>{const active=a.hash==='#'+(home?'home':id);a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 $('#breadcrumb').textContent='워크스페이스 / '+(m?.name||'홈');
 if(home){render();return}
 if(!frames.has(id)){const f=document.createElement('iframe');f.src='/portal01/apps/'+id+'/?v='+appPageVersions[id];f.title=m.name;frames.set(id,f);$('#frames').append(f)}
 for(const [key,f] of frames)f.hidden=key!==id;
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
fetch('/portal01/modules.json?v=42a004edbbeb').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{modules=data;for(const m of modules){const f=document.createElement('iframe');f.src='/portal01/apps/'+m.id+'/?v='+appPageVersions[m.id];f.title=m.name;f.hidden=true;frames.set(m.id,f);$('#frames').append(f);}renderNavigation();render();route()}).catch(()=>{$('#cards').textContent='메뉴를 불러오지 못했습니다. 서버 연결을 확인하고 새로고침하세요.'});
