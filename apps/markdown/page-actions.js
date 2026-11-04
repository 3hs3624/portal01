/* Page blocks and contextual page actions share the existing local workspace. */
'use strict';
const STUDIO_PAGES=(()=>{
 const icon='<svg viewBox="0 0 20 22" width="17" height="19" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 1.5h7l5 5V20H4z"/><path d="M11 1.5V7h5M7 11h6M7 15h6"/></svg>';
 const locked=()=>APP.loading||APP.externalDraft||(typeof ST!=='undefined'&&ST.busy);
 const writable=()=>!locked()&&RICH.editor?.isEditable;
 const menu=el('div','studio-page-menu');menu.id='studioPageMenu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','페이지 메뉴');document.body.append(menu);
 const preview=el('dialog','studio-page-preview');preview.id='studioPagePreview';document.body.append(preview);
 const comments=el('dialog','studio-page-comments');comments.id='studioPageComments';document.body.append(comments);
 let state=null;
 const btn=(text,fn,cls='')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
 function notify(){document.dispatchEvent(new Event('studio:page-metadata-changed'));}
 function close(focus=false){const node=state?.dom;node?.classList.remove('studio-page-selected');state=null;menu.hidden=true;if(focus)node?.querySelector('.studio-page-handle')?.focus();}
 function valid(){if(!state||APP.activeId!==state.owner||!state.dom.isConnected)return close();let data;try{data=JSON.parse(decodeURIComponent(state.dom.dataset.studioData));}catch{}if(data?.docId!==state.target)return close();const d=APP.documents.find(d=>d.id===state.target);if(!d)return close();return d;}
 function place(x,y){menu.hidden=false;menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';}
 function item(label,fn,hint='',disabled=false){const b=btn('',fn,'studio-page-menu-item');b.setAttribute('role','menuitem');b.append(el('span','',label));if(hint)b.append(el('small','',hint));b.disabled=disabled;menu.append(b);return b;}
 function pageURL(id){const url=new URL('../../',location.href);url.searchParams.set('studioDoc',id);url.hash='markdown';return url.href;}
 async function copy(id){try{await navigator.clipboard.writeText(pageURL(id));toast('페이지 링크를 복사했습니다. 같은 계정·작업공간에서 열 수 있습니다.');}catch{openStudioDialog('페이지 링크',dialog=>{const input=el('textarea');input.readOnly=true;input.value=pageURL(id);input.setAttribute('aria-label','복사할 페이지 링크');dialog.append(input);input.select();});}}
 function open(id,mode='full'){
  const d=APP.documents.find(d=>d.id===id);if(!d)return toast('연결된 페이지를 찾을 수 없습니다.',true);if(locked())return;close();
  if(mode==='full'){preview.close();selectDocument(id);return;}
  if(mode==='tab'){
   const child=window.open('about:blank','_blank');if(!child)return toast('브라우저에서 새 탭 열기를 허용해 주세요.',true);child.opener=null;saveDraft().then(()=>child.location.replace(pageURL(id))).catch(error=>{child.close();onError(error);});return;
  }
  preview.replaceChildren();preview.dataset.mode=mode;preview.setAttribute('aria-label','페이지 미리보기: '+d.title);const header=el('div','studio-page-preview-header');header.append(el('strong','',d.title),btn('전체 페이지로 열기',()=>open(id)),btn('닫기',()=>preview.close()));const content=el('div','markdown-body studio-page-preview-content');content.append(richSanitize(marked.parse(d.content,{gfm:true,async:false})).content);preview.append(header,content);if(!preview.open)preview.showModal();
 }
 function show(dom,id,x,y){
  close();closeBlockMenus();const d=APP.documents.find(d=>d.id===id);if(!d)return toast('연결된 페이지를 찾을 수 없습니다.',true);state={owner:APP.activeId,target:id,dom};dom.classList.add('studio-page-selected');drawMenu();place(x,y);menu.querySelector('button:not(:disabled)')?.focus();
 }
 function drawMenu(){
  const d=valid();if(!d)return;menu.replaceChildren(el('small','studio-page-menu-caption','페이지'));
  item(d.favorite?'★ 즐겨찾기에서 제거':'☆ 즐겨찾기에 추가',()=>{const target=valid();if(!target||!writable())return;target.favorite=!target.favorite;changed(false);saveDraft().catch(onError);notify();close();toast(target.favorite?'즐겨찾기에 추가했습니다.':'즐겨찾기에서 제거했습니다.');},'',!writable());
  item('↗ 다음에서 열기',()=>{if(!valid())return;menu.replaceChildren();item('← 페이지 메뉴',()=>{drawMenu();place(parseFloat(menu.style.left),parseFloat(menu.style.top));});for(const [mode,label]of [['side','사이드 미리보기'],['center','중앙 미리보기'],['full','전체 페이지'],['tab','새 탭']])item(label,()=>{const target=valid();if(target)open(target.id,mode);});place(parseFloat(menu.style.left),parseFloat(menu.style.top));menu.querySelector('button')?.focus();},'›');
  item('▣ 댓글',()=>{const target=valid();if(!target)return;const id=target.id;close();openComments(id);},'Ctrl+Shift+M');
  menu.append(el('hr'));item('↗ 링크 복사',()=>{const target=valid();if(target){const id=target.id;close();copy(id);}});menu.append(el('hr'));menu.append(el('small','studio-page-menu-caption','최종 편집 일시'),el('div','studio-page-menu-date',new Date(d.updatedAt).toLocaleString('ko-KR')));
 }
 function openComments(id){
  const owner=APP.activeId;let d=APP.documents.find(d=>d.id===id);if(!d)return;comments.replaceChildren();comments.setAttribute('aria-label','페이지 댓글');const heading=el('div','studio-dialog-header');heading.append(el('h2','','페이지 댓글 · '+d.title),btn('닫기',()=>comments.close()));comments.append(heading,el('p','footnote','댓글은 현재 작업공간에 저장됩니다.'));
  const list=el('div','studio-page-comment-list'),input=el('textarea');input.placeholder='댓글을 작성하세요.';input.maxLength=5000;input.setAttribute('aria-label','페이지 댓글 내용');
  const get=()=>{if(owner!==APP.activeId||locked())return null;return APP.documents.find(doc=>doc.id===id);};
  const persist=target=>{target.updatedAt=new Date().toISOString();changed(false);saveDraft().catch(onError);notify();};
  const draw=()=>{d=APP.documents.find(doc=>doc.id===id);list.replaceChildren();if(!d?.pageComments?.length)list.append(el('p','footnote','아직 댓글이 없습니다.'));for(const note of d?.pageComments||[]){const row=el('div','studio-page-comment');row.append(el('p','',note.text),el('small','',new Date(note.date).toLocaleString('ko-KR')));const remove=btn('삭제',()=>{const target=get();if(!target||!writable())return comments.close();if(!confirm('이 댓글을 삭제할까요?'))return;target.pageComments=(target.pageComments||[]).filter(n=>n.id!==note.id);persist(target);draw();});remove.disabled=!writable();row.append(remove);list.append(row);}};
  const submit=btn('댓글 등록',()=>{const target=get();if(!target||!writable())return comments.close();const text=input.value.trim();if(!text)return input.focus();if((target.pageComments||[]).length>=100)return toast('페이지 댓글은 최대 100개입니다.',true);target.pageComments=[...(target.pageComments||[]),{id:crypto.randomUUID(),text,date:new Date().toISOString()}];persist(target);input.value='';draw();});input.disabled=submit.disabled=!writable();comments.append(list,input,submit);draw();if(!comments.open)comments.showModal();if(!input.disabled)input.focus();
 }
 function render(dom,data){
  dom.classList.add('studio-page-row');const d=APP.documents.find(d=>d.id===data.docId);const handle=btn('',()=>{const r=handle.getBoundingClientRect();show(dom,data.docId,r.left,r.bottom+4);},'studio-page-handle');handle.setAttribute('aria-label','페이지 메뉴 열기');handle.setAttribute('aria-haspopup','menu');handle.title='클릭 또는 Ctrl+/로 페이지 메뉴 열기';for(let i=0;i<6;i++)handle.append(el('i'));handle.disabled=!d;
  const link=el('a','studio-page-link');link.href=d?'#doc-'+d.id:'#';link.innerHTML=icon;link.append(el('span','',d?.title||data.title||'삭제된 페이지'));link.title=d?'페이지 열기: '+d.title:'연결된 페이지를 찾을 수 없습니다.';link.onclick=e=>{e.preventDefault();e.stopPropagation();if(d)open(d.id,e.ctrlKey||e.metaKey?'tab':'full');else toast('연결된 페이지를 찾을 수 없습니다.',true);};dom.append(handle,link);if(!d)dom.append(el('small','studio-page-missing','페이지를 찾을 수 없습니다.'));
  dom.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();if(d)show(dom,d.id,e.clientX,e.clientY);};dom.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='m'){e.preventDefault();e.stopPropagation();if(d)openComments(d.id);return;}if((e.ctrlKey||e.metaKey)&&e.key==='/'){e.preventDefault();e.stopPropagation();const r=dom.getBoundingClientRect();show(dom,data.docId,r.left,r.bottom+4);}};
 }
 // Single-link paragraphs become page rows; mixed inline mentions remain inline.
 function promote(node){
  if(node.type==='paragraph'&&node.content?.length===1&&node.content[0].type==='text'){
   const mark=node.content[0].marks?.find(m=>m.type==='link'&&/^#doc-[A-Za-z0-9_-]+$/.test(m.attrs?.href||''));
   if(mark)return {type:'studioWidget',attrs:{...node.attrs,kind:'page-link',data:JSON.stringify({docId:mark.attrs.href.slice(5),title:node.content[0].text})}};
  }
  if(node.content)node.content=node.content.map(promote);return node;
 }
 function insert(state,doc){
  if(state.document!==APP.activeId||!writable())return;const editor=RICH.editor,node=studioWidgetNode('page-link',{docId:doc.id,title:doc.title});
  if(state.mode!=='slash')return insertExtraNode(state,node);
  closeBlockMenus();historyBoundary();HISTORY.area='preview';let tr=editor.state.tr.delete(state.from,state.to);const $pos=tr.doc.resolve(state.from);let depth=$pos.depth;while(depth>0&&!$pos.node(depth).isTextblock)depth--;
  if(depth>0){const p=$pos.node(depth),pos=$pos.before(depth);tr=p.content.size===0?tr.replaceWith(pos,pos+p.nodeSize,node):tr.insert(pos+p.nodeSize,node);}else tr=tr.insert(state.from,node);
  tr.setSelection(BlockEngine.TextSelection.near(tr.doc.resolve(Math.min(state.from,tr.doc.content.size))));editor.view.dispatch(tr);editor.commands.focus();historyBoundary();
 }
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target)&&!e.target.closest('.studio-page-handle'))close();});
 document.addEventListener('keydown',e=>{
  if(!state||menu.hidden)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close(true);return;}
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='m'){const d=valid();if(d){e.preventDefault();e.stopImmediatePropagation();const id=d.id;close();openComments(id);}return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement),n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[n]?.focus();}
 },true);
 document.addEventListener('scroll',e=>{if(!menu.contains(e.target))close();},true);addEventListener('resize',()=>close());document.addEventListener('studio:document-changed',()=>close());
 preview.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const href=a.getAttribute('href')||'';if(href.startsWith('#doc-')){e.preventDefault();open(href.slice(5),preview.dataset.mode);}else if(/^https?:\/\//i.test(href)){a.target='_blank';a.rel='noopener noreferrer';}});
 const previous=selectDocument;selectDocument=function(id){close();preview.close();comments.close();previous(id);};
 const commentButton=btn('페이지 댓글',()=>openComments(APP.activeId));commentButton.id='openPageComments';$('.doc-actions').append(commentButton);
 return {render,promote,insert,open,openComments};
})();
function insertStudioPage(state){
 if(state.document!==APP.activeId||!RICH.editor?.isEditable||APP.loading||APP.externalDraft||ST.busy)return;
 if(APP.documents.length>=500)return toast('문서는 최대 500개입니다.',true);const title=prompt('새 페이지 제목','제목 없는 문서');if(!title?.trim())return;
 const doc=newRecord(title.trim().slice(0,200),'');APP.documents.push(doc);STUDIO_PAGES.insert(state,doc);
}
