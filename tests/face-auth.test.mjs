import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyFace, executeFace, loadFace, saveFace, missingFace, faceConsequences, FACE_KEY } from '../src/explore/faceAuth.ts';
const ready = () => ({ ...emptyFace(), scan: true, preview: true, front: true, specs: true, slots: [true,true] });
test('standard and exception have separate evidence requirements', () => {
 assert.equal(executeFace({...emptyFace(),scan:true,preview:true},'standard',false,false).status,'success');
 assert.equal(executeFace({...emptyFace(),scan:true,preview:true},'exception',false,false).status,'missing');
 assert.equal(executeFace(ready(),'exception',false,false).state.method,'exception');
 assert.equal(missingFace(emptyFace(),'standard').length,2);
});
test('expiration requires explicit reconsent and never clears evidence', () => {
 const state=ready(); const result=executeFace(state,'exception',true,false);
 assert.equal(result.status,'expired'); assert.deepEqual(result.state,state);
 assert.equal(executeFace(state,'exception',true,false,true).status,'success');
 assert.equal(executeFace(state,'exception',true,true).status,'success');
});
test('progress persists independently from the activity ledger and exposes future differences', () => {
 const values=new Map(); globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const result=executeFace(ready(),'standard',true,true); saveFace(result.state);
 assert.equal(loadFace().method,'standard'); assert.equal(values.size,1); assert.ok(values.has(FACE_KEY));
 assert.equal(faceConsequences(loadFace()).expressionConstrained,true);
 assert.equal(executeFace(result.state,'exception',false,false).status,'complete');
});
test('legacy completed saves are preserved without claiming a new authentication method', () => {
 globalThis.localStorage={getItem:k=>k==='sanlee-visited'?'["about","works","writing"]':null};
 assert.equal(loadFace().legacy,true); assert.equal(loadFace().method,null);
});
test('activity execution refuses an expired protected submission without writing an entry', async () => {
 const { createCitizenRecords } = await import('../src/explore/citizenRecords.ts');
 const values=new Map();
 const ledger=createCitizenRecords({storage:()=>({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}),isProtected:()=>false,now:()=>8000});
 assert.equal(ledger.recordCitizenActivity({kind:'face.authenticate',sourceId:'standard'},{zone:'bunker',requireProtection:true}).status,'protection-expired');
 assert.equal(values.size,0);
 assert.equal(ledger.recordCitizenActivity({kind:'face.authenticate',sourceId:'standard'},{zone:'bunker'}).status,'recorded');
});
