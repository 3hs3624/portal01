/* Read-only, local user wiki. No business data or permissions are changed. */
(() => {
 'use strict';
 let content=null,pending=null,query='',category='전체',current='',request=0;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const url=id=>'#manual/'+encodeURIComponent(id);
 const corpus=a=>[a.title,a.summary,a.group,...a.sections.flatMap(s=>[s.title,...(s.paragraphs||[]),...(s.steps||[]),...(s.notes||[])])].join(' ').toLocaleLowerCase();
 function go(id){if(location.hash===url(id))showArticle(id,true);else location.hash=url(id);}
 function showArticle(id,focus=false){
  const root=document.querySelector('#manual-view'),article=root.querySelector('#manual-article'),toc=root.querySelector('#manual-toc');
  let selected=content.articles.find(a=>a.id===id),missing=!!id&&!selected;
  selected=selected||content.articles[0];current=selected.id;article.replaceChildren();toc.replaceChildren();
  if(missing){const warning=el('p','찾을 수 없는 문서입니다. 시작 안내를 표시합니다.','manual-notice');warning.setAttribute('role','status');article.append(warning);}
  article.append(el('div',selected.group,'manual-eyebrow'),el('h1',selected.title),el('p',selected.summary,'manual-summary'),el('p','업데이트 '+content.updated+' · 사용자 안내','manual-date'));
  selected.sections.forEach((section,i)=>{
   const block=el('section'),heading=el('h2',section.title);heading.id='manual-section-'+i;block.append(heading);
   for(const p of section.paragraphs||[])block.append(el('p',p));
   if(section.steps?.length){const list=el('ol');for(const p of section.steps)list.append(el('li',p));block.append(list);}
   for(const p of section.notes||[])block.append(el('p',p,'manual-notice'));
   article.append(block);const button=el('button',section.title);button.type='button';button.onclick=()=>{heading.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});heading.tabIndex=-1;heading.focus({preventScroll:true});};toc.append(button);
  });
  const footer=el('div',undefined,'manual-article-footer'),copy=el('button','이 문서 링크 복사'),status=el('span');copy.type='button';status.setAttribute('role','status');
  copy.onclick=async()=>{try{const target=new URL(location.href);target.hash=url(selected.id);await navigator.clipboard.writeText(target.href);status.textContent='링크를 복사했습니다.';}catch{status.textContent='복사하지 못했습니다. 주소창의 링크를 복사해 주세요.';}};
  footer.append(copy,status);article.append(footer);
  if(selected.related?.length){article.append(el('h2','관련 문서'));for(const id of selected.related){const a=content.articles.find(x=>x.id===id);if(a){const link=el('a',a.title,'manual-related');link.href=url(id);article.append(link);}}}
  root.querySelectorAll('[data-manual-id]').forEach(a=>{if(a.dataset.manualId===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(focus){article.tabIndex=-1;article.focus({preventScroll:true});root.scrollIntoView({block:'start'});}
 }
 function results(){
  const root=document.querySelector('#manual-view'),list=root.querySelector('#manual-list'),status=root.querySelector('#manual-results-status');list.replaceChildren();
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const hits=content.articles.filter(a=>(category==='전체'||a.group===category)&&words.every(w=>corpus(a).includes(w)));
  status.textContent=hits.length+'개 문서';
  if(!hits.length){list.append(el('p','검색 결과가 없습니다. 다른 단어를 입력하거나 분류를 전체로 바꿔 주세요.','manual-empty'));return;}
  let group='';for(const a of hits){if(a.group!==group){group=a.group;list.append(el('h3',group));}const link=el('a');link.href=url(a.id);link.dataset.manualId=a.id;link.append(el('strong',a.title),el('small',a.summary));if(a.id===current)link.setAttribute('aria-current','page');list.append(link);}
 }
 function shell(root){
  root.replaceChildren();const header=el('div',undefined,'manual-header');header.append(el('div','HELP & GUIDES','manual-eyebrow'),el('h1','매뉴얼'),el('p','포털부터 문서, 프로젝트, 데이터 분석까지. 필요한 사용법을 찾아보세요.'));root.append(header);
  const layout=el('div',undefined,'manual-layout'),side=el('div',undefined,'manual-sidebar');side.setAttribute('role','navigation');side.setAttribute('aria-label','매뉴얼 문서');
  const label=el('label','매뉴얼 검색');label.htmlFor='manual-search';const search=el('input');search.id='manual-search';search.type='search';search.placeholder='예: 자동저장, 엑셀, 공유';search.value=query;search.oninput=()=>{query=search.value;results();};
  const filterLabel=el('label','분류');filterLabel.htmlFor='manual-category';const filter=el('select');filter.id='manual-category';for(const group of ['전체',...new Set(content.articles.map(a=>a.group))]){const o=el('option',group);o.value=group;filter.append(o);}filter.value=category;filter.onchange=()=>{category=filter.value;results();};
  const reset=el('button','검색 초기화');reset.type='button';reset.onclick=()=>{query='';category='전체';search.value='';filter.value='전체';results();search.focus();};
  const status=el('p',undefined,'manual-results-status');status.id='manual-results-status';status.setAttribute('role','status');const list=el('div');list.id='manual-list';side.append(label,search,filterLabel,filter,reset,status,list);
  const article=el('article');article.id='manual-article';const rail=el('div',undefined,'manual-toc-rail');rail.append(el('h2','이 문서에서'));const toc=el('div');toc.id='manual-toc';rail.append(toc);layout.append(side,article,rail);root.append(layout);
 }
 async function open(){
  const root=document.querySelector('#manual-view'),ticket=++request;
  try{
   if(!content){root.replaceChildren(el('p','매뉴얼을 불러오는 중입니다…'));root.setAttribute('aria-busy','true');
    if(!pending)pending=fetch('/portal01/manual-content.json?v=20261126').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(data.version!==1||!Array.isArray(data.articles)||!data.articles.length)throw Error();return data;}).catch(e=>{pending=null;throw e;});
    content=await pending;
   }
   if(root.hidden||ticket!==request)return;
   if(!root.querySelector('#manual-search'))shell(root);
   let id='';try{id=decodeURIComponent(location.hash.split('/')[1]||'');}catch{}
   results();showArticle(id||content.articles[0].id,true);
  }catch{if(!root.hidden&&ticket===request){root.replaceChildren(el('h1','매뉴얼을 불러오지 못했습니다'),el('p','연결 상태를 확인하고 다시 시도해 주세요.'));const retry=el('button','다시 시도');retry.type='button';retry.onclick=open;root.append(retry);}}
  finally{if(ticket===request)root.removeAttribute('aria-busy');}
 }
 window.PortalManual={open};
})();
