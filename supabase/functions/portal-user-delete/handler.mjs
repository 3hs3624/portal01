// Service credentials remain in the Edge Function runtime, never in Pages.
export function createDeleteHandler({url, anonKey, serviceKey, origin='https://3hs3624.github.io', fetchImpl=fetch}) {
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json'};
 const reply=(status,message,extra={})=>new Response(JSON.stringify({message,...extra}),{status,headers});
 const rpc=async(name,body,token,key)=>{
  const result=await fetchImpl(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!result.ok){const error=Error('rpc');error.status=result.status;try{error.code=(await result.json()).code}catch{}throw error;}return result.json();
 };
 return async request=>{
  if(request.headers.get('origin')&&request.headers.get('origin')!==origin)return reply(403,'허용되지 않은 요청입니다.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,'POST 요청이 필요합니다.');
  if(!url||!anonKey||!serviceKey)return reply(503,'사용자 삭제 서버 설정이 필요합니다.');
  const authorization=request.headers.get('authorization')||'';
  if(!/^Bearer \S+$/i.test(authorization))return reply(401,'로그인이 필요합니다.');
  const token=authorization.slice(7);let actor,body;
  try{
   const result=await fetchImpl(`${url}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:authorization}});
   if(!result.ok)return reply(401,'다시 로그인해 주세요.');
   actor=await result.json();if(!actor.id)return reply(401,'다시 로그인해 주세요.');
   const access=await rpc('portal_auth_context',{},token,anonKey);
   if(access?.configured!==true||access.enabled!==true||access.isAdmin!==true||!['system.access','system.users.manage'].every(p=>access.permissions?.includes(p)))return reply(403,'사용자 관리 권한이 필요합니다.');
  }catch{return reply(503,'관리 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');}
  try{
   const text=await request.text();if(text.length>2048)throw Error();body=JSON.parse(text);
   if(!body||!['preview','delete'].includes(body.action)||typeof body.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))throw Error();
   if(body.action==='delete'&&(typeof body.confirm_email!=='string'||!body.confirm_email.trim()||body.confirm_email.length>254))throw Error();
  }catch{return reply(400,'대상 사용자와 확인 이메일을 확인해 주세요.');}
  const errors={'42501':[403,'사용자 삭제 권한이 없거나 보호된 사용자입니다.'],'PT409':[409,'본인·마지막 관리자·삭제 진행 중인 사용자 또는 소유 파일이 있는 계정은 삭제할 수 없습니다.'],'PT404':[404,'사용자를 찾지 못했습니다.'],'22023':[400,'확인 이메일이 일치하지 않습니다.']};
  const failure=error=>{const [status,message]=errors[error.code]||[503,'사용자 삭제 서버 설정 또는 연결 상태를 확인해 주세요.'];return reply(status,message);};
  if(body.action==='preview'){
   try{const summary=await rpc('portal_user_delete_preview',{p_actor:actor.id,p_user:body.id},serviceKey,serviceKey);return new Response(JSON.stringify(summary),{status:200,headers});}catch(error){return failure(error);}
  }
  let ticket;
  try{ticket=await rpc('portal_user_delete_reserve',{p_actor:actor.id,p_user:body.id,p_email:body.confirm_email},serviceKey,serviceKey);}catch(error){return failure(error);}
  let result;
  try{result=await fetchImpl(`${url}/auth/v1/admin/users/${body.id}`,{method:'DELETE',headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'},body:JSON.stringify({should_soft_delete:false})});}
  catch{return reply(503,'삭제 결과를 확인하지 못했습니다. 사용자는 이용 중지 상태로 유지됩니다. 새로고침 후 상태를 확인해 주세요.');}
  if(!result.ok){try{await rpc('portal_user_delete_finish',{p_id:ticket.id,p_success:false},serviceKey,serviceKey);}catch{}return reply(409,'인증 계정 삭제에 실패했습니다. 이용 중지 상태로 유지되며 계정과 데이터는 삭제 완료되지 않았습니다.');}
  try{await rpc('portal_user_delete_finish',{p_id:ticket.id,p_success:true},serviceKey,serviceKey);}
  catch{return reply(200,'사용자를 삭제했습니다. 관리 이력의 완료 표시를 확인하지 못했습니다.',{ok:true,warning:true});}
  return reply(200,'사용자와 해당 클라우드 작업공간을 영구 삭제했습니다.',{ok:true});
 };
}
