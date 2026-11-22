'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const release=path.resolve(__dirname,'../release');
const directories=fs.readdirSync(release,{withFileTypes:true}).filter(e=>e.isDirectory()&&(/unpacked$/.test(e.name)||/^mac(?:-|$)/.test(e.name))).map(e=>e.name);
if(!directories.length)throw Error('No unpacked application');
execFileSync('tar',['-czf',path.join(release,'preview.tgz'),'-C',release,...directories],{stdio:'inherit'});
