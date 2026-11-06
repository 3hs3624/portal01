'use strict';
(async()=>{
 const params=new URLSearchParams(location.search),id=params.get('id');
 const title=document.querySelector('#title'),status=document.querySelector('#status'),error=document.querySelector('#error'),save=document.querySelector('#save');
 let host=parent,record,frame,busy=false;
 function fail(e){error.hidden=false;error.textContent=e.message||String(e);status.textContent='저장되지 않았습니다.';}
 try{
  if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('공유 항목 주소가 올바르지 않습니다.');
  while(host!==host.parent&&!host.PortalSharingAPI){if(host.location.origin!==location.origin)throw Error('포털에서 공유 항목을 열어 주세요.');host=host.parent;}
  if(host.location.origin!==location.origin||!host.__portalAuthenticated||!host.PortalSharingAPI)throw Error('포털에 로그인한 뒤 공유 항목을 열어 주세요.');
  const user=host.PortalUserId,request=(action,args)=>{if(!host.__portalAuthenticated||host.PortalUserId!==user)throw Error('로그인이 변경되었습니다. 다시 열어 주세요.');return host.PortalSharingAPI.request(action,args);};
  record=await request('get',{id});
  Object.defineProperties(window,{__portalAuthenticated:{get:()=>host.__portalAuthenticated&&host.PortalUserId===user},PortalUserId:{get:()=>user}});
  function itemTitle(w){if(record.app==='markdown')return w.documents[0].title;if(record.app==='insight')return w.dashboards[0].name;return record.title;}
  window.PortalShareSession={id,app:record.app,get canEdit(){return record.canEdit},get workspace(){return structuredClone(record.workspace)},get revision(){return record.revision},async commit(workspace,revision=record.revision){
   if(!record.canEdit)throw Error('조회 권한으로는 저장할 수 없습니다.');
   const result=await request('save',{id,revision,workspace,title:itemTitle(workspace)});record={...record,title:itemTitle(workspace),workspace:structuredClone(workspace),revision:result.revision};title.textContent=record.title;status.textContent='공유 항목 저장 완료';return result;
  },async storage(action,payload={}){
   const settings={profiles:[{id:'browser',name:'공유 작업공간',provider:'browser'}],activeId:'browser',autoSave:true,autoRestore:true};
   if(action==='status')return {settings,features:{},defaultPath:''};if(action==='preferences')return {settings};
   if(action==='load'||action==='changes')return {hasWorkspace:true,workspace:structuredClone(record.workspace),revision:record.revision,savedAt:record.updatedAt,changed:false};
   if(action==='save'){const result=await this.commit(payload.workspace,payload.revision);return {hasWorkspace:true,...result};}
   throw Error('공유 작업공간에서는 저장소를 변경할 수 없습니다.');
  }};
  title.textContent=record.title;status.textContent=record.canEdit?'공유 작업공간 · 편집 가능':'공유 작업공간 · 조회 전용';save.hidden=!record.canEdit;
  frame=document.createElement('iframe');frame.title=record.title+' 공유 작업공간';frame.src='/portal01/apps/'+record.app+'/?shared='+encodeURIComponent(id);document.body.append(frame);
  save.onclick=async()=>{if(busy)return;busy=true;save.disabled=true;error.hidden=true;try{const adapter=frame.contentWindow.PortalSharedItemAdapter;if(!adapter)throw Error('항목을 준비 중입니다.');await adapter.flush();status.textContent='공유 항목 저장 완료';}catch(e){fail(e)}finally{busy=false;save.disabled=false;}};
  document.querySelector('#refresh').onclick=()=>{if(confirm('저장하지 않은 변경은 유지되지 않습니다. 최신 공유 항목을 다시 열까요?'))location.reload();};
  setInterval(async()=>{try{const latest=await request('get',{id});if(latest.canEdit!==record.canEdit){record.canEdit=latest.canEdit;save.hidden=!record.canEdit;frame.contentWindow.dispatchEvent(new Event('portal:share-permission'));status.textContent=record.canEdit?'편집 권한으로 변경됐습니다.':'조회 권한으로 변경됐습니다.';}if(latest.revision!==record.revision)status.textContent='새 저장본이 있습니다. 변경 내용을 저장한 뒤 최신 내용을 다시 열어 주세요.';}catch(e){if(e.code==='42501'||!window.__portalAuthenticated){frame.remove();save.hidden=true;}fail(e);}},15000);
 }catch(e){fail(e);}
})();
