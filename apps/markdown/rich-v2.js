'use strict';
const RICH={enabled:localStorage.getItem('md-editor-direct-v2')!=='false',editor:null,loading:false,raw:new Map(),trivia:'',markdown:'',activeBlock:null};
const markdownWriter=new TurndownService({headingStyle:'atx',codeBlockStyle:'fenced',bulletListMarker:'-',emDelimiter:'*',strongDelimiter:'**'});
const originalMarkdownEscape=markdownWriter.escape.bind(markdownWriter);markdownWriter.escape=text=>originalMarkdownEscape(text).replace(/</g,'&lt;').replace(/>/g,'&gt;');
markdownWriter.use(turndownPluginGfm.gfm);
markdownWriter.addRule('underline',{filter:'u',replacement:c=>'<u>'+c+'</u>'});
markdownWriter.addRule('strike',{filter:['del','s','strike'],replacement:c=>'~~'+c+'~~'});
markdownWriter.addRule('taskLabel',{filter:n=>n.nodeName==='LABEL'&&n.parentNode?.getAttribute('data-type')==='taskItem',replacement:()=>''});
markdownWriter.addRule('taskItem',{filter:n=>n.nodeName==='LI'&&n.getAttribute('data-type')==='taskItem',replacement:(c,n)=>'\n- ['+(n.getAttribute('data-checked')==='true'?'x':' ')+'] '+c.trim().replace(/\n/g,'\n  ')+'\n'});
markdownWriter.addRule('tableCell',{filter:['th','td'],replacement:(c,n)=>(n.cellIndex===0?'| ':' ')+c.trim().replace(/\|/g,'\\|').replace(/\n+/g,'<br>')+' |'});
function richEngineActive(){return Boolean(RICH.editor);}
function engineRoot(){return RICH.editor?.view.dom||$('#preview');}
function richSanitize(html){
 const template=document.createElement('template');template.innerHTML=DOMPurify.sanitize(html,{USE_PROFILES:{html:true},FORBID_TAGS:['style','form','button','textarea','select','video','audio','iframe','object','embed'],FORBID_ATTR:['style','id','name','contenteditable','tabindex','autofocus']});
 for(const input of template.content.querySelectorAll('input')){if(input.type==='checkbox'){const li=input.closest('li');if(li){li.setAttribute('data-type','taskItem');li.setAttribute('data-checked',String(input.checked));li.parentElement.setAttribute('data-type','taskList');}input.remove();}else input.remove();}
 for(const img of template.content.querySelectorAll('img'))if(!/^(https?:\/\/|data:image\/(png|jpeg|gif|webp);base64,)/i.test(img.getAttribute('src')||''))img.removeAttribute('src');
 return template;
}
function signature(json){return JSON.stringify(json,(key,value)=>key==='blockId'?undefined:value);}
function serializeRichNode(node){
 if(node.type.name==='rawBlock')return node.attrs.raw;
 const dom=BlockEngine.DOMSerializer.fromSchema(RICH.editor.schema).serializeNode(node);
 if(node.type.name==='table')for(const colgroup of dom.querySelectorAll('colgroup'))colgroup.remove();
 return markdownWriter.turndown(dom);
}
function ensureRichEditor(){
 if(RICH.editor)return RICH.editor;
 RICH.editor=BlockEngine.create($('#preview'),{
  onUpdate:()=>onPreviewInput(),onSelectionUpdate:()=>{queueTableTools();updateBlockControls();updateSelectionBubble();updateSlashMenu();},
  onFocus:()=>{if(typeof HISTORY!=='undefined'){HISTORY.area='preview';historyBoundary();syncEditHistory();}},
  editorProps:{
   handleKeyDown:(view,event)=>handleRichKey(event),
   handlePaste:(view,event)=>typeof handleGridPaste==='function'&&handleGridPaste(event),
   handleDOMEvents:{copy:(view,event)=>typeof handleGridCopy==='function'&&handleGridCopy(event)}
  }
 });
 return RICH.editor;
}
function renderRichDocument(text){
 const editor=ensureRichEditor();if(RICH.markdown===text&&editor.state.doc.childCount)return;
 RICH.loading=true;RICH.raw=new Map();RICH.trivia='';
 try{
  const tokens=marked.lexer(text,{gfm:true}),content=[];let position=0;
  for(const token of tokens){
   const raw=token.raw||'',start=text.indexOf(raw,position);if(start>=position){RICH.trivia+=text.slice(position,start);position=start+raw.length;}
   if(token.type==='space'){RICH.trivia+=raw;continue;}
   const list=[token];list.links=tokens.links;
   const html=marked.parser(list,{gfm:true,async:false}),template=richSanitize(html),parsed=BlockEngine.DOMParser.fromSchema(editor.schema).parse(template.content);
   let nodes=Array.from({length:parsed.childCount},(_,i)=>parsed.child(i).toJSON());
   if(!nodes.length||(!template.content.textContent.trim()&&!template.content.querySelector('img,hr,table'))&&token.type==='html')nodes=[{type:'rawBlock',attrs:{raw}}];
   nodes.forEach((node,index)=>{
    node.attrs={...node.attrs,blockId:crypto.randomUUID()};content.push(node);
    if(nodes.length===1)RICH.raw.set(node.attrs.blockId,{signature:signature(node),raw});
   });
  }
  RICH.trivia+=text.slice(position);
  if(!content.length)content.push({type:'paragraph',attrs:{blockId:crypto.randomUUID()}});
  editor.commands.setContent({type:'doc',content},{emitUpdate:false,parseOptions:{preserveWhitespace:'full'}});
  RICH.markdown=text;
 }finally{RICH.loading=false;}
 syncPreviewEditable();updateBlockControls();
}
function previewMarkdown(){
 if(!RICH.editor)return $('#editor').value;
 const parts=[];
 RICH.editor.state.doc.forEach(node=>{
  const raw=RICH.raw.get(node.attrs.blockId),json=node.toJSON();
  if(raw&&raw.signature===signature(json))parts.push(raw.raw);
  else parts.push(serializeRichNode(node).trim()+'\n\n');
 });
 return parts.map((part,i)=>i&&parts[i-1]&&!/\n\n$/.test(parts[i-1])?(/\n$/.test(parts[i-1])?'\n':'\n\n')+part:part).join('').replace(/\s+$/,'')+(RICH.trivia.trim()?'\n\n'+RICH.trivia.trim():'');
}
function syncPreviewEditable(){
 const enabled=RICH.enabled&&!APP.loading&&!$('#editor').disabled;
 if(RICH.editor&&RICH.editor.isEditable!==enabled)RICH.editor.setEditable(enabled,false);
 $('#preview').contentEditable='false';$('#preview').setAttribute('aria-readonly',String(!enabled));
 if(RICH.editor)for(const checkbox of engineRoot().querySelectorAll('input[type=checkbox]'))checkbox.disabled=!enabled;
 $('#previewEditable').checked=RICH.enabled;
 if(typeof queueTableTools==='function')queueTableTools();if(typeof syncEditHistory==='function')syncEditHistory();
 if(!enabled){$('#blockControls')?.setAttribute('hidden','');$('#selectionBubble')?.setAttribute('hidden','');$('#slashMenu')?.setAttribute('hidden','');}
}
function onPreviewInput(){
 if(RICH.loading||APP.loading||!RICH.enabled)return;
 const text=previewMarkdown();
 if(new TextEncoder().encode(text).length>EditorCore.MAX_DOC){RICH.markdown=null;renderRichDocument(currentDoc().content);toast('문서는 5MB까지 편집할 수 있습니다.',true);return;}
 if(text===currentDoc().content)return;
 clearTimeout(APP.previewTimer);APP.previewTimer=0;currentDoc().content=text;$('#editor').value=text;RICH.markdown=text;changed();renderEditor(false);updateBlockControls();updateSlashMenu();
}
function flushSourcePreview(){if(APP.previewTimer){clearTimeout(APP.previewTimer);APP.previewTimer=0;renderEditor();}}
function previewHasFocus(){return RICH.enabled&&RICH.editor&&$('#preview').contains(document.activeElement);}
function focusRichEditor(){ensureRichEditor().commands.focus();}
function richExportHTML(){return RICH.editor?RICH.editor.getHTML():$('#preview').innerHTML;}
function previewCommand(name){
 if(!RICH.enabled||!RICH.editor||(!previewHasFocus()&&APP.view!=='preview'))return false;
 const editor=RICH.editor;historyBoundary();let chain=editor.chain().focus();
 const actions={bold:'toggleBold',italic:'toggleItalic',underline:'toggleUnderline',strike:'toggleStrike',code:'toggleCode',quote:'toggleBlockquote',bullet:'toggleBulletList',number:'toggleOrderedList',task:'toggleTaskList',fence:'toggleCodeBlock',rule:'setHorizontalRule'};
 if(actions[name])chain[actions[name]]().run();
 else if(/^heading[123]?$/.test(name))chain.setHeading({level:Number(name.slice(7))||1}).run();
 else if(name==='table')chain.insertTable({rows:3,cols:2,withHeaderRow:true}).run();
 else if(name==='indent')chain.sinkListItem(editor.isActive('taskItem')?'taskItem':'listItem').run();
 else if(name==='outdent')chain.liftListItem(editor.isActive('taskItem')?'taskItem':'listItem').run();
 else if(name==='link'||name==='image'){
  const url=prompt(name==='link'?'링크 주소':'이미지 주소','https://');if(url===null)return true;
  if(!/^(https?:\/\/|mailto:|#doc-)/i.test(url.trim()))return toast('HTTP(S) 주소를 입력하세요.',true),true;
  if(name==='image'){if(!/^https?:\/\//i.test(url.trim()))return toast('이미지는 HTTP(S) 주소를 입력하세요.',true),true;chain.setImage({src:url.trim(),alt:'이미지'}).run();}
  else chain.extendMarkRange('link').setLink({href:url.trim()}).run();
 }else return false;
 historyBoundary();return true;
}
function richTopBlocks(){
 const result=[];RICH.editor?.state.doc.forEach((node,pos,index)=>result.push({node,pos,index,id:node.attrs.blockId}));return result;
}
function activeRichBlock(){const pos=RICH.editor?.state.selection.from;return richTopBlocks().find(b=>pos>=b.pos&&pos<=b.pos+b.node.nodeSize)||richTopBlocks()[0];}
function mutateRichBlocks(action,id=RICH.activeBlock,targetIndex=null){
 if(!RICH.editor?.isEditable)return;
 const blocks=richTopBlocks(),index=blocks.findIndex(b=>b.id===id);if(index<0)return;
 const nodes=blocks.map(b=>b.node);let selected=index;
 if(action==='delete'){nodes.splice(index,1);selected=Math.min(index,nodes.length-1);}
 else if(action==='duplicate'){const json=nodes[index].toJSON();json.attrs={...json.attrs,blockId:crypto.randomUUID()};nodes.splice(index+1,0,RICH.editor.schema.nodeFromJSON(json));selected=index+1;}
 else {const next=targetIndex===null?index+(action==='up'?-1:1):targetIndex;if(next<0||next>=nodes.length||next===index)return;nodes.splice(next,0,nodes.splice(index,1)[0]);selected=next;}
 if(!nodes.length)nodes.push(RICH.editor.schema.nodes.paragraph.create({blockId:crypto.randomUUID()}));
 historyBoundary();let tr=RICH.editor.state.tr.replaceWith(0,RICH.editor.state.doc.content.size,BlockEngine.Fragment.fromArray(nodes));const pos=nodes.slice(0,Math.max(0,selected)).reduce((n,node)=>n+node.nodeSize,0);tr=tr.setSelection(BlockEngine.TextSelection.near(tr.doc.resolve(Math.min(pos+1,tr.doc.content.size))));RICH.editor.view.dispatch(tr);RICH.editor.commands.focus();historyBoundary();
}
const blockControls=el('div','block-controls');blockControls.id='blockControls';blockControls.hidden=true;
for(const [action,label]of [['drag','⋮⋮'],['up','↑'],['down','↓'],['duplicate','⧉'],['delete','×']]){
 const button=el('button','',label);button.title={drag:'블록 끌어서 이동',up:'블록 위로',down:'블록 아래로',duplicate:'블록 복제',delete:'블록 삭제'}[action];button.setAttribute('aria-label',button.title);button.onmousedown=e=>{if(action!=='drag')e.preventDefault();};
 if(action==='drag'){
  button.dataset.blockDrag='true';button.style.cursor='grab';
  button.onpointerdown=event=>{
   if(event.button!==0)return;event.preventDefault();const id=RICH.activeBlock,documentId=APP.activeId,start={x:event.clientX,y:event.clientY};let target=null,highlight=null,moving=false;
   button.setPointerCapture(event.pointerId);
   const cleanup=()=>{highlight?.classList.remove('block-drop-target');button.onpointermove=null;button.onpointerup=null;button.onpointercancel=null;};
   button.onpointermove=e=>{moving=moving||Math.hypot(e.clientX-start.x,e.clientY-start.y)>4;if(!moving)return;const hit=RICH.editor.view.posAtCoords({left:e.clientX,top:e.clientY});target=richTopBlocks().find(b=>hit&&hit.pos>=b.pos&&hit.pos<=b.pos+b.node.nodeSize);highlight?.classList.remove('block-drop-target');highlight=target?RICH.editor.view.nodeDOM(target.pos):null;highlight?.classList.add('block-drop-target');};
   button.onpointerup=e=>{if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);const chosen=target;cleanup();if(moving&&chosen&&APP.activeId===documentId)mutateRichBlocks('move',id,chosen.index);};
   button.onpointercancel=cleanup;
  };
 }
 else button.onclick=()=>mutateRichBlocks(action);
 blockControls.append(button);
}document.body.append(blockControls);
function updateBlockControls(block){
 if(!RICH.editor?.isEditable||APP.view==='edit'){blockControls.hidden=true;return;}
 const current=block||activeRichBlock();if(!current)return;RICH.activeBlock=current.id;
 const dom=RICH.editor.view.nodeDOM(current.pos);if(!dom?.getBoundingClientRect)return;
 const rect=dom.getBoundingClientRect(),bounds=$('#preview').getBoundingClientRect();
 if(rect.bottom<bounds.top||rect.top>bounds.bottom){blockControls.hidden=true;return;}
 blockControls.style.left=Math.max(bounds.left+4,rect.left-12)+'px';blockControls.style.top=Math.max(bounds.top+4,rect.top-27)+'px';blockControls.hidden=false;
}
$('#preview').addEventListener('mousemove',e=>{const hit=RICH.editor?.view.posAtCoords({left:e.clientX,top:e.clientY});if(!hit)return;updateBlockControls(richTopBlocks().find(b=>hit.pos>=b.pos&&hit.pos<=b.pos+b.node.nodeSize));});
$('#preview').addEventListener('scroll',()=>requestAnimationFrame(()=>{updateBlockControls();updateSelectionBubble();updateSlashMenu();}));
$('#preview').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-md-block'))e.preventDefault();},true);
$('#preview').addEventListener('drop',e=>{const raw=e.dataTransfer.getData('application/x-md-block');if(!raw)return;e.preventDefault();e.stopImmediatePropagation();const item=JSON.parse(raw);if(item.document!==APP.activeId)return;const hit=RICH.editor.view.posAtCoords({left:e.clientX,top:e.clientY}),target=richTopBlocks().find(b=>hit&&hit.pos>=b.pos&&hit.pos<=b.pos+b.node.nodeSize);if(target)mutateRichBlocks('move',item.id,target.index);},true);
const slashMenu=el('div','slash-menu');slashMenu.id='slashMenu';slashMenu.hidden=true;document.body.append(slashMenu);
const SLASH=[['paragraph','텍스트'],['heading1','제목 1'],['heading2','제목 2'],['heading3','제목 3'],['bullet','글머리 목록'],['number','번호 목록'],['task','체크리스트'],['quote','인용'],['table','표'],['fence','코드 블록'],['image','이미지'],['rule','구분선']];
let slashState=null;
function updateSlashMenu(){
 if(!RICH.editor?.isEditable||!RICH.editor.isFocused||RICH.editor.isActive('codeBlock')){slashMenu.hidden=true;slashState=null;return;}
 const s=RICH.editor.state.selection,$from=s.$from,text=$from.parent.textBetween(0,$from.parentOffset,'',''),match=text.match(/^\/([^\s/]*)$/);
 if(!s.empty||!match){slashMenu.hidden=true;slashState=null;return;}
 const items=SLASH.filter(item=>(item[0]+item[1]).toLowerCase().includes(match[1].toLowerCase()));if(!items.length){slashMenu.hidden=true;return;}
 slashState={from:s.from-match[0].length,to:s.from,items,index:Math.min(slashState?.index||0,items.length-1)};
 slashMenu.replaceChildren(...items.map(([command,label],i)=>{const button=el('button',i===slashState.index?'selected':'',label);button.onmousedown=e=>e.preventDefault();button.onclick=()=>runSlash(command);return button;}));
 const rect=RICH.editor.view.coordsAtPos(s.from);slashMenu.style.left=Math.min(rect.left,innerWidth-220)+'px';slashMenu.style.top=Math.min(rect.bottom+6,innerHeight-350)+'px';slashMenu.hidden=false;
}
function runSlash(command){
 if(!slashState)return;const {from,to}=slashState;slashState=null;slashMenu.hidden=true;historyBoundary();RICH.editor.chain().focus().deleteRange({from,to}).run();if(command==='paragraph')RICH.editor.commands.setParagraph();else previewCommand(command);historyBoundary();
}
function handleRichKey(event){
 if(slashState&&!slashMenu.hidden){
  if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();slashState.index=(slashState.index+(event.key==='ArrowDown'?1:-1)+slashState.items.length)%slashState.items.length;updateSlashMenu();return true;}
  if(event.key==='Enter'){event.preventDefault();runSlash(slashState.items[slashState.index][0]);return true;}
  if(event.key==='Escape'){slashState=null;slashMenu.hidden=true;return true;}
 }
 return false;
}
const bubble=el('div','selection-bubble');bubble.id='selectionBubble';bubble.hidden=true;for(const [command,label]of [['bold','B'],['italic','I'],['underline','U'],['link','링크'],['document','문서 연결']]){const button=el('button','',label);button.onmousedown=e=>e.preventDefault();button.onclick=()=>command==='document'?openDocumentLink():previewCommand(command);bubble.append(button);}document.body.append(bubble);
function updateSelectionBubble(){
 if(!RICH.editor?.isEditable||RICH.editor.state.selection.empty||RICH.editor.state.selection instanceof BlockEngine.CellSelection){bubble.hidden=true;return;}
 const rect=RICH.editor.view.coordsAtPos(RICH.editor.state.selection.from);bubble.style.left=Math.min(rect.left,innerWidth-280)+'px';bubble.style.top=Math.max(70,rect.top-40)+'px';bubble.hidden=false;
}
$('#previewEditable').onchange=()=>{RICH.enabled=$('#previewEditable').checked;localStorage.setItem('md-editor-direct-v2',String(RICH.enabled));syncPreviewEditable();};
$('#preview').addEventListener('pointerdown',flushSourcePreview);
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('mousedown',e=>{if(previewHasFocus())e.preventDefault();}));
document.addEventListener('keydown',event=>{
 if(event.isComposing||!(event.ctrlKey||event.metaKey)||event.altKey||!previewHasFocus())return;
 const key=event.key.toLowerCase(),command={b:'bold',i:'italic',u:'underline',k:'link'}[key];
 if(command){event.preventDefault();event.stopImmediatePropagation();previewCommand(command);}
},true);
document.addEventListener('DOMContentLoaded',syncPreviewEditable);
