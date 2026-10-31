/* Static Pages adapters: no credentials, arbitrary SQL or server filesystem paths. */
(() => {
 const app=location.pathname.split('/apps/')[1]?.split('/')[0];
 const dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('pages-workspace-'+app,1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('브라우저 저장소를 사용할 수 없습니다.'))});
 async function transact(mode,fn){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('records',mode);let output;fn(tx.objectStore('records'),v=>output=v);tx.oncomplete=()=>resolve(output);tx.onerror=tx.onabort=()=>reject(tx.error||Error('저장하지 못했습니다.'))})}
 const get=key=>transact('readonly',(s,out)=>{s.get(key).onsuccess=e=>out(e.target.result)});
 const put=(key,value)=>transact('readwrite',(s,out)=>{s.put(value,key);out(value)});
 const defaults=()=>({profiles:[{id:'browser',name:'이 브라우저 · 개인 작업공간',provider:'browser',path:'IndexedDB'}],activeId:'browser',autoSave:true,autoRestore:true});
 window.PagesStorage={async handle(action,payload={}){
  const settings=await get('settings')||defaults();
  if(action==='status')return {settings,defaultPath:'',features:{markdownFiles:false,fileWorkspace:false}};
  if(action==='preferences'){for(const k of ['autoSave','autoRestore'])if(k in payload)settings[k]=Boolean(payload[k]);if(payload.activeId&&payload.activeId!=='browser')throw Error('브라우저 저장소만 지원합니다.');await put('settings',settings);return {settings}}
  if(['connect','disconnect'].includes(action))throw Error('Pages 버전은 사용자별 브라우저 저장소를 사용합니다. 파일 백업·가져오기로 데이터를 이동하세요.');
  if(payload.id!=='browser')throw Error('알 수 없는 저장소입니다.');
  const info=await get('workspace');
  const result=info?{hasWorkspace:true,...info}:{hasWorkspace:false,revision:null};
  if(action==='load')return result;
  if(action==='changes')return {changed:result.revision!==payload.revision,...result};
  if(action==='save'){
   if(!payload.workspace||new Blob([JSON.stringify(payload.workspace)]).size>50*1024*1024)throw Error('작업공간 크기 제한을 확인해 주세요.');
   return transact('readwrite',(store,out)=>{store.get('workspace').onsuccess=e=>{const old=e.target.result;if((old?.revision??null)!==(payload.revision??null)){store.transaction.abort();return}const next={workspace:payload.workspace,revision:crypto.randomUUID(),savedAt:new Date().toISOString()};store.put(next,'workspace');out({hasWorkspace:true,revision:next.revision,savedAt:next.savedAt})}});
  }
  throw Error('지원하지 않는 작업입니다.');
 }};
 function csv(text,delimiter=','){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else if(!cell||quoted)quoted=!quoted;else cell+=c}else if(c===delimiter&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c;if(rows.length>100000)throw Error('최대 100,000행까지 지원합니다.')}
  if(quoted)throw Error('CSV 따옴표 형식을 확인해 주세요.');if(cell||row.length){row.push(cell);rows.push(row)}return rows;
 }
 function table(rows){if(!rows.length)return {columns:[],rows:[]};const seen=new Set();const columns=rows[0].map((v,i)=>{let name=String(v??'').trim()||'열 '+(i+1),base=name,n=2;while(seen.has(name))name=base+' ('+n+++')';seen.add(name);return name});if(columns.length>1000||rows.length>100001)throw Error('최대 1,000열 / 100,000행입니다.');return {columns,rows:rows.slice(1).map(r=>columns.map((_,i)=>r[i]??null))}}
 window.PagesAPI={async request(route,data){
  if(route==='upload'){
   if(data.data.length>42*1024*1024)throw Error('파일은 30MB까지 지원합니다.');
   const bytes=Uint8Array.from(atob(data.data),c=>c.charCodeAt(0));const name=data.name.toLowerCase();
   if(name.endsWith('.xlsx')){const sheets=Object.create(null);for(const [name,rows]of Object.entries(await PagesExcel.read(bytes)))sheets[name]=table(rows);return sheets}
   const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
   if(/\.(csv|tsv)$/.test(name))return {'데이터':table(csv(text,name.endsWith('.tsv')?'\t':','))};
   if(name.endsWith('.json')){const rows=JSON.parse(text);if(!Array.isArray(rows)||!rows.length||rows.some(r=>!r||Array.isArray(r)||typeof r!=='object'))throw Error('JSON 객체 배열이 필요합니다.');const cols=[...new Set(rows.flatMap(Object.keys))];return {'데이터':table([cols,...rows.map(r=>cols.map(k=>r[k]))])}}
   throw Error('Pages 버전은 XLSX, CSV, TSV, JSON을 지원합니다. 구형 XLS는 XLSX로 저장해 주세요.');
  }
  throw Error('Pages 버전에서는 서버·DB·외부 API 연결을 제공하지 않습니다. 파일을 가져와 분석하세요.');
 }};
})();
