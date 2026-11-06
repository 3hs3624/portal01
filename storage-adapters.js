/* Insight BI and Project Management keep their native formats behind a shared storage UI. */
(() => {
 'use strict';
 const app=location.pathname.split('/apps/')[1]?.split('/')[0];
 if(!['projects','insight'].includes(app))return;
 let generation=0;
 addEventListener('portal:cloud-working-change',()=>generation++);
 addEventListener('portal:local-workspace-saved',()=>generation++);
 document.addEventListener('input',e=>{if(!e.target.closest('.studio-storage-dialog'))generation++});
 const fingerprint=PortalStorageModels.fingerprint;
 const base={app,generation:()=>app==='insight'?storageState.generation:generation,fingerprint};
 let A;
 if(app==='projects')A={...base,title:'Project Management',unit:'프로젝트',folderName:'Project-Management',currentLabel:'현재 작업 · 열린 대시보드 변경 포함',intro:'현재 프로젝트와 열린 대시보드의 변경을 함께 보관합니다. 저장소 선택만으로 기존 데이터를 바꾸지 않습니다.',note:'Supabase는 프로젝트·WBS 관계형 테이블과 비공개 첨부파일 저장소를 사용합니다. 로컬 폴더는 기존 JSON·엑셀 형식을 유지합니다. 저장소 반영 시 열린 대시보드를 함께 저장합니다. 전체 불러오기·합치기는 프로젝트 창을 닫고 실행하세요.',busy:()=>false,capture:()=>PortalWorkspaceAdapter.capture(),validate:w=>PortalWorkspaceAdapter.validate(w),prepare:()=>PortalWorkspaceAdapter.prepare(),needsPrepare:()=>PortalWorkspaceAdapter.isEmpty(),beforeWrite:()=>PortalWorkspaceAdapter.beforeWrite(),beforeApply:mode=>PortalWorkspaceAdapter.beforeApply(mode),compare:PortalStorageModels.projects,titles:w=>PortalStorageModels.projects.items(w).map(x=>x.title),
  async restore(w,expected){if(expected!==undefined&&expected!==base.generation())throw Error('현재 프로젝트가 바뀌었습니다. 다시 비교해 주세요.');await PortalWorkspaceAdapter.restore(w)}
 };
 else{
  let draftCache;
  A={...base,title:'Insight BI',unit:'데이터 묶음',folderName:'Insight-BI',intro:'대시보드와 연결 데이터는 브라우저에 자동저장됩니다. 다른 위치에 보관하려면 저장소를 선택하고 내용을 확인하세요.',note:'연결 관계를 유지하도록 대시보드와 데이터를 한 묶음으로 비교합니다. 둘 다 보관하면 저장본의 데이터와 대시보드를 새 ID로 복사합니다.',busy:()=>!storageState.settings||storageState.restoring||(storageState.busy&&!storageState.promise),settle:async()=>{if(storageState.promise)await storageState.promise},
   capture(){const w=captureWorkspace();if(typeof dashboardHasEdits==='function'&&dashboardHasEdits()){
     const signature=JSON.stringify([dashboardState.id,editSessionSnapshot()]);
     if(!draftCache||draftCache.signature!==signature){const record=createDashboardRecord(dashboardState.id||crypto.randomUUID(),dashboardState.name,dashboardState.description);draftCache={signature,record}}
     w.dashboards=w.dashboards.filter(d=>d.id!==draftCache.record.id).concat(structuredClone(draftCache.record));
    }return w},
   validate:w=>validateWorkspaceBundle(w),compare:PortalStorageModels.insight,titles:w=>[...w.dashboards.map(d=>d.name),...w.sources.map(s=>s.name),...w.detached.map(s=>s.name)],
   async restore(w,expected){
    if(typeof dataDetailWindows!=='undefined'&&[...dataDetailWindows.keys()].some(win=>!win.closed))throw Error('데이터 상세 창의 변경을 저장하고 창을 닫은 뒤 불러오세요.');
    clearTimeout(storageState.timer);if(storageState.promise)await storageState.promise;
    if(expected!==undefined&&expected!==base.generation())throw Error('현재 작업이 바뀌었습니다. 다시 비교해 주세요.');
    const previous=await PagesStorage.handle('load',{id:'browser'});
    if((previous.revision??null)!==(storageState.revision??null))throw Error('다른 탭에서 브라우저 저장본을 변경했습니다. 다시 불러온 뒤 비교해 주세요.');
    storageState.busy=true;
    try{const saved=await PagesStorage.handle('save',{id:'browser',workspace:w,revision:previous.revision});await restoreWorkspaceBundle(w);storageState.revision=saved.revision;storageState.ready=true;storageState.dirty=false;storageState.infos.browser=saved;storageStatus('브라우저 저장 완료 · 외부 저장소 반영 상태는 저장소 화면에서 확인하세요.')}finally{storageState.busy=false;renderStorageList()}
   }
  };
 }
 window.PortalAppStorageUI=PortalStorageFlow.create(A);
})();
