/* Injury & Medical 2.0 — browser global GMInjuries. */
(function(root){'use strict';
const TYPES={
 HAMSTRING:{name:'Hamstring Strain',weeks:[2,5],reinjury:.18,penalty:.12,longTerm:.04,surgery:false},
 ACL:{name:'ACL Tear',weeks:[24,40],reinjury:.12,penalty:.35,longTerm:.32,surgery:true},
 CONCUSSION:{name:'Concussion',weeks:[1,5],reinjury:.2,penalty:.2,longTerm:.14,surgery:false},
 ANKLE:{name:'High Ankle Sprain',weeks:[3,8],reinjury:.16,penalty:.16,longTerm:.06,surgery:false},
 LABRUM:{name:'Shoulder Labrum Tear',weeks:[8,18],reinjury:.15,penalty:.24,longTerm:.22,surgery:true},
 FIBULA:{name:'Fractured Fibula',weeks:[10,20],reinjury:.08,penalty:.3,longTerm:.12,surgery:true},
 KNEE:{name:'MCL Sprain',weeks:[3,9],reinjury:.14,penalty:.2,longTerm:.08,surgery:false},
 BACK:{name:'Back Strain',weeks:[2,7],reinjury:.22,penalty:.16,longTerm:.1,surgery:false}
};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
function ensure(p){p.injuryHistory??=[];p.medical??={active:null,chronicRisk:0,longTermLoss:0};return p.medical}
function clearance(p){
 const a=p.medical?.active;
 if(!(p.injury>0))return 'FULL';
 if(!a?.playThrough||a.weeks>2||['CONCUSSION','ACL','FIBULA'].includes(a.type))return 'OUT';
 return a.weeks===1?'PROBABLE':'QUESTIONABLE';
}
function staff(s,team=s.team){if(team!==s.team)return root.GMStaff?.coach(s,team,'strength')?.ratings?.conditioning??70;const rating=s.staff?.medical?.rating??s.staff?.strengthCoach?.rating??70;return clamp(rating,35,99)}
function diagnose(p,s,type){const m=ensure(p);if(m.active)return {ok:false,error:'Already injured'};const t=TYPES[type]||TYPES.HAMSTRING,quality=staff(s,p.team),weeks=Math.round(t.weeks[0]+Math.random()*(t.weeks[1]-t.weeks[0]));const estimated=Math.max(1,Math.round(weeks+(Math.random()-.5)*(100-quality)/15));m.active={type:type in TYPES?type:'HAMSTRING',name:t.name,weeks,estimate:estimated,treatment:'UNDECIDED',risk:t.reinjury,playThrough:false,occurredYear:s.year,occurredWeek:s.week,complications:0};p.injury=weeks;return {ok:true,injury:m.active}}
function randomInjury(p,s){const keys=Object.keys(TYPES),weights=['HAMSTRING','HAMSTRING','ANKLE','KNEE','CONCUSSION','BACK','LABRUM','FIBULA','ACL'];return diagnose(p,s,weights[Math.floor(Math.random()*weights.length)])}
function treat(p,s,choice){const m=ensure(p),a=m.active;if(!a)return {ok:false,error:'No active injury'};const t=TYPES[a.type];if(!['CONSERVATIVE','SURGERY'].includes(choice))return {ok:false,error:'Unknown treatment'};if(choice==='SURGERY'&&!t.surgery)return {ok:false,error:'Surgery not indicated for this injury'};a.treatment=choice;if(choice==='CONSERVATIVE'){a.weeks=Math.ceil(a.weeks*1.12);a.risk*=.65}else{a.weeks=Math.max(4,Math.ceil(a.weeks*.83));a.risk*=1.3;if(Math.random()<.1*(1-(staff(s)-50)/150)){a.weeks+=4;a.complications++}}p.injury=a.weeks;return {ok:true,weeks:a.weeks,risk:a.risk}}
function playHurt(p,allowed){const a=ensure(p).active;if(!a||a.weeks>2||a.type==='CONCUSSION'||a.type==='ACL'||a.type==='FIBULA')return false;a.playThrough=!!allowed;return true}
function performance(p){const a=ensure(p).active;return a&&a.playThrough?1-TYPES[a.type].penalty:1}
function weekly(s,team=null){for(const p of s.players){if(team!=null&&p.team!==team)continue;if(p.medical?.wear)p.medical.wear=Math.max(0,p.medical.wear-6);if(p.medical?.returnWeeks)p.medical.returnWeeks--;const m=ensure(p),a=m.active;if(!a)continue;const medical=staff(s,p.team),tier=p.team===s.team?(root.GMOwner?.init(s).facilities.medical||0):0;const speed=medical>=85?.22:medical>=70?.1:0;if(Math.random()<speed+tier*.025)a.weeks--;a.weeks=Math.max(0,a.weeks-1);p.injury=a.weeks;if(a.weeks>0)continue;const t=TYPES[a.type];if(Math.random()<t.longTerm*(1-(medical-60)/180)){const loss=a.type==='ACL'||a.type==='LABRUM'?2:1;p.rating=Math.max(35,p.rating-loss);m.longTermLoss+=loss;m.chronicRisk=Math.min(.3,m.chronicRisk+.04)}m.chronicRisk=Math.min(.35,m.chronicRisk+t.reinjury*.12);p.injuryHistory.push({...a,recoveredYear:s.year,recoveredWeek:s.week});m.returnWeeks=3;m.active=null}}
function risk(p){const m=ensure(p);return clamp(.008+(p.fatigue||0)*.00018+(p.age>30?(p.age-30)*.001:0)+m.chronicRisk*.04,.004,.06)}
function report(s){return '<h1 class="heading">MEDICAL CENTER</h1><p class="sub">Recovery estimates improve with medical staff quality.</p>'+s.players.filter(p=>p.team===s.team).map(p=>{const a=ensure(p).active;if(!a)return '';return '<div class="card"><h3>'+p.name+' · '+a.name+'</h3><p>Clearance: '+clearance(p)+' · Estimated '+a.estimate+' weeks · '+a.weeks+' remaining · '+a.treatment+'</p><button onclick="gmTreatInjury('+p.id+',\'CONSERVATIVE\')">CONSERVATIVE REHAB</button> '+(a.weeks<=2&&!['CONCUSSION','ACL','FIBULA'].includes(a.type)?'<button onclick="gmMedicalLimited('+p.id+')">'+(a.playThrough?'REST PLAYER':'ALLOW LIMITED RETURN')+'</button> ':'')+(TYPES[a.type].surgery?'<button onclick="gmTreatInjury('+p.id+',\'SURGERY\')">SURGERY</button>':'')+'<p>Prior injuries: '+p.injuryHistory.length+'</p></div>'}).join('')}
root.GMInjuries={TYPES,ensure,staff,clearance,diagnose,randomInjury,treat,playHurt,performance,weekly,risk,report};
root.gmMedicalLimited=id=>{const p=state.players.find(x=>x.id===id);if(p&&playHurt(p,!p.medical.active.playThrough)){save();render()}};
root.gmTreatInjury=(id,choice)=>{const p=state.players.find(x=>x.id===id),r=treat(p,state,choice);if(!r.ok)alert(r.error);else save();render()};
})(window);
