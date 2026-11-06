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
const commentBase=workspace(),commentMine=workspace(),commentDisk=workspace();
commentMine.documents[0].pageComments=[{id:'c',date:'2026-11-04T00:00:00Z',text:'Review'}];commentDisk.documents[0].content='edited elsewhere';
const commentMerge=merge(commentBase,commentMine,commentDisk);assert.equal(commentMerge.conflicts.length,0);assert.equal(commentMerge.workspace.documents[0].pageComments[0].text,'Review');assert.equal(commentMerge.workspace.documents[0].content,'edited elsewhere');validate(commentMerge.workspace);
for(const pageComments of ['invalid',[{id:'c',date:'now',text:''}],[{id:'c',date:'now',text:'x'.repeat(5001)}]]){const item=workspace();item.documents[0].pageComments=pageComments;assert.throws(()=>validate(item));}
console.log('PASS page comment validation, workspace preservation and merge with independent content edits');

// A settings-only change on another device must not be ignored by workspace reconciliation.
{
 const base={format:'md-editor-workspace',version:1,activeId:'view',folders:[],documents:[{id:'view',title:'보기 설정',content:'원본',createdAt:'2026-11-06',updatedAt:'2026-11-06',editorOptions:{directEdit:true,syncScroll:true,syncScrollBoth:false}}]};
 const local=structuredClone(base),remote=structuredClone(base);remote.documents[0].editorOptions.directEdit=false;
 const result=merge(base,local,remote);assert.equal(result.conflicts.length,0);assert.equal(result.workspace.documents[0].editorOptions.directEdit,false);
 local.documents[0].editorOptions.syncScroll=false;const conflict=merge(base,local,remote);assert.equal(conflict.conflicts.length,1);
 console.log('PASS document editor settings participate in remote reconciliation and conflict detection');
}
