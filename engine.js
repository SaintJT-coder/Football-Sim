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
const freshSchedule=()=>{
 const teams=Array.from({length:TEAMS.length},(_,i)=>i),schedule=[];
 for(let round=0;round<17;round++){
  const week=round===8?18:round+1;
  for(let i=0;i<16;i++){
   const a=teams[i],b=teams[31-i];
   schedule.push({a:round%2?b:a,b:round%2?a:b,week});
  }
  teams.splice(1,0,teams.pop());
 }
 return schedule;
};
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
const noise=(m=1)=> (Math.random()+Math.random()+Math.random()-1.5)*m;
const points=(off,def,home)=>clamp(Math.round(23+(off-def)*.6+noise(17)+(home?1.5:0)),3,56);
const distribute=(players,total,field,weights)=>{
 if(!players.length)return;
 const ws=players.map(weights),sum=ws.reduce((a,b)=>a+b,0)||1;
 let allocated=0;
 players.forEach((p,i)=>{let n=i===players.length-1?total-allocated:Math.max(0,Math.round(total*ws[i]/sum));allocated+=n;p.stats[field]=(p.stats[field]||0)+n});
};
function gameContext(g){
 const weather=['Clear','Clear','Clear','Rain','Wind','Snow','Extreme Cold'][rand(0,6)];
 const streak=t=>{let xs=state.results.filter(x=>x.year===state.year&&(x.a===t||x.b===t)).slice(-4).reverse(),n=0,sign=0;for(const x of xs){const won=x.a===t?x.sa>x.sb:x.sb>x.sa;const z=won?1:-1;if(sign&&z!==sign)break;sign=z;n+=z}return clamp(n,-4,4)};
 const homeStreak=streak(g.a),awayStreak=streak(g.b);
 return {weather,homeField:1.5+(state.week>=12?0.5:0)+(TEAMS[g.a][2]===TEAMS[g.b][2]?0.5:0),homeStreak,awayStreak};
}
function buildReport(g,context,teamLines){
 const quarter=(points)=>{const w=[.19,.26,.24,.31].map(x=>x*(.75+Math.random()*.5)),sum=w.reduce((a,b)=>a+b,0);let out=w.map(x=>Math.floor(points*x/sum));let left=points-out.reduce((a,b)=>a+b,0);while(left-->0)out[rand(0,3)]++;return out};
 const h=quarter(g.sa),a=quarter(g.sb);
 return {weather:context.weather,quarters:{home:h,away:a},teams:teamLines,
 summary:TEAMS[g.sa>g.sb?g.a:g.b][1]+' defeated '+TEAMS[g.sa>g.sb?g.b:g.a][1]+' '+Math.max(g.sa,g.sb)+'–'+Math.min(g.sa,g.sb)+' in '+context.weather.toLowerCase()+' conditions.',
 keyInjuries:state.players.filter(p=>(p.team===g.a||p.team===g.b)&&p.injury>0).slice(0,5).map(p=>({name:p.name,team:p.team,weeks:p.injury}))};
}
function game(g){
 const a=scoreTeam(g.a),b=scoreTeam(g.b);
 const staffBonus=(team,role)=>window.GMStaff?.gameModifier(state,team,role)??0;
 const coach=window.GMCoaching?.gamePlan(state);
 a.off+=staffBonus(g.a,'offense')+staffBonus(g.a,'special')*.2+(g.a===state.team?(coach?.offSynergy||0)*.3:0);
 a.def+=staffBonus(g.a,'defense')+(g.a===state.team?(coach?.defSynergy||0)*.3:0);
 b.off+=staffBonus(g.b,'offense')+staffBonus(g.b,'special')*.2+(g.b===state.team?(coach?.offSynergy||0)*.3:0);
 b.def+=staffBonus(g.b,'defense')+(g.b===state.team?(coach?.defSynergy||0)*.3:0);
 const weeklyHome=window.GMWeeklyGameplan?.matchup(state,g,g.a);
 const weeklyAway=window.GMWeeklyGameplan?.matchup(state,g,g.b);
 if(weeklyHome){a.off+=weeklyHome.offense;a.def+=weeklyHome.defense}
 if(weeklyAway){b.off+=weeklyAway.offense;b.def+=weeklyAway.defense}
 const context=gameContext(g),weather=context.weather;
 const rivalry=window.GMSimPresentation?.pregameBoost(state,g,g.a)||0;
 const rivalryB=window.GMSimPresentation?.pregameBoost(state,g,g.b)||0;
 a.off*=1+rivalry;b.off*=1+rivalryB;
 const weatherPenalty=weather==='Rain'?-1:weather==='Snow'?-3:weather==='Wind'?-2:weather==='Extreme Cold'?-2:0;
 const boost=t=>{const ps=roster(t).filter(p=>p.injury<=0).slice(0,12);return ps.length?ps.reduce((v,p)=>v+(window.GMDevelopment?.abilityBoost(p,{playType:'pass',scheme:window.GMFranchise?.scheme(state,t,'offense')})||0),0)/ps.length:0};
 a.off*=1+boost(g.a);b.off*=1+boost(g.b);
 if(coach){const apply=(own,other)=>{if(own===state.team){const delta=(coach.blitz-35)*.04;other.off-=delta;if(coach.redZone==='Aggressive')return 1.5;if(coach.redZone==='Run'||coach.redZone==='Pass')return .5}return 0};a.off+=apply(g.a,b);b.off+=apply(g.b,a)}
 const ownerHome=window.GMOwner?.modifiers(state).homeField||0;
 const sa=clamp(points(a.off,b.def,true)+Math.round(context.homeField-1.5)+(g.a===state.team?ownerHome:0)+context.homeStreak+weatherPenalty,0,56),sb=clamp(points(b.off,a.def,false)+context.awayStreak+weatherPenalty,0,56);
 const teamLines=[];
 g.sa=sa===sb?sa+3:sa;g.sb=sb;g.year=state.year;
 for(const [team,forPts,againstPts] of [[g.a,g.sa,g.sb],[g.b,g.sb,g.sa]]){
  const q=depth(team,'QB')[0],rbs=depth(team,'RB',3),receivers=[...depth(team,'WR',4),...depth(team,'TE',2)];
  const scheme=window.GMFranchise?.scheme(state,team,'offense');
  const gamePlan=team===state.team?state.gameplay||{}:{};
  const bias=(scheme==='Air Raid'?.13:scheme==='Power Run'?-.13:scheme==='Spread Option'?.06:0)+(gamePlan.offense==='PASS HEAVY'?.10:gamePlan.offense==='RUN HEAVY'?-.10:0);
  const script=forPts<againstPts?.05:-.03;
  const coachingBias=team===state.team&&coach?(coach.passShare-.53):0;
 const passShare=clamp(.53+coachingBias+bias+script+(scoreTeam(team).off-scoreTeam(team).def)*.002+noise(.1),.31,.81);
  const totalYards=clamp(Math.round(290+(forPts-21)*5+noise(95)+(weather==='Snow'?-35:weather==='Wind'?-15:0)+(gamePlan.tempo==='AGGRESSIVE'?15:gamePlan.tempo==='CONSERVATIVE'?-12:0)),120,590);
  const passYards=Math.round(totalYards*passShare),rushYards=totalYards-passYards;
  const tds=Math.min(7,Math.floor(forPts/7));
  const previousInts=q?(q.stats.interceptions||0):0;
  if(q){let attempts=clamp(Math.round(30+(passShare-.53)*35+noise(12)),16,52),completion=clamp(.49+(q.rating-60)*.004+noise(.12)+(window.GMPlayerPersonality?.performanceModifier(q,'pass')||0)*.20+(weather==='Rain'?-.035:weather==='Snow'?-.065:weather==='Wind'?-.045:0),.35,.79);
   q.stats.attempts+=attempts;q.stats.completions+=Math.round(attempts*completion);
   q.stats.passYards+=passYards;q.stats.passTD+=Math.max(0,Math.round(tds*passShare));
   q.stats.interceptions+=Math.random()<clamp(.2-(q.rating-70)*.003,.03,.24)?1:0;
   q.stats.yards+=passYards;q.stats.td+=Math.max(0,Math.round(tds*passShare));
  }
  distribute(rbs,rushYards,'rushYards',p=>Math.max(1,p.rating-48)*(1+(window.GMPlayerPersonality?.performanceModifier(p,'run')||0)));
  distribute(receivers,passYards,'receivingYards',p=>Math.max(1,p.rating-48)*(p.pos==='WR'?1.2:.8)*(1+(window.GMPlayerPersonality?.performanceModifier(p,'receive')||0)));
  distribute(receivers,Math.round(passYards/12),'receptions',p=>Math.max(1,p.rating-48));
  distribute(rbs,Math.max(0,tds-Math.round(tds*passShare)),'rushTD',p=>Math.max(1,p.rating-48));
  for(const p of [...rbs,...receivers]){p.stats.yards=(p.stats.rushYards||0)+(p.stats.receivingYards||0);p.stats.td=(p.stats.rushTD||0)+(p.stats.recTD||0)}
  const thirdDownAttempts=rand(9,16),thirdDownConversions=clamp(Math.round(thirdDownAttempts*(.32+(scoreTeam(team).off-65)*.003+noise(.08))),0,thirdDownAttempts);
  teamLines.push({team,points:forPts,totalYards,passYards,rushYards,passShare:+passShare.toFixed(2),thirdDownAttempts,thirdDownConversions,turnovers:q?Math.max(0,(q.stats.interceptions||0)-previousInts):0});
  const defense=roster(team).filter(p=>['DL','LB','CB','S'].includes(p.pos)&&!p.injury);
  distribute(defense,clamp(Math.round(50+noise(14)),35,75),'tackles',p=>p.rating*(1+(window.GMPlayerPersonality?.performanceModifier(p,'defense')||0)));
  distribute(defense.filter(p=>['DL','LB'].includes(p.pos)),clamp(Math.round((35-againstPts)/12+noise(2)),0,5),'sacks',p=>p.rating);
  window.GMPlayerPersonality?.recordGame(state,g,team,passShare);
  for(const p of roster(team).filter(p=>!window.GMRosterRules||GMRosterRules.playable(p))){
   const snaps=window.GMPlayerPersonality?.snapsThisWeek(p,state)??40;
   if(snaps<=0)continue;
   p.stats.games++;p.fatigue=clamp((p.fatigue||0)+rand(5,14)+(window.GMPlayerPersonality?.usageFatigue(snaps,p)||0),0,100);
   const injuryRisk=(.003+Math.max(0,p.fatigue-45)*.00022+(p.age>31?.002:0)+(window.GMPlayerPersonality?.usageInjuryRisk(snaps,p)||0))*(window.GMStaff?.conditioning(p,state).injuryMultiplier??1);
   if(Number(p.injury)>0){if(!window.GMInjuries)p.injury--;continue}
   if(Math.random()<injuryRisk){if(window.GMInjuries){const injury=GMInjuries.randomInjury(p,state);if(injury.ok)state.news.unshift(p.name+' diagnosed with '+injury.injury.name+' ('+injury.injury.estimate+' estimated weeks)')}else{p.injury=rand(1,5);state.news.unshift(p.name+' suffered an injury ('+p.injury+' weeks)')}}
   p.morale=clamp(p.morale+(forPts>againstPts?rand(0,3):-rand(0,3)),15,100);
   if(!window.GMDevelopment)p.development=(Number(p.development)||0)+Math.max(0,(p.pot-p.rating))*Math.max(.05,(31-p.age)/100);
  }
 }
 g.report=buildReport(g,context,teamLines);
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
 const standings=TEAMS.map((t,i)=>({i,rec:record(i),power:scoreTeam(i)}))
 .sort((a,b)=>b.rec.w-a.rec.w||((b.power.off+b.power.def)-(a.power.off+a.power.def)));
 const playoffs=[];
 const conferences=[...new Set(TEAMS.map(t=>t[2].split(' ')[0]))];
 const seeded=conferences.map(conf=>{
   const clubs=standings.filter(x=>TEAMS[x.i][2].split(' ')[0]===conf);
   const divisions=[...new Set(clubs.map(x=>TEAMS[x.i][2]))];
   const winners=divisions.map(d=>clubs.filter(x=>TEAMS[x.i][2]===d)[0]).filter(Boolean);
   const ordered=(xs)=>xs.sort((a,b)=>b.rec.w-a.rec.w||((b.power.off+b.power.def)-(a.power.off+a.power.def)));
   return [...ordered(winners),...ordered(clubs.filter(x=>!winners.includes(x)))].slice(0,7).map((x,i)=>({...x,seed:i+1}));
 });
 function playoffGame(a,b,round,conf){
   const ap=scoreTeam(a.i),bp=scoreTeam(b.i);
   const advantage=((ap.off-bp.def)+(ap.def-bp.off))*.18;
   let sa=Math.max(3,Math.round(24+advantage+(Math.random()-.5)*22));
   let sb=Math.max(3,Math.round(24-advantage+(Math.random()-.5)*22));
   if(sa===sb){if(Math.random()<.5)sa+=3;else sb+=3}
   const winner=sa>sb?a:b;
   playoffs.push({year:state.year,round,conference:conf,a:a.i,b:b.i,sa,sb,winner:winner.i});
   return winner;
 }
 const finalists=seeded.map((clubs,i)=>{
   const conf=conferences[i];
   const wild=[playoffGame(clubs[1],clubs[6],'Wild Card',conf),playoffGame(clubs[2],clubs[5],'Wild Card',conf),playoffGame(clubs[3],clubs[4],'Wild Card',conf)];
   wild.sort((a,b)=>b.seed-a.seed);
   const divisional=[playoffGame(clubs[0],wild[0],'Divisional',conf),playoffGame(wild[1],wild[2],'Divisional',conf)];
   return playoffGame(divisional[0],divisional[1],'Conference Final',conf);
 });
 const champion=playoffGame(finalists[0],finalists[1],'Super Bowl','League');
 const champ=champion.i,final=playoffs[playoffs.length-1];
 const runner=final.a===champ?final.b:final.a;
 state.history.push({year:state.year,champ:TEAMS[champ][1],runner:TEAMS[runner??standings[1].i][1]});
 state.champions.push(champ);
 const legacyMVP=[...state.players].filter(p=>p.pos==='QB').sort((a,b)=>(b.stats.passYards+b.stats.passTD*20-b.stats.interceptions*35)-(a.stats.passYards+a.stats.passTD*20-a.stats.interceptions*35))[0];
 const leagueHonors=window.GMLeagueNarratives?.seasonEnd(state);
 state.awards.push({year:state.year,mvp:leagueHonors?.mvp?.name||legacyMVP?.name||'—',
  offense:leagueHonors?.offense?.name||'—',defense:leagueHonors?.defense?.name||'—',
  rookie:leagueHonors?.rookie?.name||'—'});
 window.GMOwner?.seasonEnd(state,{champion:champ===state.team,playoffs:playoffs.some(g=>g.a===state.team||g.b===state.team),division:seeded.some(c=>c[0]?.i===state.team)});
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
  if(p.age>34&&Math.random()<clamp((p.age-33)*.09,0,.75)){const retired={...p,retiredYear:state.year};state.retired.push(retired);window.GMSimPresentation?.retirement(state,retired);p.team=-2}
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
 state.engine.season=state.year;state.engine.schedule=freshSchedule();
 state.news.unshift(TEAMS[champ][1]+' won the '+(state.year-1)+' championship!');
 save();render();
 if(champ===state.team&&typeof window.launchChampionshipCelebration==='function')window.launchChampionshipCelebration(TEAMS[champ][1],state.year-1);
}
function scheduleV2(){
 setup();
 const games=state.engine.schedule.filter(g=>g.week===selectedWeek);
 return title('Season Schedule',state.year+' · Week '+state.week+' of 18 · All matchups locked in before kickoff','LEAGUE SCHEDULE')
 +'<button class="primary" onclick="simulate()">Simulate Week '+state.week+'</button>'
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