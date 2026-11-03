/* Authenticated system administration. Every operation is authorized by SQL RPC. */
(() => {
 const root=document.querySelector('#system-admin-view');let state={section:'overview',query:'',offset:0,total:0},requestId=0,busy=false,editor;
 const sections=[['overview','관리 현황','system.access'],['users','사용자','system.users.read'],['groups','그룹','system.groups.read'],['roles','역할','system.roles.read'],['permissions','권한','system.permissions.read'],['access','접속로그','system.logs.read'],['audit','관리 변경 이력','system.audit.read']];
 const has=code=>!!window.PortalAccess?.isAdmin&&window.PortalAccess.permissions?.includes(code);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=String(text);if(cls)n.className=cls;return n};
 function button(text,fn,cls=''){const n=el('button',text,cls);n.type='button';n.onclick=fn;return n}
 const formatDate=value=>value?new Date(value).toLocaleString('ko-KR'):'—';
 const api=()=>{if(!window.__portalAuthenticated||!window.PortalAccess?.isAdmin)throw Error('관리자 권한이 필요합니다.');return window.PortalAdminAPI};
 function status(text,error=false){const node=root.querySelector('#admin-status');if(node){node.textContent=text;node.classList.toggle('admin-error',error)}}
 async function mutate(action,data){await api().change(action,data);await window.PortalRefreshAccess?.()}
 function create(){
  root.replaceChildren();const head=el('div',null,'admin-heading');const title=el('div');title.append(el('div','SYSTEM ADMINISTRATION','admin-eyebrow'),el('h1','시스템관리'),el('p','사용자와 조직, 역할 및 애플리케이션 권한을 관리합니다.'));
  head.append(title,button('새로고침',()=>load()));root.append(head);
  const tabs=el('div',null,'admin-tabs');tabs.setAttribute('role','navigation');tabs.setAttribute('aria-label','시스템관리 메뉴');
  for(const [id,label,permission]of sections)if(has(permission)){const tab=button(label,()=>{state={section:id,query:'',offset:0,total:0};load()});tab.dataset.adminSection=id;tabs.append(tab)}root.append(tabs);
  const tools=el('div',null,'admin-tools');const input=el('input');input.id='admin-search';input.placeholder='이메일·이름·코드 검색';input.setAttribute('aria-label','관리 목록 검색');const search=()=>{state.query=input.value.trim();state.offset=0;load()};input.onkeydown=e=>{if(e.key==='Enter')search()};tools.append(input,button('검색',search));const add=button('추가',()=>editRecord(null,state.section==='users'?'invite':state.section));add.id='admin-add';tools.append(add);root.append(tools);
  const message=el('p','', 'admin-status');message.id='admin-status';message.setAttribute('role','status');message.setAttribute('aria-live','polite');root.append(message);
  const content=el('div');content.id='admin-content';root.append(content);
  const foot=el('div',null,'admin-pagination');const prev=button('이전',()=>{state.offset=Math.max(0,state.offset-50);load()}),next=button('다음',()=>{state.offset+=50;load()});prev.id='admin-prev';next.id='admin-next';const count=el('span');count.id='admin-count';foot.append(prev,count,next);root.append(foot);
 }
 async function all(section){return (await api().read(section,{limit:200})).items||[]}
 function field(label,value='',{disabled=false,max=100}={}){const row=el('label',null,'admin-field');row.append(el('span',label));const input=el('input');input.value=value||'';input.disabled=disabled;input.maxLength=max;row.append(input);return {row,input}}
 function checkboxList(items,selected,labelFn){
  const fieldset=el('fieldset',null,'admin-checks');fieldset.append(el('legend','선택'));const known=new Set(items.map(i=>i.id||i.code));const chosen=new Set(selected||[]);
  for(const item of items){const id=item.id||item.code,row=el('label');const input=el('input');input.type='checkbox';input.value=id;input.checked=chosen.has(id);row.append(input,el('span',labelFn(item)));fieldset.append(row)}
  return {node:fieldset,values:()=>[...(selected||[]).filter(id=>!known.has(id)),...[...fieldset.querySelectorAll('input:checked')].map(n=>n.value)]};
 }
 function dialog(title){
  if(editor?.open)editor.close();editor?.remove();editor=el('dialog',null,'admin-editor');editor.setAttribute('aria-label',title);const form=el('form');const head=el('div',null,'admin-editor-heading');head.append(el('h2',title),button('×',()=>editor.close(),'admin-close'));form.append(head);const fields=el('div',null,'admin-editor-fields');form.append(fields);const error=el('p','', 'admin-error');error.setAttribute('role','alert');form.append(error);const footer=el('div',null,'admin-editor-footer');footer.append(button('취소',()=>editor.close()));const save=el('button','저장');save.type='submit';footer.append(save);form.append(footer);editor.append(form);document.body.append(editor);editor.showModal();return {form,fields,error,save,editor};
 }
 async function editRecord(record=null,kind=state.section){
  if(busy)return;busy=true;try{
   const titles={delete_user:'사용자 영구 삭제',invite:'사용자 초대',users:'사용자 정보',user_roles:'사용자 역할',groups:'그룹',group_members:'그룹 구성원',group_roles:'그룹 역할',roles:'역할·권한'};
   const modal=dialog(titles[kind]||'설정');let payload,action;
   if(kind==='delete_user'){
    if(!has('system.users.manage'))throw Error('사용자 삭제 권한이 필요합니다.');modal.save.disabled=true;
    const summary=await api().deleteUser({action:'preview',id:record.id});
    const email=field('삭제할 사용자의 이메일을 다시 입력하세요','',{max:254});email.input.type='email';email.input.required=true;email.input.autocomplete='off';
    const acknowledge=el('label',null,'admin-enabled'),check=el('input');check.type='checkbox';check.required=true;acknowledge.append(check,el('span','영구 삭제 범위를 확인했습니다.'));
    modal.fields.append(el('strong',summary.email),el('p','인증 계정·포털 정보·역할·그룹 연결과 클라우드 작업공간 '+summary.workspace_count+'개가 영구 삭제됩니다. 복구할 수 없습니다.'),el('small','브라우저·로컬 폴더·외부 드라이브에 있는 파일은 자동으로 삭제되지 않습니다. 필요한 데이터는 먼저 백업하세요.'),email.row,acknowledge);modal.save.textContent='영구 삭제';modal.save.className='admin-danger';modal.save.disabled=true;
    const validate=()=>modal.save.disabled=!check.checked||email.input.value.trim().toLowerCase()!==summary.email.toLowerCase();email.input.oninput=validate;check.onchange=validate;
    payload=()=>({action:'delete',id:record.id,confirm_email:email.input.value.trim()});
   }else if(kind==='invite'){
    if(!has('system.users.manage'))throw Error('사용자 관리 권한이 필요합니다.');
    const email=field('이메일','',{max:254}),name=field('표시 이름','',{max:100});email.input.type='email';email.input.required=true;email.input.autocomplete='off';
    modal.fields.append(email.row,name.row,el('small','초대 메일을 받은 사용자는 기존 이메일 인증으로 로그인합니다. 기본 일반 사용자 역할이 부여되며, 추가 권한은 사용자 목록의 역할 메뉴에서 별도로 설정합니다.'));modal.save.textContent='초대 메일 발송';
    payload=()=>({email:email.input.value.trim(),display_name:name.input.value.trim()});
   }else if(kind==='users'){
    const name=field('표시 이름',record.display_name),enabled=el('label',null,'admin-enabled'),check=el('input');check.type='checkbox';check.checked=record.enabled;enabled.append(check,el('span','포털 이용 활성화'));modal.fields.append(el('p',record.email),name.row,enabled,el('small','포털 이용 상태입니다. Supabase 인증 계정 자체를 삭제하거나 정지하지 않습니다.'));action='user_save';payload=()=>({id:record.id,display_name:name.input.value.trim(),enabled:check.checked});
   }else if(kind==='groups'){
    const name=field('그룹 이름',record?.name||'',{max:80}),description=field('설명',record?.description||'',{max:300});name.input.required=true;modal.fields.append(name.row,description.row);action='group_save';payload=()=>({id:record?.id||null,name:name.input.value.trim(),description:description.input.value.trim()});
   }else if(kind==='roles'){
    const code=field('역할 코드 (영문 소문자·숫자·밑줄)',record?.code||'',{disabled:!!record,max:40}),name=field('역할 이름',record?.name||'',{disabled:!!record?.builtin,max:80}),description=field('설명',record?.description||'',{max:300});code.input.required=true;code.input.pattern='[a-z][a-z0-9_]{2,39}';name.input.required=true;
    const catalog=await all('permissions'),options=checkboxList(catalog,record?.permissions,p=>p.name+' · '+p.code);modal.fields.append(code.row,name.row,description.row,options.node);action='role_save';payload=()=>({id:record?.id||null,code:code.input.value.trim(),name:name.input.value.trim(),description:description.input.value.trim(),permissions:options.values()});
    if(record?.code==='system_admin'){modal.fields.prepend(el('p','기본 시스템 관리자 역할은 변경할 수 없습니다.'));modal.fields.querySelectorAll('input').forEach(n=>n.disabled=true);modal.save.hidden=true}
   }else if(kind==='user_roles'||kind==='group_roles'){
    const roles=(await all('roles')).filter(r=>kind!=='group_roles'||r.code!=='system_admin');const options=checkboxList(roles,record.role_ids,r=>r.name+' · '+r.code);modal.fields.append(el('p',record.email||record.name),options.node,el('small','현재 관리자가 가진 범위를 넘는 권한은 부여할 수 없습니다. 목록에 없는 기존 역할은 유지됩니다.'));action=kind;payload=()=>({id:record.id,role_ids:options.values()});
   }else{
    const users=await all('users'),options=checkboxList(users,record.member_ids,u=>u.email+' · '+(u.display_name||''));modal.fields.append(el('p',record.name),options.node,el('small','최대 200명까지 표시합니다. 목록에 없는 기존 구성원은 유지됩니다.'));action='group_members';payload=()=>({id:record.id,member_ids:options.values()});
   }
   modal.form.onsubmit=async e=>{e.preventDefault();if(modal.save.disabled)return;modal.save.disabled=true;modal.error.textContent='';try{let outcome;if(kind==='invite')await api().invite(payload());else if(kind==='delete_user')outcome=await api().deleteUser(payload());else await mutate(action,payload());modal.editor.close();if(window.PortalAccess?.isAdmin){await load();if(kind==='invite')status('초대 메일을 발송했습니다. 사용자는 포털에서 기존 이메일 인증으로 로그인할 수 있습니다.');if(kind==='delete_user')status(outcome.message||'사용자를 영구 삭제했습니다.',!!outcome.warning);}}catch(error){modal.error.textContent=error.message}finally{modal.save.disabled=false}};
  }catch(e){status(e.message,true);if(editor?.open)editor.close()}finally{busy=false}
 }
 async function toggleUser(user,control){
  const label=user.enabled?'이용 중지':'재활성화';
  if(!has('system.users.manage')||control.disabled)return;
  if(!confirm(user.email+' 사용자를 '+label+'할까요? 계정과 문서는 보존됩니다.'))return;
  control.disabled=true;
  try{await mutate('user_save',{id:user.id,enabled:!user.enabled});if(window.PortalAccess?.isAdmin){await load();status('사용자를 '+label+'했습니다.');}}catch(e){status(e.message,true)}finally{control.disabled=false}
 }
 async function removeRecord(record,section){
  if(busy)return;const label=section==='groups'?'그룹':'역할';
  if(!confirm('‘'+record.name+'’ '+label+'과 연결된 할당을 삭제할까요? 삭제 후 복구할 수 없습니다.'))return;
  busy=true;try{await mutate(section==='groups'?'group_delete':'role_delete',{id:record.id});if(window.PortalAccess?.isAdmin){await load();status(label+'을 삭제했습니다.');}}catch(e){status('삭제하지 못했습니다. '+e.message,true)}finally{busy=false}
 }
 async function deleteLog(record,section){
  if(busy||!confirm(formatDate(record.created_at)+' 기록을 영구 삭제할까요? 복구할 수 없으며 삭제 행위는 관리 변경 이력에 남습니다.'))return;
  busy=true;try{await api().deleteLog(section,record.id);state.offset=0;await load();status('선택한 로그를 삭제했습니다.');}catch(e){status('로그를 삭제하지 못했습니다. '+e.message,true)}finally{busy=false}
 }
 async function editLogSettings(){
  if(busy)return;busy=true;try{
   const current=await api().logSettings(),modal=dialog('로그 보관·자동 삭제 설정');
   const days=field('자동 삭제 기준: 보관 기간 (일)',String(current.retention_days));days.input.type='number';days.input.min='1';days.input.max='3650';days.input.required=true;
   const enabled=el('label',null,'admin-enabled'),check=el('input');check.type='checkbox';check.checked=current.enabled;enabled.append(check,el('span','자동 삭제 사용'));
   modal.fields.append(days.row,enabled,el('small','기본 보관 기간은 180일입니다. 자동 정리는 오전 3시(한국시간)에 실행하며 설정한 보관 기간이 지난 로그만 삭제합니다. 이 값을 변경하면 기본 180일 자동 삭제 기준이 바뀝니다. 최근 기록은 유지됩니다.'),el('p','마지막 정리: '+formatDate(current.last_run)));
   modal.form.onsubmit=async event=>{event.preventDefault();if(modal.save.disabled)return;const payload={retention_days:Number(days.input.value),enabled:check.checked};if(!confirm(payload.retention_days+'일 이전 로그를 '+(payload.enabled?'매일 자동 정리 시 삭제':'자동 삭제하지 않음')+'하도록 설정할까요?'))return;modal.save.disabled=true;try{await api().logSettings(payload);modal.editor.close();await load();status('로그 보관·자동 삭제 설정을 저장했습니다.');}catch(e){modal.error.textContent=e.message}finally{modal.save.disabled=false}};
  }catch(e){status(e.message,true)}finally{busy=false}
 }
 async function cleanupLogs(){
  if(busy)return;busy=true;try{const settings=await api().logSettings();if(!confirm(settings.retention_days+'일이 지난 접속로그와 관리 이력을 지금 삭제할까요? 복구할 수 없습니다.'))return;const result=await api().cleanupLogs();await load();status('로그 정리 완료: 접속로그 '+result.access_deleted+'건, 관리 이력 '+result.audit_deleted+'건을 삭제했습니다.');}catch(e){status(e.message,true)}finally{busy=false}
 }

 function table(headers,rows,build){const wrap=el('div',null,'admin-table-wrap'),table=el('table'),thead=el('thead'),head=el('tr');headers.forEach(h=>head.append(el('th',h)));thead.append(head);table.append(thead);const body=el('tbody');for(const row of rows)body.append(build(row));if(!rows.length){const tr=el('tr'),td=el('td','표시할 항목이 없습니다.');td.colSpan=headers.length;tr.append(td);body.append(tr)}table.append(body);wrap.append(table);return wrap}
 function row(values){const tr=el('tr');for(const value of values){const td=el('td');if(value instanceof Node)td.append(value);else td.textContent=value??'—';tr.append(td)}return tr}
 function actions(...buttons){const n=el('div',null,'admin-row-actions');n.append(...buttons.filter(Boolean));return n}
 async function load(){
  if(!window.PortalAccess?.isAdmin){clear();return}if(!root.children.length)create();const seq=++requestId;
  if(!sections.some(([id,,permission])=>id===state.section&&has(permission)))state.section='overview';
  root.querySelectorAll('[data-admin-section]').forEach(n=>{n.classList.toggle('active',n.dataset.adminSection===state.section);n.setAttribute('aria-current',n.dataset.adminSection===state.section?'page':'false')});
  const input=root.querySelector('#admin-search');input.value=state.query;root.querySelector('.admin-tools').hidden=state.section==='overview';
  const add=root.querySelector('#admin-add');add.hidden=!((state.section==='users'&&has('system.users.manage'))||(state.section==='groups'&&has('system.groups.manage'))||(state.section==='roles'&&has('system.roles.manage')));add.textContent=state.section==='users'?'사용자 초대':state.section==='roles'?'역할 추가':'그룹 추가';status('관리 정보를 불러오는 중…');
  try{
   const result=await api().read(state.section,{offset:state.offset,query:state.query});if(seq!==requestId||!window.PortalAccess?.isAdmin)return;const content=root.querySelector('#admin-content');content.replaceChildren();const items=result.items||[];state.total=result.total||0;
   if(state.section==='overview'){
    const cards=el('div',null,'admin-kpis');for(const [key,label]of [['users','사용자'],['enabledUsers','활성 사용자'],['groups','그룹'],['roles','역할'],['recentAccess','최근 24시간 포털 접속']]){const card=el('div');card.append(el('small',label),el('strong',result[key]??0));cards.append(card)}content.append(cards,el('div','사용자 메뉴에서 이메일로 초대하고 이용 중지·재활성화 및 역할을 관리합니다. 이용 중지는 계정과 문서를 보존합니다. 사용자 영구 삭제는 계정과 해당 클라우드 작업공간까지 삭제하므로 확인 화면에서 범위를 검토하세요.','admin-note'),el('div','포털 접속로그는 로그인·세션 복원·로그아웃 요청을 서버 시각과 인증된 사용자 ID로 기록합니다. IP 주소와 인증 실패 기록은 Supabase Auth 로그에서 확인하세요.','admin-note'));
   }else if(state.section==='users')content.append(table(['사용자','표시 이름','포털 상태','직접 부여 역할','최근 인증 로그인','관리'],items,u=>row([u.email,u.display_name,u.enabled?'활성':'중지',(u.role_names||[]).join(', ')||'—',formatDate(u.last_sign_in_at),actions(has('system.users.manage')&&button('정보',()=>editRecord(u,'users')),has('system.users.manage')&&button(u.enabled?'이용 중지':'재활성화',event=>toggleUser(u,event.currentTarget)),has('system.users.manage')&&has('system.roles.read')&&button('역할',()=>editRecord(u,'user_roles')),has('system.users.manage')&&button('삭제',()=>editRecord(u,'delete_user'),'admin-danger'))])));
   else if(state.section==='groups')content.append(table(['그룹','설명','구성원','역할 수','관리'],items,g=>row([g.name,g.description,g.member_ids.length,g.role_ids.length,actions(has('system.groups.manage')&&button('편집',()=>editRecord(g,'groups')),has('system.groups.manage')&&has('system.users.read')&&button('구성원',()=>editRecord(g,'group_members')),has('system.groups.manage')&&has('system.roles.read')&&button('역할',()=>editRecord(g,'group_roles')),has('system.groups.manage')&&button('삭제',()=>removeRecord(g,'groups')))])));
   else if(state.section==='roles')content.append(table(['역할','코드','설명','권한 수','관리'],items,r=>row([r.name,r.code,r.description,r.permissions.length,actions(has('system.roles.manage')&&has('system.permissions.read')&&button(r.code==='system_admin'?'권한 보기':'편집',()=>editRecord(r,'roles')),has('system.roles.manage')&&!r.builtin&&button('삭제',()=>removeRecord(r,'roles')))])));
   else if(state.section==='permissions')content.append(el('p','고정 권한은 삭제할 수 없습니다. 역할 메뉴에서 부여 범위를 조정하세요.','admin-note'),table(['권한','코드','범위'],items,p=>row([p.name,p.code,p.scope==='system'?'시스템관리':'애플리케이션'])));
   else if(state.section==='access'){content.append(el('p','인증된 계정의 포털 보고 이벤트입니다. IP·로그인 실패·완전한 보안 감사 기록은 Supabase Auth 로그를 사용하세요.','admin-note'),table(['서버 기록 시각','사용자','접속 유형','브라우저 정보','관리'],items,l=>row([formatDate(l.created_at),l.email||(l.actor_id==='00000000-0000-0000-0000-000000000000'?'시스템(자동 정리)':l.actor_id),({login:'로그인',session_restore:'세션 복원',logout:'로그아웃'})[l.event]||l.event,l.user_agent,has('system.logs.manage')?button('삭제',()=>deleteLog(l,'access'),'admin-danger'):'—'])));}
   else content.append(table(['서버 기록 시각','관리자','변경 작업','대상','내용','관리'],items,l=>{const detail=el('details');detail.append(el('summary','변경 내용'),el('pre',JSON.stringify(l.details,null,2)));return row([formatDate(l.created_at),l.email||(l.actor_id==='00000000-0000-0000-0000-000000000000'?'시스템(자동 정리)':l.actor_id),l.action,l.target_id||'—',detail,has('system.logs.manage')?button('삭제',()=>deleteLog(l,'audit'),'admin-danger'):'—'])}));
   root.querySelector('.admin-pagination').hidden=state.section==='overview';root.querySelector('#admin-count').textContent=(state.total?state.offset+1:0)+'–'+Math.min(state.offset+50,state.total)+' / '+state.total;root.querySelector('#admin-prev').disabled=state.offset===0;root.querySelector('#admin-next').disabled=state.offset+50>=state.total;
   if(['access','audit'].includes(state.section)&&has('system.logs.manage'))content.append(button('로그 보관·자동 삭제 설정',editLogSettings),button('보관 기간 지난 로그 지금 정리',cleanupLogs,'admin-cleanup'));
   status('');
  }catch(e){if(seq===requestId)status(e.message,true)}
 }
 function clear(){requestId++;root.replaceChildren();editor?.close();editor?.remove();editor=null;state={section:'overview',query:'',offset:0,total:0}}
 window.PortalAdminView={open(){if(!root.children.length)create();return load()},clear};
})();
