/* Retirement archival and monotonic player IDs.
   Run: node tests/retirement-archive-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const modules=[
 'gridiron-core.js','franchise-systems.js','player-development.js',
 'coaching-philosophy.js','coaching-staff.js','player-personality.js',
 'roster-rules.js','weekly-gameplan.js','owner-franchise.js',
 'injury-medical.js','season-recap.js','draft-scouting-advanced.js',
 'draft-realism.js','simulation-presentation.js','franchise-relocation.js',
 'league-narratives.js','contracts-advanced.js','contract-economy.js',
 'possession-sim.js','engine.js','frontoffice.js','presentation-immersion.js'
];
const names=['North','South','East','West'];
const TEAMS=Array.from({length:32},(_,i)=>[
 'T'+i,'Team '+i,(i<16?'Union':'Liberty')+' '+names[Math.floor((i%16)/4)]
]);
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
let nextId=0;
const players=TEAMS.flatMap((_,t)=>Array.from({length:30},(_,j)=>({
 id:nextId++,name:'Sim Player '+t+' '+j,team:t,pos:POS[j%10],
 rating:68+j%21,pot:95,age:23+j%11,years:4,salary:4,
 fatigue:0,injury:0,morale:65,rosterStatus:'ACTIVE',
 stats:{yards:0,td:0,tackles:0,sacks:0}
})));
const state={
 year:2026,week:1,team:0,players,results:[],news:[],
 history:[],awards:[],champions:[],retired:[],
 cash:180,cap:350,deadCap:0,selectedTrade:1,upgrades:{}
};
const scope={
 window:null,TEAMS,state,console,Math,
 GridIron:{},page:'QA',selectedWeek:1,
 rand:(a,b)=>Math.floor(Math.random()*(b-a+1))+a,
 roster:(t=state.team)=>state.players.filter(p=>p.team===t),
 record:t=>state.results.filter(g=>g.year===state.year&&(g.a===t||g.b===t))
   .reduce((w,l)=>{if((l.sa>l.sb?l.a:l.b)===t)w.w++;else w.l++;return w},{w:0,l:0}),
 extraStore:()=>state.engineExtra??={},
 save:()=>{},render:()=>{},simulate:()=>{},endSeason:()=>{},
 nav:()=>{},title:()=>'',metric:()=>'',heading:()=>'',money:()=>'',capspace:()=>250,
 playerRow:()=>'',xp:x=>x,$:()=>({innerHTML:'',textContent:''}),
 alert:message=>{throw Error('SIMULATION ALERT: '+message)},
 notice:message=>{throw Error('SIMULATION NOTICE: '+message)}
};
scope.window=scope;
const context=vm.createContext(scope);
for(const filename of modules){
 const code=fs.readFileSync(path.join(__dirname,'..',filename),'utf8');
 new vm.Script(code,{filename}).runInContext(context,{timeout:10000});
}

// An older imported franchise can already contain a retired player in both
// active pool and retirement archive. It must remain archived only once.
const previouslyRetired=state.players[0];
previouslyRetired.team=-2;
state.retired.push({...previouslyRetired,retiredYear:2025});
state.retired.push({...previouslyRetired,retiredYear:2026}); // old duplicated record
const newRetiree=state.players.find(p=>p.team===1&&p.pos==='QB');
newRetiree.age=39;
const priorCount=state.players.length;
const random=Math.random;
try{
 Math.random=()=>0; // deterministic retirement chance for eligible veterans
 state.week=19;scope.simulate();
}finally{Math.random=random}
assert.equal(state.year,2027);
assert.ok(state.players.length<priorCount,
 'Retired players were not removed from the active player pool');
assert.equal(state.players.some(p=>p.team===-2),false,
 'Active pool still includes retired players');
const ids=state.retired.filter(p=>p.id===previouslyRetired.id);
assert.equal(ids.length,1,'Previously retired player duplicated again');
assert.equal(ids[0].retiredYear,2025,'Earliest historical retirement was lost');
assert.equal(state.retired.some(p=>p.id===newRetiree.id),true,
 'New veteran retirement not archived');
assert.equal(state.players.some(p=>p.id===newRetiree.id),false,
 'Newly retired player stayed active');
const historicalIds=new Set(state.retired.map(p=>p.id));
const maxHistorical=Math.max(...state.retired.map(p=>Number(p.id)||0));
scope.autoDraft();
assert.equal(state.frontOffice.draftLog.length,224);
const rookies=state.players.filter(p=>p.rookieDraft?.year===2027||
 (p.rookie&&p.years===4&&p.age<=24));
assert.ok(rookies.length>0);
const allIds=state.players.map(p=>p.id);
assert.equal(new Set(allIds).size,allIds.length,'Duplicate IDs among active players');
assert.ok(rookies.every(p=>!historicalIds.has(p.id)),
 'New draftee reused an archived retiree ID');
assert.ok(state.nextPlayerId>maxHistorical,
 'Persistent draft ID counter did not advance past historical IDs');
console.log('PASS: single retirement, preserved archive, retired pool pruning, 224 new rookies with unique lifetime IDs');
