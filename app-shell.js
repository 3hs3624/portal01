/* Shared app-header controls. Theme preference stays local to each application. */
(() => {
 const scriptUrl=new URL(document.currentScript.src),base=new URL('./',scriptUrl);
 const id=location.pathname.split('/apps/')[1]?.split('/')[0];
 if(!['markdown','insight','projects'].includes(id)||!location.pathname.endsWith('/'))return;
 const key='3hs-theme:'+id;
 function icon(kind){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(k,v);
  const paths={moon:['M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13z'],sun:['M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],external:['M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5'],home:['m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9']};
  for(const d of paths[kind]){const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',d);svg.append(p)}
  if(kind==='sun'){const c=document.createElementNS(svg.namespaceURI,'circle');for(const [k,v]of Object.entries({cx:'12',cy:'12',r:'4'}))c.setAttribute(k,v);svg.append(c)}return svg;
 }
 function init(){
  const host=id==='markdown'?document.querySelector('.top-actions'):id==='insight'?document.querySelector('header .header-right'):document.querySelector('.topbar>.wrap');
  if(!host||document.querySelector('#portal-app-tools'))return;
  const tools=document.createElement('div');tools.id='portal-app-tools';tools.className='portal-app-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label','앱 화면 도구');
  const native=document.querySelector('#theme');if(native)native.hidden=true;
  document.querySelectorAll('.theme-seg').forEach(n=>n.hidden=true);
  const theme=document.createElement('button');theme.type='button';theme.className='portal-app-theme portal-app-action';theme.id='portal-app-theme';
  const saved=localStorage.getItem(key);let selected=['light','dark'].includes(saved)?saved:null;
  function current(){if(id==='markdown')return document.body.dataset.theme==='dark'?'dark':'light';if(id==='insight')return document.documentElement.dataset.theme==='dark'?'dark':'light';return document.documentElement.dataset.appTheme==='dark'||(!document.documentElement.dataset.appTheme&&matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light'}
  function paint(){const dark=current()==='dark',label=dark?'라이트 테마로 변경':'다크 테마로 변경';theme.replaceChildren(icon(dark?'sun':'moon'));theme.title=label;theme.setAttribute('aria-label',label);theme.setAttribute('aria-pressed',String(dark));tools.dataset.theme=dark?'dark':'light'}
  function apply(value,userAction=false){
   if(id==='markdown'){
    if(typeof APP!=='undefined')APP.theme=value;
    if(document.body.dataset.theme!==value)document.body.dataset.theme=value;
    if(userAction&&typeof changed==='function'&&!APP.loading)changed();
   }else if(id==='insight'){
    if(document.documentElement.dataset.theme!==value)document.documentElement.dataset.theme=value;
    localStorage.setItem('insight-theme',value);
    if(userAction&&typeof renderAll==='function')renderAll();
   }else{
    if(document.documentElement.dataset.appTheme!==value)document.documentElement.dataset.appTheme=value;
    localStorage.setItem('wbs.theme',value);
   }
   paint();
  }
  theme.onclick=()=>{selected=current()==='dark'?'light':'dark';localStorage.setItem(key,selected);apply(selected,true)};
  tools.append(theme);
  for(const [kind,label,target]of [['external','별도 창에서 열기','_blank'],['home','홈으로 돌아가기','_parent']]){
   const a=document.createElement('a');a.className='portal-app-action portal-app-'+kind;a.href=base.href+(kind==='home'?'#home':'#'+id);a.target=target;a.title=label;a.setAttribute('aria-label',label);if(target==='_blank')a.rel='noopener';a.append(icon(kind));const span=document.createElement('span');span.textContent=kind==='home'?'홈':'별도 창';a.append(span);tools.append(a);
  }
  const note=document.createElement('span');note.className='portal-app-save-note';note.textContent='ⓘ';note.title='변경 사항은 각 앱의 저장 기능으로 보관하세요.';note.setAttribute('aria-label',note.title);tools.append(note);host.append(tools);
  // Native workspace restoration may finish after DOMContentLoaded. Keep the
  // per-app choice authoritative without marking a restored document dirty.
  const observer=new MutationObserver(()=>{if(selected&&current()!==selected)apply(selected);else{if(id==='markdown'&&selected&&typeof APP!=='undefined')APP.theme=selected;paint()}});
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-app-theme']});observer.observe(document.body,{attributes:true,attributeFilter:['data-theme']});
  if(selected)apply(selected);else paint();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
