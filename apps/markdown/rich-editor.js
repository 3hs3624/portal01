'use strict';
const RICH={enabled:true,composing:false};
const markdownWriter=new TurndownService({headingStyle:'atx',codeBlockStyle:'fenced',bulletListMarker:'-',emDelimiter:'*',strongDelimiter:'**'});
markdownWriter.use(turndownPluginGfm.gfm);
markdownWriter.addRule('doubleStrike',{filter:['del','s','strike'],replacement:content=>'~~'+content+'~~'});
markdownWriter.addRule('underline',{filter:'u',replacement:content=>'<u>'+content+'</u>'});
markdownWriter.addRule('taskCheckbox',{
 filter:node=>node.nodeName==='INPUT'&&node.type==='checkbox',
 replacement:(_,node)=>(node.checked?'[x]':'[ ]')
});
markdownWriter.addRule('escapedTableCell',{
 filter:['th','td'],
 replacement:(content,node)=>(node.cellIndex===0?'| ':' ')+content.trim().replace(/\|/g,'\\|').replace(/\n+/g,'<br>')+' |'
});
function previewMarkdown(){
 const clone=$('#preview').cloneNode(true);
 clone.removeAttribute('contenteditable');clone.removeAttribute('role');
 const originals=$('#preview').querySelectorAll('input[type=checkbox]');
 clone.querySelectorAll('input[type=checkbox]').forEach((input,i)=>{input.checked=originals[i].checked;if(input.checked)input.setAttribute('checked','');else input.removeAttribute('checked');});
 // Browsers represent typed line breaks as BR/DIV even inside PRE; Turndown reads textContent.
 function codeText(node){
  if(node.nodeType===Node.TEXT_NODE)return node.data;
  if(node.nodeName==='BR')return '\n';
  let text='';for(const child of node.childNodes){const block=/^(DIV|P)$/.test(child.nodeName);if(block&&text&&!text.endsWith('\n'))text+='\n';text+=codeText(child);if(block&&child.nextSibling&&!text.endsWith('\n'))text+='\n';}return text;
 }
 for(const pre of clone.querySelectorAll('pre')){const code=pre.querySelector('code')||pre;code.textContent=codeText(code);}
 return markdownWriter.turndown(clone);
}
function syncPreviewEditable(){
 if(typeof queueTableTools==='function')queueTableTools();
 if(typeof syncEditHistory==='function')syncEditHistory();
 const enabled=RICH.enabled&&!APP.loading&&!$('#editor').disabled;
 $('#preview').contentEditable=String(enabled);$('#preview').setAttribute('aria-readonly',String(!enabled));
 for(const input of $('#preview').querySelectorAll('input[type=checkbox]')){input.disabled=!enabled;input.contentEditable='false';input.setAttribute('aria-label',(input.closest('li')?.textContent||'할 일').trim());}
}
function onPreviewInput(){
 if(RICH.composing||APP.loading||$('#editor').disabled||!RICH.enabled)return;
 clearTimeout(APP.previewTimer);APP.previewTimer=0;
 const text=previewMarkdown();
 if(new TextEncoder().encode(text).length>EditorCore.MAX_DOC){renderEditor();toast('문서는 UTF-8 기준 5MB까지 편집할 수 있습니다.',true);return}
 if(text===currentDoc().content)return;
 currentDoc().content=text;$('#editor').value=text;changed();
 // Update source, outline and counters without replacing editable DOM or its caret/undo stack.
 renderEditor(false);
}
function flushSourcePreview(){
 if(APP.previewTimer){clearTimeout(APP.previewTimer);APP.previewTimer=0;renderEditor();}
}
function previewHasFocus(){return RICH.enabled&&$('#preview').contains(document.activeElement);}
function previewCommand(name){
 if(!previewHasFocus())return false;
 if(typeof historyBoundary==='function')historyBoundary();
 const native={bold:'bold',italic:'italic',underline:'underline',strike:'strikeThrough',bullet:'insertUnorderedList',number:'insertOrderedList',rule:'insertHorizontalRule'};
 const selected=window.getSelection()?.toString()||'';
 const escape=s=>el('span','',s).innerHTML;
 const insert=html=>document.execCommand('insertHTML',false,html);
 if(native[name])document.execCommand(native[name],false,null);
 else if(/^heading[123]?$/.test(name)||name==='quote')document.execCommand('formatBlock',false,name==='quote'?'blockquote':'h'+(Number(name.slice(7))||1));
 else if(name==='indent'||name==='outdent')document.execCommand(name,false,null);
 else if(name==='link'||name==='image'){
  const url=prompt(name==='link'?'링크 주소 (https:// 또는 mailto:)':'이미지 주소 (https://)','https://');
  if(url===null)return true;
  if(!/^(https?:\/\/|mailto:)/i.test(url.trim())){toast('HTTP(S) 또는 mailto 주소를 입력하세요.',true);return true}
  if(name==='link'){if(!selected)document.execCommand('insertText',false,'링크');document.execCommand('createLink',false,url.trim());}
  else if(/^https?:\/\//i.test(url.trim()))document.execCommand('insertImage',false,url.trim());
 }else if(name==='code')insert('<code>'+escape(selected||'코드')+'</code>');
 else if(name==='fence')insert('<pre><code>'+escape(selected||'코드를 입력하세요')+'</code></pre><p><br></p>');
 else if(name==='task')insert('<ul><li class="task-list-item"><input type="checkbox" contenteditable="false"> '+escape(selected||'할 일')+'</li></ul><p><br></p>');
 else if(name==='table')insert('<table><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody><tr><td>항목 1</td><td>내용</td></tr><tr><td>항목 2</td><td>내용</td></tr></tbody></table><p><br></p>');
 else return false;
 onPreviewInput();if(typeof historyBoundary==='function')historyBoundary();return true;
}
$('#previewEditable').onchange=()=>{RICH.enabled=$('#previewEditable').checked;localStorage.setItem('md-editor-preview-edit',String(RICH.enabled));syncPreviewEditable();};
if(localStorage.getItem('md-editor-preview-edit')==='false'){RICH.enabled=false;$('#previewEditable').checked=false;}
$('#preview').addEventListener('pointerdown',flushSourcePreview);
$('#preview').addEventListener('focus',flushSourcePreview);
$('#preview').addEventListener('input',onPreviewInput);
$('#preview').addEventListener('compositionstart',()=>{RICH.composing=true;});
$('#preview').addEventListener('compositionend',()=>{RICH.composing=false;onPreviewInput();});
$('#preview').addEventListener('change',e=>{if(e.target.matches('input[type=checkbox]'))onPreviewInput();});
$('#preview').addEventListener('click',e=>{
 const link=e.target.closest('a');
 if(link&&RICH.enabled&&!e.ctrlKey&&!e.metaKey)e.preventDefault();
});
// Pasting/dropping plain text avoids importing active HTML and inconsistent external formatting.
$('#preview').addEventListener('paste',e=>{
 if(!RICH.enabled||APP.loading||$('#editor').disabled)return;
 e.preventDefault();const text=e.clipboardData.getData('text/plain');document.execCommand('insertText',false,text);onPreviewInput();
});
$('#preview').addEventListener('dragover',e=>{if(RICH.enabled)e.preventDefault();});
$('#preview').addEventListener('drop',e=>{
 if(!RICH.enabled||APP.loading||$('#editor').disabled){e.preventDefault();return}e.preventDefault();
 if(e.dataTransfer.files.length){importFiles(e.dataTransfer.files).catch(onError);return}
 toast('텍스트는 붙여넣기로 추가해 주세요.');
});
$('#preview').addEventListener('keydown',e=>{
 if(e.isComposing||!RICH.enabled)return;
 const selection=window.getSelection(),node=selection?.anchorNode,element=node?.nodeType===1?node:node?.parentElement,cell=element?.closest('td,th');
 if(element?.closest('pre')&&(e.key==='Enter'||e.key==='Tab')){e.preventDefault();document.execCommand('insertText',false,e.key==='Enter'?'\n':'  ');onPreviewInput();return}
 if(e.key==='Tab'){
  e.preventDefault();
  if(cell){const cells=Array.from(cell.closest('table').querySelectorAll('th,td')),index=cells.indexOf(cell)+(e.shiftKey?-1:1);if(cells[index]){const range=document.createRange();range.selectNodeContents(cells[index]);selection.removeAllRanges();selection.addRange(range);}}
  else if(element?.closest('li'))previewCommand(e.shiftKey?'outdent':'indent');
  else document.execCommand('insertText',false,'  ');
 }else if(e.key==='Enter'&&cell){e.preventDefault();document.execCommand('insertHTML',false,'<br>');onPreviewInput();}
});
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('mousedown',e=>{if(previewHasFocus())e.preventDefault();}));
document.addEventListener('DOMContentLoaded',syncPreviewEditable);
