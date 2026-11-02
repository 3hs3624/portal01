import assert from 'node:assert/strict';
import {createHandler} from '../supabase/functions/portal-user-invite/handler.mjs';
const access={configured:true,enabled:true,isAdmin:true,permissions:['system.access','system.users.manage']};
const origin='https://3hs3624.github.io';
async function scenario({overrides={},request={},status=200,expected=[]}={}){
 const calls=[];
 const handler=createHandler({url:'https://example.test',anonKey:'public',serviceKey:'server-only',fetchImpl:async(url,options={})=>{
  const endpoint=new URL(url).pathname;calls.push({endpoint,body:options.body&&JSON.parse(options.body),headers:options.headers});
  if(overrides[endpoint])return overrides[endpoint](options);
  const values={'/auth/v1/user':{id:'actor'},'/rest/v1/rpc/portal_auth_context':access,'/rest/v1/rpc/portal_invite_reserve':{id:'ticket'},'/auth/v1/invite':{id:'new-user'},'/rest/v1/rpc/portal_invite_finish':{ok:true}};
  assert(endpoint in values);return Response.json(values[endpoint]);
 }});
 const response=await handler(new Request('https://example.test/functions/v1/portal-user-invite',{method:'POST',headers:{origin,authorization:'Bearer user-token'},body:JSON.stringify({email:' PERSON@Example.test ',display_name:'New Person'}),...request}));
 assert.equal(response.status,status);for(const endpoint of expected)assert(calls.some(c=>c.endpoint===endpoint));
 assert(!(await response.text()).includes('server-only'));return calls;
}
const calls=await scenario();
assert.equal(calls.find(c=>c.endpoint.endsWith('reserve')).body.p_email,'person@example.test');
assert.equal(calls[0].headers.Authorization,'Bearer user-token');
assert.equal(calls.find(c=>c.endpoint==='/auth/v1/invite').headers.Authorization,'Bearer server-only');
assert(!calls.find(c=>c.endpoint==='/auth/v1/invite').body.data.role);
assert.equal(calls.at(-1).body.p_success,true);
console.log('PASS verified caller, normalized email, server-only credentials, no role escalation, invitation audit');
for(const variant of [{...access,isAdmin:false},{...access,enabled:false},{...access,configured:false},{...access,permissions:['system.access']}]){
 const denied=await scenario({overrides:{'/rest/v1/rpc/portal_auth_context':()=>Response.json(variant)},status:403});assert.equal(denied.length,2);
}
assert.equal((await scenario({request:{headers:{origin}},status:401})).length,0);
assert.equal((await scenario({request:{headers:{origin:'https://other.test',authorization:'Bearer user-token'}},status:403})).length,0);
assert.equal((await scenario({overrides:{'/auth/v1/user':()=>new Response(null,{status:401})},status:401})).length,1);
console.log('PASS anonymous, revoked, disabled, non-admin, missing permission and foreign origin rejected');
assert.equal((await scenario({request:{body:JSON.stringify({email:'invalid',display_name:'x'})},status:400})).length,2);
assert.equal((await scenario({request:{body:'x'.repeat(2050)},status:400})).length,2);
const conflict=await scenario({overrides:{'/rest/v1/rpc/portal_invite_reserve':()=>Response.json({code:'P0001'},{status:400})},status:409});assert(!conflict.some(c=>c.endpoint==='/auth/v1/invite'));
const failed=await scenario({overrides:{'/auth/v1/invite':()=>new Response(null,{status:429})},status:409});assert.equal(failed.at(-1).body.p_success,false);
const ambiguous=await scenario({overrides:{'/auth/v1/invite':()=>{throw Error('network')}},status:503});assert(!ambiguous.some(c=>c.endpoint.endsWith('finish')));
await scenario({overrides:{'/rest/v1/rpc/portal_invite_finish':()=>new Response(null,{status:500})},status:503});
console.log('PASS invalid input, duplicate/rate limit, mail failure and uncertain delivery handled without automatic resends');

await scenario({overrides:{'/rest/v1/rpc/portal_invite_reserve':()=>Response.json({code:'PGRST202'},{status:404})},status:503});
await scenario({overrides:{'/rest/v1/rpc/portal_invite_reserve':()=>Response.json({code:'42501'},{status:403})},status:403});
console.log('PASS missing migration and revoked permission produce accurate errors');

// Exercise the actual bundled adapter, including the missing-function error.
const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
const bundle=readFileSync(new URL('../login.js',import.meta.url),'utf8');
const source=bundle.slice(bundle.indexOf('function yn('),bundle.indexOf('var Rr=',bundle.indexOf('function yn(')));
const factory=vm.runInNewContext(source+';yn',{Error,gn:new Set(),Mt:e=>e});
let sdkCalls=0;
const sdk={functions:{invoke:async(name,{body})=>{sdkCalls++;assert.equal(name,'portal-user-invite');assert.equal(body.email,'new@example.test');return {data:{ok:true}}}}};
const api=factory(sdk,()=>true);assert.equal((await api.invite({email:'new@example.test'})).ok,true);assert.equal(sdkCalls,1);
await assert.rejects(()=>factory(sdk,()=>false).invite({email:'new@example.test'}));assert.equal(sdkCalls,1);
sdk.functions.invoke=async()=>({error:{context:new Response(JSON.stringify({code:'NOT_FOUND',message:'Requested function was not found'}),{status:404})}});
await assert.rejects(()=>api.invite({}),/사용자 초대 서버 설정/);
console.log('PASS real login adapter: authenticated function invocation, local login guard, clear missing-server message');
