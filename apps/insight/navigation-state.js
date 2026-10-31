'use strict';
// Per-tab navigation only; no source rows or credentials are stored here.
const navigationState={ready:false,restoring:false,initial:null};
try{navigationState.initial=JSON.parse(sessionStorage.getItem('insight-bi-view-v1')||'null')}catch{}
function captureViewState(){
 const page=Array.from(document.querySelectorAll('.page')).find(p=>!p.hidden)?.id||'dashboards';
 return {version:1,page,dashboardId:dashboardState.id||'',preset:dashboardState.preset||'basic1',sourceId:state.connectionId||'',sourceName:state.name||'',sheet:state.sheet||'',list:{search:$('#dashboardListSearch')?.value||'',status:$('#dashboardListStatus')?.value||'all',sort:$('#dashboardListSort')?.value||'updated'}};
}
function rememberViewState(){
 if(!navigationState.ready||navigationState.restoring||storageState.restoring)return;
 try{sessionStorage.setItem('insight-bi-view-v1',JSON.stringify(captureViewState()))}catch{}
}
function restoreViewState(view){
 if(!view||view.version!==1||!['dashboards','dashboard','data','settings'].includes(view.page)){showPage('dashboards');return}
 navigationState.restoring=true;
 try{
 for(const [key,id] of [['search','dashboardListSearch'],['status','dashboardListStatus'],['sort','dashboardListSort']])if(typeof view.list?.[key]==='string')$('#'+id).value=view.list[key];
 const sources=[...connectedData,...detachedData],source=sources.find(r=>r.id===view.sourceId&&r.sheets[view.sheet])||(()=>{const matches=sources.filter(r=>r.name===view.sourceName&&r.sheets[view.sheet]);return matches.length===1?matches[0]:null})();
 if(view.page==='dashboard'){
 if(view.dashboardId){
 const entry=dashboardLibraryEntries().find(e=>e.dashboard.id===view.dashboardId);
 if(entry?.source&&dashboardCompatibilityForView(entry)){openLibraryDashboard(view.dashboardId);return}
 showPage('dashboards');notify('이전에 보던 대시보드의 데이터를 복원할 수 없습니다. 데이터를 연결한 뒤 다시 열어 주세요.');return;
 }
 if(source){selectConnectedData(JSON.stringify([source.id,view.sheet]));if(!source.readOnly&&Object.hasOwn(presetInfo,view.preset))applyPreset(view.preset,false);showPage('dashboard');return}
 showPage('dashboards');notify('이전에 보던 데이터가 저장되어 있지 않습니다. 데이터를 다시 연결해 주세요.');return;
 }
 if(source)selectConnectedData(JSON.stringify([source.id,view.sheet]));showPage(view.page);
 }finally{navigationState.restoring=false}
}
function dashboardCompatibilityForView(entry){
 const table=entry.source.sheets[entry.sheet];if(!table)return false;
 // The normal dashboard opener checks names and types after selecting the source.
 // Do not open the relink dialog automatically during a browser refresh.
 return entry.dashboard.schema.every(c=>table.columns.includes(c.name));
}
const navigationShowPage=showPage;
showPage=function(page){const result=navigationShowPage(page);if(!$('#'+page)?.hidden)rememberViewState();return result};
const navigationInitStorage=initWorkspaceStorage;
initWorkspaceStorage=async function(...args){
 try{return await navigationInitStorage(...args)}finally{
 try{restoreViewState(navigationState.initial)}finally{navigationState.ready=true;rememberViewState()}
 }
};
window.addEventListener('beforeunload',rememberViewState);
