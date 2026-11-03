/* Player Personality & Play Styles — additive Gridiron GM Priority 1.
   Load after player-development.js and coaching-philosophy.js, before engine.js.
   Player storage: p.personalityProfile; event log: state.playerProgressionEvents. */
(function(root){
'use strict';
const CONFIG={
  traits:{
    'Team Player':{xp:1.03,morale:1,holdout:.82},Diva:{xp:1.00,morale:-1,holdout:1.30},
    Leader:{xp:1.04,morale:1,holdout:.84},Lazy:{xp:.91,morale:-1,holdout:1.17},
    Clutch:{xp:1.02,morale:0,holdout:1.00},'Fragile Ego':{xp:.99,morale:-1,holdout:1.24},
    Coachable:{xp:1.07,morale:1,holdout:.90},'Hot Head':{xp:.98,morale:-1,holdout:1.18},
    'Gym Rat':{xp:1.08,morale:0,holdout:.96}
  },
  philosophies:{
    Balanced:{xp:1.00,morale:0,holdout:1},Developmental:{xp:1.06,morale:1,holdout:.91},
    Aggressive:{xp:1.01,morale:-1,holdout:1.07},Conservative:{xp:.98,morale:0,holdout:.98},
    Innovative:{xp:1.03,morale:0,holdout:1.02}
  },
  styles:{
    QB:[['Pocket Passer','pass',.012,.015],['Dual Threat','run',.009,.015],['Field General','pass',.011,.013]],
    RB:[['Power Back','run',.014,.017],['Elusive Runner','run',.012,.016],['Receiving Back','receive',.011,.015]],
    WR:[['Route Technician','receive',.015,.018],['Deep Threat','receive',.013,.017]],
    TE:[['Receiving Threat','receive',.012,.016],['Blocking Specialist','run',.014,.015]],
    OL:[['Road Grader','run',.013,.016],['Pass Protector','pass',.014,.016]],
    DL:[['Power Rusher','defense',.013,.018],['Speed Rusher','defense',.013,.017]],
    LB:[['Coverage Specialist','defense',.012,.017],['Run Stopper','defense',.013,.015]],
    CB:[['Man Specialist','defense',.013,.018],['Zone Specialist','defense',.013,.017]],
    S:[['Coverage Specialist','defense',.013,.016],['Box Defender','defense',.012,.015]],
    K:[['Precision Kicker','kick',.014,.013],['Power Leg','kick',.012,.014]]
  },
  /* approximate share of offensive/defensive team snaps by depth rank */
  snaps:{QB:[.98],RB:[.67,.26,.10],WR:[.89,.79,.68,.43],TE:[.79,.32],
    OL:[.98,.98,.98,.98,.98],DL:[.76,.68,.58,.42],LB:[.90,.80,.66],
    CB:[.91,.82,.54],S:[.92,.88],K:[.12]},
  usage:{basePlays:63,variation:8,highSnaps:60,thresholds:{QB:57,RB:38,WR:49,TE:43,OL:57,DL:42,LB:48,CB:50,S:52,K:7},xpPerSnap:.0012,
    maxXpBonus:.10,fatiguePerHighSnap:.10,maxFatigue:3,
    injuryRiskPerHighSnap:.00010,maxInjuryRisk:.003},
  xp:{min:.78,max:1.25,fitPerPoint:.0025,fitCenter:75},
  morale:{positiveFit:86,negativeFit:65,maxWeeklyChange:1},
  holdout:{min:.80,max:1.30,fitScale:.003},
  event:{
    firstWeek:4,lastWeek:16,maxEventsPerSeason:1,
    breakout:{base:.0035,ageYoung:1.8,ageOld:.65,highUsage:1.6,goodFit:1.45,badFit:.65,max:.018,ratingGain:[1,2],xp:180,morale:3},
    regression:{base:.0025,ageOld:2.0,ageYoung:.65,highUsage:1.25,badFit:1.6,goodFit:.65,max:.015,ratingLoss:[1,2],morale:-3}
  }
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=v=>{let n=2166136261;for(const ch of String(v)){n=Math.imul(n^ch.charCodeAt(0),16777619)}return n>>>0};
const defensive=new Set(['DL','LB','CB','S']);
function ensure(p){
 if(!p||!CONFIG.styles[p.pos])return null;
 let d=p.personalityProfile;
 if(!d||typeof d!=='object'||!Array.isArray(d.traits)){
   const traits=Object.keys(CONFIG.traits),seed=hash(p.id+'|'+p.name+'|'+p.pos),
   chosen=[],count=2+(seed%3===0?1:0);
   for(let n=0;n<count;n++){let i=(seed+n*7+Math.floor(seed/97))%traits.length;
     while(chosen.includes(traits[i]))i=(i+1)%traits.length;chosen.push(traits[i])}
   const styles=CONFIG.styles[p.pos],a=p.development?.archetype||'';
   const preferred=styles.find(x=>a.toLowerCase().includes(x[0].toLowerCase().split(' ')[0]));
   d={traits:chosen,playStyle:preferred?.[0]||styles[seed%styles.length][0],
     snaps:{year:0,season:0,total:0,last:null,history:[]},events:[],lastEventYear:0,lastMoraleKey:''};
   p.personalityProfile=d;
 }
 d.snaps??={year:0,season:0,total:0,last:null,history:[]};d.snaps.history??=[];d.events??=[];
 if(!CONFIG.styles[p.pos].some(x=>x[0]===d.playStyle))d.playStyle=CONFIG.styles[p.pos][0][0];
 return d;
}
function schemeFit(p,s){
 if(!s||p.team<0)return 75;
 const side=defensive.has(p.pos)?'defense':'offense';
 const scheme=s.franchiseSystems?.schemes?.[p.team]?.[side]||(side==='offense'?'Balanced':'Cover 3');
 return clamp(root.GMCoaching?.schemeFit(p,scheme)??root.GMFranchise?.fit(p,scheme)??75,0,100);
}
function factors(p,s){
 const d=ensure(p);if(!d)return {xp:1,morale:0,holdout:1,fit:75};
 const traits=d.traits.map(t=>CONFIG.traits[t]).filter(Boolean);
 const philosophy=p.team===s?.team?s?.coachingPhilosophy?.headCoach:'Balanced';
 const coach=CONFIG.philosophies[philosophy]||CONFIG.philosophies.Balanced;
 const fit=schemeFit(p,s),fitXP=1+(fit-CONFIG.xp.fitCenter)*CONFIG.xp.fitPerPoint;
 const usage=d.snaps.last&&s&&d.snaps.last.year===s.year&&d.snaps.last.week===s.week
   ?Math.min(CONFIG.usage.maxXpBonus,Math.max(0,(d.snaps.last.count||0)-(CONFIG.usage.thresholds[p.pos]??CONFIG.usage.highSnaps))*CONFIG.usage.xpPerSnap):0;
 const xp=clamp(traits.reduce((n,t)=>n*t.xp,coach.xp)*fitXP*(1+usage),CONFIG.xp.min,CONFIG.xp.max);
 const morale=clamp(traits.reduce((n,t)=>n+t.morale,0)+coach.morale+
   (fit>=CONFIG.morale.positiveFit?1:fit<=CONFIG.morale.negativeFit?-1:0),
   -CONFIG.morale.maxWeeklyChange,CONFIG.morale.maxWeeklyChange);
 const holdout=clamp(traits.reduce((n,t)=>n*t.holdout,coach.holdout)*
   (1+(75-fit)*CONFIG.holdout.fitScale),CONFIG.holdout.min,CONFIG.holdout.max);
 return {xp,morale,holdout,fit,philosophy};
}
function xpMultiplier(p,s){return factors(p,s).xp}
function holdoutMultiplier(p,s){return factors(p,s).holdout}
function style(p){const d=ensure(p);return d?CONFIG.styles[p.pos].find(x=>x[0]===d.playStyle):null}
function ratingModifier(p){return style(p)?.[2]||0}
function performanceModifier(p,phase){const x=style(p);return x&&(!phase||phase===x[1])?x[3]:0}
function eligible(p){return p.team>=0&&!(Number(p.injury)>0)&&!p.contractAdvanced?.holdout&&
  (!root.GMRosterRules||root.GMRosterRules.playable(p))}
function recordGame(s,g,team,passShare=.53){
 const plays=clamp(CONFIG.usage.basePlays+Math.round((Math.random()-.5)*2*CONFIG.usage.variation),45,85);
 const key=s.year+':'+s.week+':'+g.a+':'+g.b;
 const roster=s.players.filter(p=>p.team===team&&eligible(p));
 let count=0;
 for(const [pos,fractions] of Object.entries(CONFIG.snaps)){
   const sorted=root.GMFranchise?.depth(s,team,pos)||roster.filter(p=>p.pos===pos).sort((a,b)=>b.rating-a.rating);
   const participants=sorted.filter(p=>p.team===team&&eligible(p)).slice(0,fractions.length);
   participants.forEach((p,i)=>{
     const d=ensure(p),sn=d.snaps;if(sn.last?.key===key)return;
     if(sn.year!==s.year){sn.year=s.year;sn.season=0}
     let share=fractions[i];
     if(pos==='RB')share*=clamp(1+(.53-passShare)*.6,.85,1.15);
     if(pos==='WR'||pos==='TE')share*=clamp(passShare+.47,.75,1.25);
     const n=Math.max(1,Math.round(plays*share));
     sn.season+=n;sn.total+=n;sn.last={key,year:s.year,week:s.week,count:n,team};
     sn.history.unshift({year:s.year,week:s.week,count:n});sn.history.length=Math.min(sn.history.length,12);
     count++;
   });
 }
 return count;
}
function snapsThisWeek(p,s){const last=ensure(p)?.snaps.last;return last?.year===s.year&&last?.week===s.week?last.count:0}
function usageFatigue(snaps,p){return clamp((snaps-(CONFIG.usage.thresholds[p?.pos]??CONFIG.usage.highSnaps))*CONFIG.usage.fatiguePerHighSnap,0,CONFIG.usage.maxFatigue)}
function usageInjuryRisk(snaps,p){return clamp((snaps-(CONFIG.usage.thresholds[p?.pos]??CONFIG.usage.highSnaps))*CONFIG.usage.injuryRiskPerHighSnap,0,CONFIG.usage.maxInjuryRisk)}
function weeklyMorale(s){
 for(const p of s.players.filter(eligible)){
   const d=ensure(p),key=s.year+':'+s.week;
   if(!d||d.lastMoraleKey===key)continue;
   p.morale=clamp((p.morale??65)+factors(p,s).morale,0,100);
   d.lastMoraleKey=key;
 }
}
function odds(p,s){
 const age=Number(p.age||27),snaps=ensure(p).snaps.season,
   games=Math.max(1,s.week-1),usage=snaps/games,fit=schemeFit(p,s),e=CONFIG.event;
 const young=age<=26,old=age>=31,high=usage>=(CONFIG.usage.thresholds[p.pos]??CONFIG.usage.highSnaps);
 let breakout=e.breakout.base*(young?e.breakout.ageYoung:old?e.breakout.ageOld:1)*
   (high?e.breakout.highUsage:1)*(fit>=85?e.breakout.goodFit:fit<=65?e.breakout.badFit:1);
 let regression=e.regression.base*(old?e.regression.ageOld:young?e.regression.ageYoung:1)*
   (high?e.regression.highUsage:1)*(fit<=65?e.regression.badFit:fit>=85?e.regression.goodFit:1);
 return {breakout:Math.min(e.breakout.max,breakout),regression:Math.min(e.regression.max,regression),fit,usage};
}
function midseason(s,random=Math.random){
 if(s.week<CONFIG.event.firstWeek||s.week>CONFIG.event.lastWeek)return [];
 const log=s.playerProgressionEvents??=[],added=[];
 for(const p of s.players.filter(eligible)){
   const d=ensure(p);if(!d||d.lastEventYear===s.year||!d.snaps.season)continue;
   const chance=odds(p,s),r=random(),isBreakout=r<chance.breakout;
   if(!isBreakout&&r>=chance.breakout+chance.regression)continue;
   const type=isBreakout?'BREAKOUT':'REGRESSION',cfg=isBreakout?CONFIG.event.breakout:CONFIG.event.regression,
     amount=cfg[isBreakout?'ratingGain':'ratingLoss'],delta=(isBreakout?1:-1)*
       (amount[0]+Math.floor(random()*(amount[1]-amount[0]+1)));
   const before=p.rating,limit=isBreakout?Math.min(99,p.pot??99):35;
   p.rating=clamp(before+delta,35,isBreakout?Math.max(before,limit):99);
   if(p.rating===before)continue;
   const archetype=root.GMDevelopment?.archetype(p),attr=archetype?.[1]?.[0];
   if(attr&&p.attributes)p.attributes[attr]=clamp((p.attributes[attr]||before)+(p.rating-before),1,99);
   p.morale=clamp((p.morale??65)+cfg.morale,0,100);
   if(isBreakout)root.GMDevelopment?.gainXP(p,cfg.xp,s);
   d.lastEventYear=s.year;
   const event={year:s.year,week:s.week,playerId:p.id,name:p.name,team:p.team,type,
     change:p.rating-before,fit:chance.fit,averageSnaps:Math.round(chance.usage)};
   d.events.unshift(event);d.events.length=Math.min(d.events.length,12);
   log.unshift(event);added.push(event);
   s.news?.unshift(p.name+(isBreakout?' is breaking out! ':' is showing signs of regression. ')+
      (event.change>0?'+':'')+event.change+' OVR (W'+s.week+').');
 }
 log.length=Math.min(log.length,120);
 return added;
}
function page(s){
 const players=s.players.filter(p=>p.team===s.team),events=(s.playerProgressionEvents||[]).filter(e=>e.team===s.team).slice(0,8);
 return '<div class="eyebrow">PLAYER IDENTITY & PROGRESSION</div><h1 class="heading">LOCKER ROOM</h1>'+
   '<p class="sub">Personality shapes XP, morale and holdouts. Styles give a 0.9–1.5% attribute OVR modifier and up to 1.8% performance bonus.</p>'+
   '<div class="card"><h3>RECENT BREAKOUTS & REGRESSIONS</h3>'+
   (events.map(e=>'<p>'+esc(e.name)+' · '+esc(e.type)+' · '+(e.change>0?'+':'')+e.change+' OVR · W'+e.week+'</p>').join('')||'<p>No events recorded yet.</p>')+'</div>'+
   '<div class="grid two">'+players.map(p=>{
     const d=ensure(p),f=factors(p,s),sn=d.snaps;
     return '<div class="card"><div class="row"><h3>'+esc(p.name)+'</h3><b>'+p.rating+' OVR</b></div>'+
       '<p class="muted">'+esc(p.pos)+' · '+esc(d.playStyle)+'</p>'+
       '<p>'+d.traits.map(t=>'<span class="pill">'+esc(t)+'</span>').join(' ')+'</p>'+
       '<p>Scheme fit '+Math.round(f.fit)+' · XP ×'+f.xp.toFixed(2)+
       ' · Holdout risk ×'+f.holdout.toFixed(2)+'</p>'+
       '<p>Last game '+(sn.last?.count||0)+' snaps · Season '+sn.season+' snaps</p></div>';
   }).join('')+'</div>';
}
const api={CONFIG,ensure,schemeFit,factors,xpMultiplier,holdoutMultiplier,style,
  ratingModifier,performanceModifier,recordGame,snapsThisWeek,usageFatigue,
  usageInjuryRisk,weeklyMorale,odds,midseason,page};
root.GMPlayerPersonality=api;
root.Gridiron?.register?.('playerPersonality',api);
})(window);
