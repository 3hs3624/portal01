'use strict';
function refreshAnalysisControls(){
 const grain=$('#dateGrain');if(!grain)return;
 const config=safeAnalysisConfig(state),columns=dataset().columns;
 selectOptions(grain,Object.entries(DATE_GRAINS),config.dateGrain);
 selectOptions($('#extraMeasures'),profile().filter(c=>c.type==='number').map(c=>c.name),'');
 for(const o of $('#extraMeasures').options)o.selected=config.measures.includes(o.value);
 selectOptions($('#splitBy'),[['','분할 없음'],...columns],config.splitBy);
 for(let i=0;i<4;i++)selectOptions($('#drillDimension'+i),[['','선택 안 함'],...columns],config.drillDimensions[i]||'');
 const multi=['bar','horizontal','line','area','table'].includes(state.type);
 $('#extraMeasures').disabled=$('#splitBy').disabled=!multi;
 $('#multiSeriesHelp').textContent=multi?'기본 지표 포함 최대 6개 · 범례 계열 최대 24개':'추가 지표·범례 분할은 막대·선·영역·표에서 사용합니다.';
}
function renderAnalysisStatus(){
 const host=$('#analysisStatus');if(!host)return;
 host.replaceChildren();
 const filters=analysisView.filters.map(f=>`${f.column}: ${f.value}`);
 const drills=[...analysisView.drills].map(([i,v])=>`${i+1}번 차트: ${v.filters.map(f=>f.value).join(' → ')} → ${v.dimension}`);
 host.append(el('span','', [...filters,...drills].join(' / ')||'차트 클릭 동작을 선택해 데이터를 탐색하세요.'));
 if(filters.length||drills.length){const reset=el('button','','탐색 초기화');reset.onclick=()=>{resetAnalysisView();renderAll()};host.append(reset)}
}
function renderTableCard(container,c){
 container.classList.add('analysis-table');
 try{
 const data=analysisTable(c),table=el('table'),head=el('thead'),tr=el('tr');
 data.columns.forEach(name=>tr.append(el('th','',name)));head.append(tr);const body=el('tbody');
 data.rows.forEach(row=>{const r=el('tr');row.forEach(value=>r.append(el('td','',typeof value==='number'?fmt(value):String(value??'—'))));body.append(r)});
 table.append(head,body);container.append(table,el('p','muted',`집계 결과 ${data.rows.length}개 그룹 · 최대 100개 표시`));
 }catch(e){container.append(el('p','muted',e.message))}
}
window.addEventListener('DOMContentLoaded',()=>{
 $('#dateGrain').onchange=e=>{state.dateGrain=e.target.value;renderChart()};
 $('#extraMeasures').onchange=e=>{const values=[...e.target.selectedOptions].map(o=>o.value);if(new Set([state.measure,...values]).size>6){notify('기본 지표 포함 최대 6개입니다.');refreshAnalysisControls();return}state.measures=values;renderChart()};
 $('#splitBy').onchange=e=>{state.splitBy=e.target.value;renderChart()};
 for(let i=0;i<4;i++)$('#drillDimension'+i).onchange=()=>{state.drillDimensions=[...new Set(Array.from({length:4},(_,j)=>$('#drillDimension'+j).value).filter(Boolean))];renderChart()};
 $('#interactionMode').onchange=e=>{analysisView.mode=e.target.value;renderAnalysisStatus()};
 refreshAnalysisControls();renderAnalysisStatus();
});
