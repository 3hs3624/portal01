"""Sharing UI and native shared document editor, using isolated registered-user fixtures."""
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
from write_studio_blocks import StudioHandler
import json,uuid

def run(base):
 records={};members={};calls=[]
 users=[{'id':'owner','name':'소유자','email':'owner@example.test'},{'id':'recipient','name':'공유 사용자','email':'reader@example.test'}]
 def api(route):
  body=route.request.post_data_json;action=body['action'];args=body['args'];actor=body['actor'];calls.append((actor,action,args));result=None;status=200
  try:
   if action=='users':result=[u for u in users if u['id']!=actor and args.get('query','') in u['name']+' '+u['email']]
   elif action=='ensure':
    result=next((r for r in records.values() if r['owner_id']==actor and r['source_key']==args['key'] and r['app']==args['app']),None)
    if result is None:
     item=str(uuid.uuid4());result={'id':item,'app':args['app'],'source_key':args['key'],'title':args['title'],'workspace':args['workspace'],'revision':str(uuid.uuid4()),'owner_id':actor,'updatedAt':'2026-11-06T00:00:00Z'};records[item]=result;members[item]={}
    result={**result,'owner':True,'permission':'owner'}
   elif action=='list':result=[{**r,'owner':r['owner_id']==actor,'permission':'owner' if r['owner_id']==actor else members[r['id']].get(actor),'owner_name':'소유자'} for r in records.values() if r['app']==args['app'] and (r['owner_id']==actor or actor in members[r['id']])]
   else:
    r=records[args['id']];owner=r['owner_id']==actor;permission='owner' if owner else members[r['id']].get(actor)
    if not permission:raise Exception('공유 권한이 없습니다.')
    if action=='get':result={**r,'owner':owner,'permission':permission,'canEdit':permission in ['owner','edit']}
    elif action in ['members','grant','revoke']:
     if not owner:raise Exception('소유자만 변경할 수 있습니다.')
     if action=='grant':members[r['id']][args['user']]=args['permission']
     if action=='revoke':members[r['id']].pop(args['user'],None)
     result=[{**next(u for u in users if u['id']==uid),'permission':permission,'enabled':True} for uid,permission in members[r['id']].items()]
    elif action=='save':
     if permission not in ['owner','edit']:raise Exception('조회 전용입니다.')
     if args['revision']!=r['revision']:raise Exception('다른 사용자가 먼저 수정했습니다.')
     r['workspace']=args['workspace'];r['revision']=str(uuid.uuid4());result={'id':r['id'],'revision':r['revision'],'savedAt':'2026-11-06T00:01:00Z'}
  except Exception as e:result={'error':str(e)};status=403
  route.fulfill(status=status,content_type='application/json',body=json.dumps(result))
 def check_checkbox_layout(dialog):
  row=dialog.locator('.portal-share-user').first;row.wait_for();check=row.locator('input[type=checkbox]');text=row.locator('span');a=check.bounding_box();b=text.bounding_box();r=row.bounding_box()
  assert a['x']<b['x'] and abs((a['y']+a['height']/2)-(b['y']+b['height']/2))<2,(a,b)
  assert abs(a['x']-r['x'])<2 and a['width']==16,(a,r)
  text.click();expect(check).to_be_checked();text.click();expect(check).not_to_be_checked()
 def host(actor,app='markdown'):
  return '<script>window.__portalAuthenticated=true;window.PortalUserId='+json.dumps(actor)+';window.PortalSharingAPI={async request(action,args){const r=await fetch("/share-api",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,args,actor:'+json.dumps(actor)+'})});const data=await r.json();if(!r.ok)throw Error(data.error);return data}};</script><iframe src="/portal01/apps/'+app+'/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);context=browser.new_context(viewport={'width':1700,'height':1100});context.route('**/share-api',api);context.route('**/owner-host',lambda r:r.fulfill(content_type='text/html',body=host('owner')));context.route('**/recipient-host',lambda r:r.fulfill(content_type='text/html',body=host('recipient')))
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/owner-host');f=page.frame_locator('iframe');f.locator('.portal-share-item-row').first.wait_for();page.frames[1].wait_for_function('()=>!APP.loading&&ST.ready');original=page.frames[1].evaluate('APP.documents.length')
  f.locator('.portal-share-item-row .portal-share-button').first.click();dialog=f.locator('.portal-share-dialog');expect(dialog).to_be_visible();check_checkbox_layout(dialog);dialog.get_by_role('checkbox',name='공유 사용자 선택').check();dialog.get_by_label('선택한 사용자의 권한').select_option('view');dialog.get_by_role('button',name='선택한 사용자에게 공유',exact=True).click();expect(dialog.get_by_role('button',name='공유 사용자 공유 해제')).to_be_visible();item=next(iter(records));assert members[item]['recipient']=='view'
  print('PASS owner sharing dialog and view grant',flush=True)
  recipient=context.new_page();recipient.on('pageerror',lambda e:errors.append(str(e)));recipient.goto(base+'/recipient-host');rf=recipient.frame_locator('iframe');rf.locator('.portal-share-list-row button').first.click();shared=rf.frame_locator('.portal-shared-view iframe');shared.locator('#status').get_by_text('조회 전용',exact=False).wait_for();native=shared.frame_locator('iframe');native.locator('.block-editor-content').wait_for();native.locator('#editor').wait_for(state='attached');expect(native.locator('#editor')).to_be_disabled();native_frame=recipient.frames[-1];native_frame.wait_for_function('()=>!APP.loading&&ST.ready&&!RICH.editor.isEditable');assert native_frame.evaluate('APP.documents.length')==1;assert page.frames[1].evaluate('APP.documents.length')==original
  print('PASS readonly shared native editor',flush=True)
  dialog.get_by_role('combobox',name='공유 사용자 공유 권한').select_option('edit');expect(dialog.get_by_role('combobox',name='공유 사용자 공유 권한')).to_have_value('edit');assert members[item]['recipient']=='edit'
  # Reload only the authorized shared host, preserving personal workspace state.
  recipient.frames[-2].evaluate('location.reload()');native.locator('.block-editor-content').wait_for();recipient.frames[-1].wait_for_function('()=>!APP.loading&&ST.ready&&RICH.editor.isEditable');recipient.frames[-1].evaluate("RICH.editor.commands.focus('end');RICH.editor.commands.insertContent(' 공유 편집 검증');")
  shared.get_by_role('button',name='변경사항 저장').click();expect(shared.locator('#status')).to_contain_text('저장 완료');assert '공유 편집 검증' in records[item]['workspace']['documents'][0]['content']
  dialog.get_by_role('button',name='공유 사용자 공유 해제').click();expect(dialog.get_by_text('아직 공유된 사용자가 없습니다.')).to_be_visible();assert not members[item]
  dialog.get_by_role('button',name='닫기',exact=True).click();f.locator('#newDoc').click();page.frames[1].evaluate('(id)=>{APP.documents=APP.documents.filter(d=>d.id!==id);renderDocList();}',records[item]['source_key']);f.get_by_role('button',name=records[item]['title']+' 권한 관리',exact=True).click();expect(dialog.get_by_text('아직 공유된 사용자가 없습니다.')).to_be_visible();assert len([r for r in records.values() if r['app']=='markdown'])==1;print('PASS owner can manage sharing after private original is removed',flush=True)
  recipient.close();assert not errors,errors;print('PASS registered-user selection, view/edit grants, native isolated shared editor, shared save, personal data isolation and owner revocation',flush=True)
  for app in ['projects','insight']:
   context.route('**/owner-'+app,lambda r,request,app=app:r.fulfill(content_type='text/html',body=host('owner',app)))
   context.route('**/recipient-'+app,lambda r,request,app=app:r.fulfill(content_type='text/html',body=host('recipient',app)))
   own=context.new_page();own.on('pageerror',lambda e:errors.append(str(e)));own.goto(base+'/owner-'+app);of=own.frame_locator('iframe');of.locator('#portal-app-tools').wait_for();oframe=own.frames[1]
   if app=='projects':
    oframe.evaluate("""async()=>{const base={current:{schema:2,project:{name:'Fixture',client:'Client',pm:'PM',startDate:'2026-01-01',endDate:'2026-12-31'},phases:[],holidays:[],milestones:[],sample:false}},files=[];for(const id of ['PRJ20261106000000a','PRJ20261106000000b']){const meta={format:'wbs-pm-meta',version:1,id,name:id==='PRJ20261106000000a'?'공유 프로젝트':'비공개 프로젝트',pm:'PM',createdAt:new Date().toISOString()},state=structuredClone(base.current);state.project.name=meta.name;files.push({path:'projects/'+id+'.meta.json',data:PortalStorageModels.encode(meta)},{path:'projects/'+id+'.json',data:PortalStorageModels.encode({format:'wbs-dashboard',schema:4,projectId:id,current:state,snapshots:[]})})}await PortalWorkspaceAdapter.restore({format:'wbs-pm-cloud',version:1,directories:['projects'],files});}""")
    of.locator('[data-share=PRJ20261106000000a]').click()
   else:
    oframe.wait_for_function('()=>typeof storageState!=="undefined"&&storageState.ready')
    oframe.evaluate("""()=>{setData('공유 데이터',{Sheet1:{columns:['Name','Value'],rows:[['One',1],['Two',2]]},PrivateSheet:{columns:['Secret'],rows:[['Do not share']]}},'sharing-source');saveDashboard('공유 대시보드','',false);renderDashboardList();}""")
    of.get_by_role('button',name='공유 대시보드 공유',exact=True).click()
   od=of.locator('.portal-share-dialog');check_checkbox_layout(od);od.get_by_role('checkbox',name='공유 사용자 선택').check();od.get_by_role('button',name='선택한 사용자에게 공유',exact=True).click();expect(od.get_by_role('button',name='공유 사용자 공유 해제')).to_be_visible()
   record=next(r for r in records.values() if r['app']==app)
   if app=='projects':assert all('PRJ20261106000000b' not in f['path'] for f in record['workspace']['files'])
   else:assert len(record['workspace']['dashboards'])==1 and list(record['workspace']['sources'][0]['sheets'])==['Sheet1']
   other=context.new_page();other.on('pageerror',lambda e:errors.append(str(e)));other.goto(base+'/recipient-'+app);af=other.frame_locator('iframe');af.locator('.portal-share-list-row button').first.click();sh=af.frame_locator('.portal-shared-view iframe');sh.locator('#status').get_by_text('조회 전용',exact=False).wait_for();nf=sh.frame_locator('iframe');nf.locator('#portal-app-tools').wait_for()
   if app=='projects':expect(nf.locator('#list tbody tr')).to_have_count(1);expect(nf.locator('#list')).to_contain_text('공유 프로젝트');expect(nf.locator('[data-edit=PRJ20261106000000a]')).to_be_disabled()
   else:
    other.frames[-1].wait_for_function('()=>storageState.ready&&window.PortalSharedItemAdapter')
    assert other.frames[-1].evaluate('readDashboards().length')==1
    other.frames[-1].evaluate('setDashboardEditing(true)');assert not other.frames[-1].evaluate('dashboardState.editing')
   od.get_by_role('combobox',name='공유 사용자 공유 권한').select_option('edit');expect(od.get_by_role('combobox',name='공유 사용자 공유 권한')).to_have_value('edit')
   other.frames[-2].evaluate('location.reload()');nf.locator('#portal-app-tools').wait_for();other.frames[-1].wait_for_function('()=>window.PortalSharedItemAdapter&&window.PortalShareSession.canEdit')
   if app=='projects':
    other.frames[-1].evaluate("""async()=>{const w=await PortalWorkspaceAdapter.capture();for(const f of w.files){if(!f.path.endsWith('.json'))continue;const x=PortalStorageModels.decode(f.data);if(f.path.endsWith('.meta.json'))x.name='공유 프로젝트 편집';else if(x.current?.project)x.current.project.name='공유 프로젝트 편집';f.data=PortalStorageModels.encode(x)}await PortalWorkspaceAdapter.restore(w);}""")
   else:other.frames[-1].evaluate("dashboardState.name='공유 대시보드 편집';")
   sh.get_by_role('button',name='변경사항 저장').click();expect(sh.locator('#status')).to_contain_text('저장 완료')
   if app=='projects':
    import base64
    meta=next(x for x in records[record['id']]['workspace']['files'] if x['path'].endswith('.meta.json'));assert json.loads(base64.b64decode(meta['data']))['name']=='공유 프로젝트 편집'
   else:assert records[record['id']]['workspace']['dashboards'][0]['name']=='공유 대시보드 편집'
   print('PASS '+app+': list sharing, item-only scope, readonly native view, edit grant and shared save',flush=True);other.close();own.close()
  assert not errors,errors;browser.close()

if __name__=='__main__':
 with ThreadingHTTPServer(('127.0.0.1',0),StudioHandler) as server:
  Thread(target=server.serve_forever,daemon=True).start()
  try:run('http://127.0.0.1:'+str(server.server_port))
  finally:server.shutdown()
