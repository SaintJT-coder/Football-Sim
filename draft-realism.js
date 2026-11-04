/* Gridiron GM Priority 5 — Draft Realism: seven-round class, scouting,
   combine/Pro Day, pick trades and fifth-year option. Classic script; no bundler. */
(function(root){
'use strict';
const CONFIG={
 pool:{rounds:7,prospectsPerPick:1.25,minExtra:40,firstRating:83,dropPer24:2,
   noise:7,minRating:52,maxRating:86,potentialMin:3,potentialMax:17},
 scouting:{baseAccuracy:.28,scoutPerPoint:.16,staffPerPoint:.003,
   facilityPerTier:.04,maxAccuracy:.96,initialError:15,confidencePerPoint:19,
   combineAccuracy:.07,proDayAccuracy:.06,workoutAccuracy:.09,scoreCost:3},
 resources:{proDays:8,combineReview:24,privateWorkouts:8},
 combine:{fortyBase:4.54,fortySpread:.49,verticalBase:31,verticalSpread:15,
   benchBase:14,benchSpread:22,shuttleBase:4.15,shuttleSpread:.50,
   gradeShiftLimit:3,fortyRange:[4.25,5.3],verticalRange:[20,48],benchRange:[0,45],shuttleRange:[3.7,5.2]},
 pickChart:{anchors:[[1,3000],[2,2600],[3,2200],[4,1800],[5,1700],[10,1300],[16,1000],[24,740],[32,590],[40,500],[48,420],[64,270],[80,190],[96,116],[112,70],[128,44],[160,28],[192,16],[224,2]],lastPick:224},
 risk:{medicalRate:.13,highConcernPenalty:4},

 trade:{margin:1.08,positionNeedMax:1.18,positionNeedMin:.92,roundPremium:1.02},
 fifthYear:{length:4,optionYear:5,deadlineSeasonOffset:2,
   salaryMultiplier:1.4,salaryFloor:5,exerciseMinRating:77,autoDecisionWeek:18},
 ui:{display:64,showAfterDraft:20}
};
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const FIRST=['Mason','Jalen','Eli','Tyrese','Andre','Malik','Carter','Devin','Noah','Darius','Cole','Bryce','Landon','Kendrick','Jordan','Micah','Dante','Trey','Jamar','Jaylen','Ashton','Travis','Roman','Avery'];
const LAST=['Holloway','Mercer','Bennett','Sullivan','Bishop','Jefferson','Coleman','Porter','Rivers','Hayes','McCall','Griffin','Walker','Fields','Brooks','King','Tucker','Bryant','Sims','Pierce'];
const POS_WEIGHTS={QB:['throwAccuracy','throwPower','awareness'],RB:['speed','carrying','trucking'],
 WR:['speed','catching','routeRunning'],TE:['catching','runBlock','strength'],
 OL:['strength','passBlock','runBlock'],DL:['strength','blockShedding','powerMoves'],
 LB:['tackling','speed','coverage'],CB:['speed','manCoverage','zoneCoverage'],
 S:['speed','zoneCoverage','tackling'],K:['kickAccuracy','kickPower','awareness']};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const round=(n,places=0)=>Number(Number(n).toFixed(places));
const hash=v=>{let n=2166136261;for(const ch of String(v))n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0};
function rng(seed){let a=hash(seed);return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296}}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function prospectsNeeded(s){return Math.max(CONFIG.pool.rounds*(root.TEAMS?.length||32)+CONFIG.pool.minExtra,
 Math.ceil(CONFIG.pool.rounds*(root.TEAMS?.length||32)*CONFIG.pool.prospectsPerPick))}
function create(s,i){
 const r=rng(s.year+':prospect:'+i),pos=POS[(i*7+Math.floor(i/10))%POS.length];
 const overall=clamp(Math.round(CONFIG.pool.firstRating-(i/24)*CONFIG.pool.dropPer24+
    (r()-.5)*CONFIG.pool.noise*2),CONFIG.pool.minRating,CONFIG.pool.maxRating);
 const pot=clamp(overall+CONFIG.pool.potentialMin+Math.round(r()*(CONFIG.pool.potentialMax-CONFIG.pool.potentialMin)),55,99);
 const athletic=clamp(overall+Math.round((r()-.5)*25),40,99);
 const attrs={speed:athletic,acceleration:clamp(athletic+Math.round((r()-.5)*12),40,99),
  agility:clamp(athletic+Math.round((r()-.5)*12),40,99),
  strength:clamp(overall+Math.round((r()-.5)*21),40,99),
  awareness:clamp(overall+Math.round((r()-.5)*21),40,99),
  stamina:clamp(overall+Math.round((r()-.5)*18),45,99)};
 for(const stat of POS_WEIGHTS[pos])attrs[stat]=clamp(overall+Math.round((r()-.5)*22),35,99);
 const p={id:'rookie-'+s.year+'-'+i,name:FIRST[Math.floor(r()*FIRST.length)]+' '+
  LAST[Math.floor(r()*LAST.length)],pos,age:20+Math.floor(r()*4),
  rating:overall,pot,athletic,medical:Math.round(60+r()*38),
  character:Math.round(55+r()*43),dev:pot-overall>13?'Elite':pot-overall>8?'Star':'Normal',
  projection:0,tier:Math.max(1,Math.min(7,Math.ceil((87-overall)/6)))};
 p.draftRealism={version:1,trueAttributes:attrs,hiddenOverall:overall,
  initialError:Math.round((r()-.5)*CONFIG.scouting.initialError*2),
  combine:null,proDay:null,scoutingAccuracy:CONFIG.scouting.baseAccuracy,
  reviews:0,gradeShift:0};
 p.projection=estimated(p,s);return p;
}
function enrich(p,s){
 if(!p.draftRealism){
   const r=rng('legacy:'+s.year+':'+p.id),base=Number(p.rating)||67;
   const attrs={speed:clamp(Number(p.athletic)||base,35,99),awareness:base,stamina:base};
   for(const stat of POS_WEIGHTS[p.pos]||[])attrs[stat]=clamp(base+Math.round((r()-.5)*18),35,99);
   p.draftRealism={version:1,trueAttributes:attrs,hiddenOverall:base,
     initialError:Math.round((r()-.5)*CONFIG.scouting.initialError*2),
     combine:null,proDay:null,scoutingAccuracy:CONFIG.scouting.baseAccuracy,
     reviews:0,gradeShift:0};
 }
 p.projection=estimated(p,s);
 return p.draftRealism;
}
function generate(s,existing=[]){
 const output=Array.isArray(existing)?existing:[],needed=prospectsNeeded(s);
 for(let i=0;i<needed;i++){
   if(i<output.length){enrich(output[i],s);continue}
   output.push(create(s,i));
 }
 return output;
}
function staffQuality(s){
 const staff=Number(s.staff?.scouting?.rating??s.staff?.scouting?.evaluation??s.staff?.scout?.rating??s.staff?.scoutRating??70);
 const facility=Number(s.ownerFranchise?.facilities?.scouting||0);
 return {staff,facility};
}
function accuracy(p,s){
 const d=p.draftRealism||enrich(p,s),q=staffQuality(s);
 const extra=(s.frontOffice?.scouted?.[p.id]||0)*CONFIG.scouting.scoutPerPoint;
 return clamp(CONFIG.scouting.baseAccuracy+extra+
   Math.max(0,q.staff-50)*CONFIG.scouting.staffPerPoint+
   q.facility*CONFIG.scouting.facilityPerTier+
   (d.combine?CONFIG.scouting.combineAccuracy:0)+
   (d.proDay?CONFIG.scouting.proDayAccuracy:0)+
   (d.reviews||0)*CONFIG.scouting.workoutAccuracy+
   (p.draftEvaluation?.interviewed ? .02 : 0),0,CONFIG.scouting.maxAccuracy);
}
function estimated(p,s){
 const d=p.draftRealism;if(!d)return Number(p.projection)||65;
 // Never reveal full true rating: evaluation is a noisy, increasingly accurate estimate.
 const confidence=accuracy(p,s);
 d.scoutingAccuracy=confidence;
 return clamp(Math.round(d.hiddenOverall+(d.initialError||0)*(1-confidence)+
   (d.gradeShift||0)*(1-confidence*.5)),35,99);
}
function scout(p,s){
 const d=enrich(p,s);const already=s.frontOffice?.scouted?.[p.id]||0;
 d.scoutingAccuracy=accuracy(p,s);
 p.projection=estimated(p,s);
 return {ok:true,confidence:Math.round(d.scoutingAccuracy*100),
  grade:p.projection,range:Math.ceil(CONFIG.scouting.initialError*(1-d.scoutingAccuracy)),
  reports:already};
}
function combine(p,s){
 const d=enrich(p,s);const budget=resources(s);if(!d.combine){
   if(budget.combineReview<=0)return {ok:false,error:'No combine film reviews remaining'};
   budget.combineReview--;
   const r=rng('combine:'+s.year+':'+p.id),speed=(d.trueAttributes.speed||p.athletic||70);
   const power=(d.trueAttributes.strength||p.rating||70);
   d.combine={
     forty:round(clamp(CONFIG.combine.fortyBase+(76-speed)*.012+(r()-.5)*.16,...CONFIG.combine.fortyRange),2),
     vertical:round(clamp(CONFIG.combine.verticalBase+(speed-70)*.20+(r()-.5)*8,...CONFIG.combine.verticalRange),1),
     bench:Math.round(clamp(CONFIG.combine.benchBase+(power-68)*.25+(r()-.5)*9,...CONFIG.combine.benchRange)),
     shuttle:round(clamp(CONFIG.combine.shuttleBase+(75-speed)*.007+(r()-.5)*.14,...CONFIG.combine.shuttleRange),2)
   };
 }
 d.combineShift??=clamp(Math.round(((p.athletic||70)-70)/12),
   -CONFIG.combine.gradeShiftLimit,CONFIG.combine.gradeShiftLimit);
 d.gradeShift=clamp(d.combineShift+(d.proDay?.gradeShift||0),
   -CONFIG.combine.gradeShiftLimit,CONFIG.combine.gradeShiftLimit);
 p.projection=estimated(p,s);
 return d.combine;
}
function proDay(p,s){
 const d=enrich(p,s);
 const res=resources(s);
 if(d.proDay)return {ok:false,error:'Pro Day already evaluated'};
 if(res.proDays<=0)return {ok:false,error:'No Pro Day reviews remaining'};
 res.proDays--;
 const r=rng('proday:'+s.year+':'+p.id);
 const delta=Math.round((r()-.5)*5);
 d.proDay={year:s.year,gradeShift:delta,medicalVerified:r()>.13};
 d.gradeShift=clamp((d.combineShift||0)+delta,
   -CONFIG.combine.gradeShiftLimit,CONFIG.combine.gradeShiftLimit);
 p.projection=estimated(p,s);
 return {ok:true,report:d.proDay,grade:p.projection};
}
function workout(p,s){
 const d=enrich(p,s),res=resources(s);
 if(res.privateWorkouts<=0)return {ok:false,error:'No private workouts remaining'};
 if(d.reviews>=3)return {ok:false,error:'Maximum three workouts per prospect'};
 res.privateWorkouts--;
 d.reviews++;
 p.projection=estimated(p,s);
 return {ok:true,grade:p.projection,accuracy:accuracy(p,s),workouts:d.reviews};
}
function resources(s){
 const d=s.draftRealismResources??={year:s.year,proDays:CONFIG.resources.proDays,
   privateWorkouts:CONFIG.resources.privateWorkouts,combineReview:CONFIG.resources.combineReview};
 if(d.year!==s.year){d.year=s.year;d.proDays=CONFIG.resources.proDays;
   d.privateWorkouts=CONFIG.resources.privateWorkouts;d.combineReview=CONFIG.resources.combineReview}
 d.combineReview??=CONFIG.resources.combineReview;
 return d;
}
function publicGrade(p,s){
 const d=enrich(p,s),confidence=accuracy(p,s);
 return {overall:estimated(p,s),margin:Math.max(1,Math.ceil((1-confidence)*CONFIG.scouting.initialError)),
   confidence:Math.round(confidence*100),combine:d.combine,proDay:d.proDay};
}
function draftValue(p,team,s,positionNeed){
 // CPU scouting is imperfect, includes positional scarcity and small stable noise.
 const base=estimated(p,s),roster=Number.isFinite(positionNeed)?null:s.players.filter(x=>x.team===team&&x.pos===p.pos),
 best=roster?Math.max(40,...roster.map(x=>Number(x.rating)||40)):70,
 shortage=roster?(Math.max(0,78-best)*.25+Math.max(0,2-roster.length)*2.5):positionNeed*.6,
 noise=(hash(team+':'+p.id)%13)-6;
 return base+(p.pot||base)*.14+shortage+noise*.3;
}
function pickValue(round,slot,s){
 const n=root.TEAMS?.length||32,ordinal=(Math.floor(Number(round))-1)*n+Math.floor(Number(slot)),
   anchors=CONFIG.pickChart.anchors;
 if(!Number.isFinite(ordinal)||ordinal<1||ordinal>CONFIG.pool.rounds*n)return 0;
 for(let i=1;i<anchors.length;i++){
   const [nextPick,nextVal]=anchors[i];
   if(ordinal<=nextPick){
     const [prevPick,prevVal]=anchors[i-1],fraction=(ordinal-prevPick)/(nextPick-prevPick);
     return Math.max(1,Math.round(prevVal+(nextVal-prevVal)*fraction));
   }
 }
 return anchors[anchors.length-1][1];
}
function positionalNeed(s,team){
 const roster=s.players.filter(p=>p.team===team);
 const needs=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'].map(pos=>{
   const teamPlayers=roster.filter(p=>p.pos===pos),best=Math.max(40,...teamPlayers.map(p=>p.rating||40)),
     desired={QB:2,RB:3,WR:5,TE:3,OL:5,DL:4,LB:4,CB:4,S:3,K:1}[pos];
   return {pos,score:Math.max(0,80-best)+Math.max(0,desired-teamPlayers.length)*6};
 }).sort((a,b)=>b.score-a.score);
 return needs[0];
}
function valueFor(s,pick,receiver){
 const priority=positionalNeed(s,receiver).score,weight=clamp(1+priority*.002,
 CONFIG.trade.positionNeedMin,CONFIG.trade.positionNeedMax);
 return Math.round(pickValue(pick.round,pick.slot,s)*weight);
}
function tradePicks(s,giveIds,receiveIds,other){
 const f=s.frontOffice;
 if(!f?.picks?.length||!Number.isInteger(other)||other<0||other>= (root.TEAMS?.length||32)||
   other===s.team)return {ok:false,error:'Invalid trade partner'};
 if(!Array.isArray(giveIds)||!Array.isArray(receiveIds)||!giveIds.length||
   !receiveIds.length)return {ok:false,error:'Choose picks on both sides'};
 const give=giveIds.map(id=>f.picks.find(p=>p.id===id)),receive=receiveIds.map(id=>f.picks.find(p=>p.id===id));
 const unique=new Set([...giveIds,...receiveIds]);
 if(unique.size!==give.length+receive.length||give.some(p=>!p||p.used||p.owner!==s.team)||
   receive.some(p=>!p||p.used||p.owner!==other))return {ok:false,error:'Picks are unavailable or ownership changed'};
 const offer=give.reduce((n,p)=>n+valueFor(s,p,other),0),
   demand=receive.reduce((n,p)=>n+valueFor(s,p,s.team),0)*CONFIG.trade.margin;
 if(offer<demand)return {ok:false,error:'AI rejects offer: add pick value',
   offered:offer,required:Math.ceil(demand)};
 for(const p of give)p.owner=other;
 for(const p of receive)p.owner=s.team;
 const entry={year:s.year,week:s.week,other,kind:'DRAFT_PICK_TRADE',
   give:give.map(x=>x.id),receive:receive.map(x=>x.id),offered:offer,required:Math.ceil(demand)};
 f.tradeLog.unshift(entry);
 s.news?.unshift('Draft-day trade: '+(root.TEAMS?.[s.team]?.[1]||'Your team')+
   ' exchanged '+give.length+' pick(s) with '+(root.TEAMS?.[other]?.[1]||'an AI club')+'.');
 return {ok:true,...entry};
}
function rookieContract(p,s,round,slot){
 const c=root.GMDraftAdvanced?.rookieContract(p,s,round,slot);
 if(!c)return null;
 p.rookieDraft={year:s.year,round,slot};
 if(round===1){
   const year=s.year+CONFIG.fifthYear.length;
   p.draftFifthYear={draftYear:s.year,optionYear:year,
     deadlineYear:s.year+CONFIG.fifthYear.deadlineSeasonOffset,
     deadlineWeek:CONFIG.fifthYear.autoDecisionWeek,
     salary:roundMoney(Math.max(CONFIG.fifthYear.salaryFloor,
       (p.salary||1)*CONFIG.fifthYear.salaryMultiplier)),
     decided:false,exercised:null};
 }
 return c;
}
const roundMoney=n=>Math.round(n*100)/100;
function decideFifthYear(p,s,exercise,automatic=false){
 const o=p?.draftFifthYear;
 if(!o||o.decided)return {ok:false,error:'No available fifth-year option'};
 if(p.team!==s.team)return {ok:false,error:'Only your first-round picks can be managed'};
 if(!automatic&&s.year<o.deadlineYear)return {ok:false,error:'Option decisions open in '+o.deadlineYear};
 if(!automatic&&(s.year>o.deadlineYear||(s.year===o.deadlineYear&&s.week>o.deadlineWeek)))
   return {ok:false,error:'Fifth-year decision deadline has passed'};
 const c=exercise?root.GMContractsAdvanced?.init(p,s):null;
 if(exercise&&!c)return {ok:false,error:'Advanced contract module unavailable'};
 if(exercise){
   const year=o.optionYear;
   const forecast=root.GMContractEconomy?.sheet(s,s.team,year);
   const alreadySalary=(c?.baseSalaries?.[year-c.startYear]||0);
   if(forecast&&forecast.space+alreadySalary<o.salary)
     return {ok:false,error:'Fifth-year option exceeds projected '+year+' cap room'};
   c.baseSalaries.push(o.salary);c.bonusProration.push(0);c.guarantees.push(o.salary);
   p.years=(p.years||1)+1;
 }
 o.decided=true;o.exercised=!!exercise;o.decidedYear=s.year;
 s.news?.unshift(p.name+' fifth-year option '+(exercise?'EXERCISED':'DECLINED')+
   ' for '+o.optionYear+'.');
 return {ok:true,exercised:!!exercise,salary:o.salary};
}
function seasonEnd(s){
 const changes=[];for(const p of s.players){
   const o=p.draftFifthYear;
   if(!o||o.decided||o.deadlineYear>s.year||p.team<0)continue;
   const exercise=p.rating>=CONFIG.fifthYear.exerciseMinRating;
   if(p.team===s.team){ // Automatic conservative fallback if user did not choose.
     const result=decideFifthYear(p,s,exercise,true);if(result.ok)changes.push({playerId:p.id,exercise,auto:true});
   }else{
     o.decided=true;o.exercised=exercise;o.decidedYear=s.year;
     if(exercise){
       const c=root.GMContractsAdvanced?.init(p,s);
       if(c){c.baseSalaries.push(o.salary);c.bonusProration.push(0);c.guarantees.push(o.salary);p.years++;}
     }
     changes.push({playerId:p.id,exercise,auto:true});
   }
 }
 return changes;
}
function page(s){
 const f=s.frontOffice||{},pool=(f.prospects||[]).filter(p=>!p.drafted),
   r=resources(s),options=s.players.filter(p=>p.team===s.team&&p.draftFifthYear&&!p.draftFifthYear.decided);
 const current=f.picks?.filter(p=>!p.used).sort((a,b)=>a.round-b.round||a.slot-b.slot)[0];
 return '<div class="eyebrow">DRAFT COMBINE & SCOUTING</div><h1 class="heading">THE EVALUATION LAB</h1>'+
 '<p class="sub">Seven rounds · '+(f.picks?.length||0)+' picks · '+(f.prospects?.length||0)+' prospects. Hidden true ratings are revealed only after selection.</p>'+
 '<div class="grid three"><div class="card"><h3>PRO DAY REVIEWS</h3><h2>'+r.proDays+'</h2></div>'+
 '<div class="card"><h3>COMBINE REVIEWS</h3><h2>'+r.combineReview+'</h2></div>'+ '<div class="card"><h3>PRIVATE WORKOUTS</h3><h2>'+r.privateWorkouts+'</h2></div>'+
 '<div class="card"><h3>ON THE CLOCK</h3><h2>'+(current?'R'+current.round+' / '+current.slot:'COMPLETE')+'</h2></div></div>'+
 '<h2>PROSPECT EVALUATIONS</h2><div class="grid two">'+pool.slice().sort((a,b)=>estimated(b,s)-estimated(a,s)).slice(0,CONFIG.ui.display).map(p=>{
   const g=publicGrade(p,s),stats=g.combine;
   return '<div class="card"><h3>'+esc(p.name)+' · '+esc(p.pos)+'</h3>'+
   '<p>Public grade <b>'+g.overall+' ± '+g.margin+'</b> · '+g.confidence+'% scout confidence</p>'+
   '<p>Combine '+(stats?'40 '+stats.forty+'s · Vert '+stats.vertical+
     '" · Bench '+stats.bench+' · Shuttle '+stats.shuttle+'s':'Not reviewed')+'</p>'+
   '<p>Pro Day '+(g.proDay?'Grade movement '+(g.proDay.gradeShift>=0?'+':'')+
     g.proDay.gradeShift:'Not reviewed')+'</p>'+
   '<div class="filters"><button onclick="gmDraftRealAction(\''+p.id+'\',\'combine\')">COMBINE</button> '+
   '<button onclick="gmDraftRealAction(\''+p.id+'\',\'proDay\')">PRO DAY</button> '+
   '<button onclick="gmDraftRealAction(\''+p.id+'\',\'workout\')">WORKOUT</button></div></div>';
 }).join('')+'</div><h2>FIFTH-YEAR OPTION DEADLINES</h2>'+
 (options.map(p=>{const o=p.draftFifthYear,open=s.year===o.deadlineYear&&s.week<=o.deadlineWeek;
   return '<div class="card"><b>'+esc(p.name)+'</b> · '+
   p.rating+' OVR · '+o.optionYear+' option · $'+o.salary+'M · Decision due by '+
   o.deadlineYear+' Week '+o.deadlineWeek+
   (open?' <button onclick="gmDraftFifth('+p.id+',true)">EXERCISE</button> '+
     '<button onclick="gmDraftFifth('+p.id+',false)">DECLINE</button>':
     '<p class="muted">Option decision opens in '+o.deadlineYear+
       '. If no choice is made before that season ends, a rating-based automatic decision applies.</p>')+
   '</div>';}).join('')||
 '<div class="card">No outstanding fifth-year option decisions.</div>')+
 '<h2>DRAFT PICK TRADES</h2>'+
 '<div class="card"><p class="sub">Trade unused picks with AI clubs. Values follow a declining seven-round chart with team-need premiums.</p>'+
 '<button onclick="gmDraftTradePrompt()">PROPOSE PICK SWAP</button></div>';
}
root.GMDraftRealism={CONFIG,create,enrich,generate,prospectsNeeded,accuracy,staffQuality,
 estimated,scout,combine,proDay,workout,resources,publicGrade,draftValue,
 pickValue,positionalNeed,tradePicks,rookieContract,decideFifthYear,seasonEnd,page};
