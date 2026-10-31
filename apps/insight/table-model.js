'use strict';
// Shared validation and column identity preserve references across reordering/renaming.
const TableModel={
 validate(table){
 if(!table||!Array.isArray(table.columns)||!table.columns.length||table.columns.length>1000||!Array.isArray(table.rows)||table.rows.length>100000)throw Error('1~1,000개 열, 최대 100,000행을 지원합니다.');
 const names=table.columns.map(c=>typeof c==='string'?c.trim():'');
 if(names.some(n=>!n||n.length>200)||new Set(names).size!==names.length)throw Error('열 이름은 중복 없이 1~200자로 입력해 주세요.');
 if(table.rows.some(r=>!Array.isArray(r)||r.length!==names.length||r.some(v=>v!==null&&!['string','number','boolean'].includes(typeof v)||typeof v==='number'&&!Number.isFinite(v))))throw Error('표의 행과 열 구조가 올바르지 않습니다.');
 return {columns:names,rows:table.rows.map(r=>r.slice())};
 },
 move(table,from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=table.columns.length||to>=table.columns.length)return;for(const row of [table.columns,...table.rows])row.splice(to,0,row.splice(from,1)[0])},
 parseCSV(text){
 text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c;continue}
 if(c==='"'&&!field&&!closed){quoted=true;continue}if(c===','){row.push(field);field='';closed=false;continue}
 if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';closed=false;continue}
 if(closed)throw Error('CSV의 따옴표 뒤에는 구분자 또는 줄바꿈이 필요합니다.');field+=c;
 }
 if(quoted)throw Error('CSV에 닫히지 않은 따옴표가 있습니다.');if(field||row.length||closed){row.push(field);rows.push(row)}
 if(!rows.length)throw Error('CSV가 비어 있습니다.');const columns=rows.shift();const data=rows.filter(r=>r.some(v=>v!=='')).map(r=>{if(r.length>columns.length)throw Error('CSV에 헤더보다 많은 열이 있는 행이 있습니다.');return columns.map((_,i)=>r[i]??'')});return this.validate({columns,rows:data});
 },
 csv(table){const q=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';return '\uFEFF'+[table.columns,...table.rows].map(r=>r.map(q).join(',')).join('\r\n')}
};
