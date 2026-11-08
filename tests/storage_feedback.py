"""Real app feedback: save destination, recovery entry, search excerpts and chart lineage."""
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for app in ['markdown','insight','projects']:
   c=browser.new_context(viewport={'width':1600,'height':1100});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   c.route('**/feedback-host',lambda r:r.fulfill(content_type='text/html',body='<meta charset=utf-8><script>window.__portalAuthenticated=true;window.PortalUserId="feedback-test"</script><iframe src="/portal01/apps/'+app+'/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'))
   page.goto(base+'/feedback-host');f=page.frame_locator('iframe');f.locator('#portal-save-status').wait_for();fr=page.frames[1];badge=f.locator('#portal-save-status')
   if app=='markdown':
    fr.wait_for_function('()=>!APP.loading&&ST.ready');f.locator('#docTitle').fill('저장 상태 검증');expect(badge).to_contain_text('브라우저 저장 완료');expect(badge).to_contain_text('반영 대기')
    fr.evaluate('()=>{const text="| Name | Value |\\n| --- | --- |\\n| needle match | 10 |\\n";currentDoc().content=text;$("#editor").value=text;RICH.markdown=null;renderEditor();setView("preview");changed();}')
    f.locator('#docSearch').fill('needle');expect(f.locator('.doc-search-excerpt mark')).to_have_text('needle');f.locator('#docSearch').fill('');f.locator('.block-editor-content td').first.click();page.keyboard.press('Alt+F10');expect(f.locator('#studioTableMenu')).to_be_visible();expect(f.locator('#studioTableMenu')).to_have_attribute('aria-label','표 행 작업');page.keyboard.press('Escape');page.keyboard.press('Alt+Shift+F10');expect(f.locator('#studioTableMenu')).to_have_attribute('aria-label','표 열 작업');page.keyboard.press('Escape')
   elif app=='insight':
    fr.wait_for_function('()=>storageState.ready');fr.evaluate("()=>{setData('원본 검증',{Sheet1:{columns:['Name','Value'],rows:[['One',1],['Two',2]]}},'feedback-source');saveDashboard('계보 검증','',false);showPage('dashboard');renderBoard()}")
    expect(badge).to_contain_text('브라우저 저장 완료');expect(f.locator('#dashboardDataFreshness')).to_contain_text('데이터 갱신:');f.get_by_role('button',name='1번 차트 원본 행',exact=True).click();d=f.get_by_role('dialog',name='차트 원본 행',exact=True);expect(d).to_contain_text('One');expect(d).to_contain_text('Two');expect(d.locator('input,textarea')).to_have_count(0);d.get_by_role('button',name='닫기',exact=True).click()
    result=fr.evaluate("()=>{try{registerConnectedData('원본 검증',{Sheet1:{columns:['Name'],rows:[['Removed']]}},'feedback-source');return 'accepted'}catch(e){return e.message}}")
    assert '교체하지 않았습니다' in result,result;assert fr.evaluate("connectedData.find(r=>r.signature==='feedback-source').sheets.Sheet1.columns") == ['Name','Value']
   else:
    fr.wait_for_function('()=>window.PortalWorkspaceAdapter');fr.evaluate('PortalWorkspaceAdapter.prepare()');expect(badge).to_contain_text('브라우저 저장 완료')
   badge.click();d=f.locator('.studio-storage-dialog');d.get_by_label('저장소 선택',exact=True).select_option('browser');d.locator('[data-storage-action=save]').click();d.locator('[data-storage-action=apply]').click();expect(badge).to_contain_text('반영 완료');d.get_by_role('button',name='변경 이력·백업 열기',exact=True).click();expect(d).to_contain_text('이 브라우저·계정');d.get_by_role('button',name='현재 작업 지금 백업',exact=True).click();expect(d.locator('.studio-storage-backup')).to_have_count(2);d.get_by_role('button',name='내용 비교·복원',exact=True).first.click();expect(d.locator('[data-storage-action=apply]')).to_contain_text('백업 후 이 복구본 사용');d.get_by_role('button',name='저장소 닫기',exact=True).click()
   # An actual IndexedDB revision conflict must display failure, never success.
   if app!='projects':
    fr.evaluate("""async()=>{try{await PagesStorage.handle('save',{id:'browser',workspace:await (typeof captureWorkspace==='function'?captureWorkspace():PortalWorkspaceAdapter.capture()),revision:'stale-fixture-revision'})}catch{}}""")
    expect(badge).to_contain_text('저장 실패')
   page.set_viewport_size({'width':390,'height':900});box=badge.bounding_box();assert box['x']>=0 and box['x']+box['width']<=391,box;page.screenshot(path='work/feedback-'+app+'-mobile.png');assert not errors,errors;print('PASS '+app+': destination status, backup review, app usability and failure feedback',flush=True);c.close()
  browser.close()
if __name__=='__main__':
 server=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=server.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(server.server_port))
 finally:server.shutdown()
