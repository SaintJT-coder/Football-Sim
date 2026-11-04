/* GridIron GM — cross-module simulation integration.
   Run: node tests/full-engine-integration-smoke.js
   Simulates a full week, forced offseason, and next-year opening week. */
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
 'engine.js','frontoffice.js','presentation-immersion.js'
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
// XP calculations must tolerate callers without a state or current snap snapshot.
const xpMultiplier=scope.GMPlayerPersonality.xpMultiplier(players[0]);
assert.equal(Number.isFinite(xpMultiplier),true);
scope.simulate();
assert.equal(state.year,2026);
assert.equal(state.week,2);
assert.equal(state.results.filter(g=>g.year===2026).length,16);
// Passing TDs must be credited to receivers as well as the passer.
for(const team of Array.from({length:32},(_,i)=>i)){
 const roster=state.players.filter(p=>p.team===team);
 const pass=roster.filter(p=>p.pos==='QB').reduce((n,p)=>n+(p.stats.passTD||0),0);
 const receiving=roster.filter(p=>p.pos==='WR'||p.pos==='TE')
   .reduce((n,p)=>n+(p.stats.recTD||0),0);
 assert.equal(receiving,pass,'Missing receiving touchdowns for team '+team);
}
assert.equal(state.immersionPress.active.questions.length,3);
// Small touchdown totals must never produce negative stats after rounding.
for(const player of state.players){
 for(const field of ['rushTD','recTD','passTD','receptions','receivingYards','rushYards']){
   assert.ok((player.stats[field]||0)>=0,'Negative '+field+' for '+player.name);
 }
}
assert.equal(state.leagueNarratives.processedGames.length,16);
assert.ok(Object.keys(state.leagueNarratives.careerRecords).length>0);
const conference=state.immersionPress.active;
for(const q of conference.questions)
 assert.equal(scope.GMImmersion.respond(state,q.id,q.options[0].id).ok,true);
assert.equal(state.immersionPress.history.length,1);

// Trigger the actual season-transition path after the first played week.
// This is NOT a 17-week statistical/standings realism benchmark.
state.week=19;
scope.simulate();
assert.equal(state.year,2027);
assert.equal(state.week,1);
assert.equal(state.cap,364);
assert.equal(state.seasonRecaps[0].year,2026);
assert.ok(state.seasonRecaps[0].yearInReview);
assert.equal(state.contractEconomy.processed.includes(2026),true);
assert.equal(state.leagueNarratives.honors[0].year,2026);
assert.ok(state.engine.playoffs.length>0);
scope.simulate();
assert.equal(state.week,2);
assert.equal(state.results.filter(g=>g.year===2027).length,16);
assert.equal(state.immersionPress.active.year,2027);
assert.equal(state.immersionPress.active.week,1);
assert.match(scope.GMImmersion.yearPage(state),/YEAR IN REVIEW/);
assert.ok(Number.isFinite(state.cash)&&Number.isFinite(state.cap));
console.log('PASS: full modules, 16 games, live records, press answers, yearbook, playoffs, cap growth, and next-season simulation');