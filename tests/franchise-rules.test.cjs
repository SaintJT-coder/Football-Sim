const test=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../franchise-rules.js');
const teams=Array.from({length:32},(_,i)=>['T'+i,'Club '+i,(i<16?'East':'West')+' '+Math.floor(i%16/4)]);
global.window=global;
global.Gridiron={register(key,api){this[key]=api;}};
require('../possession-sim.js');
const sim=Gridiron.possessionSim;
const fixtures=rules.schedule();
function side(id,rating){
 let next=id*100;
 const depth=Object.fromEntries(Object.entries({QB:2,RB:3,WR:5,TE:2,OL:7,DL:6,LB:5,CB:4,S:3,K:1})
   .map(([pos,n])=>[pos,Array.from({length:n},()=>({id:next++,rating,fatigue:0,wear:0}))]));
 return {id,depth,attack:0,defense:0,edge:0,special:0,passRate:.55,tempo:0,redZone:'Balanced',blitz:35};
}
test('all 32 teams play once in each of 18 weeks',()=>{
 assert.equal(fixtures.length,288);
 for(let team=0;team<32;team++)assert.equal(fixtures.filter(g=>g.a===team).length,9);
 for(let week=1;week<=18;week++){
  const games=fixtures.filter(g=>g.week===week);
  assert.equal(games.length,16);assert.equal(new Set(games.flatMap(g=>[g.a,g.b])).size,32);
 }
});
test('production transaction and postseason integrations',()=>{
 const {execFileSync}=require('node:child_process');
 const path=require('node:path');
 for(const file of ['contracts-priority4-smoke.js','full-engine-integration-smoke.js']){
   execFileSync(process.execPath,[path.join(__dirname,file)],{stdio:'pipe'});
 }
});
test('seed a six-team field and reverse the actual rankings for next year’s draft',()=>{
 const games=fixtures.map(g=>({...g,sa:g.a<g.b?28:14,sb:g.b<g.a?28:14}));
 const rows=rules.standings(teams,games);
 const seeds=rules.seeds(rows,games,'East').slice(0,6);
 assert.equal(seeds.filter(x=>x.divisionWinner).length,4);
 assert.equal(new Set(seeds.map(x=>x.i)).size,6);
 const ranked=rules.rank(rows,games);
 assert.deepEqual(rules.draftOrder(rows,games),ranked.map(r=>r.i).reverse());
 assert.equal(rules.draftOrder(rows,games)[0],31);
 const tie=[{i:0,pct:.5,divPoints:0,divGames:2,diff:-50},{i:1,pct:.5,divPoints:2,divGames:2,diff:50}];
 assert.equal(rules.rank(tie,[{a:0,b:1,sa:7,sb:3}])[0].i,0);
 assert.equal(rules.rank(tie,[])[0].i,1);
});
test('save migration is pure, handles unversioned saves, and recovers from failures',()=>{
 const old={players:[{id:1,morale:0},{id:2}]};
 const value=rules.migrate(old);assert.equal(value.schemaVersion,2);assert.equal(value.players[0].morale,0);
 assert.equal(value.players[1].morale,65);assert.equal(old.players[1].morale,undefined);
 rules.register(2,s=>({...s,extension:true}));
 assert.equal(rules.migrate(old).schemaVersion,3);
 assert.equal(rules.load({...old,schemaVersion:99},()=>42),42);
 delete rules.migrations[2];
 const emptyWeek9=fixtures.filter(g=>g.week!==9);
 const legacy={...old,week:8,engine:{schedule:emptyWeek9}};
 assert.equal(rules.migrate(legacy).engine.schedule.length,288);
 assert.equal(legacy.engine.schedule.length,272);
 assert.equal(rules.migrate({...legacy,week:10}).engine.schedule.length,272);
});
test('cap transactions preserve nonnegative cents or reject',()=>{
 for(let room=0;room<=100;room++)for(let incoming=0;incoming<130;incoming++)
  for(const released of [0,13,29]){
   const ok=rules.canAfford(room/100,incoming/100,released/100);
   assert.equal(ok,room+released>=incoming);
   assert.ok((ok?room+released-incoming:room)>=0);
  }
 assert.equal(rules.canAfford(5,NaN),false);
});
test('morale respects thresholds, workload, contract and results',()=>{
 assert.equal(rules.moraleRating(0),-5);assert.equal(rules.moraleRating(40),0);
 assert.equal(rules.moraleRating(75),0);assert.equal(rules.moraleRating(100),2);
 const p={rating:85,morale:50,salary:12};
 assert.ok(rules.mood(p,52,true,10)>rules.mood(p,5,false,20));
});
test('288 full games in under two seconds, including a play hook',()=>{
 const rosters=teams.map((_,i)=>side(i,75)),start=performance.now();let plays=0;
 for(const [i,g] of fixtures.entries()){
  const result=sim.simulate({teams:[rosters[g.a],rosters[g.b]],weather:'Clear',seed:i+1,
    onPlay:g.a===0||g.b===0?e=>{assert.ok(e.down>=1&&e.down<=4);plays++;}:null});
  assert.ok(result.score[0]!==result.score[1]);
 }
 const elapsed=performance.now()-start;console.log('288 possession games:',Math.round(elapsed),'ms');
 assert.ok(plays>900);assert.ok(elapsed<2000);
});
test('10,000 fixture seasons using sampled possession-engine outcomes',()=>{
 // Estimate probabilities once per strength matchup; resample independent outcomes per fixture.
 // This tests league balance quickly while the separate timing test executes every snap.
 const pool=[70,75,80].map((v,i)=>side(i,v)),rates=[];
 for(let a=0;a<3;a++){rates[a]=[];for(let b=0;b<3;b++){
  let wins=0;const n=250;
  for(let i=0;i<n;i++){
   const result=sim.simulate({teams:[{...pool[a],edge:2},pool[b]],weather:'Clear',seed:17041*(i+1)+31*a+b});
   wins+=Number(result.score[0]>result.score[1]);
  }
  rates[a][b]=wins/n;
 }}
 const rng=sim.random(1234),wins=Array(32).fill(0);
 for(let season=0;season<10000;season++)for(const g of fixtures)
  wins[rng()<rates[g.a%3][g.b%3]?g.a:g.b]++;
 const means=wins.map(n=>n/10000);
 console.log('10,000 season mean win range:',Math.min(...means),Math.max(...means));
 assert.ok(means.every(n=>n>=4&&n<=14));
});
