/* The shared host has already authorized the item before creating this frame. */
(() => {
 const id=new URLSearchParams(location.search).get('shared');
 if(!id)return;
 let session;try{session=parent.PortalShareSession;if(parent.location.origin!==location.origin||session?.id!==id||session.app!==location.pathname.split('/apps/')[1]?.split('/')[0])throw Error();}catch{document.documentElement.hidden=true;window.stop();throw Error('공유 항목을 다시 열어 주세요.');}
 window.PortalShareSession=session;
 document.addEventListener('DOMContentLoaded',()=>{document.body.classList.add('portal-shared-context');document.body.classList.toggle('portal-shared-readonly',!session.canEdit);});
})();
