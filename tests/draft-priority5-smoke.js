/* Priority 5 draft realism regression test.
   Run: node tests/draft-priority5-smoke.js (no npm packages). */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const TEAMS=Array.from({length:32},(_,i)=>['T'+i,'Team '+i,(i<16?'Union':'Liberty')+' North']);
let id=0;
const players=TEAMS.flatMap((_,team)=>Array.from({length:30},(_,i)=>({
 id:id++,name:'Veteran '+team+' '+i,team,pos:POS[i%10],rating:70+i%16,
 pot:92,age:27,salary:4,years:3,stats:{},injury:0,morale:65
})));
const state={team:0,year:2026,week:1,players,results:[],news:[],
 upgrades:{scoutPoints:50},cash:500,cap:350,selectedTrade:1};
const scope={window:null,TEAMS,state,Math,console,Gridiron:{register(){}},
 rand:(a,b)=>a+Math.floor(Math.random()*(b-a+1)),
 roster:(team=state.team)=>state.players.filter(p=>p.team===team),
 payroll:team=>state.players.filter(p=>p.team===team).reduce((sum,p)=>sum+p.salary,0),
 record:()=>({w:0,l:0}),capspace:()=>1000,
 save:()=>{},render:()=>{},simulate:()=>{},page:'TEST',
 title:()=>'',metric:()=>'',heading:()=>'',xp:x=>x,
 notice:message=>{throw Error(message)},alert:message=>{throw Error(message)}
};
scope.window=scope;
const context=vm.createContext(scope);
function load(filename){
 new vm.Script(fs.readFileSync(path.resolve(__dirname,'..',filename),'utf8'),
 {filename}).runInContext(context,{timeout:3000});
}
load('draft-scouting-advanced.js');
load('draft-realism.js');
load('contracts-advanced.js');
load('frontoffice.js');
const D=scope.GMDraftRealism,office=state.frontOffice;
assert.equal(office.picks.length,224);
assert.equal(office.prospects.length,280);
assert.equal(office.picks.filter(p=>p.owner===state.team).length,7);
const p=office.prospects[0];
const before=D.publicGrade(p,state),start=state.upgrades.scoutPoints;
scope.scoutProspect(p.id);
assert.equal(state.upgrades.scoutPoints,start-3);
const after=D.publicGrade(p,state);
assert.ok(after.confidence>=before.confidence);
assert.ok(after.margin<=before.margin);
assert.equal(D.publicGrade(p,state).overall,after.overall,'Scouting estimates should not reroll');
const combineBefore=D.resources(state).combineReview;
const combine=D.combine(p,state);
assert.ok(combine.forty>4&&combine.shuttle>3);
assert.equal(D.resources(state).combineReview,combineBefore-1);
assert.equal(D.combine(p,state).forty,combine.forty);
assert.equal(D.resources(state).combineReview,combineBefore-1,'Combine counted twice');
const day=D.proDay(p,state);
assert.equal(day.ok,true);
assert.equal(D.proDay(p,state).ok,false,'Pro Day repeated');
const worked=D.workout(p,state);
assert.equal(worked.ok,true);
assert.equal(D.publicGrade(p,state).confidence>=after.confidence,true);

const pick1=office.picks.find(x=>x.round===1&&x.slot===1);
const pick2=office.picks.find(x=>x.round===1&&x.slot===2);
const swap=D.tradePicks(state,[pick1.id],[pick2.id],1);
assert.equal(swap.ok,true,'Better early pick should satisfy pick trade margin');
assert.equal(pick1.owner,1);assert.equal(pick2.owner,0);
assert.equal(D.tradePicks(state,[pick1.id],[pick2.id],1).ok,false,'Cannot trade away pick twice');
const draftStart=state.players.length;
scope.autoDraft();
assert.equal(office.picks.filter(p=>p.used).length,224);
assert.equal(office.draftLog.length,224);
assert.equal(state.players.length,draftStart+224);
assert.equal(office.prospects.filter(p=>p.drafted).length,224);
const rookies=state.players.filter(p=>p.rookieDraft?.year===2026);
assert.equal(rookies.length,224);
assert.equal(rookies.filter(p=>p.rookieDraft.round===1).length,32);
assert.equal(rookies.filter(p=>p.rookieDraft.round===7).length,32);
assert.ok(rookies.every(p=>p.contractAdvanced?.baseSalaries?.length===4));
assert.ok(rookies.every(p=>p.attributes?.speed));
const own=rookies.find(p=>p.team===0&&p.draftFifthYear);
assert.ok(own,'Team should own a first-round rookie');
assert.equal(own.draftFifthYear.deadlineYear,2028);
assert.equal(own.draftFifthYear.optionYear,2030);
assert.equal(D.decideFifthYear(own,state,true).ok,false,'Option cannot be exercised three years early');
state.year=2028;state.week=18;
const years=own.years;
assert.equal(D.decideFifthYear(own,state,true).ok,true);
assert.equal(own.years,years+1);
assert.equal(own.contractAdvanced.baseSalaries.length,5);
assert.equal(D.decideFifthYear(own,state,true).ok,false,'Cannot exercise option twice');
state.week=19;
const changes=D.seasonEnd(state);
assert.equal(changes.some(x=>x.playerId===own.id),false,'Manual decision cannot be overridden');
assert.equal(D.seasonEnd(state).length,0,'Automatic decision must be idempotent');
const other=rookies.find(p=>p.team!==0&&p.draftFifthYear);
assert.ok(other.draftFifthYear.decided,'AI should decide fifth-year option automatically');
assert.match(D.page(state),/THE EVALUATION LAB/);
console.log('PASS: 280 prospects; 224 selections; scouting accuracy; combine, Pro Day and workout; draft pick trade; 32 rookie options; option deadline; idempotent annual decisions');
