/* Gridiron GM roster rules. Additive; no external dependencies. */
(function(root){
'use strict';
const LIMITS={ACTIVE:53,PRACTICE:16,IR:99,PUP:99},STATUSES=Object.keys(LIMITS);
const AUTO_CUTS={minimumByPosition:{QB:2,RB:2,WR:3,TE:1,OL:4,DL:3,LB:3,CB:2,S:2,K:1}};
const POSITION_VALUE={QB:1.55,RB:.83,WR:1.15,TE:.93,OL:1.18,DL:1.24,LB:1.02,CB:1.25,S:.97,K:.55};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
function init(s){s.rosterRules??={activeLimit:53,practiceLimit:16,irReturnLimit:8,irReturnsUsed:{},finalCutsComplete:{},cutDeadlineWeek:1};for(const p of s.players){if(p.team>=0){p.rosterStatus??='ACTIVE';p.depthLocked??=false;p.practiceSquadWeeks??=0}else p.rosterStatus='FREE_AGENT'}return s.rosterRules}
function status(p){return p.rosterStatus||'ACTIVE'}
function members(s,team,type='ACTIVE'){init(s);return s.players.filter(p=>p.team===team&&status(p)===type)}
function count(s,team){return Object.fromEntries(STATUSES.map(x=>[x,members(s,team,x).length]))}
function eligible(p,s,type){
 if(type==='PRACTICE'&&(p.age>=30||p.rating>=85))return 'Veteran/high-rated player is not practice-squad eligible';
 if(type==='IR'&&Number(p.injury)<4)return 'IR requires an injury of at least four weeks';
 if(type==='PUP'&&(s.week>1||Number(p.injury)<4))return 'PUP requires an eligible injury before the regular season';
 return null;
}
function move(p,s,type){
 init(s);if(!p||p.team<0||!STATUSES.includes(type))return {ok:false,error:'Invalid player or designation'};
 if(status(p)===type)return {ok:true};
 const team=p.team,prior=status(p),n=count(s,team);
 if(n[type]>=LIMITS[type])return {ok:false,error:type+' roster is full'};
 const problem=eligible(p,s,type);if(problem)return {ok:false,error:problem};
 if((prior==='IR'||prior==='PUP')&&type!=='IR'&&type!=='PUP'){
  if(s.year<(p.rosterStatusYear||s.year)||s.year===(p.rosterStatusYear||s.year)&&s.week<(p.eligibleReturnWeek||1))return {ok:false,error:'Minimum four-game absence not complete'};
  const used=s.rosterRules.irReturnsUsed[s.year]||0;
  if(used>=s.rosterRules.irReturnLimit)return {ok:false,error:'Season return limit reached'};
  s.rosterRules.irReturnsUsed[s.year]=used+1;
 }
 p.rosterStatus=type;p.rosterStatusYear=s.year;p.rosterStatusWeek=s.week;
 if(type==='IR'||type==='PUP')p.eligibleReturnWeek=s.week+4;
 if(type==='PRACTICE')p.practiceSquadWeeks=0;
 return {ok:true,from:prior,to:type};
}
function validate(s,team){const c=count(s,team),issues=[];if(c.ACTIVE>53)issues.push('Active roster exceeds 53 players');if(c.PRACTICE>16)issues.push('Practice squad exceeds 16 players');return {ok:!issues.length,issues,counts:c}}
function finalCuts(s,team){const check=validate(s,team);if(!check.ok)return check;s.rosterRules.finalCutsComplete[s.year+'-'+team]=true;return {ok:true,counts:check.counts}}
function autoPracticeCuts(s,team,dryRun=false){
 const counts=count(s,team),needed=Math.max(0,counts.ACTIVE-LIMITS.ACTIVE);
 if(!needed)return {ok:true,needed:0,moved:[],counts};
 if(counts.PRACTICE+needed>LIMITS.PRACTICE)
   return {ok:false,error:'Not enough practice squad space for '+needed+' cuts',needed,moved:[]};
 const active=members(s,team,'ACTIVE');
 const byPosition=Object.fromEntries([...new Set(active.map(p=>p.pos))]
   .map(pos=>[pos,active.filter(p=>p.pos===pos).length]));
 const chosen=[];
 const choices=active.filter(p=>!p.depthLocked&&!p.target&&!eligible(p,s,'PRACTICE'))
   .sort((a,b)=>(a.rating||0)-(b.rating||0)||(a.age||0)-(b.age||0));
 for(const p of choices){
   if(chosen.length>=needed)break;
   if(byPosition[p.pos]<=(AUTO_CUTS.minimumByPosition[p.pos]||1))continue;
   byPosition[p.pos]--;
   chosen.push(p);
 }
 if(chosen.length<needed)
   return {ok:false,error:'Not enough eligible backups to reach 53. Make manual cuts or free practice squad space.',needed,moved:[]};
 if(!dryRun){
   for(const p of chosen){
     const result=move(p,s,'PRACTICE');
     if(!result.ok)throw Error('Auto final cuts interrupted: '+result.error);
   }
   s.news?.unshift('Final cuts: '+chosen.length+' eligible backups moved to the practice squad.');
   finalCuts(s,team);
 }
 return {ok:true,needed,moved:chosen.map(p=>({id:p.id,name:p.name,pos:p.pos,rating:p.rating})),
   counts:dryRun?counts:count(s,team)};
}

function playable(p){return (status(p)==='ACTIVE'||(status(p)==='PRACTICE'&&p.weeklyElevation?.active))&&Number(p.injury||0)<=0&&!p.contractAdvanced?.holdout}
function lock(p,locked=true){if(!p)return false;p.depthLocked=!!locked;return true}
function depth(s,team,pos){const ps=[...members(s,team,'ACTIVE'),...members(s,team,'PRACTICE').filter(p=>p.weeklyElevation?.active)].filter(p=>p.pos===pos),saved=s.franchiseSystems?.depthCharts?.[team]?.[pos]||[],order=new Map(saved.map((id,i)=>[String(id),i]));
 const value=p=>p.rating-(p.fatigue||0)*.13+(p.form||0)*.9-(p.injury||0)*25;
 return ps.sort((a,b)=>Number(b.depthLocked)-Number(a.depthLocked)||
 (order.size?(order.get(String(a.id))??999)-(order.get(String(b.id))??999):0)||
 value(b)-value(a));
}
function pickValue(round,slot=16){const overall=(Math.max(1,round)-1)*32+clamp(slot,1,32);return Math.round(3000*Math.pow(overall,-.64))}
function scarcity(s,team,pos){const count=members(s,team).filter(p=>p.pos===pos&&playable(p)).length,desired={QB:2,RB:3,WR:5,TE:3,OL:5,DL:5,LB:4,CB:4,S:3,K:1}[pos]||3;return clamp(1+(desired-count)*.08,.85,1.35)}
function tradeValue(p,s,recipient){const talent=(p.rating||60)*1.3+Math.max(0,(p.pot||p.rating)-p.rating)*.7;return Math.round(talent*POSITION_VALUE[p.pos]*scarcity(s,recipient,p.pos)*clamp(1-(p.age-26)*.016,.7,1.12))}
function weekly(s){init(s);for(const p of s.players){if(status(p)==='PRACTICE')p.practiceSquadWeeks++;if(p.rosterStatusYear<s.year&&(status(p)==='IR'||status(p)==='PUP')){p.rosterStatus='ACTIVE';p.eligibleReturnWeek=null}}}
function page(s){const c=count(s,s.team),safe=x=>String(x).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])),tabs=['ACTIVE','PRACTICE','IR','PUP'];const selected=root.gmRosterTab||'ACTIVE';return '<div class="eyebrow">FRANCHISE PERSONNEL</div><h1 class="heading">ROSTER CONTROL</h1><p class="sub">Active '+c.ACTIVE+'/53 · Practice '+c.PRACTICE+'/16 · IR '+c.IR+' · PUP '+c.PUP+'</p><div class="filters">'+tabs.map(t=>'<button onclick="gmRosterTab=\''+t+'\';render()" class="'+(selected===t?'selected':'')+'">'+t+'</button>').join('')+'</div><button onclick="gmFinalizeCuts()">VERIFY FINAL CUTS</button>'+
 (c.ACTIVE>LIMITS.ACTIVE?'<button class="primary" onclick="gmAutoFinalCuts()">MOVE ELIGIBLE BACKUPS TO PRACTICE ('+(c.ACTIVE-LIMITS.ACTIVE)+')</button>':'')+
 members(s,s.team,selected).map(p=>'<div class="card"><div class="row"><b>'+safe(p.name)+'</b><span>'+p.pos+' · '+p.rating+' OVR</span></div><p class="muted">Fatigue '+Math.round(p.fatigue||0)+' · Injury '+(p.injury||0)+' weeks · Trade value '+tradeValue(p,s,(s.team+1)%TEAMS.length)+'</p><div class="filters"><button onclick="gmRosterLock('+p.id+')">'+(p.depthLocked?'UNLOCK STARTER':'LOCK STARTER')+'</button>'+tabs.filter(t=>t!==selected).map(t=>'<button onclick="gmRosterMove('+p.id+',\''+t+'\')">MOVE TO '+t+'</button>').join('')+'</div></div>').join('')}
