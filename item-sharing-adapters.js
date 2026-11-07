/* Capture only the selected native item; other documents/projects/sheets are excluded. */
(() => {
 const app=location.pathname.split('/apps/')[1]?.split('/')[0];if(!['markdown','projects','insight'].includes(app))return;
 const clone=x=>structuredClone(x),pause=()=>new Promise(r=>setTimeout(r,50));
 async function wait(ready){for(let i=0;i<300;i++){if(ready())return;await pause()}throw Error('항목을 준비하지 못했습니다. 다시 열어 주세요.');}
 const selectedProject=(w,id)=>{const prefix='projects/'+id;return {...clone(w),files:w.files.filter(f=>f.path===prefix+'.json'||f.path===prefix+'.meta.json'||f.path.startsWith(prefix+'/')),directories:w.directories.filter(d=>d==='projects'||d===prefix||d.startsWith(prefix+'/'))};};
 async function capture(id){
  if(app==='markdown'){await wait(()=>!APP.loading);if(typeof flushSourcePreview==='function')flushSourcePreview();const d=APP.documents.find(d=>d.id===id);if(!d)throw Error('문서를 찾지 못했습니다.');const doc={...clone(d),folderId:'',parentId:''};return {title:doc.title,workspace:{format:'md-editor-workspace',version:1,documents:[doc],folders:[],activeId:id,theme:APP.theme}};}
  if(app==='projects'){await wait(()=>window.PortalWorkspaceAdapter);await PortalWorkspaceAdapter.beforeWrite();const w=selectedProject(await PortalWorkspaceAdapter.capture(),id),meta=w.files.find(f=>f.path==='projects/'+id+'.meta.json');if(!meta||!w.files.some(f=>f.path==='projects/'+id+'.json'))throw Error('프로젝트를 저장한 뒤 공유해 주세요.');return {title:PortalStorageModels.decode(meta.data).name||'프로젝트',workspace:w};}
  await wait(()=>typeof dashboardLibraryEntries==='function');const entry=dashboardLibraryEntries().find(e=>e.dashboard.id===id);if(!entry?.source?.sheets[entry.sheet])throw Error('연결 데이터를 확인한 뒤 공유해 주세요.');const source=storageSourceRecord(entry.source);source.sheets={[entry.sheet]:clone(source.sheets[entry.sheet])};source.links={[entry.sheet]:[["saved:"+id,entry.dashboard.name]]};source.retainedDashboards=[];source.readOnly=false;return {title:entry.dashboard.name,workspace:{format:'insight-bi-workspace',version:1,dashboards:[clone(entry.dashboard)],sources:[source],detached:[],theme:document.documentElement.dataset.theme||'light'}};
 }
 async function init(){
  const session=window.PortalShareSession;
  if(!session){if(window.PortalItemSharing)await PortalItemSharing.init({capture,note:app==='insight'?'선택한 대시보드와 연결된 시트 데이터가 공유됩니다.':'선택한 항목만 공유됩니다. 원본은 개인 저장소에 남으며, 공유 후에는 공유 항목을 열어 함께 작업하세요.',mount:()=>app==='markdown'?document.querySelector('#documentSharing'):app==='projects'?document.querySelector('#list').parentElement:document.querySelector('#dashboardListRows').closest('.card')||document.querySelector('#dashboards')});return;}
  const canEdit=()=>session.canEdit;
  const scopeStyle=document.createElement('style');scopeStyle.textContent=app==='markdown'?'#newDoc,#newFolder,#duplicateDoc,#deleteDoc,#moveTreeItem,#deleteTreeItem,#importDoc,#importWorkspace{display:none!important}':app==='projects'?'#btn-new,#empty-new,#del-yes{display:none!important}':'#createDashboard,.dashboard-action-icon[title=삭제]{display:none!important}';document.head.append(scopeStyle);
  if(app==='markdown')await wait(()=>!APP.loading&&ST.ready);
  else if(app==='projects'){await wait(()=>window.PortalWorkspaceAdapter);await window.PortalProjectReady;await PortalWorkspaceAdapter.prepare();const original=wbsHost.saveProject.bind(wbsHost);wbsHost.saveProject=async(...args)=>{if(!canEdit())throw Error('조회 전용 공유 항목입니다.');const result=await original(...args);await session.commit(await PortalWorkspaceAdapter.capture());return result;};}
  else {await wait(()=>storageState.ready);const first=readDashboards()[0];if(first)openLibraryDashboard(first.id);}
  const disabledByShare=new Set();
  function protect(){document.body.classList.toggle('portal-shared-readonly',!canEdit());if(canEdit()){const restored=disabledByShare.size>0;for(const n of disabledByShare){if(n.isConnected)n.disabled=false;}disabledByShare.clear();if(app==='markdown'&&restored)syncPreviewEditable();if(app==='insight'&&restored){state.readOnly=false;syncEditMode();}return;}
   const selectors=app==='markdown'?'#editor,#docTitle,#newDoc,#newFolder,#duplicateDoc,#deleteDoc,#editTreeItem,#moveTreeItem,#deleteTreeItem,#importDoc,#importWorkspace,#previewEditable,#syncScroll,#syncScrollBoth':app==='projects'?'#btn-new,[data-edit],#empty-new': '#createDashboard,#editDashboard,#saveDashboard,#editData,.dashboard-action-icon[title=편집],.dashboard-action-icon[title=삭제]';
   for(const n of document.querySelectorAll(selectors))if(!n.disabled){disabledByShare.add(n);n.disabled=true;}
   if(app==='markdown'&&RICH.editor?.isEditable)syncPreviewEditable();if(app==='insight'){dashboardState.editing=false;state.readOnly=true;}
  }
  new MutationObserver(protect).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});window.addEventListener('portal:share-permission',protect);protect();
  const popupDisabled=new Set();
  if(app==='projects')setInterval(()=>{if(canEdit()){for(const n of popupDisabled)if(n.isConnected)n.disabled=false;popupDisabled.clear();return;}for(const w of PortalWorkspaceAdapter.sharedWindows()){if(!w||w.closed)continue;try{for(const n of w.document.querySelectorAll('input,textarea,select'))if(!n.disabled){popupDisabled.add(n);n.disabled=true;}for(const n of w.document.querySelectorAll('[contenteditable=true]'))n.contentEditable='false';}catch{}}},500);
  window.PortalSharedItemAdapter={async flush(){if(!canEdit())throw Error('조회 전용 공유 항목입니다.');if(app==='markdown')return saveWorkspace();if(app==='insight'){if(dashboardState.id)saveDashboard(dashboardState.name,dashboardState.description,true);return saveWorkspaceNow(true);}await PortalWorkspaceAdapter.beforeWrite();return session.commit(await PortalWorkspaceAdapter.capture());}};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(e=>console.error(e.message)));else init().catch(e=>console.error(e.message));
})();
