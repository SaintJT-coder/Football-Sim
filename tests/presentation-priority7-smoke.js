/* Gridiron GM — Priority 7 no-dependency regression tests.
 * Run: node tests/presentation-priority7-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const TEAMS=Array.from({length:32},(_,i)=>['T'+i,'Team '+i,
  (i<16?'Union':'Liberty')+' North']);
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
let id=0;
const players=TEAMS.flatMap((_,team)=>Array.from({length:30},(_,i)=>({
  id:id++,team,name:'Player '+team+'-'+i,pos:POS[i%POS.length],
  rating:68+i%23,pot:95,age:23+i%10,years:4,salary:4,
  rosterStatus:'ACTIVE',depthLocked:false,injury:0,fatigue:0,morale:65,
  stats:{games:0,passYards:0,tackles:0,sacks:0}
})));
const state={year:2026,week:4,team:0,players,results:[],news:[],
  history:[],awards:[],champions:[],cash:150,cap:350,
  expansion:{press:0,achievements:[]},
  ownerFranchise:{jobSecurity:70,fanHappiness:65,mediaHeat:25,
    facilities:{stadium:0}}};
const memory=new Map();
const localStorage={
  getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>memory.set(key,String(value)),
  removeItem:key=>memory.delete(key)
};
const elements={
  app:{innerHTML:''},mobileSeason:{textContent:''},nav:{innerHTML:''}
};
const scope={window:null,TEAMS,state,Math,JSON,console,
  localStorage,Gridiron:{register:()=>{}},
  GMOwner:{init:s=>s.ownerFranchise},
  save:()=>{},render:()=>{},nav:()=>{},
  $:id=>elements[id]||{innerHTML:'',textContent:''},
  page:'Press Room',alert:message=>{throw Error(message)},
  confirm:()=>true,prompt:()=>null};
scope.window=scope;
const context=vm.createContext(scope);
function load(file){
  new vm.Script(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),
    {filename:file}).runInContext(context,{timeout:5000});
}
load('franchise-systems.js');
load('roster-rules.js');
load('presentation-immersion.js');
load('season-recap.js');
load('gridiron-saves.js');
const P=scope.GMImmersion,roster=scope.GMRosterRules;

// Postgame media: exactly three one-time answers; real owner / player effects.
const result={a:0,b:1,year:2026,week:4,sa:27,sb:20};
state.results.push(result);
const conference=P.afterWeek(state);
assert.equal(conference.key,'2026:4');
assert.equal(conference.result,'W');
assert.equal(conference.questions.length,3);
assert.match(P.pressPage(state),/THE PRESS ROOM/);
const beforeFan=state.ownerFranchise.fanHappiness;
const leader=players.filter(p=>p.team===0&&p.pos==='QB')
  .sort((a,b)=>b.rating-a.rating)[0];
const beforeMorale=leader.morale;
const first=conference.questions[0];
assert.equal(P.respond(state,first.id,first.options[0].id).ok,true);
assert.equal(P.respond(state,first.id,first.options[0].id).ok,false,
  'Cannot answer the same question twice');
for(const q of conference.questions.slice(1))
  assert.equal(P.respond(state,q.id,q.options[0].id).ok,true);
assert.equal(state.immersionPress.history.length,1);
assert.equal(state.immersionPress.active,null);
assert.equal(state.expansion.press,1);
assert.equal(state.ownerFranchise.fanHappiness>beforeFan,true);
assert.equal(leader.morale>beforeMorale,true);
assert.strictEqual(P.afterWeek(state),conference,
  'Completing conference must not create another one in the same week');
assert.equal(P.respond(state,'RESULT','confidence').ok,false);
state.week=5;
const bye=P.afterWeek(state);
assert.equal(bye.result,'BYE');
assert.equal(bye.questions.length,3);

// Lineup adjustments must change the real roster-rules sort, not just UI.
const qbs=players.filter(p=>p.team===state.team&&p.pos==='QB');
const qb=qbs[1];
assert.equal(P.setStarter(state,'QB',qb.id).ok,true);
assert.equal(roster.depth(state,0,'QB')[0].id,qb.id);
qb.injury=3;
assert.equal(P.setStarter(state,'QB',qb.id).ok,false);
assert.match(P.injuryPage(state),/INJURY REPORT/);
assert.match(P.depthPage(state),/DEPTH CHART/);
qb.injury=0;

// Persist yearbook comparison and surprises before season stats are reset.
const standings=TEAMS.map((_,team)=>({
  i:team,rec:{w:team===0?12:7,l:team===0?5:10}
}));
const prior={year:2025,team:0,
  standings:TEAMS.map((_,team)=>({team,wins:team===0?6:7,losses:team===0?11:10})),
  playoffs:[],awards:[],allPro:[],leaders:[],records:[]};
state.seasonRecaps=[prior];
const recap=scope.GMSeasonRecap.generate(state,standings,[],[]);
assert.equal(recap.yearInReview.winsChange,6);
assert.equal(recap.yearInReview.trajectory,'ON THE RISE');
assert.match(P.yearPage(state),/YEAR IN REVIEW/);
assert.match(P.yearPage(state,2025),/2025/);

// What If saves are independent, visual and can return to the parent.
const S=scope.GMSaveManager;
S.bootstrap(state);
const parentId=S.activeId();
assert.ok(parentId);
const branch=S.branch(state,'What If: Draft a QB');
assert.equal(branch.branchOf,parentId);
assert.equal(S.activeId(),branch.id);
assert.equal(S.index().length,2);
assert.match(S.page(state),/ALTERNATE UNIVERSE/);
assert.match(S.page(state),/RETURN TO ORIGINAL TIMELINE/);
assert.ok(S.compare(branch.id));
const loaded=S.activate(parentId);
assert.equal(loaded.year,2026);
assert.equal(S.activeId(),parentId);
const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.match(index,/presentation-immersion\.css/);
assert.match(index,/presentation-immersion\.js/);
assert.match(index,/'Press Room'/);
console.log('PASS: 3 interactive press answers, morale and fan reactions, actual starter depth, injury UI, yearbook trajectory, branch comparison and parent loading');