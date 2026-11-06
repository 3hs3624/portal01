'use strict';
// Test entry point only; excluded from packaged files. No real accounts or data.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
require('../src/main.cjs');
const timeout=setTimeout(()=>{console.error('Desktop smoke timeout');app.exit(1);},45000);
app.whenReady().then(async()=>{
 try{
  const win=BrowserWindow.getAllWindows()[0];
  if(!win)throw new Error('Application window was not created');
  const wc=win.webContents;
  if(wc.isLoading())await new Promise((resolve,reject)=>{wc.once('did-finish-load',resolve);wc.once('did-fail-load',(_e,code,text)=>reject(Error(code+': '+text)));});
  const result=await wc.executeJavaScript(`(async()=>{
    const delay=()=>new Promise(r=>setTimeout(r,100));
    for(let i=0;i<150 && document.querySelector('#login-panel').hidden;i++)await delay();
    const paths=['/portal01/modules.json','/portal01/apps/markdown/','/portal01/apps/projects/','/portal01/apps/insight/'];
    const responses=await Promise.all(paths.map(async p=>{const r=await fetch(p);return {path:p,status:r.status,size:(await r.text()).length}}));
    const missing=await fetch('/portal01/does-not-exist');
    const prefs=await (async()=>{localStorage.setItem('desktop-smoke','ok');const stored=localStorage.getItem('desktop-smoke');localStorage.removeItem('desktop-smoke');return stored})();
    return {url:location.href,origin:location.origin,login:!document.querySelector('#login-panel').hidden,authenticated:window.__portalAuthenticated===true,responses,missing:missing.status,storage:prefs,node:typeof require};
  })()`);
  const preferences=wc.getLastWebPreferences();
  if(!result.login||result.authenticated||result.node!=='undefined'||result.storage!=='ok'||result.missing!==404||result.responses.some(r=>r.status!==200||r.size<20))throw Error(JSON.stringify(result));
  if(!preferences.sandbox||!preferences.contextIsolation||preferences.nodeIntegration||!preferences.webSecurity)throw Error('Unsafe renderer configuration');
  const report={...result,platform:process.platform,arch:process.arch,electron:process.versions.electron,sandbox:preferences.sandbox,scope:'Login shell, local assets and storage only; authenticated editing and native file workflows require further validation.'};
  const output=path.resolve(__dirname,'../smoke-report.json');await fs.writeFile(output,JSON.stringify(report,null,2));
  console.log('PASS desktop protocol, login guard, app assets, storage and renderer isolation');clearTimeout(timeout);app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);app.exit(1);}
}).catch(error=>{console.error(error);clearTimeout(timeout);app.exit(1);});
