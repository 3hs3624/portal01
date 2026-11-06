/* Single storage entry point; app adapters share the same review/backup engine. */
(() => {
 const app=location.pathname.split('/apps/')[1]?.split('/')[0];
 if(!['markdown','insight','projects'].includes(app)||!location.pathname.endsWith('/'))return;
 const ui=app==='markdown'?window.PortalWriteStorageUI:window.PortalAppStorageUI;
 window.PortalCloudUI=ui||{open(){throw Error('저장소 화면을 준비하지 못했습니다. 새로고침 후 다시 시도하세요.')}};
})();
