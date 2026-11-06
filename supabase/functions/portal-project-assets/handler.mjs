/* Bucket administration stays server-side. User assets still use the caller's RLS-protected SDK. */
export function createHandler({url,anonKey,serviceKey,origin='https://3hs3624.github.io',fetchImpl=fetch}){
 const bucket='portal-project-assets',headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
 const reply=(status,message)=>new Response(JSON.stringify({message}),{status,headers});
 return async request=>{
  if(request.headers.get('origin')&&request.headers.get('origin')!==origin)return reply(403,'허용되지 않은 요청입니다.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,'POST 요청이 필요합니다.');
  if(!url||!anonKey||!serviceKey)return reply(503,'파일 저장소 설정이 필요합니다.');
  const authorization=request.headers.get('authorization')||'';if(!/^Bearer \S+$/i.test(authorization))return reply(401,'로그인이 필요합니다.');
  try{
   const user=await fetchImpl(url+'/auth/v1/user',{headers:{apikey:anonKey,Authorization:authorization}});if(!user.ok||!(await user.json()).id)return reply(401,'다시 로그인해 주세요.');
   const access=await fetchImpl(url+'/rest/v1/rpc/portal_can_access',{method:'POST',headers:{apikey:anonKey,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({p_app:'projects',p_action:'write'})});if(!access.ok||await access.json()!==true)return reply(403,'프로젝트 저장 권한이 필요합니다.');
   const text=await request.text();if(text.length>128)return reply(400,'잘못된 요청입니다.');let body;try{body=JSON.parse(text)}catch{return reply(400,'잘못된 요청입니다.')}if(body?.action!=='ensure')return reply(400,'잘못된 요청입니다.');
   const admin={apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'};
   let response=await fetchImpl(url+'/storage/v1/bucket/'+bucket,{headers:admin});
   if(response.status===404){const created=await fetchImpl(url+'/storage/v1/bucket',{method:'POST',headers:admin,body:JSON.stringify({id:bucket,name:bucket,public:false,file_size_limit:104857600,allowed_mime_types:['application/octet-stream']})});if(!created.ok&&created.status!==409)return reply(503,'비공개 파일 저장소를 준비하지 못했습니다.');response=await fetchImpl(url+'/storage/v1/bucket/'+bucket,{headers:admin})}
   if(!response.ok)return reply(503,'파일 저장소 상태를 확인하지 못했습니다.');const info=await response.json();if(info.public!==false)return reply(503,'비공개 파일 저장소 설정을 확인해 주세요.');
   return reply(200,'비공개 프로젝트 파일 저장소 준비 완료');
  }catch{return reply(503,'파일 저장소 연결을 확인해 주세요.')}
 }
}
