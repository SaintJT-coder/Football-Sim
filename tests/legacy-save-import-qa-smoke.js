/* Regression: non-destructive import of old three-slot franchises.
   Run: node tests/legacy-save-import-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../gridiron-saves.js'),'utf8');
const storage=new Map();
const localStorage={
 getItem:k=>storage.get(k)??null,
 setItem:(k,v)=>storage.set(k,String(v)),
 removeItem:k=>storage.delete(k)
};
const state=(team,year)=>({
 team,year,week:3,players:[{id:team+1,team,name:'Quarterback '+team,pos:'QB',
  rating:81,salary:10,age:27,years:2}],news:[],results:[],cash:100,cap:350
});
const legacy=[{data:state(0,2026),updatedAt:123},{data:state(5,2027),updatedAt:456},null];
storage.set('gridiron-gm-slots-v2',JSON.stringify(legacy));
const root={window:null,TEAMS:Array.from({length:32},(_,i)=>['T'+i,'Team '+i,'Union North']),
 GridIron:{},Gridiron:{register(){}},localStorage,
 state:state(0,2026),render:()=>{},alert:()=>{},confirm:()=>true};
root.window=root;vm.createContext(root);
new vm.Script(source,{filename:'gridiron-saves.js'}).runInContext(root);
const M=root.GMSaveManager;
assert.equal(M.legacyPending().length,2);
assert.match(M.page(root.state),/IMPORT OLD SAVES/);
assert.equal(M.index().length,0);
const imported=M.importLegacySlots();
assert.equal(imported.length,2);
assert.equal(M.index().length,2);
assert.equal(M.legacyPending().length,0);
assert.equal(M.importLegacySlots().length,0,'Imported slots duplicated');
assert.deepEqual(JSON.parse(storage.get('gridiron-gm-slots-v2')),legacy,
 'Old v2 saves must remain untouched');
const original=M.index().find(e=>e.id==='legacy-v2-1');
const second=M.index().find(e=>e.id==='legacy-v2-2');
assert.ok(original&&second);
assert.equal(original.year,2026);
assert.equal(second.team,5);
const active=M.activate(second.id);
assert.equal(active.year,2027);
assert.equal(storage.get('gridiron-gm-save'),undefined,'Activated named save should not create duplicate mirror');
assert.equal(JSON.parse(storage.get('gridiron-gm-slot-v3:'+second.id)).team,5);
M.remove(original.id);
assert.equal(M.legacyPending().length,0,
 'Deleted imported slots must not be recreated from old source');
assert.equal(M.index().length,1);
assert.doesNotMatch(M.page(root.state),/IMPORT OLD SAVES/);
console.log('PASS: legacy v2 slots import as named v3 saves, originals stay intact, duplicates and unwanted resurrection prevented');