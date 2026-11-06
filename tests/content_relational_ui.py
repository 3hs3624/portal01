"""Actual document/BI UI through relational transport with JSONB-style key ordering."""
from threading import Thread
from http.server import ThreadingHTTPServer
from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for app in ['markdown','insight']:
   c=b.new_context(accept_downloads=True,viewport={'width':1450,'height':1050});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   host='''<meta charset=utf-8><script src="/portal01/content-cloud.js"></script><script>window.__portalAuthenticated=true;window.PortalUserId='content-ui';window.cloud={};const canonical=w=>JSON.parse(JSON.stringify(w,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x));const client={auth:{getUser:async()=>({data:{user:{id:'content-ui'}}})},rpc:async(name,a)=>{const old=cloud[a.p_app];if(name==='portal_content_workspace_save'){if((old?.revision??null)!==a.p_expected)return {error:{code:'PT409'}};cloud[a.p_app]={hasWorkspace:true,revision:crypto.randomUUID(),savedAt:new Date().toISOString(),workspace:canonical(a.p_workspace),backend:'relational'};return {data:{hasWorkspace:true,revision:cloud[a.p_app].revision,savedAt:cloud[a.p_app].savedAt}}}if(name==='portal_content_workspace_info')return {data:old?{hasWorkspace:true,revision:old.revision,savedAt:old.savedAt,backend:'relational'}:{hasWorkspace:false,revision:null,backend:'relational'}};return {data:old?structuredClone(old):{hasWorkspace:false,revision:null,backend:'relational'}}}};window.PortalCloudAPI=PortalContentCloud.create(client,()=>__portalAuthenticated);</script><iframe src="/portal01/apps/APP/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'''.replace('APP',app)
   c.route('**/content-relational-host',lambda r:r.fulfill(content_type='text/html',body=host));page.goto(base+'/content-relational-host');f=page.frame_locator('iframe');f.locator('#portal-app-tools').wait_for();fr=page.frames[1]
   if app=='markdown':
    f.locator('.block-editor-content').wait_for();fr.wait_for_function('()=>!APP.loading&&ST.ready');f.locator('#docTitle').fill('관계형 문서');fr.evaluate("setView('edit')");f.locator('#editor').fill('# 원본 본문\n\n문서 블록을 보존합니다.');fr.wait_for_function('()=>!ST.dirty&&!ST.saving')
    fr.evaluate("()=>{currentDoc().tags=['업무'];currentDoc().pageComments=[{id:'comment',text:'보존할 댓글',date:'2026-11-06',author:'검증'}];APP.generation++}")
   else:
    fr.wait_for_function('()=>storageState.ready');fr.evaluate("()=>{registerConnectedData('관계형 데이터',{Sheet1:{columns:['항목','값'],rows:[['A',1],['B',null]]}},'relational-source')}");fr.wait_for_function('()=>!storageState.dirty')
   f.locator('#portal-cloud-open').click();d=f.locator('.studio-storage-dialog');status=d.locator('.portal-cloud-status');d.get_by_label('저장소 선택',exact=True).select_option('supabase');expect(status).to_contain_text('처음 저장');action=lambda x:d.locator('[data-storage-action='+x+']');action('save').click();action('apply').click();expect(status).to_contain_text('저장 완료');action('save').click();action('apply').click();expect(status).to_contain_text('저장 완료')
   # Local edits are separate; explicit load restores the reviewed cloud snapshot.
   d.get_by_role('button',name='저장소 닫기').click()
   if app=='markdown':f.locator('#docTitle').fill('로컬에서 수정');fr.wait_for_function('()=>!ST.dirty&&!ST.saving')
   else:fr.evaluate("()=>{connectedData.find(r=>r.name==='관계형 데이터').sheets.Sheet1.rows.push(['C',3]);storageChanged()}");fr.wait_for_function('()=>!storageState.dirty')
   f.locator('#portal-cloud-open').click();expect(status).to_contain_text('비교 후');action('load').click();action('apply').click();expect(status).to_contain_text('불러오기 완료')
   if app=='markdown':assert fr.evaluate('currentDoc().title')=='관계형 문서';assert fr.evaluate('currentDoc().pageComments[0].text')=='보존할 댓글';assert fr.evaluate('currentDoc().tags')==['업무']
   else:assert fr.evaluate("connectedData.find(r=>r.name==='관계형 데이터').sheets.Sheet1.rows.length")==2
   d.get_by_role('button',name='백업·복구 목록',exact=True).click()
   with page.expect_download() as e:d.get_by_role('button',name='현재 작업 JSON 내려받기',exact=True).click()
   downloaded=json.loads(Path(e.value.path()).read_text());assert downloaded['format']==('md-editor-workspace' if app=='markdown' else 'insight-bi-workspace');assert d.locator('.studio-storage-backup').count()>=2;assert not errors,errors;print('PASS',app,'native edits → relational transport → repeat save without false JSONB conflicts → cloud restore → original JSON backup',flush=True);c.close()
  b.close()
if __name__=='__main__':
 server=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=server.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(server.server_port))
 finally:server.shutdown()
