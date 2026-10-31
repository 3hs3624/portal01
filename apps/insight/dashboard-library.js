'use strict';
let dashboardManagement=null,dashboardManagementBusy=false;
function dashboardLibraryEntries(){
 const entries=new Map();
 for(const dashboard of readDashboards()){
 const source=connectedData.find(r=>sourceMatches(dashboard,r,dashboard.dataSource?.sheet));
 entries.set(dashboard.id,{dashboard,source,sheet:dashboard.dataSource?.sheet||dashboard.sheet||'',status:source?'connected':'missing'});
 }
 for(const source of detachedData)for(const dashboard of source.retainedDashboards||[]){
 if(entries.get(dashboard.id)?.status==='connected')continue;
 if(entries.get(dashboard.id)?.status==='readonly'&&(entries.get(dashboard.id).dashboard.updatedAt||'')>=(dashboard.updatedAt||''))continue;
 entries.set(dashboard.id,{dashboard,source,sheet:dashboard.dataSource?.sheet||Object.keys(source.sheets)[0],status:'readonly'});
 }
 return [...entries.values()];
}
function filteredDashboardLibrary(query,status,sort){
 const q=query.toLocaleLowerCase();return dashboardLibraryEntries().filter(e=>(status==='all'||e.status===status)&&[e.dashboard.name,e.dashboard.dataSource?.name||e.source?.name||'',e.sheet].join(' ').toLocaleLowerCase().includes(q)).sort((a,b)=>sort==='name'?a.dashboard.name.localeCompare(b.dashboard.name,'ko'):(b.dashboard.updatedAt||'').localeCompare(a.dashboard.updatedAt||''));
}
function renderDashboardList(){
 if(!$('#dashboardListRows'))return;const entries=filteredDashboardLibrary($('#dashboardListSearch').value,$('#dashboardListStatus').value,$('#dashboardListSort').value),statusNames={connected:'연결됨',readonly:'연결 해제 · 조회 전용',missing:'데이터 연결 필요'};
 $('#dashboardListRows').replaceChildren(...entries.map(entry=>{const {dashboard,source,sheet,status}=entry,row=el('tr'),label=el('td','',dashboard.name),data=el('td','catalog-dashboard',(dashboard.dataSource?.name||source?.name||'데이터 연결 필요')+(sheet?' / '+sheet:'')),stateCell=el('td'),chip=el('span','pill'+(status==='connected'?'':' readonly-status'),statusNames[status]),modified=el('td','',dashboard.updatedAt?new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(dashboard.updatedAt)):'—'),actions=el('td','dashboard-list-actions');stateCell.append(chip);
 for(const [text,action]of [['열기',()=>openLibraryDashboard(dashboard.id)],['편집',()=>openDashboardManagement(dashboard.id,'rename')],['삭제',()=>openDashboardManagement(dashboard.id,'delete')]]){const button=el('button','dashboard-action-icon');button.type='button';button.title=text;button.setAttribute('aria-label',dashboard.name+' '+text);button.append(actionIcon(text));button.onclick=action;actions.append(button)}row.append(label,data,stateCell,modified,actions);return row}));
 if(!entries.length){const row=el('tr'),cell=el('td','','표시할 대시보드가 없습니다. ‘대시보드 만들기’에서 기본 템플릿으로 시작하세요.');cell.colSpan=5;row.append(cell);$('#dashboardListRows').append(row)}
 $('#dashboardListCount').textContent=`전체 ${dashboardLibraryEntries().length}개 중 ${entries.length}개`;
}
function openLibraryDashboard(id){
 const entry=dashboardLibraryEntries().find(e=>e.dashboard.id===id);if(!entry)return notify('대시보드를 찾을 수 없습니다.');
 if(!entry.source)return openRelinkDashboard(id);
 const previous=dashboardState.editing;if(previous)setDashboardEditing(false);
 const previousSource={readOnly:state.readOnly,connectionId:state.connectionId,name:state.name,sheets:state.sheets,sheet:state.sheet};state.readOnly=entry.status==='readonly';state.connectionId=entry.source.id;state.name=entry.source.name;state.sheets=entry.source.sheets;state.sheet=entry.sheet;
 const match=dashboardCompatibility(entry.dashboard);if(!match.ok){Object.assign(state,previousSource);refreshControls();return notify('필요한 열 또는 데이터 유형이 다릅니다. 원본 데이터 구성을 확인해 주세요.')}
 applySavedDashboard(id);showPage('dashboard');
}
function openCreateDashboard(){
 const entries=catalogEntries().filter(e=>e.data.columns.length);if(!entries.length){showPage('data');return notify('먼저 데이터를 연결해 주세요. 조회 전용 복사본으로는 새 대시보드를 만들 수 없습니다.')}
 $('#newDashboardSource').value='';$('#newDashboardSourceLabel').textContent='데이터를 조회하여 선택하세요';$('#newDashboardName').value='';$('#newDashboardTemplate').value='basic1';$('#createDashboardError').textContent='';$('#createDashboardDialog').showModal();
}
function openDashboardManagement(id,mode){
 const entry=dashboardLibraryEntries().find(e=>e.dashboard.id===id);if(!entry)return;dashboardManagement={id,mode};$('#manageDashboardTitle').textContent=mode==='rename'?'대시보드 편집':'대시보드 삭제';$('#manageDashboardMessage').textContent=mode==='rename'?'목록과 조회 전용 보관본의 이름도 함께 변경합니다.':`‘${entry.dashboard.name}’을 삭제할까요? 저장된 구성과 같은 대시보드의 조회 전용 보관본을 함께 삭제합니다. 마지막 보관 대시보드라면 해당 조회용 데이터 복사본도 제거합니다. 원본 연결·파일과 다른 대시보드는 유지됩니다.`;$('#renameDashboardLabel').hidden=mode!=='rename';$('#renameDashboardName').required=mode==='rename';$('#renameDashboardName').value=entry.dashboard.name;$('#manageDashboardError').textContent='';$('#commitManageDashboard').textContent=mode==='rename'?'저장':'삭제';$('#manageDashboardDialog').showModal();
}
async function commitDashboardMetadata(id,name){
 const saved=readDashboards(),renaming=name!==null;
 if(renaming&&(!name.trim()||name.trim().length>60))throw Error('대시보드 이름은 1~60자로 입력해 주세요.');
 if(renaming&&dashboardLibraryEntries().some(e=>e.dashboard.id!==id&&e.dashboard.name===name.trim()))throw Error('같은 이름의 대시보드가 있습니다.');
 const updatedAt=new Date().toISOString(),change=d=>({...d,name:name.trim(),updatedAt}),nextSaved=renaming?saved.map(d=>d.id===id?change(d):d):saved.filter(d=>d.id!==id),affected=detachedData.filter(r=>r.retainedDashboards?.some(d=>d.id===id)),replacements=affected.map(r=>({...r,retainedDashboards:renaming?r.retainedDashboards.map(d=>d.id===id?change(d):d):r.retainedDashboards.filter(d=>d.id!==id)}));
 // Browser storage and snapshot writes are complete before updating the visible list.
 writeDashboards(nextSaved);
 try{if(affected.length){const db=await cacheDatabase();try{await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots');for(const record of replacements){if(record.retainedDashboards.length)store.put(record);else store.delete(record.id)}tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error('보관본 변경에 실패했습니다. 다시 시도해 주세요.'))})}finally{db.close()}}}catch(error){writeDashboards(saved);throw error}
 for(const replacement of replacements){const index=detachedData.findIndex(r=>r.id===replacement.id);if(index<0)continue;if(replacement.retainedDashboards.length)detachedData[index]=replacement;else detachedData.splice(index,1)}
 if(dashboardState.id===id){if(renaming){dashboardState.name=name.trim();updateDashboardUI()}else{if(state.readOnly&&!findDataRecord(state.connectionId))clearSelectedData();else{dashboardState.id='';dashboardState.name='대시보드 없음';state.board=[];renderBoard()}showPage('dashboards')}}
 renderDashboardList();renderDataCatalog();
}
function initDashboardLibrary(){initRelinkDashboard();initCreateSourceLookup();
 $('#createDashboard').onclick=openCreateDashboard;$('#backToDashboards').onclick=()=>{if(dashboardState.editing)setDashboardEditing(false);showPage('dashboards')};
 ['dashboardListSearch','dashboardListStatus','dashboardListSort'].forEach(id=>$('#'+id).addEventListener(id==='dashboardListSearch'?'input':'change',renderDashboardList));
 $('#cancelCreateDashboard').onclick=()=>$('#createDashboardDialog').close();$('#createDashboardForm').onsubmit=e=>{e.preventDefault();const name=$('#newDashboardName').value.trim();if(!name)return;try{if(dashboardLibraryEntries().some(e=>e.dashboard.name===name))throw Error('같은 이름의 대시보드가 있습니다.');if(!creationSourceEntry($('#newDashboardSource').value))throw Error('연결 데이터를 조회하여 선택해 주세요.');selectConnectedData($('#newDashboardSource').value);applyPreset($('#newDashboardTemplate').value,false);saveDashboard(name,'',false);$('#createDashboardDialog').close();showPage('dashboard');setDashboardEditing(true)}catch(error){$('#createDashboardError').textContent=error.message}};
 $('#cancelManageDashboard').onclick=()=>$('#manageDashboardDialog').close();$('#manageDashboardForm').onsubmit=async e=>{e.preventDefault();if(dashboardManagementBusy||!dashboardManagement)return;dashboardManagementBusy=true;$('#commitManageDashboard').disabled=true;try{await commitDashboardMetadata(dashboardManagement.id,dashboardManagement.mode==='rename'?$('#renameDashboardName').value:null);$('#manageDashboardDialog').close();notify('대시보드 목록에 반영했습니다.')}catch(error){$('#manageDashboardError').textContent=error.message}finally{dashboardManagementBusy=false;$('#commitManageDashboard').disabled=false}};
 showPage('dashboards');
}

let relinkDashboardId='';
function openRelinkDashboard(id){
 const entries=catalogEntries().filter(e=>e.data.columns.length);if(!entries.length){showPage('data');return notify('원본 데이터를 연결한 뒤 다시 열어 주세요.')}
 relinkDashboardId=id;selectOptions($('#relinkDashboardSource'),entries.map(e=>[JSON.stringify([e.record.id,e.sheet]),e.record.name+' / '+e.sheet]),'');$('#relinkDashboardError').textContent='원본과 같은 구조의 데이터·시트를 선택하세요.';$('#relinkDashboardDialog').showModal();
}
function initRelinkDashboard(){
 $('#cancelRelinkDashboard').onclick=()=>$('#relinkDashboardDialog').close();$('#relinkDashboardForm').onsubmit=e=>{e.preventDefault();const dashboard=readDashboards().find(d=>d.id===relinkDashboardId);if(!dashboard)return;const [id,sheet]=JSON.parse($('#relinkDashboardSource').value),source=connectedData.find(r=>r.id===id);if(!source?.sheets[sheet])return;const previous={name:state.name,sheets:state.sheets,sheet:state.sheet};state.name=source.name;state.sheets=source.sheets;state.sheet=sheet;const match=dashboardCompatibility(dashboard);Object.assign(state,previous);if(!match.ok)return $('#relinkDashboardError').textContent='필요한 열 또는 데이터 유형이 일치하지 않습니다.';try{writeDashboards(readDashboards().map(d=>d.id===dashboard.id?{...d,dataSource:{id:source.id,name:source.name,sheet},sheet}:d));$('#relinkDashboardDialog').close();openLibraryDashboard(dashboard.id)}catch(error){$('#relinkDashboardError').textContent=error.message}};
}

function creationSourceEntry(value){let id,sheet;try{[id,sheet]=JSON.parse(value)}catch{return null}return catalogEntries().find(e=>e.record.id===id&&e.sheet===sheet&&e.data.columns.length)||null}
function renderCreateSourceLookup(){
 const q=$('#createSourceSearch').value.trim().toLocaleLowerCase(),entries=catalogEntries().filter(e=>e.data.columns.length&&[e.record.name,e.sheet].join(' ').toLocaleLowerCase().includes(q));
 $('#createSourceRows').replaceChildren(...entries.map(({record,sheet,data})=>{const row=el('tr'),action=el('td'),button=el('button','','선택');button.setAttribute('aria-label',record.name+' / '+sheet+' 선택');button.onclick=()=>{const value=JSON.stringify([record.id,sheet]);if(!creationSourceEntry(value))return notify('선택한 데이터가 더 이상 연결되어 있지 않습니다.');$('#newDashboardSource').value=value;$('#newDashboardSourceLabel').textContent=record.name+' / '+sheet;$('#newDashboardSourceLabel').title=record.name+' / '+sheet;$('#createDashboardError').textContent='';$('#createSourceLookupDialog').close()};action.append(button);row.append(el('td','',record.name),el('td','',sheet),el('td','',`${fmt(data.rows.length)}행 / ${data.columns.length}열`),action);return row}));
 if(!entries.length){const row=el('tr'),cell=el('td','','검색 결과가 없습니다. 데이터 연결 상태를 확인해 주세요.');cell.colSpan=4;row.append(cell);$('#createSourceRows').append(row)}
}
function initCreateSourceLookup(){
 $('#lookupNewDashboardSource').onclick=()=>{$('#createSourceSearch').value='';renderCreateSourceLookup();$('#createSourceLookupDialog').showModal();$('#createSourceSearch').focus()};$('#closeCreateSourceLookup').onclick=()=>$('#createSourceLookupDialog').close();$('#createSourceSearch').oninput=renderCreateSourceLookup;
}
