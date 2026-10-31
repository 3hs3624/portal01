'use strict';
const ST={settings:null,infos:{},revision:null,ready:false,busy:false,dirty:false,timer:0,token:'',defaultPath:'',blocked:false};
const PROVIDERS={local:'로컬 폴더',google:'Google Drive',onedrive:'MS OneDrive',sqlite:'SQLite DB',odbc:'외부 DB (ODBC)'};
function activeStorage(){return ST.settings?.profiles.find(p=>p.id===ST.settings.activeId)}
async function storageAPI(action,payload={}){
 for(let attempt=0;attempt<2;attempt++){
  if(!ST.token){const s=await fetch('/api/session',{cache:'no-store'});if(!s.ok)throw Error('MD Editor 서버에 연결할 수 없습니다.');const session=await s.json();if(session.app!=='md-editor')throw Error('다른 프로그램이 같은 포트를 사용 중입니다.');ST.token=session.token;}
  const r=await fetch('/api/storage/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-MD-Token':ST.token},body:JSON.stringify(payload)});
  if(r.status===403&&attempt===0){ST.token='';continue}
  const data=await r.json();if(!r.ok){const error=Error(data.error||'저장소 요청 실패');error.external=data.external;throw error;}return data;
 }
}
function storageStatus(message,error=false){for(const id of ['storageStatus','storageMessage']){$('#'+id).textContent=message;$('#'+id).classList.toggle('error',error)}}
function storageChanged(){
 if(APP.loading)return;
 ST.dirty=true;clearTimeout(ST.timer);
 if(!activeStorage()){storageStatus('브라우저 임시 보관 · 저장소 미연결');return}
 storageStatus(ST.blocked?'저장 오류 또는 외부 변경 확인이 필요합니다.':!ST.ready?'처음 저장 또는 불러오기가 필요합니다.':ST.settings.autoSave?'자동 저장 대기 중…':'자동 저장 꺼짐 · 변경을 반영하려면 저장을 눌러 주세요.');
 if(ST.ready&&ST.settings.autoSave&&!ST.blocked)ST.timer=setTimeout(()=>saveRemote(false).catch(()=>{}),1600);
}
async function saveWorkspace(){
 if(APP.loading)return;
 await saveDraft();
 if(activeStorage())await saveRemote(true);
 else toast('브라우저에 임시 보관했습니다. 영구 보관은 저장소 연결 또는 .md 내보내기를 사용하세요.');
}
async function saveRemote(manual=true){
 clearTimeout(ST.timer);
 if(ST.busy){if(manual)throw Error('저장소 작업이 진행 중입니다. 완료 후 다시 저장해 주세요.');return}
 if(APP.externalDraft)throw Error('다른 탭의 변경을 확인하고 새로고침한 뒤 저장해 주세요.');
 const p=activeStorage();if(!p)throw Error('저장소를 먼저 연결해 주세요.');if(p.needsCredential)throw Error('연결 수정에서 인증 정보를 다시 입력해 주세요.');
 if(!manual&&(!ST.ready||!ST.dirty||ST.blocked))return;
 if(!ST.ready&&ST.infos[p.id]?.hasWorkspace&&!confirm('이 저장소에 기존 문서가 있습니다. 현재 작업공간으로 교체할까요? 폴더 저장소에서는 빠지는 .md 파일이 버전 보관 후 삭제됩니다. 기존 문서를 사용하려면 취소 후 불러오기를 선택하세요.'))return;
 const w=EditorCore.validate(captureWorkspace()),generation=APP.generation;
 ST.busy=true;renderStorage();storageStatus('저장 중…');
 try{
  const r=await storageAPI('save',{id:p.id,workspace:w,revision:ST.revision});
  ST.revision=r.revision;ST.infos[p.id]=r;ST.ready=true;ST.blocked=false;ST.dirty=APP.generation!==generation;APP.dirty=ST.dirty;
  rememberFileBaseline({...r,workspace:w});saveDraft().catch(()=>{});
  storageStatus('저장 완료 · '+p.name+' · '+new Date(r.savedAt).toLocaleTimeString('ko-KR')+(r.markdownFiles?' · .md '+r.markdownFiles.documents+'개':''));
  if(manual){if($('#storageDialog').open)$('#storageDialog').close();toast('모든 문서를 저장했습니다.');}
 }catch(e){ST.dirty=true;ST.blocked=true;if(e.external){showExternal(e.external);openFileConflicts(e.external);}storageStatus('저장 실패 · '+e.message,true);throw e}
 finally{ST.busy=false;renderStorage();if(ST.dirty&&!ST.blocked&&ST.ready&&ST.settings.autoSave)ST.timer=setTimeout(()=>saveRemote(false).catch(()=>{}),1600);}
}
async function loadRemote(startup=false){
 if(ST.busy)throw Error('저장소 작업이 진행 중입니다.');
 const p=activeStorage();if(!p)throw Error('저장소를 먼저 선택해 주세요.');
 if(!startup&&!confirm('저장소의 문서 전체로 현재 작업공간을 교체할까요? 미저장 내용은 먼저 내보내 주세요.'))return;
 clearTimeout(ST.timer);ST.busy=true;renderStorage();const generation=APP.generation;
 // Freeze editing for this short destructive replacement, keeping draft recovery intact on failure.
 $('#editor').disabled=$('#docTitle').disabled=true;syncPreviewEditable();
 try{
  const r=await storageAPI('load',{id:p.id,includeBaseline:Boolean(startup&&APP.recovery?.pending)});ST.infos[p.id]=r;
  if(!r.hasWorkspace){ST.revision=null;ST.ready=false;storageStatus('연결됨 · 저장된 문서가 없습니다. 지금 저장을 눌러 시작하세요.');return}
  if(APP.generation!==generation)throw Error('불러오는 동안 작업공간이 변경되었습니다. 다시 불러와 주세요.');
  if(startup&&APP.recovery?.profileId===p.id&&APP.recovery.pending&&(JSON.stringify(APP.documents)!==JSON.stringify(r.workspace.documents)||JSON.stringify(APP.folders)!==JSON.stringify(r.workspace.folders||[])||APP.theme!==(r.workspace.theme||'light'))){
   ST.base=APP.recovery.base?await restoreRecoveryBase(APP.recovery.base,captureWorkspace(),r.workspace):(r.baselineWorkspace||r.workspace);
   ST.recoveryBasePromise=APP.recovery.base?Promise.resolve(APP.recovery.base):createRecoveryBase(ST.base);
   ST.revision=r.revision;ST.ready=true;ST.dirty=true;ST.blocked=false;APP.dirty=true;
   await reconcileExternal(r,true);return;
  }
  EditorCore.validate(r.workspace);await restoreWorkspace(r.workspace);rememberFileBaseline(r);ST.revision=r.revision;ST.ready=true;ST.dirty=false;ST.blocked=false;APP.dirty=false;
  saveDraft().catch(()=>{});
  storageStatus('불러오기 완료 · '+p.name+' · 문서 '+r.workspace.documents.length+'개');
 }catch(e){ST.ready=false;storageStatus('불러오기 실패 · '+e.message,true);throw e}
 finally{ST.busy=false;$('#editor').disabled=$('#docTitle').disabled=APP.loading;renderStorage();}
}
function renderStorage(){
 syncPreviewEditable();
 if(typeof renderDocumentTree==='function')renderDocumentTree();
 const s=ST.settings,p=activeStorage();if(!s)return;
 $('#storageAutoSave').checked=s.autoSave;$('#storageAutoRestore').checked=s.autoRestore;
 $('#storageAutoSave').disabled=$('#storageAutoRestore').disabled=ST.busy;
 $('#activeStorageLabel').textContent=p?p.name:'브라우저 작업공간';$('#storageActiveName').textContent=p?p.name:'선택한 저장소 없음';
 $('#storageBrief').textContent=p?PROVIDERS[p.provider]+' · '+(p.needsCredential?'인증 재입력 필요':ST.ready?'문서 저장·복원 사용 중':'불러오기 또는 첫 저장 필요'):'저장소를 연결하면 다른 실행에서도 복원할 수 있어요.';
 $('#storageDot').classList.toggle('connected',Boolean(p&&!p.needsCredential));
 $('#storageSaveNow').disabled=$('#storageLoadNow').disabled=!p||ST.busy;
 $('#saveWorkspace').disabled=ST.busy||APP.loading;$('#newStorageProfile').disabled=ST.busy;
 for(const id of ['newDoc','duplicateDoc','deleteDoc','importDoc','importWorkspace'])$('#'+id).disabled=ST.busy||APP.loading;
 $('#storageRows').replaceChildren(...s.profiles.map(profile=>{
  const row=el('div','storage-row'),radio=el('input');radio.type='radio';radio.name='storage';radio.checked=profile.id===s.activeId;radio.disabled=ST.busy;radio.setAttribute('aria-label',profile.name+' 기본 저장소로 선택');
  radio.onchange=safeAction(async()=>{if(ST.dirty&&ST.ready&&!confirm('현재 변경은 브라우저 임시 보관본에 남습니다. 다른 저장소로 전환할까요?')){renderStorage();return}clearTimeout(ST.timer);ST.busy=true;renderStorage();try{const r=await storageAPI('preferences',{activeId:profile.id});ST.settings=r.settings;ST.ready=false;ST.revision=null;ST.blocked=false;const info=await storageAPI('load',{id:profile.id});ST.infos[profile.id]=info;ST.revision=info.revision;storageStatus('저장소 선택 · 불러오기 또는 지금 저장을 선택하세요.')}finally{ST.busy=false;renderStorage()}});
  const info=el('div');info.append(el('strong','',profile.name),el('small','',PROVIDERS[profile.provider]+' · '+(profile.path||profile.remotePath||profile.folderId||profile.workspaceKey)),el('small','',profile.needsCredential?'인증 재입력 필요':ST.infos[profile.id]?.savedAt||profile.lastSavedAt?'최근 저장 '+new Date(ST.infos[profile.id]?.savedAt||profile.lastSavedAt).toLocaleString('ko-KR'):'아직 저장 안 함'));
  const edit=el('button','','수정'),remove=el('button','','해제');edit.disabled=remove.disabled=ST.busy;edit.onclick=()=>openProfile(profile);remove.onclick=safeAction(async()=>{if(!confirm('저장소 연결을 해제할까요? 실제 파일과 DB 내용은 유지됩니다.'))return;clearTimeout(ST.timer);ST.busy=true;renderStorage();try{const r=await storageAPI('disconnect',{id:profile.id});ST.settings=r.settings;if(!activeStorage()){ST.ready=false;ST.revision=null}storageStatus('연결 해제 완료 · 실제 파일은 유지됩니다.')}finally{ST.busy=false;renderStorage()}});
  row.append(radio,info,edit,remove);return row;
 }));
 if(!s.profiles.length)$('#storageRows').append(el('p','footnote','연결된 저장소가 없습니다. ＋ 새 연결에서 등록하세요.'));
}
function profileFields(){
 const provider=$('#provider').value,api=['google','onedrive'].includes(provider)&&$('#mode').value==='api';
 $('#modeLabel').hidden=!['google','onedrive'].includes(provider);$('#pathLabel').hidden=!(['local','sqlite'].includes(provider)||['google','onedrive'].includes(provider)&&!api);$('#folderLabel').hidden=provider!=='google'||!api;$('#remoteLabel').hidden=provider!=='onedrive'||!api;$('#dialectLabel').hidden=$('#keyLabel').hidden=provider!=='odbc';$('#credentialLabel').hidden=!(api||provider==='odbc');
 $('#providerHelp').textContent=provider==='odbc'?'Windows 64비트 ODBC 드라이버와 생성·조회·쓰기 권한이 필요합니다. md_editor_workspaces 전용 테이블을 사용합니다.':provider==='sqlite'?'SQLite 파일의 절대 경로를 입력하세요. 상위 폴더가 있어야 합니다. BI와 별도 테이블을 사용합니다.':api?'쓰기 권한이 있는 OAuth 액세스 토큰을 직접 입력합니다. 자동 로그인·토큰 갱신은 지원하지 않으며 서버 재시작 시 다시 입력해야 합니다.':'연결 폴더에 문서별 .md 파일과 실제 하위 폴더를 저장하고 작업공간 JSON도 함께 보관합니다. 수정·이동·삭제 전 버전은 .md-editor-history에 남깁니다. 동기화 완료는 OneDrive/Drive 앱에서 확인하세요.';
}
function openProfile(p=null){
 if(ST.busy||!ST.settings)return;
 $('#profileTitle').textContent=p?'저장소 연결 수정':'새 저장소 연결';
 const fields={profileId:p?.id||'',profileName:p?.name||'',provider:p?.provider||'local',mode:p?.mode||'folder',path:p?.path||ST.defaultPath,folderId:p?.folderId||'root',remotePath:p?.remotePath||'md-editor-workspace.json',dialect:p?.dialect||'sqlserver',workspaceKey:p?.workspaceKey||'default',credential:''};
 for(const [id,value]of Object.entries(fields))$('#'+id).value=value;
 $('#profileError').textContent='';profileFields();$('#profileDialog').showModal();$('#profileName').focus();
}
async function initStorage(){
 try{const r=await storageAPI('status');ST.settings=r.settings;ST.features=r.features||{};ST.defaultPath=r.defaultPath;renderStorage();const p=activeStorage();if(p&&r.settings.autoRestore&&!p.needsCredential)await loadRemote(true);else storageStatus(p?'저장소 연결됨 · 불러오기 또는 지금 저장을 선택하세요.':'브라우저 임시 보관 · 저장소 미연결');}
 catch(e){storageStatus('저장소 연결 실패 · '+e.message,true);throw e}
 finally{renderStorage()}
}
$('#openStorage').onclick=$('#storageShortcut').onclick=()=>$('#storageDialog').showModal();
$('#newStorageProfile').onclick=()=>openProfile();$('#provider').onchange=$('#mode').onchange=profileFields;
$('#profileDialog').addEventListener('close',()=>$('#credential').value='');
$('#profileDialog').addEventListener('cancel',e=>{if(ST.busy)e.preventDefault()});
$('#storageForm').onsubmit=async e=>{
 e.preventDefault();if(ST.busy)return;clearTimeout(ST.timer);ST.busy=true;
 $('#storageForm').querySelectorAll('input,select,button').forEach(n=>n.disabled=true);$('#profileDialog > .dialog-heading button').disabled=true;renderStorage();$('#profileError').textContent='';
 try{
  const profile={id:$('#profileId').value,name:$('#profileName').value,provider:$('#provider').value,mode:$('#mode').value,path:$('#path').value,folderId:$('#folderId').value,remotePath:$('#remotePath').value,dialect:$('#dialect').value,workspaceKey:$('#workspaceKey').value};
  const r=await storageAPI('connect',{profile,credential:$('#credential').value});ST.settings=r.settings;ST.infos[r.settings.activeId]=r.info;ST.revision=r.info.revision;ST.ready=false;ST.blocked=false;$('#credential').value='';$('#profileDialog').close();storageStatus('저장소 연결 완료 · 불러오기 또는 지금 저장을 선택하세요.');
 }catch(e){$('#profileError').textContent=e.message}
 finally{ST.busy=false;$('#storageForm').querySelectorAll('input,select,button').forEach(n=>n.disabled=false);$('#profileDialog > .dialog-heading button').disabled=false;renderStorage()}
};
$('#storageSaveNow').onclick=safeAction(()=>saveRemote(true));$('#storageLoadNow').onclick=safeAction(()=>loadRemote(false));
for(const id of ['storageAutoSave','storageAutoRestore'])$('#'+id).onchange=safeAction(async()=>{if(ST.busy)return;ST.busy=true;const prefs={autoSave:$('#storageAutoSave').checked,autoRestore:$('#storageAutoRestore').checked};renderStorage();try{const r=await storageAPI('preferences',prefs);ST.settings=r.settings;}finally{ST.busy=false;renderStorage();if(ST.dirty&&ST.settings.autoSave)storageChanged()}});

storageAPI=(action,payload={})=>PagesStorage.handle(action,payload);
PROVIDERS.browser='브라우저 저장소';

addEventListener("DOMContentLoaded",()=>{document.querySelectorAll("#newStorageProfile,#connectStorage").forEach(n=>n.hidden=true)});
