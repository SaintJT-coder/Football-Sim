/* League free-agent market retention without loss of career archives.
   Run: node tests/freeagent-lifecycle-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../league-player-lifecycle.js'),'utf8');
const scope={window:null,Gridiron:{register:()=>{}}};scope.window=scope;
vm.createContext(scope);new vm.Script(script).runInContext(scope);
const M=scope.GMLeaguePlayerLifecycle;
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const protectedIds=new Set();
const players=Array.from({length:1080},(_,i)=>{
 const own=i%35===0;
 if(own)protectedIds.add(i+100);
 return {
  id:i+100,team:-1,name:'Unsigned Player '+i,pos:POS[i%POS.length],
  age:24+i%15,rating:45+(i%45),pot:75,freeAgentSince:2029,
  lastContractTeam:own?0:((i%31)+1),
  careerStats:{passYards:i*4,td:i%12},
  contractAdvanced:{baseSalaries:[3,4,5]},
  attributes:{speed:70+(i%20)}
 };
});
players.push({id:2,team:0,name:'User Franchise QB',pos:'QB',rating:91,careerStats:{passYards:9800}});
const s={team:0,year:2029,players,news:[],departedPlayers:[]};
const before=s.players.length;
const originalCareer=Object.fromEntries(players.filter(p=>p.team===-1)
 .map(p=>[p.id,p.careerStats.passYards]));
const result=M.prune(s);
assert.equal(result.ok,true);
assert.equal(result.retained,M.CONFIG.activeFreeAgents);
assert.equal(s.players.length,1+M.CONFIG.activeFreeAgents);
assert.equal(result.exited,before-s.players.length);
assert.ok(s.players.some(p=>p.id===2),'Active user player was pruned');
for(const id of protectedIds)assert.ok(s.players.some(p=>p.id===id),
 'Recent user free agent '+id+' was not protected');
for(const pos of POS){
 assert.ok(s.players.filter(p=>p.pos===pos&&p.team===-1).length>=M.CONFIG.perPositionFloor);
}
assert.equal(s.departedPlayers.length,result.exited);
assert.ok(s.departedPlayers.every(p=>p.careerStats.passYards===originalCareer[p.id]));
assert.ok(s.departedPlayers.every(p=>!('contractAdvanced' in p)&&!('attributes' in p)));
assert.equal(M.prune(s).exited,0,'Pruning must be idempotent');
assert.ok(s.news[0].includes('unsigned players exited'));
console.log('PASS: 1,080 free agents reduced to 300, own exits protected, positional balance and career archives preserved');
