/* Priority 7: end-to-end press, depth, game film, yearbook and What If timeline tests.
   Run: node tests/priority7-immersion-smoke.js (built-in Node modules only). */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const TEAMS=Array.from({length:32},(_,i)=>['T'+i,'Club '+i,
  (i<16?'Union':'Liberty')+' North']);
const positions=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
let id=0;
const players=TEAMS.flatMap((_,t)=>positions.flatMap((pos,j)=>Array.from({length:3},(_,k)=>({
 id:++id,name:'Player '+t+' '+pos+' '+k,team:t,pos,
 rating:88-k*6+j%3,pot:95,years:3,salary:4,age:25+k,
 morale:65,fatigue:9,injury:0,stats:{games:0,passYards:0}
}))));
const state={team:0,year:2026,week:1,players,results:[],news:[],
 cash:120,cap:350,history:[],champions:[],awards:[],retired:[],
 ownerFranchise:{jobSecurity:70,fanHappiness:65,mediaHeat:25,facilities:{}}};
const data=new Map();
const storage={getItem:key=>data.has(key)?data.get(key):null,
 setItem:(key,value)=>data.set(key,String(value)),
 removeItem:key=>data.delete(key),clear:()=>data.clear()};
const nodes={app:{innerHTML:''},mobileSeason:{textContent:''}};
const scope={window:null,state,TEAMS,localStorage:storage,console,Math,Date,
 Gridiron:{register:()=>{}},
 GMRelocation:{applyTeamIdentity:()=>{}},
 GMOwner:{init:s=>s.ownerFranchise},
 nav:()=>{},render:()=>{},save:()=>{},page:'Dashboard',
 $:id=>nodes[id]||{textContent:'',innerHTML:''},
 alert:message=>{throw Error(String(message))},prompt:()=>null,
 confirm:()=>true};
scope.window=scope;
vm.createContext(scope);
function load(file){
 new vm.Script(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{filename:file})
  .runInContext(scope,{timeout:5000});
}
load('franchise-systems.js');
load('roster-rules.js');
load('simulation-presentation.js');
load('gridiron-saves.js');
load('presentation-immersion.js');
const immersion=scope.GMImmersion,save=scope.GMSaveManager;
assert.ok(immersion&&save);
scope.GMRosterRules.init(state);

// Depth chart: an actual bench QB may replace an injured or healthy starting QB.
const qbs=players.filter(p=>p.team===0&&p.pos==='QB');
const starter=qbs[0],backup=qbs[1];
assert.equal(immersion.setStarter(state,'QB',backup.id).ok,true);
assert.equal(scope.GMFranchise.depth(state,0,'QB')[0].id,backup.id);
assert.equal(backup.depthLocked,true);
assert.equal(starter.depthLocked,false);
starter.injury=2;
assert.ok(immersion.depthPage(state).includes('DEPTH CHART'));
assert.ok(immersion.depthPage(state).includes('GAME-DAY ESTIMATE'));
assert.ok(immersion.depthPage(state).includes('gmImmersionStarter('));
assert.equal(immersion.setStarter(state,'QB',starter.id).ok,false,
 'Cannot select an injured starter');
assert.equal(immersion.setStarter(state,'ZZ',backup.id).ok,false);

// Recorded game and authored press conference have separate, real data sources.
const game={year:2026,week:1,a:0,b:1,sa:31,sb:24,
 report:{weather:'Wind',summary:'Club 0 beat Club 1 after a second-half surge.',
 quarters:{home:[7,7,10,7],away:[3,7,7,7]},
 teams:[{team:0,totalYards:390,passYards:280,rushYards:110,turnovers:1,
   thirdDownConversions:7,thirdDownAttempts:12},
  {team:1,totalYards:340,passYards:240,rushYards:100,turnovers:2,
   thirdDownConversions:5,thirdDownAttempts:13}],
 keyInjuries:[{name:'Test Player',team:1,weeks:3}]}};
state.results.push(game);
scope.GMSimPresentation.report(state,game);
const reports=immersion.gameResults(state);
assert.equal(reports.length,1);
assert.equal(reports[0].id,'2026:1:0:1');
const film=immersion.gameCenterPage(state);
for(const value of ['THE FILM ROOM','QUARTER-BY-QUARTER','390','7',
 'WIND','POSTGAME MEDIA REACTION','gmImmersionSelectGame('])
 assert.ok(film.toUpperCase().includes(value.toUpperCase()),value+' is missing');
