'use strict';
function cardFilterRules(scope){return scope==='chart'?safeCardFilters(state.cardFilters):safeCardFilters(kpiCardFilters)}
function setCardFilterRules(scope,rules){if(scope==='chart')state.cardFilters=safeCardFilters(rules);else kpiCardFilters=safeCardFilters(rules)}
function previewCardFilters(scope){
 const node=$('#'+scope+'FilterStatus');if(!node)return;
 try{const config=scope==='chart'?currentConfig():kpiEditDraft(),rows=cardFiltered(config);node.textContent=`대시보드 조건 적용 ${fmt(filtered().length)}행 중 ${fmt(rows.length)}행 · 이 ${scope==='chart'?'차트':'카드'}에만 적용`;node.classList.remove('filter-error')}
 catch(e){node.textContent=e.message;node.classList.add('filter-error')}
 if(scope==='chart')renderChart();else renderKpiEditPreview();
}
function renderCardFilterEditor(scope){
 const root=$('#'+scope+'CardFilters');if(!root)return;const rules=cardFilterRules(scope),heading=el('div','card-filter-heading'),title=el('b','','이 '+(scope==='chart'?'차트':'카드')+'의 필터'),add=el('button','','＋ 조건 추가');add.type='button';add.disabled=rules.length>=20;
 add.onclick=()=>{const column=dataset().columns[0];if(!column)return;const first=dataset().rows.find(r=>r[0]!=null)?.[0]??'';setCardFilterRules(scope,[...cardFilterRules(scope),{column,op:'eq',value:String(first),value2:''}]);renderCardFilterEditor(scope);previewCardFilters(scope)};heading.append(title,add);root.replaceChildren(heading,el('p','muted','여러 조건은 모두 만족해야 합니다. 적용 버튼을 눌러 선택한 항목에 반영하세요.'));
 rules.forEach((rule,index)=>{
 const row=el('div','card-filter-row'),column=el('select'),op=el('select'),value=el('input'),value2=el('input'),remove=el('button','','×');remove.type='button';
 column.setAttribute('aria-label',`${index+1}번 필터 열`);selectOptions(column,dataset().columns.includes(rule.column)?dataset().columns:[rule.column,...dataset().columns],rule.column);op.setAttribute('aria-label',`${index+1}번 필터 조건`);selectOptions(op,Object.entries(CARD_FILTER_OPERATORS),rule.op);
 const list=el('datalist');list.id=scope+'-filter-values-'+index;const i=dataset().columns.indexOf(rule.column),seen=new Set();for(const r of dataset().rows){const text=String(r[i]??'');if(seen.has(text))continue;seen.add(text);if(seen.size>300)break;const option=el('option');option.value=text;list.append(option)}
 value.value=rule.value;value.setAttribute('aria-label',`${index+1}번 필터 값`);value.setAttribute('list',list.id);value.placeholder=rule.op==='between'?'시작 값':'값 또는 숫자·날짜';value.hidden=['empty','notEmpty'].includes(rule.op);value2.value=rule.value2;value2.setAttribute('aria-label',`${index+1}번 필터 끝 값`);value2.placeholder='끝 값';value2.hidden=rule.op!=='between';
 const update=(key,newValue,rerender=false)=>{const next=cardFilterRules(scope);next[index]={...next[index],[key]:newValue};setCardFilterRules(scope,next);if(rerender)renderCardFilterEditor(scope);previewCardFilters(scope)};
 column.onchange=()=>update('column',column.value,true);op.onchange=()=>update('op',op.value,true);value.oninput=()=>update('value',value.value);value2.oninput=()=>update('value2',value2.value);
 remove.setAttribute('aria-label',`${index+1}번 필터 삭제`);remove.onclick=()=>{const next=cardFilterRules(scope);next.splice(index,1);setCardFilterRules(scope,next);renderCardFilterEditor(scope);previewCardFilters(scope)};
 row.append(column,op,value,value2,remove,list);root.append(row);
 });
 if(!rules.length)root.append(el('p','muted','조건이 없습니다. 대시보드에 표시되는 전체 데이터를 사용합니다.'));
 const status=el('p','muted');status.id=scope+'FilterStatus';root.append(status);try{status.textContent=`대시보드 조건 적용 ${fmt(filtered().length)}행 중 ${fmt(cardFiltered({cardFilters:rules}).length)}행`}catch(e){status.textContent=e.message;status.classList.add('filter-error')}
}
const slicerSearches=new Map();
function renderDashboardSlicers(){
 const root=$('#slicersPanel');if(!root)return;const slicers=safeSlicers(state.slicers);root.hidden=!dashboardState.editing&&!slicers.length;
 const selector=$('#slicerColumn'),used=new Set(slicers.map(s=>s.column));selectOptions(selector,dataset().columns.filter(c=>!used.has(c)),selector.value);$('#addSlicer').disabled=!selector.options.length||slicers.length>=8;
 const list=$('#slicerItems');list.replaceChildren();
 for(const slicer of slicers){
 const section=el('section','slicer'),header=el('div','slicer-title'),title=el('b','',slicer.column),reset=el('button','','전체'),remove=el('button','editor-only','×');reset.type=remove.type='button';reset.setAttribute('aria-label',slicer.column+' 슬라이서 선택 초기화');reset.onclick=()=>changeSlicer(slicer.id,[]);remove.setAttribute('aria-label',slicer.column+' 슬라이서 삭제');remove.onclick=()=>{if(!dashboardState.editing)return;state.slicers=safeSlicers(state.slicers).filter(s=>s.id!==slicer.id);slicerSearches.delete(slicer.id);renderAll()};header.append(title,reset,remove);
 const search=el('input');search.type='search';search.placeholder='값 검색';search.value=slicerSearches.get(slicer.id)||'';search.setAttribute('aria-label',slicer.column+' 슬라이서 값 검색');const choices=el('div','slicer-values'),note=el('p','muted');
 const paint=()=>{
 const i=dataset().columns.indexOf(slicer.column);if(i<0){choices.textContent='열이 삭제되었습니다. 편집 모드에서 슬라이서를 삭제하고 다시 추가하세요.';return}
 const values=new Set(dataset().rows.map(r=>String(r[i]??'')));slicer.values.forEach(v=>values.add(v));const counts=new Map();for(const row of applySlicerRows(dataset().rows,slicers.filter(s=>s.id!==slicer.id))){const value=String(row[i]??'');counts.set(value,(counts.get(value)||0)+1)}
 const matching=[...values].filter(v=>v.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())).sort((a,b)=>a.localeCompare(b,'ko',{numeric:true}));choices.replaceChildren(...matching.slice(0,200).map(v=>{const selected=slicer.values.includes(v),b=el('button','slicer-value',(v||'(빈 값)')+' · '+fmt(counts.get(v)||0));b.type='button';b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',slicer.column+' '+(v||'빈 값'));b.classList.toggle('no-data',!counts.get(v));b.onclick=()=>{const current=safeSlicers(state.slicers).find(s=>s.id===slicer.id);if(!current)return;changeSlicer(slicer.id,current.values.includes(v)?current.values.filter(x=>x!==v):[...current.values,v])};return b}));
 note.textContent=(slicer.values.length?slicer.values.length+'개 값 선택':'전체 값')+' · 여러 값 선택 가능'+(matching.length>200?' · 앞 200개 표시, 검색으로 범위를 줄이세요.':'');
 };
 search.oninput=()=>{slicerSearches.set(slicer.id,search.value);paint()};section.append(header,search,choices,note);list.append(section);paint();
 }
 if(!slicers.length)list.append(el('p','muted','열을 선택해 슬라이서를 추가하면 모든 카드와 차트에 함께 적용됩니다.'));
 $('#slicerCount').textContent=`${fmt(filtered().length)} / ${fmt(dataset().rows.length)}행`;
}
function changeSlicer(id,values){if(values.length>1000)return notify('슬라이서 선택값은 최대 1,000개입니다.');state.slicers=safeSlicers(state.slicers).map(s=>s.id===id?{...s,values}:s);renderAll()}
function initCardAndSlicerFilters(){
 $('#addSlicer').onclick=()=>{if(!dashboardState.editing)return;const column=$('#slicerColumn').value;if(!column||safeSlicers(state.slicers).length>=8)return;state.slicers=[...safeSlicers(state.slicers),{id:crypto.randomUUID(),column,values:[]}];renderAll()};
 $('#clearSlicers').onclick=()=>{state.slicers=safeSlicers(state.slicers).map(s=>({...s,values:[]}));renderAll()};
 renderCardFilterEditor('chart');renderCardFilterEditor('kpi');renderDashboardSlicers();
}
window.addEventListener('DOMContentLoaded',initCardAndSlicerFilters);
