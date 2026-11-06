const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {appURL,assetPath}=require('../src/policy.cjs');
test('origin allowlist rejects remote, credentials and foreign hosts',()=>{
 assert.equal(appURL('portal01://workspace/portal01/'),true);
 for(const url of ['https://workspace/','file:///tmp/a','portal01://other/portal01/','portal01://user@workspace/portal01/'])assert.equal(appURL(url),false);
});
test('asset resolver serves nested routes and rejects escapes and symlinks',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'portal-assets-'));
 try{
  await fs.mkdir(path.join(root,'web/apps/markdown'),{recursive:true});
  await fs.writeFile(path.join(root,'web/apps/markdown/index.html'),'ok');
  await fs.writeFile(path.join(root,'secret'),'private');
  await fs.symlink(path.join(root,'secret'),path.join(root,'web/leak'));
  const web=path.join(root,'web');
  assert.equal(await assetPath(web,'portal01://workspace/portal01/apps/markdown/?v=1'),path.join(web,'apps/markdown/index.html'));
  for(const u of ['portal01://workspace/portal01/%2e%2e%2fsecret','portal01://workspace/portal01/leak','portal01://workspace/other','portal01://workspace/portal01/%5csecret','portal01://workspace/portal01/%00'])await assert.rejects(assetPath(web,u));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
