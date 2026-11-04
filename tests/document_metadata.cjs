'use strict';
const assert=require('node:assert/strict');
const {merge}=require('../apps/markdown/workspace-merge.js');
const {validate}=require('../apps/markdown/editor-core.js');
const doc={id:'a',title:'A',content:'body',createdAt:'2026-01-01',updatedAt:'2026-01-02'};
const workspace=()=>({format:'md-editor-workspace',version:1,documents:[structuredClone(doc)],folders:[],activeId:'a'});
const base=workspace(),mine=workspace(),disk=workspace();mine.documents[0].tags=['doc'];disk.documents[0].content='external edit';
let result=merge(base,mine,disk);assert.equal(result.conflicts.length,0);assert.deepEqual(result.workspace.documents[0].tags,['doc']);assert.equal(result.workspace.documents[0].content,'external edit');validate(result.workspace);
disk.documents[0].tags=['remote'];result=merge(base,mine,disk);assert.equal(result.conflicts.length,1);assert.deepEqual(merge(base,mine,disk,{'documents:a':'mine'}).workspace.documents[0].tags,['doc']);assert.deepEqual(merge(base,mine,disk,{'documents:a':'disk'}).workspace.documents[0].tags,['remote']);assert.equal(merge(base,mine,disk,{'documents:a':'both'}).workspace.documents.length,2);
const empty=workspace();empty.documents[0].tags=[];assert.equal(merge(base,empty,workspace()).conflicts.length,0);
for(const tags of ['invalid',new Array(21).fill('tag'),['x'.repeat(41)],[''],[{}]]){const w=workspace();w.documents[0].tags=tags;assert.throws(()=>validate(w));}
const w=workspace();w.documents[0].tags=['doc','<script>'];assert.deepEqual(validate(JSON.parse(JSON.stringify(w))).documents[0].tags,w.documents[0].tags);
console.log('PASS metadata validation, legacy documents, workspace round-trip, independent tag/content merge and explicit tag conflict choices');
