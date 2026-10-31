'use strict';
// JSON encoding and network transfer stay off the UI thread. Credentials are transient.
self.onmessage=async({data:{payload,token}})=>{
 try{
 const start=performance.now(),body=JSON.stringify(payload),serializeMs=performance.now()-start;
 const response=await fetch('/api/storage/save',{method:'POST',headers:{'Content-Type':'application/json','X-BI-Token':token},body});
 const data=await response.json();
 self.postMessage({ok:response.ok,status:response.status,data,metrics:{serializeMs:Math.round(serializeMs),bytes:new TextEncoder().encode(body).length}});
 }catch(e){self.postMessage({error:e.message})}
};
