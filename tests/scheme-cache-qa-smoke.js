/* Regression: scheme lookups must not remigrate the whole roster per snap.
   Run: node tests/scheme-cache-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../franchise-systems.js'),'utf8');
let playerScans=0;
const samplePlayers=Array.from({length:960},(_,i)=>({
 id:i,name:'Athlete '+i,team:Math.floor(i/30),pos:'QB',
 rating:75,age:25,pot:88,injury:0,fatigue:0,morale:65
}));
const players=new Proxy(samplePlayers,{
 get(target,key,receiver){
  if(key===Symbol.iterator)playerScans++;
  return Reflect.get(target,key,receiver);
 }
});
const context={window:null,Math,TEAMS:Array.from({length:32},(_,i)=>['T'+i,'Club '+i,'Union North'])};
context.window=context;
vm.createContext(context);
new vm.Script(source,{filename:'franchise-systems.js'}).runInContext(context);
const s={players,team:0,year:2026,week:1};
const F=context.GMFranchise;
F.init(s);playerScans=0;
for(let i=0;i<2000;i++){
 assert.equal(F.scheme(s,i%32,'offense'),'Balanced');
 assert.equal(F.scheme(s,i%32,'defense'),'Cover 3');
}
assert.equal(playerScans,0,
 'Scheme queries should not repeatedly migrate the entire player pool');
s.franchiseSystems.schemes[1]={offense:'Air Raid',defense:'Man Heavy'};
assert.equal(F.scheme(s,1,'offense'),'Air Raid');
assert.equal(F.scheme(s,1,'defense'),'Man Heavy');
// After a real reload a missing state module should still initialize itself.
const fresh={year:2027,week:1,players:samplePlayers,team:2};
assert.equal(F.scheme(fresh,2,'offense'),'Balanced');
assert.ok(fresh.franchiseSystems,'Fresh state should initialize on demand');
console.log('PASS: 4,000 scheme lookups without a player-pool scan, preserved custom schemes and lazy initialization');
