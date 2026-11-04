/* Priority 6: no-dependency regression test.
   Run: node tests/league-narratives-priority6-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const positions=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const TEAMS=Array.from({length:32},(_,i)=>['T'+i,'City '+i+' Wolves',
 (i<16?'Union':'Liberty')+' '+['North','South','East','West'][Math.floor(i%16/4)]]);
let uid=0;
const players=TEAMS.flatMap((_,team)=>Array.from({length:30},(_,j)=>({
 id:uid++,name:'Player '+team+'-'+j,pos:positions[j%10],team,
 age:23+j%12,rating:72+j%17,pot:94,years:4,salary:4,
 rookie:j===1,morale:65,injury:0,stats:{
  games:0,passYards:0,passTD:0,rushYards:0,receivingYards:0,
  receptions:0,rushTD:0,recTD:0,tackles:0,sacks:0,interceptions:0
 }
})));
const state={year:2026,week:6,team:0,players,results:[],news:[],
 cash:200,cap:350,history:[],awards:[],
 ownerFranchise:{jobSecurity:75,fanHappiness:65,mediaHeat:25,facilities:{stadium:1}}};
const scope={TEAMS,state,window:null,console,Math,JSON,
 document:{getElementById:()=>({})},
 Gridiron:{register:()=>{}},
 GMOwner:{init:s=>s.ownerFranchise},
 save:()=>{},render:()=>{scope.GMRelocation?.applyTeamIdentity(state)},alert:message=>{throw Error(message)},
 confirm:()=>true};
scope.window=scope;vm.createContext(scope);
function load(filename){
 const source=fs.readFileSync(path.join(__dirname,'..',filename),'utf8');
 new vm.Script(source,{filename}).runInContext(scope,{timeout:5000});
}
load('league-narratives.js');
load('franchise-relocation.js');
load('season-recap.js');
load('simulation-presentation.js');
load('team-names.js');
const stories=scope.GMLeagueNarratives,relocation=scope.GMRelocation;
const qb=players.find(p=>p.team===0&&p.pos==='QB');
const defensive=players.find(p=>p.team===1&&p.pos==='DL');
const game={year:2026,week:6,a:0,b:1,sa:31,sb:28};
const before=stories.snap(state,game);
qb.stats.games=1;qb.stats.passYards=388;qb.stats.passTD=3;
defensive.stats.games=1;defensive.stats.tackles=12;defensive.stats.sacks=4;
state.results.push(game);
assert.equal(stories.afterGame(state,game,before),true);
assert.equal(stories.afterGame(state,game,before),false,'Repeated result must not count again');
assert.equal(qb.careerStats.passYards,388);
assert.equal(stories.init(state).allTimeSeasonRecords.passYards.value,388);
assert.equal(stories.init(state).gameRecords.passYards.value,388);
assert.equal(stories.init(state).franchiseRecords['0:passYards'].value,388);
assert.ok(stories.init(state).headlines.some(h=>h.kind==='THRILLER'));

state.week=7;const second={year:2026,week:7,a:0,b:1,sa:24,sb:20};
const secondBefore=stories.snap(state,second);
qb.stats.games=2;qb.stats.passYards+=265;qb.stats.passTD+=2;
state.results.push(second);
stories.afterGame(state,second,secondBefore);
assert.equal(qb.careerStats.passYards,653);
assert.equal(stories.init(state).seasonRecords['2026:passYards'].value,653);
assert.equal(stories.init(state).allTimeSeasonRecords.passYards.value,653);
// Franchise-only records must not include statistics earned before a midseason trade.
const traded=players.find(p=>p.team===1&&p.pos==='WR');
state.week=8;const oldTeamGame={year:2026,week:8,a:1,b:2,sa:31,sb:17};
const oldTeamBefore=stories.snap(state,oldTeamGame);
traded.stats.games=1;traded.stats.receivingYards=640;
state.results.push(oldTeamGame);stories.afterGame(state,oldTeamGame,oldTeamBefore);
traded.team=0;
state.week=9;const newTeamGame={year:2026,week:9,a:0,b:1,sa:37,sb:24};
const newTeamBefore=stories.snap(state,newTeamGame);
traded.stats.games=2;traded.stats.receivingYards+=300;
state.results.push(newTeamGame);stories.afterGame(state,newTeamGame,newTeamBefore);
assert.equal(traded.careerStats.receivingYards,940);
assert.equal(traded.careerStats.games,2);
assert.equal(stories.init(state).franchiseRecords['1:receivingYards'].value,640);
assert.equal(stories.init(state).franchiseRecords['0:receivingYards'].value,300);
assert.ok(stories.init(state).teamRecords.GAME_POINTS.value>=37);
const champion=stories.championship(state,0,1);
assert.equal(stories.championship(state,0,1),champion,'Champion must be archived only once');
assert.equal(stories.init(state).champions.length,1);
const weekly=stories.weekly(state);
assert.equal(stories.weekly(state).length,0,'Weekly media generated twice');
assert.ok(Array.isArray(weekly));
const vote=stories.ballot(state);
assert.ok(vote.mvp&&vote.allPro.length>0);
assert.equal(vote.proBowlByConference.length,2);
const finished=stories.seasonEnd(state);
assert.equal(stories.seasonEnd(state),finished,'Honors generated twice');
assert.ok(finished.champion?.team===0);
assert.ok(qb.careerHonors?.some(h=>h.kind==='MVP'),'MVP must follow player throughout career');
assert.ok(stories.awardsPage(state).includes('LEAGUE AWARDS'));
assert.ok(stories.historyPage(state).includes('CHAMPIONSHIP & AWARD YEARBOOK'));
assert.ok(stories.page(state).includes('ALL-TIME SINGLE-GAME RECORDS'));
assert.ok(stories.page(state).includes('TEAM RECORDS'));
assert.ok(finished.votes.every(v=>v.score>=0&&v.score<=100));
const standings=TEAMS.map((_,i)=>({i,rec:{w:i===0?2:0,l:i===1?2:0}}));
state.awards.push({year:2026,mvp:finished.mvp.name});
const recap=scope.GMSeasonRecap.generate(state,standings,[],state.awards);
assert.equal(recap.allPro.length,finished.allPro.length);
assert.ok(Array.isArray(recap.leagueStories));
assert.ok(recap.records.length>0);
assert.ok(recap.leaders.some(l=>l.key==='receivingYards'&&l.leaders.some(x=>x.id===traded.id)));
assert.ok(scope.GMSeasonRecap.page(state).includes('gmChooseRecapYear'));

const original=TEAMS[0][1],originalCash=state.cash,originalFan=state.ownerFranchise.fanHappiness;
assert.equal(relocation.propose(state,'PORTLAND').ok,true);
assert.equal(state.cash,originalCash-relocation.CONFIG.proposal.cost);
assert.ok(state.ownerFranchise.fanHappiness<originalFan);
assert.equal(relocation.propose(state,'AUSTIN').ok,false,'Cannot hold concurrent proposals');
assert.equal(relocation.decide(state,'MOVE').ok,true);
assert.ok(TEAMS[0][1].startsWith('Portland '));
const deal=relocation.stadiumDeal(state,'RENOVATE');
assert.equal(deal.ok,true);
assert.equal(state.ownerFranchise.facilities.stadium,2);
assert.equal(relocation.stadiumDeal(state,'PRIVATE').ok,false);
assert.equal(relocation.page(state).includes('OWNER REACTIONS'),true);
const other=JSON.parse(JSON.stringify(state));
delete other.franchiseRelocation;
relocation.applyTeamIdentity(other);
assert.equal(TEAMS[0][1],original,'Relocated name leaked into another save');
relocation.applyTeamIdentity(state);
assert.ok(TEAMS[0][1].startsWith('Portland '));
scope.gmSetTeamNamingPreset('nfl');
assert.ok(TEAMS[0][1].startsWith('Portland '),'Preset overwrote relocated team');
relocation.applyTeamIdentity(other);
assert.equal(TEAMS[0][1],'Arizona Wolves','Preset not restored on save change');
// HoF ballots are based on career performance and actual stored honors, not a
// retired player's final-season stats or automatic induction at retirement.
const lifetime={...qb,id:100900,team:-2,name:'Hall Candidate',rating:96,
 retiredYear:2026,careerStats:{passYards:48000,games:260},
 careerHonors:[...qb.careerHonors,{year:2025,kind:'MVP'},{year:2024,kind:'ALL_PRO'}],
 stats:{passYards:0,yards:0,td:0}};
state.retired??=[];state.retired.push(lifetime);
scope.GMSimPresentation.retirement(state,lifetime);
const ceremony=state.simPresentation.retirementCeremonies.find(x=>x.playerId===lifetime.id);
assert.ok(ceremony.hofScore>=72&&ceremony.careerHonors.length>=2);
state.year=2028;state.week=19;
scope.GMSimPresentation.season(state);
assert.ok(state.simPresentation.inductedIds.includes(lifetime.id));
assert.ok(stories.hallPage(state).includes('Hall Candidate'));
state.year=2027;state.week=1;
assert.ok(stories.awardsPage(state).includes('2026'),'Offseason awards default to latest finished year');
const third={year:2027,week:1,a:0,b:1,sa:24,sb:21};
const thirdBefore=stories.snap(state,third);
qb.stats.passYards=0;qb.stats.passTD=0;qb.stats.games=1;
qb.stats.passYards=200;
state.results.push(third);
stories.afterGame(state,third,thirdBefore);
assert.equal(stories.init(state).allTimeSeasonRecords.passYards.value,653,
 'All-time single-season record should survive season changes');
console.log('PASS: game/career/season/franchise records, idempotence, awards, Pro Bowl, recaps, relocation, fan reactions, stadium deals and naming isolation');
