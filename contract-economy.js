/* Gridiron GM — Priority 4: Contract Economy & Agents.
   Classic script; load after contracts-advanced.js and before cap-management.js.
   All new gameplay numbers are in CONFIG. Money is in millions. */
(function(root){
'use strict';
const CONFIG={
 cap:{growth:.04,maxCarryoverFraction:.10,carryoverRate:.35,overagePenaltyRate:.50,
      initialCap:350,violationSecurity:-4,violationFans:-3,historyLimit:20},
 agents:{
  Aggressive:{salary:1.15,guarantee:1.05,shortBias:.055,longBias:.01,
    incentives:.03,bonus:.03,clauses:1.06},
  Patient:{salary:.98,guarantee:1.04,shortBias:0,longBias:-.025,
    incentives:.96,bonus:.98,clauses:1},
  'Money-First':{salary:1.12,guarantee:1.22,shortBias:0,longBias:.03,
    incentives:1.05,bonus:.91,clauses:1.02},
  'Loyalty-Focused':{salary:.94,guarantee:.96,shortBias:.01,longBias:-.04,
    incentives:.95,bonus:.98,clauses:.95}
 },
 negotiation:{baseSalaryRating:.12,baseSalaryPotential:.035,lowMoraleThreshold:45,
   lowMoralePenalty:1.10,disgruntledPenalty:1.12,
   signingBonusMaxMultiplier:.08,guaranteeMaxMultiplier:.12,
   maxSalaryDiscount:.20,guaranteePreferredFraction:.45,
   maxYears:7,minYears:1,maxOptionYears:2,maxVoidYears:3,
   clauseMinOverall:84,clauseDemandOverall:90,clausePremium:.045},
 option:{teamExerciseRating:77,teamMaximumMarketRatio:1.25,
   playerExerciseMarketRatio:1.04,decisionDeadlineWeek:18},
 clauses:{grantCost:1,expiryBoost:0},
 incentive:{maxPayout:25,maxLadders:12,allowed:{
   PASS_YARDS:'passYards',RUSH_YARDS:'rushYards',REC_YARDS:'receivingYards',
   SACKS:'sacks',RECEPTIONS:'receptions',TOUCHDOWNS:'td',
   TEAM_WINS:'teamWins',PLAYOFFS:'playoffs'
 }},
 freeAgency:{scoreMin:-12,scoreMax:12,salaryBias:8,guaranteeWeight:9,bonusWeight:4,
    longTermBias:3,shortTermBias:3,clauseBonus:3},
 ledger:{eventLimit:70}
};
const clamp=(n,a=0,b=1e6)=>Math.max(a,Math.min(b,Number(n)||0));
const money=n=>Math.round((Number(n)||0)*100)/100;
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=v=>{let h=2166136261;for(const c of String(v))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
const PERSONAS=Object.keys(CONFIG.agents);
const NAMES=['Morgan Ellis','Alex Rivera','Taylor Brooks','Cameron Price','Jordan Wells','Avery Bennett','Devin Carter','Sam Rivera'];
function agent(p){
 if(p.agent&&CONFIG.agents[p.agent.persona])return p.agent;
 const seed=hash(String(p.id??p.name)+'|'+String(p.pos||'')),
   persona=CONFIG.agents[p.agent?.persona]?p.agent.persona:PERSONAS[seed%PERSONAS.length];
 return p.agent={...p.agent,name:p.agent?.name||NAMES[seed%NAMES.length],
   persona,style:p.agent?.style||('Money-First'===persona?'Financial':'Loyalty-Focused'===persona?'Loyalty':'Patient'===persona?'Security':'Aggressive')};
}
function init(s){
 const x=s.contractEconomy??={version:1,originYear:s.year,baseCap:Number(s.cap)||CONFIG.cap.initialCap,
   growthRate:CONFIG.cap.growth,carryover:{},penalties:{},history:[],processed:[],events:[]};
 x.carryover??={};x.penalties??={};x.history??=[];x.processed??=[];x.events??=[];
 x.originYear??=s.year;x.baseCap??=Number(s.cap)||CONFIG.cap.initialCap;
 x.growthRate??=CONFIG.cap.growth;
 return x;
}
function baseLimit(s,year){const x=init(s);return money(x.baseCap*Math.pow(1+x.growthRate,Math.max(0,year-x.originYear)))}
function capAt(s,team,year){const x=init(s);return money(baseLimit(s,year)+
   (x.carryover?.[year]?.[team]||0)-(x.penalties?.[year]?.[team]||0))}
function legacyDead(s,team,year){return team===s.team&&year===s.year?money(s.deadCap||0):0}
function dead(s,team,year){const all=s.advancedCap?.deadCap?.[year]||[];
 return money(all.filter(x=>x.team==null?team===s.team:x.team===team).reduce((n,x)=>n+(x.amount||0),0)+legacyDead(s,team,year))}
function ladderHit(p,year){
 return money((p.contractAdvanced?.incentiveLadders||[])
   .filter(x=>x.paidYear===year).reduce((n,x)=>n+(x.payout||0),0))}
function hit(p,s,year){return root.GMContractsAdvanced?.capHit(p,year,s)??((p.team>=0&&year===s.year)?p.salary||0:0)}
function payroll(s,team,year){return money(s.players.filter(p=>p.team===team)
   .reduce((n,p)=>n+hit(p,s,year),0))}
function sheet(s,team=s.team,year=s.year){
 const limit=capAt(s,team,year),contracts=payroll(s,team,year),
   deadMoney=dead(s,team,year),space=money(limit-contracts-deadMoney);
 return {year,team,base:baseLimit(s,year),carryover:money(init(s).carryover?.[year]?.[team]||0),
   penalty:money(init(s).penalties?.[year]?.[team]||0),
   limit,contracts,dead:deadMoney,space,over:money(Math.max(0,-space))};
}
function table(s,years=5,team=s.team){return Array.from({length:years},(_,i)=>sheet(s,team,s.year+i))}
function market(p){return money(Math.max(1,(p.rating||70)*CONFIG.negotiation.baseSalaryRating+
   (p.pot||p.rating||70)*CONFIG.negotiation.baseSalaryPotential))}
function evaluateOffer(p,s,o={}){
 const a=agent(p),pref=CONFIG.agents[a.persona],c=p.contractAdvanced||{};
 const years=Number(o.years)||0,salary=Number(o.salary)||0,
   bonus=Number(o.bonus)||0,guaranteed=Number(o.guaranteed)||0,
   clauses=o.clauses||{},total=salary*Math.max(1,years),
   guaranteeRatio=guaranteed/Math.max(1,total);
 let required=market(p)*pref.salary;
 if(c.disgruntled)required*=CONFIG.negotiation.disgruntledPenalty;
 if((p.morale??65)<CONFIG.negotiation.lowMoraleThreshold)required*=CONFIG.negotiation.lowMoralePenalty;
 if(years<=2)required*=1+pref.shortBias;
 if(years>=4)required*=1+pref.longBias;
 if(guaranteeRatio>=CONFIG.negotiation.guaranteePreferredFraction)
   required*=Math.max(1-CONFIG.negotiation.maxSalaryDiscount,
      1-(guaranteeRatio-CONFIG.negotiation.guaranteePreferredFraction)*
      CONFIG.negotiation.guaranteeMaxMultiplier*pref.guarantee);
 if(bonus>0)required*=Math.max(1-CONFIG.negotiation.maxSalaryDiscount,
   1-Math.min(1,bonus/Math.max(1,total))*CONFIG.negotiation.signingBonusMaxMultiplier/pref.bonus);
 if(clauses.noTrade||clauses.noTag)required*=1+CONFIG.negotiation.clausePremium*pref.clauses;
 const requiredRounded=money(required);
 const highRating=(p.rating||0)>=CONFIG.negotiation.clauseDemandOverall;
 const wantsClauses=highRating&&(a.persona==='Aggressive'||a.persona==='Loyalty-Focused');
 const accepted=salary>=requiredRounded&&( !wantsClauses||!!clauses.noTrade||!!clauses.noTag);
 return {persona:a.persona,agent:a.name,required:requiredRounded,accepted,
   wantsClauses,preferGuarantees:pref.guarantee>1,shortDeal:pref.shortBias<0,
   reason:wantsClauses&&!clauses.noTrade&&!clauses.noTag?'Top player demands no-trade or no-tag protection':
     salary<requiredRounded?'Annual salary below agent target':'Acceptable structure'};
}
function freeAgentScoreModifier(p,o={}){
 const persona=CONFIG.agents[agent(p).persona],cfg=CONFIG.freeAgency;
 const base=Math.max(1,(p.salary||o.salary||1)),salary=Number(o.salary)||0,
  guaranteed=Number(o.guaranteed)||0,bonus=Number(o.bonus)||0,years=Number(o.years)||1;
 let result=(salary/base-1)*cfg.salaryBias*(persona.salary-1)*3;
 result+=(guaranteed/Math.max(1,salary*years))*cfg.guaranteeWeight*(persona.guarantee-1);
 result+=(bonus/Math.max(1,salary*years))*cfg.bonusWeight*(1/persona.bonus);
 result+=years>=4?(persona.longBias<0?cfg.longTermBias:0):years<=2?(persona.shortBias>0?-cfg.shortTermBias:0):0;
 if(['NO_TRADE','NO_TAG'].includes(o.clause))result+=cfg.clauseBonus;
 return Math.round(clamp(result,cfg.scoreMin,cfg.scoreMax));
}
function ensureContract(p,s){
 const c=root.GMContractsAdvanced?.init(p,s);
 if(!c)throw Error('Advanced contract system unavailable');
 c.options??=[];c.voidYears??=0;c.voidProration??=[];c.clauses??={noTrade:false,noTag:false};
 c.incentiveLadders??=[];return c;
}
function grantClause(p,s,kind){
 if(!p||p.team!==s.team||!['noTrade','noTag'].includes(kind))return {ok:false,error:'Invalid player or clause'};
 if(p.rating<CONFIG.negotiation.clauseMinOverall)return {ok:false,error:'Clause reserved for high-rated players'};
 const c=ensureContract(p,s);
 if(c.clauses[kind])return {ok:false,error:'Clause is already active'};
 if(s.cash<CONFIG.clauses.grantCost)return {ok:false,error:'Insufficient franchise cash'};
 s.cash=money(s.cash-CONFIG.clauses.grantCost);c.clauses[kind]=true;
 s.news?.unshift(p.name+' negotiated '+(kind==='noTrade'?'no-trade':'no-tag')+' protection.');
 return {ok:true,kind,cost:CONFIG.clauses.grantCost};
}
function canTrade(p){return !(p?.contractAdvanced?.clauses?.noTrade||p?.contract?.clause==='NO_TRADE')}
function canTag(p){return !(p?.contractAdvanced?.clauses?.noTag||p?.contract?.clause==='NO_TAG')}
function extend(p,s,offer={}){
 if(!p||p.team!==s.team)return {ok:false,error:'Not on your roster'};
 const years=Number(offer.years),salary=money(offer.salary),bonus=money(offer.bonus||0),
   guaranteed=money(offer.guaranteed||0),
   optionYears=Number(offer.optionYears||0),voidYears=Number(offer.voidYears||0),
   holder=offer.optionHolder||'TEAM',clauses={
     noTrade:!!offer.noTrade,noTag:!!offer.noTag};
 if(!Number.isInteger(years)||years<CONFIG.negotiation.minYears||years>CONFIG.negotiation.maxYears||
   !Number.isInteger(optionYears)||optionYears<0||optionYears>CONFIG.negotiation.maxOptionYears||
   years+optionYears>CONFIG.negotiation.maxYears||
   !Number.isInteger(voidYears)||voidYears<0||voidYears>CONFIG.negotiation.maxVoidYears||
   !['TEAM','PLAYER'].includes(holder)||salary<1||bonus<0||guaranteed<0||
   guaranteed>salary*years)
   return {ok:false,error:'Invalid contract length, salary, guarantee or option terms'};
 if((clauses.noTrade||clauses.noTag)&&p.rating<CONFIG.negotiation.clauseMinOverall)
   return {ok:false,error:'Player does not qualify for restricted clauses'};
 const evaluation=evaluateOffer(p,s,{years:years+optionYears,salary,bonus,guaranteed,clauses});
 if(!evaluation.accepted)return {ok:false,error:'Agent rejected offer: '+evaluation.reason,required:evaluation.required};
 if(s.cash<bonus)return {ok:false,error:'Insufficient cash for signing bonus'};
 const c=ensureContract(p,s),existingYears=c.baseSalaries.length,
   activeAdded=years+optionYears,startYear=c.startYear+existingYears,
   prorated=money(bonus/Math.max(1,activeAdded+voidYears)),
   newEnd=existingYears+activeAdded;
 // No mutation until current and forward year cap checks have passed.
 const currentLimit=sheet(s,s.team,s.year);
 // Extensions begin after existing signed years; bonus starts prorating at the extension boundary.
 const firstNewYear=Math.max(s.year,startYear);
 if(firstNewYear===s.year&&currentLimit.space<salary+prorated)
   return {ok:false,error:'Extension would exceed the current cap'};
 // Prevent future-year contracts that are already projected to break the cap.
 // Carryover for years not yet settled is deliberately excluded from this forecast.
 for(let j=0;j<activeAdded;j++){
   const year=startYear+j;
   if(year>=s.year&&sheet(s,s.team,year).space<salary+prorated)
     return {ok:false,error:'Projected '+year+' cap room is too low for this extension'};
 }
 for(let j=0;j<activeAdded;j++){
   c.baseSalaries.push(salary);
   c.bonusProration.push(prorated);
   c.guarantees.push(j<years?money(guaranteed/years):0);
 }
 const options=[];
 for(let i=0;i<optionYears;i++){
   const year=startYear+years+i;
   options.push({year,holder,salary,decided:false,exercised:null,
     deadlineYear:year-1,deadlineWeek:CONFIG.option.decisionDeadlineWeek});
 }
 c.options.push(...options);
 c.voidYears+=voidYears;
 for(let k=0;k<voidYears;k++)c.voidProration.push({year:startYear+activeAdded+k,amount:prorated,accelerated:false});
 c.clauses={noTrade:!!c.clauses.noTrade||clauses.noTrade,noTag:!!c.clauses.noTag||clauses.noTag};
 c.disgruntled=false;c.holdout=false;
 s.cash=money(s.cash-bonus);
 // Existing player.year is the next active contract expiry; void years don't extend playing time.
 p.years=Math.max(1,newEnd-(s.year-c.startYear));
 p.salary=money(root.GMContractsAdvanced.capHit(p,s.year,s));
 p.morale=clamp((p.morale??65)+8,0,100);
 s.news?.unshift('Signed '+p.name+' to '+years+' base year(s)'+
   (optionYears?' and '+optionYears+' '+holder.toLowerCase()+' option year(s)':'')+
   (voidYears?' with '+voidYears+' void year(s)':'')+'.');
 return {ok:true,yearsAdded:activeAdded,optionYears,voidYears,bonus,required:evaluation.required};
}
function setOption(p,s,year,exercise){
 if(!p||p.team!==s.team)return {ok:false,error:'Player not on your roster'};
 const c=ensureContract(p,s),o=c.options.find(o=>o.year===Number(year));
 if(!o||o.decided)return {ok:false,error:'No undecided option for that year'};
 if(s.year>o.deadlineYear||(s.year===o.deadlineYear&&s.week>o.deadlineWeek))
   return {ok:false,error:'Option deadline has passed'};
 if(o.holder==='PLAYER')return {ok:false,error:'This option belongs to the player'};
 o.decided=true;o.exercised=!!exercise;o.decidedYear=s.year;
 if(!exercise){declineOption(c,o,s,p)}
 s.news?.unshift(p.name+' '+(exercise?'had a team option exercised':'had a team option declined')+' for '+year+'.');
 return {ok:true,exercised:o.exercised};
}
function declineOption(c,o,s,p){
 const cutoff=o.year-c.startYear;
 // Acceleration occurs in the year the option would have started, not on early notice.
 const remainingBonus=money(c.bonusProration.slice(Math.max(0,cutoff))
   .reduce((sum,v)=>sum+(v||0),0));
 if(remainingBonus>0){
   const l=root.GMContractsAdvanced?.ledger(s);
   if(l){l.deadCap[o.year]??=[];
     l.deadCap[o.year].push({team:p.team,playerId:p.id,name:p.name,
       amount:remainingBonus,reason:'DECLINED OPTION BONUS ACCELERATION'})}
 }
 c.baseSalaries=c.baseSalaries.slice(0,Math.max(0,cutoff));
 c.guarantees=c.guarantees.slice(0,Math.max(0,cutoff));
 c.options.forEach(x=>{if(x.year>=o.year){x.decided=true;x.exercised=false}});
 p.years=Math.max(1,c.baseSalaries.length-(s.year-c.startYear));
}
function settleOptions(p,s){
 const c=p.contractAdvanced;
 if(!c?.options?.length)return [];
 const decisions=[];
 const pending=c.options.filter(o=>!o.decided&&o.deadlineYear<=s.year)
   .sort((a,b)=>a.year-b.year);
 for(const o of pending){
   if(o.decided)continue;
   let exercise;
   if(o.holder==='TEAM')exercise=p.rating>=CONFIG.option.teamExerciseRating&&
      o.salary<=market(p)*CONFIG.option.teamMaximumMarketRatio;
   else exercise=o.salary>=market(p)*CONFIG.option.playerExerciseMarketRatio;
   o.decided=true;o.exercised=exercise;o.decidedYear=s.year;
   if(!exercise)declineOption(c,o,s,p);
   decisions.push({playerId:p.id,year:o.year,exercised:exercise,holder:o.holder});
   s.news?.unshift(p.name+' '+(exercise?'will remain on an option year':'will enter free agency after the contract')+'.');
 }
 return decisions;
}
function addLadder(p,s,spec={}){
 if(!p||p.team!==s.team)return {ok:false,error:'Not on roster'};
 const c=ensureContract(p,s),yearIndex=Number(spec.yearIndex);
 const conditions=Array.isArray(spec.conditions)?spec.conditions:[];
 const payout=money(spec.payout);
 if(!Number.isInteger(yearIndex)||yearIndex<1||yearIndex>CONFIG.negotiation.maxYears||
   payout<=0||payout>CONFIG.incentive.maxPayout||!conditions.length||
   conditions.length>3||c.incentiveLadders.length>=CONFIG.incentive.maxLadders||
   conditions.some(o=>!Object.hasOwn(CONFIG.incentive.allowed,o.type)||
       !Number.isFinite(Number(o.threshold))||Number(o.threshold)<=0))
   return {ok:false,error:'Invalid multi-year incentive'};
 const targetYear=s.year+yearIndex-1;
 if(targetYear>=c.startYear+c.baseSalaries.length)
   return {ok:false,error:'Incentive must fall within an active contract year'};
 const entry={id:'ladder-'+p.id+'-'+targetYear+'-'+c.incentiveLadders.length,
   signedYear:s.year,yearIndex,targetYear,conditions:conditions.map(o=>({
     type:o.type,threshold:Number(o.threshold)})),payout,paidYear:null,settled:false};
 c.incentiveLadders.push(entry);
 return {ok:true,incentive:entry};
}
function assessLadders(p,s,ctx){
 const c=p.contractAdvanced;if(!c?.incentiveLadders)return [];
 const settled=[];
 for(const x of c.incentiveLadders){
   if(x.settled||x.targetYear!==s.year)continue;
   const met=x.conditions.every(cond=>{
     const key=CONFIG.incentive.allowed[cond.type];
     const val=key==='playoffs'?(ctx.playoffs?1:0):
       key==='teamWins'?Number(ctx.teamWins||0):Number(p.stats?.[key]||0);
     return val>=cond.threshold;
   });
   x.settled=true;x.met=met;
   if(met){
     x.paidYear=s.year;
     // CPU team bonuses must not reduce the user's cash.
     if(p.team===s.team)s.cash=money(s.cash-x.payout);
     p.morale=clamp((p.morale??65)+3,0,100);
     if(p.team===s.team)s.news?.unshift(p.name+' earned a $'+money(x.payout)+'M performance incentive.');
   }
   settled.push({id:x.id,playerId:p.id,met,year:s.year,payout:met?x.payout:0});
 }
 return settled;
}
function accelerateVoid(p,s,cut=false){
 const c=p.contractAdvanced;if(!c||c.voidAccelerationYear)return 0;
 const nextYear=s.year+1,remaining=(c.voidProration||[])
   .filter(x=>!x.accelerated&&x.year>=nextYear);
 if(!remaining.length)return 0;
 const amount=money(remaining.reduce((sum,x)=>sum+x.amount,0));
 if(amount){
   const ledger=root.GMContractsAdvanced?.ledger(s);
   if(ledger){ledger.deadCap[nextYear]??=[];
     ledger.deadCap[nextYear].push({team:p.team,playerId:p.id,name:p.name,
       amount,reason:cut?'RELEASE VOID ACCELERATION':'EXPIRED VOID ACCELERATION'})}
 }
 for(const x of remaining)x.accelerated=true;
 c.voidAccelerationYear=nextYear;
 return amount;
}
function release(p,s){
 if(!p||p.team!==s.team)return {ok:false,error:'Not on roster'};
 const c=ensureContract(p,s),offset=Math.max(0,s.year-c.startYear);
 const currentAndFuture=c.bonusProration.slice(offset).reduce((n,v)=>n+(v||0),0);
 const voidBalance=(c.voidProration||[]).filter(x=>!x.accelerated).reduce((n,x)=>n+x.amount,0);
 const futureGuaranteedSalary=(c.guarantees||[]).slice(offset+1).reduce((sum,v)=>sum+(v||0),0);
 const amount=money(currentAndFuture+voidBalance+futureGuaranteedSalary);
 if(amount){
   const l=root.GMContractsAdvanced.ledger(s);l.deadCap[s.year]??=[];
   l.deadCap[s.year].push({team:p.team,playerId:p.id,name:p.name,amount,reason:'RELEASE'});
 }
 for(const x of c.voidProration)x.accelerated=true;
 c.voidAccelerationYear=s.year;
 p.team=-1;c.voided=true;
 return {ok:true,deadCap:amount};
}
function seasonEnd(s,context={}){
 const e=init(s);
 if(e.processed.includes(s.year))return {processed:false,year:s.year};
 const ladderResults=[],optionResults=[],caps=[];
 for(const p of s.players.filter(p=>p.team>=0)){
   const ctx=context[p.team]||{};
   ladderResults.push(...assessLadders(p,s,ctx));
   optionResults.push(...settleOptions(p,s));
   const c=p.contractAdvanced,activeEnd=c?.startYear+c?.baseSalaries?.length-1;
   if(c&&activeEnd===s.year)accelerateVoid(p,s,false);
 }
 const count=root.TEAMS?.length||32;
 for(let team=0;team<count;team++){
   const sheetNow=sheet(s,team,s.year),baseNext=baseLimit(s,s.year+1),
     maxCarry=baseNext*CONFIG.cap.maxCarryoverFraction;
   const carry=money(Math.min(maxCarry,Math.max(0,sheetNow.space)*CONFIG.cap.carryoverRate));
   const penalty=money(sheetNow.over*CONFIG.cap.overagePenaltyRate);
   e.carryover[s.year+1]??={};e.penalties[s.year+1]??={};
   e.carryover[s.year+1][team]=carry;
   e.penalties[s.year+1][team]=penalty;
   if(carry||penalty)caps.push({team,carry,penalty});
 }
 const my=sheet(s,s.team,s.year);
 if(my.space<0){
   const owner=root.GMOwner?.init(s)||s.ownerFranchise;
   if(owner){
     owner.jobSecurity=clamp(owner.jobSecurity+CONFIG.cap.violationSecurity,0,100);
     owner.fanHappiness=clamp(owner.fanHappiness+CONFIG.cap.violationFans,0,100);
   }
   s.news?.unshift('Salary cap violation: $'+money(-my.space)+'M over the limit; next-year penalty applied.');
 }
 e.history.unshift({year:s.year,cap:my,ladderResults,optionResults,caps});
 e.history.length=Math.min(e.history.length,CONFIG.cap.historyLimit);
 e.processed.push(s.year);
 return {processed:true,year:s.year,cap:my,ladderResults,optionResults,caps};
}
function advanceYear(s){
 const e=init(s);s.cap=baseLimit(s,s.year);
 return {year:s.year,baseCap:s.cap,carryover:money(e.carryover?.[s.year]?.[s.team]||0),
   penalty:money(e.penalties?.[s.year]?.[s.team]||0),limit:capAt(s,s.team,s.year)};
}
function registerSigning(p,s,offer={}){
 if(!p||p.team<0)return {ok:false,error:'No signed player'};
 const c=ensureContract(p,s),years=clamp(Math.round(p.years||offer.years||1),1,CONFIG.negotiation.maxYears);
 c.startYear=s.year;c.baseSalaries=Array(years).fill(money(p.salary||offer.salary||1));
 c.bonusProration=Array(years).fill(money((offer.bonus||0)/years));
 c.guarantees=Array(years).fill(money((offer.guaranteed||0)/years));
 c.clauses={noTrade:offer.clause==='NO_TRADE'||!!offer.noTrade,
   noTag:offer.clause==='NO_TAG'||!!offer.noTag};
 c.options=[];c.voidYears=0;c.voidProration=[];c.incentiveLadders=[];
 if(['TEAM_OPTION','PLAYER_OPTION'].includes(offer.clause)){
   // Free-agency option clauses attach one EXTRA conditional year after the base deal.
   // The extra year has no guaranteed salary, and its exercise is decided the prior season.
   const holder=offer.clause==='TEAM_OPTION'?'TEAM':'PLAYER',year=s.year+years;
   c.baseSalaries.push(money(p.salary));
   c.bonusProration.push(0);
   c.guarantees.push(0);
   p.years=years+1;
   c.options.push({year,holder,salary:p.salary,decided:false,exercised:null,
     deadlineYear:year-1,deadlineWeek:CONFIG.option.decisionDeadlineWeek});
 }
 if(Number(offer.incentive)>0){
   const type=p.pos==='WR'||p.pos==='TE'?'REC_YARDS':p.pos==='QB'?'PASS_YARDS':
     p.pos==='RB'?'RUSH_YARDS':p.pos==='DL'?'SACKS':'TEAM_WINS';
   const threshold={REC_YARDS:1000,PASS_YARDS:3500,RUSH_YARDS:1000,SACKS:10,TEAM_WINS:10}[type];
   addLadder(p,s,{yearIndex:1,conditions:[{type,threshold}],payout:offer.incentive});
 }
 return {ok:true,contract:c};
}
function page(s){
 const summary=sheet(s),x=init(s),
   agents=s.players.filter(p=>p.team===s.team).map(p=>({p,a:agent(p),c:ensureContract(p,s)}));
 return '<div class="eyebrow">CONTRACT OPERATIONS</div><h1 class="heading">AGENTS & CAP ECONOMY</h1>'+
 '<p class="sub">Void years spread bonus money but create future dead cap. Option years are decided before the season they cover. Restricted clauses protect high-rated players.</p>'+
 '<div class="grid three">'+[
 ['LEAGUE CAP','$'+summary.base.toFixed(1)+'M'],['CARRYOVER','$'+summary.carryover.toFixed(1)+'M'],
 ['PENALTIES','$'+summary.penalty.toFixed(1)+'M'],['YOUR CAP','$'+summary.limit.toFixed(1)+'M'],
 ['PAYROLL','$'+summary.contracts.toFixed(1)+'M'],['CAP SPACE','$'+summary.space.toFixed(1)+'M']
 ].map(([label,value])=>'<div class="card"><h3>'+label+'</h3><h2>'+value+'</h2></div>').join('')+'</div>'+
 '<h2>CAP FORECAST</h2><div class="card" style="overflow-x:auto"><table style="width:100%">'+
 '<tr><th>YEAR</th><th>BASE</th><th>CARRY</th><th>PENALTY</th><th>DEAD</th><th>SPACE</th></tr>'+
 table(s,5).map(r=>'<tr><td>'+r.year+'</td><td>$'+r.base+'</td><td>$'+r.carryover+
 '</td><td>$'+r.penalty+'</td><td>$'+r.dead+'</td><td>$'+r.space+'</td></tr>').join('')+
 '</table></div><h2>NEGOTIATIONS & CLAUSES</h2><div class="grid two">'+agents.map(({p,a,c})=>{
   const opts=c.options.filter(o=>!o.decided),ladders=c.incentiveLadders.slice(-3);
   return '<div class="card"><h3>'+safe(p.name)+' · '+safe(p.pos)+' · '+p.rating+' OVR</h3>'+
   '<p>Agent: <b>'+safe(a.name)+'</b> · '+safe(a.persona)+'</p>'+
   '<p>Salary $'+money(p.salary)+'M · '+p.years+' active years · Void years '+c.voidYears+
   ' · '+(c.clauses.noTrade?'NO-TRADE ':'')+(c.clauses.noTag?'NO-TAG':'')+'</p>'+
   '<p class="muted">'+(opts.length?opts.map(o=>o.holder+' option '+o.year).join(', '):'No pending options')+
     ' · '+ladders.length+' incentive ladder(s)</p>'+
   '<div class="filters"><button onclick="gmEconomyNegotiate('+p.id+')">NEGOTIATE</button> '+
   '<button onclick="gmEconomyOption('+p.id+')">OPTION</button> '+
   '<button onclick="gmEconomyLadder('+p.id+')">ADD LADDER</button> '+
   '<button onclick="gmEconomyClause('+p.id+')">CLAUSE</button></div></div>';
 }).join('')+'</div>'+
 '<h2>FRANCHISE CAP HISTORY</h2>'+
 (x.history.slice(0,5).map(h=>'<div class="card">'+h.year+' · Payroll $'+h.cap.contracts+
 'M · Carryover planned $'+money(x.carryover[h.year+1]?.[s.team]||0)+
 'M · Penalty $'+money(x.penalties[h.year+1]?.[s.team]||0)+'M</div>').join('')||
 '<div class="card">Complete a season to record the first cap report.</div>');
}
root.GMContractEconomy={CONFIG,agent,freeAgentScoreModifier,init,baseLimit,capAt,legacyDead,dead,
 ladderHit,payroll,sheet,table,market,evaluateOffer,ensureContract,grantClause,canTrade,canTag,
 extend,setOption,settleOptions,addLadder,assessLadders,accelerateVoid,release,
 seasonEnd,advanceYear,registerSigning,page};
root.Gridiron?.register?.('contractEconomy',root.GMContractEconomy);
function execResult(fn){try{const r=fn();if(!r.ok)alert(r.error||'Unable to complete contract action');else {save();render()}}catch(e){alert(e.message)}}
root.gmEconomyNegotiate=id=>{
 const p=state.players.find(p=>String(p.id)===String(id));if(!p)return;
 const years=prompt('Guaranteed base years (1–7):','3');if(years===null)return;
 const salary=prompt('Annual salary ($M):',String(money(Math.ceil(market(p)*1.1))));if(salary===null)return;
 const bonus=prompt('Signing bonus ($M):','3');if(bonus===null)return;
 const guarantees=prompt('Total guarantees ($M):','6');if(guarantees===null)return;
 const optionYears=prompt('Additional option years (0–2):','0');if(optionYears===null)return;
 const voidYears=prompt('Void years for bonus proration (0–3):','0');if(voidYears===null)return;
 const optionHolder=Number(optionYears)>0?prompt('Option controlled by TEAM or PLAYER:','TEAM'):'TEAM';
 if(optionHolder===null)return;
 const clauses=prompt('Clauses: NONE, NO_TRADE, NO_TAG or BOTH:','NONE');if(clauses===null)return;
 const upper=String(clauses).trim().toUpperCase();
 if(!['NONE','NO_TRADE','NO_TAG','BOTH'].includes(upper)){alert('Unknown clause combination');return}
 execResult(()=>extend(p,state,{years:Number(years),salary:Number(salary),bonus:Number(bonus),
 guaranteed:Number(guarantees),optionYears:Number(optionYears),voidYears:Number(voidYears),
 optionHolder:String(optionHolder).trim().toUpperCase(),
 noTrade:upper==='NO_TRADE'||upper==='BOTH',noTag:upper==='NO_TAG'||upper==='BOTH'}));
};
root.gmEconomyClause=id=>{
 const p=state.players.find(p=>String(p.id)===String(id));if(!p)return;
 const kind=prompt('Add a no-trade or no-tag clause? Enter TRADE or TAG:','TRADE');
 if(kind===null)return;execResult(()=>grantClause(p,state,String(kind).trim().toUpperCase()==='TRADE'?'noTrade':
 String(kind).trim().toUpperCase()==='TAG'?'noTag':''));
};
root.gmEconomyOption=id=>{
 const p=state.players.find(p=>String(p.id)===String(id));if(!p)return;
 const c=ensureContract(p,state),o=c.options.find(o=>!o.decided&&o.holder==='TEAM');
 if(!o){alert('No undecided team option. Player options are automatic at the deadline.');return}
 const decision=prompt('Team option for '+p.name+' in '+o.year+' at $'+o.salary+
   'M: enter EXERCISE or DECLINE. Cancel to leave unchanged.','EXERCISE');
 if(decision===null)return;
 const choice=decision.trim().toUpperCase();
 if(!['EXERCISE','DECLINE'].includes(choice)){alert('Choose EXERCISE or DECLINE');return}
 execResult(()=>setOption(p,state,o.year,choice==='EXERCISE'));
};
root.gmEconomyLadder=id=>{
 const p=state.players.find(p=>String(p.id)===String(id));if(!p)return;
 const year=prompt('Contract year from now (1–7):','2');if(year===null)return;
 const type=prompt('Stat: REC_YARDS / PASS_YARDS / RUSH_YARDS / SACKS / TEAM_WINS:','REC_YARDS');
 if(type===null)return;
 const threshold=prompt('Required stat total:','1200');if(threshold===null)return;
 const playoff=confirm('Also require this player’s team to make the playoffs?');
 const payout=prompt('Incentive payout ($M):','2');if(payout===null)return;
 const conditions=[{type:String(type).trim().toUpperCase(),threshold:Number(threshold)}];
 if(playoff)conditions.push({type:'PLAYOFFS',threshold:1});
 execResult(()=>addLadder(p,state,{yearIndex:Number(year),conditions,payout:Number(payout)}));
};
})(window);
