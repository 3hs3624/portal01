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
 if(studioNeedsHTML(node))return studioSerialize(node);
 const dom=BlockEngine.DOMSerializer.fromSchema(RICH.editor.schema).serializeNode(node);
 if(node.type.name==='table')for(const colgroup of dom.querySelectorAll('colgroup'))colgroup.remove();
 return markdownWriter.turndown(dom);
}
function ensureRichEditor(){
 if(RICH.editor)return RICH.editor;
 RICH.editor=BlockEngine.create($('#preview'),{
  extensions:studioExtensions(),
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
   if(!nodes.length||(!template.content.textContent.trim()&&!template.content.querySelector('img,hr,table,[data-studio-kind],[data-studio-toggle],[data-studio-widget],[data-studio-embed]'))&&token.type==='html')nodes=[{type:'rawBlock',attrs:{raw}}];
   nodes.forEach((node,index)=>{
    node.attrs={...node.attrs,blockId:node.attrs?.blockId||crypto.randomUUID()};content.push(node);
    if(nodes.length===1)RICH.raw.set(node.attrs.blockId,{signature:signature(node),raw});
   });
  }
  RICH.trivia+=text.slice(position);
  if(!content.length)content.push({type:'paragraph',attrs:{blockId:crypto.randomUUID()}});
  editor.commands.setContent({type:'doc',content},{emitUpdate:false,parseOptions:{preserveWhitespace:'full'}});
  RICH.markdown=text;
 }finally{RICH.loading=false;}
 syncPreviewEditable();updateBlockControls();if(typeof restoreBlockLink==='function')restoreBlockLink();
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
 clearTimeout(APP.previewTimer);APP.previewTimer=0;currentDoc().content=text;$('#editor').value=text;RICH.markdown=text;changed();renderEditor(false);updateBlockControls();updateSlashMenu();document.dispatchEvent(new Event('studio:document-changed'));
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
function activeRichBlock(){const pos=RICH.editor?.state.selection.from;return richTopBlocks().find(b=>pos>=b.pos&&pos<b.pos+b.node.nodeSize)||richTopBlocks()[0];}
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
