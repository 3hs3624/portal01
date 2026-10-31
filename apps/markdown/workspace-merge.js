(function(root){
 'use strict';
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function merge(base,mine,disk,choices={}){
  const conflicts=[],copies=[];
  function items(kind,fields){
   const b=new Map((base[kind]||[]).map(i=>[i.id,i])),m=new Map((mine[kind]||[]).map(i=>[i.id,i])),d=new Map((disk[kind]||[]).map(i=>[i.id,i])),result=[];
   for(const id of new Set([...b.keys(),...m.keys(),...d.keys()])){
    const before=b.get(id),local=m.get(id),remote=d.get(id),key=kind+':'+id;
    const semantic=item=>item?Object.fromEntries(fields.map(f=>[f,item[f]??(f==='favorite'?false:'')])):null;
    if(equal(semantic(local),semantic(remote))){if(local)result.push(local);continue;}
    if(equal(semantic(local),semantic(before))){if(remote)result.push(remote);continue;}
    if(equal(semantic(remote),semantic(before))){if(local)result.push(local);continue;}
    let item=local&&remote?{...remote,...local}:null,collision=!local||!remote;
    if(item)for(const field of fields){const a=before?.[field]??(field==='favorite'?false:''),l=local[field]??(field==='favorite'?false:''),r=remote[field]??(field==='favorite'?false:'');if(equal(l,r)||equal(r,a))item[field]=l;else if(equal(l,a))item[field]=r;else collision=true;}
    if(!collision){item.updatedAt=[local.updatedAt||'',remote.updatedAt||''].sort().at(-1);result.push(item);continue;}
    const choice=choices[key];
    if(!choice){conflicts.push({key,kind,id,mine:local||null,disk:remote||null,base:before||null});if(remote)result.push(remote);continue;}
    if(choice==='mine'&&local)result.push(local);
    if(choice==='disk'&&remote)result.push(remote);
    if(choice==='both'){if(remote)result.push(remote);if(local&&kind==='documents'){const newId=(choices[key+':copyId']||id+'-local-copy'),title=(local.title+' (내 변경 사본)').slice(0,200);copies.push({...local,id:newId,title});}}
   }
   return result;
  }
  let folders=items('folders',['name','parentId']),documents=items('documents',['title','content','folderId','favorite']);
  documents.push(...copies);const ids=new Set(folders.map(f=>f.id));
  // Keep content if a chosen folder deletion leaves a document without a parent.
  documents=documents.map(d=>ids.has(d.folderId)?d:{...d,folderId:''});
  folders=folders.map(f=>ids.has(f.parentId)?f:{...f,parentId:''});
  const workspace={...mine,folders,documents,activeId:documents.some(d=>d.id===mine.activeId)?mine.activeId:documents[0]?.id};
  try{if(root.FolderModel)root.FolderModel.validate(folders,documents);else if(typeof require==='function')require('./folder-model.js').validate(folders,documents);}
  catch(error){conflicts.push({key:'structure',kind:'structure',message:error.message});}
  return {workspace,conflicts};
 }
 const api={merge};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WorkspaceMerge=api;
})(typeof globalThis!=='undefined'?globalThis:this);
