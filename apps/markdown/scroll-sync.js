'use strict';
// Ignore the scroll event caused by a matching programmatic move, while allowing
// an intervening user scroll (a different position) to take control immediately.
let pendingScrollSync=new WeakMap();
function syncEditorScroll(origin,target,reverse=false){
 const pending=pendingScrollSync.get(origin);
 if(pending!==undefined){
  pendingScrollSync.delete(origin);
  if(Math.abs(origin.scrollTop-pending)<1)return;
 }
 if(!$('#syncScroll').checked||(reverse&&!$('#syncScrollBoth').checked))return;
 if(!origin.clientHeight||!target.clientHeight)return;
 const originRange=origin.scrollHeight-origin.clientHeight;
 const targetRange=target.scrollHeight-target.clientHeight;
 if(originRange<=0||targetRange<=0)return;
 const ratio=Math.max(0,Math.min(1,origin.scrollTop/originRange));
 const position=ratio*targetRange;
 if(Math.abs(target.scrollTop-position)<0.5)return;
 target.scrollTop=position;
 pendingScrollSync.set(target,target.scrollTop);
}
function updateScrollOptions(){
 $('#syncScrollBoth').disabled=!$('#syncScroll').checked;
 pendingScrollSync=new WeakMap();
 if(typeof saveDocumentViewOptions==='function')saveDocumentViewOptions();
}
$('#syncScroll').checked=localStorage.getItem('md-editor-scroll-sync')!=='false';
$('#syncScrollBoth').checked=localStorage.getItem('md-editor-scroll-sync-both')==='true';
$('#syncScrollBoth').disabled=!$('#syncScroll').checked;
$('#syncScroll').addEventListener('change',updateScrollOptions);
$('#syncScrollBoth').addEventListener('change',updateScrollOptions);
$('#editor').addEventListener('scroll',()=>syncEditorScroll($('#editor'),$('#preview')),{passive:true});
$('#preview').addEventListener('scroll',()=>syncEditorScroll($('#preview'),$('#editor'),true),{passive:true});

// Existing browser preferences seed older documents; reading a document does not alter its data.
const documentViewDefaults=Object.freeze({directEdit:RICH.enabled,syncScroll:$('#syncScroll').checked,syncScrollBoth:$('#syncScrollBoth').checked});
function defaultDocumentViewOptions(){return {...documentViewDefaults};}
function applyDocumentViewOptions(doc){
 const saved=doc.editorOptions&&typeof doc.editorOptions==='object'&&!Array.isArray(doc.editorOptions)?doc.editorOptions:{};
 const options={...saved};for(const [key,value]of Object.entries(documentViewDefaults))if(typeof options[key]!=='boolean')options[key]=value;
 RICH.enabled=options.directEdit;$('#previewEditable').checked=options.directEdit;
 $('#syncScroll').checked=options.syncScroll;$('#syncScrollBoth').checked=options.syncScrollBoth;$('#syncScrollBoth').disabled=!options.syncScroll;
 pendingScrollSync=new WeakMap();
}
function saveDocumentViewOptions(){
 if(APP.loading||!currentDoc()||$('#editor').disabled)return;
 currentDoc().editorOptions={...currentDoc().editorOptions,directEdit:$('#previewEditable').checked,syncScroll:$('#syncScroll').checked,syncScrollBoth:$('#syncScrollBoth').checked};
 changed(false);
}
