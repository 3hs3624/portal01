/* Saving a working copy and publishing a storage snapshot are separate states. */
(() => {
 'use strict';
 const session=window.PortalShareSession;
 const state={working:'준비 중',external:'저장소 반영 여부 미확인',workingError:false,externalError:false,changed:0};
 let node;
 const description=()=>(session?'공유 작업공간':'작업 사본')+' · '+state.working+' / '+state.external;
 function paint(){if(!node)return;node.textContent=state.working+' / '+state.external;node.title=description();node.setAttribute("aria-label","저장 상태 확인: "+description());node.dataset.error=String(state.workingError||state.externalError);}
 window.PortalStorageStatus={
  ready(){state.working='자동저장 준비';paint();},
  pending(){state.changed++;state.working='저장 대기';state.external=session?'공유 저장 대기':'외부 저장소 반영 대기';state.workingError=false;paint();},
  saving(){state.working='저장 중';state.workingError=false;paint();},
  saved(at,place,generation){if(generation!==undefined&&generation!==state.changed){state.working='저장 대기';paint();return;}state.working=(place||(session?'공유':'브라우저'))+' 저장 완료'+(at?' '+new Date(at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'');if(session)state.external='참여자에게 반영됨';state.workingError=false;paint();},
  failure(message){state.working='저장 실패 · '+message;state.workingError=true;paint();},
  external(text,error=false){state.external=text;state.externalError=error;paint();},
  get description(){return description();},
  get generation(){return state.changed;},
  mount(parent){node=document.createElement('button');node.type='button';node.id='portal-save-status';node.className='portal-app-action portal-save-status';node.setAttribute('aria-label','저장 상태 확인');node.disabled=Boolean(session);node.onclick=()=>window.PortalCloudUI?.open();parent.prepend(node);paint();}
 };
})();
