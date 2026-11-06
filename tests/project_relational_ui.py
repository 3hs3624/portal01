"""Native project UI through the actual relational-cloud client with an isolated SDK transport."""
from threading import Thread
from http.server import ThreadingHTTPServer
from pathlib import Path
import json,base64
from playwright.sync_api import sync_playwright,expect
from write_studio_blocks import StudioHandler

def run(base):
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);c=b.new_context(accept_downloads=True,viewport={'width':1450,'height':1100});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  host='''<meta charset=utf-8><script src="/portal01/project-cloud.js"></script><script>
window.__portalAuthenticated=true;window.PortalUserId='relational-ui';window.assets=new Map();window.cloud=null;window.uploads=0;
const client={auth:{getUser:async()=>({data:{user:{id:'relational-ui'}}})},functions:{invoke:async()=>({data:{}})},storage:{from:()=>({upload:async(path,blob,options)=>{if(options.upsert)throw Error('mutable asset');uploads++;if(assets.has(path))return {error:{statusCode:'409'}};assets.set(path,new Uint8Array(await blob.arrayBuffer()));return {}},download:async path=>({data:new Blob([assets.get(path)])})})},rpc:async(name,args)=>{if(name==='portal_project_workspace_info')return {data:cloud?{hasWorkspace:true,revision:cloud.revision,backend:'relational',savedAt:cloud.savedAt}:{hasWorkspace:false,revision:null,backend:'relational'}};if(name==='portal_project_workspace_get')return {data:cloud?structuredClone(cloud):{hasWorkspace:false,revision:null,backend:'relational'}};if(name==='portal_project_workspace_save'){if((cloud?.revision??null)!==args.p_expected)return {error:{code:'PT409'}};cloud={hasWorkspace:true,revision:crypto.randomUUID(),savedAt:new Date().toISOString(),backend:'relational',workspace:structuredClone(args.p_workspace)};cloud.workspace.files.reverse();return {data:{hasWorkspace:true,revision:cloud.revision,savedAt:cloud.savedAt,backend:'relational'}}}throw Error(name)}};
const api=PortalProjectCloud.create(client,()=>__portalAuthenticated);window.PortalCloudAPI={info:app=>api.info(),load:app=>api.load(),save:(app,w,r)=>api.save(w,r)};
</script><iframe src="/portal01/apps/projects/" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>'''
  c.route('**/relational-host',lambda r:r.fulfill(content_type='text/html',body=host));page.goto(base+'/relational-host');f=page.frame_locator('iframe');f.locator('#portal-app-tools').wait_for();fr=page.frames[1];fr.evaluate('PortalWorkspaceAdapter.prepare()');f.locator('#btn-new').click();f.locator('#p-name').fill('관계형 저장 프로젝트');f.locator('#p-client').fill('검증');f.locator('#p-start').fill('2026-11-01');f.locator('#p-end').fill('2026-12-31')
  with c.expect_page() as e:f.locator('#pm-ok').click()
  pop=e.value;pop.on('pageerror',lambda e:errors.append(str(e)));pop.locator('#sample-chip').wait_for();pop.locator('#sample-chip').click();pop.locator('#sp-keep').click();pop.close();fr.wait_for_function("()=>{try{PortalWorkspaceAdapter.beforeApply('load');return true}catch{return false}}")
  fr.evaluate(r'''async()=>{const w=await PortalWorkspaceAdapter.capture(),file=w.files.find(f=>/^projects\/[^/]+\.json$/.test(f.path)&&!f.path.endsWith('.meta.json')),doc=PortalStorageModels.decode(file.data);doc.current.excelTemplate={data:'UEsDBAD/',layout:[{kind:'task',row:13}]};file.data=PortalStorageModels.encode(doc);w.files.push({path:'original.xlsx',data:'UEsDBAD/'});await PortalWorkspaceAdapter.restore(w)}''')
  initial=fr.evaluate('PortalWorkspaceAdapter.capture()');f.locator('#portal-cloud-open').click();d=f.locator('.studio-storage-dialog');status=d.locator('.portal-cloud-status');d.get_by_label('저장소 선택',exact=True).select_option('supabase');expect(status).to_contain_text('처음 저장');action=lambda x:d.locator('[data-storage-action='+x+']');action('save').click();action('apply').click();expect(status).to_contain_text('저장 완료');assert page.evaluate('cloud.workspace.format')=='portal-project-relational';assert page.evaluate('assets.size')==1
  # Different JSON serialization/order from the cloud must not produce false conflicts.
  action('save').click();action('apply').click();expect(status).to_contain_text('저장 완료');action('load').click();action('apply').click();expect(status).to_contain_text('불러오기 완료');restored=fr.evaluate('PortalWorkspaceAdapter.capture()');assert fr.evaluate('w=>PortalStorageModels.fingerprint(w)',initial)==fr.evaluate('w=>PortalStorageModels.fingerprint(w)',restored)
  assert next(x['data'] for x in restored['files'] if x['path']=='original.xlsx')=='UEsDBAD/'
  d.get_by_role('button',name='백업·복구 목록',exact=True).click()
  with page.expect_download() as e:d.get_by_role('button',name='현재 작업 JSON 내려받기',exact=True).click()
  downloaded=json.loads(Path(e.value.path()).read_text());assert downloaded['format']=='wbs-pm-cloud';assert any(x['data']=='UEsDBAD/' for x in downloaded['files'])
  d.get_by_role('button',name='저장소 닫기').click();assert not errors,errors;print('PASS native registration → relational cloud pack/private assets → repeat save → native restore/JSON backup, without false serialization conflicts',flush=True);b.close()
if __name__=='__main__':
 s=ThreadingHTTPServer(('127.0.0.1',0),StudioHandler);Thread(target=s.serve_forever,daemon=True).start()
 try:run('http://127.0.0.1:'+str(s.server_port))
 finally:s.shutdown()
