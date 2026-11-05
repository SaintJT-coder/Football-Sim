'use strict';
const assert=require('node:assert/strict');
global.window=global;
global.Gridiron={register(name,api){this[name]=api;}};
require('../possession-sim.js');
const sim=Gridiron.possessionSim;
function side(id,rating=75){
 let next=id*100;
 const depth={};
 for(const [pos,n] of Object.entries({QB:2,RB:3,WR:4,TE:2,OL:6,DL:5,LB:4,CB:4,S:3,K:1})){
   depth[pos]=Array.from({length:n},()=>({id:next++,rating,fatigue:0,wear:0}));
 }
 return {id,depth,attack:0,defense:0,edge:0,special:0,passRate:.55,tempo:0,redZone:'Balanced',blitz:35};
}
const teams=[side(0),side(1)];
const situation={down:2,need:6,spot:80,remaining:90,weather:'Clear'};
assert.ok(sim.passChance(teams[0],{...situation,margin:-7})>sim.passChance(teams[0],{...situation,margin:7}));
const count=400;
let points=0,drives=0,plays=0,homeWins=0,blocks=0,returns=0,overtime=0;
const start=Date.now();
for(let i=0;i<count;i++){
 const input={teams,seed:i*97531+67,weather:sim.CONFIG.weather[i%sim.CONFIG.weather.length]};
 const g=sim.simulate(input);
 if(!i)assert.deepEqual(sim.simulate(input),g);
 for(let side=0;side<2;side++){
   const sum=field=>Array.from(g.deltas).filter(([id])=>Math.floor(id/100)===side).reduce((a,[,row])=>a+(row.stats[field]||0),0);
   assert.equal(sum('passYards'),sum('receivingYards'));
   assert.equal(sum('passTD'),sum('recTD'));assert.equal(sum('completions'),sum('receptions'));
   assert.equal(sum('passYards'),g.lines[side].passYards);assert.equal(sum('rushYards'),g.lines[side].rushYards);
   assert.equal(g.score[side],g.scoring.filter(e=>e.team===side).reduce((a,b)=>a+b.points,0));
   assert.ok(g.lines[side].thirdDownConversions<=g.lines[side].thirdDownAttempts);
 }
 points+=g.score[0]+g.score[1];drives+=g.drives.length;plays+=g.lines[0].plays+g.lines[1].plays;
 homeWins+=Number(g.score[0]>g.score[1]);overtime+=Number(g.scoring.some(e=>e.period>4));
 blocks+=g.specials.filter(x=>x.outcome==='blocked').length;
 returns+=g.specials.filter(x=>x.outcome==='return TD').length;
 assert.notEqual(g.score[0],g.score[1]);
}
console.log({games:count,pointsPerTeam:points/(2*count),drivesPerTeam:drives/(2*count),playsPerTeam:plays/(2*count),homeWins,blocks,returns,overtime,ms:Date.now()-start});
assert.ok(blocks&&returns&&overtime);
assert.ok(drives/(2*count)>=10&&drives/(2*count)<=14);
assert.ok(points/(2*count)>16&&points/(2*count)<31);
