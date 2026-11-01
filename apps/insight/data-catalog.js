'use strict';
const connectedData=[],detachedData=[],dataDetailWindows=new Map();let pendingDataDelete=null,dataDeleteBusy=false;
function sourceMatches(d,record,sheet){
 if(!record||!d.dataSource||d.dataSource.sheet!==sheet)return false;
 if(d.dataSource.id)return d.dataSource.id===(record.originId||record.id);
 if(!record.readOnly&&['REST API','SQLite','Microsoft Access','데이터베이스 / ERP','Google Drive / Sheets'].includes(d.dataSource.name))return false;
 const candidates=connectedData.filter(r=>r.name===d.dataSource.name&&r.sheets[sheet]);
 // Legacy names are accepted only when they identify exactly one active source.
 return record.name===d.dataSource.name&&(record.readOnly?record.retainedDashboards?.some(x=>x.id===d.id):candidates.length===1&&candidates[0].id===record.id);
}
function registerConnectedData(name,sheets,identity=''){

 const signature=identity||(['REST API','SQLite','Microsoft Access','데이터베이스 / ERP','Google Drive / Sheets'].includes(name)?'connection:'+crypto.randomUUID():'')||JSON.stringify([name,Object.entries(sheets).map(([sheet,d])=>[sheet,d.columns])]);let record=connectedData.find(r=>r.signature===signature);
 if(record){record.revisions||={};for(const sheet of Object.keys(sheets))record.revisions[sheet]=(record.revisions[sheet]||0)+1;record.sheets=sheets;record.connectedAt=new Date().toISOString()}else{record={id:identity?.startsWith('file:')?identity:crypto.randomUUID(),signature,name,sheets,connectedAt:new Date().toISOString(),links:{}};connectedData.push(record)}
 return record.id;
}
function trackDataDashboard(){
 const record=connectedData.find(r=>r.id===state.connectionId);if(!record||!state.sheet)return;
 const links=record.links[state.sheet]||=(new Map());if(dashboardState.id)links.delete('draft');
 links.set(dashboardState.id?'saved:'+dashboardState.id:dashboardState.preset||'draft',dashboardState.name);
}
function linkedDashboardNames(record,sheet){
 const saved=readDashboards(),names=[];for(const [key,name]of record.links[sheet]||[]){if(key.startsWith('saved:')){const found=saved.find(d=>d.id===key.slice(6));if(found)names.push(found.name)}else names.push(name)}
 for(const d of saved)if(sourceMatches(d,record,sheet))names.push(d.name);
 return [...new Set(names)];
}
function catalogEntries(){return connectedData.flatMap(record=>Object.entries(record.sheets).map(([sheet,data])=>({record,sheet,data,dashboards:linkedDashboardNames(record,sheet)})))}
function renderDataCatalog(){
 const body=$('#catalogRows');if(!body)return;const entries=catalogEntries();$('#catalogCount').textContent=`${connectedData.length}개 소스 · ${entries.length}개 시트`;
 body.replaceChildren(...entries.map(({record,sheet,data,dashboards})=>{const row=el('tr');row.append(el('td','',record.name),el('td','',sheet),el('td','',`${fmt(data.rows.length)}행 / ${data.columns.length}열`),el('td','catalog-dashboard',dashboards.join(', ')||'연결된 대시보드 없음'),el('td','',new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date(record.connectedAt))));const action=el('td','catalog-row-actions'),button=listActionButton('상세','열기',`${record.name} / ${sheet} 상세`);button.onclick=()=>openDataDetail(record.id,sheet);const remove=listActionButton('삭제','삭제',`${record.name} / ${sheet} 삭제`);remove.onclick=()=>openDeleteData(record.id,sheet);action.append(button,remove);row.append(action);return row}));
 if(!entries.length){const row=el('tr'),cell=el('td','','연결된 데이터가 없습니다. 우측 상단 데이터 연결 버튼에서 데이터를 불러오세요.');cell.colSpan=6;row.append(cell);body.append(row)}
}
function openDataDetail(id,sheet){
 const win=window.open(new URL('data-detail.html',location.href).href,'_blank','popup,width=1320,height=860');if(!win)return notify('팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.');
 for(const [w]of dataDetailWindows)if(w.closed)dataDetailWindows.delete(w);
 dataDetailWindows.set(win,{id,sheet});
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='bi-data-request')return;const request=dataDetailWindows.get(event.source);if(!request)return;const record=findDataRecord(request.id),data=record?.sheets[request.sheet];if(!data)return;
 event.source.postMessage({type:'bi-data-response',payload:{name:record.name,sheet:request.sheet,columns:data.columns,rows:data.rows,dashboards:linkedDashboardNames(record,request.sheet),connectedAt:record.connectedAt}},location.origin);
});

