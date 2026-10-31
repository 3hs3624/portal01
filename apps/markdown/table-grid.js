'use strict';
function parseTSV(text){
 const rows=[[]];let cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!cell||quoted)quoted=!quoted;else cell+=c;}
 else if(!quoted&&(c==='\t'||c==='\n'||c==='\r')){rows.at(-1).push(cell);cell='';if(c!=='\t'){if(c==='\r'&&text[i+1]==='\n')i++;rows.push([]);}}
 else cell+=c;}
 rows.at(-1).push(cell);if(rows.length>1&&rows.at(-1).length===1&&rows.at(-1)[0]==='')rows.pop();
 const width=Math.max(...rows.map(r=>r.length));if(width*rows.length>5000)throw Error('한 번에 5,000셀까지 붙여넣을 수 있습니다.');
 return rows.map(row=>Array.from({length:width},(_,i)=>row[i]||''));
}
function gridTSV(rows){return rows.map(row=>row.map(c=>/[\t\n\r"]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c).join('\t')).join('\n');}
function engineTableContext(){
 if(!RICH.editor?.isActive('table'))return null;
 const selection=RICH.editor.state.selection,$pos=selection.$from;let tableDepth=0,cellDepth=0;
 for(let depth=$pos.depth;depth>0;depth--){const role=$pos.node(depth).type.spec.tableRole;if(role==='cell'||role==='header_cell')cellDepth=cellDepth||depth;if(role==='table'){tableDepth=depth;break;}}
 if(!tableDepth||!cellDepth)return null;
 const table=$pos.node(tableDepth),pos=$pos.before(tableDepth),map=BlockEngine.TableMap.get(table),cellPos=$pos.before(cellDepth)-pos-1,rect=map.findCell(cellPos);
 return {mode:'engine',node:table,pos,map,row:rect.top,column:rect.left,width:map.width,height:map.height};
}
function replaceEngineTable(context,table){
 historyBoundary();RICH.editor.view.dispatch(RICH.editor.state.tr.replaceWith(context.pos,context.pos+context.node.nodeSize,table));RICH.editor.commands.focus();historyBoundary();queueTableTools();
}
function editEngineTable(action){
 const context=engineTableContext();if(!context)return;
 const actions={rowAdd:'addRowAfter',columnAdd:'addColumnAfter',rowDelete:'deleteRow',columnDelete:'deleteColumn'};
 if((action==='rowDelete'&&context.height===1||action==='columnDelete'&&context.width===1)&&!confirm('마지막 행 또는 열을 삭제하면 표 전체가 삭제됩니다. 계속할까요?'))return;
 historyBoundary();const chain=RICH.editor.chain().focus()[actions[action]]();
 if(action==='rowDelete'&&context.row===0&&context.height>1)chain.toggleHeaderRow();
 chain.run();
 historyBoundary();
}
function tableSort(direction){
 const c=engineTableContext();if(!c)return;const rows=Array.from({length:c.node.childCount},(_,i)=>c.node.child(i)),header=rows.shift(),collator=new Intl.Collator('ko-KR',{numeric:true,sensitivity:'base'});
 const sorted=rows.map((node,index)=>({node,index})).sort((a,b)=>direction*collator.compare(a.node.child(c.column).textContent,b.node.child(c.column).textContent)||a.index-b.index).map(i=>i.node);
 replaceEngineTable(c,c.node.copy(BlockEngine.Fragment.fromArray([header,...sorted])));
}
function moveTableRow(delta){
 const c=engineTableContext();if(!c||c.row===0||c.row+delta<1||c.row+delta>=c.height)return;
 const rows=Array.from({length:c.node.childCount},(_,i)=>c.node.child(i));[rows[c.row],rows[c.row+delta]]=[rows[c.row+delta],rows[c.row]];replaceEngineTable(c,c.node.copy(BlockEngine.Fragment.fromArray(rows)));
}
function alignTableColumn(align){
 const c=engineTableContext();if(!c)return;let tr=RICH.editor.state.tr;
 for(let row=0;row<c.height;row++){const offset=c.map.map[row*c.width+c.column],node=c.node.nodeAt(offset);tr=tr.setNodeMarkup(c.pos+1+offset,undefined,{...node.attrs,align});}
 historyBoundary();RICH.editor.view.dispatch(tr);historyBoundary();
}
function handleGridPaste(event){
 const text=event.clipboardData?.getData('text/plain')||'',c=engineTableContext();if(!c||(!text.includes('\t')&&!event.clipboardData?.getData('text/html').includes('<table')))return false;
 try{
  const grid=parseTSV(text),height=Math.max(c.height,c.row+grid.length),width=Math.max(c.width,c.column+grid[0].length);if(height*width>5000)throw Error('표는 5,000셀까지 확장할 수 있습니다.');
  const schema=RICH.editor.schema,rows=[];
  for(let r=0;r<height;r++){const cells=[];for(let col=0;col<width;col++){
   let cell=r<c.height&&col<c.width?c.node.child(r).child(col):null;
   if(r>=c.row&&r<c.row+grid.length&&col>=c.column&&col<c.column+grid[0].length){
    const value=grid[r-c.row][col-c.column],content=[];value.split('\n').forEach((line,index)=>{if(index)content.push(schema.nodes.hardBreak.create());if(line)content.push(schema.text(line));});
    cell=(r===0?schema.nodes.tableHeader:schema.nodes.tableCell).create(cell?.attrs||{},schema.nodes.paragraph.create(null,content));
   }
   cells.push(cell||(r===0?schema.nodes.tableHeader:schema.nodes.tableCell).createAndFill());
  }rows.push(schema.nodes.tableRow.create(null,cells));}
  event.preventDefault();replaceEngineTable(c,c.node.copy(BlockEngine.Fragment.fromArray(rows)));return true;
 }catch(error){event.preventDefault();onError(error);return true;}
}
function handleGridCopy(event){
 const c=engineTableContext(),s=RICH.editor?.state.selection;if(!c||!(s instanceof BlockEngine.CellSelection))return false;
 const rect=c.map.rectBetween(s.$anchorCell.pos-c.pos-1,s.$headCell.pos-c.pos-1),rows=[];
 for(let r=rect.top;r<rect.bottom;r++){const row=[];for(let col=rect.left;col<rect.right;col++){const cell=c.node.nodeAt(c.map.map[r*c.width+col]);row.push(cell.textBetween(0,cell.content.size,'\n','\n'));}rows.push(row);}
 event.clipboardData.setData('text/plain',gridTSV(rows));event.preventDefault();return true;
}
const advanced=el('span','table-advanced');
for(const [action,label,fn]of [['sortAsc','A↑',()=>tableSort(1)],['sortDesc','Z↓',()=>tableSort(-1)],['rowUp','행 ↑',()=>moveTableRow(-1)],['rowDown','행 ↓',()=>moveTableRow(1)],['left','왼쪽',()=>alignTableColumn('left')],['center','가운데',()=>alignTableColumn('center')],['right','오른쪽',()=>alignTableColumn('right')]]){
 const b=el('button','',label);b.dataset.gridAction=action;b.title={sortAsc:'선택 열 오름차순 정렬',sortDesc:'선택 열 내림차순 정렬',rowUp:'행 위로 이동',rowDown:'행 아래로 이동',left:'열 왼쪽 정렬',center:'열 가운데 정렬',right:'열 오른쪽 정렬'}[action];b.onmousedown=e=>e.preventDefault();b.onclick=fn;advanced.append(b);
}$('.table-tools').append(advanced);
const baseUpdateTableTools=updateTableTools;updateTableTools=function(){baseUpdateTableTools();const c=currentTableContext();advanced.hidden=c?.mode!=='engine';};
