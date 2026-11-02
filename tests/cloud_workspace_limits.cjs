'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const bundle=fs.readFileSync(path.join(root,'login.js'),'utf8');
const source=bundle.slice(bundle.indexOf('function pn('),bundle.indexOf('var gn=',bundle.indexOf('function pn(')));
const factory=vm.runInNewContext('const Co=new Set(["markdown","insight","projects"]);'+source+';pn',{Blob,Error});
let rpcCalls=0;
const api=factory({rpc:async(name,args)=>{assert.equal(name,'portal_workspace_save');assert.equal(args.p_app,'markdown');rpcCalls++;return {data:{hasWorkspace:true,revision:'test-revision'}};}},()=>true);
const limit=100*1024*1024;
async function check(bytes,accepted,character='x'){
 const overhead=Buffer.byteLength(JSON.stringify({data:''}));
 const count=Math.floor((bytes-overhead)/Buffer.byteLength(character));
 const payload={data:character.repeat(count)+'x'.repeat(bytes-overhead-count*Buffer.byteLength(character))};
 const before=rpcCalls;
 if(accepted){const result=await api.save('markdown',payload,null);assert.equal(result.revision,'test-revision');assert.equal(rpcCalls,before+1);}
 else{await assert.rejects(()=>api.save('markdown',payload,null),/100MB/);assert.equal(rpcCalls,before);}
 console.log('PASS cloud',bytes,'bytes',accepted?'accepted':'rejected');
}
(async()=>{
 await check(12*1024*1024,true);
 await check(12*1024*1024,true,'가');
 await check(limit,true);
 if(global.gc)global.gc();
 await check(limit+1,false);
 if(global.gc)global.gc();
 await assert.rejects(()=>api.save('unknown',{},null));
 const denied=factory({},()=>false);
 await assert.rejects(()=>denied.save('markdown',{},null));
 console.log('PASS application and authentication guards remain enforced');
 const EditorCore=require(path.join(root,'apps/markdown/editor-core.js'));
 assert.equal(EditorCore.MAX_WORKSPACE,limit);
 // A remote workspace above the former 50MB local restore limit must be usable.
 const chunk='x'.repeat(4*1024*1024),date='2026-11-02T00:00:00.000Z';
 const workspace={format:'md-editor-workspace',version:1,activeId:'0',folders:[],documents:Array.from({length:13},(_,i)=>({id:String(i),title:'Document '+i,content:chunk,createdAt:date,updatedAt:date}))};
 assert.equal(EditorCore.validate(workspace),workspace);
 console.log('PASS 52MB Write Studio workspace restores with existing per-document limits');
 const filesSource=fs.readFileSync(path.join(root,'cloud-files.js'),'utf8');
 const validateProject=vm.runInNewContext(filesSource.slice(filesSource.indexOf(' function clean('),filesSource.indexOf(' function hydrate('))+';validate',{Blob,Error});
 const project={format:'wbs-pm-cloud',version:1,directories:[],files:[{path:'project.json',data:'A'.repeat(12*1024*1024)}]};
 assert.equal(validateProject(project),project);
 project.files=Array.from({length:7},(_,i)=>({path:'file'+i+'.json',data:'A'.repeat(14*1024*1024)}));
 assert.equal(validateProject(project),project);
 project.files.push({path:'excess.json',data:'A'.repeat(4*1024*1024)});
 assert.throws(()=>validateProject(project),/100MB/);
 console.log('PASS project workspaces above 10MB and 98MB accepted; above 100MB rejected');

})().catch(error=>{console.error(error);process.exitCode=1;});
