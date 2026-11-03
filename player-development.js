/* Gridiron GM Player Development 2.0 — no dependencies, no build step. */
(function(root){
'use strict';
const clamp=(v,a=0,b=99)=>Math.max(a,Math.min(b,Number(v)||0));
const ARCHETYPES={
 QB:[['Field General',['throwAccuracy','awareness','throwUnderPressure'],['West Coast','Balanced'],'Clutch'],['Strong Arm',['throwPower','throwUnderPressure','playAction'],['Air Raid'],'Deep Threat'],['Improviser',['scramble','speed','throwUnderPressure'],['Spread Option'],'Escape Artist']],
 RB:[['Elusive Back',['elusiveness','speed','acceleration'],['Spread Option','West Coast'],'Ankle Breaker'],['Power Back',['trucking','strength','carrying'],['Power Run'],'Freight Train'],['Receiving Back',['catching','agility','carrying'],['West Coast','Air Raid'],'Mismatch']],
 WR:[['Route Runner',['routeRunning','release','catching'],['West Coast'],'Route Technician'],['Deep Threat',['speed','spectacularCatch','release'],['Air Raid'],'Deep Threat'],['Possession',['catching','awareness','routeRunning'],['Balanced'],'Sure Hands']],
 TE:[['Vertical Threat',['speed','catching','routeRunning'],['Air Raid'],'Mismatch'],['Blocking TE',['runBlock','strength','awareness'],['Power Run'],'Road Grader'],['Possession TE',['catching','release','awareness'],['West Coast'],'Sure Hands']],
 OL:[['Pass Protector',['passBlock','awareness','strength'],['Air Raid','West Coast'],'Stonewall'],['Power Blocker',['runBlock','strength','awareness'],['Power Run'],'Road Grader'],['Agile Lineman',['agility','passBlock','runBlock'],['Spread Option'],'Second Level']],
 DL:[['Power Rusher',['powerMoves','strength','blockShedding'],['3-4'],'Bull Rush'],['Speed Rusher',['finesseMoves','speed','pursuit'],['4-3'],'Quick Jump'],['Run Stopper',['blockShedding','strength','pursuit'],['Cover 3'],'Run Wall']],
 LB:[['Field General',['playRecognition','tackling','awareness'],['Cover 3'],'Defensive Captain'],['Pass Rusher',['passRush','speed','strength'],['3-4'],'Quick Jump'],['Coverage LB',['coverage','speed','playRecognition'],['Cover 2'],'Lockdown']],
 CB:[['Man Specialist',['manCoverage','press','speed'],['Man Heavy'],'Lockdown'],['Zone Hawk',['zoneCoverage','ballHawking','awareness'],['Cover 3'],'Ball Hawk'],['Slot Defender',['agility','manCoverage','tackling'],['Cover 2'],'Quick Break']],
 S:[['Center Fielder',['zoneCoverage','ballHawking','speed'],['Cover 3'],'Ball Hawk'],['Box Safety',['tackling','strength','awareness'],['Cover 2'],'Run Wall'],['Hybrid',['manCoverage','zoneCoverage','agility'],['Man Heavy'],'Lockdown']],
 K:[['Precision',['kickAccuracy','awareness','kickoff'],['Balanced'],'Ice Veins'],['Power Leg',['kickPower','kickoff','strength'],['Balanced'],'Long Range'],['All-Around',['kickAccuracy','kickPower','stamina'],['Balanced'],'Ice Veins']]
};
const ABILITIES={
 'Clutch':{min:86,trait:'Superstar',boost:.035,condition:'close game in fourth quarter'},
 'Deep Threat':{min:83,trait:'Star',boost:.035,condition:'passing attack'},
 'Escape Artist':{min:84,trait:'Star',boost:.03,condition:'spread option'},
 'Ankle Breaker':{min:83,trait:'Star',boost:.03,condition:'rushing play'},
 'Freight Train':{min:85,trait:'Superstar',boost:.04,condition:'power rushing'},
 'Mismatch':{min:82,trait:'Star',boost:.03,condition:'receiving play'},
 'Route Technician':{min:83,trait:'Star',boost:.03,condition:'short passing'},
 'Sure Hands':{min:81,trait:'Star',boost:.025,condition:'receiving play'},
 'Road Grader':{min:84,trait:'Star',boost:.03,condition:'power run'},
 'Stonewall':{min:84,trait:'Star',boost:.03,condition:'pass protection'},
 'Second Level':{min:83,trait:'Star',boost:.025,condition:'spread option'},
 'Bull Rush':{min:85,trait:'Star',boost:.03,condition:'pass rush'},
 'Quick Jump':{min:84,trait:'Star',boost:.03,condition:'pass rush'},
 'Run Wall':{min:83,trait:'Star',boost:.03,condition:'run defense'},
 'Defensive Captain':{min:85,trait:'Superstar',boost:.025,condition:'defensive snaps'},
 'Lockdown':{min:85,trait:'Star',boost:.035,condition:'pass defense'},
 'Ball Hawk':{min:84,trait:'Star',boost:.03,condition:'pass defense'},
 'Quick Break':{min:82,trait:'Star',boost:.025,condition:'slot coverage'},
 'Ice Veins':{min:84,trait:'Star',boost:.04,condition:'close game kick'},
 'Long Range':{min:84,trait:'Star',boost:.035,condition:'long kick'}
};
const PEAK={QB:[27,33],RB:[24,28],WR:[25,30],TE:[26,31],OL:[27,33],DL:[26,31],LB:[25,30],CB:[24,29],S:[26,31],K:[29,37]};
const TRAITS=['Normal','Star','Superstar','X-Factor'];
const DRILLS={QB:['throwAccuracy','throwPower','throwUnderPressure'],RB:['carrying','elusiveness','trucking'],WR:['routeRunning','catching','speed'],TE:['catching','runBlock','routeRunning'],OL:['passBlock','runBlock','strength'],DL:['blockShedding','powerMoves','finesseMoves'],LB:['tackling','coverage','passRush'],CB:['manCoverage','zoneCoverage','press'],S:['zoneCoverage','tackling','ballHawking'],K:['kickAccuracy','kickPower','kickoff']};
function ensure(p){
 if(!p||!ARCHETYPES[p.pos])return null;
 root.GMFranchise?.migratePlayer(p);
 if(!p.development||!ARCHETYPES[p.pos].some(x=>x[0]===p.development.archetype)){
  const opts=ARCHETYPES[p.pos],choice=opts[Math.abs(Number(p.id)||0)%opts.length];
  p.development={archetype:choice[0],trait:TRAITS.includes(p.devTrait)?p.devTrait:'Normal',xp:Math.max(0,p.xp||0),totalXP:Math.max(0,p.xp||0),level:0,abilities:Array.isArray(p.abilities)?p.abilities:[],declineTrait:['Early Decline','Normal','Late Bloomer'][Math.abs(Number(p.id)||0)%3],trainingHistory:[],seasonGames:0,seasonMilestones:{},drillCounts:{}};
 }
 const d=p.development;d.abilities??=[];d.drillCounts??={};d.trainingHistory??=[];d.seasonMilestones??={};d.xp??=0;d.totalXP??=0;
 p.devTrait=d.trait;p.abilities=d.abilities;p.xp=d.xp;
 return d;
}
function archetype(p){const d=ensure(p);return d?ARCHETYPES[p.pos].find(a=>a[0]===d.archetype):null}
function schemeBonus(p,scheme){const a=archetype(p);return a&&a[2].includes(scheme)?3:0}
function threshold(p){return Math.round(500+Math.max(0,p.rating-60)*22+Math.max(0,p.rating-85)*40)}
function unlock(p){
 const d=ensure(p);if(!d)return;
 const a=archetype(p),ability=a[3],def=ABILITIES[ability],rank=TRAITS.indexOf(d.trait);
 if(def&&p.rating>=def.min&&rank>=TRAITS.indexOf(def.trait)&&d.totalXP>=1200&&d.seasonGames>=3&&!d.abilities.includes(ability))d.abilities.push(ability);
}
function gainXP(p,amount){
 const d=ensure(p);if(!d)return 0;
 const multiplier=[1,1.25,1.5,1.75][TRAITS.indexOf(d.trait)]||1;
 const xp=Math.max(0,Math.round(amount*multiplier*(p.morale>=80?1.08:1)));
 d.xp+=xp;d.totalXP+=xp;
 let levels=0;
 while(d.xp>=threshold(p)&&levels<3&&p.rating<p.pot){
  d.xp-=threshold(p);d.level++;levels++;
  const attrs=archetype(p)[1],key=attrs[(d.level-1)%attrs.length];
  if(p.attributes) p.attributes[key]=clamp((p.attributes[key]||p.rating)+1,1,99);
  p.rating=clamp(p.rating+1,1,Math.min(99,p.pot));
 }
 if(d.totalXP>=11000&&p.rating>=92&&d.seasonGames>=12)d.trait='X-Factor';
 else if(d.totalXP>=5200&&p.rating>=86&&d.seasonGames>=8&&TRAITS.indexOf(d.trait)<2)d.trait='Superstar';
 else if(d.totalXP>=1800&&p.rating>=79&&d.seasonGames>=4&&TRAITS.indexOf(d.trait)<1)d.trait='Star';
 p.devTrait=d.trait;unlock(p);p.xp=d.xp;return xp;
}
function performanceXP(p,before){
 const s=p.stats||{},diff=k=>Math.max(0,(s[k]||0)-(before?.[k]||0));
 const base=45+Math.min(90,diff('passYards')*.13+diff('passTD')*22+diff('rushYards')*.24+diff('receivingYards')*.24+diff('tackles')*2+diff('sacks')*18+diff('receptions')*2);
 return Math.round(base);
}
function gameXP(p,before,played){const d=ensure(p);if(!d||!played||p.injury>0)return 0;d.seasonGames++;d.seasonMilestones.games=(d.seasonMilestones.games||0)+1;return gainXP(p,performanceXP(p,before))}
function budget(s){s.playerTraining??={year:s.year,week:s.week,points:12,allocations:[]};const b=s.playerTraining;if(b.year!==s.year||b.week!==s.week){b.year=s.year;b.week=s.week;b.points=12;b.allocations=[]}return b}
function train(p,attribute,s,ai=false){
 const d=ensure(p);if(!d||!DRILLS[p.pos].includes(attribute))return {ok:false,reason:'Invalid drill'};
 const b=budget(s);if(!ai&&b.points<2)return {ok:false,reason:'Not enough training points'};
 if(p.injury>0)return {ok:false,reason:'Player is injured'};
 if(!ai)b.points-=2;
 const times=d.drillCounts[attribute]||0,ar=archetype(p),fit=ar[1].includes(attribute)?1.35:1;
 const fatigue=clamp(p.fatigue||0,0,100),diminish=1/(1+times*.3);
 const xp=Math.round(115*fit*diminish*(1-fatigue*.004));
 const gained=gainXP(p,xp);
 d.drillCounts[attribute]=times+1;
 p.fatigue=clamp(fatigue+4,0,100);
 if(p.attributes&&p.rating<p.pot&&times%3===0)p.attributes[attribute]=clamp((p.attributes[attribute]||p.rating)+1,1,99);
 d.trainingHistory.unshift({year:s.year,week:s.week,attribute,xp:gained});
 d.trainingHistory=d.trainingHistory.slice(0,24);
 if(!ai)b.allocations.push({id:p.id,attribute});
 return {ok:true,xp:gained,remaining:b.points};
}
function weekly(s,before){
 budget(s);
 for(const p of s.players){
  const was=before?.get(p.id);
  if(was)gameXP(p,was,true);
  else if(p.team>=0&&p.injury<=0)gainXP(p,15);
  if(p.team>=0&&p.team!==s.team&&p.injury<=0&&Math.random()<.17){
   const drills=DRILLS[p.pos];train(p,drills[Math.floor(Math.random()*drills.length)],s,true);
  }
 }
}
function abilityBoost(p,context={}){
 const d=ensure(p);if(!d)return 0;
 let total=0;
 for(const name of d.abilities){
  const def=ABILITIES[name];if(!def)continue;
  const c=def.condition,scheme=context.scheme||'',type=context.playType||'';
  const active=(c.includes('close game')&&context.closeGame)||(c.includes('pass')&&type==='pass')||(c.includes('receiv')&&type==='pass')||(c.includes('rush')&&type==='run')||(c.includes('run')&&type==='run')||(c.includes('defen')&&type==='defense')||(c.includes('cover')&&type==='defense')||(c.includes('kick')&&type==='kick')||(c.includes('spread')&&scheme==='Spread Option')||(c.includes('power')&&scheme==='Power Run')||(c.includes('snap')&&type==='defense');
  if(active)total+=def.boost;
 }
 return Math.min(.06,total);
}
function aging(p){
 const d=ensure(p);if(!d)return 0;
 const peak=PEAK[p.pos]||[26,31],shift=d.declineTrait==='Early Decline'?-2:d.declineTrait==='Late Bloomer'?2:0;
 const age=p.age,late=peak[1]+shift;
 let delta=age<peak[0]+shift?(p.rating<p.pot?1:0):age<=late?0:age<=late+3?-1:-2;
 if(age>late+6)delta=-3;
 if(delta>0&&p.rating>=p.pot)delta=0;
 p.rating=clamp(p.rating+delta,35,Math.min(99,Math.max(p.pot,p.rating)));
 if(delta<0&&p.attributes)for(const key of archetype(p)[1])p.attributes[key]=clamp((p.attributes[key]||p.rating)+delta,1,99);
 d.seasonGames=0;d.seasonMilestones={};d.drillCounts={};
 return delta;
}
function page(s){
 const b=budget(s),players=s.players.filter(p=>p.team===s.team),safe=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 return '<div class="eyebrow">PLAYER DEVELOPMENT</div><h1 class="heading">TRAINING LAB</h1><p class="sub">Weekly points remaining: '+b.points+' / 12 · Each drill costs 2 points and adds fatigue.</p><div class="grid two">'+players.map(p=>{const d=ensure(p),a=archetype(p);return '<div class="card"><div class="row"><h3>'+safe(p.name)+'</h3><b>'+p.rating+' OVR</b></div><p class="muted">'+p.pos+' · '+safe(d.archetype)+' · '+safe(d.trait)+' · Potential '+p.pot+'</p><p>XP '+d.xp+' / '+threshold(p)+' · Fatigue '+Math.round(p.fatigue||0)+'% · '+safe(d.abilities.join(', ')||'No abilities unlocked')+'</p><div class="filters">'+DRILLS[p.pos].map(k=>'<button onclick="gmTrainPlayer('+p.id+',\''+k+'\')">'+safe(k.replace(/([A-Z])/g,' $1'))+' · 2 TP</button>').join('')+'</div></div>'}).join('')+'</div>';
}
root.GMDevelopment={ARCHETYPES,ABILITIES,PEAK,DRILLS,ensure,archetype,schemeBonus,gainXP,gameXP,weekly,train,budget,abilityBoost,aging,page,unlock};
root.gmTrainPlayer=function(id,attribute){const p=state.players.find(p=>p.id===id),result=GMDevelopment.train(p,attribute,state);if(!result.ok)alert(result.reason);save();render()};
})(window);
