'use strict';
ST.base=null;ST.external=null;ST.polling=false;ST.features={};
async function bodyHash(content){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
async function createRecoveryBase(workspace){
 return {...workspace,documents:await Promise.all(workspace.documents.map(async d=>{const {content,...metadata}=d;return {...metadata,contentHash:await bodyHash(content)};}))};
}
async function restoreRecoveryBase(metadata,mine,disk){
 const documents=await Promise.all(metadata.documents.map(async b=>{
  const local=mine.documents.find(d=>d.id===b.id),remote=disk.documents.find(d=>d.id===b.id);
  let content={unknownBaseHash:b.contentHash};
  if(local&&await bodyHash(local.content)===b.contentHash)content=local.content;
  else if(remote&&await bodyHash(remote.content)===b.contentHash)content=remote.content;
  return {...b,content};
 }));
 return {...metadata,documents};
}
const conflictBanner=el('div','external-banner');conflictBanner.id='externalBanner';conflictBanner.hidden=true;const bannerText=el('span'),compare=el('button','','변경 비교');compare.onclick=()=>openFileConflicts(ST.external);conflictBanner.append(bannerText,compare);$('.document-heading').after(conflictBanner);
const conflictDialog=el('dialog');conflictDialog.id='fileConflictDialog';
conflictDialog.innerHTML='<div class="dialog-heading"><h2>외부 변경 비교</h2><button id="closeFileConflicts" aria-label="닫기">×</button></div><p class="footnote">겹치지 않는 변경은 자동으로 합칩니다. 같은 항목의 충돌만 선택하세요. 사본 보관은 양쪽 내용을 모두 남깁니다.</p><div id="fileConflictRows"></div><p id="fileConflictError" class="error" role="alert"></p><div class="dialog-footer"><button id="keepBothConflicts">충돌 사본 모두 보관</button><button id="applyFileConflicts" class="primary">선택 내용 반영</button></div>';
document.body.append(conflictDialog);$('#closeFileConflicts').onclick=()=>conflictDialog.close();
let conflictMine=null,conflictChoices={};
function rememberFileBaseline(info){
 if(info?.workspace)ST.base=structuredClone(info.workspace);
 else ST.base=structuredClone(captureWorkspace());
 if(info?.fileBacked)ST.fileBacked=true;
 ST.recoveryBasePromise=createRecoveryBase(ST.base);
}
function showExternal(info){
 ST.external=info;ST.blocked=true;clearTimeout(ST.timer);conflictBanner.hidden=false;bannerText.textContent='저장소 파일이 외부에서 변경되었습니다. 내 작업과 비교해 주세요.';storageStatus('외부 변경 확인 필요 · 내 초안은 보관됩니다.',true);
}
async function applyFileMerge(info,workspace){
 const active=APP.activeId,focused=RICH.editor?.isFocused,selection=RICH.editor?.state.selection.toJSON(),scroll=$('#preview').scrollTop;if(workspace.documents.some(d=>d.id===active))workspace.activeId=active;
 EditorCore.validate(workspace);await restoreWorkspace(workspace);ST.revision=info.revision;rememberFileBaseline(info);ST.ready=true;ST.blocked=false;ST.external=null;conflictBanner.hidden=true;
 if(focused&&RICH.editor){const size=RICH.editor.state.doc.content.size;RICH.editor.commands.setTextSelection({from:Math.max(1,Math.min(selection?.anchor||1,size-1)),to:Math.max(1,Math.min(selection?.head||1,size-1))});RICH.editor.commands.focus(undefined,{scrollIntoView:false});}$('#preview').scrollTop=scroll;
 const different=JSON.stringify(workspace.documents)!==JSON.stringify(info.workspace.documents)||JSON.stringify(workspace.folders)!==JSON.stringify(info.workspace.folders);
 ST.dirty=different;APP.dirty=different;if(different)storageChanged();else storageStatus('외부 파일 변경을 반영했습니다.');await saveDraft();
}
async function reconcileExternal(info,interactive=false){
 if(!info?.workspace)return;
 const mine=captureWorkspace(),base=ST.base||info.workspace,merged=WorkspaceMerge.merge(base,mine,info.workspace);
 if(!merged.conflicts.length){await applyFileMerge(info,merged.workspace);if(interactive)toast('외부 변경과 내 작업을 합쳤습니다. 저장을 다시 눌러 주세요.');return;}
 showExternal(info);if(interactive)openFileConflicts(info);
}
function openFileConflicts(info){
 if(!info)return;conflictMine=captureWorkspace();conflictChoices={};const merged=WorkspaceMerge.merge(ST.base||info.workspace,conflictMine,info.workspace);$('#fileConflictError').textContent='';
 $('#fileConflictRows').replaceChildren(...merged.conflicts.map(c=>{
  const row=el('section','conflict-row');row.append(el('strong','',c.mine?.title||c.disk?.title||c.mine?.name||c.disk?.name||'폴더 구조'));
  if(c.kind==='structure'){row.append(el('p','error','폴더 구조 변경이 겹쳤습니다. 폴더 이동을 조정한 뒤 다시 비교해 주세요.'));return row;}
  const columns=el('div','conflict-columns');for(const [label,value]of [['내 작업',c.mine],['저장소',c.disk]]){const panel=el('div');panel.append(el('b','',label),el('pre','',value?(value.content??value.name):'(삭제됨)'));columns.append(panel);}row.append(columns);
  const select=el('select');select.dataset.conflictKey=c.key;select.append(...[['','선택하세요'],['mine','내 작업 사용'],['disk','저장소 사용'],...(c.kind==='documents'?[['both','양쪽 보관 (내 변경 사본)']]:[])].map(([value,label])=>{const option=el('option','',label);option.value=value;return option;}));select.onchange=()=>conflictChoices[c.key]=select.value;row.append(select);return row;
 }));conflictDialog.showModal();
}
async function resolveFileConflicts(both=false){
 try{
  if(!ST.external||!conflictMine)return;
  if(both)for(const select of $('#fileConflictRows').querySelectorAll('select')){const value=Array.from(select.options).some(o=>o.value==='both')?'both':'disk';select.value=value;conflictChoices[select.dataset.conflictKey]=value;}
  for(const [key,value]of Object.entries(conflictChoices))if(value==='both'&&!conflictChoices[key+':copyId'])conflictChoices[key+':copyId']=crypto.randomUUID();
  const result=WorkspaceMerge.merge(ST.base||ST.external.workspace,conflictMine,ST.external.workspace,conflictChoices);
  if(result.conflicts.length)throw Error('모든 충돌 항목을 선택하거나 폴더 구조를 조정하세요.');
  await applyFileMerge(ST.external,result.workspace);conflictDialog.close();toast('변경을 반영했습니다. 저장 버튼으로 확정하세요.');
 }catch(error){$('#fileConflictError').textContent=error.message;}
}
$('#applyFileConflicts').onclick=()=>resolveFileConflicts();$('#keepBothConflicts').onclick=()=>resolveFileConflicts(true);
async function checkFileChanges(){
 const p=activeStorage();if(!ST.features.fileWorkspace||!p||!ST.ready||ST.busy||APP.loading||ST.polling||document.hidden||ST.external||RICH.editor?.view.composing)return;
 if(!(p.provider==='local'||['google','onedrive'].includes(p.provider)&&p.mode==='folder'))return;
 ST.polling=true;const generation=APP.generation;
 try{const info=await storageAPI('changes',{id:p.id,revision:ST.revision});if(info.changed&&activeStorage()?.id===p.id&&!ST.busy){if(APP.generation!==generation||ST.dirty)await reconcileExternal(info);else await applyFileMerge(info,info.workspace);}}
 catch(error){if(!ST.blocked)storageStatus('외부 파일 확인 대기 · '+error.message,true);}
 finally{ST.polling=false;}
}
setInterval(checkFileChanges,5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkFileChanges();});
