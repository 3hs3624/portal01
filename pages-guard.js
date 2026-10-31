(() => {
 const script=new URL(document.currentScript.src),base=new URL('./',script);
 let user;
 try{if(parent!==window&&parent.location.origin===location.origin&&parent.__portalAuthenticated===true)user=parent.PortalUserId}catch{}
 if(!user){document.documentElement.hidden=true;window.stop();location.replace(base.href+'#'+location.pathname.split('/apps/')[1]?.split('/')[0]);throw Error('로그인이 필요합니다.')}
 window.PortalUserId=user;
 const prefix='3hs-user:'+user+':',original={};
 for(const name of ['getItem','setItem','removeItem','key'])original[name]=Storage.prototype[name];
 for(const name of ['getItem','setItem','removeItem'])Storage.prototype[name]=function(key,...args){return original[name].call(this,prefix+key,...args)};
 Storage.prototype.key=function(index){const keys=[];for(let i=0;i<this.length;i++){const k=original.key.call(this,i);if(k?.startsWith(prefix))keys.push(k.slice(prefix.length))}return keys[index]??null};
 Storage.prototype.clear=function(){for(const k of Array.from({length:this.length},(_,i)=>original.key.call(this,i)).filter(k=>k?.startsWith(prefix)))original.removeItem.call(this,k)};
 const open=indexedDB.open.bind(indexedDB),del=indexedDB.deleteDatabase.bind(indexedDB);
 indexedDB.open=(name,...args)=>open(prefix+name,...args);indexedDB.deleteDatabase=name=>del(prefix+name);
})();
