/* Saved document views. Document metadata follows existing workspace persistence. */
'use strict';
(() => {
 const key='md-document-library-views',defaults=()=>({active:'all',views:[{id:'all',name:'All',type:'list',sort:'-updatedAt',columns:['tags','createdAt']},{id:'table',name:'표',type:'table',sort:'-updatedAt'}]});
 let settings=defaults();
 const clean=v=>({id:String(v.id).slice(0,80),name:String(v.name||'보기').slice(0,40),type:v.type==='table'?'table':'list',sort:['title','-title','createdAt','-createdAt','updatedAt','-updatedAt'].includes(v.sort)?v.sort:'-updatedAt',query:String(v.query||'').slice(0,200),tag:String(v.tag||'').slice(0,40),folder:String(v.folder||'').slice(0,80),favorites:!!v.favorites,columns:Array.isArray(v.columns)?v.columns.filter(c=>['tags','files','createdAt','updatedAt'].includes(c)):['tags','files','createdAt','updatedAt']});
 try{const saved=JSON.parse(localStorage.getItem(key));if(Array.isArray(saved?.views)&&saved.views.length&&saved.views.length<=20){const ids=new Set();settings={active:saved.active,views:saved.views.filter(v=>v&&typeof v.id==='string'&&!ids.has(v.id)&&ids.add(v.id)).map(clean)};if(!settings.views.length)settings=defaults();}}catch{}
 settings.views=settings.views.map(clean);
 const view=()=>settings.views.find(v=>v.id===settings.active)||settings.views[0];
 const tags=d=>Array.isArray(d.tags)?d.tags.filter(t=>typeof t==='string').slice(0,20):[];
 const locked=()=>APP.loading||APP.externalDraft||(typeof ST!=='undefined'&&ST.busy);
 const save=()=>{settings.active=view().id;try{localStorage.setItem(key,JSON.stringify(settings));}catch{toast('보기 설정을 저장하지 못했습니다.',true);}};
 const button=(text,label,fn,cls='')=>{const b=el('button',cls,text);b.type='button';b.setAttribute('aria-label',label);b.title=label;b.onclick=fn;return b;};
 const library=el('section','document-library');library.id='documentLibrary';library.hidden=true;library.setAttribute('aria-label','문서 데이터베이스');
 const heading=el('div','library-heading'),headingText=el('div');headingText.append(el('span','tiny-label','MY WORKSPACE'),el('h1','','문서 데이터베이스'));heading.append(headingText,button('문서로 돌아가기','문서로 돌아가기',()=>close()));
 const bar=el('div','library-toolbar'),tabs=el('div','library-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','저장된 문서 보기');
 const add=button('＋','새 보기 추가',()=>editView()),options=button('⋯','현재 보기 설정',()=>editView(view()));
 const query=el('input');query.type='search';query.placeholder='문서·태그 검색';query.setAttribute('aria-label','데이터베이스 문서 검색');
 const sort=el('select');sort.setAttribute('aria-label','문서 정렬');for(const [value,label]of [['-updatedAt','최근 수정순'],['updatedAt','오래된 수정순'],['-createdAt','최근 생성순'],['createdAt','오래된 생성순'],['title','이름 오름차순'],['-title','이름 내림차순']])sort.append(new Option(label,value));
 const filters=button('필터','필터 설정',()=>{filterPanel.hidden=!filterPanel.hidden;filters.setAttribute('aria-expanded',String(!filterPanel.hidden));});filters.setAttribute('aria-expanded','false');
 const create=button('＋ 새로 만들기','새 문서 만들기',()=>{if(locked())return;close();$('#newDoc').click();},'primary');
 bar.append(tabs,add,options,el('span','library-spacer'),query,filters,sort,create);
 const filterPanel=el('div','library-filters');filterPanel.hidden=true;
 const tag=el('select'),folder=el('select'),fav=el('input');tag.setAttribute('aria-label','태그 필터');folder.setAttribute('aria-label','폴더 필터');fav.type='checkbox';const favLabel=el('label','','즐겨찾기만');favLabel.prepend(fav);
 filterPanel.append(tag,folder,favLabel,button('초기화','검색 및 필터 초기화',()=>{Object.assign(view(),{query:'',tag:'',folder:'',favorites:false});sync();save();}));
 const body=el('div','library-body'),status=el('p','library-status');status.setAttribute('role','status');
 library.append(heading,bar,filterPanel,body,status);$('.main').append(library);
 const openButton=button('▤ 문서 데이터베이스','문서 데이터베이스 열기',()=>open(),'library-open wide');openButton.id='openDocumentLibrary';$('#newDoc').after(openButton);
 const dialog=el('dialog');dialog.id='libraryDialog';document.body.append(dialog);
 function close(){library.hidden=true;openButton.setAttribute('aria-pressed','false');openButton.focus();}
 function open(){if(APP.loading)return;library.hidden=false;openButton.setAttribute('aria-pressed','true');sync();query.focus();}
 function label(text,input){const l=el('label','',text);l.append(input);return l;}
 function modal(title){dialog.replaceChildren();const head=el('div','dialog-heading');head.append(el('h2','',title),button('×','닫기',()=>dialog.close()));dialog.append(head);}
 function editView(existing){
  modal(existing?'보기 설정':'새 보기 추가');const form=el('form','library-form'),name=el('input'),type=el('select');name.required=true;name.maxLength=40;name.value=existing?.name||'';type.append(new Option('☷ 목록','list'),new Option('▦ 표','table'));type.value=existing?.type||'list';form.append(label('보기 이름',name),label('레이아웃',type));
  const fields=el('fieldset'),checks=[];fields.append(el('legend','','표시할 속성'));for(const [id,text]of [['tags','태그'],['files','첨부 파일'],['createdAt','생성일'],['updatedAt','최근 수정일']]){const check=el('input');check.type='checkbox';check.checked=!existing||existing.columns.includes(id);checks.push([id,check]);fields.append(label(text,check));}form.append(fields);
  const footer=el('div','dialog-footer');if(existing){const remove=button('보기 삭제','이 보기 삭제',()=>{if(settings.views.length===1)return toast('보기는 하나 이상 필요합니다.',true);if(!confirm('이 보기를 삭제할까요? 문서는 삭제되지 않습니다.'))return;settings.views=settings.views.filter(v=>v.id!==existing.id);settings.active=settings.views[0].id;save();sync();dialog.close();});remove.disabled=settings.views.length===1;footer.append(remove);}
  footer.append(button('취소','취소',()=>dialog.close()));const submit=el('button','primary','저장');submit.type='submit';footer.append(submit);form.append(footer);form.onsubmit=e=>{e.preventDefault();if(!name.value.trim())return name.focus();if(!existing&&settings.views.length>=20)return toast('보기는 최대 20개입니다.',true);const next=clean({...existing,id:existing?.id||crypto.randomUUID(),name:name.value.trim(),type:type.value,columns:checks.filter(([,c])=>c.checked).map(([id])=>id)});if(existing)settings.views[settings.views.indexOf(existing)]=next;else settings.views.push(next);settings.active=next.id;save();sync();dialog.close();};dialog.append(form);dialog.showModal();name.focus();
 }
 function editTags(doc){
  if(locked())return;const id=doc.id;modal('태그 편집 · '+doc.title);const form=el('form','library-form'),input=el('input');input.value=tags(doc).join(', ');input.maxLength=820;input.placeholder='예: doc, methodology';form.append(label('태그 (쉼표로 구분, 최대 20개)',input));const suggestions=el('div','library-tag-suggestions');for(const t of allTags()){const b=button(t,'태그 '+t+' 추가',()=>{const values=input.value.split(',').map(x=>x.trim()).filter(Boolean);if(!values.includes(t))input.value=[...values,t].join(', ');});suggestions.append(b);}form.append(suggestions);const submit=el('button','primary','저장');submit.type='submit';form.append(submit);form.onsubmit=e=>{e.preventDefault();const d=APP.documents.find(d=>d.id===id);if(!d||locked())return dialog.close();const values=[...new Set(input.value.split(',').map(t=>t.trim()).filter(Boolean))];if(values.length>20||values.some(t=>t.length>40))return toast('태그는 20개까지, 각 40자까지 입력하세요.',true);d.tags=values;d.updatedAt=new Date().toISOString();changed(false);saveDraft().catch(onError);sync();dialog.close();};dialog.append(form);dialog.showModal();input.focus();
 }
 function allTags(){return [...new Set(APP.documents.flatMap(tags))].sort((a,b)=>a.localeCompare(b,'ko'));}
 function color(t){let n=0;for(const c of t)n=(n*31+c.codePointAt(0))>>>0;return n%8;}
 function tagCell(d){const b=button('','태그 편집: '+d.title,()=>editTags(d),'library-tags');b.disabled=locked();for(const t of tags(d)){const chip=el('span','library-tag library-tag-'+color(t),t);b.append(chip);}if(!tags(d).length)b.append(el('span','library-tag-placeholder','＋ 태그'));return b;}
 function date(value){const n=new Date(value);return Number.isNaN(n.getTime())?'—':n.toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'});}
 const fileCounts=new WeakMap();
 function fileCount(d){
  const cached=fileCounts.get(d);if(cached?.content===d.content)return cached.count;
  let count=(d.content.match(/\]\((?:data:(?!image\/)|[^)\n]*\.(?:pdf|docx?|xlsx?|pptx?|zip|csv|txt)(?:[?#][^)]*)?)\)/gi)||[]).length;
  for(const match of d.content.matchAll(/<section\b[^>]*data-studio-data=["']([^"']*)["'][^>]*>/gi)){
   try{const data=JSON.parse(decodeURIComponent(match[1]));if(data.mode==='file'||data.fileData)count++;}catch{}
  }
  fileCounts.set(d,{content:d.content,count});return count;
 }
 function titleCell(d){const b=button('','문서 열기: '+d.title,()=>{if(locked())return;selectDocument(d.id);close();},'library-document');b.append(treeIcon(),el('span','',d.title));return b;}
 function rows(){const v=view(),q=query.value.trim().toLocaleLowerCase();return APP.documents.filter(d=>(!q||(d.title+' '+tags(d).join(' ')).toLocaleLowerCase().includes(q))&&(!v.tag||tags(d).includes(v.tag))&&(!v.folder||(v.folder==='root'?!d.folderId:d.folderId===v.folder))&&(!v.favorites||d.favorite)).sort((a,b)=>{const desc=v.sort.startsWith('-'),key=desc?v.sort.slice(1):v.sort;return String(a[key]||'').localeCompare(String(b[key]||''),'ko',{numeric:true})*(desc?-1:1)||a.id.localeCompare(b.id);});}
 function draw(){
  if(library.hidden)return;create.disabled=locked();const v=view(),docs=rows();body.replaceChildren();body.dataset.layout=v.type;
  if(v.type==='table'){
   const table=el('table','library-table'),thead=el('thead'),head=el('tr');for(const text of ['▤ 이름',...v.columns.map(c=>({tags:'☷ Tags',files:'♧ Files',createdAt:'◷ Created time',updatedAt:'◷ Last edited time'})[c])])head.append(el('th','',text));thead.append(head);const tbody=el('tbody');for(const d of docs){const tr=el('tr'),title=el('td');title.append(titleCell(d));tr.append(title);for(const c of v.columns){const td=el('td');if(c==='tags')td.append(tagCell(d));else if(c==='files'){const count=fileCount(d);if(count){const b=button('♧ '+count,'첨부 파일이 있는 문서 열기: '+d.title,()=>{selectDocument(d.id);close();});td.append(b);}}else td.textContent=date(d[c]);tr.append(td);}tbody.append(tr);}table.append(thead,tbody);body.append(table);
  }else{const list=el('div','library-list');for(const d of docs){const row=el('div','library-list-row');row.append(titleCell(d));if(v.columns.includes('tags'))row.append(tagCell(d));if(v.columns.includes('files')&&fileCount(d))row.append(el('span','library-files','♧ '+fileCount(d)));const times=el('div','library-times');for(const c of ['createdAt','updatedAt'])if(v.columns.includes(c)){const time=el('time','',date(d[c]));time.title=c==='createdAt'?'생성일':'최근 수정일';time.setAttribute('aria-label',time.title+' '+time.textContent);times.append(time);}row.append(times);list.append(row);}body.append(list);}
  if(!docs.length)body.append(el('p','library-empty','조건에 맞는 문서가 없습니다. 검색어나 필터를 변경하세요.'));
  status.textContent=docs.length+'개 표시 / 전체 '+APP.documents.length+'개 문서';filters.classList.toggle('active',!!(v.tag||v.folder||v.favorites));
 }
 function sync(){
  const v=view();tabs.replaceChildren(...settings.views.map(item=>{const b=button((item.type==='table'?'▦ ':'☷ ')+item.name,'보기: '+item.name,()=>{settings.active=item.id;save();sync();});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(item===v));b.tabIndex=item===v?0:-1;return b;}));query.value=v.query;sort.value=v.sort;
  tag.replaceChildren(new Option('모든 태그',''),...allTags().map(t=>new Option(t,t)));if(v.tag&&!allTags().includes(v.tag))tag.append(new Option(v.tag,v.tag));tag.value=v.tag;
  folder.replaceChildren(new Option('모든 폴더',''),new Option('최상위 문서','root'),...APP.folders.map(f=>new Option(folderPath(f.id)||f.name,f.id)));folder.value=v.folder;fav.checked=v.favorites;draw();
 }
 for(const [input,prop,event]of [[query,'query','input'],[sort,'sort','change'],[tag,'tag','change'],[folder,'folder','change'],[fav,'favorites','change']])input.addEventListener(event,()=>{view()[prop]=input===fav?fav.checked:input.value;save();draw();});
 tabs.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const items=[...tabs.children],i=items.indexOf(document.activeElement),n=e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowRight'?1:-1)+items.length)%items.length;items[n].click();tabs.children[n].focus();});
 library.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open){e.preventDefault();close();}});
 const previous=renderDocList;renderDocList=function(){previous();if(!library.hidden)draw();};
 const previousSelect=selectDocument;selectDocument=function(id){previousSelect(id);if(!library.hidden)close();};
 $('#newDoc').addEventListener('click',()=>{if(!APP.loading&&!library.hidden)close();});
})();
