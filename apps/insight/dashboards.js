'use strict';
const DASHBOARD_STORAGE='insight-bi-dashboards-v1';
const dashboardState={id:'',preset:'basic1',name:'기본1 · 종합 현황',description:'',layout:'grid',baseline:'',pendingDelete:'',editing:false,selected:-1};
const presetInfo={basic1:['기본1 · 종합 현황','핵심 지표와 항목별 비교·비중을 한눈에 확인합니다.','grid'],basic2:['기본2 · 추이·비교','첫 차트를 넓게 배치하고 시간 흐름과 여러 지표를 비교합니다.','focus'],basic3:['기본3 · 분포·상세','값의 분포와 관계를 촘촘한 카드로 살펴봅니다.','compact']};
function safeConfig(c){const cardFilters=safeCardFilters(c?.cardFilters);if(c&&c.kind==='kpi'){if(!['rows','sum','avg','fields'].includes(c.metric)||typeof c.measure!=='string')throw Error('잘못된 KPI 설정');return{cardFilters,kind:'kpi',metric:c.metric,measure:c.measure,title:typeof c.title==='string'?c.title.slice(0,100):'',wide:false,...(validPosition(c.position)?{position:{...c.position}}:{})}}if(!c||!Object.hasOwn(types,c.type)||typeof c.dimension!=='string'||typeof c.measure!=='string'||!['sum','avg','count','min','max'].includes(c.aggregate)||!['natural','asc','desc'].includes(c.sort))throw Error('올바르지 않은 차트 설정입니다.');return{...safeAnalysisConfig(c),cardFilters,type:c.type,dimension:c.dimension,measure:c.measure,aggregate:c.aggregate,sort:c.sort,...(typeof c.title==='string'?{title:c.title.slice(0,100)}:{}),wide:c.wide===true,...(validPosition(c.position)?{position:{...c.position}}:{})}}
function readDashboards(){try{const saved=JSON.parse(localStorage.getItem(DASHBOARD_STORAGE)||'[]');if(!Array.isArray(saved))throw Error();return saved.filter(x=>x&&x.version===1&&typeof x.id==='string'&&typeof x.name==='string'&&Array.isArray(x.board)&&x.board.length<=20&&Array.isArray(x.schema)&&x.schema.every(s=>s&&typeof s.name==='string'&&['number','category','date'].includes(s.type))&&['grid','focus','compact'].includes(x.layout)&&x.filters&&typeof x.filters.search==='string'&&typeof x.filters.filterColumn==='string'&&typeof x.filters.filterValue==='string').filter(x=>{try{safeConfig(x.explorer);x.board.forEach(safeConfig);safeSlicers(x.slicers);return true}catch{return false}})}catch{notify('저장한 대시보드 목록을 읽을 수 없습니다. 브라우저 저장소를 확인해 주세요.');return[]}}
function writeDashboards(items){try{localStorage.setItem(DASHBOARD_STORAGE,JSON.stringify(items))}catch{throw Error('저장 공간이 부족하거나 저장이 차단되었습니다. 브라우저 설정을 확인해 주세요.')}}
function dashboardSnapshot(){ensureBoardPositions();return{explorer:safeConfig(currentConfig()),board:state.board.map(safeConfig),layout:dashboardState.layout,slicers:safeSlicers(state.slicers),filters:{search:state.search,filterColumn:state.filterColumn,filterValue:state.filterValue}}}
function snapshotSignature(){return JSON.stringify(dashboardSnapshot())}
function createDashboardRecord(id,name,description){const snapshot=dashboardSnapshot(),columns=new Set([snapshot.explorer,...snapshot.board].flatMap(c=>[c.dimension,c.measure,...(c.measures||[]),c.splitBy,...(c.drillDimensions||[]),...(c.cardFilters||[]).map(f=>f.column)]));for(const slicer of snapshot.slicers)columns.add(slicer.column);if(snapshot.filters.filterColumn)columns.add(snapshot.filters.filterColumn);return{version:1,id,name:name.trim().slice(0,60),description:description.trim().slice(0,240),updatedAt:new Date().toISOString(),sheet:state.sheet,dataSource:{id:state.connectionId,name:state.name,sheet:state.sheet},schema:profile().filter(c=>columns.has(c.name)).map(c=>({name:c.name,type:c.type})),...snapshot}}
function dashboardCompatibility(record){const p=profile(),byName=new Map(p.map(c=>[c.name,c]));const missing=record.schema.filter(s=>!byName.has(s.name)).map(s=>s.name),changed=record.schema.filter(s=>byName.has(s.name)&&byName.get(s.name).type!==s.type).map(s=>s.name);return{ok:!missing.length&&!changed.length,missing,changed}}
function buildPreset(id){const p=profile();if(!p.length)throw Error('분석할 데이터 열이 없습니다.');const dates=p.filter(c=>c.type==='date'),cats=p.filter(c=>c.type==='category'),nums=p.filter(c=>c.type==='number'),dim=(cats[0]||dates[0]||p[0]).name,metric=(nums[0]||p[0]).name,agg=nums.length?'sum':'count',time=(dates[0]||cats[0]||p[0]).name;
 const c=(type,dimension=dim,measure=metric,aggregate=agg,sort='natural',title='')=>({type,dimension,measure,aggregate,sort,title,wide:false});
 const cat=cats.find(x=>x.unique>0&&x.unique<=8),canShare=cat&&nums.length&&dataset().rows.every(r=>(numeric(r[nums[0].index])??0)>=0)&&dataset().rows.some(r=>(numeric(r[nums[0].index])??0)>0);
 if(id==='basic1'){const main=c(dates.length&&nums.length?'line':'bar',dates.length?time:dim);return{explorer:main,board:[c('horizontal',dim,metric,agg,'desc','항목별 비교'),canShare?c('donut',cat.name,metric,agg,'natural','구성 비중'):c('bar',(cats[1]||cats[0]||p[0]).name,metric,agg,'natural','범주별 현황'),c('bar',dim,(nums[1]||nums[0]||p[0]).name,nums.length?'avg':'count','desc','주요 지표 비교')]}}
 if(id==='basic2'){const main=c(dates.length&&nums.length?'line':'bar',time);return{explorer:main,board:[c(dates.length&&nums.length?'area':'bar',time,metric,agg,'natural','기간별 흐름'),c('horizontal',dim,(nums[1]||nums[0]||p[0]).name,agg,'desc','보조 지표 비교'),c('bar',(cats[1]||cats[0]||p[0]).name,metric,agg,'desc','항목별 순위')]}}
 if(id==='basic3'){const main=nums.length?c('histogram',dim,metric,'count'):c('bar',dim,metric,'count');return{explorer:main,board:nums.length?[c('histogram',dim,metric,'count','natural','지표 분포'),c('boxplot',dim,metric,'avg','natural','범주별 분포'),nums.length>=2?c('scatter',nums[0].name,nums[1].name,'sum','natural','두 지표의 관계'):c('horizontal',dim,metric,'avg','desc','항목별 평균')]:[c('bar',dim,metric,'count','desc','범주별 빈도'),c('horizontal',(cats[1]||p[0]).name,metric,'count','desc','상세 빈도')]}}
 throw Error('알 수 없는 기본 대시보드입니다.');
}
function applyPreset(id,announce=true){resetAnalysisView();Object.assign(state,{dateGrain:'raw',measures:[],splitBy:'',drillDimensions:[]});dashboardState.selected=-1;try{const preset=buildPreset(id),[name,description,layout]=presetInfo[id];Object.assign(state,preset.explorer,{cardFilters:[],slicers:[],board:withDefaultKpis(preset.board),search:'',filterColumn:'',filterValue:'',page:0});Object.assign(dashboardState,{id:'',preset:id,name,description,layout});dashboardState.baseline=snapshotSignature();resetBoardHistory();refreshControls();renderAll();if(announce)notify(name+'을 적용했습니다. 변경한 구성은 커스텀으로 저장할 수 있습니다.')}catch(e){notify(e.message)}}
function applySavedDashboard(id){resetAnalysisView();dashboardState.selected=-1;const record=(typeof findLinkedDashboard==='function'?findLinkedDashboard(id):readDashboards().find(x=>x.id===id));if(!record)return notify('불러올 대시보드를 선택해 주세요.');if(record.dataSource&&!sourceMatches(record,findDataRecord(state.connectionId),state.sheet))return notify('선택한 데이터에 연결된 대시보드가 아닙니다.');const match=dashboardCompatibility(record);if(!match.ok)return notify([match.missing.length?'필요한 열 없음: '+match.missing.join(', '):'',match.changed.length?'데이터 유형 다름: '+match.changed.join(', '):''].filter(Boolean).join(' / ')+' · 원본과 같은 구조의 시트를 연결해 주세요.');Object.assign(state,safeConfig(record.explorer),{slicers:safeSlicers(record.slicers),board:record.board.map(safeConfig),...record.filters,page:0});Object.assign(dashboardState,{id:record.id,preset:'',name:record.name,description:record.description||'',layout:record.layout});dashboardState.baseline=snapshotSignature();resetBoardHistory();refreshControls();renderAll();notify('저장한 대시보드를 불러왔습니다. 현재 연결한 데이터로 표시합니다.')}
function updateDashboardUI(){if(!$('#dashboardName'))return;$('#dashboardName').textContent=dashboardState.name;$('#dashboardDescription').textContent=dashboardState.description;$('#dashboardDirty').hidden=snapshotSignature()===dashboardState.baseline;$('#boardLayout').value=dashboardState.layout;$('#openedDashboardName').textContent=dashboardState.name;renderTemplatePicker();syncEditMode();trackDataDashboard()}
function renderDashboardBoard(){
 if(typeof renderDashboardSlicers==='function')renderDashboardSlicers();
 if(typeof renderAnalysisStatus==='function')renderAnalysisStatus();miniCharts.forEach(c=>c.dispose());miniCharts=[];ensureBoardPositions();
 const board=$('#board');board.replaceChildren();board.dataset.layout=dashboardState.layout;$('#boardCount').textContent=state.board.length;
 if(!state.board.length){board.append(el('div','board-empty','edit를 켜고 차트를 추가해 커스텀 대시보드를 만드세요.'));return}
 state.board.forEach((c,i)=>{
 const card=el('div','card board-card'),head=el('div','card-heading'),title=el('h2','',c.title||(c.kind==='kpi'?kpiContent(c).label:`${c.dimension} · ${types[c.type][1]}`)),actions=el('div','board-actions'),container=el('div','small-chart');card.dataset.index=i;card.classList.toggle('selected',dashboardState.editing&&dashboardState.selected===i);card.onclick=e=>{if(dashboardState.editing&&!e.target.closest('button,input')){dashboardState.selected=i;document.querySelectorAll('#board .board-card').forEach((node,j)=>node.classList.toggle('selected',i===j))}};
 const drag=el('button','tile-drag','⠿ 이동');drag.setAttribute('aria-label',`${i+1}번 차트 이동`);drag.title='드래그하여 이동 · 방향키로 미세 이동 · Shift로 크게 이동';head.append(drag,title);if(c.cardFilters?.length){const badge=el('span','card-filter-badge','필터 '+c.cardFilters.length);badge.title=c.cardFilters.map(r=>r.column+' '+CARD_FILTER_OPERATORS[r.op]+' '+r.value+(r.op==='between'?' ~ '+r.value2:'')).join(' · ');head.append(badge)}
 const button=(text,label,action)=>{const b=el('button','',text);b.type='button';b.setAttribute('aria-label',`${i+1}번 차트 ${label}`);b.onclick=()=>{if(dashboardState.editing)action()};return b};
 actions.append(button('편집 / 수정','편집',()=>openCardStudio(i)),button('×','삭제',()=>{state.board.splice(i,1);dashboardState.selected=-1;renderBoard()}));head.append(actions);
 const input=el('input','board-title');input.value=c.title||'';input.placeholder='차트 제목';input.maxLength=100;input.setAttribute('aria-label',`${i+1}번 차트 제목`);input.onchange=()=>{if(dashboardState.editing){c.title=input.value.trim();renderBoard()}};
 const resize=el('button','tile-resize','◢');resize.setAttribute('aria-label',`${i+1}번 차트 크기 조절`);resize.title='드래그하여 크기 조절 · 방향키로 미세 조절 · Shift로 크게 조절';
 card.append(head,input,container,resize);board.append(card);bindTileGesture(drag,i,'move');bindTileGesture(resize,i,'resize');
 if(c.kind==='kpi'){container.classList.add('kpi-tile');const k=kpiContent(c);container.append(el('strong','',k.value),el('p','muted',k.note))}else if(c.type==='table'&&typeof renderTableCard==='function'){renderTableCard(container,analysisCardConfig(c,i))}else if(!$('#dashboard').hidden){const small=echarts.init(container);miniCharts.push(small);const view=analysisCardConfig(c,i);draw(small,view);bindAnalysisClick(small,c,i,view)}
 });applyTileStyles();
}

