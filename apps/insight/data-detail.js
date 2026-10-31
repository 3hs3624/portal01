'use strict';
const $=s=>document.querySelector(s),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
let data=null,page=0,search='',column='',value='',editing=false,original=null,columnIds=[],revision=0,readOnly=true,dragColumn=-1,pendingSave='',saveTimer=0;
document.documentElement.dataset.theme=localStorage.getItem('insight-theme')||'light';
function options(node,items,selected){node.replaceChildren(...items.map(([key,label])=>{const o=el('option',label);o.value=key;return o}));node.value=selected}
function detailRows(){if(!data)return[];const i=data.columns.indexOf(column),q=search.toLocaleLowerCase();return data.rows.filter(r=>(!q||r.some(v=>String(v??'').toLocaleLowerCase().includes(q)))&&(i<0||value===''||String(r[i]??'')===value))}
function refreshValues(){const i=data.columns.indexOf(column),values=i<0?[]:[...new Set(data.rows.map(r=>String(r[i]??'')))].filter(Boolean).sort();options($('#filterValue'),[['','전체 값'],...values.map(v=>[v,v])],value)}
function refreshFilters(){if(!data.columns.includes(column)){column='';value=''}options($('#filterColumn'),[['','전체 열'],...data.columns.map(c=>[c,c])],column);refreshValues()}
function button(text,label,action){const b=el('button',text);b.type='button';b.setAttribute('aria-label',label);b.onclick=action;return b}
function tableDirty(){return editing&&JSON.stringify({columns:data.columns,rows:data.rows})!==JSON.stringify({columns:original.columns,rows:original.rows})}
function tableChanged(){refreshFilters();render();$('#detailError').textContent='저장하지 않은 데이터 변경이 있습니다.'}
function moveColumn(from,to){if(from<0||to<0||from>=data.columns.length||to>=data.columns.length)return;TableModel.move(data,from,to);columnIds.splice(to,0,columnIds.splice(from,1)[0]);tableChanged()}
function render(){
 if(!data)return;const rows=detailRows(),pages=Math.max(1,Math.ceil(rows.length/50));page=Math.max(0,Math.min(page,pages-1));
 $('#dataInfo').textContent=`전체 ${data.rows.length.toLocaleString()}행 중 ${rows.length.toLocaleString()}행 · 페이지당 50행`;
 $('#detailSheet').textContent=`시트: ${data.sheet} · ${data.rows.length.toLocaleString()}행 · ${data.columns.length}개 열`;
 const head=el('tr');if(editing)head.append(el('th','행 관리'));
 data.columns.forEach((c,i)=>{const cell=el('th');if(editing){
 const tools=el('div');tools.className='column-edit-tools';const handle=button('⠿',`${c} 열 드래그 이동`,()=>{});handle.draggable=true;handle.className='column-drag';
 handle.ondragstart=e=>{dragColumn=i;e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move'};handle.ondragend=()=>{dragColumn=-1};
 cell.ondragover=e=>{if(dragColumn>=0)e.preventDefault()};cell.ondrop=e=>{e.preventDefault();if(dragColumn>=0)moveColumn(dragColumn,i);dragColumn=-1};
 const input=el('input');input.value=c;input.setAttribute('aria-label',`${i+1}번 열 이름`);input.onchange=()=>{const name=input.value.trim();if(!name||name.length>200||data.columns.some((v,j)=>j!==i&&v===name)){$('#detailError').textContent='열 이름은 중복 없이 1~200자로 입력해 주세요.';input.value=c;return}data.columns[i]=name;if(column===c)column=name;tableChanged()};
 const left=button('←',`${c} 열 왼쪽 이동`,()=>moveColumn(i,i-1));left.disabled=i===0;const right=button('→',`${c} 열 오른쪽 이동`,()=>moveColumn(i,i+1));right.disabled=i===data.columns.length-1;
 const remove=button('×',`${c} 열 삭제`,()=>{if(data.columns.length===1)return void($('#detailError').textContent='최소 한 개의 열이 필요합니다.');if(!window.confirm(`‘${c}’ 열과 해당 열의 값을 삭제할까요? 연결된 차트에서 이 열을 사용하면 재설정이 필요합니다.`))return;data.columns.splice(i,1);columnIds.splice(i,1);data.rows.forEach(r=>r.splice(i,1));tableChanged()});tools.append(handle,left,right,remove);cell.append(tools,input);
 }else cell.textContent=c;head.append(cell)});$('#thead').replaceChildren(head);
 $('#tbody').replaceChildren(...rows.slice(page*50,(page+1)*50).map(r=>{const row=el('tr');if(editing){const actions=el('td');actions.append(button('삭제','이 행 삭제',()=>{data.rows.splice(data.rows.indexOf(r),1);tableChanged()}));row.append(actions)}data.columns.forEach((_,i)=>{const cell=el('td');if(editing){const input=el('input');input.value=r[i]??'';input.setAttribute('aria-label',`${data.columns[i]} 값`);input.onchange=()=>{r[i]=input.value;$('#detailError').textContent='저장하지 않은 데이터 변경이 있습니다.';refreshValues()};cell.append(input)}else cell.textContent=r[i]==null?'—':String(r[i]);cell.title=String(r[i]??'');row.append(cell)});return row}));
 $('#pageInfo').textContent=`${page+1} / ${pages}`;$('#prev').disabled=page===0;$('#next').disabled=page>=pages-1;
 let missing=0;for(const row of data.rows)for(let i=0;i<data.columns.length;i++)if(row[i]==null||row[i]==='')missing++;$('#quality').textContent=`데이터 품질 · 빈 셀 ${missing.toLocaleString()}개 · ${editing?'편집 중 · 저장하면 작업 데이터에 반영됩니다':'조회 모드'}`;
}
function syncEditing(){
 $('#editData').disabled=readOnly||!data||Boolean(pendingSave);$('#editData').textContent=editing?'편집 종료':'편집';$('#editData').setAttribute('aria-pressed',String(editing));
 $('#dataEditLock').textContent=editing?'🔓':'🔒';$('#dataEditLock').setAttribute('aria-label',editing?'편집 가능':'편집 잠금');$('#dataEditLock').title=readOnly?'조회 전용 데이터':editing?'편집 가능':'편집 잠금';
 for(const id of ['saveData','cancelData','uploadCsv','tableEditTools'])$('#'+id).hidden=!editing;
 for(const id of ['saveData','cancelData','uploadCsv','addRow','addColumn'])$('#'+id).disabled=Boolean(pendingSave);
 $('#detailTable').classList.toggle('table-saving',Boolean(pendingSave));render();
}
function receive(payload){
 if(editing||pendingSave)return;data=structuredClone(payload);page=0;search='';column='';value='';$('#search').value='';
 $('#detailName').textContent=data.name;document.title=`${data.name} · ${data.sheet} · 데이터 탐색`;
 $('#detailDashboards').replaceChildren(...(data.dashboards.length?data.dashboards:['연결된 대시보드 없음']).map(name=>{const n=el('span',name);n.className='pill';return n}));
 refreshFilters();$('#detailError').textContent='';$('#detailTable').hidden=false;syncEditing();
}
function request(){if(!window.opener||window.opener.closed){$('#detailError').textContent='원본 BI 창이 닫혀 있습니다. 메인 화면에서 상세를 다시 열어 주세요.';return}window.opener.postMessage({type:'bi-data-request'},location.origin)}
function cancelEditing(){if(pendingSave)return false;if(tableDirty()&&!window.confirm('데이터 변경을 저장하지 않고 편집 전 상태로 돌아갈까요?'))return false;if(original)data=original;original=null;editing=false;refreshFilters();syncEditing();$('#detailError').textContent='';return true}
function saveTable(){
 if(!editing||pendingSave)return;
 try{const table=TableModel.validate(data);if(!window.opener||window.opener.closed)throw Error('메인 BI 창이 닫혀 있어 저장할 수 없습니다. CSV로 내려받아 보관해 주세요.');
 const mapping=Object.fromEntries(original.columns.map((name,i)=>[name,columnIds.includes(i)?table.columns[columnIds.indexOf(i)]:null]));pendingSave=crypto.randomUUID();
 $('#detailError').textContent='저장 중… 연결된 저장소 응답을 기다립니다.';window.opener.postMessage({type:'bi-data-save',requestId:pendingSave,table,mapping,revision},location.origin);syncEditing();
 saveTimer=setTimeout(()=>{if(pendingSave){pendingSave='';$('#detailError').textContent='저장 응답을 확인하지 못했습니다. 창을 다시 열어 반영 상태를 확인하세요. CSV 다운로드로 편집 내용을 보관할 수 있습니다.';readOnly=true;syncEditing()}},180000);
 }catch(e){$('#detailError').textContent=e.message}
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==window.opener)return;
 const message=event.data;
 if(message?.type==='bi-data-response')receive(message.payload);
 if(message?.type==='bi-data-permissions'){readOnly=message.readOnly;revision=message.revision;syncEditing()}
 if(['bi-data-saved','bi-data-save-error'].includes(message?.type)&&message.requestId===pendingSave){clearTimeout(saveTimer);pendingSave='';
 if(message.type==='bi-data-saved'){data={...data,...message.table};revision=message.revision;editing=false;original=null;$('#detailError').textContent=message.warning||'저장했습니다. 연결된 저장소에 작업 데이터를 보관했습니다.'}else $('#detailError').textContent=message.error;refreshFilters();syncEditing();}
});
$('#editData').onclick=()=>{if(editing)return cancelEditing();if(readOnly||!data)return;original=structuredClone(data);columnIds=data.columns.map((_,i)=>i);editing=true;syncEditing()};
$('#saveData').onclick=saveTable;$('#cancelData').onclick=cancelEditing;
$('#addRow').onclick=()=>{if(data.rows.length>=100000)return void($('#detailError').textContent='최대 100,000행까지 지원합니다.');data.rows.push(data.columns.map(()=>''));search='';column='';value='';$('#search').value='';page=Math.floor((data.rows.length-1)/50);tableChanged()};
$('#addColumn').onclick=()=>{if(data.columns.length>=1000)return void($('#detailError').textContent='최대 1,000개 열까지 지원합니다.');let name='새 열',n=2;while(data.columns.includes(name))name='새 열 '+n++;data.columns.push(name);columnIds.push(null);data.rows.forEach(r=>r.push(''));tableChanged()};
$('#uploadCsv').onclick=()=>$('#csvFile').click();$('#csvFile').onchange=async e=>{const file=e.target.files[0];try{if(!file)return;if(file.size>30*1024*1024)throw Error('CSV 파일은 30MB까지 지원합니다.');const buffer=await file.arrayBuffer();let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer)}catch{text=new TextDecoder('euc-kr',{fatal:true}).decode(buffer)}const table=TableModel.parseCSV(text);if(!window.confirm('업로드한 CSV로 현재 표 전체를 교체할까요? 저장 전까지 취소할 수 있습니다.'))return;data={...data,...table};columnIds=table.columns.map(c=>{const i=original.columns.indexOf(c);return i<0?null:i});page=0;search='';column='';value='';$('#search').value='';tableChanged()}catch(error){$('#detailError').textContent=error.message}finally{e.target.value=''}};
$('#closeDetail').onclick=()=>{if(pendingSave)return;if(!editing||cancelEditing())window.close()};
$('#search').oninput=e=>{search=e.target.value;page=0;render()};$('#filterColumn').onchange=e=>{column=e.target.value;value='';page=0;refreshValues();render()};$('#filterValue').onchange=e=>{value=e.target.value;page=0;render()};$('#clear').onclick=()=>{search='';column='';value='';page=0;$('#search').value='';refreshFilters();render()};$('#prev').onclick=()=>{page--;render()};$('#next').onclick=()=>{page++;render()};
function downloadTableCSV(all=false){if(!data)return;const blob=new Blob([TableModel.csv({columns:data.columns,rows:all?data.rows:detailRows()})],{type:'text/csv;charset=utf-8'}),a=el('a');a.href=URL.createObjectURL(blob);a.download=all?'data-all.csv':'data-explorer.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('#csv').onclick=()=>downloadTableCSV(false);$('#csvAll').onclick=()=>downloadTableCSV(true);
window.addEventListener('beforeunload',e=>{if(tableDirty()||pendingSave){e.preventDefault();e.returnValue=''}});
request();