assert.equal(immersion.selectGame(state,'not-a-game').ok,false);
assert.equal(immersion.selectGame(state,reports[0].id).ok,true);
scope.page='Game Center';
scope.render();
assert.ok(nodes.app.innerHTML.includes('THE FILM ROOM'));

// Press questions change ownership and morale exactly once, with archive and skip.
const meeting=immersion.afterWeek(state);
assert.equal(meeting.questions.length,immersion.CONFIG.press.questions);
assert.equal(immersion.afterWeek(state),meeting);
assert.equal(immersion.respond(state,'LOCKER_ROOM','support').ok,false);
assert.equal(immersion.respond(state,'RESULT','confidence').ok,true);
const oldMorale=backup.morale;
assert.equal(immersion.respond(state,'LOCKER_ROOM','support').ok,true);
assert.equal(backup.morale,oldMorale+2);
assert.equal(immersion.respond(state,'NEXT_WEEK','transparency').completed,true);
assert.equal(state.immersionPress.history.length,1);
assert.equal(state.immersionPress.history[0].completed,true);
assert.equal(immersion.respond(state,'RESULT','confidence').ok,false);
assert.equal(state.ownerFranchise.fanHappiness,70);
state.week=2;
immersion.afterWeek(state); // intentionally unanswered
state.week=3;
immersion.afterWeek(state);
assert.equal(state.immersionPress.history.length,2);
assert.equal(state.immersionPress.history[0].skipped,true);
assert.ok(immersion.pressPage(state).includes('MISSED'));

// Historical game tape survives regular-season result resets.
state.year=2027;state.week=1;state.results=[];
assert.equal(immersion.gameResults(state).length,1);
assert.ok(immersion.gameCenterPage(state).includes('WEEK 1'));

// A yearbook generated from prior season is browsable from the premium view.
state.seasonRecaps=[{
 year:2026,team:0,standings:[{team:0,wins:12,losses:5}],
 playoffs:[{round:'Super Bowl',a:0,b:1,sa:31,sb:24}],
 allPro:[],awards:[{year:2026,mvp:'Test MVP'}],
 leaders:[{label:'Passing Yards',leaders:[{name:'Test QB',team:0,value:4300}]}],
 leagueStories:[]}];
assert.ok(immersion.yearPage(state,2026).includes('YEAR IN REVIEW'));
assert.ok(immersion.yearPage(state,2026).includes('Test MVP'));

// Creating a branch captures a clean parent and all future edits stay isolated.
save.bootstrap(state);
const original=save.activeId(),originalCash=state.cash;
assert.ok(original);
const fork=save.branch(state,'What If: Go For It');
assert.equal(save.activeId(),fork.id);
assert.equal(fork.branchOf,original);
assert.notEqual(fork.id,original);
const modified=JSON.parse(JSON.stringify(state));
modified.cash+=47;
modified.players.find(p=>p.team===0&&p.pos==='RB').rating+=7;
save.snapshot(modified);
const diff=save.compare(fork.id);
assert.equal(diff.cashDelta,47);
assert.ok(diff.overallDelta>0);
assert.equal(diff.sameSeason,true);
assert.ok(save.labPage(modified).includes('WHAT IF LAB'));
assert.ok(save.labPage(modified).includes('ORIGINAL RECORD'));
assert.ok(save.labPage(modified).includes('ROSTER RATING'));
assert.equal(save.activate(original).cash,originalCash,
 'Original timeline must remain unchanged');
assert.equal(save.activate(fork.id).cash,originalCash+47,
 'Branch must preserve independent edits');
const grandchild=save.branch(modified,'What If: Double Down');
assert.equal(grandchild.branchOf,fork.id);
assert.equal(save.activate(fork.id).cash,originalCash+47,
 'Nested branching must not alter its parent');
assert.ok(scope.GMImmersion.pressStore(modified).history.length>=1);
console.log('PASS: player depth, real game film, press decisions/skip, yearly recap and isolated What If comparisons');