function openDashboardSave(){const existing=readDashboards().some(x=>x.id===dashboardState.id);$('#dashboardTitleInput').value=existing?dashboardState.name:dashboardState.preset?'':dashboardState.name;$('#dashboardDescriptionInput').value=dashboardState.description;$('#dashboardSaveError').textContent='';$('#updateDashboard').hidden=!existing;$('#copyDashboard').classList.toggle('primary',!existing);$('#dashboardDialog').showModal();$('#dashboardTitleInput').focus()}
function saveDashboard(name,description,update){const records=readDashboards(),existing=records.find(x=>x.id===dashboardState.id),trimmed=name.trim();if(!trimmed)throw Error('대시보드 이름을 입력해 주세요.');if(update&&!existing)throw Error('업데이트할 대시보드가 없습니다. 새로 저장해 주세요.');if(records.some(x=>x.name===trimmed&&(!update||x.id!==existing.id)))throw Error('같은 이름의 대시보드가 있습니다. 다른 이름을 입력하거나 기존 대시보드를 불러와 업데이트하세요.');if(!update&&records.length>=40)throw Error('대시보드는 최대 40개까지 저장할 수 있습니다.');const id=update?existing.id:crypto.randomUUID(),record=createDashboardRecord(id,trimmed,description);writeDashboards(update?records.map(x=>x.id===id?record:x):[...records,record]);Object.assign(dashboardState,{id,preset:'',name:record.name,description:record.description});dashboardState.baseline=snapshotSignature();updateDashboardUI();return record}
function initDashboards(){initDashboardEditor();$('#save').onclick=openDashboardSave;$('#boardLayout').onchange=e=>{if(!dashboardState.editing)return;dashboardState.layout=e.target.value;state.board.forEach(c=>delete c.position);renderBoard()};$('#cancelDashboardSave').onclick=()=>$('#dashboardDialog').close();$('#dashboardSaveForm').onsubmit=e=>{e.preventDefault();try{saveDashboard($('#dashboardTitleInput').value,$('#dashboardDescriptionInput').value,e.submitter===$('#updateDashboard'));$('#dashboardDialog').close();notify('대시보드를 저장했습니다. 다음 실행에도 목록에서 불러올 수 있습니다.')}catch(e){$('#dashboardSaveError').textContent=e.message}};updateDashboardUI()}

