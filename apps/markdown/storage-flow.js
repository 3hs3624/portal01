/* Write Studio adapter for the common storage review, backup and recovery UI. */
'use strict';
window.PortalWriteStorageUI=(()=>{
 function busyEditor(){return APP.loading||APP.externalDraft||ST.busy;}
 async function capture(){if(busyEditor())throw Error('문서를 불러오는 중이거나 다른 탭의 변경이 있습니다. 작업 상태를 확인해 주세요.');return EditorCore.validate(captureWorkspace());}
 async function restore(workspace,expectedGeneration){EditorCore.validate(workspace);clearTimeout(ST.timer);await saveDraft();for(let n=0;ST.saving&&n<250;n++)await new Promise(r=>setTimeout(r,20));if(expectedGeneration!==undefined&&APP.generation!==expectedGeneration)throw Error('현재 작업이 바뀌어 불러오기를 중단했습니다. 다시 비교해 주세요.');if(ST.saving||busyEditor())throw Error('자동저장 작업이 끝난 뒤 다시 시도해 주세요.');ST.busy=true;renderStorage();try{const before=await PagesStorage.handle('load',{id:'browser'});if(before.hasWorkspace&&(before.revision??null)!==(ST.revision??null))throw Error('다른 탭에서 브라우저 저장본을 변경했습니다. 새로고침 후 다시 비교해 주세요.');const saved=await PagesStorage.handle('save',{id:'browser',workspace,revision:before.revision});await restoreWorkspace(workspace);ST.revision=saved.revision;ST.ready=true;ST.dirty=false;ST.blocked=false;ST.external=null;if(typeof conflictBanner!=='undefined')conflictBanner.hidden=true;APP.dirty=false;ST.infos.browser=saved;rememberFileBaseline({...saved,workspace});await saveDraft();storageStatus('저장 완료 · 브라우저 작업공간에 반영했습니다.');}finally{ST.busy=false;renderStorage();}}

 return PortalStorageFlow.create({app:'markdown',title:'Write Studio',unit:'문서',folderName:'Write-Studio',intro:'문서는 이 브라우저에 자동저장됩니다. 다른 위치에 보관하려면 아래 저장소를 선택하고 내용을 확인한 뒤 저장하세요.',busy:busyEditor,capture,restore,validate:w=>EditorCore.validate(w),generation:()=>APP.generation,compare:StudioStorageCompare,titles:w=>w.documents.map(d=>d.title)});
})();
