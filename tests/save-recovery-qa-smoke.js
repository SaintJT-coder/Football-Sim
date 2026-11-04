/* Save recovery and startup QA: no dependencies.
   Run: node tests/save-recovery-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const TEAMS=Array.from({length:32},(_,i)=>['T'+i,'Test Team '+i,
   (i<16?'Union':'Liberty')+' North']);
const makeState=(team=0,year=2026)=>({
 year,week:1,team,players:TEAMS.map((_,i)=>({
  id:i+1,name:'Player '+i,team:i,pos:'QB',age:25,rating:80,
  years:3,salary:5,injury:0,stats:{yards:0,td:0,tackles:0,sacks:0}
 })),results:[],news:[],awards:[],champions:[],retired:[],
 cash:100,cap:350,upgrades:{},draftDone:true,scoutNotes:{}
});
function makeRuntime(storage,state){
 const nodes={};
 const handlers={};
 const document={
  readyState:'loading',documentElement:{style:{setProperty:()=>{}}},
  createElement:tag=>({tagName:tag,innerHTML:'',textContent:'',style:{},
    setAttribute:()=>{},remove:()=>{},scrollTop:0}),
  getElementById:id=>nodes[id]||null,
  head:{append:el=>{if(el.id)nodes[el.id]=el}},
  body:{classList:{toggle:()=>{}},append:el=>{if(el.id)nodes[el.id]=el}},
  addEventListener:(type,fn)=>{handlers[type]=fn}
 };
 const scope={
  TEAMS,document,state,window:null,console,Math,JSON,
  localStorage:{
   getItem:k=>storage.get(k)??null,
   setItem:(k,v)=>storage.set(k,String(v)),
   removeItem:k=>storage.delete(k)
  },
  generate:()=>makeState().players,
  fresh:()=>makeState(),save:()=>{},render:()=>{},
  $:id=>nodes[id]||null,page:'Dashboard',
  alert:msg=>{throw Error('ALERT '+msg)},confirm:()=>true,
  setInterval:()=>null,clearInterval:()=>{},
  location:{reload:()=>{throw Error('Unexpected page reload')}}
 };
 scope.window=scope;
 vm.createContext(scope);
 for(const module of ['gridiron-saves.js','menu.js'])
   new vm.Script(fs.readFileSync(path.join(root,module),'utf8'),
     {filename:module}).runInContext(scope,{timeout:3000});
 handlers.DOMContentLoaded();
 return {scope,nodes,handlers,manager:scope.GMSaveManager};
}
const storage=new Map();
const first=makeRuntime(storage,makeState());
assert.equal(first.manager.index().length,0,'Fresh boot created a phantom save');
assert.equal(storage.get('gridiron-gm-save'),undefined,'Fresh boot wrote an unwanted mirror');
first.handlers.click({target:{closest:()=>({dataset:{action:'main'}})}});
assert.doesNotMatch(first.nodes['gm-menu'].innerHTML,/CONTINUE FRANCHISE/);
first.handlers.click({target:{closest:()=>({dataset:{action:'load'}})}});
assert.equal(first.manager.index().length,0,'Opening Load Game created a phantom save');

first.scope.openGridironMenu();
first.handlers.click({target:{closest:()=>({dataset:{action:'new'}})}});
first.nodes['gm-franchise-name']={value:'West Coast Dynasty'};
first.handlers.click({target:{closest:()=>({dataset:{action:'start'}})}});
assert.equal(first.manager.index().length,1);
assert.equal(first.manager.index()[0].name,'West Coast Dynasty');
const firstId=first.manager.activeId();
assert.ok(firstId);
assert.equal(storage.get('gridiron-gm-save'),undefined,'Named franchise must not store a duplicate mirror');

const alternate=makeState(7,2029);
const entry=first.manager.create(alternate,'Second Dynasty');
assert.notEqual(entry.id,firstId);
assert.equal(first.manager.index().length,2);
// Deliberately seed a stale legacy mirror to verify named saves still win.
storage.set('gridiron-gm-save',JSON.stringify(makeState(0,2026)));

// A cold reload must load the selected named slot, not the stale mirror.
const second=makeRuntime(storage,JSON.parse(storage.get('gridiron-gm-save')));
assert.equal(second.scope.state.team,7);
assert.equal(second.scope.state.year,2029);
assert.equal(second.manager.activeId(),entry.id);
assert.equal(second.manager.restore().team,7);
second.handlers.click({target:{closest:()=>({dataset:{action:'main'}})}});
assert.match(second.nodes['gm-menu'].innerHTML,/CONTINUE FRANCHISE/);

// Corrupt active slot: recover a different valid named slot without deleting data.
storage.set('gridiron-gm-slot-v3:'+entry.id,'{"broken":true}');
// Restore may have cleaned the old compatibility copy; seed the legacy fallback again.
storage.set('gridiron-gm-save',JSON.stringify(makeState(0,2026)));
const third=makeRuntime(storage,JSON.parse(storage.get('gridiron-gm-save')));
assert.equal(third.manager.activeId(),firstId);
assert.equal(third.scope.state.team,0);
assert.equal(third.manager.index().length,2,'Recovery deleted user metadata');
assert.ok(storage.get('gridiron-gm-slot-v3:'+entry.id),
  'Recovery destroyed the original damaged slot');

console.log('PASS: fresh install has no phantom saves, named game creation, stale mirror recovery, corrupt-current fallback, and Continue availability');