function renderTemplatePicker(){}
function selectDashboardTemplate(value){
 if(Object.hasOwn(presetInfo,value))applyPreset(value);
 else if(value.startsWith('custom:'))applySavedDashboard(value.slice(7));
 updateDashboardUI();
}
function initDashboardEditor(){initBoardUndo();

 $('#editDashboard').onclick=()=>setDashboardEditing(!dashboardState.editing);
 syncEditMode();
}
function validPosition(p){return p&&['x','y','w','h'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k]*10-Math.round(p[k]*10))<1e-6)&&p.x>=0&&p.y>=0&&p.w>=3&&p.w<=12&&p.h>=3&&p.h<=24&&p.x+p.w<=12&&p.y<=512}
function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function settlePositions(positions,anchor=-1){
 const placed=anchor<0?[]:[anchor];
 for(let i=0;i<positions.length;i++){if(i===anchor)continue;const p=positions[i];let hit;while((hit=placed.find(j=>overlaps(p,positions[j])))!==undefined)p.y=positions[hit].y+positions[hit].h;placed.push(i)}
 return positions;
}
function ensureBoardPositions(){
 const cols=dashboardState.layout==='compact'?3:2;let y=0,x=0;
 const positions=state.board.map((c,i)=>{if(validPosition(c.position))return{...c.position};const w=c.wide||(dashboardState.layout==='focus'&&i===0)?12:12/cols,h=dashboardState.layout==='focus'&&i===0?12:9;if(x+w>12){x=0;y+=9}const p={x,y,w,h};x+=w;if(x>=12){x=0;y+=h}return p});settlePositions(positions);positions.forEach((p,i)=>state.board[i].position=p);
}
function proposeTilePositions(positions,index,mode,dx,dy){
 const result=positions.map(p=>({...p})),p=result[index],snap=n=>Math.round(n*10)/10;dx=snap(dx);dy=snap(dy);
 if(mode==='resize'){p.w=Math.max(3,Math.min(12-p.x,snap(p.w+dx)));p.h=Math.max(3,Math.min(24,snap(p.h+dy)))}
 else{p.x=Math.max(0,Math.min(12-p.w,snap(p.x+dx)));p.y=Math.max(0,Math.min(400,snap(p.y+dy)))}
 return settlePositions(result,index);
}
function setDashboardEditing(editing){if(editing&&state.readOnly)return notify('연결 해제된 데이터는 조회만 가능합니다. 데이터를 다시 연결해 주세요.');resetAnalysisView();dashboardState.editing=Boolean(editing);if(!editing&&$('#studioDialog').open)$('#studioDialog').close();syncEditMode();renderBoard();requestAnimationFrame(()=>{chart.resize();miniCharts.forEach(c=>c.resize())});notify(editing?'편집 모드 · 손잡이를 드래그하여 이동·크기를 조절하세요.':'편집 잠금 · 배치를 고정했습니다. 저장하지 않은 변경은 저장 버튼으로 보관하세요.')}
function syncEditMode(){
 document.documentElement.classList.toggle('dashboard-editing',dashboardState.editing);$('#editDashboard').disabled=Boolean(state.readOnly);$('#editDashboard').setAttribute('aria-pressed',String(dashboardState.editing));$('#editModeLabel').textContent=dashboardState.editing?'🔓':'🔒';$('#editModeLabel').setAttribute('aria-label',dashboardState.editing?'편집 가능':'편집 잠금');$('#editModeLabel').title=dashboardState.editing?'편집 가능':'편집 잠금';
 document.querySelectorAll('.tile-drag,.tile-resize,.board-title').forEach(n=>n.disabled=!dashboardState.editing);
}
let tileResizeFrame=0;
function applyTileStyles(){
 document.querySelectorAll('#board .board-card').forEach((card,i)=>{const p=state.board[i].position;card.style.gridColumn=`${Math.round(p.x*10)+1} / span ${Math.round(p.w*10)}`;card.style.gridRow=`${Math.round(p.y*10)+1} / span ${Math.round(p.h*10)}`});
 cancelAnimationFrame(tileResizeFrame);tileResizeFrame=requestAnimationFrame(()=>miniCharts.forEach(c=>c.resize()));
}
function bindTileGesture(handle,index,mode){
 handle.onpointerdown=e=>{
 if(!dashboardState.editing||e.button!==0||boardHistory.gesture)return;e.preventDefault();
 const board=$('#board'),card=handle.closest('.board-card'),origin=state.board.map(c=>({...c.position})),p=origin[index],rect=card.getBoundingClientRect(),boardRect=board.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,startScroll=window.scrollY,unitX=boardRect.width/12,unitY=46;
 let lastX=startX,lastY=startY,frame=0,started=false,ended=false,candidate={...p};
 const oldMinHeight=board.style.minHeight;
 const placeholder=el('div','tile-drop-preview');placeholder.setAttribute('aria-hidden','true');
 boardHistory.gesture=true;updateUndoButton();handle.setPointerCapture(e.pointerId);
 const paint=()=>{
 frame=0;if(ended)return;const dx=lastX-startX,dy=lastY-startY+window.scrollY-startScroll;
 if(!started&&Math.hypot(dx,dy)<5)return;
 if(!started){started=true;document.documentElement.classList.add('tile-gesture');board.style.minHeight=`${boardRect.height+Math.max(rect.height,180)}px`;card.classList.add('tile-active');board.append(placeholder)}
 candidate=previewTilePosition(p,mode,dx/unitX,dy/unitY);
 const x=candidate.x*unitX,y=candidate.y*unitY;
 placeholder.style.cssText=`left:${x}px;top:${y}px;width:${candidate.w*unitX-14}px;height:${candidate.h*unitY-14}px`;
 if(mode==='move'){
 const rawX=Math.max(-p.x*unitX,Math.min((12-p.w-p.x)*unitX,dx)),rawY=Math.max(-p.y*unitY,Math.min((400-p.y)*unitY,dy));card.style.transform=`translate3d(${rawX}px,${rawY}px,0)`;
 }else{card.style.width=`${candidate.w*unitX-14}px`;card.style.height=`${candidate.h*unitY-14}px`}
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint)};
 const move=event=>{lastX=event.clientX;lastY=event.clientY;schedule()};
 const finish=event=>{
 if(ended)return;const cancelled=['pointercancel','lostpointercapture','escape'].includes(event.type);
 if(event.clientX!==undefined){lastX=event.clientX;lastY=event.clientY}if(frame){cancelAnimationFrame(frame);frame=0}if(!cancelled)paint();ended=true;
 handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;handle.onlostpointercapture=null;window.removeEventListener('scroll',schedule);document.removeEventListener('keydown',escape);
 if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
 placeholder.remove();card.classList.remove('tile-active');card.style.transform='';card.style.width='';card.style.height='';board.style.minHeight=oldMinHeight;
 if(started&&!cancelled){const next=origin.map(x=>({...x}));next[index]=candidate;settlePositions(next,index).forEach((position,i)=>state.board[i].position=position)}
 boardHistory.gesture=false;document.documentElement.classList.remove('tile-gesture');applyTileStyles();trackBoardHistory();updateDashboardUI();
 };
 const escape=event=>{if(event.key==='Escape'){event.preventDefault();finish({type:'escape'})}};
 handle.onpointermove=move;handle.onpointerup=finish;handle.onpointercancel=finish;handle.onlostpointercapture=finish;window.addEventListener('scroll',schedule,{passive:true});document.addEventListener('keydown',escape);
 };
 handle.onkeydown=e=>{if(!dashboardState.editing||boardHistory.gesture)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;e.preventDefault();proposeTilePositions(state.board.map(c=>c.position),index,mode,...delta.map(n=>n*(e.shiftKey?1:.1))).forEach((p,i)=>state.board[i].position=p);applyTileStyles();trackBoardHistory();updateDashboardUI()};
}
function previewTilePosition(position,mode,dx,dy){
 const p={...position},snap=n=>Math.round(n*10)/10;
 if(mode==='resize'){p.w=Math.max(3,Math.min(12-p.x,snap(p.w+dx)));p.h=Math.max(3,Math.min(24,snap(p.h+dy)))}
 else{p.x=Math.max(0,Math.min(12-p.w,snap(p.x+dx)));p.y=Math.max(0,Math.min(400,snap(p.y+dy)))}
 return p;
}
// Store only committed board edits. A completed drag is one undo step.
const boardHistory={past:[],present:'',gesture:false,restoring:false};
function boardHistorySnapshot(){ensureBoardPositions();return JSON.stringify({board:state.board.map(safeConfig),layout:dashboardState.layout,slicers:safeSlicers(state.slicers)})}
function resetBoardHistory(){boardHistory.past=[];boardHistory.present=boardHistorySnapshot();boardHistory.gesture=false;updateUndoButton()}
function updateUndoButton(){const button=$('#undoBoard');if(button)button.disabled=!dashboardState.editing||!boardHistory.past.length||boardHistory.gesture}
function trackBoardHistory(){
 if(boardHistory.restoring||boardHistory.gesture)return;
 const next=boardHistorySnapshot();
 if(boardHistory.present&&next!==boardHistory.present&&dashboardState.editing){boardHistory.past.push(boardHistory.present);if(boardHistory.past.length>60)boardHistory.past.shift()}
 boardHistory.present=next;updateUndoButton();
}
function undoBoardEdit(){
 if(!dashboardState.editing||boardHistory.gesture||!boardHistory.past.length)return false;
 const snapshot=JSON.parse(boardHistory.past.pop());boardHistory.restoring=true;
 try{state.board=snapshot.board.map(safeConfig);dashboardState.layout=snapshot.layout;state.slicers=safeSlicers(snapshot.slicers);dashboardState.selected=-1;boardHistory.present=boardHistorySnapshot();renderBoard();updateUndoButton();notify('마지막 보드 편집을 되돌렸습니다.')}finally{boardHistory.restoring=false}
 return true;
}
function shouldUndoBoardEvent(e){return dashboardState.editing&&!boardHistory.gesture&&(e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&!e.isComposing&&e.key.toLowerCase()==='z'&&!e.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')&&!document.querySelector('dialog[open]')&&!$('#dashboard').hidden}
function initBoardUndo(){
 $('#undoBoard').onclick=undoBoardEdit;
 document.addEventListener('keydown',e=>{if(!shouldUndoBoardEvent(e))return;e.preventDefault();if(!undoBoardEdit())notify('되돌릴 보드 편집이 없습니다.')});
 updateUndoButton();
}
