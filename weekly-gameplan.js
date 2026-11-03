/* Gridiron GM — Priority 3: Weekly Game Plan & Practice.
   Additive classic script. Load after roster-rules.js and before engine.js. */
(function(root){
'use strict';
const CONFIG={
  deadlineWeek:12,tradeMarketStartWeek:9,
  trade:{sellerWinPct:.45,contenderWinPct:.60,sellerMultiplier:.93,
    contenderMultiplier:1.12,neutralMultiplier:1.00,earlyMultiplier:1.00},
  plan:{passRatio:{min:25,max:80,step:5},blitzRate:{min:5,max:75,step:5},
    offense:['Balanced','Aggressive','Conservative'],
    defense:['Balanced','Aggressive','Conservative'],
    targeting:['Balanced','Secondary','Front Seven','Quarterback','Run Game'],
    offensePoints:{Balanced:0,Aggressive:1.15,Conservative:-.65},
    defensePoints:{Balanced:0,Aggressive:1.1,Conservative:-.3},
    aggressionTradeoff:{Aggressive:-.35,Conservative:.35,Balanced:0},
    targetAdvantage:1.05,targetPenalty:-.3,targetRatingThreshold:76,
    maxGameModifier:2.8},
  focus:{cost:3,maxPerWeek:3,techniqueRating:2,recoveryFatigue:12,
    filmXP:85,filmMorale:1,modes:['TECHNIQUE','RECOVERY','FILM']},
  elevation:{maxPerWeek:2,maxPerPlayerSeason:3,temporaryRating:1},
  practice:{winnerMorale:2,maxReports:40},
  report:{latest:8}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const escape=v=>String(v??'').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const key=s=>s.year+':'+s.week;
const isActive=p=>p.rosterStatus!=='PRACTICE'&&p.rosterStatus!=='IR'&&p.rosterStatus!=='PUP';
function init(s){
 const x=s.weeklyOperations??={
   version:1,season:s.year,plan:{offense:'Balanced',defense:'Balanced',target:'Balanced'},
   plans:{},focuses:{},elevations:{},elevationCounts:{},
   reports:[],processedWeek:''
 };
 x.plans??={};x.focuses??={};x.elevations??={};x.elevationCounts??={};x.reports??=[];
 x.plan??={offense:'Balanced',defense:'Balanced',target:'Balanced'};
 if(x.season!==s.year){
   x.season=s.year;x.plan={offense:'Balanced',defense:'Balanced',target:'Balanced'};
   x.plans={};x.focuses={};x.elevations={};x.elevationCounts={};
   x.processedWeek='';
 }
 const current=key(s);
 x.plans[current]??={...x.plan};
 x.focuses[current]??=[];x.elevations[current]??=[];
 // Ensure that stale temporary elevation flags cannot carry into a new game week.
 for(const p of s.players||[])if(p.weeklyElevation?.active&&p.weeklyElevation.key!==current)
   p.weeklyElevation.active=false;
 return x;
}
function plan(s){
 const x=init(s),p=x.plans[key(s)],c=root.GMCoaching?.init(s)?.weeklyPlan;
 return {offense:p.offense,defense:p.defense,target:p.target,
   passRatio:clamp(c?.passRatio??55,CONFIG.plan.passRatio.min,CONFIG.plan.passRatio.max),
   blitzRate:clamp(c?.blitz??35,CONFIG.plan.blitzRate.min,CONFIG.plan.blitzRate.max)};
}
function set(s,field,value){
 if(s.week>18)return {ok:false,error:'Regular season is complete'};
 const x=init(s),p=x.plans[key(s)];
 if(field==='passRatio'||field==='blitzRate'){
   const rule=CONFIG.plan[field],n=Number(value);
   if(!Number.isFinite(n)||n<rule.min||n>rule.max||n%rule.step!==0)
     return {ok:false,error:'Invalid percentage'};
   root.GMCoaching?.set(s,field==='passRatio'?'passRatio':'blitz',n);
   if(!root.GMCoaching){s.coachingPhilosophy??={};s.coachingPhilosophy.weeklyPlan??={};s.coachingPhilosophy.weeklyPlan[field==='passRatio'?'passRatio':'blitz']=n}
   return {ok:true,value:n};
 }
 const options=CONFIG.plan[field==='offense'?'offense':field==='defense'?'defense':field==='target'?'targeting':null];
 if(!options?.includes(value))return {ok:false,error:'Invalid game-plan setting'};
 p[field]=value;
 return {ok:true,value};
}
function opponent(s){
 const g=s.engine?.schedule?.find(g=>g.week===s.week&&(g.a===s.team||g.b===s.team));
 return g?(g.a===s.team?g.b:g.a):null;
}
function opponentUnit(s,team,positions){
 const candidates=s.players.filter(p=>p.team===team&&positions.includes(p.pos)&&
   isActive(p)&&Number(p.injury||0)<=0);
 if(!candidates.length)return 60;
 const strongest=candidates.slice().sort((a,b)=>b.rating-a.rating).slice(0,Math.min(6,candidates.length));
 return strongest.reduce((a,p)=>a+(p.rating||60),0)/strongest.length;
}
function matchup(s,g,team){
 if(team!==s.team)return {offense:0,defense:0,notes:[]};
 const p=plan(s),other=g.a===team?g.b:g.a;
 let offense=CONFIG.plan.offensePoints[p.offense]||0,defense=CONFIG.plan.defensePoints[p.defense]||0;
 defense+=CONFIG.plan.aggressionTradeoff[p.offense]||0;
 const notes=[];
 const pairs={
   Secondary:{units:['CB','S'],side:'offense'},
   'Front Seven':{units:['DL','LB'],side:'offense'},
   Quarterback:{units:['QB'],side:'defense'},
   'Run Game':{units:['RB','OL'],side:'defense'}
 };
 if(p.target!=='Balanced'){
   const target=pairs[p.target],strength=opponentUnit(s,other,target.units);
   const gain=strength<CONFIG.plan.targetRatingThreshold?
     CONFIG.plan.targetAdvantage:CONFIG.plan.targetPenalty;
   if(target.side==='offense')offense+=gain;else defense+=gain;
   notes.push('Targeted '+p.target+' ('+Math.round(strength)+' opponent OVR) · '+(gain>0?'+':'')+gain.toFixed(2));
 }
 return {offense:clamp(offense,-CONFIG.plan.maxGameModifier,CONFIG.plan.maxGameModifier),
   defense:clamp(defense,-CONFIG.plan.maxGameModifier,CONFIG.plan.maxGameModifier),notes};
}
function focusList(s){return init(s).focuses[key(s)]}
function focus(s,id,mode){
 if(s.week>18)return {ok:false,error:'Season is complete'};
 if(!CONFIG.focus.modes.includes(mode))return {ok:false,error:'Unknown focus'};
 const x=init(s),entries=x.focuses[key(s)];
 const p=s.players.find(p=>String(p.id)===String(id)&&p.team===s.team);
 if(!p||!isActive(p)||Number(p.injury||0)>0||p.contractAdvanced?.holdout)
   return {ok:false,error:'Choose a healthy player on your active roster'};
 if(entries.some(f=>String(f.playerId)===String(id)))return {ok:false,error:'Already focused this week'};
 if(entries.length>=CONFIG.focus.maxPerWeek)return {ok:false,error:'Weekly focus limit reached'};
 const budget=root.GMDevelopment?.budget(s);
 if(!budget||budget.points<CONFIG.focus.cost)return {ok:false,error:'Not enough training points'};
 budget.points-=CONFIG.focus.cost;
 if(mode==='RECOVERY')p.fatigue=clamp((p.fatigue||0)-CONFIG.focus.recoveryFatigue,0,100);
 if(mode==='FILM'){
   root.GMDevelopment?.gainXP(p,CONFIG.focus.filmXP,s);
   p.morale=clamp((p.morale??65)+CONFIG.focus.filmMorale,0,100);
 }
 entries.push({playerId:p.id,name:p.name,mode});
 s.news?.unshift('Practice focus: '+p.name+' — '+mode.toLowerCase()+'.');
 return {ok:true,remaining:budget.points};
}
function playerBoost(p,s){
 if(!p||!s)return 0;
 const x=init(s),active=x.focuses[key(s)]||[];
 const tech=active.some(f=>String(f.playerId)===String(p.id)&&f.mode==='TECHNIQUE');
 const elevated=p.weeklyElevation?.active&&p.weeklyElevation.key===key(s);
 return (tech?CONFIG.focus.techniqueRating:0)+(elevated?CONFIG.elevation.temporaryRating:0);
}
function elevate(s,id,replacing){
 if(s.week>18)return {ok:false,error:'Season is complete'};
 if(!root.GMRosterRules)return {ok:false,error:'Roster rules are required for elevation'};
 const x=init(s),active=x.elevations[key(s)];
 const p=s.players.find(p=>String(p.id)===String(id)&&p.team===s.team);
 if(!p||root.GMRosterRules.status(p)!=='PRACTICE'||Number(p.injury||0)>0||p.contractAdvanced?.holdout)
   return {ok:false,error:'Choose a healthy practice-squad player'};
 if(active.some(e=>String(e.playerId)===String(id)))return {ok:false,error:'Already elevated this week'};
 if(active.length>=CONFIG.elevation.maxPerWeek)return {ok:false,error:'Weekly elevation limit reached'};
 const playerKey=s.year+':'+p.id;
 if((x.elevationCounts[playerKey]||0)>=CONFIG.elevation.maxPerPlayerSeason)
   return {ok:false,error:'Player has reached their annual elevation limit'};
 const injury=s.players.find(q=>String(q.id)===String(replacing)&&q.team===s.team&&q.pos===p.pos&&
   Number(q.injury||0)>0);
 if(replacing!=null&&!injury)return {ok:false,error:'Injury replacement must match an injured teammate at this position'};
 const n=root.GMRosterRules.count(s,s.team);
 if(n.ACTIVE+n.PRACTICE<1||n.ACTIVE+active.length>=root.GMRosterRules.LIMITS.ACTIVE+CONFIG.elevation.maxPerWeek)
   return {ok:false,error:'Game-day roster limit reached'};
 p.weeklyElevation={key:key(s),active:true,replacing:injury?.id??null};
 x.elevationCounts[playerKey]=(x.elevationCounts[playerKey]||0)+1;
 active.push({playerId:p.id,name:p.name,pos:p.pos,replacingId:injury?.id??null});
 s.news?.unshift('Practice elevation: '+p.name+' activated for Week '+s.week+'.');
 return {ok:true,count:active.length};
}
function replacements(s){
 if(!root.GMRosterRules)return [];
 const injured=s.players.filter(p=>p.team===s.team&&isActive(p)&&Number(p.injury||0)>0);
 const available=s.players.filter(p=>p.team===s.team&&root.GMRosterRules.status(p)==='PRACTICE'&&
   Number(p.injury||0)<=0&&!p.contractAdvanced?.holdout&&!p.weeklyElevation?.active);
 return injured.map(p=>({injured:p,candidates:available.filter(x=>x.pos===p.pos)}))
   .filter(row=>row.candidates.length);
}
function autoElevate(s){
 const outcomes=[];
 for(const row of replacements(s)){
   if((init(s).elevations[key(s)]||[]).length>=CONFIG.elevation.maxPerWeek)break;
   const candidate=row.candidates.sort((a,b)=>b.rating-a.rating)
     .find(x=>(init(s).elevationCounts[s.year+':'+x.id]||0)<CONFIG.elevation.maxPerPlayerSeason);
   if(candidate){const result=elevate(s,candidate.id,row.injured.id);if(result.ok)outcomes.push(candidate.name)}
 }
 return {ok:outcomes.length>0,players:outcomes};
}
function beginWeek(s){
 const x=init(s);
 const list=x.elevations[key(s)]||[];
 for(const entry of list){
   const p=s.players.find(p=>String(p.id)===String(entry.playerId));
   if(p&&root.GMRosterRules?.status(p)==='PRACTICE'&&Number(p.injury||0)<=0)
     p.weeklyElevation={key:key(s),active:true,replacing:entry.replacingId};
 }
 return plan(s);
}
function releaseElevations(s){
 const x=init(s),list=x.elevations[key(s)]||[];
 for(const entry of list){
   const p=s.players.find(p=>String(p.id)===String(entry.playerId));
   if(p?.weeklyElevation?.key===key(s))p.weeklyElevation.active=false;
 }
}
function practiceScore(p,before={}){
 const stat=p.stats||{},d=k=>Math.max(0,(Number(stat[k])||0)-(Number(before[k])||0));
 return d('passYards')*.025+d('passTD')*8+d('rushYards')*.075+
   d('receivingYards')*.075+d('receptions')*.4+d('rushTD')*6+
   d('tackles')*.75+d('sacks')*5+d('interceptions')*2;
}
function finishWeek(s,before){
 const x=init(s),k=key(s);
 if(x.processedWeek===k)return null;
 const focused=x.focuses[k]||[],elevated=x.elevations[k]||[];
 const participants=s.players.filter(p=>p.team===s.team&&
   (root.GMPlayerPersonality?.snapsThisWeek(p,s)||0)>0);
 const rankings=participants.map(p=>({
   p,score:practiceScore(p,before?.get(p.id)),snaps:root.GMPlayerPersonality?.snapsThisWeek(p,s)||0
 })).sort((a,b)=>b.score-a.score||b.snaps-a.snaps||b.p.rating-a.p.rating);
 const candidate=rankings[0],winner=candidate?.p;
 if(winner)winner.morale=clamp((winner.morale??65)+CONFIG.practice.winnerMorale,0,100);
 const report={year:s.year,week:s.week,playerId:winner?.id??null,player:winner?.name||'No selection',
   playerPosition:winner?.pos||'',score:Math.round(candidate?.score||0),
   seasonWeekKey:k,focuses:focused.map(f=>({...f})),
   elevations:elevated.map(e=>({...e})),target:plan(s).target,notes:[]};
 if(winner){report.notes.push('Player of the Week: '+winner.name+' ('+winner.pos+')');
   s.news?.unshift('Practice Player of the Week: '+winner.name+
     ' earns +'+CONFIG.practice.winnerMorale+' morale.');}
 if(focused.length)report.notes.push(focused.length+' individual training focus(es) completed.');
 if(elevated.length)report.notes.push(elevated.length+' temporary roster elevation(s) used.');
 x.reports.unshift(report);x.reports.length=Math.min(x.reports.length,CONFIG.practice.maxReports);
 x.processedWeek=k;
 releaseElevations(s);
 return report;
}
function tradeTerms(s,team){
 const finished=s.results.filter(g=>g.year===s.year&&(g.a===team||g.b===team));
 const games=finished.length,win=finished.filter(g=>(g.a===team&&g.sa>g.sb)||(g.b===team&&g.sb>g.sa)).length;
 const pct=games?win/games:.5;
 if(s.week>CONFIG.deadlineWeek)return {open:false,multiplier:1,status:'CLOSED',pct};
 if(s.week<CONFIG.tradeMarketStartWeek)return {open:true,multiplier:CONFIG.trade.earlyMultiplier,status:'NORMAL MARKET',pct};
 if(pct<=CONFIG.trade.sellerWinPct)
   return {open:true,multiplier:CONFIG.trade.sellerMultiplier,status:'REBUILDING SELLER',pct};
 if(pct>=CONFIG.trade.contenderWinPct)
   return {open:true,multiplier:CONFIG.trade.contenderMultiplier,status:'PLAYOFF BUYER',pct};
 return {open:true,multiplier:CONFIG.trade.neutralMultiplier,status:'SELECTIVE',pct};
}
function page(s){
 const x=init(s),p=plan(s),r=x.reports[0],opp=opponent(s),
   max=CONFIG.focus.maxPerWeek,entries=focusList(s),elev=x.elevations[key(s)],
   budget=root.GMDevelopment?.budget(s),
   select=(field,values,current,labelFn=v=>v)=>'<select aria-label="'+escape(field)+'" onchange="gmWeeklySet(\''+field+'\',this.value)">'+
     values.map(v=>'<option value="'+escape(v)+'"'+(String(v)===String(current)?' selected':'')+'>'+escape(labelFn(v))+'</option>').join('')+'</select>',
   range=(a,b,step)=>Array.from({length:Math.floor((b-a)/step)+1},(_,i)=>a+i*step),
   active=s.players.filter(v=>v.team===s.team&&isActive(v)&&Number(v.injury||0)<=0)
     .sort((a,b)=>b.rating-a.rating),
   practice=root.GMRosterRules?.members(s,s.team,'PRACTICE')||[],
   market=tradeTerms(s,s.team);
 return '<div class="eyebrow">WEEKLY OPERATIONS · '+s.year+' / W'+s.week+'</div>'+
 '<h1 class="heading">GAME PLAN & PRACTICE</h1><p class="sub">Scouting, matchup targeting, practice focus and temporary game-day elevations. Changes lock when you simulate the week.</p>'+
 '<div class="grid three"><div class="card"><h3>NEXT OPPONENT</h3><h2>'+
   escape(opp==null?'BYE WEEK':root.TEAMS?.[opp]?.[1]||'Team '+opp)+'</h2></div>'+
   '<div class="card"><h3>TRAINING POINTS</h3><h2>'+Number(budget?.points??0)+'</h2><p>Focus costs '+CONFIG.focus.cost+' TP</p></div>'+
   '<div class="card"><h3>TRADE MARKET</h3><h2>WEEK '+CONFIG.deadlineWeek+' DEADLINE</h2><p>'+escape(market.status)+'</p></div></div>'+
 '<div class="card"><h2>01 / GAME PLAN</h2><div class="grid two">'+
 '<p>Passing ratio '+select('passRatio',range(25,80,5),p.passRatio,v=>v+'% pass / '+(100-v)+'% run')+'</p>'+
 '<p>Blitz rate '+select('blitzRate',range(5,75,5),p.blitzRate,v=>v+'%')+'</p>'+
 '<p>Offensive aggression '+select('offense',CONFIG.plan.offense,p.offense)+'</p>'+
 '<p>Defensive aggression '+select('defense',CONFIG.plan.defense,p.defense)+'</p>'+
 '<p>Target matchup '+select('target',CONFIG.plan.targeting,p.target)+'</p></div>'+
 '<p class="muted">Aggression changes team efficiency slightly. Targeting a weak opponent position can help; targeting a strength may hurt.</p></div>'+
 '<div class="card"><h2>02 / PLAYER FOCUS · '+entries.length+'/'+max+'</h2>'+
 '<p class="muted">Technique: temporary +'+CONFIG.focus.techniqueRating+' simulated OVR. Recovery: -'+CONFIG.focus.recoveryFatigue+
 ' fatigue now. Film: '+CONFIG.focus.filmXP+' XP and +1 morale. Focus uses the existing Training Lab points.</p>'+
 '<div style="max-height:320px;overflow:auto">'+active.slice(0,50).map(v=>{
   const selected=entries.find(e=>String(e.playerId)===String(v.id));
   return '<div class="row" style="gap:8px;flex-wrap:wrap;border-bottom:1px solid #303744;padding:8px 0">'+
     '<span><b>'+escape(v.name)+'</b> · '+escape(v.pos)+' · '+v.rating+' OVR · Fatigue '+Math.round(v.fatigue||0)+'</span>'+
     (selected?'<span class="pill">'+escape(selected.mode)+'</span>':
       '<span class="filters"><button onclick="gmWeeklyFocus('+v.id+',\'TECHNIQUE\')">TECHNIQUE</button> '+
       '<button onclick="gmWeeklyFocus('+v.id+',\'RECOVERY\')">RECOVERY</button> '+
       '<button onclick="gmWeeklyFocus('+v.id+',\'FILM\')">FILM</button></span>')+'</div>';
 }).join('')+'</div></div>'+
 '<div class="card"><h2>03 / PRACTICE SQUAD ELEVATIONS · '+elev.length+'/'+CONFIG.elevation.maxPerWeek+'</h2>'+
 '<p class="muted">Temporary game-day availability; each elevated player receives +'+CONFIG.elevation.temporaryRating+
 ' simulated OVR. Players return to practice designation after the game; up to '+CONFIG.elevation.maxPerPlayerSeason+
 ' elevations per player each season.</p>'+
 '<button onclick="gmWeeklyAutoElevate()">AUTO-REPLACE INJURED PLAYERS</button>'+
 '<div style="max-height:280px;overflow:auto">'+practice.map(v=>{
   const selected=elev.some(e=>String(e.playerId)===String(v.id));
   const used=x.elevationCounts[s.year+':'+v.id]||0;
   const valid=!Number(v.injury||0)&&!v.contractAdvanced?.holdout&&used<CONFIG.elevation.maxPerPlayerSeason;
   return '<div class="row" style="padding:8px 0;border-bottom:1px solid #303744;gap:8px"><span>'+
     escape(v.name)+' · '+escape(v.pos)+' · '+v.rating+' OVR · '+used+'/'+CONFIG.elevation.maxPerPlayerSeason+
     '</span><button '+(selected||!valid?'disabled':'')+' onclick="gmWeeklyElevate('+v.id+')">'+
     (selected?'ELEVATED':'ELEVATE')+'</button></div>';
 }).join('')+'</div></div>'+
 '<div class="card"><h2>04 / PRACTICE REPORTS</h2>'+
 (x.reports.slice(0,CONFIG.report.latest).map(y=>'<p><b>'+y.year+' · Week '+y.week+
 '</b> · Player of the Week: '+escape(y.player)+' ('+escape(y.playerPosition)+') · '+y.focuses.length+
 ' focus(es), '+y.elevations.length+' elevation(s)</p>').join('')||'<p>Simulate your next game to generate the first practice report.</p>')+'</div>';
}
root.GMWeeklyGameplan={
 CONFIG,init,plan,set,opponent,matchup,focus,focusList,playerBoost,elevate,replacements,
 autoElevate,beginWeek,releaseElevations,finishWeek,tradeTerms,practiceScore,page
};
root.Gridiron?.register?.('weeklyGameplan',root.GMWeeklyGameplan);
root.gmWeeklySet=(field,v)=>{const r=root.GMWeeklyGameplan.set(state,field,v);if(!r.ok)alert(r.error);else save();render()};
root.gmWeeklyFocus=(id,mode)=>{const r=root.GMWeeklyGameplan.focus(state,id,mode);if(!r.ok)alert(r.error);else save();render()};
root.gmWeeklyElevate=id=>{const r=root.GMWeeklyGameplan.elevate(state,id);if(!r.ok)alert(r.error);else save();render()};
root.gmWeeklyAutoElevate=()=>{const r=root.GMWeeklyGameplan.autoElevate(state);if(!r.ok)alert('No healthy same-position practice replacements available.');else save();render()};
})(window);