root.GMRosterRules={LIMITS,AUTO_CUTS,POSITION_VALUE,init,status,members,count,eligible,move,validate,finalCuts,autoPracticeCuts,playable,lock,depth,pickValue,scarcity,tradeValue,weekly,page};
root.gmRosterTab='ACTIVE';
root.gmRosterMove=function(id,type){const p=state.players.find(x=>x.id===id),result=move(p,state,type);if(!result.ok)alert(result.error);else save();render()};
root.gmRosterLock=function(id){const p=state.players.find(x=>x.id===id);lock(p,!p.depthLocked);save();render()};
root.gmFinalizeCuts=function(){const r=finalCuts(state,state.team);alert(r.ok?'Roster compliant. Final cuts confirmed.':r.issues.join('\n'));save();render()};
root.gmAutoFinalCuts=function(){
 const preview=autoPracticeCuts(state,state.team,true);
 if(!preview.ok)return alert(preview.error);
 if(!preview.moved.length)return alert('Your active roster already meets the 53-player limit.');
 const names=preview.moved.map(p=>p.name+' ('+p.pos+', '+p.rating+' OVR)').join(', ');
 if(!confirm('Move '+preview.moved.length+' eligible backups to the practice squad without releasing their contracts? '+names))return;
 const result=autoPracticeCuts(state,state.team);
 if(!result.ok)return alert(result.error);
 save();render();
};
})(window);