/* Gridiron GM — Full Coaching Staff (Priority 2).
   Classic script; load after coaching-philosophy.js, before player-personality.js. */
(function(root){
'use strict';
const CONFIG={
 roles:{
  offense:{label:'Offensive Coordinator',labelShort:'OC',schemes:['West Coast','Air Raid','Power Run','Spread Option','Balanced'],weights:{strategy:.35,development:.3,communication:.2,adaptability:.15}},
  defense:{label:'Defensive Coordinator',labelShort:'DC',schemes:['4-3','3-4','Cover 2','Cover 3','Man Heavy'],weights:{strategy:.4,development:.25,communication:.15,adaptability:.2}},
  special:{label:'Special Teams Coordinator',labelShort:'STC',schemes:['Balanced','Precision','Aggressive Returns'],weights:{strategy:.35,development:.2,communication:.25,adaptability:.2}},
  strength:{label:'Strength & Conditioning Coach',labelShort:'S&C',schemes:['Balanced','High Intensity','Recovery'],weights:{conditioning:.4,injuryPrevention:.3,development:.2,communication:.1}}
 },
 rating:{min:48,max:95,generatedBase:62,generatedRange:28,yearlyGrowthChance:.48,yearlyGrowth:1,maxGrowthPerSeason:2},
 game:{perRatingPoint:.055,schemeMatch:.45,schemeMismatch:-.25,maxPoints:2.3,specialTeamsWeight:.25,offenseDisruption:-2.5},
 development:{perSkillPoint:.002,affinity:.045,schemeMatch:.025,strengthPerPoint:.0015,min:.80,max:1.15,offenseDisruption:.88},
 conditioning:{fatiguePerPoint:.055,injuryPerPoint:.004,fatigueMin:-1.2,fatigueMax:1.2,injuryMin:.88,injuryMax:1.12},
 poaching:{minimumRating:82,chanceOffense:.12,chanceDefense:.075,chanceSpecial:.035,maxMovesPerSeason:3,disruptionSeasons:1,interimRating:62},
 retention:{baseCost:4,ratingSurcharge:.11,yearsProtected:1},
 hiring:{baseCost:5,ratingSurcharge:.055,candidatesPerRole:3},
 conflict:{winNowTarget:9,jobPressure:48,youngRosterFraction:.34,youngAge:25,
  unresolvedIntervalWeeks:4,unresolvedSecurity:-1,
  owner:{security:4,fans:2,media:-2,morale:-2},
  coach:{security:-4,fans:-1,media:5,morale:3},
  compromise:{security:1,fans:1,media:-1,morale:1}},
 logLimit:35
};
const FIRST=['Avery','Jordan','Malik','Casey','Morgan','Devon','Taylor','Emery','Quinn','Cameron','Adrian','Drew','Parker','Rowan','Harper','Riley'];
const LAST=['Bennett','Carson','Coleman','Morris','Hawkins','Knight','Vaughn','Brooks','Sullivan','Parker','Henderson','Foster','Chambers','Fletcher','Grant','Porter'];
const AFFINITIES={
 offense:['Field General','Strong Arm','Improviser','Power Back','Elusive Back','Receiving Back','Route Runner','Deep Threat','Possession','Pass Protector','Power Blocker','Vertical Threat'],
 defense:['Power Rusher','Speed Rusher','Run Stopper','Coverage LB','Man Specialist','Zone Hawk','Center Fielder','Box Safety','Hybrid','Pass Rusher'],
 special:['Precision','Power Leg','All-Around'],
 strength:['Power Back','Elusive Back','Pass Protector','Power Rusher','Run Stopper','Field General','Route Runner']
};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const hash=t=>{let v=2166136261;for(const c of String(t))v=Math.imul(v^c.charCodeAt(0),16777619);return v>>>0};
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const sideFor=p=>['DL','LB','CB','S'].includes(p.pos)?'defense':p.pos==='K'?'special':'offense';
function overall(c){
 const weights=CONFIG.roles[c?.role]?.weights||CONFIG.roles.offense.weights;
 return clamp(Math.round(Object.entries(weights).reduce((v,[key,weight])=>v+(Number(c?.ratings?.[key])||65)*weight,0)),1,99);
}
function makeCoach(team,role,year=2026,salt=0,base){
 const seed=hash(team+'|'+role+'|'+year+'|'+salt),def=CONFIG.roles[role];
 if(!def)return null;
 const value=(key,n)=>hash(seed+'|'+key)%n;
 const starting=base==null?CONFIG.rating.generatedBase+value('base',CONFIG.rating.generatedRange):Number(base);
 const ratings={strategy:0,development:0,communication:0,adaptability:0,conditioning:0,injuryPrevention:0};
 for(const key of Object.keys(ratings))ratings[key]=clamp(starting-8+value(key,18),CONFIG.rating.min,CONFIG.rating.max);
 const name=FIRST[value('first',FIRST.length)]+' '+LAST[value('last',LAST.length)];
 const playbook=def.schemes[value('playbook',def.schemes.length)];
 const prefs=[playbook,def.schemes[(def.schemes.indexOf(playbook)+1+value('pref',def.schemes.length-1))%def.schemes.length]];
 const affinities=AFFINITIES[role],k=value('affinity',affinities.length);
 const c={id:'coach-'+team+'-'+role+'-'+year+'-'+salt,name,role,ratings,
   preferredSchemes:prefs,playbook,affinities:[affinities[k],affinities[(k+4)%affinities.length]],
   age:35+value('age',24),yearsOnStaff:0,yearsCoaching:4+value('experience',18),
   retainedThrough:0,interim:false};
 c.overall=overall(c);return c;
}
function init(s){
 if(!s||!Array.isArray(s.players))return null;
 const staff=s.staffV2??={version:1,teams:{},events:[],freeAgents:[],lastWeekKey:'',lastSeasonYear:0,conflicts:[],conflict:null};
 staff.teams??={};staff.events??=[];staff.freeAgents??=[];staff.conflicts??=[];
 const size=root.TEAMS?.length||32;
 for(let t=0;t<size;t++){
   const team=staff.teams[t]??={};
   for(const role of Object.keys(CONFIG.roles)){
     if(team[role]){team[role].role=role;team[role].overall=overall(team[role]);continue}
     const legacy=t===s.team?s.staff?.[({offense:'offensiveCoordinator',defense:'defensiveCoordinator',special:'specialTeamsCoordinator',strength:'strengthCoach'}[role])]:null;
     team[role]=makeCoach(t,role,s.year,0,legacy?.rating);
   }
 }
 return staff;
}
function coach(s,team,role){const staff=s.staffV2||init(s);return staff?.teams?.[team]?.[role]||null}
function teamScheme(s,team,role){
 if(role==='strength')return 'Balanced';
 const side=role==='offense'?'offense':'defense';
 return role==='special'?'Balanced':s.franchiseSystems?.schemes?.[team]?.[side]||(side==='offense'?'Balanced':'Cover 3');
}
function coachSchemeBonus(c,scheme){
 if(!c)return 0;
 return c.preferredSchemes?.includes(scheme)?CONFIG.game.schemeMatch:CONFIG.game.schemeMismatch;
}
function isDisrupted(s,team,role){return !!s.staffV2?.disruptions?.[team]?.[role]&&s.staffV2.disruptions[team][role]===s.year}
function gameModifier(s,team,role){
 const c=coach(s,team,role);if(!c)return 0;
 let delta=(overall(c)-70)*CONFIG.game.perRatingPoint+coachSchemeBonus(c,teamScheme(s,team,role));
 if(role==='offense'&&isDisrupted(s,team,role))delta+=CONFIG.game.offenseDisruption;
 if(role==='special')delta*=CONFIG.game.specialTeamsWeight;
 return clamp(delta,-CONFIG.game.maxPoints-(role==='offense'&&isDisrupted(s,team,role)?2:0),CONFIG.game.maxPoints);
}
function developmentMultiplier(p,s){
 if(!s||p?.team<0)return 1;
 const role=sideFor(p),c=coach(s,p.team,role),strength=coach(s,p.team,'strength');
 if(!c)return 1;
 const archetype=p.development?.archetype||'';
 const affinity=c.affinities?.includes(archetype)?CONFIG.development.affinity:0;
 const match=c.preferredSchemes?.includes(teamScheme(s,p.team,role))?CONFIG.development.schemeMatch:0;
 let multiplier=1+(Number(c.ratings?.development||70)-70)*CONFIG.development.perSkillPoint+
   (Number(strength?.ratings?.development||70)-70)*CONFIG.development.strengthPerPoint+affinity+match;
 if(role==='offense'&&isDisrupted(s,p.team,role))multiplier*=CONFIG.development.offenseDisruption;
 return clamp(multiplier,CONFIG.development.min,CONFIG.development.max);
}
function conditioning(p,s){
 const c=coach(s,p.team,'strength');if(!c)return {fatigueRecovery:0,injuryMultiplier:1};
 return {
   fatigueRecovery:clamp(((c.ratings.conditioning||70)-70)*CONFIG.conditioning.fatiguePerPoint,
     CONFIG.conditioning.fatigueMin,CONFIG.conditioning.fatigueMax),
   injuryMultiplier:clamp(1-((c.ratings.injuryPrevention||70)-70)*CONFIG.conditioning.injuryPerPoint,
     CONFIG.conditioning.injuryMin,CONFIG.conditioning.injuryMax)
 };
}
function mandate(s){
 const owner=root.GMOwner?.init(s)||s.ownerFranchise;
 const target=owner?.goals?.find(g=>g.id==='WINS')?.target||8;
 const roster=s.players.filter(p=>p.team===s.team);
 const youth=roster.filter(p=>Number(p.age)<=CONFIG.conflict.youngAge).length/Math.max(1,roster.length);
 const winNow=target>=CONFIG.conflict.winNowTarget||owner?.jobSecurity<CONFIG.conflict.jobPressure;
 return {target,youth,winNow};
}
function evaluateConflict(s){
 const x=init(s),history=x.conflicts;
 if(x.conflict?.year===s.year)return x.conflict;
 if(history.some(c=>c.year===s.year))return null;
 const h=root.GMCoaching?.init(s)?.headCoach||s.coachingPhilosophy?.headCoach||'Balanced';
 const m=mandate(s);let reason='';
 if(m.winNow&&h==='Developmental')reason='Ownership demands immediate wins, but the head coach prioritizes developing young players.';
 else if(!m.winNow&&m.youth>=CONFIG.conflict.youngRosterFraction&&['Aggressive','Conservative'].includes(h))
   reason='Ownership wants a youth movement, but the coaching philosophy prioritizes immediate results.';
 if(!reason)return null;
 x.conflict={year:s.year,philosophy:h,reason,status:'UNRESOLVED',raisedWeek:s.week};
 s.news?.unshift('OWNER–COACH TENSION: '+reason);
 return x.conflict;
}
function resolveConflict(s,choice){
 const staff=init(s),c=staff.conflict||evaluateConflict(s);
 if(!c||c.year!==s.year||c.status!=='UNRESOLVED')return {ok:false,error:'No unresolved conflict'};
 if(!['owner','coach','compromise'].includes(choice))return {ok:false,error:'Invalid response'};
 const change=CONFIG.conflict[choice],owner=root.GMOwner?.init(s)||s.ownerFranchise;
 if(owner){owner.jobSecurity=clamp(owner.jobSecurity+change.security,0,100);
   owner.fanHappiness=clamp(owner.fanHappiness+change.fans,0,100);
   owner.mediaHeat=clamp(owner.mediaHeat+change.media,0,100);}
 for(const p of s.players.filter(p=>p.team===s.team))p.morale=clamp((p.morale??65)+change.morale,0,100);
 c.status='RESOLVED';c.choice=choice;c.resolvedWeek=s.week;
 staff.conflicts.unshift({...c});staff.conflicts.length=Math.min(staff.conflicts.length,CONFIG.logLimit);
 s.news?.unshift('Owner and coaching staff resolved their dispute: '+choice.toUpperCase()+'.');
 return {ok:true,change};
}
function weekly(s){
 const x=init(s),key=s.year+':'+s.week;
 if(x.lastWeekKey===key)return;
 evaluateConflict(s);
 if(x.conflict?.year===s.year&&x.conflict.status==='UNRESOLVED'&&
    s.week>1&&s.week%CONFIG.conflict.unresolvedIntervalWeeks===0){
   const o=root.GMOwner?.init(s)||s.ownerFranchise;
   if(o)o.jobSecurity=clamp(o.jobSecurity+CONFIG.conflict.unresolvedSecurity,0,100);
 }
 x.lastWeekKey=key;
}
function retain(s,role){
 if(!CONFIG.roles[role]||role==='strength')return {ok:false,error:'Choose a coordinator to retain'};
 const x=init(s),c=x.teams[s.team][role];const cost=CONFIG.retention.baseCost+
   Math.round(overall(c)*CONFIG.retention.ratingSurcharge);
 if(c.retainedThrough>=s.year+CONFIG.retention.yearsProtected)return {ok:false,error:'Coach already retained for next year'};
 if(s.cash<cost)return {ok:false,error:'Not enough franchise cash'};
 s.cash=Math.round((s.cash-cost)*100)/100;c.retainedThrough=s.year+CONFIG.retention.yearsProtected;
 s.news?.unshift(c.name+' signed a retention bonus and will stay for the next season.');
 return {ok:true,cost};
}
function candidates(s,role){
 if(!CONFIG.roles[role])return [];
 return Array.from({length:CONFIG.hiring.candidatesPerRole},(_,i)=>makeCoach(s.team,role,s.year,90+i,68+i*6));
}
function hire(s,role,index){
 if(!CONFIG.roles[role])return {ok:false,error:'Unknown coaching role'};
 const options=candidates(s,role),choice=options[index];
 if(!choice)return {ok:false,error:'Invalid candidate'};
 const cost=CONFIG.hiring.baseCost+Math.round(overall(choice)*CONFIG.hiring.ratingSurcharge);
 if(s.cash<cost)return {ok:false,error:'Not enough franchise cash'};
 const staff=init(s),previous=staff.teams[s.team][role];staff.freeAgents.unshift(previous);
 staff.freeAgents.length=Math.min(staff.freeAgents.length,20);
 s.cash=Math.round((s.cash-cost)*100)/100;staff.teams[s.team][role]=choice;
 s.news?.unshift('Hired '+choice.name+' as '+CONFIG.roles[role].label+'.');
 return {ok:true,coach:choice,cost};
}
function seasonEnd(s,random=Math.random){
 const x=init(s);if(x.lastSeasonYear===s.year)return [];
 const size=root.TEAMS?.length||32,events=[];
 for(let team=0;team<size;team++)for(const role of Object.keys(CONFIG.roles)){
   const c=x.teams[team][role];if(!c)continue;
   c.yearsOnStaff++;c.yearsCoaching++;c.age++;
   if(random()<CONFIG.rating.yearlyGrowthChance){
     const key=Object.keys(CONFIG.roles[role].weights).sort((a,b)=>(c.ratings[a]||0)-(c.ratings[b]||0))[0];
     c.ratings[key]=clamp(c.ratings[key]+CONFIG.rating.yearlyGrowth,CONFIG.rating.min,CONFIG.rating.max);
   }
   c.overall=overall(c);
 }
 const roles=['offense','defense','special'];
 const alreadyMoved=new Set();
 // Include all teams; each opening/coach can take part in at most one move.
 for(let team=0;team<size&&events.length<CONFIG.poaching.maxMovesPerSeason;team++){
   for(const role of roles){
     if(events.length>=CONFIG.poaching.maxMovesPerSeason)break;
     if(alreadyMoved.has(team+'|'+role))continue;
     const c=x.teams[team][role],chance=role==='offense'?CONFIG.poaching.chanceOffense:
       role==='defense'?CONFIG.poaching.chanceDefense:CONFIG.poaching.chanceSpecial;
     if(overall(c)<CONFIG.poaching.minimumRating||c.retainedThrough>=s.year+1||random()>=chance)continue;
     if(size<2)continue;
     const candidates=Array.from({length:size},(_,i)=>i).filter(t=>t!==team&&t!==s.team&&!alreadyMoved.has(t+'|'+role));
     if(!candidates.length)continue;
     const destination=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];
     alreadyMoved.add(team+'|'+role);alreadyMoved.add(destination+'|'+role);
     const previous=x.teams[destination][role];x.freeAgents.unshift(previous);
     const moved={...c,yearsOnStaff:0,retainedThrough:0};
     x.teams[destination][role]=moved;
     x.teams[team][role]=makeCoach(team,role,s.year+1,79+events.length,CONFIG.poaching.interimRating);
     x.teams[team][role].interim=true;
     x.disruptions??={};x.disruptions[team]??={};
     if(role==='offense'&&overall(c)>=CONFIG.poaching.minimumRating)
       x.disruptions[team].offense=s.year+CONFIG.poaching.disruptionSeasons;
     const entry={year:s.year,role,name:c.name,from:team,to:destination,rating:overall(c)};
     events.push(entry);x.events.unshift(entry);
     if(team===s.team)s.news?.unshift(c.name+' was hired away by '+(root.TEAMS?.[destination]?.[1]||'another team')+
       '. An interim '+CONFIG.roles[role].label+' takes over.');
   }
 }
 x.events.length=Math.min(x.events.length,CONFIG.logLimit);
 x.freeAgents.length=Math.min(x.freeAgents.length,20);
 x.lastSeasonYear=s.year;
 return events;
}
function page(s){
 const x=init(s),staff=x.teams[s.team],owner=root.GMOwner?.init(s)||s.ownerFranchise;
 const conflict=evaluateConflict(s);
 const roles=Object.keys(CONFIG.roles);
 return '<div class="eyebrow">FOOTBALL OPERATIONS</div><h1 class="heading">COACHING STAFF</h1>'+
 '<p class="sub">Coordinate schemes, playbooks, player development, conditioning and staff retention. Cash bonuses do not affect the player salary cap.</p>'+
 '<div class="grid three"><div class="card"><h3>STAFF EFFICIENCY</h3><h1>'+Math.round((overall(staff.offense)+overall(staff.defense)+overall(staff.special)+overall(staff.strength))/4)+'</h1><p>Average coordinator rating</p></div>'+
 '<div class="card"><h3>JOB SECURITY</h3><h1>'+Math.round(owner?.jobSecurity??70)+'%</h1><p>Owner confidence</p></div>'+
 '<div class="card"><h3>FRANCHISE CASH</h3><h1>$'+Number(s.cash||0).toFixed(1)+'M</h1><p>For hiring and retention</p></div></div>'+
 (conflict?.status==='UNRESOLVED'?'<div class="card"><h2>OWNER–COACH CONFLICT</h2><p>'+safe(conflict.reason)+'</p><p>Choose how to handle the disagreement:</p>'+
 '<button onclick="gmStaffConflict(\'owner\')">BACK OWNERSHIP</button> <button onclick="gmStaffConflict(\'coach\')">BACK COACH</button> <button onclick="gmStaffConflict(\'compromise\')">COMPROMISE</button></div>':
 '<div class="card"><h3>FRANCHISE ALIGNMENT</h3><p>'+(conflict?.year===s.year?'Conflict resolved: '+safe(conflict.choice):'Owner and coaching philosophy currently aligned.')+'</p></div>')+
 '<div class="grid two">'+roles.map(role=>{
   const c=staff[role],eff=gameModifier(s,s.team,role),aff=c.affinities||[];
   return '<div class="card"><div class="eyebrow">'+CONFIG.roles[role].label+'</div><h2>'+safe(c.name)+'</h2>'+
   '<p><b>'+overall(c)+' OVR</b> · '+(c.interim?'INTERIM · ':'')+c.yearsOnStaff+' seasons with team</p>'+
   '<p>Strategy '+(c.ratings.strategy||0)+' · Development '+(c.ratings.development||0)+' · Communication '+(c.ratings.communication||0)+'</p>'+
   (role==='strength'?'<p>Conditioning '+c.ratings.conditioning+' · Injury prevention '+c.ratings.injuryPrevention+'</p>':'')+
   '<p>Playbook: <b>'+safe(c.playbook)+'</b> · Schemes: '+safe(c.preferredSchemes.join(', '))+'</p>'+
   '<p>Preferred archetypes: '+safe(aff.join(' / '))+'</p>'+
   '<p>Matchup modifier: '+(eff>=0?'+':'')+eff.toFixed(2)+' · Next-year retention: '+(c.retainedThrough>=s.year+1?'SECURED':'OPEN')+'</p>'+
   (role!=='strength'?'<button onclick="gmStaffRetain(\''+role+'\')">RETAIN</button> ':'')+
   '<button onclick="gmStaffShowCandidates(\''+role+'\')">REPLACE / HIRE</button></div>';
 }).join('')+'</div>'+
 '<div class="card"><h3>STAFF MOVEMENT</h3>'+
 (x.events.slice(0,8).map(e=>'<p>'+e.year+' · '+safe(e.name)+' ('+e.role+') → '+safe(root.TEAMS?.[e.to]?.[1]||'AI team')+'</p>').join('')||'<p>No coordinator moves recorded yet.</p>')+
 '</div>';
}
root.GMStaff={CONFIG,makeCoach,overall,init,coach,teamScheme,gameModifier,
 developmentMultiplier,conditioning,mandate,evaluateConflict,resolveConflict,weekly,
 retain,candidates,hire,seasonEnd,page,isDisrupted};
root.Gridiron?.register?.('coachingStaff',root.GMStaff);
root.gmStaffConflict=function(choice){const r=root.GMStaff.resolveConflict(state,choice);if(!r.ok)alert(r.error);else save();render()};
root.gmStaffRetain=function(role){const r=root.GMStaff.retain(state,role);if(!r.ok)alert(r.error);else save();render()};
root.gmStaffShowCandidates=function(role){
 const options=root.GMStaff.candidates(state,role);
 const choices=options.map((x,i)=>(i+1)+': '+x.name+' ('+root.GMStaff.overall(x)+' OVR, '+x.playbook+')').join('\n');
 const response=prompt('Select a new '+CONFIG.roles[role]?.label+' (enter 1–'+options.length+'):\n'+choices,'1');
 if(response===null)return;
 const chosen=Number(response)-1;
 if(!Number.isInteger(chosen)||chosen<0||chosen>=options.length){alert('Invalid candidate');return}
 const result=root.GMStaff.hire(state,role,chosen);
 if(!result.ok)alert(result.error);else save();render();
};
})(window);
