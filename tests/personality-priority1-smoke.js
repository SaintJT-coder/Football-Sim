/* Run: node tests/personality-priority1-smoke.js
   No npm packages. Exercises the real vanilla JS modules in a sandbox. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const positions=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const state={year:2026,week:6,team:0,cap:350,cash:100,news:[],results:[],
  players:positions.map((pos,i)=>({id:i+1,name:'Test '+pos,pos,team:0,age:24,
    rating:75,pot:90,injury:0,morale:65,fatigue:0,years:3,salary:4,stats:{}}))
};
const sandbox={console,Math,Date,state};
sandbox.window=sandbox;
const context=vm.createContext(sandbox);
function load(file){
  const content=fs.readFileSync(path.join(base,file),'utf8');
  new vm.Script(content,{filename:file}).runInContext(context,{timeout:3000});
}
for(const file of ['gridiron-core.js','franchise-systems.js','player-development.js',
  'coaching-philosophy.js','player-personality.js','contracts-advanced.js'])load(file);
sandbox.GMFranchise.init(state);
const mod=sandbox.GMPlayerPersonality;
for(const p of state.players){
  const profile=mod.ensure(p);
  assert.ok(profile.traits.length===2||profile.traits.length===3);
  assert.equal(new Set(profile.traits).size,profile.traits.length);
  assert.ok(mod.ratingModifier(p)>=0&&mod.ratingModifier(p)<=.015);
  assert.ok(mod.performanceModifier(p)>=0&&mod.performanceModifier(p)<=.018);
  assert.ok(mod.holdoutMultiplier(p,state)>=.8&&mod.holdoutMultiplier(p,state)<=1.3);
}
const p=state.players[0];
const first=mod.ensure(p);
assert.deepEqual(mod.ensure(p).traits,first.traits);
const played=mod.recordGame(state,{a:0,b:1},0,.55);
assert.ok(played>=6,'Expected active snap participants');
assert.ok(mod.snapsThisWeek(p,state)>0,'QB did not play');
assert.equal(mod.recordGame(state,{a:0,b:1},0,.55),0,'Game counted twice');
const before=new Map(state.players.map(x=>[x.id,{...x.stats}]));
sandbox.GMDevelopment.weekly(state,before);
assert.ok(p.development.seasonGames>=1,'Active QB lost game XP');
assert.ok(Number.isFinite(p.development.totalXP),'XP corrupted');
const high=mod.usageFatigue(80,p),low=mod.usageFatigue(20,p);
assert.ok(high>low,'Usage must increase fatigue');
assert.ok(mod.usageInjuryRisk(80,p)>mod.usageInjuryRisk(20,p));
const eventLog=mod.midseason(state,()=>0);
assert.ok(eventLog.length>0,'Expected forced breakout events');
assert.equal(mod.midseason(state,()=>0).length,0,'Events repeated within season');
assert.ok(state.playerProgressionEvents.length===eventLog.length);
console.log('PASS: 2–3 traits, play styles, scheme/XP/holdouts, snap counts, usage, breakout idempotence');
