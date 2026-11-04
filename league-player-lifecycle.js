/* Long-term league lifecycle — keep free-agent supply manageable after many drafts.
   Retains the strongest available players and the user's recent ex-players.
   Exits are archived as compact career summaries; no current roster is cut. */
(function(root){
'use strict';
const CONFIG={
 activeFreeAgents:300,
 perPositionFloor:20,
 protectUserExitYears:2,
 departedArchiveLimit:1200,
 ratingWeight:1,
 potentialWeight:.15,
 ageOver30Penalty:.2
};
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
function score(p){
 return (Number(p.rating)||0)*CONFIG.ratingWeight+
   Math.max(0,(Number(p.pot)||0)-(Number(p.rating)||0))*CONFIG.potentialWeight-
   Math.max(0,(Number(p.age)||0)-30)*CONFIG.ageOver30Penalty;
}
function prune(s){
 if(!s||!Array.isArray(s.players))return {ok:false,error:'Invalid franchise state'};
 const free=s.players.filter(p=>p.team===-1),limit=CONFIG.activeFreeAgents;
 if(free.length<=limit)return {ok:true,exited:0,retained:free.length};
 const sorted=free.slice().sort((a,b)=>score(b)-score(a)||
   (Number(a.id)||0)-(Number(b.id)||0));
 const kept=[],selected=new Set();
 const retain=p=>{const key=String(p.id);if(selected.has(key)||kept.length>=limit)return;
   selected.add(key);kept.push(p)};
 // Protect recent departing players from the user's own franchise, allowing
 // re-signing after the offseason. Keep the strongest if more than the cap.
 for(const p of sorted)if(
   (p.lastContractTeam??p.formerTeam)===s.team&&
   (s.year-(p.freeAgentSince??s.year))<=CONFIG.protectUserExitYears
 )retain(p);
 for(const pos of POS){
   let have=kept.filter(p=>p.pos===pos).length;
   for(const p of sorted){
     if(have>=CONFIG.perPositionFloor||kept.length>=limit)break;
     if(p.pos===pos&&!selected.has(String(p.id))){retain(p);have++}
   }
 }
 for(const p of sorted)if(kept.length<limit)retain(p);
 const exited=free.filter(p=>!selected.has(String(p.id)));
 const archive=exited.map(p=>({
   id:p.id,name:p.name,pos:p.pos,age:p.age,rating:p.rating,
   lastTeam:p.lastContractTeam??p.formerTeam??null,
   exitedYear:s.year,careerStats:{...(p.careerStats||{})}
 }));
 s.players=s.players.filter(p=>p.team!==-1||selected.has(String(p.id)));
 s.departedPlayers=[...archive,...(s.departedPlayers||[])].slice(0,CONFIG.departedArchiveLimit);
 s.news?.unshift('League transactions: '+exited.length+' unsigned players exited the active market. '+
   limit+' free agents remain available; departed career summaries were archived.');
 return {ok:true,exited:exited.length,retained:kept.length,archiveSize:s.departedPlayers.length};
}
root.GMLeaguePlayerLifecycle={CONFIG,prune,score};
root.Gridiron?.register?.('playerLifecycle',root.GMLeaguePlayerLifecycle);
})(window);