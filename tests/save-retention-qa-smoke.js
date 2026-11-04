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
const after=Buffer.byteLength(JSON.stringify(state),'utf8');
assert.ok(after<before);
assert.equal(T.compact(state).entriesPruned,0,'Compaction must be idempotent');
console.log('PASS: user logs untouched, AI training/snap/event detail trimmed, all gameplay data preserved, '+(before-after)+' bytes saved');
