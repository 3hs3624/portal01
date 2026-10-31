'use strict';
function detailRevision(record,sheet){return record.revisions?.[sheet]||0}
function remapTableConfig(config,mapping){const c={...config};if(c.measures)c.measures=c.measures.map(v=>mapping[v]||v);if(c.splitBy)c.splitBy=mapping[c.splitBy]||c.splitBy;if(c.drillDimensions)c.drillDimensions=c.drillDimensions.map(v=>mapping[v]||v);if(c.cardFilters)c.cardFilters=c.cardFilters.map(f=>({...f,column:mapping[f.column]||f.column}));for(const key of ['dimension','measure'])if(mapping[c[key]])c[key]=mapping[c[key]];return c}
function applyDetailTable(request,payload){
 const record=connectedData.find(r=>r.id===request.id);if(!record?.sheets[request.sheet])throw Error('데이터 연결이 삭제되었습니다. 다시 연결해 주세요.');
 if(payload.revision!==detailRevision(record,request.sheet))throw Error('다른 창에서 데이터가 변경되었습니다. 창을 다시 열어 최신 데이터로 편집해 주세요.');
 if(dashboardHasEdits()&&state.connectionId===record.id&&state.sheet===request.sheet)throw Error('메인 대시보드의 편집 내용을 먼저 저장하거나 취소해 주세요.');
 const next=TableModel.validate(payload.table),old=record.sheets[request.sheet],mapping=payload.mapping||{};
 // Validate every mapping before applying any persistent or in-memory mutation.
 if(typeof mapping!=='object'||Array.isArray(mapping)||Object.entries(mapping).some(([a,b])=>!old.columns.includes(a)||(b!==null&&!next.columns.includes(b))))throw Error('열 연결 정보가 올바르지 않습니다.');
 const saved=readDashboards(),records=saved.map(d=>{
 if(!sourceMatches(d,record,request.sheet))return d;
 return {...d,slicers:safeSlicers(d.slicers).map(s=>({...s,column:mapping[s.column]||s.column})),explorer:remapTableConfig(d.explorer,mapping),board:d.board.map(c=>remapTableConfig(c,mapping)),filters:{...d.filters,filterColumn:mapping[d.filters.filterColumn]||d.filters.filterColumn},schema:d.schema.map(c=>({...c,name:mapping[c.name]||c.name}))};
 });
 writeDashboards(records);record.sheets[request.sheet]=next;(record.revisions||={})[request.sheet]=payload.revision+1;
 if(state.connectionId===record.id&&state.sheet===request.sheet){
 Object.assign(state,remapTableConfig(currentConfig(),mapping));state.slicers=safeSlicers(state.slicers).map(s=>({...s,column:mapping[s.column]||s.column}));state.board=state.board.map(c=>remapTableConfig(c,mapping));state.filterColumn=mapping[state.filterColumn]||state.filterColumn;
 if(!next.columns.includes(state.filterColumn)){state.filterColumn='';state.filterValue=''}
 // The saved baseline follows header renames; layout editing remains a separate transaction.
 dashboardState.baseline=snapshotSignature();editSession.original=null;resetBoardHistory();refreshControls();renderAll();if(dashboardState.editing){editSession.original=editSessionSnapshot();editSession.key=editSessionKey()}
 }
 renderDataCatalog();renderDashboardList();return {table:next,revision:payload.revision+1};
}
window.addEventListener('message',async event=>{
 if(event.origin!==location.origin)return;const request=dataDetailWindows.get(event.source);if(!request)return;
 if(event.data?.type==='bi-data-request'){
 const record=findDataRecord(request.id);if(record)event.source.postMessage({type:'bi-data-permissions',readOnly:Boolean(record.readOnly),revision:detailRevision(record,request.sheet)},location.origin);return;
 }
 if(event.data?.type!=='bi-data-save')return;
 try{const result=applyDetailTable(request,event.data);if(typeof storageChanged==='function'){storageChanged();try{if(activeStorage())await saveWorkspaceNow(false);else result.warning='영구 저장소가 연결되지 않아 메모리에만 반영되었습니다. 설정에서 저장소를 연결해 주세요.'}catch(e){result.warning='작업 데이터에는 반영되었지만 영구 저장에 실패했습니다: '+e.message}}event.source.postMessage({type:'bi-data-saved',requestId:event.data.requestId,...result},location.origin)}catch(e){event.source.postMessage({type:'bi-data-save-error',requestId:event.data.requestId,error:e.message},location.origin)}
});
