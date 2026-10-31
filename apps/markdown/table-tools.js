'use strict';
const TABLE_UI={mode:'',frame:0};
function tableLineCells(line){
 const cells=[];let start=0;
 for(let i=0;i<line.length;i++){
  if(line[i]==='\\'){i++;continue}
  if(line[i]==='|'){cells.push({text:line.slice(start,i).trim(),start,end:i});start=i+1;}
 }
 cells.push({text:line.slice(start).trim(),start,end:line.length});
 if(line.trimStart().startsWith('|'))cells.shift();
 // An escaped trailing pipe belongs to its cell.
 if(cells.length>1&&cells.at(-1).text===''&&cells.at(-1).start>0)cells.pop();
 return cells;
}
function sourceTableContext(){
 const text=$('#editor').value,pos=$('#editor').selectionStart;let offset=0;
 for(const token of marked.lexer(text,{gfm:true})){
  const end=offset+token.raw.length;
  if(token.type==='table'&&pos>=offset&&pos<end){
   const lines=token.raw.split('\n').slice(0,token.rows.length+2);
   const contentLength=lines.join('\n').length;
   if(pos>offset+contentLength)return null;
   const width=token.header.length;
   const normalize=line=>{const cells=tableLineCells(line).map(c=>c.text);return Array.from({length:width},(_,i)=>cells[i]||'');};
   const rows=[normalize(lines[0]),...lines.slice(2).map(normalize)];
   const line=Math.min(lines.length-1,text.slice(offset,pos).split('\n').length-1);
   const columnOffset=pos-offset-lines.slice(0,line).reduce((n,l)=>n+l.length+1,0);
   const cells=tableLineCells(lines[line]);
   let column=cells.findIndex(c=>columnOffset<=c.end);if(column<0)column=width-1;
   return {mode:'source',start:offset,end,rows,align:normalize(lines[1]),row:Math.max(0,line>1?line-1:0),column:Math.min(column,width-1),trailing:token.raw.slice(contentLength)};
  }
  offset=end;
 }
 return null;
}
function selectedPreviewCell(){
 const selection=window.getSelection();if(!selection?.rangeCount)return null;
 const nodes=[selection.anchorNode,selection.focusNode],cells=nodes.map(node=>(node?.nodeType===1?node:node?.parentElement)?.closest('td,th'));
 if(!cells[0]||cells[0]!==cells[1]||!$('#preview').contains(cells[0]))return null;
 return cells[0];
}
function currentTableContext(){
 if(APP.loading||$('#editor').disabled)return null;
 if(TABLE_UI.mode==='source')return sourceTableContext();
 if(TABLE_UI.mode==='preview'&&RICH.enabled){
  if(RICH.editor)return engineTableContext();
  const cell=selectedPreviewCell();if(!cell)return null;const table=cell.closest('table');
  if(Array.from(table.rows).some(row=>Array.from(row.cells).some(c=>c.colSpan!==1||c.rowSpan!==1)))return null;
  return {mode:'preview',table,cell,row:cell.parentElement.rowIndex,column:cell.cellIndex};
 }
 return null;
}
function updateTableTools(){
 TABLE_UI.frame=0;const context=currentTableContext();
 const previewMode=APP.view==='preview'||TABLE_UI.mode==='preview'||(APP.view==='split'&&TABLE_UI.mode!=='source');
 const editable=!APP.loading&&!$('#editor').disabled&&(!previewMode||RICH.enabled);
 $('.table-tools').hidden=!editable;
 $('[data-command=table]').disabled=!editable;
 document.querySelectorAll('[data-table-action]').forEach(b=>b.disabled=!context);
 $('#tableSelectionLabel').textContent=context?(context.row===0?'머리글':'행 '+(context.row+1))+' · 열 '+(context.column+1):previewMode?'표 안의 셀을 클릭하세요':'표 안에 커서를 두세요';
}
function queueTableTools(){if(!TABLE_UI.frame)TABLE_UI.frame=requestAnimationFrame(updateTableTools);}
function tableMarkdown(rows,align){
 const line=cells=>'| '+cells.join(' | ')+' |';
 return [line(rows[0]),line(align),...rows.slice(1).map(line)].join('\n');
}
function editSourceTable(context,action){
 const rows=context.rows.map(row=>row.slice()),align=context.align.slice();let row=context.row,column=context.column;
 if(action==='rowAdd'){rows.splice(row+1,0,Array(align.length).fill(''));row++;}
 if(action==='columnAdd'){rows.forEach((r,i)=>r.splice(column+1,0,i===0?'새 열':''));align.splice(column+1,0,'---');column++;}
 if(action==='rowDelete')rows.splice(row,1);
 if(action==='columnDelete'){rows.forEach(r=>r.splice(column,1));align.splice(column,1);}
 const removing=!rows.length||!align.length;
 if(removing&&!confirm('마지막 행 또는 열을 삭제하면 표 전체가 삭제됩니다. 계속할까요?'))return;
 row=Math.min(row,rows.length-1);column=Math.min(column,align.length-1);
 let replacement='',position=context.start;
 if(!removing){
  replacement=tableMarkdown(rows,align)+context.trailing;
  const lineIndex=row===0?0:row+1,lines=replacement.split('\n'),cell=tableLineCells(lines[lineIndex])[column];
  position+=lines.slice(0,lineIndex).reduce((n,l)=>n+l.length+1,0)+cell.start+1;
 }
 const text=$('#editor').value;
 applyEdit({text:text.slice(0,context.start)+replacement+text.slice(context.end),start:position,end:position});
}
function editPreviewTable(context,action){
 const table=context.table.cloneNode(true);let row=context.row,column=context.column;
 if(action==='rowAdd'){
  const fresh=document.createElement('tr');
  for(const cell of table.rows[row].cells){const td=document.createElement('td');if(cell.hasAttribute('align'))td.setAttribute('align',cell.getAttribute('align'));td.append(document.createElement('br'));fresh.append(td);}
  if(table.rows[row].parentElement.tagName==='THEAD'){
   let body=table.tBodies[0];if(!body)body=table.createTBody();body.prepend(fresh);
  }else table.rows[row].after(fresh);
  row++;
 }
 if(action==='columnAdd'){
  Array.from(table.rows).forEach((r,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.textContent='새 열';else cell.append(document.createElement('br'));r.cells[column].after(cell);});column++;
 }
 if(action==='rowDelete'){
  table.rows[row].remove();
  if(row===0&&table.rows.length){
   const next=table.rows[0],head=table.tHead||table.createTHead();
   for(const cell of Array.from(next.cells)){const th=document.createElement('th');for(const attr of cell.attributes)th.setAttribute(attr.name,attr.value);th.innerHTML=cell.innerHTML;cell.replaceWith(th);}head.append(next);
  }
 }
 if(action==='columnDelete')Array.from(table.rows).forEach(r=>r.cells[column].remove());
 const removing=!table.rows.length||!table.rows[0].cells.length;
 if(removing&&!confirm('마지막 행 또는 열을 삭제하면 표 전체가 삭제됩니다. 계속할까요?'))return;
 const index=Array.from($('#preview').querySelectorAll('table')).indexOf(context.table);
 const range=document.createRange();range.selectNode(context.table);const selection=getSelection();$('#preview').focus();selection.removeAllRanges();selection.addRange(range);
 // Replace through the browser editing command so structural changes support Undo/Redo.
 if(removing)document.execCommand('delete',false,null);
 else document.execCommand('insertHTML',false,table.outerHTML);
 onPreviewInput();
 if(!removing){
  const inserted=$('#preview').querySelectorAll('table')[index];row=Math.min(row,inserted.rows.length-1);column=Math.min(column,inserted.rows[row].cells.length-1);
  const cell=inserted.rows[row].cells[column],caret=document.createRange();caret.selectNodeContents(cell);caret.collapse(true);selection.removeAllRanges();selection.addRange(caret);
 }
}
function editSelectedTable(action){
 const context=currentTableContext();if(!context)return;
 if(typeof historyBoundary==='function')historyBoundary();
 if(context.mode==='source')editSourceTable(context,action);else if(context.mode==='engine')editEngineTable(action);else editPreviewTable(context,action);
 updateTableTools();if(typeof historyBoundary==='function')historyBoundary();
}
document.querySelectorAll('[data-table-action]').forEach(button=>{
 button.addEventListener('mousedown',e=>e.preventDefault());
 button.onclick=()=>{try{editSelectedTable(button.dataset.tableAction)}catch(e){onError(e)}};
});
document.addEventListener('focusin',e=>{
 if(e.target===$('#editor'))TABLE_UI.mode='source';
 else if($('#preview').contains(e.target))TABLE_UI.mode='preview';
 else if(!e.target.closest('.table-tools'))TABLE_UI.mode='';
 queueTableTools();
});
document.addEventListener('selectionchange',queueTableTools);
$('#editor').addEventListener('input',queueTableTools);$('#preview').addEventListener('input',queueTableTools);
$('#previewEditable').addEventListener('change',queueTableTools);
document.addEventListener('DOMContentLoaded',queueTableTools);
