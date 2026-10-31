'use strict';
const storageState={settings:null,infos:{},revision:null,ready:false,busy:false,restoring:false,timer:0,generation:0,dirty:false,promise:null,defaultPath:''};
const STORAGE_NAMES={local:'로컬 폴더',google:'Google Drive',onedrive:'MS OneDrive',sqlite:'SQLite DB',odbc:'외부 DB (ODBC)'};
async function storageAPI(action,payload={}){
 for(let attempt=0;attempt<2;attempt++){
 if(!token){const s=await fetch('/api/session',{cache:'no-store'});token=(await s.json()).token}
 if(action==='save'&&typeof Worker!=='undefined'){
 const result=await saveWorkspaceInWorker(payload,token);
 if(result.status===403&&attempt===0){token='';continue}
 if(!result.ok)throw Error(result.data.error||'저장소 요청 실패');
 storageState.lastSaveMetrics=result.metrics;return result.data;
 }
 const response=await fetch('/api/storage/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-BI-Token':token},body:JSON.stringify(payload)});
 if(response.status===403&&attempt===0){token='';continue}
 const result=await response.json();if(!response.ok)throw Error(result.error||'저장소 요청 실패');return result;
 }
}
function saveWorkspaceInWorker(payload,sessionToken){
 return new Promise((resolve,reject)=>{
 const worker=new Worker('storage-worker.js'),start=performance.now();let enqueueMs=0;
 const timer=setTimeout(()=>{worker.terminate();reject(Error('저장 응답 시간이 초과되었습니다. 저장소 상태를 확인해 주세요.'))},120000);
 const finish=()=>{clearTimeout(timer);worker.terminate()};
 worker.onmessage=e=>{finish();if(e.data.error)reject(Error(e.data.error));else resolve({...e.data,metrics:{...e.data.metrics,enqueueMs,totalMs:Math.round(performance.now()-start)}})};
 worker.onerror=()=>{finish();reject(Error('저장 작업을 시작하지 못했습니다. 다시 시도해 주세요.'))};
 try{worker.postMessage({payload,token:sessionToken});enqueueMs=Math.round(performance.now()-start)}catch(e){finish();reject(e)}
 });
}
function activeStorage(){return storageState.settings?.profiles.find(p=>p.id===storageState.settings.activeId)}
function storageSourceRecord(r){return {id:r.id,originId:r.originId,name:r.name,signature:r.signature||'',connectedAt:r.connectedAt,readOnly:Boolean(r.readOnly),sheets:r.sheets,links:Object.fromEntries(Object.entries(r.links||{}).map(([sheet,links])=>[sheet,Array.from(links||[])])),retainedDashboards:structuredClone(r.retainedDashboards||[])}}
function captureWorkspace(){
 return {format:'insight-bi-workspace',version:1,savedAt:new Date().toISOString(),dashboards:readDashboards(),sources:connectedData.map(storageSourceRecord),detached:detachedData.map(storageSourceRecord),theme:document.documentElement.dataset.theme||'light'};
}
function validateWorkspaceBundle(w){
 if(w?.format!=='insight-bi-workspace'||w.version!==1||!Array.isArray(w.dashboards)||w.dashboards.length>40||!Array.isArray(w.sources)||!Array.isArray(w.detached))throw Error('지원하지 않는 작업공간 형식입니다.');
 const ids=new Set();for(const d of w.dashboards){
 if(d.version!==1||typeof d.id!=='string'||ids.has(d.id)||typeof d.name!=='string'||!Array.isArray(d.board)||d.board.length>20||!Array.isArray(d.schema)||d.schema.some(c=>typeof c.name!=='string'||!['number','date','category'].includes(c.type))||!['grid','focus','compact'].includes(d.layout)||typeof d.filters?.search!=='string'||typeof d.filters?.filterColumn!=='string'||typeof d.filters?.filterValue!=='string')throw Error('저장된 대시보드 구조를 확인해 주세요.');ids.add(d.id);safeSlicers(d.slicers);safeConfig(d.explorer);d.board.forEach(safeConfig);
 }
 const sourceIds=new Set();for(const r of [...w.sources,...w.detached]){if(typeof r.id!=='string'||sourceIds.has(r.id)||typeof r.name!=='string'||!r.sheets||typeof r.sheets!=='object')throw Error('데이터 연결 구조 오류');sourceIds.add(r.id);Object.values(r.sheets).forEach(t=>{if(t.columns?.length===0&&Array.isArray(t.rows)&&!t.rows.length)return;TableModel.validate(t)});for(const entries of Object.values(r.links||{}))if(!Array.isArray(entries)||entries.some(e=>!Array.isArray(e)||e.length!==2||e.some(v=>typeof v!=='string')))throw Error('데이터 연결 이름 형식 오류');for(const d of r.retainedDashboards||[]){safeConfig(d.explorer);d.board.forEach(safeConfig)}}
 return w;
}
function hydrateStorageSource(r){return {...structuredClone(r),revisions:Object.fromEntries(Object.keys(r.sheets).map(s=>[s,Date.now()])),links:Object.fromEntries(Object.entries(r.links||{}).map(([s,v])=>[s,new Map(v)]))}}
async function replaceDetachedStorage(records){const db=await cacheDatabase();try{await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots');store.clear();records.forEach(r=>store.put(r));tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error('브라우저 보관 데이터 복원 실패'))})}finally{db.close()}}
async function restoreWorkspaceBundle(w){
 validateWorkspaceBundle(w);const previousDashboards=readDashboards(),previousDetached=detachedData.slice();const sources=w.sources.map(hydrateStorageSource),retained=w.detached.map(hydrateStorageSource);
 storageState.restoring=true;try{
 writeDashboards(w.dashboards);try{await replaceDetachedStorage(retained)}catch(e){writeDashboards(previousDashboards);await replaceDetachedStorage(previousDetached);throw e}
 connectedData.splice(0,connectedData.length,...sources);detachedData.splice(0,detachedData.length,...retained);
 // Existing detail windows retain their old revision and must be reopened before editing restored data.
 const first=catalogEntries()[0]||retainedEntries()[0];editSession.original=null;dashboardState.editing=false;
 if(first)selectConnectedData(JSON.stringify([first.record.id,first.sheet]));else clearSelectedData();
 document.documentElement.dataset.theme=w.theme==='dark'?'dark':'light';localStorage.setItem('insight-theme',document.documentElement.dataset.theme);renderDataCatalog();renderDashboardList();syncEditMode();
 }finally{storageState.restoring=false}
}
function storageStatus(message,error=false){const node=$('#storageStatus');if(node){node.textContent=message;node.classList.toggle('storage-error',error)}const badge=$('#storageBadge');if(badge){badge.textContent=message;badge.classList.toggle('storage-error',error)}}
function storageChanged(){
 if(storageState.restoring||!storageState.settings)return;storageState.generation++;storageState.dirty=true;
 if(!activeStorage()){storageStatus('저장소 미연결 · 현재 데이터는 브라우저 작업 사본입니다.');return}
 storageStatus('저장하지 않은 작업공간 변경이 있습니다.');
 if(storageState.ready&&storageState.settings.autoSave){clearTimeout(storageState.timer);storageState.timer=setTimeout(()=>saveWorkspaceNow(false).catch(()=>{}),900)}
}
async function saveWorkspaceNow(manual=false){
 if(storageState.promise){await storageState.promise;if(storageState.dirty)return saveWorkspaceNow(manual);return}
 if(!manual&&!storageState.dirty)return;
 clearTimeout(storageState.timer);
 const p=activeStorage();if(!p)throw Error('설정 → 저장소 연결에서 저장소를 먼저 연결해 주세요.');
 if(p.needsCredential)throw Error('이 저장소의 인증 정보를 다시 입력해 주세요.');
 if(!storageState.ready&&!manual)throw Error('설정에서 저장소를 불러오거나 ‘지금 저장’을 한 번 실행해 주세요.');
 if(manual&&!storageState.ready&&storageState.infos[p.id]?.hasWorkspace&&!window.confirm('저장소의 기존 작업공간을 현재 브라우저 내용으로 교체할까요? 기존 내용을 사용하려면 불러오기를 선택하세요.'))return;
 const workspace=captureWorkspace(),generation=storageState.generation;storageState.busy=true;storageStatus('저장 중…');renderStorageList();
 storageState.promise=(async()=>{
 try{const info=await storageAPI('save',{id:p.id,revision:storageState.revision,workspace});storageState.revision=info.revision;storageState.infos[p.id]=info;storageState.ready=true;storageState.dirty=storageState.generation!==generation;storageStatus('저장 완료 · '+p.name+' · '+new Date(info.savedAt).toLocaleString('ko-KR'));return info}
 catch(e){storageState.dirty=true;storageStatus('저장 실패 · '+e.message,true);throw e}
 finally{storageState.busy=false;storageState.promise=null;renderStorageList()}
 })();return storageState.promise;
}
async function loadWorkspaceNow(startup=false){
 const returnView=typeof captureViewState==='function'?captureViewState():null;
 const p=activeStorage();if(!p)throw Error('선택한 저장소가 없습니다.');if(!startup&&!window.confirm('저장소의 내용으로 현재 대시보드와 연결 데이터를 교체할까요? 저장하지 않은 내용은 먼저 저장해 주세요.'))return;
 storageState.busy=true;renderStorageList();try{const info=await storageAPI('load',{id:p.id});storageState.infos[p.id]=info;storageState.revision=info.revision;
 if(!info.hasWorkspace){storageState.ready=false;storageStatus('연결 완료 · 아직 저장된 작업공간이 없습니다. 지금 저장을 눌러 시작하세요.');return}
 await restoreWorkspaceBundle(info.workspace);if(!startup&&returnView&&typeof restoreViewState==='function')restoreViewState(returnView);storageState.ready=true;storageState.dirty=false;storageStatus('불러오기 완료 · '+p.name+' · '+new Date(info.savedAt).toLocaleString('ko-KR'));
 }catch(e){storageStatus('불러오기 실패 · '+e.message,true);throw e}finally{storageState.busy=false;renderStorageList()}
}
function renderStorageFields(profile=null){
 const provider=$('#storageProvider').value,mode=$('#storageMode').value;$('#storageModeLabel').hidden=!['google','onedrive'].includes(provider);$('#storagePathLabel').hidden=!(['local','sqlite'].includes(provider)||['google','onedrive'].includes(provider)&&mode==='folder');
 $('#storageFolderLabel').hidden=provider!=='google'||mode!=='api';$('#storageRemoteLabel').hidden=provider!=='onedrive'||mode!=='api';$('#storageDialectLabel').hidden=provider!=='odbc';$('#storageKeyLabel').hidden=provider!=='odbc';$('#storageCredentialLabel').hidden=!(provider==='odbc'||['google','onedrive'].includes(provider)&&mode==='api');
 $('#storageCredentialText').textContent=provider==='odbc'?'DB 쓰기용 ODBC 연결 문자열':'OAuth 액세스 토큰 (쓰기 권한 필요)';$('#storagePathText').textContent=provider==='sqlite'?'SQLite 파일 절대 경로':'저장 폴더 절대 경로';
 $('#storageHelp').textContent=provider==='odbc'?'선택한 DB에 insight_bi_workspaces 전용 테이블을 생성합니다. 해당 ODBC 드라이버와 테이블 생성·조회·쓰기 권한이 필요합니다. 업무 원본 테이블은 변경하지 않습니다.':provider==='sqlite'?'앱 전용 테이블에 작업공간을 저장합니다. DB 파일의 상위 폴더가 있어야 합니다.':['google','onedrive'].includes(provider)&&mode==='api'?'직접 발급한 OAuth 액세스 토큰을 사용합니다. 자동 로그인·토큰 갱신은 제공하지 않으며 서버 재시작 또는 토큰 만료 시 다시 입력합니다.':provider==='local'?'선택한 폴더에 insight-bi-workspace.json과 이전 저장본을 보관합니다.':'이 PC에서 동기화 중인 Google Drive/OneDrive 폴더를 지정하세요. 앱은 로컬 파일 저장 완료를 확인하며 클라우드 업로드 완료는 동기화 앱에서 확인하세요.';
}
function editStorageProfile(p=null){
 $('#storageProfileId').value=p?.id||'';$('#storageProfileName').value=p?.name||'';$('#storageProvider').value=p?.provider||'local';$('#storageMode').value=p?.mode||'folder';$('#storagePath').value=p?.path||storageState.defaultPath;$('#storageFolder').value=p?.folderId||'root';$('#storageRemote').value=p?.remotePath||'insight-bi-workspace.json';$('#storageDialect').value=p?.dialect||'sqlserver';$('#storageKey').value=p?.workspaceKey||'default';$('#storageCredential').value='';$('#storageFormError').textContent='';renderStorageFields();
}
function openStorageProfile(profile=null){
 if(storageState.busy||!storageState.settings)return;
 editStorageProfile(profile);$('#storageProfileDialogTitle').textContent=profile?'저장소 연결 수정':'새 저장소 연결';
 $('#storageProfileDialog').showModal();$('#storageProfileName').focus();
}
function closeStorageProfile(){
 if(storageState.busy)return;
 $('#storageProfileDialog').close();
}
function setStorageFormBusy(busy){
 $('#storageForm').querySelectorAll('input,select,button').forEach(node=>node.disabled=busy);
 $('#closeStorageProfile').disabled=busy;
}
function renderStorageList(){
 if(!$('#storageRows')||!storageState.settings)return;const s=storageState.settings;$('#storageAutoSave').checked=s.autoSave;$('#storageAutoRestore').checked=s.autoRestore;
 $('#storageRows').replaceChildren(...s.profiles.map(p=>{const row=el('tr'),select=el('input');select.type='radio';select.name='activeStorage';select.checked=p.id===s.activeId;select.disabled=storageState.busy;select.setAttribute('aria-label',p.name+' 기본 저장소 선택');select.onchange=()=>storageAction(async()=>{const r=await storageAPI('preferences',{activeId:p.id});storageState.settings=r.settings;storageState.revision=null;storageState.ready=false;const info=await storageAPI('load',{id:p.id});storageState.revision=info.revision;storageState.infos[p.id]=info;storageStatus('저장소 선택 · 불러오기 또는 지금 저장을 선택하세요.');renderStorageList()});
 const radioCell=el('td');radioCell.append(select);const info=storageState.infos[p.id],status=p.needsCredential?'인증 재입력 필요':p.id===s.activeId?(storageState.ready?'사용 중':'연결됨 · 불러오기/첫 저장 필요'):'연결됨',actions=el('td','storage-row-actions');const edit=listActionButton('연결 수정','편집',p.name+' 연결 수정');edit.onclick=()=>openStorageProfile(p);const remove=listActionButton('연결 해제','연결 해제',p.name+' 연결 해제');remove.onclick=()=>{if(!window.confirm('저장소 연결을 해제할까요? 저장소의 실제 파일/DB 내용은 유지됩니다.'))return;storageAction(async()=>{const r=await storageAPI('disconnect',{id:p.id});storageState.settings=r.settings;if(!activeStorage()){storageState.ready=false;storageState.revision=null}renderStorageList();storageStatus('연결 해제 완료 · 저장 파일은 유지됩니다.')})};edit.disabled=remove.disabled=storageState.busy;actions.append(edit,remove);
 row.append(radioCell,el('td','',p.name),el('td','',STORAGE_NAMES[p.provider]),el('td','storage-location',p.path||p.remotePath||p.folderId||(p.dialect+' / '+p.workspaceKey)),el('td','',status),el('td','',(info?.savedAt||p.lastSavedAt)?new Date(info?.savedAt||p.lastSavedAt).toLocaleString('ko-KR'):'아직 저장 안 함'),actions);return row}));
 if(!s.profiles.length){const row=el('tr'),cell=el('td','','연결된 저장소가 없습니다. ＋ 새 연결에서 저장소를 등록하세요.');cell.colSpan=7;row.append(cell);$('#storageRows').append(row)}
 const p=activeStorage();$('#storageActiveName').textContent=p?p.name:'선택한 저장소 없음';$('#storageSaveNow').disabled=$('#storageLoadNow').disabled=!p||storageState.busy;$('#connectStorage').disabled=storageState.busy;$('#newStorageProfile').disabled=storageState.busy;
 const workspace={dashboards:readDashboards(),sources:connectedData,detached:detachedData};$('#storageSummary').textContent=`현재 작업공간 · 대시보드 ${workspace.dashboards.length}개 · 연결 데이터 ${workspace.sources.length}개 · 시트 ${workspace.sources.reduce((n,r)=>n+Object.keys(r.sheets).length,0)}개 · 조회 전용 보관 ${workspace.detached.length}개`;
 if(storageState.lastSaveMetrics){const m=storageState.lastSaveMetrics;$('#storageSummary').textContent+=` · 최근 저장 ${(m.bytes/1024/1024).toFixed(2)}MB · 전달 ${m.enqueueMs}ms · JSON ${m.serializeMs}ms · 전체 ${m.totalMs}ms`}
}
async function storageAction(action){try{await action()}catch(e){storageStatus(e.message,true);$('#storageFormError').textContent=e.message}}
async function initWorkspaceStorage(){
 $('#storageProvider').onchange=()=>renderStorageFields();$('#storageMode').onchange=()=>renderStorageFields();$('#newStorageProfile').onclick=()=>openStorageProfile();
 $('#closeStorageProfile').onclick=$('#cancelStorageProfile').onclick=closeStorageProfile;
 $('#storageProfileDialog').addEventListener('cancel',e=>{if(storageState.busy)e.preventDefault()});
 $('#storageProfileDialog').addEventListener('close',()=>{$('#storageCredential').value='';$('#storageFormError').textContent=''});
 $('#storageForm').onsubmit=e=>{e.preventDefault();storageAction(async()=>{const profile={id:$('#storageProfileId').value,name:$('#storageProfileName').value,provider:$('#storageProvider').value,mode:$('#storageMode').value,path:$('#storagePath').value,folderId:$('#storageFolder').value,remotePath:$('#storageRemote').value,dialect:$('#storageDialect').value,workspaceKey:$('#storageKey').value};storageState.busy=true;setStorageFormBusy(true);renderStorageList();try{const r=await storageAPI('connect',{profile,credential:$('#storageCredential').value});$('#storageCredential').value='';storageState.settings=r.settings;storageState.infos[r.settings.activeId]=r.info;storageState.revision=r.info.revision;storageState.ready=false;storageStatus('저장소 연결 완료 · 불러오기 또는 지금 저장을 선택하세요.');$('#storageProfileDialog').close();editStorageProfile()}finally{storageState.busy=false;setStorageFormBusy(false);renderStorageList()}})};
 $('#storageSaveNow').onclick=()=>storageAction(()=>saveWorkspaceNow(true));$('#storageLoadNow').onclick=()=>storageAction(()=>loadWorkspaceNow(false));
 for(const id of ['storageAutoSave','storageAutoRestore'])$('#'+id).onchange=()=>storageAction(async()=>{const r=await storageAPI('preferences',{autoSave:$('#storageAutoSave').checked,autoRestore:$('#storageAutoRestore').checked});storageState.settings=r.settings;renderStorageList()});
 try{const r=await storageAPI('status');storageState.settings=r.settings;storageState.defaultPath=r.defaultPath;editStorageProfile();renderStorageList();const p=activeStorage();if(p&&r.settings.autoRestore&&!p.needsCredential)await loadWorkspaceNow(true);else storageStatus(p?'저장소 연결됨 · 불러오기 또는 인증을 확인하세요.':'저장소 미연결 · 설정에서 영구 저장소를 연결하세요.')}
 catch(e){storageStatus('저장소 초기화 실패 · '+e.message+' · BI 서버를 종료 후 다시 실행해 주세요.',true)}
}
// Existing actions remain synchronous in the editor; persistence is queued after each committed change.
const storageWriteDashboards=writeDashboards;writeDashboards=function(...args){const result=storageWriteDashboards(...args);storageChanged();return result};
const storageRegisterData=registerConnectedData;registerConnectedData=function(...args){const result=storageRegisterData(...args);storageChanged();return result};
for(const name of ['removeConnectedData','commitDashboardMetadata']){const original=name==='removeConnectedData'?removeConnectedData:commitDashboardMetadata;const wrapped=async function(...args){const result=await original(...args);storageChanged();return result};if(name==='removeConnectedData')removeConnectedData=wrapped;else commitDashboardMetadata=wrapped}
const storageShowPage=showPage;showPage=function(page){const result=storageShowPage(page);if(page==='settings'&&!$('#settings').hidden){$('#pageTitle').textContent='설정';$('#subtitle').textContent='저장소를 연결하고 대시보드와 데이터의 저장·복원을 관리하세요.';renderStorageList()}return result};
window.addEventListener('beforeunload',e=>{if(storageState.dirty&&activeStorage()){e.preventDefault();e.returnValue=''}});
window.addEventListener('DOMContentLoaded',()=>initWorkspaceStorage());

storageAPI=(action,payload={})=>PagesStorage.handle(action,payload);
STORAGE_NAMES.browser='브라우저 저장소';

addEventListener("DOMContentLoaded",()=>{document.querySelectorAll("#newStorageProfile,#connectStorage").forEach(n=>n.hidden=true)});
