/* Shared app-header controls. Theme preference stays local to each application. */
(() => {
 const scriptUrl=new URL(document.currentScript.src),base=new URL('./',scriptUrl);
 const id=location.pathname.split('/apps/')[1]?.split('/')[0];
 if(!['markdown','insight','projects'].includes(id)||!location.pathname.endsWith('/'))return;
 const key='3hs-theme:'+id;
 function icon(kind){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(k,v);
  const paths={sidebar:['M8 4v16'],chart:['M4 3v18h17','M8 16v-5M13 16V6M18 16V9'],projects:['M4 5h16v15H4z','M8 3v4M16 3v4M4 10h16','M8 14h3M8 17h7'],settings:['M4 7h16M4 17h16','M9 4v6M15 14v6'],menu:['M4 6h16M4 12h16M4 18h16'],collapse:['M9 3v18M4 3h16v18H4z','m16 9-3 3 3 3'],cloud:['M7 18H6a4 4 0 0 1-.8-7.9 7 7 0 0 1 13.6 0A4 4 0 0 1 18 18h-1','M12 11v10M8.5 14.5 12 11l3.5 3.5'],document:['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M8 13h8M8 17h5'],moon:['M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13z'],sun:['M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],external:['M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5'],home:['m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9']};
  if(kind==='sidebar'){const rect=document.createElementNS(svg.namespaceURI,'rect');for(const [k,v]of Object.entries({x:'3',y:'4',width:'18',height:'16',rx:'3'}))rect.setAttribute(k,v);svg.append(rect)}
  for(const d of paths[kind]){const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',d);svg.append(p)}
  if(kind==='sun'){const c=document.createElementNS(svg.namespaceURI,'circle');for(const [k,v]of Object.entries({cx:'12',cy:'12',r:'4'}))c.setAttribute(k,v);svg.append(c)}return svg;
 }
 function setupWorkspace(){
  if(!['projects','insight'].includes(id))return;
  const create=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node};
  const header=document.querySelector(id==='projects'?'.topbar':'body > header');header?.classList.add('portal-workspace-header');
  if(header)new ResizeObserver(()=>document.documentElement.style.setProperty('--portal-header-height',header.getBoundingClientRect().height+'px')).observe(header);
  const brand=header?.querySelector('.brand');
  if(brand){const mark=create('span','portal-brand-mark');mark.setAttribute('aria-hidden','true');mark.append(icon(id==='projects'?'projects':'chart'));brand.classList.add('portal-workspace-brand');brand.replaceChildren(mark,create('strong','',id==='projects'?'Project Management':'Insight BI'),create('span','portal-workspace-edition',id==='projects'?'PROJECT WORKSPACE':'DATA WORKSPACE'));}
  let sidebar=document.querySelector('.shell > aside');
  if(id==='projects'){
   const main=document.querySelector('body > main'),tabs=main?.querySelector('.tabs');
   if(!main||!tabs)return;
   const shell=create('div','portal-workspace');main.before(shell);sidebar=create('aside','portal-workspace-sidebar');sidebar.setAttribute('aria-label','프로젝트 작업공간');
   shell.append(sidebar,main);tabs.classList.add('portal-workspace-nav');tabs.setAttribute('aria-label','프로젝트 메뉴');tabs.setAttribute('aria-orientation','vertical');sidebar.append(create('div','portal-workspace-label','MY WORKSPACE'),tabs);
   const heading=main.querySelector('.title-row h1');if(heading){const group=create('div','portal-page-heading');heading.before(group);group.append(create('div','portal-breadcrumb','내 작업공간 / 프로젝트'),heading);}
   const tabButtons=[...tabs.querySelectorAll('[data-tab]')];
   for(const button of tabButtons){const label=create('span','',button.textContent);button.replaceChildren(icon(button.dataset.tab==='list'?'projects':'settings'),label);button.setAttribute('aria-controls','tab-'+button.dataset.tab);button.title=label.textContent;}
   const sync=()=>{for(const button of tabButtons)button.tabIndex=button.getAttribute('aria-selected')==='true'?0:-1;const storage=tabButtons.some(b=>b.dataset.tab==='store'&&b.getAttribute('aria-selected')==='true');if(heading)heading.textContent=storage?'저장소 설정':'프로젝트 관리';};
   new MutationObserver(sync).observe(tabs,{subtree:true,attributes:true,attributeFilter:['aria-selected']});sync();
   tabs.addEventListener('keydown',event=>{const index=tabButtons.indexOf(document.activeElement);if(index<0)return;let next;if(event.key==='ArrowDown')next=(index+1)%tabButtons.length;else if(event.key==='ArrowUp')next=(index-1+tabButtons.length)%tabButtons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabButtons.length-1;else return;event.preventDefault();tabButtons[next].focus();tabButtons[next].click();});
   const add=main.querySelector('#btn-new');if(add?.lastChild?.nodeType===Node.TEXT_NODE)add.lastChild.textContent='새 프로젝트';
  }else if(sidebar){
   const label=sidebar.querySelector('.section-label');if(label){label.classList.add('portal-workspace-label');label.textContent='MY WORKSPACE';}const nav=sidebar.querySelector('nav');nav?.classList.add('portal-workspace-nav');nav?.setAttribute('aria-label','분석 작업공간');
   for(const button of sidebar.querySelectorAll('[data-page]')){const label=button.querySelector('span');button.replaceChildren(icon(button.dataset.page==='settings'?'settings':button.dataset.page==='data'?'document':'chart'),label);button.title=label.textContent;}
   const breadcrumb=document.querySelector('.title-row .eyebrow');if(breadcrumb){breadcrumb.className='portal-breadcrumb';breadcrumb.textContent='내 작업공간 / 데이터 분석';}
  }
  if(sidebar){
   sidebar.id='portal-app-sidebar';sidebar.querySelector('.side-bottom')?.remove();
   const storage=create('div','portal-workspace-storage');const open=create('button','','저장소 관리 ↗');open.type='button';open.onclick=()=>window.PortalCloudUI.open();storage.append(create('small','','CONNECTED STORAGE'),create('strong','','작업공간 저장소'),create('p','','저장소를 선택하고 작업을 이어가세요.'),open);sidebar.append(storage);
  }
 }
 function init(){
  const host=id==='markdown'?document.querySelector('.top-actions'):id==='insight'?document.querySelector('header .header-right'):document.querySelector('.topbar>.wrap');
  if(!host||document.querySelector('#portal-app-tools'))return;
  if(id==='markdown'){const brand=document.querySelector('.brand-icon');if(brand)brand.replaceChildren(icon('document'));const name=document.querySelector('.brand strong');if(name)name.textContent='Write Studio';document.title=document.title.replace('MD Editor','Write Studio');}

  setupWorkspace();
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
  const cloud=document.createElement('button');cloud.type='button';cloud.className='portal-app-action';cloud.id='portal-cloud-open';cloud.title='저장소';cloud.setAttribute('aria-label','저장소');cloud.append(icon('cloud'));const cloudLabel=document.createElement('span');cloudLabel.textContent='저장소';cloud.append(cloudLabel);cloud.onclick=()=>window.PortalCloudUI.open();tools.append(cloud);
  if(id==='markdown'){
   const legacy=document.querySelector('#openStorage');if(legacy)legacy.hidden=true;
   document.addEventListener('click',event=>{if(event.target.closest('#storageShortcut')){event.preventDefault();event.stopImmediatePropagation();window.PortalCloudUI.open()}},true);
  }
  if(id==='insight'||id==='projects'){
   const settings=document.querySelector(id==='insight'?'#settings':'#tab-store');if(settings){const card=document.createElement('div');card.className='card portal-storage-entry';const title=document.createElement('h2');title.textContent='저장소';const text=document.createElement('p');text.textContent='브라우저 · Supabase · 로컬 폴더 · OneDrive · Google Drive';const content=document.createElement('div');content.className='portal-storage-entry-content';content.append(title,text);const open=document.createElement('button');open.type='button';open.className='portal-storage-select';open.textContent='저장소 선택';open.onclick=()=>window.PortalCloudUI.open();card.append(content,open);settings.prepend(card)}
   const oldList=document.querySelector('.storage-list');if(oldList)oldList.hidden=true;
   const oldTitle=document.querySelector('.storage-overview h2');if(oldTitle)oldTitle.textContent='브라우저 자동 저장 설정';
  }
  if(['markdown','insight','projects'].includes(id)){
   const sidebar=document.querySelector(id==='markdown'?'.workspace > .sidebar':id==='projects'?'.portal-workspace > aside':'.shell > aside');
   if(sidebar){
    sidebar.id='portal-app-sidebar';
    const toggle=document.createElement('button');toggle.type='button';toggle.id='portal-sidebar-toggle';toggle.className='portal-sidebar-control';toggle.setAttribute('aria-controls',sidebar.id);
    const rail=document.createElement('div');rail.className='portal-sidebar-rail';
    const reopen=document.createElement('button');reopen.type='button';reopen.id='portal-sidebar-reopen';reopen.className='portal-sidebar-control';reopen.setAttribute('aria-controls',sidebar.id);reopen.setAttribute('aria-label','사이드바 펼치기');reopen.title='사이드바 펼치기';reopen.append(icon('sidebar'));rail.append(reopen);sidebar.after(rail);
    const heading=document.createElement('div');heading.className='portal-sidebar-heading';const caption=sidebar.querySelector('.workspace-label,.portal-workspace-label');sidebar.prepend(heading);if(caption)heading.append(caption);heading.append(toggle);
    const sidebarKey='3hs-sidebar-collapsed:'+id;let collapsed=false;
    try{collapsed=localStorage.getItem(sidebarKey)==='true'}catch{}
    function setCollapsed(value){
     collapsed=value;document.body.classList.toggle('portal-sidebar-collapsed',value);sidebar.hidden=value;
     const label=value?'사이드바 펼치기':'사이드바 접기',text=document.createElement('span');text.className='portal-sidebar-label';text.textContent='접기';toggle.replaceChildren(icon('sidebar'),text);rail.hidden=!value;reopen.setAttribute('aria-expanded',String(!value));toggle.title=label;toggle.setAttribute('aria-label',label);toggle.setAttribute('aria-expanded',String(!value));
     window.dispatchEvent(new Event('resize'));
    }
    toggle.onclick=()=>{setCollapsed(!collapsed);if(collapsed)reopen.focus();try{localStorage.setItem(sidebarKey,String(collapsed))}catch{}};
    reopen.onclick=()=>{setCollapsed(false);try{localStorage.setItem(sidebarKey,'false')}catch{}toggle.focus()};setCollapsed(collapsed);
    window.PortalSidebarResize?.(sidebar,{id,storage:localStorage});
   }
  }
  if(id==='markdown')window.PortalSidebarResize?.(document.querySelector('#outlinePane'),{id:'markdown-outline',storage:localStorage,edge:'left',widthProperty:'--portal-outline-width',customClass:'portal-outline-custom-width',label:'ON THIS PAGE 폭 조절',minimum:135,maximum:480,available:()=>innerWidth-(document.querySelector('#portal-app-sidebar')?.getBoundingClientRect().width||0)-360});
  tools.append(theme);
  for(const [kind,label,target]of [['external','별도 창에서 열기','_blank'],['home','홈으로 돌아가기','_parent']]){
   let standalone=false;try{standalone=new URLSearchParams(parent.location.search).get('appWindow')===id}catch{}
   if(kind==='external'&&standalone)continue;
   const a=document.createElement('a');a.className='portal-app-action portal-app-'+kind;
   const destination=new URL(base.href);destination.hash=kind==='home'?'home':id;
   if(kind==='external')destination.searchParams.set('appWindow',id);
   a.href=destination.href;a.target=target;a.title=label;a.setAttribute('aria-label',label);if(target==='_blank')a.rel='noopener';
   if(kind==='external')a.onclick=event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    const popup=window.open('about:blank','_blank','popup=yes,width=1280,height=860,resizable=yes,scrollbars=yes');
    if(popup){popup.opener=null;popup.location.replace(a.href);popup.focus();}
    else{let hint=tools.querySelector('.portal-popup-hint');if(!hint){hint=document.createElement('span');hint.className='portal-popup-hint';hint.setAttribute('role','status');tools.append(hint)}hint.textContent='별도 창을 열려면 이 사이트의 팝업을 허용해 주세요.';}
   };
   a.append(icon(kind));const span=document.createElement('span');span.textContent=kind==='home'?'홈':'별도 창';a.append(span);tools.append(a);
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
