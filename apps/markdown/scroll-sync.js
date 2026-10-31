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
 localStorage.setItem('md-editor-scroll-sync',String($('#syncScroll').checked));
 localStorage.setItem('md-editor-scroll-sync-both',String($('#syncScrollBoth').checked));
}
$('#syncScroll').checked=localStorage.getItem('md-editor-scroll-sync')!=='false';
$('#syncScrollBoth').checked=localStorage.getItem('md-editor-scroll-sync-both')==='true';
$('#syncScrollBoth').disabled=!$('#syncScroll').checked;
$('#syncScroll').addEventListener('change',updateScrollOptions);
$('#syncScrollBoth').addEventListener('change',updateScrollOptions);
$('#editor').addEventListener('scroll',()=>syncEditorScroll($('#editor'),$('#preview')),{passive:true});
$('#preview').addEventListener('scroll',()=>syncEditorScroll($('#preview'),$('#editor'),true),{passive:true});
