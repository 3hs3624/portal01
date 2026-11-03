import assert from 'node:assert/strict';import {createDeleteHandler} from '../supabase/functions/portal-user-delete/handler.mjs';
const user='22222222-2222-4222-8222-222222222222',actor='11111111-1111-4111-8111-111111111111';
const access={configured:true,enabled:true,isAdmin:true,permissions:['system.access','system.users.manage']};
async function scenario({body={action:'delete',id:user,confirm_email:'target@example.test'},overrides={},status=200,authorization='Bearer valid-user-token',origin='https://3hs3624.github.io'}={}){
 const calls=[];const handler=createDeleteHandler({url:'https://example.test',anonKey:'public',serviceKey:'server-only',fetchImpl:async(url,options)=>{const path=new URL(url).pathname;calls.push({path,...options});if(overrides[path])return overrides[path](options);const values={'/auth/v1/user':{id:actor},'/rest/v1/rpc/portal_auth_context':access,'/rest/v1/rpc/portal_user_delete_preview':{id:user,email:'target@example.test',workspace_count:2},'/rest/v1/rpc/portal_user_delete_reserve':{id:'ticket'},['/auth/v1/admin/users/'+user]:{},'/rest/v1/rpc/portal_user_delete_finish':{ok:true}};assert(path in values,path);return Response.json(values[path]);}});
 const response=await handler(new Request('https://example.test',{method:'POST',headers:{origin,authorization,'Content-Type':'application/json'},body:JSON.stringify(body)}));assert.equal(response.status,status);assert(!(await response.text()).includes('server-only'));return calls;
}
let calls=await scenario();assert.equal(calls.find(c=>c.method==='DELETE').headers.Authorization,'Bearer server-only');assert.deepEqual(JSON.parse(calls.find(c=>c.method==='DELETE').body),{should_soft_delete:false});assert.equal(JSON.parse(calls.at(-1).body).p_success,true);
calls=await scenario({body:{action:'preview',id:user}});assert(!calls.some(c=>c.method==='DELETE'));assert(!calls.some(c=>c.path.endsWith('reserve')));
for(const state of [{...access,isAdmin:false},{...access,enabled:false},{...access,permissions:['system.access']},{...access,configured:false}]){calls=await scenario({overrides:{'/rest/v1/rpc/portal_auth_context':()=>Response.json(state)},status:403});assert.equal(calls.length,2);}
assert.equal((await scenario({authorization:'',status:401})).length,0);assert.equal((await scenario({origin:'https://other.test',status:403})).length,0);
await scenario({overrides:{'/auth/v1/user':()=>new Response(null,{status:401})},status:401});
for(const invalid of [{action:'delete',id:'../../users',confirm_email:'x'},{action:'delete',id:user},{action:'wrong',id:user}]){calls=await scenario({body:invalid,status:400});assert(!calls.some(c=>c.method==='DELETE'));}
for(const [code,status]of [['42501',403],['PT409',409],['22023',400],['PT404',404]]){calls=await scenario({overrides:{'/rest/v1/rpc/portal_user_delete_reserve':()=>Response.json({code},{status:400})},status});assert(!calls.some(c=>c.method==='DELETE'));}
calls=await scenario({overrides:{['/auth/v1/admin/users/'+user]:()=>new Response(null,{status:500})},status:409});assert.equal(JSON.parse(calls.at(-1).body).p_success,false);
calls=await scenario({overrides:{['/auth/v1/admin/users/'+user]:()=>{throw Error('network')}},status:503});assert(!calls.some(c=>c.path.endsWith('finish')));
await scenario({overrides:{'/rest/v1/rpc/portal_user_delete_finish':()=>new Response(null,{status:500})}});
console.log('PASS delete endpoint: verified administrator, preview is read-only, email/ID validation, guarded reservation before Auth DELETE, failure suspension and uncertain-result handling');
