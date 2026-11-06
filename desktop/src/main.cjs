'use strict';
const { app, BrowserWindow, protocol, net, dialog } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ORIGIN, appURL, assetPath } = require('./policy.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'portal01',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
// A separate profile keeps this prototype independent from production/browser data.
app.setPath('userData', path.join(app.getPath('appData'), 'Portal01-Preview'));
const root = app.isPackaged ? path.join(process.resourcesPath,'web') : path.resolve(__dirname,'..','staged-web');
const windows = new Set();
function createWindow(url = ORIGIN + '/portal01/') {
  const win = new BrowserWindow({width:1440,height:960,minWidth:900,minHeight:600,show:false,
    title:'Portal01 Preview',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  windows.add(win); win.on('closed',()=>windows.delete(win));
  win.once('ready-to-show',()=>win.show());

  win.webContents.on('will-frame-navigate',(event,details)=>{
    if(details?.isMainFrame && !appURL(details.url))event.preventDefault();
  });
  // Keep the authenticated parent/opener chain for the Insight detail prototype.
  win.webContents.setWindowOpenHandler(({url})=>{
    if(!appURL(url))return {action:'deny'};
    const pathname=new URL(url).pathname;
    if(pathname!=='/portal01/apps/insight/data-detail.html')return {action:'deny'};
    return {action:'allow',overrideBrowserWindowOptions:{width:1200,height:850,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}}};
  });
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.loadURL(url);
  return win;
}
app.on('web-contents-created',(_event,contents)=>{
  contents.on('will-navigate',(event,target)=>{if(!appURL(target))event.preventDefault();});
  contents.on('will-attach-webview',event=>event.preventDefault());
});
app.whenReady().then(async()=>{
  protocol.handle('portal01', async request=>{
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
    try { return await net.fetch(pathToFileURL(await assetPath(root,request.url)).href); }
    catch { return new Response('Not found',{status:404}); }
  });
  createWindow();
  app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
}).catch(error=>{dialog.showErrorBox('Portal01 Preview',error.message);app.quit();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
