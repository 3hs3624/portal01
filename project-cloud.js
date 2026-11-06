/* Project Management: relational cloud storage with lossless local JSON/file compatibility. */
(function(root){
 'use strict';
 const BUCKET='portal-project-assets',LIMIT=100*1024*1024;
 const clone=v=>JSON.parse(JSON.stringify(v));
 function bytes(data){if(typeof data!=='string'||data.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw Error('프로젝트 파일 인코딩을 확인해 주세요.');return Uint8Array.from(atob(data),c=>c.charCodeAt(0))}
 function base64(data){let text='';for(let i=0;i<data.length;i+=8192)text+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(text)}
 const encode=v=>base64(new TextEncoder().encode(JSON.stringify(v)));
 function path(value){if(typeof value!=='string'||!value||value.length>300||value.startsWith('/')||value.split('/').some(x=>!x||x==='.'||x==='..'||/[\\\0]/.test(x)))throw Error('프로젝트 파일 경로가 올바르지 않습니다.');return value}
 function validate(w){if(w?.format!=='wbs-pm-cloud'||w.version!==1||!Array.isArray(w.files)||!Array.isArray(w.directories)||w.files.length>5000||w.directories.length>5000)throw Error('프로젝트 작업공간 형식을 확인해 주세요.');const names=new Set();for(const f of w.files){path(f.path);if(names.has(f.path)||typeof f.data!=='string'||f.data.length>15*1024*1024)throw Error('중복된 프로젝트 파일입니다.');names.add(f.path);bytes(f.data)}for(const d of w.directories){path(d);if(names.has(d))throw Error('프로젝트 파일·폴더 경로가 겹칩니다.')}for(const value of [...names,...w.directories]){const p=value.split('/');p.pop();while(p.length){if(names.has(p.join('/')))throw Error('파일을 폴더로 사용할 수 없습니다.');p.pop()}}if(new Blob([JSON.stringify(w)]).size>LIMIT)throw Error('프로젝트 작업공간은 최대 100MB입니다.');return w}
 async function hash(data){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('')}
 async function pack(w,put){validate(w);const assets=new Map(),manifest=[];
  async function asset(data){const digest=await hash(data);if(!assets.has(digest)){await put(digest,data);assets.set(digest,data.length)}return {hash:digest,bytes:data.length}}
  async function templates(value){if(!value||typeof value!=='object')return value;if(Array.isArray(value)){const out=[];for(const x of value)out.push(await templates(x));return out}const out=Object.create(null);for(const [k,v]of Object.entries(value)){if(k==='excelTemplate'&&v&&typeof v.data==='string'){const ref=await asset(bytes(v.data));out[k]={...clone(v),data:{portalProjectAsset:ref.hash,bytes:ref.bytes}}}else out[k]=await templates(v)}return out}
  for(const f of w.files){let doc;try{doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes(f.data)))}catch{}if(doc&&typeof doc==='object')manifest.push({path:f.path,kind:'json',document:await templates(doc)});else manifest.push({path:f.path,kind:'blob',...await asset(bytes(f.data))})}
  return {format:'portal-project-relational',version:1,directories:clone(w.directories),files:manifest};
 }
 async function unpack(pack,get){if(pack?.format!=='portal-project-relational'||pack.version!==1||!Array.isArray(pack.files)||pack.files.length>5000)throw Error('클라우드 프로젝트 형식이 올바르지 않습니다.');const cache=new Map();
  async function asset(digest,size){if(!/^[a-f0-9]{64}$/.test(digest)||!Number.isSafeInteger(size)||size<0||size>LIMIT)throw Error('첨부파일 참조가 올바르지 않습니다.');if(!cache.has(digest))cache.set(digest,(async()=>{const b=await get(digest);if(b.length!==size||await hash(b)!==digest)throw Error('첨부파일 무결성 검증에 실패했습니다.');return b})());return cache.get(digest)}
  async function templates(value){if(!value||typeof value!=='object')return value;if(Array.isArray(value)){const out=[];for(const x of value)out.push(await templates(x));return out}const out=Object.create(null);for(const [k,v]of Object.entries(value)){if(k==='excelTemplate'&&v?.data?.portalProjectAsset){out[k]={...clone(v),data:base64(await asset(v.data.portalProjectAsset,v.data.bytes))}}else out[k]=await templates(v)}return out}
  const w={format:'wbs-pm-cloud',version:1,directories:clone(pack.directories),files:[]};for(const f of pack.files){path(f.path);w.files.push({path:f.path,data:f.kind==='json'?encode(await templates(f.document)):f.kind==='blob'?base64(await asset(f.hash,f.bytes)):(()=>{throw Error('지원하지 않는 프로젝트 파일입니다.')})()})}return validate(w)
 }
 function create(client,authenticated){
  let ready=false;
  function check(){if(!authenticated())throw Error('로그인이 만료되었습니다. 포털에서 다시 로그인해 주세요.')}
  function error(e){const x=Error(e?.code==='PT409'?'다른 기기에서 프로젝트 저장본이 바뀌었습니다. 다시 불러와 비교해 주세요.':e?.code==='42501'?'프로젝트 저장 권한 또는 로그인을 확인해 주세요.':e?.code==='PGRST202'?'프로젝트 관계형 저장소 설정이 필요합니다.':e?.message||'프로젝트 클라우드 저장에 실패했습니다.');x.code=e?.code;x.conflict=e?.code==='PT409';return x}
  async function rpc(name,args={}){check();const {data,error:e}=await client.rpc(name,args);if(e)throw error(e);return data}
  async function user(){check();const {data,error:e}=await client.auth.getUser();if(e||!data?.user?.id)throw Error('로그인을 다시 확인해 주세요.');return data.user.id}
  async function load(){const uid=await user(),result=await rpc('portal_project_workspace_get');if(!result.hasWorkspace||result.backend==='legacy-json'){if(await user()!==uid)throw Error('로그인 계정이 바뀌었습니다. 다시 불러오세요.');return result;}const workspace=await unpack(result.workspace,async digest=>{check();const {data,error:e}=await client.storage.from(BUCKET).download(uid+'/'+digest);if(e)throw error(e);return new Uint8Array(await data.arrayBuffer())});if(await user()!==uid)throw Error('로그인 계정이 바뀌었습니다. 다시 불러오세요.');return {...result,workspace}}
  return {info:()=>rpc('portal_project_workspace_info'),load,async save(workspace,expected){check();validate(workspace);const uid=await user();const latest=await rpc('portal_project_workspace_info');if((latest.revision??null)!==(expected??null))throw error({code:'PT409'});
   const packed=await pack(workspace,async(digest,data)=>{check();if(!ready){const {error:e}=await client.functions.invoke('portal-project-assets',{body:{action:'ensure'}});if(e)throw error(e);ready=true}const {error:e}=await client.storage.from(BUCKET).upload(uid+'/'+digest,new Blob([data],{type:'application/octet-stream'}),{upsert:false,contentType:'application/octet-stream'});if(e){if(!['409','Duplicate','ResourceAlreadyExists'].includes(String(e.statusCode||e.error||e.code)))throw error(e);const existing=await client.storage.from(BUCKET).download(uid+'/'+digest);if(existing.error)throw error(existing.error);const bytes=new Uint8Array(await existing.data.arrayBuffer());if(bytes.length!==data.length||await hash(bytes)!==digest)throw Error('기존 첨부파일 무결성 검증에 실패했습니다. 저장을 중단했습니다.')}});
   // Recheck after uploads. Immutable, unreferenced uploads cannot overwrite an existing workbook.
   check();if(await user()!==uid)throw Error('로그인 계정이 바뀌었습니다. 다시 비교해 주세요.');return rpc('portal_project_workspace_save',{p_workspace:packed,p_expected:expected??null})
  }}
 }
 const api={pack,unpack,create,validate,hash,encode,base64,bytes};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PortalProjectCloud=api;
})(typeof globalThis!=='undefined'?globalThis:this);
