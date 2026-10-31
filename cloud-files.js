/* WBS cloud working copy: File System Access compatible JSON/Excel virtual files.
   The existing disk storage remains untouched; cloud upload is explicit. */
(() => {
 const files=new Map(),dirs=new Set(['']);let queue=Promise.resolve();
 const dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('portal-wbs-cloud-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('클라우드 작업 사본을 보관할 수 없습니다.'))});
 const key='working';
 const snapshot=()=>({format:'wbs-pm-cloud',version:1,directories:[...dirs].filter(Boolean),files:[...files].map(([path,data])=>({path,data}))});
 function clean(path){if(typeof path!=='string'||!path||path.length>300||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'||/[\\\0]/.test(p)))throw Error('작업공간 파일 경로가 올바르지 않습니다.');return path}
 function validate(w){
  if(w?.format!=='wbs-pm-cloud'||w.version!==1||!Array.isArray(w.files)||!Array.isArray(w.directories)||w.files.length>5000||w.directories.length>5000)throw Error('지원하지 않는 프로젝트 작업공간입니다.');
  const seen=new Set();for(const f of w.files){clean(f.path);if(seen.has(f.path)||typeof f.data!=='string'||f.data.length>15*1024*1024||(!/^[A-Za-z0-9+/]*={0,2}$/.test(f.data)||f.data.length%4!==0))throw Error('프로젝트 파일을 확인해 주세요.');seen.add(f.path)}
  for(const d of w.directories){clean(d);if(seen.has(d))throw Error('파일과 폴더 경로가 겹칩니다.')}
  for(const p of [...seen,...w.directories]){const parts=p.split('/');parts.pop();while(parts.length){if(seen.has(parts.join('/')))throw Error('파일을 폴더로 사용할 수 없습니다.');parts.pop()}}
  if(new Blob([JSON.stringify(w)]).size>10*1024*1024)throw Error('프로젝트 클라우드 작업공간은 최대 10MB입니다.');return w;
 }
 function hydrate(w){validate(w);files.clear();dirs.clear();dirs.add('');for(const d of w.directories)dirs.add(d);for(const f of w.files)files.set(f.path,f.data);for(const p of [...dirs,...files.keys()]){const a=p.split('/');a.pop();while(a.length){dirs.add(a.join('/'));a.pop()}}}
 const ready=dbPromise.then(db=>new Promise((resolve,reject)=>{const tx=db.transaction('files');const r=tx.objectStore('files').get(key);r.onsuccess=()=>{try{if(r.result)hydrate(r.result);resolve()}catch(e){reject(e)}};r.onerror=()=>reject(r.error)}));
 async function persist(){const payload=snapshot();validate(payload);queue=queue.catch(()=>{}).then(async()=>{const db=await dbPromise;await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(payload,key);tx.oncomplete=()=>{window.dispatchEvent(new Event('portal:cloud-working-change'));resolve()};tx.onabort=tx.onerror=()=>reject(tx.error||Error('작업 사본 저장 실패'))})});return queue}
 function join(parent,name){if(typeof name!=='string'||name.includes('/'))throw Error('파일 이름을 확인하세요.');return clean(parent?parent+'/'+name:name)}
 function bytes(data){return Uint8Array.from(atob(data),c=>c.charCodeAt(0))}
 async function encode(blob){const b=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s)}
 function fileHandle(path){return {kind:'file',name:path.split('/').at(-1),async getFile(){if(!files.has(path))throw new DOMException('파일이 없습니다.','NotFoundError');return new File([bytes(files.get(path))],this.name)},async createWritable(){let value=new Blob([]);return {async write(data){value=data instanceof Blob?data:new Blob([data])},async close(){files.set(path,await encode(value));await persist()},async abort(){}}}}}
 function directory(path=''){return {kind:'directory',name:path?path.split('/').at(-1):'Supabase 작업 사본',async queryPermission(){return 'granted'},async requestPermission(){return 'granted'},async isSameEntry(other){return other?.cloudPath===path},cloudPath:path,
  async getDirectoryHandle(name,{create=false}={}){await ready;const p=join(path,name);if(files.has(p))throw new DOMException('파일입니다.','TypeMismatchError');if(!dirs.has(p)){if(!create)throw new DOMException('폴더가 없습니다.','NotFoundError');dirs.add(p);await persist()}return directory(p)},
  async getFileHandle(name,{create=false}={}){await ready;const p=join(path,name);if(dirs.has(p))throw new DOMException('폴더입니다.','TypeMismatchError');if(!files.has(p)){if(!create)throw new DOMException('파일이 없습니다.','NotFoundError');files.set(p,'');await persist()}return fileHandle(p)},
  async *entries(){await ready;const prefix=path?path+'/':'';for(const d of [...dirs])if(d&&d.startsWith(prefix)&&!d.slice(prefix.length).includes('/'))yield [d.slice(prefix.length),directory(d)];for(const f of [...files.keys()])if(f.startsWith(prefix)&&!f.slice(prefix.length).includes('/'))yield [f.slice(prefix.length),fileHandle(f)]},
  async *values(){for await(const [,handle]of this.entries())yield handle},
  async removeEntry(name,{recursive=false}={}){await ready;const p=join(path,name);if(files.has(p)){files.delete(p);await persist();return}if(!dirs.has(p))throw new DOMException('파일이 없습니다.','NotFoundError');const children=[...dirs,...files.keys()].filter(x=>x.startsWith(p+'/'));if(children.length&&!recursive)throw new DOMException('폴더가 비어 있지 않습니다.','InvalidModificationError');for(const x of children){dirs.delete(x);files.delete(x)}dirs.delete(p);await persist()}
 }}
 async function capture(root){
  await ready;await queue;if(root.cloudPath==='')return snapshot();
  const result={format:'wbs-pm-cloud',version:1,directories:[],files:[]};let total=0;
  async function walk(dir,path=''){for await(const [name,h]of dir.entries()){const p=join(path,name);if(h.kind==='directory'){result.directories.push(p);await walk(h,p)}else if(/\.(json|xlsx)$/i.test(name)){const f=await h.getFile();total+=f.size;if(total>7.5*1024*1024)throw Error('프로젝트와 이력이 클라우드 작업공간 제한(10MB)을 초과합니다.');result.files.push({path:p,data:await encode(f)})}if(result.files.length+result.directories.length>10000)throw Error('프로젝트 파일 수가 너무 많습니다.')}}
  await walk(root);return validate(result);
 }
 window.PortalCloudFiles={ready,root:()=>directory(),validate,capture,async replace(w){await ready;await queue;hydrate(w);await persist()}};
})();
