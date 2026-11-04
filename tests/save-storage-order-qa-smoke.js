/* Canonical save vs compatibility mirror atomicity.
   Run: node tests/save-storage-order-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Missing main script');
const start=script.indexOf('function save(){'),end=script.indexOf('function roster(',start);
assert.ok(start>=0&&end>start);
const source=script.slice(start,end)+'\n;save';
const state={year:2027,week:8,team:0,players:[{id:4,team:0,name:'Test QB'}]};
function scenario({snapshotFails=false,mirrorFails=false}={}){
 const store=new Map([['gridiron-gm-save','old saved franchise']]);
 let canonical=null,events=0;
 const window={
  GMSaveManager:{snapshot:s=>{
    if(snapshotFails)throw Error('QuotaExceededError: canonical slot');
    canonical=JSON.stringify(s);
  }},
  Gridiron:{emit:()=>events++}
 };
 const localStorage={setItem:(key,value)=>{
   if(key==='gridiron-gm-save'&&mirrorFails)throw Error('QuotaExceededError: mirror');
   store.set(key,String(value));
 }};
 const save=vm.runInNewContext(source,{state,window,localStorage});
 return {save,store,getCanonical:()=>canonical,getEvents:()=>events};
}
const failedSlot=scenario({snapshotFails:true});
assert.throws(()=>failedSlot.save(),/QuotaExceededError/);
assert.equal(failedSlot.store.get('gridiron-gm-save'),'old saved franchise');
assert.equal(failedSlot.getCanonical(),null,
 'Canonical slot failed, so the legacy mirror must remain unchanged');
const failedMirror=scenario({mirrorFails:true});
assert.throws(()=>failedMirror.save(),/QuotaExceededError/);
assert.equal(failedMirror.getCanonical(),JSON.stringify(state),
 'The up-to-date canonical slot should survive a failed compatibility mirror write');
const passed=scenario();
passed.save();
assert.equal(passed.store.get('gridiron-gm-save'),JSON.stringify(state));
assert.equal(passed.getEvents(),1);
console.log('PASS: canonical slot written before mirror, quota failures do not overwrite the only valid save');