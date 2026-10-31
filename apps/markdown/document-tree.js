'use strict';
const TREE={selected:null,collapsed:new Set(),sort:'updated',form:null};
const treeToolbarIcons={
 newFolder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 10v7m-3-3.5h6"/>',
 editTreeItem:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>',
 moveTreeItem:'<path d="M4 7V5a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v3M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"/><path d="M10 15h11m-4-4 4 4-4 4"/>',
 deleteTreeItem:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 toggleFolders:'<path d="m6 4 6 5 6-5m-12 9 6 5 6-5M5 21h14"/>'
};
for(const [id,paths]of Object.entries(treeToolbarIcons))$('#'+id).innerHTML='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
try{const collapsed=JSON.parse(localStorage.getItem('md-tree-collapsed')||'[]');if(Array.isArray(collapsed))TREE.collapsed=new Set(collapsed.filter(id=>typeof id==='string'));}catch(e){}
TREE.sort=localStorage.getItem('md-tree-sort')||'updated';if(!['updated','name','name-desc','created'].includes(TREE.sort))TREE.sort='updated';
$('#treeSort').value=TREE.sort;
function persistTreeUI(){localStorage.setItem('md-tree-collapsed',JSON.stringify([...TREE.collapsed]));localStorage.setItem('md-tree-sort',TREE.sort);}
function updateFolderToggle(){
 const expanded=APP.folders.length>0&&APP.folders.every(f=>!TREE.collapsed.has(f.id)),button=$('#toggleFolders'),query=$('#docSearch').value.trim();
 const label=expanded?'모두 접기':'모두 펼치기';
 button.title=query?'검색 중에는 일치하는 폴더를 펼쳐 표시합니다.':label;button.setAttribute('aria-label',label);button.setAttribute('aria-expanded',String(expanded));button.disabled=!APP.folders.length||APP.loading||ST.busy||Boolean(query);
 const paths=expanded?'<path d="m6 20 6-5 6 5M6 11l6-5 6 5M5 3h14"/>':'<path d="m6 4 6 5 6-5m-12 9 6 5 6-5M5 21h14"/>';
 button.innerHTML='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
}
function treeIcon(folder=false){
 const icon=el('span',folder?'folder-icon':'doc-icon');
 if(folder)icon.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>';
 else icon.textContent='▤';return icon;
}
function selectTreeDocument(id){
 const d=APP.documents.find(d=>d.id===id);if(!d)return;
 TREE.selected={type:'document',id};APP.selectedFolderId=d.folderId||'';
 if(!APP.loading){let parent=APP.selectedFolderId;while(parent){TREE.collapsed.delete(parent);parent=APP.folders.find(f=>f.id===parent)?.parentId||'';}persistTreeUI();}
}
function treeSelection(){
 const s=TREE.selected;if(!s)return null;
 const item=s.type==='folder'?APP.folders.find(f=>f.id===s.id):APP.documents.find(d=>d.id===s.id);
 return item?{...s,item}:null;
}
function treeCompare(a,b){
 const name=(a.name||a.title).localeCompare(b.name||b.title,'ko-KR',{numeric:true});
 if(TREE.sort==='name')return name;if(TREE.sort==='name-desc')return -name;
 const field=TREE.sort==='created'?'createdAt':'updatedAt',dates=(a[field]||'').localeCompare(b[field]||'');
 return (TREE.sort==='created'?dates:-dates)||name;
}
function folderPath(id){
 const parts=[];let f=APP.folders.find(f=>f.id===id);while(f){parts.unshift(f.name);f=APP.folders.find(p=>p.id===f.parentId);}return parts.length?parts.join(' / '):'내 문서';
}
function selectFolder(id){
 APP.selectedFolderId=id;TREE.selected=id?{type:'folder',id}:null;renderDocList();
}
function bindTreeDrag(button,type,id){
 button.draggable=true;button.addEventListener('dragstart',e=>{if(APP.loading||ST.busy){e.preventDefault();return}e.dataTransfer.setData('application/x-md-tree',JSON.stringify({type,id}));e.dataTransfer.effectAllowed='move';});
}
function bindTreeDrop(node,parentId){
 node.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-md-tree')){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';node.classList.add('drop-target');}});
 node.addEventListener('dragleave',()=>node.classList.remove('drop-target'));
 node.addEventListener('drop',e=>{node.classList.remove('drop-target');const raw=e.dataTransfer.getData('application/x-md-tree');if(!raw)return;e.preventDefault();e.stopPropagation();try{const item=JSON.parse(raw);moveTreeRecord(item.type,item.id,parentId);}catch(error){onError(error)}});
}
function renderDocumentTree(){
 const query=$('#docSearch').value.trim().toLocaleLowerCase(),root=$('#docList');root.replaceChildren();
 $('#docCount').textContent=APP.documents.length;$('#folderCount').textContent=APP.folders.length+'폴더';
 const byParent=new Map(),docsByFolder=new Map();
 for(const f of APP.folders){const id=f.parentId||'';if(!byParent.has(id))byParent.set(id,[]);byParent.get(id).push(f);}
 for(const d of APP.documents){const id=d.folderId||'';if(!docsByFolder.has(id))docsByFolder.set(id,[]);docsByFolder.get(id).push(d);}
 function branch(parent,depth,forced=false){
  const children=[];
  for(const f of (byParent.get(parent)||[]).slice().sort(treeCompare)){
   const ownMatch=forced||Boolean(query&&f.name.toLocaleLowerCase().includes(query)),nested=branch(f.id,depth+1,ownMatch);
   if(query&&!ownMatch&&!nested.length)continue;
   const node=el('div','folder-node'),row=el('div','folder-row'+(TREE.selected?.type==='folder'&&TREE.selected.id===f.id?' selected':'')),toggle=el('button','folder-toggle',TREE.collapsed.has(f.id)&&!query?'›':'⌄'),select=el('button','folder-select tree-select');
   node.dataset.folderId=f.id;node.setAttribute('role','treeitem');node.setAttribute('aria-level',String(depth+1));node.setAttribute('aria-expanded',String(!TREE.collapsed.has(f.id)||Boolean(query)));node.setAttribute('aria-selected',String(TREE.selected?.type==='folder'&&TREE.selected.id===f.id));
   row.style.paddingLeft=(depth*13+4)+'px';toggle.title=f.name+' 펼치기/접기';toggle.setAttribute('aria-label',toggle.title);toggle.onclick=()=>{if(TREE.collapsed.has(f.id))TREE.collapsed.delete(f.id);else TREE.collapsed.add(f.id);persistTreeUI();renderDocList();$('#docList').querySelector('[data-folder-id="'+CSS.escape(f.id)+'"] .folder-toggle')?.focus();};
   select.append(treeIcon(true),el('span','folder-name',f.name));select.title=folderPath(f.id);select.onclick=()=>selectFolder(f.id);select.ondblclick=()=>openTreeItem('edit');select.oncontextmenu=e=>{e.preventDefault();selectFolder(f.id);openTreeItem('edit');};select.dataset.folderId=f.id;
   bindTreeDrag(select,'folder',f.id);bindTreeDrop(row,f.id);row.append(toggle,select);node.append(row);
   const group=el('div','folder-children');group.setAttribute('role','group');group.hidden=TREE.collapsed.has(f.id)&&!query;group.append(...nested);if(!nested.length&&!query)group.append(el('div','empty-folder','빈 폴더'));node.append(group);children.push(node);
  }
  for(const d of (docsByFolder.get(parent)||[]).slice().sort(treeCompare)){
   if(query&&!forced&&!(d.title+'\n'+d.content).toLocaleLowerCase().includes(query))continue;
   const button=el('button','doc-item tree-select'+(d.id===APP.activeId?' active':'')),info=el('span','doc-info');
   button.dataset.docId=d.id;button.style.paddingLeft=(depth*13+9)+'px';button.setAttribute('role','treeitem');button.setAttribute('aria-level',String(depth+1));button.setAttribute('aria-selected',String(TREE.selected?.type==='document'&&TREE.selected.id===d.id));button.setAttribute('aria-current',d.id===APP.activeId?'page':'false');button.title=folderPath(d.folderId||'')+' / '+d.title;
   info.append(el('strong','',d.title),el('small','',new Date(d.updatedAt).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})+' · '+d.content.length.toLocaleString()+'자'));
   button.append(treeIcon(),info);button.onclick=()=>selectDocument(d.id);button.oncontextmenu=e=>{e.preventDefault();selectDocument(d.id);openTreeItem('edit');};bindTreeDrag(button,'document',d.id);children.push(button);
  }
  return children;
 }
 root.append(...branch('',0));if(!root.childNodes.length)root.append(el('div','empty-list','검색 결과가 없습니다.'));
 const selected=treeSelection();for(const id of ['editTreeItem','moveTreeItem','deleteTreeItem'])$('#'+id).disabled=!selected||APP.loading||ST?.busy;
 $('#newFolder').disabled=APP.loading||ST?.busy;$('#treeRoot').classList.toggle('selected',!TREE.selected);
 updateFolderToggle();
}
function parentChoices(excluded=new Set()){
 const choices=[{id:'',name:'내 문서 (최상위)'}];function walk(id,depth){for(const f of APP.folders.filter(f=>(f.parentId||'')===id).sort((a,b)=>a.name.localeCompare(b.name,'ko-KR'))){if(excluded.has(f.id))continue;choices.push({id:f.id,name:'　'.repeat(depth)+f.name});walk(f.id,depth+1);}}walk('',0);return choices;
}
function openTreeItem(action){
 if(APP.loading||ST.busy)return;
 const selected=treeSelection();if(action!=='create'&&!selected)return;
 if(action==='create'&&APP.folders.length>=200)return toast('폴더는 최대 200개입니다.',true);
 TREE.form={action,type:action==='create'?'folder':selected.type,id:action==='create'?'':selected.id};
 const item=selected?.item,name=TREE.form.type==='folder'?(item?.name||''):item?.title||'';
 $('#treeItemDialogTitle').textContent=action==='create'?'새 폴더':action==='move'?'위치 이동':'이름 변경';
 $('#treeNameLabel').hidden=action==='move';$('#treeItemName').required=action!=='move';$('#treeItemName').maxLength=TREE.form.type==='folder'?80:200;$('#treeItemName').value=action==='create'?'':name;
 const excluded=action!=='create'&&TREE.form.type==='folder'?FolderModel.descendants(APP.folders,selected.id):new Set();
 $('#treeItemParent').replaceChildren(...parentChoices(excluded).map(choice=>{const option=el('option','',choice.name);option.value=choice.id;return option;}));
 $('#treeItemParent').value=action==='create'?APP.selectedFolderId:TREE.form.type==='folder'?item.parentId||'':item.folderId||'';
 $('#treeItemError').textContent='';$('#treeItemDialog').showModal();(action==='move'?$('#treeItemParent'):$('#treeItemName')).focus();if(action!=='move')$('#treeItemName').select();
}
function moveTreeRecord(type,id,parentId){
 if(APP.loading||ST.busy)throw Error('작업 완료 후 다시 이동해 주세요.');
 const folders=structuredClone(APP.folders),documents=structuredClone(APP.documents),item=(type==='folder'?folders:documents).find(item=>item.id===id);if(!item)throw Error('이동할 항목이 없습니다.');
 if(type==='folder')item.parentId=parentId;else if(type==='document')item.folderId=parentId;else throw Error('잘못된 항목 종류');
 FolderModel.validate(folders,documents);APP.folders=folders;APP.documents=documents;TREE.collapsed.delete(parentId);APP.selectedFolderId=type==='folder'?id:parentId;TREE.selected={type,id};changed(false);persistTreeUI();toast('위치를 변경했습니다.');
}
$('#treeItemForm').onsubmit=e=>{
 e.preventDefault();if(APP.loading||ST.busy)return;const form=TREE.form;if(!form)return;
 try{
  const folders=structuredClone(APP.folders),documents=structuredClone(APP.documents),name=$('#treeItemName').value.trim(),parentId=$('#treeItemParent').value,now=new Date().toISOString();
  if(form.action==='move'){moveTreeRecord(form.type,form.id,parentId);$('#treeItemDialog').close();return;}
  if(!name)throw Error('이름을 입력하세요.');
  let id=form.id;
  if(form.action==='create'){id=crypto.randomUUID();folders.push({id,name,parentId,createdAt:now,updatedAt:now});}
  else{const item=(form.type==='folder'?folders:documents).find(item=>item.id===id);if(!item)throw Error('편집할 항목이 없습니다.');if(form.type==='folder'){item.name=name;item.parentId=parentId;}else{item.title=name;item.folderId=parentId;}item.updatedAt=now;}
  FolderModel.validate(folders,documents);APP.folders=folders;APP.documents=documents;TREE.selected={type:form.type,id};APP.selectedFolderId=form.type==='folder'?id:parentId;TREE.collapsed.delete(parentId);TREE.collapsed.delete(id);
  if(form.type==='document'&&APP.activeId===id)$('#docTitle').value=name;
  changed(false);persistTreeUI();$('#treeItemDialog').close();
 }catch(error){$('#treeItemError').textContent=error.message;}
};
$('#newFolder').onclick=()=>openTreeItem('create');$('#editTreeItem').onclick=()=>openTreeItem('edit');$('#moveTreeItem').onclick=()=>openTreeItem('move');
$('#deleteTreeItem').onclick=()=>{
 const selected=treeSelection();if(!selected||APP.loading||ST.busy)return;
 if(selected.type==='document'){$('#deleteDoc').click();return;}
 if(!confirm('“'+selected.item.name+'” 폴더와 하위 폴더를 삭제할까요? 문서는 삭제하지 않고 상위 폴더로 이동합니다.'))return;
 const removing=FolderModel.descendants(APP.folders,selected.id),parent=selected.item.parentId||'';
 APP.folders=APP.folders.filter(f=>!removing.has(f.id));for(const d of APP.documents)if(removing.has(d.folderId))d.folderId=parent;
 APP.selectedFolderId=parent;TREE.selected=parent?{type:'folder',id:parent}:null;changed(false);toast('폴더를 삭제하고 문서는 상위 위치로 이동했습니다.');
};
$('#treeRoot').onclick=()=>selectFolder('');bindTreeDrop($('#treeRoot'),'');
$('#treeSort').onchange=()=>{TREE.sort=$('#treeSort').value;persistTreeUI();renderDocList();};
$('#toggleFolders').onclick=()=>{if(APP.folders.every(f=>!TREE.collapsed.has(f.id)))TREE.collapsed=new Set(APP.folders.map(f=>f.id));else TREE.collapsed.clear();persistTreeUI();renderDocList();};
$('#docList').addEventListener('keydown',e=>{
 const buttons=Array.from($('#docList').querySelectorAll('.tree-select')).filter(b=>b.getClientRects().length),current=e.target.closest('.tree-select'),index=buttons.indexOf(current);
 if(index<0)return;
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(e.key==='ArrowDown'?1:-1)));buttons[next]?.focus();}
 if(current.dataset.folderId&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')TREE.collapsed.add(current.dataset.folderId);else TREE.collapsed.delete(current.dataset.folderId);persistTreeUI();renderDocList();$('#docList').querySelector('.folder-select[data-folder-id="'+CSS.escape(current.dataset.folderId)+'"]')?.focus();}
 if(e.key==='F2'){e.preventDefault();if(current.dataset.docId)selectDocument(current.dataset.docId);else selectFolder(current.dataset.folderId);openTreeItem('edit');}
});