function renderConnectedDataPicker(){
 const status=$('#dataStatus');if(status){status.textContent=state.readOnly?'연결 해제 · 조회 전용':'데이터 준비 완료';status.classList.toggle('readonly-status',Boolean(state.readOnly))}
}
function selectConnectedData(value){
 let id,sheet;try{[id,sheet]=JSON.parse(value)}catch{return}
 const record=findDataRecord(id);if(!record?.sheets[sheet])return;
 if(dashboardState.editing)setDashboardEditing(false);state.readOnly=Boolean(record.readOnly);state.connectionId=id;state.name=record.name;state.sheets=record.sheets;state.sheet=sheet;changeSheet();if(record.readOnly&&record.retainedDashboards?.length)applySavedDashboard(record.retainedDashboards[0].id);renderDataCatalog();
}
function dashboardsForSelectedData(){
 const record=findDataRecord(state.connectionId),links=record?.links[state.sheet];if(record?.readOnly)return record.retainedDashboards||[];
 return readDashboards().filter(d=>d.dataSource?sourceMatches(d,record,state.sheet):links?.has('saved:'+d.id));
}

function findDataRecord(id){return connectedData.find(r=>r.id===id)||detachedData.find(r=>r.id===id)}
function findLinkedDashboard(id){const current=findDataRecord(state.connectionId);return current?.retainedDashboards?.find(d=>d.id===id)||readDashboards().find(d=>d.id===id)}
function retainedEntries(){return detachedData.flatMap(record=>Object.entries(record.sheets).map(([sheet,data])=>({record,sheet,data,dashboards:(record.retainedDashboards||[]).map(d=>d.name)})))}
function renderDataLookup(){
 const q=$('#dataLookupSearch').value.trim().toLocaleLowerCase(),entries=[...catalogEntries(),...retainedEntries()].filter(e=>[e.record.name,e.sheet,...e.dashboards].join(' ').toLocaleLowerCase().includes(q));
 $('#dataLookupRows').replaceChildren(...entries.map(({record,sheet,dashboards})=>{const row=el('tr'),name=el('td','',record.name+' / '+sheet),status=el('td','',record.readOnly?'연결 해제 · 조회 전용':'연결됨'),links=el('td','catalog-dashboard',dashboards.join(', ')||'대시보드 없음'),action=el('td'),select=el('button','','선택');select.setAttribute('aria-label',record.name+' / '+sheet+' 선택');select.onclick=()=>{$('#dataLookupDialog').close();selectConnectedData(JSON.stringify([record.id,sheet]))};action.append(select);row.append(name,status,links,action);return row}));
 if(!entries.length){const row=el('tr'),cell=el('td','','일치하는 데이터가 없습니다. 데이터 탐색 메뉴에서 연결해 주세요.');cell.colSpan=4;row.append(cell);$('#dataLookupRows').append(row)}
}
function savedForSource(record,sheet){return readDashboards().filter(d=>d.dataSource?sourceMatches(d,record,sheet):record.links[sheet]?.has('saved:'+d.id))}
function openDeleteData(id,sheet){
 const record=connectedData.find(r=>r.id===id);if(!record?.sheets[sheet])return;pendingDataDelete={id,sheet};const names=linkedDashboardNames(record,sheet);$('#deleteDataMessage').textContent=`‘${record.name} / ${sheet}’ 데이터를 목록에서 삭제할까요?`+(names.length?' 연결된 대시보드: '+names.join(', '):'');
 $('#deleteDataHelp').textContent=names.length?'대시보드를 유지하면 현재 불러온 데이터와 구성을 이 브라우저에 조회 전용 복사본으로 보관합니다. 원본 연결은 제거되며 편집할 수 없습니다. 함께 삭제하면 연결된 저장 대시보드도 삭제됩니다.':'원본 파일은 삭제하지 않습니다. 데이터 목록의 연결만 제거합니다.';
 $('#keepDataDashboards').hidden=!names.length;$('#confirmDataDelete').textContent=names.length?'데이터와 대시보드 삭제':'데이터 삭제';$('#deleteDataError').textContent='';$('#deleteDataDialog').showModal();
}
function cacheDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open('insight-bi-readonly',1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('조회 전용 복사본을 저장할 수 없습니다. 브라우저 저장 공간·권한을 확인해 주세요.'))})}
async function saveDetachedSnapshot(record){const db=await cacheDatabase();try{await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(record);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error('조회 전용 복사본 저장 실패. 데이터는 삭제하지 않았습니다.'))})}finally{db.close()}}
async function loadDetachedSnapshots(){try{const db=await cacheDatabase();try{const rows=await new Promise((resolve,reject)=>{const request=db.transaction('snapshots').objectStore('snapshots').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=reject});for(const r of rows)if(r?.readOnly&&r.sheets&&!detachedData.some(d=>d.id===r.id))detachedData.push(r)}finally{db.close()}}catch{/* Connected data remains usable if browser persistence is unavailable. */}}
async function removeConnectedData(keep){
 if(dataDeleteBusy)return;
 const target=pendingDataDelete,record=connectedData.find(r=>r.id===target?.id);if(!record?.sheets[target.sheet])return;const sheet=target.sheet,current=state.connectionId===record.id&&state.sheet===sheet,saved=savedForSource(record,sheet);let snapshot=null;dataDeleteBusy=true;$('#keepDataDashboards').disabled=true;$('#confirmDataDelete').disabled=true;
 try{
 if(keep){let retained=saved.map(d=>JSON.parse(JSON.stringify(d)));if(current&&state.board.length){const captured=createDashboardRecord(dashboardState.id||'snapshot:'+crypto.randomUUID(),dashboardState.name,dashboardState.description);retained=[captured,...retained.filter(d=>d.id!==captured.id)]}
 snapshot={id:crypto.randomUUID(),originId:record.originId||record.id,name:record.name,sheets:{[sheet]:record.sheets[sheet]},connectedAt:record.connectedAt,readOnly:true,links:{[sheet]:record.links[sheet]||new Map()},retainedDashboards:retained};await saveDetachedSnapshot(snapshot);detachedData.push(snapshot)
 }else{const ids=new Set(saved.map(d=>d.id));writeDashboards(readDashboards().filter(d=>!ids.has(d.id)))}
 delete record.sheets[sheet];delete record.links[sheet];if(!Object.keys(record.sheets).length)connectedData.splice(connectedData.indexOf(record),1);
 if(current){if(snapshot)selectConnectedData(JSON.stringify([snapshot.id,sheet]));else{const next=catalogEntries()[0]||retainedEntries()[0];if(next)selectConnectedData(JSON.stringify([next.record.id,next.sheet]));else clearSelectedData()}}
 $('#deleteDataDialog').close();pendingDataDelete=null;renderDataCatalog();notify(keep?'데이터 연결을 삭제했습니다. 남긴 대시보드는 조회 전용입니다.':'데이터 연결과 선택한 대시보드를 삭제했습니다.');
 }catch(error){$('#deleteDataError').textContent=error.message}finally{dataDeleteBusy=false;$('#keepDataDashboards').disabled=false;$('#confirmDataDelete').disabled=false}
}
function clearSelectedData(){if(dashboardState.editing)setDashboardEditing(false);Object.assign(state,{connectionId:'',name:'선택된 데이터 없음',sheets:{},sheet:'',board:[],dimension:'',measure:'',readOnly:true});Object.assign(dashboardState,{id:'',preset:'',name:'대시보드 없음',description:'데이터 조회에서 데이터를 선택하세요.',selected:-1});resetBoardHistory();refreshControls();renderBoard()}
function initDataManagement(){
 $('#openConnections').onclick=()=>$('#connectionsDialog').showModal();$('#closeConnections').onclick=()=>$('#connectionsDialog').close();if($('#openDataLookup'))$('#openDataLookup').onclick=()=>{$('#dataLookupSearch').value='';renderDataLookup();$('#dataLookupDialog').showModal();$('#dataLookupSearch').focus()};$('#closeDataLookup').onclick=()=>$('#dataLookupDialog').close();$('#dataLookupSearch').oninput=renderDataLookup;
 $('#cancelDataDelete').onclick=()=>$('#deleteDataDialog').close();$('#keepDataDashboards').onclick=()=>removeConnectedData(true);$('#confirmDataDelete').onclick=()=>removeConnectedData(false);loadDetachedSnapshots().then(()=>{if($('#dataLookupDialog').open)renderDataLookup();if(typeof renderDashboardList==='function')renderDashboardList()});
}
