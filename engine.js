/* Gridiron GM simulation engine v2 — fictional league, no licensed Madden assets. */
(function(){
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const avg=(xs)=>xs.length?xs.reduce((s,n)=>s+n,0)/xs.length:0;
const pick=(xs)=>xs[Math.floor(Math.random()*xs.length)];
const depth=(team,pos,n=1)=>(window.GMFranchise?GMFranchise.depth(state,team,pos):roster(team).filter(p=>p.pos===pos).sort((a,b)=>b.rating-a.rating)).filter(p=>!(Number(p.injury)>0)&&!p.contractAdvanced?.holdout).slice(0,n);
const scoreTeam=(team)=>{ if(window.GMFranchise){const x=GMFranchise.score(state,team);return {off:x.offense,def:x.defense,spec:x.special};}
 const unit=(positions)=>avg(positions.flatMap(([pos,n])=>depth(team,pos,n).map(p=>p.rating*(1-(p.fatigue||0)*.003)+((p.morale??65)-65)*.06)));
 const off=unit([['QB',1],['RB',1],['WR',3],['TE',1],['OL',5]]);
 const def=unit([['DL',3],['LB',3],['CB',2],['S',2]]);
 const spec=unit([['K',1]]);
 return {off:off||58,def:def||58,spec:spec||60};
};
const freshSchedule=()=>GMFranchiseRules.schedule(TEAMS.length);
function setup(){
 window.GMFranchise?.init(state);
 state.engine??={version:2,season:state.year,schedule:freshSchedule(),career:{},awards:[],playoffs:[],log:[]};
 let e=state.engine;
 if(e.season!==state.year){e.season=state.year;e.schedule=freshSchedule()}
 for(const p of state.players){
  p.fatigue??=0;p.morale??=65;p.form??=0;p.development??=0;
  p.stats??={yards:0,td:0,tackles:0,sacks:0};
  p.stats.attempts??=0;p.stats.completions??=0;p.stats.interceptions??=0;
  p.stats.rushYards??=0;p.stats.receivingYards??=0;p.stats.receptions??=0;
  p.stats.passYards??=0;p.stats.rushTD??=0;p.stats.recTD??=0;
  p.stats.passTD??=0;p.stats.games??=0;
 }
 return e;
}
const SIM_CONFIG={formWeight:.13,lateFormWeight:.20,restFatigue:9,wearPerSnap:.075,wearPerContact:.18,
  fatiguePerSnap:.13,formDecay:.72,bonusRest:2,formWindow:4};
function buildSide(team,g,rng,home,round){
 const sim=Gridiron.possessionSim.CONFIG;
 const own=team===state.team,scheme=window.GMFranchise?.scheme(state,team,'offense');
 const coach=own?window.GMCoaching?.gamePlan(state):null;
 const weekly=window.GMWeeklyGameplan?.matchup(state,g,team)||{};
 const staff=role=>window.GMStaff?.gameModifier(state,team,role)||0;
 const plan=own?state.gameplay||{}:{};
 const depth={};
 for(const pos of ['QB','RB','WR','TE','OL','DL','LB','CB','S','K','P']){
   const ordered=window.GMFranchise?.depth(state,team,pos)||roster(team).filter(p=>p.pos===pos);
   depth[pos]=[];
   for(const p of ordered){
     const clearance=window.GMInjuries?.clearance(p)||(p.injury?'OUT':'FULL');
     if(clearance==='OUT'||p.contractAdvanced?.holdout||['IR','PUP'].includes(p.rosterStatus)||
       (p.rosterStatus==='PRACTICE'&&!p.weeklyElevation?.active))continue;
     if(clearance==='QUESTIONABLE'&&rng()>sim.questionableChance)continue;
     const medical=window.GMInjuries?.staff(state,team)??70;
     const role=pos==='QB'?'pass':pos==='RB'?'run':['TE','WR'].includes(pos)?'receive':'defense';
     const personality=window.GMPlayerPersonality?.performanceModifier(p,role)||0;
     const ability=window.GMDevelopment?.abilityBoost(p,{playType:role,scheme})||0;
     depth[pos].push({id:p.id,rating:p.rating*(1+personality+ability)+GMFranchiseRules.moraleRating(p.morale)+(window.GMWeeklyGameplan?.playerBoost(p,state)||0),
       accuracy:p.attributes?.kickAccuracy,power:p.attributes?.kickPower,fatigue:p.fatigue,wear:p.medical?.wear||0,limited:clearance!=='FULL',
       conditioning:(window.GMStaff?.conditioning(p,state)?.injuryMultiplier??1)*(p.morale>75?.93:1),
       returnRisk:(p.medical?.returnWeeks||p.medical?.active)?1+(p.medical.active?.risk??.22)*(1.8-(medical-50)/65):1});
   }
 }
 const recent=(state.engine.form||{})[team]||0;
 const form=clamp(recent*(round||state.week>=12?SIM_CONFIG.lateFormWeight:SIM_CONFIG.formWeight),-sim.formCap,sim.formCap);
 const venue=home?(round?sim.playoffHome:sim.home)+(own?(window.GMOwner?.modifiers(state).homeField||0):0):0;
 const stable=round==='Super Bowl'||round==='Conference Final';
 const rivalry=window.GMSimPresentation?.pregameBoost(state,g,team)||0;
 return {id:team,depth,passRate:(coach?.passShare??sim.passRate)+(own?(state.weeklyOperations?.plan?.offense==='Aggressive'?.06:state.weeklyOperations?.plan?.offense==='Conservative'?-.06:0):0)+(scheme==='Air Raid'?.10:scheme==='Power Run'?-.10:0)+
    (plan.offense==='PASS HEAVY'?.10:plan.offense==='RUN HEAVY'?-.10:0),
   redZone:coach?.redZone||'Balanced',blitz:coach?.blitz??35,tempo:(coach?.tempo||0)+(plan.tempo==='AGGRESSIVE'?3:plan.tempo==='CONSERVATIVE'?-3:0),
   attack:staff('offense')+(weekly.offense||0)+(coach?.offSynergy||0)*.3+rivalry*50,
   defense:staff('defense')+(weekly.defense||0)+(coach?.defSynergy||0)*.3,special:staff('special'),
   edge:form+venue+(rng()-.5)*sim.executionNoise*(stable?sim.lateRoundVariance:1)};
}
function game(g,round=null){
 const sim=Gridiron.possessionSim,seed=Math.floor(Math.random()*4294967296),rng=sim.random(seed);
 const weather=sim.CONFIG.weather[Math.floor(rng()*sim.CONFIG.weather.length)];
 const teams=[buildSide(g.a,g,rng,round!=='Super Bowl',round),buildSide(g.b,g,rng,false,round)];
 const own=g.a===state.team||g.b===state.team;
 const log=[];
 const onPlay=own?play=>{
   log.push(play);Gridiron.emit('game:play',{game:g,play});
 }:null;
 const result=sim.simulate({teams,weather,seed,onPlay},rng);
 if(own)state.engine.lastPlayLog={year:state.year,week:g.week,a:g.a,b:g.b,round,plays:log};
 const [sa,sb]=result.score;
 Object.assign(g,{year:state.year,sa,sb});
 const injuries=new Set(result.injuries),keyInjuries=[];
 const rows=state.players.filter(p=>p.team===g.a||p.team===g.b);
 for(const p of rows){
   const row=result.deltas.get(p.id);
   if(!p.injury&&p.rosterStatus!=='PRACTICE')p.morale=GMFranchiseRules.mood(p,row?.snaps||0,(sa>sb?g.a:g.b)===p.team,Math.max(1,(p.rating-60)*.48));
   if(!row)continue;
   if(round){
     const archive=state.engine.postseasonStats??={};
     const record=archive[p.id]??={games:0};
     record.games++;for(const [key,n] of Object.entries(row.stats))record[key]=(record[key]||0)+n;
   }else{
     for(const [key,n] of Object.entries(row.stats))p.stats[key]=(p.stats[key]||0)+n;
     p.stats.games++;
   }
   p.medical??={active:null,chronicRisk:0,longTermLoss:0};
   p.medical.wear=Math.min(100,Math.round((p.medical.wear||0)+row.snaps*SIM_CONFIG.wearPerSnap+row.contacts*SIM_CONFIG.wearPerContact));
   p.fatigue=clamp((p.fatigue||0)+Math.round(row.snaps*SIM_CONFIG.fatiguePerSnap+row.contacts*.18),0,100);
   if(injuries.has(p.id)){
     if(p.medical.active){p.medical.active.weeks+=1;p.medical.active.playThrough=false;p.injury=p.medical.active.weeks;}
     else if(window.GMInjuries)GMInjuries.randomInjury(p,state);
     else p.injury=1;
     keyInjuries.push({team:p.team,name:p.name,weeks:p.injury});
   }
 }
 state.engine.form??={};
 for(const [i,t] of teams.entries()){
   const margin=result.score[i]-result.score[1-i];
   state.engine.form[t.id]=(state.engine.form[t.id]||0)*SIM_CONFIG.formDecay+clamp(margin,-21,21)*(1-SIM_CONFIG.formDecay);
   if(!round)window.GMPlayerPersonality?.recordGame(state,g,t.id,result.lines[i].passShare,result.deltas);
 }
 g.report={weather,quarters:{home:result.quarters[0],away:result.quarters[1]},teams:result.lines,keyInjuries,
   summary:TEAMS[sa>sb?g.a:g.b][1]+' wins '+Math.max(sa,sb)+'–'+Math.min(sa,sb)+'.'};
 if(g.a===state.team||g.b===state.team){
   g.report.drives=result.drives;g.report.specialTeams=result.specials;g.report.seed=seed;
   g.events=result.scoring.filter(x=>x.points>1).map(x=>({quarter:x.period,description:TEAMS[x.team][0]+' · '+x.label}));
 }
 return g;
}
function simulateV2(){
 setup();
 if(state.week>18){endSeasonV2();return}
 if(window.GMRosterRules){const check=GMRosterRules.validate(state,state.team);if(!check.ok){alert(check.issues.join(', '));return}}
 window.GMWeeklyGameplan?.beginWeek(state);
 const games=state.engine.schedule.filter(g=>g.week===state.week);
 window.GMContractsAdvanced?.weekly(state);
 window.GMStaff?.weekly(state);
 window.GMCoaching?.weekly(state);
 window.GMPlayerPersonality?.weeklyMorale(state);
 window.GMRosterRules?.weekly(state);
 window.GMInjuries?.weekly(state);
 const devBefore=new Map(state.players.filter(p=>p.team>=0).map(p=>[p.id,{...p.stats}]));
 if(!games.length){window.Gridiron?.emit('week:bye',{state,year:state.year,week:state.week});window.GMWeeklyGameplan?.finishWeek(state,devBefore);window.GMOwner?.weekly(state);window.GMImmersion?.afterWeek(state);state.news.unshift('League-wide bye week complete.');state.week++;selectedWeek=state.week;save();render();return}
 const e=extraStore(),plan=e.plan||'Game Week',intensity=e.intensity||'Normal';
 for(const g of games){const beforeGame=window.GMLeagueNarratives?.snap(state,g);const result=game({...g});state.results.push(result);window.GMSimPresentation?.report(state,result);window.GMLeagueNarratives?.afterGame(state,result,beforeGame)}
 window.GMLeagueNarratives?.weekly(state);
 window.Gridiron?.emit('week:games-complete',{state,year:state.year,week:state.week,games:state.results.filter(g=>g.year===state.year&&g.week===state.week)});
 window.GMDevelopment?.weekly(state,devBefore);
 window.GMWeeklyGameplan?.finishWeek(state,devBefore);
 window.GMPlayerPersonality?.midseason(state);
 if(window.GMContractsAdvanced)for(const p of state.players.filter(x=>x.team>=0))GMContractsAdvanced.incentiveCheck(p,state,{teamWins:record(p.team).w});
 for(const p of state.players){
  const recovery=(plan==='Recovery'?18:plan==='Development'?7:12)+(window.GMOwner?.modifiers(state).fatigueRecovery||0)+(window.GMStaff?.conditioning(p,state).fatigueRecovery||0);
  p.fatigue=clamp(p.fatigue-recovery+(intensity==='High'?5:intensity==='Low'?-5:0),0,100);
  if(!window.GMDevelopment&&p.age<29&&p.rating<p.pot&&p.development>=5){p.rating++;p.development-=5}
 }
 e.trainingPoints=clamp((e.trainingPoints||0)+(plan==='Development'?5:plan==='Recovery'?2:3),0,30);
 window.GMOwner?.weekly(state);
 const rec=record(state.team);e.jobSecurity=clamp((e.jobSecurity??60)+(rec.w>=rec.l?2:-2),0,100);
 state.cash+=rand(2,8);state.news.unshift('Week '+state.week+' complete: '+rec.w+'-'+rec.l+' season record');
 window.GMImmersion?.afterWeek(state);
 state.week++;selectedWeek=state.week;save();render();
}
function endSeasonV2(){
 setup();
 const games=state.results.filter(g=>g.year===state.year);
 const rows=GMFranchiseRules.standings(TEAMS,games);
 const standings=GMFranchiseRules.rank(rows,games).map(r=>({i:r.i,rec:r}));
 state.engine.nextDraftOrder=GMFranchiseRules.draftOrder(rows,games);
 const playoffs=[];
 state.engine.postseasonStats={};
 const conferences=[...new Set(TEAMS.map(t=>t[2].split(' ')[0]))];
 const seeded=conferences.map(conf=>GMFranchiseRules.seeds(rows,games,conf).slice(0,6));
 function playoffGame(a,b,round,conf){
   if(round!=='Super Bowl'&&a.seed>b.seed)[a,b]=[b,a];
   for(const club of [a,b]){
     const bye=round==='Divisional'&&club.seed<=2;
     const extra=round==='Super Bowl'||bye;
     const restWeeks=extra?2:1;
     for(let week=0;week<restWeeks;week++)window.GMInjuries?.weekly(state,club.i);
     const travel=round!=='Super Bowl'&&club===a?SIM_CONFIG.bonusRest:0;
     for(const p of roster(club.i))p.fatigue=Math.max(0,(p.fatigue||0)-SIM_CONFIG.restFatigue*restWeeks-travel);
   }
   const result=game({a:a.i,b:b.i,week:state.week,round,conference:conf},round);
   const winner=result.sa>result.sb?a:b;
   result.winner=winner.i;playoffs.push(result);
   return winner;
 }
 const finalists=seeded.map((clubs,i)=>{
   const conf=conferences[i];
   const wild=[playoffGame(clubs[2],clubs[5],'Wild Card',conf),playoffGame(clubs[3],clubs[4],'Wild Card',conf)];
   wild.sort((a,b)=>b.seed-a.seed);
   const divisional=[playoffGame(clubs[0],wild[0],'Divisional',conf),playoffGame(clubs[1],wild[1],'Divisional',conf)];
   return playoffGame(divisional[0],divisional[1],'Conference Final',conf);
 });
 const champion=playoffGame(finalists[0],finalists[1],'Super Bowl','League');
 const champ=champion.i,final=playoffs[playoffs.length-1];
 const runner=final.a===champ?final.b:final.a;
 state.history.push({year:state.year,champ:TEAMS[champ][1],runner:TEAMS[runner??standings[1].i][1]});
 state.champions.push(champ);
 window.GMLeagueNarratives?.championship(state,champ,runner??standings[1].i);
 const legacyMVP=[...state.players].filter(p=>p.pos==='QB').sort((a,b)=>(b.stats.passYards+b.stats.passTD*20-b.stats.interceptions*35)-(a.stats.passYards+a.stats.passTD*20-a.stats.interceptions*35))[0];
 const leagueHonors=window.GMLeagueNarratives?.seasonEnd(state);
 state.awards.push({year:state.year,mvp:leagueHonors?.mvp?.name||legacyMVP?.name||'—',
  offense:leagueHonors?.offense?.name||'—',defense:leagueHonors?.defense?.name||'—',
  rookie:leagueHonors?.rookie?.name||'—'});
 window.GMOwner?.seasonEnd(state,{champion:champ===state.team,playoffs:playoffs.some(g=>g.a===state.team||g.b===state.team),division:seeded.some(c=>c.some(t=>t.divisionWinner&&t.i===state.team))});
 window.GMStaff?.seasonEnd(state);
 window.GMSeasonRecap?.generate(state,standings,playoffs,state.awards);
 window.Gridiron?.emit('season:complete',{state,year:state.year,champion:champ,playoffs});
 state.engine.playoffs=playoffs;state.engine.playoffYear=state.year;state.engine.awards.push(state.awards.at(-1));
 const contractContext=Object.fromEntries(TEAMS.map((_,i)=>[i,{teamWins:record(i).w,playoffs:playoffs.some(g=>g.a===i||g.b===i)}]));
 window.GMContractsAdvanced?.season(state,contractContext);
 window.GMDraftRealism?.seasonEnd(state);
 window.GMContractEconomy?.seasonEnd(state,contractContext);
 for(const p of state.players){
  if(p.team===-2)continue; // Already retired; never age or retire a second time.
  p.age++;p.years--;p.fatigue=0;p.morale=clamp(p.morale+5,20,100);
  if(p.age>34&&Math.random()<clamp((p.age-33)*.09*(p.morale<40?1.18:1),0,.75)){const retired={...p,retiredYear:state.year};state.retired.push(retired);window.GMSimPresentation?.retirement(state,retired);p.team=-2}
  else if(p.years<=0){
    if(p.team>=0){p.lastContractTeam=p.team;p.freeAgentSince=state.year}
    else p.freeAgentSince??=state.year;
    p.team=-1;p.years=1;
  }
  if(window.GMDevelopment)GMDevelopment.aging(p);else p.rating=clamp(p.rating+(p.age<27?rand(0,2):p.age>31?rand(-3,0):rand(-1,1)),45,p.pot);
  p.stats={yards:0,td:0,tackles:0,sacks:0};
 }
 // Older saves may hold retired players in BOTH state.players and state.retired.
 // Preserve their career snapshots in the archive, but keep them out of the
 // live player pool and remove historical duplicates by stable player ID.
 const seenRetirees=new Set();
 state.retired=(state.retired||[]).filter(p=>{
   if(!p||p.id==null)return true;
   const key=String(p.id);
   if(seenRetirees.has(key))return false;
   seenRetirees.add(key);
   return true;
 });
 for(const p of state.players)if(p.team===-2){
   const key=p.id==null?null:String(p.id);
   if(key!==null&&!seenRetirees.has(key)){
     state.retired.push({...p,retiredYear:p.retiredYear||state.year});
     seenRetirees.add(key);
   }
 }
 state.players=state.players.filter(p=>p.team!==-2);
 window.GMLeaguePlayerLifecycle?.prune(state);
 window.GMSimPresentation?.season(state);
 state.year++;state.week=1;state.results=[];
 window.GMContractEconomy?.advanceYear(state);
 window.GMOwner?.nextSeason(state);state.cash+=35;state.deadCap=0;
 state.engine.form={};state.engine.season=state.year;state.engine.schedule=freshSchedule();
 state.news.unshift(TEAMS[champ][1]+' won the '+(state.year-1)+' championship!');
 save();render();
 if(champ===state.team&&typeof window.launchChampionshipCelebration==='function')window.launchChampionshipCelebration(TEAMS[champ][1],state.year-1);
}
// Advance through the same public weekly hooks. Intermediate screens are never
// shown during this synchronous operation, so serialize and draw only once.
window.simulateRegularSeason=function(){
 if(state.week>18)return;
 const persist=save,draw=render,checkpoint=JSON.stringify(state);
 try{
   save=()=>{};render=()=>{};
   while(state.week<=18){
     const week=state.week;simulate();
     if(state.week===week)break; // roster validation or a cancelled week
   }
 }catch(error){state=JSON.parse(checkpoint);selectedWeek=state.week;throw error;}
 finally{save=persist;render=draw;persist();draw();}
};
function scheduleV2(){
 setup();
 const games=state.engine.schedule.filter(g=>g.week===selectedWeek);
 return title('Season Schedule',state.year+' · Week '+state.week+' of 18 · All matchups locked in before kickoff','LEAGUE SCHEDULE')
 +'<button class="primary" onclick="simulate()">Simulate Week '+state.week+'</button>'
 +(state.week<=18?'<button onclick="simulateRegularSeason()">Simulate to playoffs</button>':'')
 +'<div class="filters">'+Array.from({length:18},(_,i)=>'<button class="'+(selectedWeek===i+1?'selected':'')+'" onclick="selectedWeek='+(i+1)+';render()">W'+(i+1)+'</button>').join('')+'</div>'
 +'<div class="grid two">'+games.map(g=>{const result=state.results.find(x=>x.year===state.year&&x.week===selectedWeek&&x.a===g.a&&x.b===g.b);return '<div class="card"><div class="eyebrow">'+(result?'FINAL':'UPCOMING')+'</div><div class="row"><b>'+TEAMS[g.a][1]+'</b><b>'+(result?result.sa:'—')+'</b></div><div class="row"><b>'+TEAMS[g.b][1]+'</b><b>'+(result?result.sb:'—')+'</b></div></div>'}).join('')+'</div>';
}
function dashboardV2(){
 setup();const r=roster(),rec=record(state.team),power=scoreTeam(state.team);
 return title(TEAMS[state.team][1],TEAMS[state.team][2]+' · '+state.year+' · Week '+state.week,'FRANCHISE COMMAND CENTER')
 +'<div class="banner row"><div><h2>'+TEAMS[state.team][1]+'</h2><span class="muted">Build your dynasty</span></div><div><h2>'+rec.w+'-'+rec.l+'</h2><span class="muted">Season record</span></div></div>'
 +'<button class="primary wide" onclick="simulate()"> '+(state.week>18?'Advance to Offseason':'Simulate Week '+state.week)+'</button>'
 +'<div class="grid three">'+metric('Offense',Math.round(power.off))+metric('Defense',Math.round(power.def))+metric('Special Teams',Math.round(power.spec))+metric('Cap Room',money(capspace()))+metric('Cash',money(state.cash))+metric('Roster',r.length)+'</div>'
 +heading('PLAYER CONDITION')+'<div class="grid three">'+metric('Average morale',Math.round(avg(r.map(p=>p.morale||65))))+metric('Average fatigue',Math.round(avg(r.map(p=>p.fatigue||0)))+'%')+metric('Injuries',r.filter(p=>p.injury>0).length)+'</div>'
 +heading('TOP CONTRIBUTORS')+r.sort((a,b)=>b.rating-a.rating).slice(0,5).map(p=>playerRow(p)).join('')
 +heading('LATEST NEWS')+state.news.slice(0,6).map(n=>'<div class="card" style="margin:8px 0">'+xp(n)+'</div>').join('');
}
const priorRender=render;
render=function(){
 setup();
 if(page==='Dashboard'){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=dashboardV2();return}
 if(page==='Schedule'){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=scheduleV2();return}
 priorRender();
};
simulate=simulateV2;
endSeason=endSeasonV2;
setup();render();
})();
