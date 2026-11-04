/* What If deletion safeguards — standalone Node regression.
   Run: node tests/branch-delete-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const content=fs.readFileSync(path.join(__dirname,'../gridiron-saves.js'),'utf8');
const store=new Map();
const localStorage={
 getItem:k=>store.get(k)??null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k)
};
const state=(team,year=2026)=>({team,year,week:1,players:[{
 id:team+1,name:'Player '+team,team,pos:'QB',rating:80,years:3,salary:5
 }],news:[],results:[],cash:100});
const root={window:null,localStorage,Gridiron:{register(){}},
 TEAMS:Array.from({length:32},(_,i)=>['T'+i,'Club '+i,'Union North'])};
root.window=root;
vm.createContext(root);
new vm.Script(content,{filename:'gridiron-saves.js'}).runInContext(root);
const S=root.GMSaveManager;
const parent=S.create(state(0),'Original Dynasty');
const other=S.create(state(3),'Rival Dynasty');
S.activate(parent.id);
const branch=S.branch(state(0),'What If: Different Draft');
const newer=S.create(state(4),'Newest Dynasty');
S.activate(branch.id);
assert.equal(S.index()[0].id,newer.id,'Test must have a newer unrelated save');
assert.equal(S.activeId(),branch.id);
assert.equal(S.remove(branch.id),true);
assert.equal(S.activeId(),parent.id,
 'Deleting an alternate timeline must restore its parent, not an unrelated recent save');
assert.equal(S.restore().team,0);
assert.equal(S.index().length,3);
assert.equal(S.index().some(e=>e.id===branch.id),false);

// If the parent is corrupt, restore the next valid franchise without deleting
// the damaged parent record; existing healthy slots should remain accessible.
S.activate(parent.id);
const secondBranch=S.branch(state(0),'What If: New Offensive Scheme');
store.set('gridiron-gm-slot-v3:'+parent.id,'{corrupted');
S.activate(secondBranch.id);
assert.equal(S.remove(secondBranch.id),true);
assert.notEqual(S.activeId(),parent.id,'Corrupted parent cannot be activated');
assert.ok([newer.id,other.id].includes(S.activeId()));
assert.equal(S.index().some(e=>e.id===parent.id),true,
 'Corrupt parent metadata must be retained for later recovery');

// Deleting the last valid active slot should never reload corrupt data.
for(const entry of S.index().slice()){
 if(entry.id!==S.activeId())S.remove(entry.id);
}
const finalId=S.activeId();
assert.equal(S.remove(finalId),true);
assert.equal(S.index().length,0);
assert.equal(S.activeId(),null);
assert.equal(store.get('gridiron-gm-save'),undefined);
console.log('PASS: parent-preferred What If deletion, corrupt-parent fallback, empty vault cleanup');