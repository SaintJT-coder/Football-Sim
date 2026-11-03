/* Run: node tests/coaching-staff-priority2-smoke.js
   Tests the production coaching-staff.js without npm dependencies. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const state={
 year:2026,week:3,team:0,cash:120,
 news:[],players:Array.from({length:32},(_,i)=>({
   id:i+1,name:'Test QB '+i,team:i,pos:'QB',age:24,rating:80,morale:65,
   development:{archetype:'Field General'}
 })),
 ownerFranchise:{
   jobSecurity:70,fanHappiness:65,mediaHeat:25,
   goals:[{id:'WINS',target:11}]
 },
 coachingPhilosophy:{headCoach:'Developmental'}
};
const world={
 console,Math,state,
 TEAMS:Array.from({length:32},(_,i)=>['T'+i,'Team '+i,'Union North']),
 GMOwner:{init:s=>s.ownerFranchise},
 GMCoaching:{init:s=>s.coachingPhilosophy},
 Gridiron:{register:()=>{}},
 alert:message=>{throw Error(message)},
 save:()=>{},render:()=>{}
};
world.window=world;
const context=vm.createContext(world);
new vm.Script(fs.readFileSync(path.resolve(__dirname,'../coaching-staff.js'),'utf8'),
 {filename:'coaching-staff.js'}).runInContext(context,{timeout:3000});
const api=world.GMStaff,staff=api.init(state);
assert.equal(Object.keys(staff.teams).length,32);
for(const role of ['offense','defense','special','strength'])
 assert.ok(staff.teams[0][role]&&Number.isFinite(api.overall(staff.teams[0][role])));
assert.equal(api.init(state),staff,'Initialization must not overwrite existing coaches');

const conflict=api.evaluateConflict(state);
assert.equal(conflict.status,'UNRESOLVED');
assert.match(conflict.reason,/immediate wins/i);
const oldJob=state.ownerFranchise.jobSecurity;
const oldMorale=state.players[0].morale;
assert.ok(api.resolveConflict(state,'compromise').ok);
assert.equal(state.ownerFranchise.jobSecurity,oldJob+1);
assert.equal(state.players[0].morale,oldMorale+1);
assert.equal(api.resolveConflict(state,'owner').ok,false,'Conflict cannot be resolved twice');

const oc=staff.teams[0].offense;
for(const skill of Object.keys(oc.ratings))oc.ratings[skill]=95;
oc.overall=api.overall(oc);
const preGame=api.gameModifier(state,0,'offense');
const preXP=api.developmentMultiplier(state.players[0],state);
const ret=api.retain(state,'defense');
assert.ok(ret.ok);
assert.equal(api.retain(state,'defense').ok,false,'Cannot charge retention twice');
assert.ok(state.cash<120);
const poached=api.seasonEnd(state,()=>0);
assert.ok(poached.some(m=>m.from===0&&m.role==='offense'));
assert.equal(poached.some(m=>m.from===0&&m.role==='defense'),false);
assert.equal(poached.length<=api.CONFIG.poaching.maxMovesPerSeason,true);
assert.equal(api.seasonEnd(state,()=>0).length,0,'Season must process once');

state.year=2027;
assert.ok(api.isDisrupted(state,0,'offense'));
assert.ok(api.gameModifier(state,0,'offense')<preGame);
assert.ok(api.developmentMultiplier(state.players[0],state)<preXP);
const candidates=api.candidates(state,'special');
assert.equal(candidates.length,api.CONFIG.hiring.candidatesPerRole);
assert.ok(api.hire(state,'special',1).ok);
assert.match(api.page(state),/COACHING STAFF/);

state.year=2028;
assert.equal(api.isDisrupted(state,0,'offense'),false,'Disruption ends after one season');
console.log('PASS: Four coaching roles, conflict, retention, growth, poaching, one-year penalties, hiring and UI');
