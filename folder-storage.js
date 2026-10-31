/* Per-account folder handles and explicit browser snapshots. Never stores API credentials. */
(() => {
 const app=location.pathname.split('/apps/')[1]?.split('/')[0];
 const names={markdown:'Write-Studio',projects:'Project-Management',insight:'Insight-BI'};
 const db=new Promise((resolve,reject)=>{const r=indexedDB.open('portal-storage-connections',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('저장소 연결 정보를 보관할 수 없습니다.'))});
 async function record(key,value,remove=false){const d=await db;return new Promise((resolve,reject)=>{const tx=d.transaction('records',value!==undefined||remove?'readwrite':'readonly'),s=tx.objectStore('records');let result;const r=remove?s.delete(key):value!==undefined?s.put(value,key):s.get(key);r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('브라우저 저장 실패'))})}
 const folderType=p=>['local','onedrive','gdrive'].includes(p);
 async function directory(provider,create=false){const c=await record('connection:'+provider);if(!c)throw Error('폴더를 먼저 연결해 주세요.');if(await c.handle.queryPermission({mode:'readwrite'})!=='granted')throw Error('폴더 접근 승인이 필요합니다. 연결 / 권한 승인을 눌러 주세요.');try{const root=await c.handle.getDirectoryHandle('3HS-Workspace',{create});return await root.getDirectoryHandle(names[app],{create})}catch(e){if(e.name==='NotFoundError'&&!create)return null;throw e}}
 async function read(provider){
  if(provider==='browser')return await record('snapshot:'+app)||{hasWorkspace:false,revision:null};
  const dir=await directory(provider);if(!dir)return {hasWorkspace:false,revision:null};let file;
  try{file=await (await dir.getFileHandle('workspace.json')).getFile()}catch(e){if(e.name==='NotFoundError')return {hasWorkspace:false,revision:null};throw e}
  if(file.size>50*1024*1024)throw Error('작업공간 파일은 최대 50MB입니다.');
  let data;try{data=JSON.parse(await file.text())}catch{throw Error('작업공간 파일이 손상되었습니다. 파일을 덮어쓰지 말고 백업을 확인해 주세요.')}
  if(data.format!=='3hs-workspace'||data.version!==1||data.app!==app||typeof data.revision!=='string'||!data.workspace||!Number.isFinite(Date.parse(data.savedAt)))throw Error('이 앱의 지원되는 작업공간 파일이 아닙니다.');
  return {hasWorkspace:true,...data};
 }
 async function writeFile(dir,name,text){const handle=await dir.getFileHandle(name,{create:true}),stream=await handle.createWritable();try{await stream.write(text);await stream.close()}catch(e){await stream.abort().catch(()=>{});throw e}}
 const lock=(provider,fn)=>navigator.locks?navigator.locks.request('3hs-storage:'+window.PortalUserId+':'+app,fn):fn();
 window.PortalFolderStorage={
  supported:()=>typeof showDirectoryPicker==='function'&&window.isSecureContext,
  async info(provider){const connection=folderType(provider)?await record('connection:'+provider):{name:'이 브라우저',type:'browser'};if(!connection)return {connected:false};const data=await read(provider);return {...data,connected:true,name:connection.name,folder:connection.handle?.name}},
  async connect(provider,name){if(!folderType(provider))throw Error('폴더 유형을 선택하세요.');if(!name.trim()||name.length>80)throw Error('저장소 이름은 1~80자로 입력하세요.');if(!this.supported())throw Error('폴더 연결은 PC용 Chrome 또는 Edge에서 지원됩니다. 브라우저 또는 Supabase 저장소를 사용해 주세요.');
   // Invoke picker before any await to preserve the user activation.
   const handle=await showDirectoryPicker({mode:'readwrite',id:'3hs-'+app});
   if(await handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('폴더 접근이 승인되지 않았습니다.');
   await record('connection:'+provider,{name:name.trim(),type:provider,handle});return this.info(provider);
  },
  async authorize(provider){const c=await record('connection:'+provider);if(!c)throw Error('연결된 폴더가 없습니다.');if(await c.handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('폴더 접근이 승인되지 않았습니다.');return this.info(provider)},
  disconnect:provider=>record('connection:'+provider,undefined,true),
  load:read,
  async save(provider,workspace,expected){if(new Blob([JSON.stringify(workspace)]).size>49*1024*1024)throw Error('작업공간은 최대 49MB입니다.');return lock(provider,async()=>{
   const before=await read(provider);if((before.revision??null)!==(expected??null))throw Error('다른 탭·기기의 저장 내용이 변경되었습니다. 연결 다시 확인 후 불러와 비교하세요. 자동 덮어쓰기는 하지 않습니다.');
   const next={format:'3hs-workspace',version:1,app,workspace,revision:crypto.randomUUID(),savedAt:new Date().toISOString(),hasWorkspace:true};
   if(provider==='browser')await record('snapshot:'+app,next);
   else {const dir=await directory(provider,true);if(before.hasWorkspace)await writeFile(dir,'workspace.previous.json',JSON.stringify(before));const check=await read(provider);if((check.revision??null)!==(expected??null))throw Error('저장 중 외부 변경이 확인되었습니다. 다시 불러와 비교해 주세요.');await writeFile(dir,'workspace.json',JSON.stringify(next))}
   return next;
  })}
 };
})();
