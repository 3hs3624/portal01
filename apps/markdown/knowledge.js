'use strict';
const KNOWLEDGE={mode:'all',recent:[],linkSelection:null};
try{KNOWLEDGE.recent=JSON.parse(localStorage.getItem('md-recent-docs')||'[]');if(!Array.isArray(KNOWLEDGE.recent))KNOWLEDGE.recent=[];}catch(e){}
const shortcuts=el('div','document-shortcuts');for(const [mode,label]of [['all','전체'],['favorites','★ 즐겨찾기'],['recent','최근']]){const button=el('button',mode==='all'?'selected':'',label);button.dataset.docMode=mode;button.onclick=()=>{KNOWLEDGE.mode=mode;shortcuts.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===button));renderDocList();};shortcuts.append(button);}$('.tree-sort').before(shortcuts);
const favorite=el('button','','☆');favorite.id='favoriteDocument';favorite.title='즐겨찾기';favorite.setAttribute('aria-label','즐겨찾기');favorite.onclick=()=>{currentDoc().favorite=!currentDoc().favorite;changed(false);renderKnowledge();};$('.doc-actions').prepend(favorite);
const linkButton=el('button','','문서 연결');linkButton.id='linkDocument';linkButton.onclick=()=>openDocumentLink();$('.doc-actions').append(linkButton);
const backlinks=el('section','backlinks');backlinks.innerHTML='<b>연결된 문서</b><div id="backlinkRows"></div>';$('#outlinePane').append(backlinks);
const picker=el('dialog');picker.id='documentLinkDialog';picker.innerHTML='<div class="dialog-heading"><h2>문서 연결</h2><button id="closeDocumentLink" aria-label="닫기">×</button></div><input id="documentLinkSearch" placeholder="문서 제목 검색" aria-label="연결할 문서 검색"><div id="documentLinkChoices"></div>';document.body.append(picker);$('#closeDocumentLink').onclick=()=>picker.close();
function references(doc){return [...doc.content.matchAll(/\[[^\]]*\]\(#doc-([A-Za-z0-9_-]+)\)/g)].map(m=>m[1]);}
function renderKnowledge(){
 if(!currentDoc())return;const d=currentDoc();favorite.textContent=d.favorite?'★':'☆';favorite.setAttribute('aria-pressed',String(Boolean(d.favorite)));
 const incoming=APP.documents.filter(doc=>doc.id!==d.id&&references(doc).includes(d.id));
 $('#backlinkRows').replaceChildren(...incoming.map(doc=>{const b=el('button','',doc.title);b.onclick=()=>selectDocument(doc.id);return b;}));if(!incoming.length)$('#backlinkRows').append(el('small','','아직 연결된 문서가 없습니다.'));
 linkButton.disabled=APP.loading||APP.view==='preview'&&!RICH.enabled;
}
const knowledgeSelectDocument=selectDocument;selectDocument=function(id){knowledgeSelectDocument(id);KNOWLEDGE.recent=[id,...KNOWLEDGE.recent.filter(v=>v!==id)].slice(0,50);localStorage.setItem('md-recent-docs',JSON.stringify(KNOWLEDGE.recent));renderKnowledge();};
const knowledgeRenderTree=renderDocumentTree;renderDocumentTree=function(){
 knowledgeRenderTree();if(KNOWLEDGE.mode==='all')return;
 const query=$('#docSearch').value.trim().toLocaleLowerCase();
 let docs=APP.documents.filter(d=>(KNOWLEDGE.mode==='favorites'?d.favorite:KNOWLEDGE.recent.includes(d.id))&&(d.title+'\n'+d.content).toLocaleLowerCase().includes(query));
 docs.sort(KNOWLEDGE.mode==='recent'?(a,b)=>KNOWLEDGE.recent.indexOf(a.id)-KNOWLEDGE.recent.indexOf(b.id):treeCompare);
 $('#docList').replaceChildren(...docs.map(d=>{const button=el('button','doc-item tree-select'+(d.id===APP.activeId?' active':'')),info=el('span','doc-info');button.dataset.docId=d.id;info.append(el('strong','',d.title),el('small','',folderPath(d.folderId||'')));button.append(treeIcon(),info);button.onclick=()=>selectDocument(d.id);return button;}));
 if(!docs.length)$('#docList').append(el('p','empty-list',KNOWLEDGE.mode==='favorites'?'즐겨찾기한 문서가 없습니다.':'최근 문서가 없습니다.'));
};
function openDocumentLink(){
 if(APP.loading||APP.view==='preview'&&!RICH.enabled)return;
 KNOWLEDGE.linkSelection={document:APP.activeId,rich:APP.view==='preview'||previewHasFocus(),from:RICH.editor?.state.selection.from,to:RICH.editor?.state.selection.to,start:$('#editor').selectionStart,end:$('#editor').selectionEnd};
 $('#documentLinkSearch').value='';renderDocumentChoices();picker.showModal();$('#documentLinkSearch').focus();
}
function renderDocumentChoices(){
 const query=$('#documentLinkSearch').value.toLocaleLowerCase();
 $('#documentLinkChoices').replaceChildren(...APP.documents.filter(d=>d.id!==APP.activeId&&d.title.toLocaleLowerCase().includes(query)).map(d=>{
  const button=el('button','document-choice',d.title);button.onclick=()=>{
   const selected=KNOWLEDGE.linkSelection;if(!selected||selected.document!==APP.activeId)return picker.close();
   const href='#doc-'+d.id,label=d.title.replace(/[\[\]\\]/g,'\\$&');
   picker.close();historyBoundary();
   if(selected.rich){RICH.editor.chain().focus().setTextSelection({from:selected.from,to:selected.to}).insertContent({type:'text',text:d.title,marks:[{type:'link',attrs:{href}}]}).run();}
   else{const text=$('#editor').value,markdown='['+label+']('+href+')';applyEdit({text:text.slice(0,selected.start)+markdown+text.slice(selected.end),start:selected.start+markdown.length,end:selected.start+markdown.length});}
   historyBoundary();
  };return button;
 }));if(!$('#documentLinkChoices').childNodes.length)$('#documentLinkChoices').append(el('p','footnote','연결할 다른 문서를 먼저 만드세요.'));
}
$('#documentLinkSearch').oninput=renderDocumentChoices;
$('#previewEditable').addEventListener('change',renderKnowledge);
$('#preview').addEventListener('click',e=>{
 const anchor=e.target.closest('a'),href=anchor?.getAttribute('href')||'';
 if(!href.startsWith('#doc-'))return;
 if(!RICH.enabled||e.ctrlKey||e.metaKey){e.preventDefault();e.stopImmediatePropagation();const id=href.slice(5);if(APP.documents.some(d=>d.id===id))selectDocument(id);else toast('연결된 문서를 찾을 수 없습니다.',true);}
},true);
