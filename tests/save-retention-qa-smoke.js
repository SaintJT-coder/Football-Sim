/* CPU history retention safeguards.
   Run: node tests/save-retention-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../save-retention.js'),'utf8');
const win={window:null,Gridiron:{register:()=>{}}};win.window=win;
vm.createContext(win);new vm.Script(script).runInContext(win);
const T=win.GMSaveRetention;
const logs=n=>Array.from({length:n},(_,i)=>({year:2026,week:i+1,attribute:'Quickness',xp:i*25}));
const makePlayer=team=>({
 id:team+10,team,rating:85,
 attributes:{speed:92,strength:80,awareness:88},
 careerStats:{passYards:40000},
 contractAdvanced:{startYear:2026,baseSalaries:[10,12,14],bonusProration:[3,3,3]},
 development:{trainingHistory:logs(24),xp:1400,totalXP:17000,level:3,trait:'Star'},
 personalityProfile:{traits:['Leader','Team Player'],playStyle:'Pocket Passer',
  snaps:{year:2027,season:340,total:10920,last:{key:'2027:8',count:50},
   history:logs(12)},events:logs(12)}
});
const own=makePlayer(0),cpu=makePlayer(1);
const originalCareer=JSON.stringify(cpu.careerStats),
 originalContract=JSON.stringify(cpu.contractAdvanced),
 originalAttributes=JSON.stringify(cpu.attributes),
 originalTrait=JSON.stringify(cpu.personalityProfile.traits);
const state={team:0,year:2027,week:8,players:[own,cpu],
 news:Array.from({length:600},(_,i)=>'News story '+i)};
state.simPresentation={
 gameReports:[
  ...Array.from({length:35},(_,i)=>({id:'own-'+i,year:i<10?2025:2027,a:0,b:1,
    leaders:[{name:'AI Star',rating:84,stats:{receivingYards:999,recTD:12}}],
    originalReport:{quarters:[7,7,7,7],teams:['Team 0','Team 1']}})),
  ...Array.from({length:15},(_,i)=>({id:'other-'+i,year:2027,a:2,b:3,
    leaders:[{name:'Other',rating:82,stats:{passYards:999}}],
    originalReport:{unused:true}}))
 ],
 pressConferences:Array.from({length:90},(_,i)=>({id:i,headline:'Press '+i})),
 rivalries:{'0-1':{games:12,results:Array.from({length:12},(_,i)=>({year:2026,week:i+1}))}}
};
const before=Buffer.byteLength(JSON.stringify(state),'utf8');
const result=T.compact(state);
assert.ok(result.entriesPruned>0);
assert.equal(own.development.trainingHistory.length,24);
assert.equal(own.personalityProfile.snaps.history.length,12);
assert.equal(own.personalityProfile.events.length,12);
assert.equal(cpu.development.trainingHistory.length,T.CONFIG.aiTrainingHistory);
assert.equal(cpu.personalityProfile.snaps.history.length,T.CONFIG.aiSnapHistory);
assert.equal(cpu.personalityProfile.events.length,T.CONFIG.aiEventHistory);
assert.equal(JSON.stringify(cpu.careerStats),originalCareer);
assert.equal(JSON.stringify(cpu.contractAdvanced),originalContract);
assert.equal(JSON.stringify(cpu.attributes),originalAttributes);
assert.equal(JSON.stringify(cpu.personalityProfile.traits),originalTrait);
assert.equal(cpu.personalityProfile.snaps.season,340);
assert.equal(cpu.personalityProfile.snaps.total,10920);
assert.equal(state.news.length,T.CONFIG.newsEntries);
assert.equal(state.simPresentation.gameReports.filter(x=>x.a===0).length,20);
assert.equal(state.simPresentation.gameReports.filter(x=>x.a===2).length,15);
assert.equal(state.simPresentation.pressConferences.length,30);
assert.equal(state.simPresentation.rivalries['0-1'].results.length,2);
assert.ok(state.simPresentation.gameReports.every(r=>r.leaders.every(p=>!('stats' in p))));
assert.ok(state.simPresentation.gameReports.filter(r=>r.year===2025).every(r=>!('originalReport' in r)));

const after=Buffer.byteLength(JSON.stringify(state),'utf8');
assert.ok(after<before);
assert.equal(T.compact(state).entriesPruned,0,'Compaction must be idempotent');
console.log('PASS: user logs untouched, AI training/snap/event detail trimmed, all gameplay data preserved, '+(before-after)+' bytes saved');
