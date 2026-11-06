"""Real app storage integration: initial BI autosave, protected replacement and open WBS drafts."""
from threading import Thread
from http.server import ThreadingHTTPServer
import json,base64
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for app in ['insight','projects']:
   c=browser.new_context(viewport={'width':1450,'height':1050},accept_downloads=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   c.route('**/shared-storage-host',lambda r:r.fulfill(content_type='text/html',body='<meta charset=utf-8><script>window.__portalAuthenticated=true;window.PortalUserId="shared-storage-test"</script><iframe src="/portal01/apps/'+app+'/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
   page.goto(base+'/shared-storage-host');f=page.frame_locator('iframe');f.locator('#portal-app-tools').wait_for();fr=page.frames[1]
   if app=='insight':
    fr.wait_for_function('()=>storageState.ready')
    fr.evaluate("()=>{registerConnectedData('검증 데이터',{Sheet1:{columns:['항목','값'],rows:[['A',3]]}},'source-test')}")
    fr.wait_for_function("async()=>{const s=await PagesStorage.handle('load',{id:'browser'});return s.hasWorkspace&&s.workspace.sources.some(x=>x.name==='검증 데이터')}")
    print('PASS Insight BI saves first changes automatically in a new browser',flush=True)
   else:
    fr.evaluate('PortalWorkspaceAdapter.prepare()');f.locator('#btn-new').click();f.locator('#p-name').fill('공통 저장소 테스트');f.locator('#p-client').fill('테스트');f.locator('#p-start').fill('2026-11-01');f.locator('#p-end').fill('2026-12-31')
    with c.expect_page() as event:f.locator('#pm-ok').click()
    popup=event.value;popup.on('pageerror',lambda e:errors.append(str(e)));popup.locator('#sample-chip').wait_for();popup.locator('#sample-chip').click();popup.locator('#sp-keep').click();assert popup.evaluate('PortalStorageDraft.capture().pkg.current.sample') is False
   f.locator('#portal-cloud-open').click();d=f.locator('.studio-storage-dialog');status=d.locator('.portal-cloud-status');d.get_by_label('저장소 선택',exact=True).select_option('browser');expect(status).to_contain_text('처음 저장')
   action=lambda name:d.locator('[data-storage-action='+name+']')
   action('save').click();action('apply').click();expect(status).to_contain_text('저장 완료')
   snapshot=fr.evaluate("PortalFolderStorage.load('browser')");assert snapshot['hasWorkspace']
   if app=='projects':
    assert popup.evaluate('PortalStorageDraft.capture()') is None
    files=snapshot['workspace']['files'];index=next(x for x in files if x['path'].startswith('projects/') and x['path'].endswith('.json') and not x['path'].endswith('.meta.json') and '/snapshots/' not in x['path']);saved=json.loads(base64.b64decode(index['data']));assert saved['current']['sample'] is False;assert len(saved['snapshots'])>=2
    assert any('공통 저장소 관리' in json.loads(base64.b64decode(x['data'])).get('note','') for x in files if '/snapshots/' in x['path'] and x['path'].endswith('.json'))
    action('load').click();action('apply').click();expect(status).to_contain_text('창을 닫은 뒤');popup.close();action('apply').click();expect(status).to_contain_text('불러오기 완료')
    d.get_by_role('button',name='저장소 닫기').click()
    fr.evaluate('''async()=>{const w=await PortalWorkspaceAdapter.capture();const meta=w.files.find(f=>f.path.endsWith('.meta.json'));const m=PortalStorageModels.decode(meta.data);m.name='현재 프로젝트 수정';meta.data=PortalStorageModels.encode(m);await PortalWorkspaceAdapter.restore(w)}''')
    f.locator('#portal-cloud-open').click();expect(status).to_contain_text('비교 후');action('compare').click();assert d.get_by_label('보관할 내용: 현재 프로젝트 수정',exact=True).input_value()=='both';action('apply').click();expect(status).to_contain_text('합치기 완료');combined=fr.evaluate('PortalWorkspaceAdapter.capture()');assert len([x for x in combined['files'] if x['path'].endswith('.meta.json')])==2
    print('PASS Project Management includes open drafts, persists a native version, and blocks replacement while windows are open',flush=True)
   else:
    d.get_by_role('button',name='저장소 닫기').click();fr.evaluate("()=>{connectedData.find(r=>r.name==='검증 데이터').sheets.Sheet1.rows.push(['B',5]);storageChanged()}");fr.wait_for_function('()=>!storageState.dirty')
    f.locator('#portal-cloud-open').click();expect(status).to_contain_text('비교 후');action('compare').click();d.get_by_label('보관할 내용: 대시보드·연결 데이터 묶음',exact=True).select_option('both');action('apply').click();expect(status).to_contain_text('합치기 완료');assert fr.evaluate("connectedData.filter(x=>x.name.startsWith('검증 데이터')).length")==2;assert fr.evaluate('new Set(connectedData.map(x=>x.id)).size===connectedData.length')
    # Reviewed local changes and remote payload changes must abort, even with unchanged revision.
    action('save').click();fr.evaluate("connectedData.find(r=>r.name==='검증 데이터').sheets.Sheet1.rows.push(['C',7])");action('apply').click();expect(status).to_contain_text('현재 작업이 바뀌었습니다')
    d.get_by_role('button',name='백업·복구 목록',exact=True).click();expect(d.locator('.studio-storage-backup').first).to_be_visible();d.get_by_role('button',name='← 저장소 화면으로 돌아가기').click();d.locator('summary').filter(has_text='연결 관리').click();d.get_by_role('button',name='연결·저장본 다시 확인').click();action('save').click()
    fr.evaluate("()=>{window.__realStorage=PortalFolderStorage;PortalFolderStorage={...__realStorage,info:async p=>{const x=await __realStorage.info(p);return {...x,workspace:{...x.workspace,theme:'dark'}}}}}")
    action('apply').click();expect(status).to_contain_text('덮어쓰지 않았습니다');fr.evaluate('PortalFolderStorage=__realStorage')
    print('PASS BI linked-workspace merge, current/payload conflict detection and shared backups',flush=True)
   d.get_by_role('button',name='백업·복구 목록',exact=True).click();assert d.locator('.studio-storage-backup').count()>=2
   with page.expect_download() as e:d.get_by_role('button',name='현재 작업 JSON 내려받기',exact=True).click()
   backup=json.loads(Path(e.value.path()).read_text());assert backup['format']==('wbs-pm-cloud' if app=='projects' else 'insight-bi-workspace')
   d.get_by_role('button',name='← 저장소 화면으로 돌아가기').click();page.set_viewport_size({'width':390,'height':900});assert d.bounding_box()['width']<390;page.screenshot(path=str(Path('work/shared-storage-'+app+'-mobile.png').resolve()));d.get_by_role('button',name='저장소 닫기').click();assert not errors,errors;c.close()
  browser.close()
if __name__=='__main__':
 server=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=server.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(server.server_port))
 finally:server.shutdown()