root.Gridiron?.register?.('draftRealism',root.GMDraftRealism);
root.gmDraftRealAction=(id,action)=>{
 const p=state.frontOffice?.prospects?.find(p=>String(p.id)===String(id));
 if(!p||p.drafted)return;
 const fn={combine,proDay,workout}[action];if(!fn)return;
 const result=fn(p,state);
 if(result?.ok===false)alert(result.error);else{save();render()}
};
root.gmDraftFifth=(id,exercise)=>{
 const p=state.players.find(p=>String(p.id)===String(id));if(!p)return;
 if(!confirm((exercise?'Exercise':'Decline')+' '+p.name+' fifth-year option?'))return;
 const result=decideFifthYear(p,state,exercise);
 if(!result.ok)alert(result.error);else{save();render()}
};
root.gmDraftTradePrompt=()=>{
 const f=state.frontOffice;if(!f)return;
 const next=f.picks.filter(p=>!p.used&&p.owner===state.team).slice(0,10);
 if(!next.length){alert('No available picks to trade');return}
 const teamInput=prompt('Trade partner team index (0–'+((root.TEAMS?.length||32)-1)+'):',String((state.team+1)%(root.TEAMS?.length||32)));
 if(teamInput===null)return;
 const other=Number(teamInput);if(!Number.isInteger(other)||other===state.team)return alert('Invalid trade partner');
 const available=f.picks.filter(p=>!p.used&&p.owner===other);
 if(!available.length)return alert('That team has no unused picks');
 const outgoing=prompt('Your pick IDs, comma-separated:\n'+next.map(p=>p.id).join(', '),next[0].id);
 if(outgoing===null)return;
 const incoming=prompt('Requested pick IDs, comma-separated:\n'+available.slice(0,10).map(p=>p.id).join(', '),available[0].id);
 if(incoming===null)return;
 const parse=x=>x.split(',').map(v=>v.trim()).filter(Boolean);
 const result=tradePicks(state,parse(outgoing),parse(incoming),other);
 if(!result.ok)alert(result.error+' (offered '+(result.offered||0)+', required '+(result.required||0)+')');
 else{save();render()}
};
})(window);