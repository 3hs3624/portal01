/* Notion-style table axis menus. All mutations use the editor's document/history. */
'use strict';
(() => {
 const root=$('#preview'),state={hover:null,menu:null,hide:0,frame:0,drag:null,suppressClick:null,visible:false,observed:null};
 const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node};
 const menu=make('div','studio-table-menu');menu.id='studioTableMenu';menu.hidden=true;menu.setAttribute('role','dialog');
 const palette=make('div','studio-table-menu studio-table-palette');palette.id='studioTablePalette';palette.hidden=true;palette.setAttribute('role','dialog');palette.setAttribute('aria-label','표 색상');
 const handles={};
 for(const [axis,label]of [['row','행 작업 메뉴'],['column','열 작업 메뉴']]){
  const handle=make('button','studio-table-handle studio-table-'+axis);handle.id='studioTable'+(axis==='row'?'Row':'Column')+'Handle';handle.type='button';handle.hidden=true;handle.title=label;handle.setAttribute('aria-label',label);handle.setAttribute('aria-haspopup','dialog');handle.setAttribute('aria-expanded','false');
  for(let i=0;i<6;i++)handle.append(make('i'));
  handle.onmousedown=event=>event.preventDefault();handle.onmouseenter=()=>clearTimeout(state.hide);handle.onclick=()=>{if(handle.dataset.moved){delete handle.dataset.moved;return;}open(axis);};document.body.append(handle);handles[axis]=handle;
 }
 function headerFlags(node){const row=Array.from({length:node.childCount},(_,i)=>node.child(i));return {row:node.attrs.studioHeaderRow??row[0].content.content.every(c=>c.type.spec.tableRole==='header_cell'),column:node.attrs.studioHeaderColumn??(row.length>1&&row.every(r=>r.firstChild.type.spec.tableRole==='header_cell'))};}
 for(const axis of ['row','column']){const handle=handles[axis];handle.title=(axis==='row'?'행':'열')+' 핸들 · 드래그하여 순서 변경 · 클릭하여 메뉴 열기';STUDIO_AXIS_DRAG.bind(handle,()=>{const c=context(state.hover?.cell);if(!c)return null;const flags=headerFlags(c.node),table=state.hover.cell.closest('table'),merged=c.node.content.content.some(r=>r.content.content.some(cell=>cell.attrs.colspan!==1||cell.attrs.rowspan!==1));return {axis,table,index:axis==='row'?c.row:c.column,count:c.width,locked:i=>i===0&&flags[axis],valid:()=>!merged&&editable()&&APP.activeId===c.document&&table.isConnected&&c.editor.state.doc.nodeAt(c.pos)===c.node,commit:(from,to)=>{close();const rows=Array.from({length:c.height},(_,i)=>c.node.child(i));if(axis==='row')rows.splice(to,0,rows.splice(from,1)[0]);else for(let i=0;i<rows.length;i++){const cells=rows[i].content.content.slice();cells.splice(to,0,cells.splice(from,1)[0]);rows[i]=rows[i].copy(BlockEngine.Fragment.fromArray(cells));}commit(c,c.node.type.create({...c.node.attrs,studioEdited:new Date().toISOString()},rows,c.node.marks),axis==='row'?to:c.row,axis==='column'?to:c.column);}};});}
 function toggleHeader(axis){const c=valid();if(!c)return;const flags=headerFlags(c.node);flags[axis]=!flags[axis];const rows=[];c.node.forEach((row,_,r)=>{const cells=[];row.forEach((cell,__,col)=>{const type=(flags.row&&r===0||flags.column&&col===0)?c.editor.schema.nodes.tableHeader:c.editor.schema.nodes.tableCell;cells.push(type.create(cell.attrs,cell.content,cell.marks));});rows.push(row.copy(BlockEngine.Fragment.fromArray(cells)));});commit(c,c.node.type.create({...c.node.attrs,studioHeaderRow:flags.row,studioHeaderColumn:flags.column,studioEdited:new Date().toISOString()},rows,c.node.marks));}
 document.addEventListener('studio:table-column-width',e=>{const c=context(e.detail.cell);if(!c||c.node.content.content.some(row=>row.content.content.some(cell=>cell.attrs.colspan!==1||cell.attrs.rowspan!==1)))return;const rows=[];c.node.forEach(row=>{const cells=[];row.forEach((cell,_,i)=>cells.push(cell.type.create({...cell.attrs,colwidth:[e.detail.widths[i]]},cell.content,cell.marks)));rows.push(row.copy(BlockEngine.Fragment.fromArray(cells)));});commit(c,c.node.type.create({...c.node.attrs,studioEdited:new Date().toISOString()},rows,c.node.marks));});
 const addRow=make('button','studio-table-add-row','＋');addRow.id='studioTableAddRow';addRow.type='button';addRow.hidden=true;addRow.title='표 아래에 행 추가';addRow.setAttribute('aria-label','표 아래에 행 추가');addRow.onmousedown=event=>event.preventDefault();addRow.onmouseenter=()=>clearTimeout(state.hide);
 addRow.onclick=()=>{if(state.suppressClick==='row'){state.suppressClick=null;return;}const c=context(state.hover?.cell);if(!c)return;close();state.menu={...c,axis:'row',index:c.height-1};mutate('after');requestAnimationFrame(()=>{const dom=c.editor.view.nodeDOM(c.pos),rows=dom?.querySelectorAll('tr');if(rows?.length)show(rows[rows.length-1].querySelector('td,th'));});};
 const addColumn=make('button','studio-table-add-column','＋');addColumn.id='studioTableAddColumn';addColumn.type='button';addColumn.hidden=true;addColumn.setAttribute('aria-label','표 오른쪽에 열 추가');addColumn.title='클릭하여 열 추가 · 가로로 드래그하여 열 개수 조절';addColumn.onmousedown=event=>event.preventDefault();addColumn.onmouseenter=()=>clearTimeout(state.hide);
 addColumn.onclick=()=>{if(state.suppressClick==='column'){state.suppressClick=null;return;}const c=context(state.hover?.cell);if(!c)return;close();state.menu={...c,axis:'column',index:c.width-1};mutate('after');refresh(c);};
 const resizeHint=make('div','studio-table-resize-hint');resizeHint.hidden=true;resizeHint.setAttribute('role','status');
 document.body.append(menu,palette,addRow,addColumn,resizeHint);
 addRow.title='클릭하여 행 추가 · 세로로 드래그하여 행 개수 조절';
 function refresh(c){requestAnimationFrame(()=>{const dom=c.editor.view.nodeDOM(c.pos),rows=dom?.querySelectorAll('tr');if(rows?.length)show(rows[rows.length-1].querySelector('td,th'));});}
 function stopDrag(){const d=state.drag;if(d?.button.hasPointerCapture(d.pointerId))d.button.releasePointerCapture(d.pointerId);state.drag=null;resizeHint.hidden=true;}
 for(const [axis,button]of [['row',addRow],['column',addColumn]]){
  button.onpointerdown=event=>{if(event.button!==0)return;state.suppressClick=null;const c=context(state.hover?.cell);if(!c)return;close();state.drag={axis,button,pointerId:event.pointerId,c,x:event.clientX,y:event.clientY,delta:0,moved:false};button.setPointerCapture(event.pointerId);};
  button.onpointermove=event=>{const d=state.drag;if(!d||d.axis!==axis)return;const distance=axis==='row'?event.clientY-d.y:event.clientX-d.x;d.moved=d.moved||Math.abs(distance)>5;const current=axis==='row'?d.c.height:d.c.width,other=axis==='row'?d.c.width:d.c.height;d.delta=Math.max(1-current,Math.min(100,Math.floor(5000/other)-current,Math.trunc(distance/40)));if(!d.moved)return;resizeHint.textContent=(axis==='row'?'행 ':'열 ')+(current+d.delta)+'개'+(d.delta<0?' · 줄어드는 영역의 내용이 삭제됩니다.':'');resizeHint.hidden=false;resizeHint.style.left=Math.max(8,Math.min(event.clientX+12,innerWidth-resizeHint.offsetWidth-8))+'px';resizeHint.style.top=Math.max(8,Math.min(event.clientY+12,innerHeight-resizeHint.offsetHeight-8))+'px';};
  button.onpointerup=event=>{const d=state.drag;if(!d||d.axis!==axis)return;stopDrag();if(!d.moved)return;state.suppressClick=axis;setTimeout(()=>{if(state.suppressClick===axis)state.suppressClick=null;},0);resizeAxis(d.c,axis,d.delta);};
  button.onpointercancel=()=>{state.suppressClick=axis;stopDrag();};
 }
 function resizeAxis(c,axis,delta){
  state.menu={...c,axis,index:axis==='row'?c.height-1:c.width-1};if(!valid()||!delta){close();return;}
  const merged=c.map.map.some(offset=>{const a=c.node.nodeAt(offset).attrs;return a.colspan!==1||a.rowspan!==1;});
  if(delta<0&&merged){close();return toast('병합된 표의 행·열 삭제는 상단 표 도구를 사용하세요.',true);}
  if(delta<0&&!confirm('마지막 '+Math.abs(delta)+(axis==='row'?'개 행':'개 열')+'과 포함된 내용을 삭제할까요? 되돌리기로 복구할 수 있습니다.')){close();return;}
  const schema=c.editor.schema,rows=[];c.node.forEach(row=>rows.push(row));const header=Array.from({length:c.node.firstChild.childCount},(_,i)=>c.node.firstChild.child(i)).every(n=>n.type.spec.tableRole==='header_cell');
  if(axis==='row'){if(delta<0)rows.splice(rows.length+delta);else for(let i=0;i<delta;i++)rows.push(schema.nodes.tableRow.create(null,Array.from({length:c.width},()=>schema.nodes.tableCell.createAndFill())));}
  else for(let r=0;r<rows.length;r++){const cells=Array.from({length:rows[r].childCount},(_,i)=>rows[r].child(i));if(delta<0)cells.splice(cells.length+delta);else for(let i=0;i<delta;i++)cells.push((header&&r===0?schema.nodes.tableHeader:schema.nodes.tableCell).createAndFill());rows[r]=rows[r].copy(BlockEngine.Fragment.fromArray(cells));}
  commit(c,c.node.type.create({...c.node.attrs,studioEdited:new Date().toISOString()},rows,c.node.marks),axis==='row'?rows.length-1:c.row,axis==='column'?c.width+delta-1:c.column);refresh(c);
 }
 const editable=()=>RICH.editor?.isEditable&&RICH.enabled&&!APP.loading&&!RICH.loading&&APP.view!=='edit'&&RICH.markdown===currentDoc()?.content;
 function hideHandles(){state.visible=false;handles.row.hidden=handles.column.hidden=addRow.hidden=addColumn.hidden=true;}
 function close(focus=false){state.menu=null;menu.hidden=palette.hidden=true;handles.row.setAttribute('aria-expanded','false');handles.column.setAttribute('aria-expanded','false');if(focus&&editable())RICH.editor.view.focus();}
 function context(cell){
  if(!editable()||!cell||!root.contains(cell))return null;
  const editor=RICH.editor;let resolved;
  try{resolved=editor.state.doc.resolve(editor.view.posAtDOM(cell,0));}catch{return null;}
  let tableDepth=0,cellDepth=0;
  for(let d=resolved.depth;d>0;d--){const role=resolved.node(d).type.spec.tableRole;if(role==='cell'||role==='header_cell')cellDepth=cellDepth||d;if(role==='table'){tableDepth=d;break;}}
  if(!tableDepth||!cellDepth)return null;
  const node=resolved.node(tableDepth),pos=resolved.before(tableDepth),map=BlockEngine.TableMap.get(node),rect=map.findCell(resolved.before(cellDepth)-pos-1);
  return {node,pos,map,row:rect.top,column:rect.left,width:map.width,height:map.height,document:APP.activeId,editor};
 }
 const resizeObserver=new ResizeObserver(()=>{if(state.visible&&!state.drag)requestAnimationFrame(()=>show(state.hover?.cell));});
 function gridBounds(element){
  const first=element.rows[0]?.getBoundingClientRect(),last=element.rows[element.rows.length-1]?.getBoundingClientRect();
  if(!first||!last)return element.getBoundingClientRect();
  const left=Math.min(first.left,last.left),right=Math.max(first.right,last.right);return {left,right,top:first.top,bottom:last.bottom,width:right-left,height:last.bottom-first.top};
 }
 function show(cell){
  const c=context(cell);if(!c){hideHandles();return;}state.hover={cell,context:c};const flags=headerFlags(c.node);handles.row.classList.toggle('studio-axis-fixed',flags.row&&c.row===0);handles.column.classList.toggle('studio-axis-fixed',flags.column&&c.column===0);handles.row.title=flags.row&&c.row===0?'고정된 머리글 행 · 클릭하여 설정':'행 핸들 · 드래그하여 순서 변경';handles.column.title=flags.column&&c.column===0?'고정된 머리글 열 · 클릭하여 설정':'열 핸들 · 드래그하여 순서 변경';clearTimeout(state.hide);
  if(state.menu)return;
  state.visible=true;
  const element=cell.closest('table');
  if(state.observed!==element){resizeObserver.disconnect();resizeObserver.observe(element);if(element.tBodies[0])resizeObserver.observe(element.tBodies[0]);if(element.closest('.tableWrapper'))resizeObserver.observe(element.closest('.tableWrapper'));state.observed=element;}
  const r=cell.getBoundingClientRect(),table=gridBounds(element),bounds=root.getBoundingClientRect();
  const top=Math.max(bounds.top,0),bottom=Math.min(bounds.bottom,innerHeight),left=Math.max(bounds.left,0),right=Math.min(bounds.right,innerWidth);
  handles.row.hidden=r.bottom<=top||r.top>=bottom||table.left<left+16||table.left>right;
  handles.column.hidden=r.right<=left||r.left>=right||table.top<top+16||table.top>bottom;
  addRow.hidden=table.bottom<top||table.bottom+28>bottom||table.right<=left||table.left>=right;addRow.style.left=table.left+'px';addRow.style.top=(table.bottom+3)+'px';addRow.style.width=table.width+'px';addRow.style.clipPath=`inset(0 ${Math.max(0,table.right-right)}px 0 ${Math.max(0,left-table.left)}px)`;
  addColumn.hidden=table.right<left||table.right+28>right||table.bottom<=top||table.top>=bottom;addColumn.style.left=(table.right+3)+'px';addColumn.style.top=table.top+'px';addColumn.style.height=table.height+'px';addColumn.style.clipPath=`inset(${Math.max(0,top-table.top)}px 0 ${Math.max(0,table.bottom-bottom)}px 0)`;
  handles.row.style.left=Math.max(4,table.left-20)+'px';handles.row.style.top=Math.max(top,Math.min(r.top+(r.height-26)/2,bottom-26))+'px';
  handles.column.style.left=Math.max(left,Math.min(r.left+(r.width-26)/2,right-26))+'px';handles.column.style.top=Math.max(top,table.top-20)+'px';
 }
 function valid(){const c=state.menu;if(!c||!editable()||c.document!==APP.activeId||c.editor!==RICH.editor||!c.editor.state.doc.nodeAt(c.pos)?.eq(c.node)){close();hideHandles();return null;}return c;}
 function offsets(c){return [...new Set(c.axis==='row'?Array.from({length:c.width},(_,i)=>c.map.map[c.index*c.width+i]):Array.from({length:c.height},(_,i)=>c.map.map[i*c.width+c.index]))];}
 function place(panel,x,y){panel.style.left=Math.max(8,Math.min(x,innerWidth-panel.offsetWidth-8))+'px';panel.style.top=Math.max(8,Math.min(y,innerHeight-panel.offsetHeight-8))+'px';panel.style.maxHeight=Math.max(100,innerHeight-16)+'px';}
 function select(c){
  const first=c.map.map[c.axis==='row'?c.index*c.width:c.index],last=c.map.map[c.axis==='row'?c.index*c.width+c.width-1:(c.height-1)*c.width+c.index];
  const doc=c.editor.state.doc;c.editor.view.dispatch(c.editor.state.tr.setSelection(new BlockEngine.CellSelection(doc.resolve(c.pos+1+first),doc.resolve(c.pos+1+last))));TABLE_UI.mode='preview';
 }
 function open(axis){
  const c=context(state.hover?.cell);if(!c)return;closeBlockMenus();close();
  state.menu={...c,axis,index:axis==='row'?c.row:c.column};select(state.menu);menu.setAttribute('aria-label',axis==='row'?'표 행 작업':'표 열 작업');menu.hidden=false;render('');
  const r=handles[axis].getBoundingClientRect();place(menu,axis==='row'?r.right+5:r.left,r.bottom+4);handles[axis].setAttribute('aria-expanded','true');menu.querySelector('input').focus();
 }
 const labels={default:'기본',gray:'회색',brown:'갈색',orange:'주황색',yellow:'노란색',green:'초록색',blue:'파란색',purple:'보라색',pink:'분홍색',red:'빨간색'};
 function item(label,action,icon,hint){const button=menuButton(label,action,icon,hint);button.classList.add('studio-table-menu-item');return button;}
 function render(query){
  const c=valid();if(!c)return;palette.hidden=true;const input=menu.querySelector('input');
  if(!input){const search=make('input','studio-menu-search');search.placeholder='작업을 검색하세요';search.setAttribute('aria-label','표 작업 검색');search.oninput=()=>render(search.value);menu.replaceChildren(search);}else menu.querySelectorAll(':scope > :not(input)').forEach(n=>n.remove());
  const merged=c.map.map.some(offset=>{const a=c.node.nodeAt(offset).attrs;return a.colspan!==1||a.rowspan!==1;});
  const actions=[['color','색',()=>openPalette(),'◉','›'],['before',c.axis==='row'?'위에 삽입':'왼쪽에 삽입',()=>mutate('before'),c.axis==='row'?'↑':'←'],['after',c.axis==='row'?'아래에 삽입':'오른쪽에 삽입',()=>mutate('after'),c.axis==='row'?'↓':'→'],['duplicate','복제',()=>mutate('duplicate'),'▣','Ctrl+D'],['clear','콘텐츠 삭제',()=>mutate('clear'),'⊗'],['delete','삭제',()=>mutate('delete'),'♲']];
  const headers=headerFlags(c.node);actions.push(['headerRow',headers.row?'첫 행 머리글 고정 해제':'첫 행 머리글 고정',()=>toggleHeader('row'),'▤'],['headerColumn',headers.column?'첫 열 머리글 고정 해제':'첫 열 머리글 고정',()=>toggleHeader('column'),'▥']);
  let count=0;
  for(const [key,label,fn,icon,hint]of actions){if(query&&!label.includes(query.trim()))continue;const button=item(label,fn,icon,hint);button.dataset.tableMenuAction=key;if(merged&&['before','after','duplicate','delete'].includes(key)){button.disabled=true;button.title='병합된 셀의 구조 변경은 상단 표 도구를 사용하세요.';}if(key==='color'){button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.onmouseenter=()=>openPalette();}if(key==='delete')button.classList.add('studio-table-danger');menu.append(button);count++;}
  if(!count)menu.append(make('p','studio-table-empty','일치하는 작업이 없습니다.'));
  if(merged)menu.append(make('p','studio-table-empty','병합된 셀의 색상·내용을 편집할 수 있습니다. 구조 변경은 상단 표 도구를 사용하세요.'));
  const foot=make('div','studio-table-meta');foot.append(make('span','','최종 편집 일시'),make('span','',new Date(c.node.attrs.studioEdited||currentDoc().updatedAt).toLocaleString('ko-KR')));menu.append(foot);
 }
 function openPalette(){
  const c=valid();if(!c)return;palette.replaceChildren();
  const back=item('작업 메뉴로 돌아가기',()=>{palette.hidden=true;menu.querySelector('[data-table-menu-action=color]')?.focus();},'←');palette.append(back);
  for(const [attr,title,suffix]of [['studioColor','텍스트 색상','텍스트'],['studioBackground','배경 색상','배경']]){
   palette.append(make('div','studio-table-color-heading',title));
   for(const color of STUDIO_COLORS){const button=item(labels[color]+' '+suffix,()=>mutate('color',{attr,color}),'');button.dataset.tableCellColor=attr+':'+color;const swatch=button.querySelector('.studio-menu-icon');swatch.classList.add('studio-table-swatch');if(attr==='studioColor'){swatch.textContent='A';if(color!=='default')swatch.dataset.studioColor=color;}else if(color!=='default')swatch.dataset.studioBackground=color;palette.append(button);}
  }
  palette.hidden=false;const r=menu.getBoundingClientRect();place(palette,r.right+palette.offsetWidth+6<=innerWidth?r.right+6:r.left-palette.offsetWidth-6,r.top);menu.querySelector('[data-table-menu-action=color]')?.setAttribute('aria-expanded','true');
 }
 function cloneCell(cell){const json=cell.toJSON();const ids=node=>{if(node.attrs?.blockId)node.attrs.blockId=crypto.randomUUID();node.content?.forEach(ids);};ids(json);return RICH.editor.schema.nodeFromJSON(json);}
 function commit(c,table,row=c.row,column=c.column){
  const map=BlockEngine.TableMap.get(table),offset=map.map[Math.max(0,Math.min(row,map.height-1))*map.width+Math.max(0,Math.min(column,map.width-1))];
  historyBoundary();const tr=c.editor.state.tr.replaceWith(c.pos,c.pos+c.node.nodeSize,table);tr.setSelection(BlockEngine.TextSelection.near(tr.doc.resolve(c.pos+2+offset)));c.editor.view.dispatch(tr);historyBoundary();close();hideHandles();c.editor.commands.focus();queueTableTools();
 }
 function mutate(action,value){
  const c=valid();if(!c)return;const schema=c.editor.schema,selected=new Set(offsets(c)),rows=[];let chosenRow=c.row,chosenColumn=c.column;
  c.node.forEach((row,rowOffset)=>{const cells=[];row.forEach((cell,cellOffset)=>{
   const offset=rowOffset+1+cellOffset;
   if(selected.has(offset)&&action==='color')cells.push(cell.type.create({...cell.attrs,[value.attr]:value.color==='default'?null:value.color},cell.content,cell.marks));
   else if(selected.has(offset)&&action==='clear')cells.push(cell.type.create(cell.attrs,schema.nodes.paragraph.create(),cell.marks));else cells.push(cell);
  });rows.push(row.type.create(row.attrs,cells,row.marks));});
  const header=Array.from({length:c.node.firstChild.childCount},(_,i)=>c.node.firstChild.child(i)).every(n=>n.type.spec.tableRole==='header_cell');
  const coerce=(row,type)=>row.copy(BlockEngine.Fragment.fromArray(Array.from({length:row.childCount},(_,i)=>type.create(row.child(i).attrs,row.child(i).content,row.child(i).marks))));
  if(['before','after','duplicate'].includes(action)){
   if((c.height+(c.axis==='row'?1:0))*(c.width+(c.axis==='column'?1:0))>5000)return toast('표는 5,000셀까지 확장할 수 있습니다.',true);
   const index=c.index+(action==='before'?0:1);
   if(c.axis==='row'){
    const cells=Array.from({length:c.width},(_,i)=>action==='duplicate'?cloneCell(c.node.child(c.index).child(i)):schema.nodes.tableCell.createAndFill());let fresh=schema.nodes.tableRow.create(null,cells);
    if(header&&index===0){fresh=coerce(fresh,schema.nodes.tableHeader);rows[0]=coerce(rows[0],schema.nodes.tableCell);}else if(header&&action==='duplicate'&&c.index===0)fresh=coerce(fresh,schema.nodes.tableCell);
    rows.splice(index,0,fresh);chosenRow=index;
   }else{for(let r=0;r<rows.length;r++){const cells=Array.from({length:rows[r].childCount},(_,i)=>rows[r].child(i));cells.splice(index,0,action==='duplicate'?cloneCell(cells[c.index]):(header&&r===0?schema.nodes.tableHeader:schema.nodes.tableCell).createAndFill());rows[r]=rows[r].copy(BlockEngine.Fragment.fromArray(cells));}chosenColumn=index;}
  }
  if(action==='delete'){
   if((c.axis==='row'?c.height:c.width)===1){if(!confirm('마지막 행 또는 열을 삭제하면 표 전체가 삭제됩니다. 계속할까요?'))return;historyBoundary();c.editor.chain().focus().deleteTable().run();historyBoundary();close();hideHandles();return;}
   if(c.axis==='row'){rows.splice(c.index,1);if(header&&c.index===0)rows[0]=coerce(rows[0],schema.nodes.tableHeader);chosenRow=Math.min(c.index,rows.length-1);}
   else for(let r=0;r<rows.length;r++){const cells=Array.from({length:rows[r].childCount},(_,i)=>rows[r].child(i));cells.splice(c.index,1);rows[r]=rows[r].copy(BlockEngine.Fragment.fromArray(cells));}
  }
  const table=c.node.type.create({...c.node.attrs,studioEdited:new Date().toISOString()},rows,c.node.marks);commit(c,table,chosenRow,chosenColumn);
 }
 root.addEventListener('pointerover',event=>{const cell=event.target.closest('td,th');if(cell)show(cell);else if(!state.menu){clearTimeout(state.hide);state.hide=setTimeout(hideHandles,250);}});
 document.addEventListener('pointerover',event=>{if(root.contains(event.target)||event.target.closest('.studio-table-menu,.studio-table-handle,.studio-table-add-row,.studio-table-add-column'))return;clearTimeout(state.hide);state.hide=setTimeout(()=>{if(!state.menu)hideHandles();},250);});
 document.addEventListener('pointerdown',event=>{if(!event.target.closest('.studio-table-menu,.studio-table-handle,.studio-table-add-row,.studio-table-add-column'))close();});
 document.addEventListener('keydown',event=>{
  if(state.drag&&event.key==='Escape'){state.suppressClick=state.drag.axis;stopDrag();event.preventDefault();return;}
  if(!state.menu&&event.altKey&&event.key==='F10'&&!event.isComposing&&(root.contains(document.activeElement)||Object.values(handles).includes(document.activeElement))&&editable()){const c=engineTableContext(),cell=c?RICH.editor.view.nodeDOM(c.pos+1+c.map.map[c.row*c.width+c.column]):state.hover?.cell;if(cell){show(cell);open(event.shiftKey?'column':'row');event.preventDefault();event.stopImmediatePropagation();}return;}
  if(!state.menu)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(!palette.hidden){palette.hidden=true;menu.querySelector('[data-table-menu-action=color]')?.focus();}else close(true);return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'){event.preventDefault();event.stopImmediatePropagation();menu.querySelector('[data-table-menu-action=duplicate]:not(:disabled)')?.click();return;}
  if(!['ArrowDown','ArrowUp'].includes(event.key))return;const panel=palette.hidden?menu:palette,buttons=[...panel.querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;
  const index=buttons.indexOf(document.activeElement),next=index<0?(event.key==='ArrowDown'?0:buttons.length-1):(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;event.preventDefault();event.stopImmediatePropagation();buttons[next].focus();
 },true);
 document.addEventListener('scroll',event=>{if(state.drag)return;if(menu.contains(event.target)||palette.contains(event.target))return;close();if(state.visible)requestAnimationFrame(()=>show(state.hover?.cell));},true);
 addEventListener('resize',()=>{stopDrag();close();if(state.visible)requestAnimationFrame(()=>show(state.hover?.cell));});document.addEventListener('studio:view-changed',()=>{stopDrag();close();hideHandles();});document.addEventListener('studio:document-changed',()=>{stopDrag();close();hideHandles();});
 const previous=updateTableTools;updateTableTools=function(){previous();if(!editable()){stopDrag();close();hideHandles();}else if(state.menu)valid();else if(!state.drag&&root.contains(document.activeElement)){const c=engineTableContext();if(c){const cell=c.editor?.view?.nodeDOM?.(c.pos+1+c.map.map[c.row*c.width+c.column])||RICH.editor.view.nodeDOM(c.pos+1+c.map.map[c.row*c.width+c.column]);if(cell)show(cell);}}};
})();
