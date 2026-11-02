/* Pure editing operations shared by the UI and regression tests. */
(function(root){
 'use strict';
 const MAX_DOC=5*1024*1024,MAX_WORKSPACE=100*1024*1024;
 function validate(w){
  if(!w||w.format!=='md-editor-workspace'||w.version!==1||!Array.isArray(w.documents)||w.documents.length<1||w.documents.length>500)throw Error('Write Studio 작업공간 형식 또는 문서 수(1~500개)를 확인하세요.');
  const ids=new Set();
  for(const d of w.documents){
   if(!d||typeof d.id!=='string'||!d.id||ids.has(d.id)||typeof d.title!=='string'||!d.title.trim()||d.title.length>200||typeof d.content!=='string'||new TextEncoder().encode(d.content).length>MAX_DOC||typeof d.createdAt!=='string'||typeof d.updatedAt!=='string')throw Error('문서 형식 오류 · 문서 한 개는 UTF-8 기준 5MB까지 지원합니다.');
   ids.add(d.id);
  }
  if(!ids.has(w.activeId))throw Error('선택한 문서를 찾을 수 없습니다.');
  const folderModel=typeof module!=='undefined'&&module.exports?require('./folder-model.js'):root.FolderModel;
  folderModel.validate(w.folders===undefined?[]:w.folders,w.documents);
  if(new TextEncoder().encode(JSON.stringify({...w,recovery:undefined})).length>MAX_WORKSPACE)throw Error('작업공간은 100MB까지 지원합니다.');
  return w;
 }
 function edit(text,start,end,command){
  const selected=text.slice(start,end),wrap=(a,b=a,fallback='텍스트')=>({text:text.slice(0,start)+a+(selected||fallback)+b+text.slice(end),start:start+a.length,end:start+a.length+(selected||fallback).length});
  const block=snippet=>({text:text.slice(0,start)+(start&&text[start-1]!=='\n'?'\n':'')+snippet+'\n'+text.slice(end),start:start,end:start+snippet.length});
  if(command==='bold')return wrap('**');
  if(command==='italic')return wrap('*');
  if(command==='strike')return wrap('~~');
  if(command==='underline')return wrap('<u>','</u>');
  if(command==='code')return wrap('`');
  if(command==='link')return wrap('[','](https://example.com)','링크');
  if(command==='image')return wrap('![','](https://example.com/image.png)','이미지 설명');
  if(command==='fence')return block('```text\n'+(selected||'코드를 입력하세요')+'\n```');
  if(command==='table')return block('| 항목 | 내용 |\n| --- | --- |\n| 항목 1 | 내용 |\n| 항목 2 | 내용 |');
  if(command==='rule')return block('\n---\n');
  const prefixes={heading:'# ',quote:'> ',bullet:'- ',number:'1. ',task:'- [ ] ',indent:'  '};
  const lineStart=text.lastIndexOf('\n',start-1)+1;
  const last=Math.max(start,end>start&&text[end-1]==='\n'?end-1:end),next=text.indexOf('\n',last),lineEnd=next<0?text.length:next;
  let lines=text.slice(lineStart,lineEnd).split('\n');
  if(command==='outdent')lines=lines.map(l=>l.replace(/^( {1,2}|\t)/,''));
  else if(/^heading[123]?$/.test(command))lines=lines.map(l=>'#'.repeat(Number(command.slice(7))||1)+' '+l.replace(/^ {0,3}#{1,6}[ \t]+/,''));
  else if(command in prefixes)lines=lines.map((l,i)=>(command==='number'?`${i+1}. `:prefixes[command])+l);
  else return {text,start,end};
  const result=lines.join('\n');
  return {text:text.slice(0,lineStart)+result+text.slice(lineEnd),start:lineStart,end:lineStart+result.length};
 }
 function matches(text,query,caseSensitive=false){
  if(!query)return [];
  // Literal search; no regular-expression input or replacement expansion.
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),r=new RegExp(escape(query),caseSensitive?'gu':'giu');
  return Array.from(text.matchAll(r),m=>({start:m.index,end:m.index+m[0].length}));
 }
 const api={validate,edit,matches,MAX_DOC,MAX_WORKSPACE};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EditorCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
