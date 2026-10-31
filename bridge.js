/* Adapter protocol v1. Only aggregates and recent titles leave the module. */
(() => {
 const id = location.pathname.split('/apps/')[1]?.split('/')[0];
 const emit = () => {
  try {
   let items=[], metrics=[];
   if(id==='markdown') {
    if(typeof APP==='undefined'||APP.loading)return;
    items=APP.documents.map(d=>({name:d.title||'제목 없는 문서',date:d.updatedAt||d.createdAt}));
    metrics=[['문서',items.length],['폴더',APP.folders.length],['즐겨찾기',APP.documents.filter(d=>d.favorite).length]];
   } else if(id==='projects') {
    if(typeof window.portalProjectSummary!=='function')return;
    ({items,metrics}=window.portalProjectSummary());
   } else if(id==='insight') {
    if(typeof readDashboards!=='function'||typeof connectedData==='undefined')return;
    const boards=readDashboards();
    items=boards.map(d=>({name:d.name,date:d.updatedAt}));
    metrics=[['대시보드',boards.length],['연결 데이터',connectedData.length],['보관 데이터',typeof detachedData==='undefined'?0:detachedData.length]];
   } else return;
   parent.postMessage({type:'3hs:summary',version:1,id,metrics,items:items.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,5),updatedAt:new Date().toISOString()},location.origin);
  } catch(e) { /* A loading module will retry. */ }
 };
 addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='3hs:refresh')emit()});
 setInterval(emit,2000); addEventListener('pagehide',emit); emit();
})();
