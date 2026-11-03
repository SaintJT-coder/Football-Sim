/* Gridiron GM: backward-compatible attributes, schemes and depth chart. */
(function(root){
'use strict';
const POS={QB:{throwAccuracy:30,throwPower:20,throwUnderPressure:20,awareness:15,playAction:10,scramble:5},RB:{carrying:25,elusiveness:20,speed:20,acceleration:15,trucking:10,catching:10},WR:{catching:25,routeRunning:25,speed:20,release:15,spectacularCatch:15},TE:{catching:25,runBlock:25,routeRunning:20,strength:15,release:15},OL:{passBlock:35,runBlock:35,strength:20,awareness:10},DL:{blockShedding:30,powerMoves:25,finesseMoves:20,pursuit:15,strength:10},LB:{tackling:25,coverage:20,playRecognition:20,passRush:20,speed:15},CB:{manCoverage:30,zoneCoverage:25,speed:20,press:15,ballHawking:10},S:{zoneCoverage:30,tackling:20,manCoverage:20,ballHawking:20,awareness:10},K:{kickAccuracy:50,kickPower:35,kickoff:15}};
const UNIVERSAL=['speed','acceleration','agility','strength','awareness','stamina','injuryProne'];
const OFF=['West Coast','Air Raid','Power Run','Spread Option','Balanced'],DEF=['4-3','3-4','Cover 3','Cover 2','Man Heavy'];
const clamp=(v,a=0,b=99)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
const rand=(a,b)=>Math.round(a+Math.random()*(b-a));
const keys=[...new Set([...UNIVERSAL,...Object.values(POS).flatMap(x=>Object.keys(x))])];
function migratePlayer(p){
 if(!p||!POS[p.pos])return p;
 const base=clamp(p.rating||65,1,99);
 p.attributes??={};
 for(const k of keys)if(!Number.isFinite(+p.attributes[k]))p.attributes[k]=k==='injuryProne'?20:clamp(base+(p.attributesGenerated?rand(-12,12):0));
 p.attributesGenerated=true;
 p.preferredSchemes??=[(p.pos==='DL'||p.pos==='LB'||p.pos==='CB'||p.pos==='S')?'Cover 3':'Balanced'];
 p.devTrait??='Normal';p.abilities??=[];p.xp??=0;p.fatigue??=0;p.morale??=65;
 p.careerStats??={};p.seasonHistory??=[];
 return p;
}
function overall(p){migratePlayer(p);const w=POS[p.pos]||POS.WR;return clamp(Math.round((Object.entries(w).reduce((s,[k,v])=>s+clamp(p.attributes[k])*v,0)/100)*(1+(root.GMPlayerPersonality?.ratingModifier(p)||0))),1,99)}
function fit(p,scheme){migratePlayer(p);if(!scheme)return 75;const a=p.attributes;let score=70+(p.preferredSchemes.includes(scheme)?18:0);
 if(scheme==='Air Raid')score+=(a.throwPower+a.routeRunning-140)*.08;
 if(scheme==='Power Run')score+=(a.strength+a.runBlock-140)*.08;
 if(scheme==='Spread Option')score+=(a.speed+a.agility-140)*.08;
 if(scheme==='Man Heavy')score+=(a.manCoverage+a.press-140)*.08;
 if(scheme==='Cover 3'||scheme==='Cover 2')score+=(a.zoneCoverage+a.awareness-140)*.08;
 return clamp(Math.round(score),0,100)}
function init(s){s.franchiseSystems??={version:1,schemes:{},depthCharts:{},weeklyPlans:{}};for(const p of s.players||[])migratePlayer(p);return s.franchiseSystems}
function scheme(s,t,side){const x=init(s).schemes[t]||{};return x[side]||(side==='offense'?'Balanced':'Cover 3')}
function depth(s,t,pos){if(root.GMRosterRules)return root.GMRosterRules.depth(s,t,pos);const x=init(s),r=s.players.filter(p=>p.team===t&&p.pos===pos);const saved=x.depthCharts[t]?.[pos]||[];const rank=new Map(saved.map((id,i)=>[String(id),i]));return r.sort((a,b)=>(rank.get(String(a.id))??1e6)-(rank.get(String(b.id))??1e6)||b.rating-a.rating)}
function setDepth(s,t,pos,ids){const r=s.players.filter(p=>p.team===t&&p.pos===pos),allowed=new Set(r.map(p=>String(p.id)));if(!POS[pos]||new Set(ids.map(String)).size!==ids.length||ids.some(id=>!allowed.has(String(id))))return false;const f=init(s);f.depthCharts[t]??={};f.depthCharts[t][pos]=ids.slice();return true}
function effective(p,schemeName,s){migratePlayer(p);if(Number(p.injury)>0)return 0;return clamp(p.rating*(1+(root.GMCoaching?.fitModifier(p,schemeName)||0))*(1-clamp(p.fatigue,0,100)*.002)*(0.95+clamp(p.morale,0,100)*.0007)*(1+(root.GMPlayerPersonality?.performanceModifier(p)||0))+(root.GMWeeklyGameplan?.playerBoost(p,s)||0),0,99)}
function score(s,t){const units={offense:{QB:1,RB:1,WR:3,TE:1,OL:5},defense:{DL:4,LB:3,CB:2,S:2},special:{K:1}},out={};for(const [side,slots] of Object.entries(units)){let total=0,n=0;for(const [pos,count] of Object.entries(slots)){const players=depth(s,t,pos).filter(p=>Number(p.injury)<=0||!p.injury);for(let i=0;i<count;i++){total+=players[i]?effective(players[i],scheme(s,t,side),s):45;n++}}out[side]=Math.round(total/n)}out.overall=Math.round(out.offense*.48+out.defense*.47+out.special*.05);return out}
root.GMFranchise={init,migratePlayer,overall,fit,depth,setDepth,score,scheme,OFF,DEF};
})(window);
