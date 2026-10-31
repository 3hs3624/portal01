'use strict';
const HISTORY={records:new Map(),area:'source',epoch:0,eventKind:'change',restoring:false};
function historyBoundary(){HISTORY.epoch++;}
function historyRecord(){
 const d=currentDoc();if(!d)return null;
 let r=HISTORY.records.get(d.id);
 if(!r){r={entries:[{content:d.content,area:'source',start:0,end:0}],index:0,time:0,key:'',used:Date.now()};HISTORY.records.set(d.id,r);}
 r.used=Date.now();return r;
}
function historySnapshot(){
 const editor=$('#editor'),snapshot={content:currentDoc().content,area:HISTORY.area,start:editor.selectionStart,end:editor.selectionEnd};
 if(HISTORY.area==='preview'){
  if(RICH.editor)snapshot.engineSelection=RICH.editor.state.selection.toJSON();
  const s=getSelection();if(s?.rangeCount&&$('#preview').contains(s.anchorNode)&&$('#preview').contains(s.focusNode)){
   const offset=(node,n)=>{const r=document.createRange();r.selectNodeContents($('#preview'));r.setEnd(node,n);return r.toString().length;};
   snapshot.start=Math.min(offset(s.anchorNode,s.anchorOffset),offset(s.focusNode,s.focusOffset));snapshot.end=Math.max(offset(s.anchorNode,s.anchorOffset),offset(s.focusNode,s.focusOffset));
  }
 }
 return snapshot;
}
function trimEditHistory(){
 const active=historyRecord();if(!active)return;
 while(active.entries.length>60){active.entries.shift();active.index--;}
 const size=()=>[...HISTORY.records.values()].reduce((n,r)=>n+r.entries.reduce((m,e)=>m+e.content.length*2,0),0);
 for(const [id,r]of [...HISTORY.records].sort((a,b)=>a[1].used-b[1].used)){if(size()<=32*1024*1024)break;if(id!==APP.activeId)HISTORY.records.delete(id);}
 while(size()>32*1024*1024&&active.entries.length>2){if(active.index>1){active.entries.shift();active.index--;}else active.entries.pop();}
}
function recordEditHistory(){
 if(HISTORY.restoring||APP.loading)return;
 const r=historyRecord(),snapshot=historySnapshot();if(!r||r.entries[r.index].content===snapshot.content){syncEditHistory();return;}
 const now=Date.now(),key=HISTORY.epoch+':'+HISTORY.area+':'+HISTORY.eventKind;
 const typing=/^(insertText|insertCompositionText|deleteContentBackward|deleteContentForward)$/.test(HISTORY.eventKind);
 const branch=r.index<r.entries.length-1;
 if(branch)r.entries.splice(r.index+1);
 if(!branch&&typing&&r.index>0&&r.key===key&&now-r.time<650)r.entries[r.index]=snapshot;
 else{r.entries.push(snapshot);r.index++;}
 r.time=now;r.key=key;trimEditHistory();syncEditHistory();
}
function syncEditHistory(){
 if(!currentDoc())return;
 const r=historyRecord(),area=APP.view==='preview'?'preview':APP.view==='edit'?'source':HISTORY.area;
 const locked=APP.loading||$('#editor').disabled||area==='preview'&&!RICH.enabled;
 $('#undoEdit').disabled=locked||r.index<=0;$('#redoEdit').disabled=locked||r.index>=r.entries.length-1;
}
function restorePreviewSelection(start,end){
 if(RICH.editor){RICH.editor.commands.focus();RICH.editor.commands.setTextSelection({from:Math.max(1,Math.min(start,RICH.editor.state.doc.content.size-1)),to:Math.max(1,Math.min(end,RICH.editor.state.doc.content.size-1))});return;}
 const preview=$('#preview'),walker=document.createTreeWalker(preview,NodeFilter.SHOW_TEXT),nodes=[];let node;
 while(node=walker.nextNode())nodes.push(node);
 const at=offset=>{for(const n of nodes){if(offset<=n.length)return [n,Math.max(0,offset)];offset-=n.length;}return nodes.length?[nodes.at(-1),nodes.at(-1).length]:[preview,0];};
 const a=at(start),b=at(end),range=document.createRange();range.setStart(...a);range.setEnd(...b);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
}
function runEditHistory(direction){
 const r=historyRecord();if(!r)return;
 syncEditHistory();if($('#'+(direction==='undo'?'undoEdit':'redoEdit')).disabled)return;
 r.index+=direction==='undo'?-1:1;const snapshot=r.entries[r.index];
 HISTORY.restoring=true;historyBoundary();
 try{
  clearTimeout(APP.previewTimer);APP.previewTimer=0;currentDoc().content=snapshot.content;$('#editor').value=snapshot.content;changed();renderEditor();
  const area=APP.view==='preview'?'preview':APP.view==='edit'?'source':HISTORY.area;
  if(area==='preview'){if(RICH.editor){RICH.editor.commands.focus();const s=snapshot.engineSelection;const from=s?.anchor??s?.from??1,to=s?.head??s?.to??from;RICH.editor.commands.setTextSelection({from:Math.max(1,Math.min(from,RICH.editor.state.doc.content.size-1)),to:Math.max(1,Math.min(to,RICH.editor.state.doc.content.size-1))});}else{$('#preview').focus();restorePreviewSelection(snapshot.start,snapshot.end);}}
  else{$('#editor').focus();$('#editor').setSelectionRange(Math.min(snapshot.start,snapshot.content.length),Math.min(snapshot.end,snapshot.content.length));}
  updateCursor();
 }finally{HISTORY.restoring=false;syncEditHistory();queueTableTools();}
}
function resetEditHistory(){HISTORY.records.clear();historyBoundary();}
for(const area of ['editor','preview']){
 $('#'+area).addEventListener('focusin',()=>{HISTORY.area=area==='editor'?'source':'preview';historyBoundary();syncEditHistory();});
 $('#'+area).addEventListener('input',e=>{HISTORY.eventKind=e.inputType||'change';HISTORY.area=area==='editor'?'source':'preview';},true);
 $('#'+area).addEventListener('compositionstart',historyBoundary);
 $('#'+area).addEventListener('compositionend',historyBoundary);
}
$('#preview').addEventListener('change',()=>{HISTORY.area='preview';HISTORY.eventKind='checkbox';historyBoundary();},true);
for(const button of document.querySelectorAll('[data-history]')){
 button.addEventListener('mousedown',e=>e.preventDefault());button.onclick=()=>runEditHistory(button.dataset.history);
}
document.addEventListener('keydown',e=>{
 if(e.isComposing||!(e.ctrlKey||e.metaKey)||e.altKey)return;
 const target=document.activeElement;if(target!==$('#editor')&&!$('#preview').contains(target)&&!target?.matches('[data-history]'))return;
 const key=e.key.toLowerCase();if(key!=='z'&&key!=='y')return;
 e.preventDefault();e.stopImmediatePropagation();runEditHistory(key==='y'||e.shiftKey?'redo':'undo');
},true);
$('#previewEditable').addEventListener('change',syncEditHistory);
document.addEventListener('DOMContentLoaded',syncEditHistory);
