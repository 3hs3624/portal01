'use strict';
let kpiCardFilters=[];
const KPI_NAMES={rows:'분석 대상',sum:'매출 합계',avg:'매출 평균',fields:'데이터 필드'};
function withDefaultKpis(charts){const measure=(profile().find(c=>c.type==='number')||profile()[0])?.name||'';return[...Object.keys(KPI_NAMES).map((metric,i)=>({kind:'kpi',metric,measure,title:'',position:{x:i*3,y:0,w:3,h:4}})),...charts.map(c=>({...c,position:undefined}))]}
function kpiContent(c){let rows;try{rows=cardFiltered(c)}catch(e){return {label:c.title||'필터 확인 필요',value:'—',note:e.message}}const i=dataset().columns.indexOf(c.measure),values=rows.map(r=>numeric(r[i])).filter(v=>v!==null),sum=values.reduce((a,b)=>a+b,0);if(c.metric==='rows')return{label:'분석 대상',value:fmt(rows.length),note:'필터 적용 후 데이터 행'};if(c.metric==='fields')return{label:'데이터 필드',value:fmt(dataset().columns.length),note:'현재 시트의 전체 열 · 행 필터와 무관'};return{label:c.measure+' · '+(c.metric==='sum'?'합계':'평균'),value:values.length?fmt(c.metric==='sum'?sum:sum/values.length):'—',note:`유효 숫자 ${fmt(values.length)}개 기준`}}
function openCardStudio(index=-1){
 if(!dashboardState.editing)return;dashboardState.selected=index;const c=state.board[index];if(c?.kind==='kpi')return openKpiEditor(index);$('#kpiEditDialog').close();$('#studioDialog').dataset.scope=c?'selected':'create';$('#studioTitle').textContent=c?'선택 차트 수정':'새 차트 추가';$('#chartEditName').value=c?.title||'';
 state.cardFilters=safeCardFilters(c?.cardFilters);if(typeof renderCardFilterEditor==='function')renderCardFilterEditor('chart');
 if(c?.kind!=='kpi'&&c)Object.assign(state,safeConfig(c));else if(c?.kind==='kpi'&&dataset().columns.includes(c.measure))state.measure=c.measure;
 refreshControls();renderBoard();$('#selectedCardLabel').textContent=c?'선택한 카드: '+(c.title||(c.kind==='kpi'?kpiContent(c).label:types[c.type][1])):'새 차트 구성';$('#applySelected').disabled=!c;$('#applySelected').textContent=c?.kind==='kpi'?'선택 KPI에 지표 적용':'선택 차트에 적용';
 if(!$('#studioDialog').open)$('#studioDialog').showModal();requestAnimationFrame(()=>{renderChart()});
}
function applyStudioSelection(){const i=dashboardState.selected,c=state.board[i];if(!dashboardState.editing||!c)return notify('보드에서 편집할 카드를 선택해 주세요.');try{if(c.kind==='kpi')c.measure=state.measure;else{optionFor(currentConfig());state.board[i]={...currentConfig(),title:$('#chartEditName').value.trim(),position:{...c.position}}}renderBoard();$('#studioDialog').close();notify('선택한 카드에 적용했습니다.')}catch(e){notify(e.message)}}
function initBoardStudio(){initKpiEditor();
 $('#openKpiCreator').onclick=openKpiCreator;$('#openStudio').onclick=()=>openCardStudio(-1);$('#closeStudio').onclick=()=>$('#studioDialog').close();$('#applySelected').onclick=applyStudioSelection;
 $('#exportBoard').onclick=()=>exportDashboard($('#boardExportFormat').value);
}
function loadExportImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('차트 이미지를 만들 수 없습니다.'));image.src=url})}
function canvasText(ctx,text,x,y,maxWidth){let s=String(text);while(s.length>1&&ctx.measureText(s).width>maxWidth)s=s.slice(0,-1);ctx.fillText(s===String(text)?s:s+'…',x,y)}
async function makeBoardCanvas(){
 if(!state.board.length)throw Error('내보낼 보드 카드가 없습니다.');ensureBoardPositions();const board=$('#board'),bounds=board.getBoundingClientRect(),cards=[...board.querySelectorAll('.board-card')];if(bounds.width<1)throw Error('분석 대시보드 화면에서 저장해 주세요.');
 const width=Math.max(960,Math.min(1800,Math.round(bounds.width))),ratio=width/bounds.width,padding=28,header=100,height=Math.ceil(Math.max(...cards.map(c=>c.getBoundingClientRect().bottom-bounds.top))*ratio)+header+padding;
 const scale=Math.min(2,16000/height,Math.sqrt(28000000/(width*height))),canvas=document.createElement('canvas');canvas.width=Math.ceil((width+padding*2)*scale);canvas.height=Math.ceil(height*scale);const ctx=canvas.getContext('2d');ctx.scale(scale,scale);const css=getComputedStyle(document.documentElement),color=n=>css.getPropertyValue(n).trim(),background=color('--bg'),ink=color('--ink'),surface=color('--surface');ctx.fillStyle=background;ctx.fillRect(0,0,width+padding*2,height);ctx.fillStyle=ink;ctx.font='bold 24px Malgun Gothic, sans-serif';canvasText(ctx,dashboardState.name,padding,38,width);ctx.font='12px Malgun Gothic, sans-serif';canvasText(ctx,`${state.name} · ${state.sheet} · ${fmt(filtered().length)}행`,padding,65,width);
 for(let i=0;i<cards.length;i++){const c=analysisCardConfig(state.board[i],i),r=cards[i].getBoundingClientRect(),x=padding+(r.left-bounds.left)*ratio,y=header+(r.top-bounds.top)*ratio,w=r.width*ratio,h=r.height*ratio;ctx.fillStyle=surface;ctx.fillRect(x,y,w,h);ctx.strokeStyle=color('--line');ctx.strokeRect(x,y,w,h);ctx.fillStyle=ink;ctx.font='bold 14px Malgun Gothic, sans-serif';canvasText(ctx,c.title||(c.kind==='kpi'?kpiContent(c).label:`${c.dimension} · ${types[c.type][1]}`),x+16,y+27,w-32);
 if(c.kind==='kpi'){const k=kpiContent(c);ctx.font=`bold ${Math.min(32,Math.max(18,w/10))}px Malgun Gothic, sans-serif`;canvasText(ctx,k.value,x+16,y+Math.min(h-32,76),w-32);ctx.font='11px Malgun Gothic, sans-serif';ctx.fillStyle=color('--muted');canvasText(ctx,k.note,x+16,y+h-18,w-32)}
 else if(c.type==='table'){
 const t=analysisTable(c),cell=(w-32)/t.columns.length,capacity=Math.max(0,Math.floor((h-92)/24)),visible=t.rows.slice(0,capacity);
 ctx.save();ctx.beginPath();ctx.rect(x+8,y+36,w-16,h-44);ctx.clip();
 [t.columns,...visible].forEach((row,ri)=>{ctx.fillStyle=ri?color('--muted'):ink;ctx.font=(ri?'':'bold ')+'11px Malgun Gothic, sans-serif';row.forEach((v,ci)=>canvasText(ctx,typeof v==='number'?fmt(v):String(v??'—'),x+16+ci*cell,y+54+ri*24,cell-8))});
 ctx.fillStyle=color('--muted');ctx.font='10px Malgun Gothic, sans-serif';canvasText(ctx,`${visible.length} / ${t.rows.length}개 그룹 표시`,x+16,y+h-14,w-32);ctx.restore();
 }
 else{const holder=document.createElement('div');holder.style.cssText=`position:fixed;left:-20000px;top:0;width:${Math.max(100,w-20)}px;height:${Math.max(80,h-48)}px`;document.body.append(holder);const chart=echarts.init(holder);try{draw(chart,c);chart.setOption({animation:false,toolbox:{show:false}},false);const image=await loadExportImage(chart.getDataURL({type:'png',pixelRatio:2,backgroundColor:'transparent'}));ctx.drawImage(image,x+10,y+38,w-20,h-48)}finally{chart.dispose();holder.remove()}}
 }
 return canvas;
}
async function exportDashboard(format){const button=$('#exportBoard');button.disabled=true;try{await document.fonts.ready;const canvas=await makeBoardCanvas(),name=(dashboardState.name||'dashboard').replace(/[\\/:*?"<>|]/g,'_');if(format==='pdf'){if(!window.jspdf)throw Error('PDF 라이브러리를 불러오지 못했습니다.');const w=842,h=w*canvas.height/canvas.width,factor=Math.min(1,14000/h),pdf=new window.jspdf.jsPDF({orientation:h>w?'portrait':'landscape',unit:'pt',format:[w*factor,h*factor]});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,w*factor,h*factor);pdf.save(name+'.pdf')}else{const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('이미지 생성 실패');download(name+'.png',blob)}notify('대시보드 전체를 저장했습니다.')}catch(e){notify(e.message)}finally{button.disabled=false}}

function openKpiEditor(index){
 const c=state.board[index];if(!dashboardState.editing||c?.kind!=='kpi')return;
 kpiCardFilters=safeCardFilters(c.cardFilters);if(typeof renderCardFilterEditor==='function')renderCardFilterEditor('kpi');
 $('#studioDialog').close();$('#kpiEditTitle').textContent='KPI 카드 수정';$('#kpiSubmit').textContent='이 카드에 적용';$('#kpiEditDialog').dataset.index=String(index);$('#kpiEditTarget').textContent='선택한 카드: '+(c.title||kpiContent(c).label);$('#kpiEditName').value=c.title||'';$('#kpiEditMetric').value=c.metric;selectOptions($('#kpiEditMeasure'),dataset().columns,c.measure);renderKpiEditPreview();if(!$('#kpiEditDialog').open)$('#kpiEditDialog').showModal();renderBoard();
}
function kpiEditDraft(){return{...(state.board[Number($('#kpiEditDialog').dataset.index)]||{kind:'kpi',position:{x:0,y:0,w:3,h:4}}),cardFilters:safeCardFilters(kpiCardFilters),title:$('#kpiEditName').value.trim(),metric:$('#kpiEditMetric').value,measure:$('#kpiEditMeasure').value}}
function renderKpiEditPreview(){const c=kpiEditDraft(),k=kpiContent(c);$('#kpiEditMeasure').disabled=['rows','fields'].includes(c.metric);$('#kpiPreviewLabel').textContent=c.title||k.label;$('#kpiPreviewValue').textContent=k.value;$('#kpiPreviewNote').textContent=k.note}
function initKpiEditor(){
 $('#cancelKpiEdit').onclick=()=>$('#kpiEditDialog').close();['kpiEditName','kpiEditMetric','kpiEditMeasure'].forEach(id=>$('#'+id).oninput=renderKpiEditPreview);
 $('#kpiEditForm').onsubmit=e=>{e.preventDefault();const i=Number($('#kpiEditDialog').dataset.index);if(!dashboardState.editing)return;try{cardFiltered(kpiEditDraft())}catch(error){return notify(error.message)}if(i===-1){if(state.board.length>=20)return notify('보드에는 최대 20개 카드를 추가할 수 있습니다.');state.board.push(safeConfig(kpiEditDraft()));dashboardState.selected=state.board.length-1}else{if(state.board[i]?.kind!=='kpi')return;state.board[i]=safeConfig(kpiEditDraft())}$('#kpiEditDialog').close();renderBoard();notify(i===-1?'KPI 카드를 추가했습니다.':'선택한 KPI 카드에 적용했습니다.')};
}

function openKpiCreator(){
 if(!dashboardState.editing)return;if(state.board.length>=20)return notify('보드에는 최대 20개 카드를 추가할 수 있습니다.');
 kpiCardFilters=[];if(typeof renderCardFilterEditor==='function')renderCardFilterEditor('kpi');
 $('#studioDialog').close();$('#kpiEditDialog').dataset.index='-1';$('#kpiEditTitle').textContent='KPI 카드 추가';$('#kpiEditTarget').textContent='표시할 항목과 지표를 선택해 카드를 추가하세요.';$('#kpiSubmit').textContent='카드 추가';$('#kpiEditName').value='';$('#kpiEditMetric').value='rows';selectOptions($('#kpiEditMeasure'),dataset().columns,state.measure);renderKpiEditPreview();$('#kpiEditDialog').showModal();
}
