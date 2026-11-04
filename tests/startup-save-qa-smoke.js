/* Test early startup picks canonical slot before old mirror.
   Run: node tests/startup-save-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const start=script?.indexOf('function readStartupSave('),end=script?.indexOf("let page='Dashboard'",start);
assert.ok(start>=0&&end>start,'Missing explicit earliest startup recovery');
const startup=script.slice(start,end);
const teams=Array.from({length:32},(_,i)=>['T'+i,'Team '+i,'Union North']);
const state=(team,year)=>({year,week:4,team,
 players:[{id:team,team,name:'QB '+team,pos:'QB',rating:80}],
 cash:90,results:[]});
const fresh=()=>state(0,2026);
const storage=new Map();
const get=()=>vm.runInNewContext(startup+';state',{
 TEAMS:teams,localStorage:{getItem:key=>storage.get(key)??null},fresh
});
storage.set('gridiron-gm-save',JSON.stringify(state(2,2027)));
storage.set('gridiron-gm-current-slot-v3','named-branch');
storage.set('gridiron-gm-slot-v3:named-branch',JSON.stringify(state(17,2031)));
assert.equal(get().team,17,'Canonical v3 should beat an older mirror');
assert.equal(get().year,2031);
storage.set('gridiron-gm-slot-v3:named-branch','{invalid JSON');
assert.equal(get().team,2,'Corrupt named slot should fall back to valid mirror');
storage.set('gridiron-gm-save',JSON.stringify({year:2020,players:[]}));
assert.equal(get().team,0,'Invalid mirror should fall back to new franchise defaults');
storage.clear();
assert.equal(get().year,2026);
console.log('PASS: canonical named slot preferred before external scripts, corrupt state falls back safely, fresh install works');