'use strict';
// Drafts contain dashboard configuration only, never source rows or credentials.
const editSession={original:null,key:'',pending:null,bypass:false,timer:0};
function editSessionKey(){return 'insight-bi-draft:'+JSON.stringify([dashboardState.id,state.name,state.sheet])}
function editSessionSnapshot(){return {snapshot:dashboardSnapshot(),meta:{id:dashboardState.id,preset:dashboardState.preset,name:dashboardState.name,description:dashboardState.description,baseline:dashboardState.baseline},schema:profile().map(c=>({name:c.name,type:c.type}))}}
function dashboardHasEdits(){return Boolean(editSession.original&&snapshotSignature()!==JSON.stringify(editSession.original.snapshot))}
function discardDashboardDraft(){try{localStorage.removeItem(editSession.key)}catch{} }
function persistDashboardDraft(){
 if(!dashboardState.editing||!editSession.original||editSession.bypass)return;
 if(!dashboardHasEdits()){discardDashboardDraft();return}
 try{localStorage.setItem(editSession.key,JSON.stringify({version:1,original:editSession.original,draft:editSessionSnapshot(),savedAt:new Date().toISOString()}));$('#dashboardDirty').textContent='임시저장됨 · 정식 저장 필요'}catch{$('#dashboardDirty').textContent='임시저장 실패 · 정식 저장 필요'}
}
function restoreEditSnapshot(entry){Object.assign(state,entry.snapshot.explorer,entry.snapshot.filters,{slicers:safeSlicers(entry.snapshot.slicers),board:entry.snapshot.board.map(safeConfig)});Object.assign(dashboardState,entry.meta,{layout:entry.snapshot.layout,selected:-1});resetBoardHistory();refreshControls();renderAll()}
function beginDashboardSession(){
 editSession.original=editSessionSnapshot();editSession.key=editSessionKey();
 try{const cached=JSON.parse(localStorage.getItem(editSession.key)||'null');
 if(cached?.version===1&&JSON.stringify(cached.original.snapshot)===JSON.stringify(editSession.original.snapshot)&&JSON.stringify(cached.draft.schema)===JSON.stringify(editSession.original.schema)){
 if(window.confirm('이 대시보드의 임시저장 내용이 있습니다. 복원할까요?'))restoreEditSnapshot(cached.draft);else discardDashboardDraft();
 }else discardDashboardDraft();}catch{discardDashboardDraft()}
}
function finishDashboardExit(save){
 const action=editSession.pending;if(!action)return;
 if(save){
 if(!readDashboards().some(d=>d.id===dashboardState.id)){$('#leaveDashboardDialog').close();openDashboardSave();return}
 try{saveDashboard(dashboardState.name,dashboardState.description,true)}catch(e){$('#leaveDashboardError').textContent=e.message;return}
 // saveDashboard completes the queued exit.
 return;
 }
 editSession.bypass=true;
 try{discardDashboardDraft();if(editSession.original)restoreEditSnapshot(editSession.original);editSession.original=null;editSession.pending=null;$('#leaveDashboardDialog').close();action()}finally{editSession.bypass=false}
}
function guardDashboardExit(action){
 if(editSession.bypass||!dashboardHasEdits())return true;
 persistDashboardDraft();editSession.pending=action;$('#leaveDashboardError').textContent='';if(!$('#leaveDashboardDialog').open)$('#leaveDashboardDialog').showModal();return false;
}
const sessionSetEditing=setDashboardEditing;
setDashboardEditing=function(editing){
 if(!editing&&!guardDashboardExit(()=>setDashboardEditing(false)))return;
 if(editing&&!dashboardState.editing&&!state.readOnly)beginDashboardSession();
 const result=sessionSetEditing(editing);
 if(!editing){discardDashboardDraft();editSession.original=null}return result;
};
const sessionShowPage=showPage;
showPage=function(page){if(page!=='dashboard'&&!guardDashboardExit(()=>showPage(page)))return;const result=sessionShowPage(page);if(page!=='dashboard'&&dashboardState.editing)setDashboardEditing(false);return result};
// Protect source/dashboard switches before any state changes are made.
for(const name of ['selectConnectedData','applyPreset','applySavedDashboard','setData','openLibraryDashboard']){
 const original=({selectConnectedData,applyPreset,applySavedDashboard,setData,openLibraryDashboard})[name];
 const wrapped=function(...args){if(!guardDashboardExit(()=>wrapped(...args)))return;const bypass=editSession.bypass;editSession.bypass=true;try{const result=original(...args);if(dashboardState.editing){editSession.original=editSessionSnapshot();editSession.key=editSessionKey()}else editSession.original=null;return result}finally{editSession.bypass=bypass}};
 if(name==='selectConnectedData')selectConnectedData=wrapped;
 if(name==='applyPreset')applyPreset=wrapped;
 if(name==='applySavedDashboard')applySavedDashboard=wrapped;
 if(name==='setData')setData=wrapped;
 if(name==='openLibraryDashboard')openLibraryDashboard=wrapped;
}
const sessionSaveDashboard=saveDashboard;
saveDashboard=function(...args){
 const record=sessionSaveDashboard(...args);discardDashboardDraft();
 if(dashboardState.editing){editSession.original=editSessionSnapshot();editSession.key=editSessionKey()}
 if(editSession.pending){const action=editSession.pending;editSession.pending=null;editSession.original=null;$('#leaveDashboardDialog').close();editSession.bypass=true;try{action()}finally{editSession.bypass=false}}
 return record;
};
const sessionUpdateDashboardUI=updateDashboardUI;
updateDashboardUI=function(){sessionUpdateDashboardUI();persistDashboardDraft()};
window.addEventListener('beforeunload',e=>{if(dashboardHasEdits()){persistDashboardDraft();e.preventDefault();e.returnValue=''}});
window.addEventListener('DOMContentLoaded',()=>{
 const dialog=el('dialog');dialog.id='leaveDashboardDialog';
 dialog.innerHTML='<h2>변경 내용을 저장할까요?</h2><p>편집 내용은 임시저장되어 있습니다. 저장하지 않고 나가면 편집 전 상태로 돌아갑니다.</p><p id="leaveDashboardError" role="alert"></p><div class="actions"><button id="stayDashboard">취소</button><button id="discardDashboard">저장하지 않고 나가기</button><button id="saveBeforeLeaving" class="primary">저장 후 나가기</button></div>';
 document.body.append(dialog);
 $('#stayDashboard').onclick=()=>{editSession.pending=null;dialog.close()};dialog.addEventListener('cancel',()=>{editSession.pending=null});
 $('#discardDashboard').onclick=()=>finishDashboardExit(false);$('#saveBeforeLeaving').onclick=()=>finishDashboardExit(true);
 $('#dashboardDialog').addEventListener('close',()=>{if(editSession.pending)editSession.pending=null});
});
