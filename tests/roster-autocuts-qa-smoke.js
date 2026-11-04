/* User-confirmed 53-man final cuts to practice squad, no releases.
   Run: node tests/roster-autocuts-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../roster-rules.js'),'utf8');
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
function roster(n=57){return Array.from({length:n},(_,i)=>({
 id:i+1,team:0,pos:POS[i%POS.length],name:'Athlete '+(i+1),
 age:21+i%8,rating:59+i%24,salary:3.5,rosterStatus:'ACTIVE',
 depthLocked:i===0,target:i===1,injury:0
}))}
const scope={window:null,TEAMS:Array.from({length:32},(_,i)=>['T'+i,'Team '+i,'Union North']),
 state:null,alert:()=>{},confirm:()=>true,save:()=>{},render:()=>{}};
scope.window=scope;vm.createContext(scope);new vm.Script(code).runInContext(scope);
const Rules=scope.GMRosterRules;
const state={team:0,year:2029,week:1,players:roster(),news:[]};
const originalContracts=Object.fromEntries(state.players.map(p=>[p.id,p.salary]));
assert.equal(Rules.count(state,0).ACTIVE,57);
assert.equal(Rules.validate(state,0).ok,false);
assert.match(Rules.page(state),/gmAutoFinalCuts/);
const preview=Rules.autoPracticeCuts(state,0,true);
assert.equal(preview.ok,true);
assert.equal(preview.moved.length,4);
assert.equal(Rules.count(state,0).ACTIVE,57,'Dry run mutated roster');
const applied=Rules.autoPracticeCuts(state,0);
assert.equal(applied.ok,true);
assert.equal(Rules.count(state,0).ACTIVE,53);
assert.equal(Rules.count(state,0).PRACTICE,4);
assert.equal(Rules.validate(state,0).ok,true);
assert.equal(state.players.filter(p=>p.team===0).length,57,
 'Players were cut/released rather than reassigned');
assert.equal(state.players.filter(p=>p.team===-1).length,0);
assert.ok(state.players.every(p=>p.salary===originalContracts[p.id]));
assert.equal(state.players[0].rosterStatus,'ACTIVE','Locked starter was demoted');
assert.equal(state.players[1].rosterStatus,'ACTIVE','Targeted player was demoted');
assert.ok(applied.moved.every(p=>p.rating<85));
assert.equal(Rules.autoPracticeCuts(state,0).moved.length,0);
assert.equal(state.rosterRules.finalCutsComplete['2029-0'],true);
const full={team:0,year:2029,week:1,players:[
 ...roster(),...Array.from({length:16},(_,i)=>({
 id:100+i,team:0,pos:'WR',age:23,rating:70,rosterStatus:'PRACTICE'
 }))],news:[]};
assert.equal(Rules.autoPracticeCuts(full,0).ok,false);
assert.equal(Rules.count(full,0).ACTIVE,57,'Failed preflight should not mutate roster');
console.log('PASS: preview, safe player selection, locked/targeted protection, contracts intact, practice capacity and 53-man validation');
