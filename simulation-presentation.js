/* Simulation & Presentation 2.0 — additive vanilla JavaScript. */
(function(root){'use strict';
const CONFIG={reportRetention:{franchise:100,otherTeams:64}};
function compactReports(s,db){
 const next=[];let own=0,other=0;
 for(const entry of db.gameReports){
   const isFranchise=entry.a===s.team||entry.b===s.team;
   if(isFranchise){
     if(++own>CONFIG.reportRetention.franchise)continue;
   }else{
     if(++other>CONFIG.reportRetention.otherTeams)continue;
     // The detailed box score is already kept separately for the user's own
     // games. Nonfranchise media cards only need their published summary.
     delete entry.originalReport;
   }
   next.push(entry);
 }
 if(next.length!==db.gameReports.length)db.gameReports=next;
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const name=i=>root.TEAMS?.[i]?.[1]||('Team '+i);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
function init(s){
 const db=s.simPresentation??={};
 db.version??=1;
 // Older franchise-integration.js saved {version,reports,rankings} only.
 // Preserve those fields while filling the collections required by this module.
 for(const key of ['gameReports','pressConferences','retirementCeremonies',
   'hallOfFameBallots','inductedIds','processedGames','processedRetirees'])
   if(!Array.isArray(db[key]))db[key]=[];
 for(const key of ['rivalries','franchiseRecords'])
   if(!db[key]||typeof db[key]!=='object'||Array.isArray(db[key]))db[key]={};
 compactReports(s,db);
 return db;
}
function key(a,b){return [a,b].sort((x,y)=>x-y).join('-')}
function storyline(s,g){const db=init(s),k=key(g.a,g.b),history=db.rivalries[k]||{games:0,results:[]},div=root.TEAMS?.[g.a]?.[2]===root.TEAMS?.[g.b]?.[2],previous=history.results.at(-1);const tags=[];if(div)tags.push('DIVISION RIVALS');if(history.games>=3)tags.push('FAMILIAR FOES');if(previous?.playoff)tags.push('PLAYOFF REMATCH');if(previous&&previous.winner!==null)tags.push('REVENGE GAME');const returning=s.players?.some(p=>p.team===g.a&&p.formerTeam===g.b||p.team===g.b&&p.formerTeam===g.a);if(returning)tags.push('FORMER TEAM');return {tags,boost:Math.min(.025,(div?.008:0)+(previous?.006:0)+(returning?.006:0)),history}}
function pregameBoost(s,g,team){const story=storyline(s,g);if(!story.tags.length)return 0;const last=story.history.results.at(-1);return last?.winner!==team?story.boost:story.boost*.5}
function playerLeaders(s,team){return s.players.filter(p=>p.team===team).sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,3).map(p=>({id:p.id,name:p.name,pos:p.pos,rating:p.rating,stats:{...(p.stats||{})}}))}
function report(s,g){const db=init(s),id=[s.year,g.week,g.a,g.b].join(':');if(db.processedGames.includes(id))return db.gameReports.find(r=>r.id===id);const winner=g.sa===g.sb?null:g.sa>g.sb?g.a:g.b,loser=winner===null?null:winner===g.a?g.b:g.a,story=storyline(s,g),margin=Math.abs(g.sa-g.sb);const headlines=winner===null?'A deadlock under the lights':margin<=3?'A finish decided by inches':margin>=21?'A statement win':'A hard-fought result';const leaders=[...playerLeaders(s,g.a),...playerLeaders(s,g.b)];const narrative=winner===null?name(g.a)+' and '+name(g.b)+' could not be separated.':name(winner)+' defeated '+name(loser)+' '+Math.max(g.sa,g.sb)+'–'+Math.min(g.sa,g.sb)+'. '+(margin<=3?'The final possessions made the difference.':margin>=21?'The winning side controlled the scoreboard.':'Both teams traded momentum throughout the contest.');const highlights=[{period:'OPENING',text:'Both teams established their offensive approach.'},{period:'HALFTIME',text:'Adjustments shaped the second half.'},{period:'FINAL',text:margin<=3?'A one-score finish kept the pressure high.':'The final margin settled the contest.'}];const item={id,year:s.year,week:g.week,a:g.a,b:g.b,sa:g.sa,sb:g.sb,winner,headline:headlines,narrative,storylines:story.tags,boxScore:{home:{team:g.a,points:g.sa},away:{team:g.b,points:g.sb}},leaders,highlights,originalReport:g.report||null};db.processedGames.push(id);db.gameReports.unshift(item);compactReports(s,db);const k=key(g.a,g.b),h=db.rivalries[k]||{games:0,results:[]};h.games++;h.results.push({year:s.year,week:g.week,winner,playoff:!!g.playoff});h.results=h.results.slice(-12);db.rivalries[k]=h;updateRecords(s,item);press(s,item);return item}
function press(s,r){const db=init(s),won=r.winner===s.team,participated=r.a===s.team||r.b===s.team;if(!participated)return;const team=name(s.team),opponent=name(r.a===s.team?r.b:r.a),coach=won?'We executed when it mattered. The players earned this result.':'We have to respond in practice. The standard does not change.';const player=r.leaders.find(p=>s.players.find(x=>x.id===p.id)?.team===s.team);const quote=won?'We trusted each other and finished the job.':'This one hurts, but we know what we need to improve.';const event={id:r.id,year:r.year,week:r.week,headline:(won?'Victory':'Defeat')+' reaction: '+team+' vs '+opponent,quotes:[{speaker:'HEAD COACH',text:coach},...(player?[{speaker:player.name,text:quote}]:[])],tags:r.storylines};db.pressConferences.unshift(event);db.pressConferences=db.pressConferences.slice(0,100);s.news?.unshift('PRESS CONFERENCE: '+event.headline)}
function updateRecords(s,r){const db=init(s);for(const t of [r.a,r.b]){const points=t===r.a?r.sa:r.sb,k=t+':POINTS_GAME',old=db.franchiseRecords[k];if(!old||points>old.value){db.franchiseRecords[k]={team:t,category:'Most points in a game',value:points,year:r.year,week:r.week,opponent:t===r.a?r.b:r.a};if(t===s.team&&old)s.news?.unshift('FRANCHISE RECORD: '+name(t)+' scored '+points+' points!')}}}
function retirement(s,p){const db=init(s),id=p.id+':'+(p.retiredYear??s.year);if(db.processedRetirees.includes(id))return;db.processedRetirees.push(id);const summary={id,playerId:p.id,name:p.name,pos:p.pos,team:p.team,year:p.retiredYear??s.year,age:p.age,rating:p.rating,stats:{...(p.stats||{})},career:{...(p.career||{})},hofScore:hofScore(p)};db.retirementCeremonies.unshift(summary);db.retirementCeremonies=db.retirementCeremonies.slice(0,120);if(summary.rating>=82||summary.hofScore>=65)s.news?.unshift('RETIREMENT CEREMONY: '+p.name+' closes a memorable career.');return summary}
function hofScore(p){const c=p.career||{},stats=p.stats||{};return clamp(Math.round((p.rating||60)*.55+(c.games||0)*.025+(c.awards||0)*8+(c.championships||0)*10+(c.yards||stats.yards||0)*.0015),0,120)}
function hofVote(s){const db=init(s),year=s.year;if(db.hallOfFameBallots.some(b=>b.year===year))return db.hallOfFameBallots.find(b=>b.year===year);const candidates=db.retirementCeremonies.filter(p=>!db.inductedIds.includes(p.playerId)&&year-p.year>=2).sort((a,b)=>b.hofScore-a.hofScore).slice(0,12);const selected=candidates.filter(p=>p.hofScore>=72).slice(0,5);selected.forEach(p=>db.inductedIds.push(p.playerId));const ballot={year,candidates:candidates.map(p=>({id:p.playerId,name:p.name,score:p.hofScore,votes:clamp(Math.round(p.hofScore*.85),0,100)})),inductees:selected.map(p=>({id:p.playerId,name:p.name,score:p.hofScore}))};db.hallOfFameBallots.unshift(ballot);selected.forEach(p=>s.news?.unshift('HALL OF FAME: '+p.name+' has been inducted!'));return ballot}
function season(s){const db=init(s);for(const p of s.retired||[])retirement(s,p);hofVote(s);return db}
function view(s){const db=init(s),card=r=>'<div class="card"><div class="eyebrow">WEEK '+r.week+' · '+r.year+' · '+(r.storylines||[]).map(esc).join(' / ')+'</div><h3>'+esc(r.headline)+'</h3><h2>'+esc(name(r.a))+' '+r.sa+' — '+r.sb+' '+esc(name(r.b))+'</h2><p>'+esc(r.narrative)+'</p><p class="muted">'+(r.highlights||[]).map(h=>h.period+': '+h.text).join(' · ')+'</p><p>Featured players: '+(r.leaders||[]).slice(0,4).map(p=>esc(p.name)+' ('+p.rating+' OVR)').join(', ')+'</p></div>';return '<div class="eyebrow">GRIDIRON NETWORK</div><h1 class="heading">GAME REPORTS & MEDIA</h1><h2>RECENT GAME REPORTS</h2>'+db.gameReports.filter(r=>r.a===s.team||r.b===s.team).slice(0,12).map(card).join('')+'<h2>PRESS CONFERENCES</h2>'+db.pressConferences.slice(0,8).map(q=>'<div class="card"><h3>'+esc(q.headline)+'</h3>'+(q.quotes||[]).map(x=>'<p><b>'+esc(x.speaker)+'</b>: “'+esc(x.text)+'”</p>').join('')+'</div>').join('')+'<h2>RETIREMENT CEREMONIES</h2>'+db.retirementCeremonies.slice(0,8).map(p=>'<div class="card"><h3>'+esc(p.name)+' · '+esc(p.pos)+'</h3><p>Retired '+p.year+' · Age '+p.age+' · Hall of Fame score '+p.hofScore+'</p></div>').join('')+'<h2>HALL OF FAME</h2>'+db.hallOfFameBallots.slice(0,3).map(b=>'<div class="card"><h3>'+b.year+' Induction Class</h3><p>'+esc((b.inductees||[]).map(x=>x.name).join(' · ')||'No inductees this year')+'</p></div>').join('')+'<h2>FRANCHISE RECORDS</h2>'+Object.values(db.franchiseRecords).filter(x=>x.team===s.team).map(x=>'<div class="card">'+esc(x.category)+': <b>'+x.value+'</b> ('+x.year+')</div>').join('')}
root.GMSimPresentation={init,storyline,pregameBoost,report,press,updateRecords,retirement,hofScore,hofVote,season,view};
})(window);