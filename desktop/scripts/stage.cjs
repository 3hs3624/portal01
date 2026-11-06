'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const source = path.resolve(__dirname,'../..');
const destination = path.resolve(__dirname,'../staged-web');
async function main(){
  await fs.rm(destination,{recursive:true,force:true});
  await fs.mkdir(destination,{recursive:true});
  // Only public runtime files; never copy work/, credentials, SQL, tests or Git metadata.
  const names = await fs.readdir(source,{withFileTypes:true});
  for(const entry of names){
    if(entry.isFile() && /\.(?:html|css|js|json)$/.test(entry.name))await fs.copyFile(path.join(source,entry.name),path.join(destination,entry.name));
  }
  await fs.cp(path.join(source,'apps'),path.join(destination,'apps'),{recursive:true,filter:async name=>!(await fs.lstat(name)).isSymbolicLink()});
  console.log('Staged public portal assets:',destination);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
