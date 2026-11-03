/* Invitation mail confirms the account at Auth; portal sign-in still requires OTP.
   Never import URL tokens into the shared browser session. */
(() => {
 const url=new URL(location.href),hash=new URLSearchParams(url.hash.slice(1));
 const keys=['access_token','refresh_token','token','token_hash','code','error','error_code','error_description','expires_in','expires_at','token_type','type'];
 const hasAuth=p=>['access_token','refresh_token','token_hash','code','error','error_code'].some(k=>p.has(k));
 const fromHash=hasAuth(hash),fromQuery=hasAuth(url.searchParams);
 if(!fromHash&&!fromQuery)return;
 const params=fromHash?hash:url.searchParams;
 const expired=params.get('error_code')==='otp_expired';
 window.PortalAuthLinkNotice=expired?'초대·로그인 링크가 만료되었거나 이미 사용되었습니다. 이메일로 새 인증코드를 받아 로그인하세요.':params.has('error')?'초대·로그인 링크를 사용할 수 없습니다. 이메일로 새 인증코드를 받아 로그인하세요.':'초대받은 이메일로 새 인증코드를 받아 로그인하세요.';
 if(fromHash)url.hash='';
 if(fromQuery)for(const key of keys)url.searchParams.delete(key);
 history.replaceState(null,'',url.pathname+url.search+url.hash);
})();
