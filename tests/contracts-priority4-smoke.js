/* Run: node tests/contracts-priority4-smoke.js
   No npm, browser or bundler required. Exercises the production contract modules. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const names=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const TEAMS=Array.from({length:32},(_,i)=>['T'+i,'Team '+i,'Union North']);
const players=TEAMS.flatMap((_,team)=>names.map((pos,j)=>({
 id:team*100+j,name:'Test '+team+' '+pos,team,pos,
 rating:j===2?93:79,pot:95,age:27,years:2,salary:8,morale:65,
 stats:{receivingYards:1250,passYards:4200,sacks:11}
})));
const state={year:2026,week:16,team:0,players,news:[],results:[],cash:350,cap:350,
  ownerFranchise:{jobSecurity:65,fanHappiness:65,mediaHeat:30}};
const scope={window:null,TEAMS,state,console,Math,
 Gridiron:{register:()=>{}},save:()=>{},render:()=>{},
 alert:()=>{},prompt:()=>null,confirm:()=>true,
 GMOwner:{init:s=>s.ownerFranchise}};
scope.window=scope;
const context=vm.createContext(scope);
function load(name){new vm.Script(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),
 {filename:name}).runInContext(context,{timeout:5000})}
load('contracts-advanced.js');load('contract-economy.js');
const A=scope.GMContractsAdvanced,E=scope.GMContractEconomy;
const p=state.players.find(p=>p.team===0&&p.pos==='WR');
assert.ok(E.agent(p).persona);
assert.equal(E.baseLimit(state,2026),350);
assert.equal(E.baseLimit(state,2027),364);
const moneyFirst={...p,agent:{persona:'Money-First',name:'Agent A'}};
const loyalty={...p,agent:{persona:'Loyalty-Focused',name:'Agent B'}};
const offer={years:3,salary:25,bonus:6,guaranteed:10,clauses:{}};
assert.ok(E.evaluateOffer(moneyFirst,state,offer).required>E.evaluateOffer(loyalty,state,offer).required);

// Release that accelerates more guaranteed money than the available room must be atomic.
const pressure=JSON.parse(JSON.stringify(state)), expensive=pressure.players.find(x=>x.team===0);
const locked=A.init(expensive,pressure);
locked.guarantees=[0,500];const capBefore=E.sheet(pressure).space;
assert.equal(E.release(expensive,pressure).ok,false);
assert.equal(expensive.team,0);assert.equal(E.sheet(pressure).space,capBefore);
const startCash=state.cash;
const invalid=E.extend(p,state,{years:9,salary:25,bonus:6});
assert.equal(invalid.ok,false);
assert.equal(state.cash,startCash,'Invalid offer cannot charge cash');
const signed=E.extend(p,state,{years:2,optionYears:1,optionHolder:'TEAM',
 voidYears:2,salary:25,bonus:6,guaranteed:10,noTrade:true,noTag:true});
assert.equal(signed.ok,true,signed.error);
assert.equal(state.cash,startCash-6);
assert.equal(p.contractAdvanced.options.length,1);
assert.equal(p.contractAdvanced.voidProration.length,2);
assert.equal(E.canTrade(p),false);
assert.equal(E.canTag(p),false);
assert.equal(A.tag(p,state,'FRANCHISE').ok,false,'No-tag clause must block tags');
assert.equal(A.capLimit(state,2027),E.capAt(state,0,2027));
const incentive=E.addLadder(p,state,{yearIndex:2,
 conditions:[{type:'REC_YARDS',threshold:1200},{type:'PLAYOFFS',threshold:1}],payout:3});
assert.equal(incentive.ok,true,incentive.error);
const baseline=E.sheet(state);
const ending=E.seasonEnd(state,Object.fromEntries(TEAMS.map((_,t)=>[t,{teamWins:10,playoffs:t===0}])));
assert.equal(ending.processed,true);
assert.equal(E.seasonEnd(state,{}).processed,false);
assert.ok(state.contractEconomy.carryover[2027][0]>0);
state.year=2027;state.week=1;
const cap=E.advanceYear(state);
assert.equal(cap.baseCap,364);
assert.equal(cap.limit,364+state.contractEconomy.carryover[2027][0]);
assert.ok(E.sheet(state).space>E.sheet(state,0,2026).space-100);
const cashBefore=state.cash;
const paid=E.assessLadders(p,state,{teamWins:10,playoffs:true});
assert.equal(paid.length,1);
assert.equal(paid[0].met,true);
assert.equal(state.cash,cashBefore-3);
assert.equal(E.assessLadders(p,state,{playoffs:true}).length,0);
assert.equal(E.ladderHit(p,2027),3);

const option=p.contractAdvanced.options[0];
assert.equal(E.setOption(p,state,option.year,false).ok,true);
assert.equal(option.exercised,false);
assert.equal(p.years,3,'Declining should shorten remaining active deal');
assert.ok(A.ledger(state).deadCap[option.year].some(x=>x.playerId===p.id));
assert.equal(E.setOption(p,state,option.year,true).ok,false);
const cost=E.release(p,state);
assert.equal(cost.ok,true);
assert.ok(cost.deadCap>0,'Release must accelerate signing bonus/void years');
assert.equal(p.team,-1);

// Penalty and owner consequences on over-cap team
const overspend=state.players.find(p=>p.team===0&&p.pos==='QB');
state.year=2028;state.cap=E.baseLimit(state,2028);
overspend.contractAdvanced={startYear:2028,baseSalaries:[500],bonusProration:[0],
 guarantees:[0],incentives:[]};overspend.salary=500;
const oldSecurity=state.ownerFranchise.jobSecurity;
const over=E.seasonEnd(state,{});
assert.equal(over.processed,true);
assert.ok(over.cap.over>0);
assert.ok(state.contractEconomy.penalties[2029][0]>0);
assert.ok(state.ownerFranchise.jobSecurity<oldSecurity);

// Existing free-agency signing metadata must be registered without a second bonus deduction.
const fa=state.players.find(p=>p.team===1&&p.pos==='TE');
fa.team=0;fa.years=3;fa.salary=12;
const cashSign=state.cash;
assert.equal(E.registerSigning(fa,state,{
 years:3,salary:12,bonus:2,guaranteed:10,clause:'NO_TRADE',incentive:2}).ok,true);
assert.equal(state.cash,cashSign,'Registering a signing does not charge bonus twice');
assert.equal(E.canTrade(fa),false);
assert.equal(fa.contractAdvanced.incentiveLadders.length,1);
assert.match(E.page(state),/AGENTS & CAP ECONOMY/);
const frontoffice=fs.readFileSync(path.join(__dirname,'../frontoffice.js'),'utf8');
assert.match(frontoffice,/GMContractEconomy\.canTrade/,'Trade screen must enforce no-trade clauses');
console.log('PASS agent negotiation, contracts, clauses, options, incentive ladders, cap growth, carryover, cap penalties, void-year release and free agency');
