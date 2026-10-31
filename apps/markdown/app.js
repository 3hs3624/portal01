'use strict';
const $=s=>document.querySelector(s);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const APP={documents:[],folders:[],selectedFolderId:'',activeId:'',theme:'light',view:'split',generation:0,dirty:false,db:null,draftTimer:0,previewTimer:0,toastTimer:0,loading:true,localGeneration:-1,draftPromise:Promise.resolve(),externalDraft:false};
const DRAFT_KEY='md-editor-draft-v1';
const STARTER=`# 생각을 문서로, 문서를 연결로

좋은 글은 작은 메모에서 시작됩니다. **MD Editor**에서 생각을 정리하고, 나만의 저장소에 안전하게 이어서 보관하세요.

> 이 문서에서 바로 작성하고, / 메뉴로 블록을 추가하세요. Markdown·분할 보기로 원본도 확인할 수 있습니다.
> 저장소를 연결하면 다음 실행에서도 이어 쓸 수 있습니다.

## 오늘의 아이디어

- 복잡한 생각을 간결한 문장으로 정리하기
- **굵게**, *기울임*, ~~취소선~~으로 강조하기
- [Markdown 문법](https://www.markdownguide.org/basic-syntax/) 살펴보기

## 작성 체크리스트

- [x] 새로운 작업공간 열기
- [ ] 첫 번째 문서 작성하기
- [ ] 저장소 연결하고 문서 보관하기

## 한눈에 보는 계획

| 단계 | 할 일 | 상태 |
| :--- | :--- | :--- |
| 01 | 아이디어 수집 | 진행 중 |
| 02 | 초안 작성 | 예정 |
| 03 | 검토와 공유 | 예정 |

## 코드도 깔끔하게

\x60\x60\x60javascript
const idea = "작은 생각의 시작";
console.log(idea);
\x60\x60\x60

---

지금, 첫 문장을 적어보세요.
`;
function newRecord(title='제목 없는 문서',content=''){
 const now=new Date().toISOString();return {id:crypto.randomUUID(),title,content,folderId:APP.selectedFolderId||'',createdAt:now,updatedAt:now};
}
function currentDoc(){return APP.documents.find(d=>d.id===APP.activeId)}
function captureWorkspace(){return {format:'md-editor-workspace',version:1,documents:structuredClone(APP.documents),folders:structuredClone(APP.folders),activeId:APP.activeId,theme:APP.theme};}
function toast(message,error=false){clearTimeout(APP.toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;$('#toast').classList.toggle('error',error);APP.toastTimer=setTimeout(()=>$('#toast').hidden=true,5000);}
function onError(e){toast(e.message||String(e),true);}
function safeAction(fn){return async()=>{try{await fn()}catch(e){onError(e)}};}
async function openDraftDB(){
 return new Promise((resolve,reject)=>{const req=indexedDB.open('md-editor',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
}
async function readDraft(){
 return new Promise((resolve,reject)=>{const tx=APP.db.transaction('drafts'),r=tx.objectStore('drafts').get(DRAFT_KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
function saveDraft(){
 clearTimeout(APP.draftTimer);
 const generation=APP.generation,w=captureWorkspace();
 if(typeof ST!=='undefined')w.recovery={profileId:ST.settings?.activeId||'',revision:ST.revision,pending:ST.dirty};
 const recoveryBasePromise=typeof ST!=='undefined'?ST.recoveryBasePromise:null;
 APP.draftPromise=APP.draftPromise.catch(()=>{}).then(async()=>{
  if(recoveryBasePromise&&w.recovery)w.recovery.base=await recoveryBasePromise;
  if(APP.externalDraft)throw Error('다른 탭에서 문서를 변경했습니다. 현재 내용을 내보낸 뒤 새로고침해 주세요.');
  if(APP.db)await new Promise((resolve,reject)=>{const tx=APP.db.transaction('drafts','readwrite');tx.objectStore('drafts').put(w,DRAFT_KEY);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error('브라우저 임시 보관 실패 · 파일로 내보내 주세요.'));});
  else{try{localStorage.setItem(DRAFT_KEY,JSON.stringify(w));}catch(e){throw Error('브라우저 저장 공간이 부족합니다. 파일로 내보내 주세요.');}}
  APP.localGeneration=generation;
  $('#localStatus').textContent=APP.generation===generation?'✓ 브라우저에 임시 보관됨':'임시 보관 중…';
  if(APP.channel)APP.channel.postMessage({type:'saved'});
 }).catch(e=>{$('#localStatus').textContent='임시 보관 실패';onError(e);throw e});
 return APP.draftPromise;
}
function changed(updateDocument=true){
 if(APP.loading)return;
 APP.generation++;APP.dirty=true;
 if(updateDocument)currentDoc().updatedAt=new Date().toISOString();
 $('#localStatus').textContent='임시 보관 중…';
 clearTimeout(APP.draftTimer);APP.draftTimer=setTimeout(()=>saveDraft().catch(()=>{}),400);
 renderDocList();renderMetadata();
 if(typeof recordEditHistory==='function')recordEditHistory();
 if(typeof storageChanged==='function')storageChanged();
}
function renderDocList(){
 if(typeof renderDocumentTree==='function')return renderDocumentTree();
 const query=$('#docSearch').value.trim().toLocaleLowerCase();
 const list=APP.documents.filter(d=>(d.title+'\n'+d.content).toLocaleLowerCase().includes(query)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 $('#docCount').textContent=APP.documents.length;
 $('#docList').replaceChildren(...list.map(d=>{const b=el('button','doc-item'+(d.id===APP.activeId?' active':''));b.type='button';b.setAttribute('aria-current',d.id===APP.activeId?'page':'false');const info=el('span','doc-info');info.append(el('strong','',d.title),el('small','',new Date(d.updatedAt).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})+' · '+d.content.length.toLocaleString()+'자'));b.append(el('span','doc-icon','▤'),info);b.onclick=()=>selectDocument(d.id);return b}));
 if(!list.length)$('#docList').append(el('div','empty-list','검색 결과가 없습니다.'));
}
function renderMetadata(){const d=currentDoc();$('#breadcrumbTitle').textContent=d.title;$('#updatedAt').textContent=new Date(d.updatedAt).toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})+' 수정';}
function selectDocument(id){
 clearTimeout(APP.previewTimer);APP.previewTimer=0;
 if(typeof selectTreeDocument==='function')selectTreeDocument(id);
 APP.activeId=id;const d=currentDoc();$('#docTitle').value=d.title;$('#editor').value=d.content;$('#editor').scrollTop=0;$('#preview').scrollTop=0;renderMetadata();renderDocList();renderEditor();
 if(typeof syncEditHistory==='function')syncEditHistory();
 if(!APP.loading){APP.generation++;clearTimeout(APP.draftTimer);APP.draftTimer=setTimeout(()=>saveDraft().catch(()=>{}),400);}
}
function renderEditor(renderPreview=true){
 const editor=$('#editor'),text=editor.value;
 $('#lineNumbers').textContent=Array.from({length:text.split('\n').length},(_,i)=>i+1).join('\n');
 $('#lineNumbers').scrollTop=editor.scrollTop;
 if(renderPreview)renderRichDocument(text);
 if(typeof syncPreviewEditable==='function')syncPreviewEditable();
 const headings=Array.from($('#preview').querySelectorAll('h1,h2,h3,h4,h5,h6'));
 const slugs=new Set();if(!richEngineActive())headings.forEach((h,i)=>{const base=h.textContent.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').trim().replace(/\s+/g,'-')||'heading-'+i;let slug=base,n=1;while(slugs.has(slug))slug=base+'-'+n++;slugs.add(slug);h.id=slug;});
 $('#outline').replaceChildren(...headings.map((h,i)=>{const b=el('button','',h.textContent);b.style.paddingLeft=(8+(Number(h.tagName[1])-1)*10)+'px';b.onclick=()=>{$('#writingArea').dataset.view==='edit'&&setView('split');h.scrollIntoView({behavior:'smooth',block:'start'})};return b}));
 if(!headings.length)$('#outline').append(el('p','empty','제목을 추가하면 목차가 표시됩니다.'));
 if(!richEngineActive())for(const a of $('#preview').querySelectorAll('a')){const href=a.getAttribute('href')||'';if(!/^(https?:|mailto:|#)/i.test(href)){a.removeAttribute('href');continue}if(!href.startsWith('#')){a.target='_blank';a.rel='noopener noreferrer';}else a.onclick=e=>{e.preventDefault();const target=document.getElementById(href.slice(1));if(target&&$('#preview').contains(target))target.scrollIntoView({behavior:'smooth'})}}
 if(!richEngineActive())for(const img of $('#preview').querySelectorAll('img')){const src=img.getAttribute('src')||'';if(!/^(https?:\/\/|data:image\/(png|jpeg|gif|webp);base64,)/i.test(src))img.removeAttribute('src');img.loading='lazy';img.referrerPolicy='no-referrer';}
 $('#wordCount').textContent=text.length.toLocaleString()+'자 · '+(text.trim()?text.trim().split(/\s+/u).length:0).toLocaleString()+'단어';
 $('#readingTime').textContent='읽기 약 '+Math.max(1,Math.ceil(text.length/700))+'분';
 updateCursor();updateFindCount();if(typeof renderKnowledge==='function')renderKnowledge();if(typeof queueTableTools==='function')queueTableTools();
}
function updateCursor(){const e=$('#editor'),before=e.value.slice(0,e.selectionStart),lines=before.split('\n');$('#cursorPosition').textContent=`줄 ${lines.length}, 열 ${lines.at(-1).length+1}`;}
function onEditorInput(){
 const text=$('#editor').value;if(new TextEncoder().encode(text).length>EditorCore.MAX_DOC){$('#editor').value=currentDoc().content;toast('문서는 UTF-8 기준 5MB까지 편집할 수 있습니다.',true);return}
 currentDoc().content=text;changed();clearTimeout(APP.previewTimer);APP.previewTimer=setTimeout(()=>{APP.previewTimer=0;renderEditor()},120);
}
function applyEdit(result){
 if(typeof historyBoundary==='function')historyBoundary();
 const e=$('#editor'),old=e.value;if(result.text===old)return;
 let a=0,b=0;while(a<old.length&&a<result.text.length&&old[a]===result.text[a])a++;while(b<old.length-a&&b<result.text.length-a&&old[old.length-1-b]===result.text[result.text.length-1-b])b++;
 e.focus();e.setSelectionRange(a,old.length-b);
 // insertText preserves the browser's undo history for textarea edits.
 const ok=document.execCommand('insertText',false,result.text.slice(a,result.text.length-b));
 if(!ok){e.setRangeText(result.text.slice(a,result.text.length-b),a,old.length-b,'end');onEditorInput();}
 e.setSelectionRange(result.start,result.end);renderEditor();if(typeof historyBoundary==='function')historyBoundary();
}
function command(name){const e=$('#editor');if(APP.loading||e.disabled)return;if(typeof previewCommand==='function'&&previewCommand(name))return;applyEdit(EditorCore.edit(e.value,e.selectionStart,e.selectionEnd,name));}
function setView(view){APP.view=view;$('#writingArea').dataset.view=view;document.querySelectorAll('[data-view]').forEach(b=>{if(b.tagName==='BUTTON'){b.classList.toggle('selected',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view))}});localStorage.setItem('md-editor-view-v2',view);if(typeof queueTableTools==='function')queueTableTools();if(typeof syncEditHistory==='function')syncEditHistory();}
function findMatches(){return EditorCore.matches($('#editor').value,$('#findText').value,$('#matchCase').checked)}
function updateFindCount(){if(!$('#findBar').hidden)$('#findCount').textContent=findMatches().length+'개';}
function findNext(){const e=$('#editor'),matches=findMatches();if(!matches.length)return toast('일치하는 내용이 없습니다.');const m=matches.find(m=>m.start>=e.selectionEnd)||matches[0];e.focus();e.setSelectionRange(m.start,m.end);const line=e.value.slice(0,m.start).split('\n').length;e.scrollTop=Math.max(0,(line-4)*parseFloat(getComputedStyle(e).lineHeight));updateCursor();}
function openFind(){if(APP.view==='preview')setView('split');const e=$('#editor');if(e.selectionEnd>e.selectionStart)$('#findText').value=e.value.slice(e.selectionStart,e.selectionEnd);$('#findBar').hidden=false;updateFindCount();$('#findText').focus();}
async function restoreWorkspace(w){
 EditorCore.validate(w);const previous=captureWorkspace();
 if(typeof resetEditHistory==='function')resetEditHistory();
 APP.documents=structuredClone(w.documents);APP.folders=structuredClone(w.folders||[]);APP.activeId=w.activeId;APP.theme=w.theme==='dark'?'dark':'light';document.body.dataset.theme=APP.theme;selectDocument(APP.activeId);APP.generation++;
 try{await saveDraft()}catch(e){APP.documents=previous.documents;APP.folders=previous.folders;APP.activeId=previous.activeId;APP.theme=previous.theme;document.body.dataset.theme=APP.theme;selectDocument(APP.activeId);throw e}
}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function fileName(ext){return currentDoc().title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[ .]+$/,'').slice(0,120)+ext;}
async function importFiles(files){
 const additions=[];
 for(const f of files){if(!/\.(md|markdown|txt)$/i.test(f.name))throw Error('Markdown 또는 텍스트 파일을 선택하세요.');if(f.size>EditorCore.MAX_DOC)throw Error(f.name+' · 파일 한 개는 5MB까지 가져올 수 있습니다.');const content=(await f.text()).replace(/^\uFEFF/,'');additions.push(newRecord(f.name.replace(/\.(md|markdown|txt)$/i,'' )||'가져온 문서',content));}
 if(!additions.length)return;
 EditorCore.validate({...captureWorkspace(),documents:[...APP.documents,...additions]});APP.documents.push(...additions);selectDocument(additions.at(-1).id);changed();toast(additions.length+'개 문서를 가져왔습니다.');
}
function setFont(){document.documentElement.style.setProperty('--editor-font',$('#fontSize').value+'px');localStorage.setItem('md-editor-font',$('#fontSize').value);}
async function init(){
 $('#editor').disabled=$('#docTitle').disabled=true;
 try{APP.db=await openDraftDB()}catch(e){toast('브라우저 임시 보관을 제한된 localStorage로 사용합니다. 저장소 연결을 권장합니다.');}
 let w;try{w=APP.db?await readDraft():JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(w)EditorCore.validate(w);}catch(e){toast('임시 보관본을 읽지 못했습니다. 백업 JSON으로 복원할 수 있습니다.',true);w=null;}
 if(w){APP.documents=w.documents;APP.folders=w.folders||[];APP.activeId=w.activeId;APP.theme=w.theme==='dark'?'dark':'light';APP.recovery=w.recovery;}
 else{const d=newRecord('MD Editor 시작하기',STARTER);APP.documents=[d];APP.activeId=d.id;}
 document.body.dataset.theme=APP.theme;selectDocument(APP.activeId);
 const view=localStorage.getItem('md-editor-view-v2');setView(['edit','split','preview'].includes(view)?view:'preview');
 const size=localStorage.getItem('md-editor-font');if(['13','15','17','19'].includes(size))$('#fontSize').value=size;setFont();
 try{await initStorage()}catch(e){onError(e)}
 APP.loading=false;$('#editor').disabled=$('#docTitle').disabled=false;renderStorage();renderDocList();if(typeof renderKnowledge==='function')renderKnowledge();
 await saveDraft().catch(()=>{});
 if('BroadcastChannel' in window){APP.channel=new BroadcastChannel('md-editor-draft');APP.channel.onmessage=()=>{APP.externalDraft=true;clearTimeout(APP.draftTimer);clearTimeout(ST.timer);ST.blocked=true;$('#localStatus').textContent='다른 탭 변경 감지';toast('다른 탭에서 작업공간을 저장했습니다. 현재 내용을 파일로 내보낸 뒤 새로고침해 주세요.',true);};}
}
$('#editor').addEventListener('input',onEditorInput);
$('#editor').addEventListener('click',updateCursor);$('#editor').addEventListener('keyup',updateCursor);
$('#editor').addEventListener('scroll',()=>$('#lineNumbers').scrollTop=$('#editor').scrollTop);
$('#editor').addEventListener('keydown',e=>{
 if(e.isComposing)return;
 if(e.key==='Tab'){e.preventDefault();command(e.shiftKey?'outdent':'indent')}
 if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){
  const t=e.target,start=t.selectionStart,line=t.value.slice(0,start).split('\n').at(-1),m=line.match(/^(\s*)([-*+] |\d+\. )(\[[ xX]\] )?(.*)$/);
  if(m&&t.selectionStart===t.selectionEnd){e.preventDefault();if(!m[4]){const a=start-line.length;applyEdit({text:t.value.slice(0,a)+'\n'+t.value.slice(start),start:a+1,end:a+1})}else{const prefix=m[1]+(/^\d/.test(m[2])?(parseInt(m[2])+1)+'. ':m[2])+(m[3]?'[ ] ':'');applyEdit({text:t.value.slice(0,start)+'\n'+prefix+t.value.slice(start),start:start+1+prefix.length,end:start+1+prefix.length})}}
 }
});
$('#docTitle').addEventListener('input',()=>{currentDoc().title=$('#docTitle').value.trim()||'제목 없는 문서';changed()});
$('#docTitle').addEventListener('blur',()=>$('#docTitle').value=currentDoc().title);
$('#docSearch').addEventListener('input',renderDocList);
$('#newDoc').onclick=()=>{if(APP.loading)return;if(APP.documents.length>=500)return toast('문서는 최대 500개입니다.',true);const d=newRecord();APP.documents.push(d);selectDocument(d.id);changed();$('#docTitle').focus();$('#docTitle').select();};
$('#duplicateDoc').onclick=()=>{if(APP.documents.length>=500)return toast('문서는 최대 500개입니다.',true);const d=newRecord((currentDoc().title+' 사본').slice(0,200),currentDoc().content);d.folderId=currentDoc().folderId||'';APP.documents.push(d);selectDocument(d.id);changed()};
$('#deleteDoc').onclick=()=>{if(!confirm('“'+currentDoc().title+'” 문서를 삭제할까요? 먼저 필요한 문서를 내보내 주세요.'))return;APP.documents=APP.documents.filter(d=>d.id!==APP.activeId);if(!APP.documents.length)APP.documents.push(newRecord());selectDocument(APP.documents[0].id);changed()};
document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>command(b.dataset.command));
document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#toggleOutline').onclick=()=>{const pane=$('#outlinePane');pane.hidden=!pane.hidden;$('#toggleOutline').setAttribute('aria-pressed',String(!pane.hidden))};
$('#focus').onclick=()=>{document.body.classList.toggle('focus');$('#focus').textContent=document.body.classList.contains('focus')?'집중 모드 종료':'집중 모드';};
$('#theme').onclick=()=>{APP.theme=APP.theme==='light'?'dark':'light';document.body.dataset.theme=APP.theme;changed()};
$('#fontSize').onchange=setFont;
$('#openFind').onclick=openFind;$('#closeFind').onclick=()=>$('#findBar').hidden=true;
$('#findText').oninput=$('#matchCase').onchange=updateFindCount;$('#findNext').onclick=findNext;
$('#findText').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();findNext()}};
$('#replaceOne').onclick=()=>{const e=$('#editor'),m=findMatches().find(m=>m.start===e.selectionStart&&m.end===e.selectionEnd);if(!m){findNext();return}const replacement=$('#replaceText').value;applyEdit({text:e.value.slice(0,m.start)+replacement+e.value.slice(m.end),start:m.start+replacement.length,end:m.start+replacement.length});findNext()};
$('#replaceAll').onclick=()=>{const matches=findMatches();if(!matches.length)return;let text=$('#editor').value;for(const m of matches.slice().reverse())text=text.slice(0,m.start)+$('#replaceText').value+text.slice(m.end);applyEdit({text,start:0,end:0});toast(matches.length+'개를 바꿨습니다.')};
$('#importDoc').onclick=()=>$('#fileInput').click();$('#fileInput').onchange=safeAction(async()=>{try{await importFiles($('#fileInput').files)}finally{$('#fileInput').value=''}});
$('#editor').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()});
$('#editor').addEventListener('drop',e=>{if(e.dataTransfer.files.length){e.preventDefault();importFiles(e.dataTransfer.files).catch(onError)}});
$('#openExport').onclick=()=>$('#exportDialog').showModal();
$('#exportMd').onclick=()=>download(fileName('.md'),currentDoc().content,'text/markdown;charset=utf-8');
$('#exportWorkspace').onclick=()=>download('md-editor-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(captureWorkspace(),null,2),'application/json;charset=utf-8');
$('#importWorkspace').onclick=()=>$('#backupInput').click();$('#backupInput').onchange=safeAction(async()=>{try{const f=$('#backupInput').files[0];if(!f)return;if(f.size>EditorCore.MAX_WORKSPACE)throw Error('백업은 50MB까지 복원할 수 있습니다.');const w=EditorCore.validate(JSON.parse((await f.text()).replace(/^\uFEFF/,'')));if(!confirm('백업 파일로 현재 문서 전체를 교체할까요? 필요한 내용은 먼저 내보내 주세요.'))return;await restoreWorkspace(w);APP.dirty=true;storageChanged();toast('작업공간 백업을 복원했습니다.')}finally{$('#backupInput').value=''}});
$('#exportHtml').onclick=safeAction(async()=>{renderEditor();const css=await(await fetch('preview.css')).text(),title=el('span','',currentDoc().title).innerHTML;download(fileName('.html'),'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+css+'body{max-width:900px;margin:40px auto;padding:0 24px}</style></head><body><article class="markdown-body">'+richExportHTML()+'</article></body></html>','text/html;charset=utf-8');});
$('#printDoc').onclick=()=>{renderEditor();$('#exportDialog').close();window.print()};
$('#help').onclick=()=>$('#helpDialog').showModal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
document.addEventListener('keydown',e=>{if(e.isComposing)return;const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();if(mod&&key==='s'){e.preventDefault();saveWorkspace().catch(onError)}if(mod&&key==='f'){e.preventDefault();openFind()}if(mod&&['b','i','k','u'].includes(key)&&(document.activeElement===$('#editor')||document.activeElement===$('#preview'))){e.preventDefault();command({b:'bold',i:'italic',k:'link',u:'underline'}[key])}if(e.key==='Escape'){document.body.classList.remove('focus');$('#focus').textContent='집중 모드';$('#findBar').hidden=true}});
$('#resizer').addEventListener('pointerdown',e=>{e.preventDefault();e.target.setPointerCapture(e.pointerId);const move=ev=>{const rect=$('#writingArea').getBoundingClientRect(),outline=$('#outlinePane').hidden?0:$('#outlinePane').getBoundingClientRect().width,ratio=Math.max(25,Math.min(75,(ev.clientX-rect.left)/(rect.width-outline)*100));$('#writingArea').style.setProperty('--editor-width',ratio+'%');$('#resizer').setAttribute('aria-valuenow',String(Math.round(ratio)))};e.target.onpointermove=move;e.target.onpointerup=()=>{e.target.onpointermove=null}});
$('#resizer').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const value=Math.max(25,Math.min(75,Number(e.target.getAttribute('aria-valuenow'))+(e.key==='ArrowLeft'?-5:5)));$('#writingArea').style.setProperty('--editor-width',value+'%');e.target.setAttribute('aria-valuenow',String(value))}});
window.addEventListener('beforeunload',e=>{if(APP.generation!==APP.localGeneration||(typeof ST!=='undefined'&&ST.dirty&&ST.settings?.activeId)){e.preventDefault();e.returnValue=''}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!APP.loading&&APP.generation!==APP.localGeneration)saveDraft().catch(()=>{})});
window.addEventListener('DOMContentLoaded',()=>init().catch(onError));
