/* Authenticated item sharing. No tokens or privileged keys leave the portal client. */
(function(root){
 'use strict';
 function create(client,authenticated){
  return {async request(action,args={}){
   if(!authenticated())throw Error('로그인을 다시 확인해 주세요.');
   const {data:user,error:authError}=await client.auth.getUser();const uid=user?.user?.id;if(authError||!uid)throw Error('로그인을 다시 확인해 주세요.');
   const {data,error}=await client.rpc('portal_item_share',{p_action:action,p_args:args});
   if(error){const e=Error(error.message?.includes('Recipient cannot access')?'선택한 사용자의 앱 이용·편집 권한을 확인해 주세요. 조회 권한으로 공유할 수 있습니다.':error.code==='PT409'?'다른 사용자가 먼저 수정했습니다. 변경 내용을 보관하고 최신 공유 항목을 다시 열어 주세요.':error.code==='42501'?'공유 권한이 없거나 변경되었습니다. 소유자에게 확인해 주세요.':error.code==='PGRST202'?'공유 저장소 설정이 필요합니다.':error.code==='22023'?'공유할 항목의 형식·용량을 확인해 주세요.':error.message||'공유 요청에 실패했습니다.');e.code=error.code;throw e;}
   const after=await client.auth.getUser();if(!authenticated()||after.data?.user?.id!==uid)throw Error('로그인 계정이 바뀌었습니다. 다시 열어 주세요.');return data;
  }};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={create};else root.PortalSharingCloud={create};
})(typeof globalThis!=='undefined'?globalThis:this);
