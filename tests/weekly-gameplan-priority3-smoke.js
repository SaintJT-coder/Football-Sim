/* Run: node tests/weekly-gameplan-priority3-smoke.js
   Tests the actual Priority 3 modules with a synthetic 32-team league. No dependencies. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const teamCount=32;
const TEAMS=Array.from({length:teamCount},(_,i)=>['T'+i,'Team '+i,(i<16?'Union':'Liberty')+' North']);
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
let id=0;
const players=TEAMS.flatMap((_,team)=>Array.from({length:30},(_,j)=>({
 id:id++,team,name:'Test '+team+'-'+j,pos:POS[j%10],
 rating:70+j%18,pot:92,age:23+j%10,salary:4,years:4,
 fatigue:15,morale:65,injury:0,stats:{yards:0,passYards:0,receivingYards:0}
})));
const state={year:2026,week:10,team:0,players,news:[],results:[],cash:120,cap:350};
const ctx={state,TEAMS,console,Math,
 Gridiron:{register:()=>{},getState:()=>state}};
ctx.window=ctx;vm.createContext(ctx);
const load=f=>new vm.Script(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'),
 {filename:f}).runInContext(ctx,{timeout:5000});
for(const f of ['franchise-systems.js','player-development.js','coaching-philosophy.js',
 'roster-rules.js','player-personality.js','weekly-gameplan.js'])load(f);
const ops=ctx.GMWeeklyGameplan,roster=ctx.GMRosterRules,dev=ctx.GMDevelopment;
roster.init(state);
assert.equal(ops.set(state,'passRatio',65).ok,true);
assert.equal(ctx.GMCoaching.init(state).weeklyPlan.passRatio,65);
assert.equal(ops.set(state,'blitzRate',45).ok,true);
assert.equal(ops.set(state,'offense','Aggressive').ok,true);
assert.equal(ops.set(state,'defense','Aggressive').ok,true);
assert.equal(ops.set(state,'target','Secondary').ok,true);
assert.equal(ops.set(state,'passRatio',999).ok,false);
const p=roster.depth(state,0,'QB')[0];
const budget=dev.budget(state),start=budget.points;
assert.equal(ops.focus(state,p.id,'TECHNIQUE').ok,true);
assert.equal(budget.points,start-ops.CONFIG.focus.cost);
assert.equal(ops.focus(state,p.id,'FILM').ok,false,'Duplicate focus');
assert.equal(ops.playerBoost(p,state),ops.CONFIG.focus.techniqueRating);
const recovery=state.players.find(p=>p.team===0&&p.pos==='RB');
assert.equal(ops.focus(state,recovery.id,'RECOVERY').ok,true);
assert.ok(recovery.fatigue<=15-ops.CONFIG.focus.recoveryFatigue);
const other=state.players.find(p=>p.team===0&&p.pos==='TE');
assert.equal(ops.focus(state,other.id,'FILM').ok,true);
assert.equal(ops.focus(state,state.players.find(x=>x.team===0&&x.pos==='OL').id,'FILM').ok,false);
const wrs=state.players.filter(p=>p.team===0&&p.pos==='WR');
wrs[0].injury=4;wrs[1].rosterStatus='PRACTICE';wrs[2].rosterStatus='PRACTICE';
const rows=ops.replacements(state);
assert.ok(rows.some(x=>x.injured.id===wrs[0].id));
assert.equal(ops.elevate(state,wrs[1].id,wrs[0].id).ok,true);
assert.equal(roster.playable(wrs[1]),true);
assert.ok(roster.depth(state,0,'WR').some(x=>x.id===wrs[1].id));
assert.equal(ops.playerBoost(wrs[1],state),ops.CONFIG.elevation.temporaryRating);
assert.equal(ops.elevate(state,wrs[2].id,wrs[0].id).ok,true);
assert.equal(ops.elevate(state,wrs[1].id).ok,false,'Same elevation twice');
const impact=ops.matchup(state,{a:0,b:1},0);
assert.ok(impact.offense>0&&impact.defense>0);
assert.equal(ops.matchup(state,{a:0,b:1},1).offense,0);
const before=new Map(players.map(p=>[p.id,{...p.stats}]));
const game={a:0,b:1};
ctx.GMPlayerPersonality.recordGame(state,game,0,.55);
p.stats.passYards+=320;p.stats.passTD=(p.stats.passTD||0)+3;
const morale=p.morale;
const report=ops.finishWeek(state,before);
assert.equal(report.playerId,p.id);
assert.equal(p.morale,morale+ops.CONFIG.practice.winnerMorale);
assert.equal(ops.finishWeek(state,before),null,'Report generated twice');
assert.equal(roster.playable(wrs[1]),false,'Elevation not released');
assert.equal(wrs[1].rosterStatus,'PRACTICE','Elevation permanently changed status');
state.results=[];
for(let i=0;i<6;i++)state.results.push({a:1,b:2,sa:27,sb:20,year:2026,week:i+1});
assert.equal(ops.tradeTerms(state,1).status,'PLAYOFF BUYER');
assert.equal(ops.tradeTerms(state,2).status,'REBUILDING SELLER');
assert.ok(ops.tradeTerms(state,1).multiplier>ops.tradeTerms(state,2).multiplier);
state.week=13;
assert.equal(ops.tradeTerms(state,1).open,false);
assert.ok(ops.page(state).includes('GAME PLAN & PRACTICE'));
console.log('PASS: Game plan, focus budget, practice elevations and cleanup, matchups, trade market and practice reports');
