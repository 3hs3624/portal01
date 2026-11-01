(() => {
 const script=new URL(document.currentScript.src),base=new URL('./',script);
 let user,popup=false;
 const nativeRemove=Storage.prototype.removeItem;
 function detailHost(){
  try{const source=window.opener,host=source?.parent;
   if(location.pathname!==base.pathname+'apps/insight/data-detail.html'||!source||source.closed||source.location.origin!==location.origin||source.location.pathname!==base.pathname+'apps/insight/'||!host?.__portalAuthenticated||!source.PortalUserId||source.PortalUserId!==host.PortalUserId)return null;
   if(!Array.from(host.document.querySelectorAll('#frames iframe')).some(f=>f.contentWindow===source))return null;
   return host;
  }catch{return null}
 }

 try{if(parent!==window&&parent.location.origin===location.origin&&parent.__portalAuthenticated===true)user=parent.PortalUserId}catch{}
 if(!user){const host=detailHost();if(host){user=host.PortalUserId;popup=true}}
 if(!user){document.documentElement.hidden=true;window.stop();location.replace(base.href+'#'+location.pathname.split('/apps/')[1]?.split('/')[0]);throw Error('로그인이 필요합니다.')}
 window.PortalUserId=user;
 if(popup)setInterval(()=>{if(detailHost()?.PortalUserId!==user){document.documentElement.hidden=true;window.stop();nativeRemove.call(sessionStorage,'3hs-auth-session');location.replace(base.href)}},1000);

 const prefix='3hs-user:'+user+':',original={};
 for(const name of ['getItem','setItem','removeItem','key'])original[name]=Storage.prototype[name];
 for(const name of ['getItem','setItem','removeItem'])Storage.prototype[name]=function(key,...args){return original[name].call(this,prefix+key,...args)};
 Storage.prototype.key=function(index){const keys=[];for(let i=0;i<this.length;i++){const k=original.key.call(this,i);if(k?.startsWith(prefix))keys.push(k.slice(prefix.length))}return keys[index]??null};
 Storage.prototype.clear=function(){for(const k of Array.from({length:this.length},(_,i)=>original.key.call(this,i)).filter(k=>k?.startsWith(prefix)))original.removeItem.call(this,k)};
 const open=indexedDB.open.bind(indexedDB),del=indexedDB.deleteDatabase.bind(indexedDB);
 indexedDB.open=(name,...args)=>open(prefix+name,...args);indexedDB.deleteDatabase=name=>del(prefix+name);
})();
