/* Multi-season stability and save-size stress test.
   Run: node tests/multiseason-stress-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const modules=[
 'franchise-rules.js','gridiron-core.js','franchise-systems.js','player-development.js',
 'coaching-philosophy.js','coaching-staff.js','player-personality.js',
 'roster-rules.js','weekly-gameplan.js','owner-franchise.js',
 'injury-medical.js','season-recap.js','draft-scouting-advanced.js',
 'draft-realism.js','simulation-presentation.js','franchise-relocation.js',
 'league-narratives.js','contracts-advanced.js','contract-economy.js',
 'save-retention.js','league-player-lifecycle.js',
 'possession-sim.js','engine.js','frontoffice.js','presentation-immersion.js'
];
const names=['North','South','East','West'];
const TEAMS=Array.from({length:32},(_,i)=>[
 'T'+i,'Team '+i,(i<16?'Union':'Liberty')+' '+names[Math.floor((i%16)/4)]
]);
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
let nextId=0;
const players=TEAMS.flatMap((_,t)=>Array.from({length:30},(_,j)=>({
 id:nextId++,name:'Sim Player '+t+' '+j,team:t,pos:POS[j%10],
 rating:68+j%21,pot:95,age:23+j%11,years:4,salary:4,
 fatigue:0,injury:0,morale:65,rosterStatus:'ACTIVE',
 stats:{yards:0,td:0,tackles:0,sacks:0}
})));
const state={
 year:2026,week:1,team:0,players,results:[],news:[],
 history:[],awards:[],champions:[],retired:[],
 cash:180,cap:350,deadCap:0,selectedTrade:1,upgrades:{}
};
const scope={
 window:null,TEAMS,state,console,Math,
 GridIron:{},page:'QA',selectedWeek:1,
 rand:(a,b)=>Math.floor(Math.random()*(b-a+1))+a,
 roster:(t=state.team)=>state.players.filter(p=>p.team===t),
 record:t=>state.results.filter(g=>g.year===state.year&&(g.a===t||g.b===t))
   .reduce((w,l)=>{if((l.sa>l.sb?l.a:l.b)===t)w.w++;else w.l++;return w},{w:0,l:0}),
 extraStore:()=>state.engineExtra??={},
 save:()=>{},render:()=>{},simulate:()=>{},endSeason:()=>{},
 nav:()=>{},title:()=>'',metric:()=>'',heading:()=>'',money:()=>'',capspace:()=>250,
 playerRow:()=>'',xp:x=>x,$:()=>({innerHTML:'',textContent:''}),
 alert:message=>{throw Error('SIMULATION ALERT: '+message)},
 notice:message=>{throw Error('SIMULATION NOTICE: '+message)}
};
scope.window=scope;
const context=vm.createContext(scope);
for(const filename of modules){
 const code=fs.readFileSync(path.join(__dirname,'..',filename),'utf8');
 new vm.Script(code,{filename}).runInContext(context,{timeout:10000});
}

let peakSaveBytes=0;
scope.save=()=>{
 scope.GMLeaguePlayerLifecycle?.prune(state);
 scope.GMSaveRetention?.compact(state);
 peakSaveBytes=Math.max(peakSaveBytes,Buffer.byteLength(JSON.stringify(state),'utf8'));
};
const seasons=5,metrics=[];
for(let season=0;season<seasons;season++){
 const year=2026+season;
 assert.equal(state.year,year,'Year at season opening');
 assert.equal(state.week,1,'Week at season opening');
 const beforeDraft=state.players.length+(state.frontOffice?.unsigned?.length||0);
 scope.autoDraft();
 const draftPicks=state.frontOffice.draftLog.length;
 assert.equal(draftPicks,224,'Seven-round draft not completed for '+year);
 assert.equal(state.players.length+(state.frontOffice?.unsigned?.length||0),beforeDraft+224,'Rookie player count for '+year);
 const activeBeforeCuts=scope.GMRosterRules.count(state,state.team).ACTIVE;
 if(activeBeforeCuts>53){
   const cuts=scope.GMRosterRules.autoPracticeCuts(state,state.team);
   assert.equal(cuts.ok,true,'Cannot make valid 53-man practice squad cuts');
   assert.equal(scope.GMRosterRules.count(state,state.team).ACTIVE,53);
 }
 for(let week=1;week<=18;week++){
   assert.equal(state.week,week,'Simulation stalled in '+year+' W'+week);
   try{scope.simulate()}catch(e){
     const roster=state.players.filter(p=>p.team===state.team);
     const positions=Object.fromEntries([...new Set(roster.map(p=>p.pos))]
       .map(pos=>[pos,roster.filter(p=>p.pos===pos).length]));
     throw new Error('SIMULATION FAILURE '+year+' W'+week+
       ' roster='+roster.length+' positions='+JSON.stringify(positions)+': '+e.stack);
   }
 }
 assert.equal(state.week,19,'Regular season did not end');
 const games=state.results.filter(g=>g.year===year);
 assert.equal(games.length,288,'Expected 288 results in '+year);
 assert.equal(new Set(games.flatMap(g=>[g.a,g.b])).size,32);
 const preSeasonSize=Buffer.byteLength(JSON.stringify(state),'utf8');
 scope.simulate();
 assert.equal(state.year,year+1,'Offseason transition after '+year);
 assert.equal(state.week,1);
 assert.equal(state.results.length,0,'Season results not reset');
 assert.equal(state.seasonRecaps[0].year,year);
 assert.equal(state.leagueNarratives.honors[0].year,year);
 const cap=state.cap,active=state.players.filter(p=>p.team===state.team).length,
   inactiveRetired=state.players.filter(p=>p.team===-2).length,
   freeAgents=state.players.filter(p=>p.team===-1).length,
   bytes=Buffer.byteLength(JSON.stringify(state),'utf8');
 const row={year,games:games.length,draftPicks,active,freeAgents,inactiveRetired,
   peakSaveMiB:+(peakSaveBytes/1048576).toFixed(2),
   totalPlayers:state.players.length,preOffseasonMiB:+(preSeasonSize/1048576).toFixed(2),
   savedMiB:+(bytes/1048576).toFixed(2),salaryCap:cap};
 metrics.push(row);
 console.log('SEASON '+JSON.stringify(row));
 if(bytes>=4*1024*1024){
   const largest=Object.entries(state)
     .map(([key,val])=>({key,MiB:+(Buffer.byteLength(JSON.stringify(val),'utf8')/1048576).toFixed(3)}))
     .sort((a,b)=>b.MiB-a.MiB).slice(0,12);
   console.log('STATE SIZE BREAKDOWN '+year+' '+JSON.stringify(largest));
   const playerFields={};
   for(const player of state.players)for(const [key,value] of Object.entries(player)){
     playerFields[key]=(playerFields[key]||0)+
       Buffer.byteLength(JSON.stringify(value),'utf8')+key.length+4;
   }
   console.log('PLAYER FIELD SIZES '+year+' '+JSON.stringify(Object.entries(playerFields)
      .map(([key,size])=>({key,MiB:+(size/1048576).toFixed(3)}))
      .sort((a,b)=>b.MiB-a.MiB).slice(0,18)));

 }
 assert.ok(Number.isFinite(cap),'Salary cap became nonfinite');
 assert.ok(active>0,'User has no contracted players');
 assert.ok(freeAgents<=scope.GMLeaguePlayerLifecycle.CONFIG.activeFreeAgents,
   'Free-agent supply grew beyond market cap');
 assert.ok(bytes<5*1024*1024,'Postseason save exceeds 5 MiB safety budget');
 assert.ok(peakSaveBytes<5*1024*1024,
   'An intermediate weekly save exceeded the 5 MiB safety budget');
 peakSaveBytes=0;
}
assert.equal(state.seasonRecaps.length,seasons);
assert.equal(state.leagueNarratives.honors.length,seasons);
console.log('PASS five full seasons: draft, 18-game schedule, playoffs, cap, records and save growth');
