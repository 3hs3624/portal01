/* Explicit cloud save/load for all three applications. No automatic upload. */
(() => {
 const base=new URL('./',document.currentScript.src);
 const app=location.pathname.split('/apps/')[1]?.split('/')[0];if(!['markdown','insight','projects'].includes(app)||!location.pathname.endsWith('/'))return;
 let revision=null,hasRemote=false,connected=false,busy=false,dialog,controls={},generation=0;
 const dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('portal-cloud-recovery',1);r.onupgradeneeded=()=>r.result.createObjectStore('backups');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('불러오기 전 로컬 백업을 만들 수 없습니다.'))});
 async function recovery(action,value){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('backups',action==='get'?'readonly':'readwrite'),s=tx.objectStore('backups');let result;s.get(app).onsuccess=e=>{result=e.target.result||[];if(action==='put'){result=[{at:new Date().toISOString(),workspace:value},...result].slice(0,3);s.put(result,app)}};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('로컬 복구본 저장에 실패했습니다.'))})}
 function parentAPI(){if(parent===window||parent.location.origin!==location.origin||!parent.__portalAuthenticated||!parent.PortalCloudAPI)throw Error('로그인이 만료되었습니다. 포털에서 다시 로그인해 주세요.');return parent.PortalCloudAPI}
 function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n}
 function dirty(){generation++;const button=document.querySelector('#portal-cloud-open');if(button){button.classList.add('cloud-pending');button.title='Supabase 저장소 · 클라우드에 반영하지 않은 변경이 있을 수 있습니다.'}}
 function clean(){const button=document.querySelector('#portal-cloud-open');if(button){button.classList.remove('cloud-pending');button.title='Supabase 저장소'}}
 addEventListener('portal:cloud-working-change',dirty);addEventListener('portal:local-workspace-saved',dirty);
 document.addEventListener('input',e=>{if(dialog&&!dialog.contains(e.target))dirty()});
 function adapter(){
  if(app==='projects'){if(!window.PortalWorkspaceAdapter)throw Error('프로젝트 저장소를 준비 중입니다. 잠시 후 다시 시도하세요.');return window.PortalWorkspaceAdapter}
  return {
   async capture(){if(app==='markdown'&&(typeof APP==='undefined'||APP.loading))throw Error('문서를 불러오는 중입니다.');return captureWorkspace()},
   validate(w){return app==='markdown'?EditorCore.validate(w):validateWorkspaceBundle(w)},
   async restore(w){
    this.validate(w);
    const before=await PagesStorage.handle('load',{id:'browser'});
    const info=await PagesStorage.handle('save',{id:'browser',workspace:w,revision:before.revision});
    if(app==='markdown'){await restoreWorkspace(w);ST.revision=info.revision;ST.ready=true;ST.dirty=false;ST.blocked=false;ST.infos.browser=info;renderStorage();storageStatus('Supabase에서 불러왔습니다. 브라우저 작업공간에도 저장했습니다.')}
    else {await restoreWorkspaceBundle(w);storageState.revision=info.revision;storageState.ready=true;storageState.dirty=false;storageState.infos.browser=info;renderStorageList();storageStatus('Supabase에서 불러왔습니다. 브라우저 작업공간에도 저장했습니다.')}
   }
  };
 }
 function status(text,error=false){controls.status.textContent=text;controls.status.classList.toggle('cloud-error',error)}
 function update(){for(const b of [controls.save,controls.load,controls.refresh,controls.recover,controls.prepare])if(b)b.disabled=busy;controls.save.disabled=busy||!connected;controls.load.disabled=busy||!connected||!hasRemote;if(controls.prepare)controls.prepare.disabled=busy||!connected;controls.close.disabled=busy}
 async function run(fn){if(busy)return;busy=true;update();try{await fn()}catch(e){status(e.message||'작업에 실패했습니다.',true)}finally{busy=false;update()}}
 async function refresh(){connected=false;status('Supabase 작업공간 확인 중…');const info=await parentAPI().info(app);revision=info.revision??null;hasRemote=!!info.hasWorkspace;connected=true;status(hasRemote?'연결됨 · 마지막 저장 '+new Date(info.savedAt).toLocaleString('ko-KR'):'연결됨 · 아직 클라우드에 저장된 작업공간이 없습니다.');update();return info}
 function create(){
  dialog=el('dialog',null,'portal-cloud-dialog');dialog.setAttribute('aria-labelledby','portal-cloud-title');
  const heading=el('div',null,'portal-cloud-heading'),title=el('h2','Supabase 저장소');title.id='portal-cloud-title';controls.close=el('button','×','portal-cloud-close');controls.close.type='button';controls.close.setAttribute('aria-label','클라우드 저장소 닫기');controls.close.onclick=()=>dialog.close();heading.append(title,controls.close);
  const intro=el('p','현재 앱의 작업공간을 계정별로 저장합니다. 다른 기기에서는 직접 불러오세요. 기존 브라우저·폴더 데이터는 자동 업로드하지 않습니다.');
  controls.status=el('p','연결을 확인해 주세요.','portal-cloud-status');controls.status.setAttribute('role','status');controls.status.setAttribute('aria-live','polite');
  const details=el('p','앱별 최대 10MB · 불러오기 전 현재 작업을 이 브라우저에 최대 3개 복구본으로 보관합니다. 대용량 파일과 첨부파일 링크의 실제 파일은 별도 백업하세요.','portal-cloud-note');
  if(app==='projects')details.textContent+=' 프로젝트 대시보드의 변경은 먼저 해당 창에서 저장하세요. 열린 창의 미저장 내용은 포함되지 않으며, 불러오기 전에는 프로젝트 창을 닫아야 합니다.';
  const actions=el('div',null,'portal-cloud-actions');
  for(const [key,label]of [['save','Supabase에 저장'],['load','Supabase에서 불러오기'],['refresh','연결 다시 확인'],['recover','이전 로컬 작업 복구']]){controls[key]=el('button',label);controls[key].type='button';actions.append(controls[key])}
  if(app==='projects'){controls.prepare=el('button','클라우드 작업 사본 사용');controls.prepare.type='button';actions.append(controls.prepare);controls.prepare.onclick=()=>run(async()=>{await adapter().prepare();status('클라우드 작업 사본을 열었습니다. 프로젝트를 작성한 뒤 Supabase에 저장해 주세요.');dirty()})}
  controls.refresh.onclick=()=>run(refresh);
  controls.save.onclick=()=>run(async()=>{
   const a=adapter(),workspace=await a.capture();a.validate(workspace);
   if(hasRemote&&!confirm('Supabase의 이 앱 작업공간을 현재 내용으로 교체할까요? 다른 기기에서 작업했다면 먼저 불러와 비교하세요.'))return;
   const capturedGeneration=generation;status('Supabase에 저장 중…');
   const info=await parentAPI().save(app,workspace,revision);revision=info.revision;hasRemote=true;
   if(generation===capturedGeneration)clean();status('Supabase 저장 완료 · '+new Date(info.savedAt).toLocaleString('ko-KR')+' · '+(new Blob([JSON.stringify(workspace)]).size/1024/1024).toFixed(2)+'MB');
  });
  controls.load.onclick=()=>run(async()=>{
   if(!confirm('Supabase에 저장된 내용으로 현재 앱 작업공간을 교체할까요? 현재 작업은 이 브라우저의 복구본에 보관합니다.'))return;
   status('클라우드 작업공간 불러오는 중…');const info=await parentAPI().load(app);if(!info.hasWorkspace)throw Error('클라우드 작업공간이 없습니다.');const a=adapter();a.validate(info.workspace);
   const before=await a.capture().catch(e=>{if(app==='projects'&&a.isEmpty())return null;throw e});if(before)await recovery('put',before);
   await a.restore(info.workspace);revision=info.revision;hasRemote=true;connected=true;clean();status('Supabase에서 불러오기 완료 · 브라우저에 작업 사본을 보관했습니다.');
  });
  controls.recover.onclick=()=>run(async()=>{const saved=(await recovery('get'))[0];if(!saved)throw Error('이 브라우저에 복구본이 없습니다.');if(!confirm(new Date(saved.at).toLocaleString('ko-KR')+' 시점의 로컬 작업으로 되돌릴까요? Supabase 데이터는 변경하지 않습니다.'))return;const a=adapter();a.validate(saved.workspace);await a.restore(saved.workspace);dirty();status('로컬 작업을 복구했습니다. 클라우드에 반영하려면 Supabase에 저장을 누르세요.')});
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});dialog.addEventListener('close',()=>document.querySelector('#portal-cloud-open')?.focus());const setup=el('a','관리자 초기 설정 안내 · SQL 보기','portal-cloud-setup');setup.href=new URL('cloud-setup.html',base).href;setup.target='_blank';setup.rel='noopener';dialog.append(heading,intro,controls.status,details,actions,setup);document.body.append(dialog);update();
 }
 window.PortalCloudUI={async open(){if(!dialog)create();dialog.showModal();await run(refresh)}};
})();
