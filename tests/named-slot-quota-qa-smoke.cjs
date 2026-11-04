/* Regression: older named saves must not keep a duplicate multi-MiB legacy mirror.
 * Run: node tests/named-slot-quota-qa-smoke.cjs */
'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../gridiron-saves.js'),'utf8');
const state={year:2026,week:3,team:0,
 players:Array.from({length:80},(_,i)=>({id:i,team:i%2,name:'Player '+i,
   attributes:{agility:70,strength:70},careerStats:{yards:2000+i},
   contractAdvanced:{baseSalaries:[2,3,4]}}))};
const index=[{id:'primary',name:'Original',year:2026,week:3,team:0,lastPlayed:'2026'}];
const raw=JSON.stringify(state),store=new Map([
 ['gridiron-gm-save-index-v3',JSON.stringify(index)],
 ['gridiron-gm-current-slot-v3','primary'],
 ['gridiron-gm-slot-v3:primary',raw],
 ['gridiron-gm-save',raw]
]);
const single=[...store.entries()].filter(([k])=>k!=='gridiron-gm-save')
 .reduce((n,[k,v])=>n+k.length+v.length,0);
const quota=Math.floor(single+raw.length/2);
assert([...store.entries()].reduce((n,[k,v])=>n+k.length+v.length,0)>quota);
const storage={
 getItem:k=>store.get(k)??null,
 removeItem:k=>store.delete(k),
 setItem:(k,v)=>{
   v=String(v);
   const size=[...store.entries()].filter(([key])=>key!==k)
     .reduce((n,[key,val])=>n+key.length+val.length,0)+k.length+v.length;
   if(size>quota)throw Object.assign(new Error('QuotaExceededError'),{name:'QuotaExceededError'});
   store.set(k,v);
 }
};
const root={localStorage:storage,console,window:null,Gridiron:{register:()=>{}}};
root.window=root;
vm.createContext(root);
new vm.Script(code,{filename:'gridiron-saves.js'}).runInContext(root);
const manager=root.GMSaveManager;
assert.ok(manager.restore(),'Canonical named slot should restore');
assert.equal(store.has('gridiron-gm-save'),false,'Old mirror must be released after valid restore');
state.week=4;
manager.snapshot(state);
manager.writeMirror(state);
assert.equal(store.has('gridiron-gm-save'),false,'Modern saves must not recreate a duplicate mirror');
assert.equal(JSON.parse(store.get('gridiron-gm-slot-v3:primary')).week,4);
const preserved=manager.restore();
assert.equal(preserved.week,4);
console.log('PASS: legacy duplicate removed, low-quota canonical save survives button actions');
