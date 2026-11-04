/* Advanced draft scouting, original fictional prospects, no dependencies. */
(function(root){'use strict';
const TRAITS=['Leadership','Work Ethic','Coachability','Composure'];
const FLAGS=['Prior knee surgery','Recurring hamstring','Shoulder instability','Concussion history','No structural concerns'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const seedOf=p=>{const n=Number(p.id);if(Number.isFinite(n))return Math.abs(n);let h=2166136261;for(const ch of String(p.id||p.name))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0};
function ensure(p){if(!p.draftEvaluation){const seed=seedOf(p),character=TRAITS.map((t,i)=>[t,clamp(55+(seed*(i+7)%43),40,98)]);p.draftEvaluation={character:Object.fromEntries(character),medicalFlag:FLAGS[seed%FLAGS.length],medicalRisk:seed%FLAGS.length===4?.03:.09+(seed%4)*.04,interviewed:false,medicalReviewed:false,workouts:[],confidence:35,gradeDelta:0}}return p.draftEvaluation}
function resources(s){s.draftScouting??={year:s.year,interviews:12,medical:10,workouts:8};if(s.draftScouting.year!==s.year)s.draftScouting={year:s.year,interviews:12,medical:10,workouts:8};return s.draftScouting}
function interview(p,s){const r=resources(s),e=ensure(p);if(e.interviewed)return {ok:false,error:'Interview completed'};if(r.interviews<=0)return {ok:false,error:'No interviews remaining'};r.interviews--;e.interviewed=true;e.confidence=Math.min(100,e.confidence+18);return {ok:true,grades:e.character,confidence:e.confidence}}
function medical(p,s){const r=resources(s),e=ensure(p);if(e.medicalReviewed)return {ok:false,error:'Medical report already reviewed'};if(r.medical<=0)return {ok:false,error:'No evaluations remaining'};r.medical--;e.medicalReviewed=true;e.confidence=Math.min(100,e.confidence+15);return {ok:true,flag:e.medicalFlag,risk:e.medicalRisk}}
function workout(p,s){const r=resources(s),e=ensure(p);if(r.workouts<=0)return {ok:false,error:'No workouts remaining'};const before=p.projection||70;const real=root.GMDraftRealism?.workout(p,s);if(real&&real.ok===false)return real;r.workouts--;const adjustment=real?real.grade-before:Math.round((Math.random()-.5)*6);e.gradeDelta=clamp(e.gradeDelta+adjustment,-8,8);e.workouts.push({year:s.year,week:s.week,adjustment});e.confidence=Math.min(100,e.confidence+12);return {ok:true,adjustment,projectedRating:real?.grade??((p.projection||70)+e.gradeDelta)}}
function pickValue(round,slot=16){return root.GMRosterRules?.pickValue(round,slot)||Math.round(3000*Math.pow((round-1)*32+slot,-.64))}
function tradeOffer(s,give,receive,team){const value=x=>x.kind==='pick'?pickValue(x.round,x.slot):root.GMRosterRules?.tradeValue(x.player,s,team)||x.player.rating*1.3;const outgoing=give.reduce((n,x)=>n+value(x),0),incoming=receive.reduce((n,x)=>n+value(x),0),ratio=incoming?outgoing/incoming:0,margin=root.GMDraftRealism?.CONFIG.trade.margin??1.1;return {outgoing,incoming,ratio,likelyAccepted:ratio>=margin,feedback:ratio>=margin?'Competitive offer':ratio>=.9?'Close; add draft capital':'AI likely rejects: insufficient value'}}
function rookieContract(p,s,round,slot){const overall=(round-1)*32+slot,years=4,annual=+(Math.max(.9,9.5*Math.pow(overall,-.44))).toFixed(2),bonus=+(annual*(round===1?1.8:round===2?1.1:.45)).toFixed(2);const c={startYear:s.year,baseSalaries:Array(years).fill(annual),bonusProration:Array(years).fill(+(bonus/years).toFixed(2)),guarantees:Array(years).fill(round===1?annual:.4*annual),incentives:[],tag:null,holdout:false,disgruntled:false,restructureCount:0,rookie:{round,slot,overall,optionEligible:round===1,optionExercised:false}};p.contractAdvanced=c;p.salary=annual+bonus/years;p.years=years;return c}
function draft(p,s,round,slot){const e=ensure(p);if(e.medicalRisk>.15){p.medical??={active:null,chronicRisk:0,longTermLoss:0};p.medical.chronicRisk=Math.max(p.medical.chronicRisk,e.medicalRisk*.3)}p.morale=clamp((p.morale||65)+(e.character.Leadership-70)*.1,30,95);return rookieContract(p,s,round,slot)}
function prospects(s){return (s.frontOffice?.prospects||s.prospects||s.draftPool||s.draftProspects||[]).filter(p=>p&&p.name)}
function page(s){
 const r=resources(s),ps=prospects(s),ui=s.draftScoutView??={position:'ALL',page:0},
  positions=['ALL','QB','RB','WR','TE','OL','DL','LB','CB','S','K'],perPage=36;
 const filtered=ps.filter(p=>!p.drafted&&(ui.position==='ALL'||p.pos===ui.position))
   .sort((a,b)=>(root.GMDraftRealism?.publicGrade(b,s).overall??b.projection??0)-
               (root.GMDraftRealism?.publicGrade(a,s).overall??a.projection??0));
 const last=Math.max(0,Math.ceil(filtered.length/perPage)-1);
 ui.page=Math.min(Math.max(0,ui.page||0),last);
 const visible=filtered.slice(ui.page*perPage,(ui.page+1)*perPage);
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<h1 class="heading">ADVANCED DRAFT SCOUTING</h1>'+
 '<button onclick="page=\'Draft Combine\';render()">OPEN COMBINE / PRO DAY / PICK TRADES</button>'+
 '<p class="sub">Interviews '+r.interviews+' · Medical '+r.medical+' · Workouts '+r.workouts+
 ' · '+filtered.length+' available prospects · Page '+(ui.page+1)+'/'+(last+1)+'</p>'+
 '<div class="filters">'+positions.map(pos=>'<button class="'+(pos===ui.position?'selected':'')+
 '" onclick="gmScoutPosition('+JSON.stringify(pos)+')">'+pos+'</button>').join('')+'</div>'+
 '<div class="filters"><button '+(ui.page<=0?'disabled ':'')+'onclick="gmScoutPage(-1)">PREVIOUS</button>'+
 '<button '+(ui.page>=last?'disabled ':'')+'onclick="gmScoutPage(1)">NEXT</button></div>'+
 (visible.map(p=>{const e=ensure(p),g=root.GMDraftRealism?.publicGrade(p,s);
  return '<div class="card"><h3>'+safe(p.name)+' · '+safe(p.pos)+'</h3>'+
   '<p>Projected grade '+(g?g.overall+' ± '+g.margin+' ('+g.confidence+'% confidence)':
      Math.round(p.projection||65))+'</p>'+
   '<p>Character '+(e.interviewed?JSON.stringify(e.character):'Not interviewed')+'</p>'+
   '<p>Medical '+(e.medicalReviewed?safe(e.medicalFlag):'Not evaluated')+'</p>'+
   '<button onclick="gmScoutAction('+JSON.stringify(String(p.id))+',\'interview\')">INTERVIEW</button> '+
   '<button onclick="gmScoutAction('+JSON.stringify(String(p.id))+',\'medical\')">MEDICAL</button> '+
   '<button onclick="gmScoutAction('+JSON.stringify(String(p.id))+',\'workout\')">PRIVATE WORKOUT</button></div>';
 }).join('')||'<div class="card">No eligible prospects in this position.</div>')+
 '<div class="filters"><button '+(ui.page<=0?'disabled ':'')+'onclick="gmScoutPage(-1)">PREVIOUS</button>'+
 '<button '+(ui.page>=last?'disabled ':'')+'onclick="gmScoutPage(1)">NEXT</button></div>';
}
root.GMDraftAdvanced={TRAITS,FLAGS,ensure,resources,interview,medical,workout,pickValue,tradeOffer,rookieContract,draft,prospects,page};
root.gmScoutAction=(id,action)=>{
 const p=prospects(state).find(x=>String(x.id)===String(id));
 const handler={interview,medical,workout}[action];
 if(!p||p.drafted||!handler)return;
 const result=handler(p,state);
 if(!result.ok)alert(result.error);else {save();render()}
};
root.gmScoutPosition=pos=>{
 const allowed=['ALL','QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
 if(!allowed.includes(pos))return;
 state.draftScoutView={position:pos,page:0};render();
};
root.gmScoutPage=delta=>{
 state.draftScoutView??={position:'ALL',page:0};
 state.draftScoutView.page=Math.max(0,(state.draftScoutView.page||0)+(delta>0?1:-1));render();
};
})(window);