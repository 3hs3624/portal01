// Service credentials remain in the Edge Function runtime, never in Pages.
export function createHandler({url, anonKey, serviceKey, origin='https://3hs3624.github.io', fetchImpl=fetch}) {
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
  if(!url||!anonKey||!serviceKey)return reply(503,'사용자 초대 서버 설정이 필요합니다.');
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
   const text=await request.text();if(text.length>2048)return reply(400,'입력 내용이 너무 깁니다.');body=JSON.parse(text);
   if(!body||typeof body.email!=='string'||typeof body.display_name!=='string')throw Error();
   body={email:body.email.trim().toLowerCase(),display_name:body.display_name.trim()};
   if(body.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)||body.display_name.length>100)throw Error();
  }catch{return reply(400,'이메일과 표시 이름을 확인해 주세요.');}
  let ticket;
  try{ticket=await rpc('portal_invite_reserve',{p_actor:actor.id,p_email:body.email,p_name:body.display_name},serviceKey,serviceKey);}
  catch(error){if(error.code==='42501')return reply(403,'사용자 관리 권한이 필요합니다.');if(error.code!=='P0001')return reply(503,'사용자 초대 서버 설정 또는 연결 상태를 확인해 주세요.');return reply(409,'이미 등록되었거나 최근 초대한 이메일입니다. 목록을 확인하고 잠시 후 다시 시도해 주세요.');}
  let invited;
  try{
   const result=await fetchImpl(`${url}/auth/v1/invite?redirect_to=${encodeURIComponent(origin+'/portal01/')}`,{method:'POST',headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'},body:JSON.stringify({email:body.email,data:{full_name:body.display_name}})});
   if(!result.ok){await rpc('portal_invite_finish',{p_id:ticket.id,p_user:null,p_success:false},serviceKey,serviceKey);return reply(409,'초대하지 못했습니다. 기존 계정 여부 또는 메일 발송 제한을 확인해 주세요.');}
   invited=await result.json();if(!invited.id)throw Error('missing user');
  }catch{return reply(503,'초대 결과를 확인하지 못했습니다. 중복 발송을 피하려면 사용자 목록과 메일 수신 여부를 먼저 확인해 주세요.');}
  try{await rpc('portal_invite_finish',{p_id:ticket.id,p_user:invited.id,p_success:true},serviceKey,serviceKey);}
  catch{return reply(503,'초대 메일은 발송되었으나 사용자 목록 반영을 확인하지 못했습니다. 새로고침 후 확인해 주세요.');}
  return reply(200,'초대 메일을 발송했습니다. 기존 이메일 인증으로 로그인할 수 있습니다.',{ok:true});
 };
}
