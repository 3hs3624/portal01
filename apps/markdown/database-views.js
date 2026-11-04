/* Named database views keep layout, visible properties, filter and sort with the data. */
'use strict';
const STUDIO_DB_VIEWS=(()=>{
 const routeViews=new Map();
 function applyRoute(data,dom){
  const key=APP.activeId+':'+dom.dataset.blockId,route=new URLSearchParams(location.hash.slice(1)),requested=route.get('view');
  if(requested&&route.get('id')===dom.dataset.blockId){routeViews.set(key,requested);route.delete('view');history.replaceState(null,'',location.pathname+location.search+'#'+route.toString());}
  const selected=data.savedViews.find(v=>v.id===routeViews.get(key));return selected?{...data,activeView:selected.id,view:selected.layout}:data;
 }

 function normalize(data){
  const keys=data.fields.map(f=>f.id);
  const valid=(Array.isArray(data.savedViews)?data.savedViews:[]).filter(v=>v&&typeof v.id==='string'&&Object.hasOwn(DB_VIEWS,v.layout)).slice(0,20).map(v=>{
   const visible=Array.isArray(v.visibleFields)?v.visibleFields.filter(id=>keys.includes(id)):keys;
   return {...STUDIO_DB_LAYOUT.defaults,...v,initialLoad:[10,25,50,100].includes(v.initialLoad)?v.initialLoad:10,name:String(v.name||'보기').slice(0,40),visibleFields:visible.length?visible:keys,filterField:keys.includes(v.filterField)?v.filterField:'',filterValue:String(v.filterValue||'').slice(0,200),sortField:keys.includes(v.sortField)?v.sortField:'',sortDir:v.sortDir==='desc'?'desc':'asc'};
  });
  const views=valid.length?valid:[{id:'all',name:DB_VIEWS[data.view]||'표',layout:data.view||'table',visibleFields:data.fields.map(f=>f.id),filterField:'',filterOp:'contains',filterValue:'',sortField:'',sortDir:'asc'}];
  const enriched=views.map(v=>({...STUDIO_DB_LAYOUT.defaults,...v}));const active=enriched.find(v=>v.id===data.activeView)||enriched[0];return {...data,savedViews:enriched,activeView:active.id,view:data.view||active.layout};
 }
 const clearRoute=dom=>routeViews.delete(APP.activeId+':'+dom.dataset.blockId);
 const current=data=>data.savedViews.find(v=>v.id===data.activeView);
 function layout(data,value,update){routeViews.clear();update({...data,view:value,savedViews:data.savedViews.map(v=>v.id===data.activeView?{...v,layout:value}:v)});}
 function render(dom,data,update,editable){
  const bar=el('div','studio-db-viewbar'),tabs=el('div','studio-db-viewtabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','데이터베이스 저장된 보기');
  for(const v of data.savedViews){const b=widgetButton((v.layout==='table'?'▦ ':'▤ ')+v.name,()=>{routeViews.delete(APP.activeId+':'+dom.dataset.blockId);const next={...data,activeView:v.id,view:v.layout};if(editable)update(next);else{dom.replaceChildren();renderStudioDatabase(dom,next,update,false);}});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(v.id===data.activeView));b.tabIndex=v.id===data.activeView?0:-1;tabs.append(b);}
  tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...tabs.children],i=buttons.indexOf(document.activeElement),n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[n].click();};
  bar.append(tabs);if(editable){bar.append(widgetButton('보기 링크 복사',()=>STUDIO_DB_LAYOUT.copyView(dom,data)));if(STUDIO_DB_LAYOUT.isChart(data.view))bar.append(widgetButton('차트 편집',()=>configure(data,update,false)));bar.append(widgetButton('＋ 보기 추가',()=>configure(data,update,true)),widgetButton('보기 설정',()=>configure(data,update,false)));}dom.append(bar);
 }
 function configure(data,update,create){
  const active=current(data);
  if(create&&data.savedViews.length>=20)return toast('데이터베이스 보기는 최대 20개입니다.',true);
  openStudioDialog(create?'데이터베이스 보기 추가':'데이터베이스 보기 설정',dialog=>{
   const form=el('form','studio-db-viewform'),name=el('input'),layout=el('select');name.required=true;name.maxLength=40;name.value=create?'새 보기':active.name;
   const label=(text,input)=>{const l=el('label','',text);input.setAttribute('aria-label',text);l.append(input);return l;};
   for(const [value,text]of Object.entries(DB_VIEWS))layout.append(new Option(text,value));layout.value=active.layout;form.append(label('보기 이름',name),label('레이아웃',layout));const display=STUDIO_DB_LAYOUT.controls(form,data,active,layout);
   const props=el('fieldset'),checks=[];props.append(el('legend','','속성 표시 여부'));for(const f of data.fields){const c=el('input');c.type='checkbox';c.checked=!active.visibleFields||active.visibleFields.includes(f.id);checks.push([f.id,c]);props.append(label(f.name,c));}form.append(props);
   const filterField=el('select'),op=el('select'),value=el('input');filterField.append(new Option('필터 없음',''));for(const f of data.fields)filterField.append(new Option(f.name,f.id));filterField.value=active.filterField||'';for(const [id,text]of [['contains','포함'],['equals','같음'],['notEquals','같지 않음'],['empty','비어 있음'],['notEmpty','비어 있지 않음'],['before','이전 / 작음'],['after','이후 / 큼']])op.append(new Option(text,id));op.value=active.filterOp||'contains';value.value=active.filterValue||'';value.maxLength=200;const syncFilter=()=>{const field=data.fields.find(f=>f.id===filterField.value);value.type=['date','number'].includes(field?.type)?field.type:'text';value.disabled=['empty','notEmpty'].includes(op.value)||!filterField.value;};filterField.onchange=op.onchange=syncFilter;syncFilter();form.append(label('필터 속성',filterField),label('필터 조건',op),label('필터 값',value));
   const sort=el('select'),dir=el('select');sort.append(new Option('정렬 없음',''));for(const f of data.fields)sort.append(new Option(f.name,f.id));sort.value=active.sortField||'';dir.append(new Option('오름차순','asc'),new Option('내림차순','desc'));dir.value=active.sortDir||'asc';form.append(label('정렬 속성',sort),label('정렬 방향',dir));
   const footer=el('div','studio-db-viewfooter');if(!create){const remove=widgetButton('보기 삭제',()=>{if(data.savedViews.length===1||!confirm('이 보기를 삭제할까요? 데이터 항목은 삭제되지 않습니다.'))return;const rest=data.savedViews.filter(v=>v.id!==active.id);update({...data,savedViews:rest,activeView:rest[0].id,view:rest[0].layout});studioDialog.close();},data.savedViews.length===1);footer.append(remove);}
   footer.append(widgetButton('취소',()=>studioDialog.close()));const submit=el('button','primary','보기 저장');submit.type='submit';footer.append(submit);form.append(footer);form.onsubmit=e=>{e.preventDefault();routeViews.clear();if(!name.value.trim())return name.focus();const visible=checks.filter(([,c])=>c.checked).map(([id])=>id);if(!visible.length)return toast('표시할 속성을 하나 이상 선택하세요.',true);const next={...active,...display.read(),id:create?crypto.randomUUID():active.id,name:name.value.trim(),layout:STUDIO_DB_LAYOUT.isChart(layout.value)?'chart':layout.value,visibleFields:visible,filterField:filterField.value,filterOp:op.value,filterValue:value.value,sortField:sort.value,sortDir:dir.value};update({...data,savedViews:create?[...data.savedViews,next]:data.savedViews.map(v=>v.id===next.id?next:v),activeView:next.id,view:next.layout});studioDialog.close();};dialog.append(form);name.focus();
  });
 }
 function filter(data,row){const v=current(data);if(!v.filterField)return true;const field=data.fields.find(f=>f.id===v.filterField);if(!field)return true;const raw=row[v.filterField],a=String(raw??'').toLocaleLowerCase(),b=String(v.filterValue||'').toLocaleLowerCase();switch(v.filterOp){case'equals':return a===b;case'notEquals':return a!==b;case'empty':return raw===undefined||raw===null||raw==='';case'notEmpty':return raw!==undefined&&raw!==null&&raw!=='';case'before':if(raw===undefined||raw===null||raw==='')return false;return field.type==='number'?Number(raw)<Number(b):a<b;case'after':if(raw===undefined||raw===null||raw==='')return false;return field.type==='number'?Number(raw)>Number(b):a>b;default:return a.includes(b);}}
 function fields(data){const ids=current(data).visibleFields;return ids?data.fields.filter(f=>ids.includes(f.id)):data.fields;}
 return {normalize,current,layout,render,filter,fields,applyRoute,clearRoute};
})();
