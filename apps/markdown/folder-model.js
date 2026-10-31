(function(root){
 'use strict';
 function descendants(folders,id){
  const result=new Set([id]);let changed=true;
  while(changed){changed=false;for(const f of folders)if(result.has(f.parentId||'')&&!result.has(f.id)){result.add(f.id);changed=true;}}
  return result;
 }
 function validate(folders,documents){
  if(!Array.isArray(folders)||folders.length>200)throw Error('폴더는 최대 200개까지 지원합니다.');
  const ids=new Set(),names=new Set();
  for(const f of folders){
   if(!f||typeof f.id!=='string'||!f.id||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim()||f.name.length>80||f.parentId!==undefined&&typeof f.parentId!=='string')throw Error('폴더 이름 또는 식별자 형식 오류');
   ids.add(f.id);const key=JSON.stringify([f.parentId||'',f.name.trim()]);if(names.has(key))throw Error('같은 위치에 같은 이름의 폴더가 있습니다.');names.add(key);
  }
  const byId=new Map(folders.map(f=>[f.id,f]));
  for(const f of folders){
   const seen=new Set([f.id]);let parent=f.parentId||'',depth=1;
   while(parent){if(!ids.has(parent)||seen.has(parent))throw Error('폴더 위치가 없거나 순환 구조입니다.');seen.add(parent);parent=byId.get(parent).parentId||'';if(++depth>20)throw Error('폴더는 최대 20단계까지 만들 수 있습니다.');}
  }
  for(const d of documents)if(d.folderId!==undefined&&(typeof d.folderId!=='string'||d.folderId&&!ids.has(d.folderId)))throw Error('문서의 폴더를 찾을 수 없습니다.');
  return folders;
 }
 const api={validate,descendants};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FolderModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
