/* Shared pointer/keyboard sidebar resizing. Width preferences contain no app data. */
(() => {
 window.PortalSidebarResize = function(sidebar,{id,storage,portal=false}={}) {
  if(!sidebar||sidebar.dataset.resizableSidebar)return;
  sidebar.dataset.resizableSidebar='true';
  const key='3hs-sidebar-width:'+id,handle=document.createElement('div'),shield=document.createElement('div');
  handle.className='portal-sidebar-resizer';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','사이드바 폭 조절');handle.setAttribute('aria-controls',sidebar.id);handle.title='드래그하여 폭 조절 · 두 번 클릭하면 기본 폭';
  shield.className='portal-sidebar-resize-shield';shield.hidden=true;document.body.append(shield,handle);
  let preferred=null,drag=null,frame=0;
  try{const value=Number(storage.getItem(key));if(Number.isFinite(value)&&value>=100&&value<=600)preferred=value}catch{}
  const limits=()=>({min:Math.min(175,Math.max(100,innerWidth-240)),max:Math.max(100,Math.min(600,innerWidth-240))});
  const clamp=value=>{const {min,max}=limits();return Math.round(Math.max(min,Math.min(max,value)))};
  function apply(){
   if(preferred!==null){document.documentElement.style.setProperty(portal?'--portal-nav-custom-width':'--portal-sidebar-width',clamp(preferred)+'px');if(portal)document.body.classList.add('portal-nav-custom-width')}
   position();window.dispatchEvent(new CustomEvent('portal:sidebar-resized'));
  }
  function position(){
   const r=sidebar.getBoundingClientRect(),collapsed=document.body.classList.contains(portal?'sidebar-collapsed':'portal-sidebar-collapsed');
   handle.hidden=collapsed||!r.width||!r.height||getComputedStyle(sidebar).display==='none'||(portal&&innerWidth<=800);
   Object.assign(handle.style,{left:(r.right-4)+'px',top:Math.max(0,r.top)+'px',height:Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top))+'px'});
   const {min,max}=limits();handle.setAttribute('aria-valuemin',min);handle.setAttribute('aria-valuemax',max);handle.setAttribute('aria-valuenow',Math.round(r.width));
  }
  function notify(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{position();window.dispatchEvent(new Event('resize'));})}
  function save(){try{if(preferred===null)storage.setItem(key,'');else storage.setItem(key,String(preferred))}catch{}}
  function finish(cancel=false){if(!drag)return;if(cancel){preferred=drag.previous;restore()}else save();drag=null;shield.hidden=true;document.body.classList.remove('portal-sidebar-resizing');notify()}
  function restore(){if(preferred===null){document.documentElement.style.removeProperty(portal?'--portal-nav-custom-width':'--portal-sidebar-width');if(portal)document.body.classList.remove('portal-nav-custom-width')}apply()}
  handle.addEventListener('pointerdown',event=>{
   if(event.button!==0||handle.hidden)return;event.preventDefault();drag={pointer:event.pointerId,x:event.clientX,width:sidebar.getBoundingClientRect().width,previous:preferred};handle.setPointerCapture(event.pointerId);shield.hidden=false;document.body.classList.add('portal-sidebar-resizing');
  });
  handle.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.pointer)return;preferred=clamp(drag.width+event.clientX-drag.x);apply();notify()});
  handle.addEventListener('pointerup',event=>{if(drag&&event.pointerId===drag.pointer)finish()});
  handle.addEventListener('pointercancel',()=>finish(true));handle.addEventListener('lostpointercapture',()=>finish());
  window.addEventListener('blur',()=>finish(true));
  document.addEventListener('keydown',event=>{if(drag&&event.key==='Escape'){event.preventDefault();finish(true)}});
  handle.addEventListener('dblclick',()=>{preferred=null;restore();save();notify()});
  handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();preferred=event.key==='Home'?null:clamp(sidebar.getBoundingClientRect().width+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?40:10));restore();save();notify()});
  window.addEventListener('resize',()=>{if(preferred!==null)apply();else position()});
  window.addEventListener('scroll',position,{passive:true,capture:true});
  new ResizeObserver(position).observe(sidebar);new MutationObserver(position).observe(document.body,{attributes:true,attributeFilter:['class']});
  apply();
 };
})();
