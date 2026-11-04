/* Priority 6: league stories, live records and performance-based awards.
   Script-tag module; single balance configuration, no dependencies. */
(function(root){
'use strict';
const CONFIG={
 story:{maxHeadlines:240,hotSeatEveryWeeks:4,hotSeatMinGames:6,hotSeatPct:.35,
   closeMargin:3,blowoutMargin:21,youngQB:26,veteranQB:31,
   upsetRatingGap:7,streakWins:5,streakLosses:5,streakPulseEveryWins:3,qbPulseEveryWeeks:4,rookieYardsBreakout:180},
 milestone:{passYards:[10000,20000,30000,40000,50000],passTD:[100,200,300,400],
   rushYards:[5000,10000,15000],receivingYards:[5000,10000,15000],
   tackles:[500,1000],sacks:[50,100,150],interceptions:[30,50]},
 record:{keys:['passYards','passTD','rushYards','receivingYards','receptions',
   'rushTD','recTD','tackles','sacks','interceptions'],maxGames:400,maxEvents:120},
 ballot:{stats:.72,wins:.20,scarcity:.08,minGames:1,
   allPro:{QB:1,RB:2,WR:3,TE:1,OL:5,DL:4,LB:3,CB:3,S:2,K:1},
   proBowl:{QB:3,RB:3,WR:4,TE:2,OL:6,DL:5,LB:4,CB:4,S:3,K:1},
   weights:{QB:{passYards:5,passTD:4,interceptions:-1},
     RB:{rushYards:6,rushTD:3,receptions:1},
     WR:{receivingYards:7,receptions:2,recTD:1},
     TE:{receivingYards:6,receptions:3,recTD:1},
     OL:{games:7,rating:3},DL:{sacks:7,tackles:3},
     LB:{tackles:6,sacks:4},CB:{tackles:7,interceptions:3},
     S:{tackles:7,interceptions:3},K:{games:7,rating:3}}}
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const club=t=>root.TEAMS?.[t]?.[1]||'Team '+t;
const num=x=>Math.max(0,Number(x)||0);
function init(s){
 const d=s.leagueNarratives??={version:1,headlines:[],processedGames:[],processedWeeks:[],
   seasonRecords:{},allTimeSeasonRecords:{},careerRecords:{},franchiseRecords:{},gameRecords:{},
   recordEvents:[],honors:[],teamRecords:{},champions:[],teamPlayerSeason:{},
   teamStatsYear:s.year,qbLeaders:{}};
 for(const key of ['headlines','processedGames','processedWeeks','recordEvents','honors'])d[key]??=[];
 for(const key of ['seasonRecords','allTimeSeasonRecords','careerRecords','franchiseRecords','gameRecords','teamRecords','qbLeaders'])d[key]??={};
 d.champions??=[];d.teamPlayerSeason??={};
 if(d.teamStatsYear!==s.year){d.teamStatsYear=s.year;d.teamPlayerSeason={}}
 return d;
}
function snap(s,g){
 const clubs=new Set([g.a,g.b]),out=new Map();
 for(const p of s.players)if(clubs.has(p.team))
   out.set(String(p.id),Object.fromEntries([...CONFIG.record.keys,'games'].map(k=>[k,num(p.stats?.[k])])));
 return out;
}
function story(s,kind,message,teams=[]){
 const d=init(s),item={year:s.year,week:s.week,kind,message,teams};
 d.headlines.unshift(item);d.headlines.length=Math.min(d.headlines.length,CONFIG.story.maxHeadlines);
 if(teams.includes(s.team))s.news?.unshift('GRIDIRON NETWORK: '+message);
 return item;
}
function record(s,collection,key,value,p,kind){
 const d=init(s),previous=d[collection][key];
 if(value<=0||(previous&&previous.value>=value))return;
 const entry={value,year:s.year,week:s.week,name:p.name,playerId:p.id,
   team:p.team,teamName:club(p.team),pos:p.pos,kind};
 d[collection][key]=entry;
 if(previous){
   d.recordEvents.unshift({collection,key,...entry});
   d.recordEvents.length=Math.min(d.recordEvents.length,CONFIG.record.maxEvents);
   if(p.team===s.team)story(s,'RECORD',p.name+' breaks the '+kind+' record with '+value+'.',[p.team]);
 }
}
function teamMark(s,key,value,team,kind){
 const d=init(s),previous=d.teamRecords[key];
 if(value<=0||(previous&&previous.value>=value))return null;
 const entry={year:s.year,week:s.week,kind,value,team,teamName:club(team)};
 d.teamRecords[key]=entry;
 if(previous){
   d.recordEvents.unshift({collection:'teamRecords',key,...entry});
   d.recordEvents.length=Math.min(d.recordEvents.length,CONFIG.record.maxEvents);
   story(s,'TEAM_RECORD',club(team)+' sets a new '+kind+' record: '+value+'.',[team]);
 }
 return entry;
}
function championship(s,champion,runner){
 const d=init(s);
 if(d.champions.some(x=>x.year===s.year))return d.champions.find(x=>x.year===s.year);
 const entry={year:s.year,team:champion,teamName:club(champion),
   runner,runnerName:club(runner)};
 d.champions.unshift(entry);d.champions=d.champions.slice(0,60);
 const total=d.champions.filter(x=>x.team===champion).length;
 teamMark(s,'CHAMPIONSHIPS',total,champion,'most franchise championships');
 story(s,'CHAMPION',entry.teamName+' defeats '+entry.runnerName+' to claim the '+s.year+
   ' championship.',[champion,runner]);
 return entry;
}
function afterGame(s,g,before){
 const d=init(s),id=[s.year,g.week,g.a,g.b].join(':');
 if(d.processedGames.includes(id))return false;
 const teams=new Set([g.a,g.b]);
 for(const p of s.players){
   if(!teams.has(p.team))continue;
   p.careerStats??={};
   const prev=before?.get(String(p.id))||{};
   const playerTeamKey=p.team+':'+p.id;
   const teamTotals=d.teamPlayerSeason[playerTeamKey]??={};
   const gameCount=Math.max(0,num(p.stats?.games)-num(prev.games));
   if(gameCount>0)p.careerStats.games=num(p.careerStats.games)+gameCount;
   for(const k of CONFIG.record.keys){
     const total=num(p.stats?.[k]),delta=Math.max(0,total-num(prev[k]));
     if(delta>0){
       p.careerStats[k]=num(p.careerStats[k])+delta;
       teamTotals[k]=num(teamTotals[k])+delta;
       const current=p.careerStats[k],prior=current-delta;
       for(const threshold of CONFIG.milestone[k]||[])if(prior<threshold&&current>=threshold)
         story(s,'MILESTONE',p.name+' reaches '+threshold.toLocaleString()+
           ' career '+k+'.',[p.team]);
     }
     if(total>0){
       record(s,'seasonRecords',s.year+':'+k,total,p,'league season '+k);
       record(s,'allTimeSeasonRecords',k,total,p,'all-time single-season '+k);
       // Credit only stats earned for this franchise, not stats before a midseason trade.
       if(num(teamTotals[k]))record(s,'franchiseRecords',p.team+':'+k,teamTotals[k],p,'franchise season '+k);
     }
     if(delta>0)record(s,'gameRecords',k,delta,p,'single-game '+k);
     const career=num(p.careerStats[k]);
     if(career>0)record(s,'careerRecords',k,career,p,'league career '+k);
   }
   if((p.rookieDraft?.year===s.year||p.rookie&&p.age<=23)&&
      num(p.stats?.receivingYards)-num(prev.receivingYards)>=CONFIG.story.rookieYardsBreakout)
     story(s,'ROOKIE_BREAKOUT',p.name+' delivers a breakout receiving game for '+club(p.team)+'.',[p.team]);
 }
 const winner=g.sa>g.sb?g.a:g.b,loser=winner===g.a?g.b:g.a,
   margin=Math.abs(g.sa-g.sb);
 const strength=team=>{
   const rated=s.players.filter(p=>p.team===team).sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,12);
   return rated.length?rated.reduce((n,p)=>n+(p.rating||0),0)/rated.length:70;
 };
 if(strength(loser)-strength(winner)>=CONFIG.story.upsetRatingGap)
   story(s,'UPSET',club(winner)+' shocks favored '+club(loser)+' with a '+Math.max(g.sa,g.sb)+'–'+Math.min(g.sa,g.sb)+' upset.',[g.a,g.b]);
 teamMark(s,'GAME_POINTS',Math.max(g.sa,g.sb),winner,'most points in a single game');
 teamMark(s,'GAME_MARGIN',margin,winner,'largest victory margin');
 const recent=(s.results||[]).filter(x=>x.year===s.year&&(x.a===winner||x.b===winner));
 let run=0;
 for(let i=recent.length-1;i>=0;i--){
   const x=recent[i];
   if((x.sa>x.sb?x.a:x.b)!==winner)break;
   run++;
 }
 if(run>=CONFIG.story.streakWins&&
    (run===CONFIG.story.streakWins||(run-CONFIG.story.streakWins)%CONFIG.story.streakPulseEveryWins===0))
   story(s,'WIN_STREAK',club(winner)+' extends its winning streak to '+run+' games.',[winner]);
 if(margin<=CONFIG.story.closeMargin)
   story(s,'THRILLER',club(winner)+' edges '+club(loser)+' in a '+margin+'-point finish.',[g.a,g.b]);
 else if(margin>=CONFIG.story.blowoutMargin)
   story(s,'STATEMENT',club(winner)+' overwhelms '+club(loser)+' by '+margin+'.',[g.a,g.b]);
 if(root.TEAMS?.[g.a]?.[2]===root.TEAMS?.[g.b]?.[2]&&margin<=10)
   story(s,'RIVALRY',club(winner)+' earns division bragging rights against '+club(loser)+'.',[g.a,g.b]);
 const young=s.players.filter(p=>p.team===winner&&p.pos==='QB').sort((a,b)=>b.rating-a.rating)[0],
   veteran=s.players.filter(p=>p.team===loser&&p.pos==='QB').sort((a,b)=>b.rating-a.rating)[0];
 if(young&&veteran&&young.age<=CONFIG.story.youngQB&&veteran.age>=CONFIG.story.veteranQB)
   story(s,'PASSING_TORCH',young.name+' outduels veteran '+veteran.name+
     ' in a passing-of-the-torch moment.',[winner,loser]);
 d.processedGames.push(id);d.processedGames=d.processedGames.slice(-CONFIG.record.maxGames);
 return true;
}
function teamRecord(s,team){
 const games=(s.results||[]).filter(g=>g.year===s.year&&(g.a===team||g.b===team));
 const wins=games.filter(g=>(g.sa>g.sb?g.a:g.b)===team).length;
 return {w:wins,l:games.length-wins,pct:games.length?wins/games.length:.5,games:games.length};
}
function weekly(s){
 const d=init(s),id=s.year+':'+s.week;
 if(d.processedWeeks.includes(id))return [];
 const published=[];
 if(s.week%CONFIG.story.hotSeatEveryWeeks===0)
   for(let team=0;team<(root.TEAMS?.length||32);team++){
     const rec=teamRecord(s,team);
     if(rec.games>=CONFIG.story.hotSeatMinGames&&rec.pct<=CONFIG.story.hotSeatPct){
       published.push(story(s,'COACH_HOT_SEAT',club(team)+' staff faces questions after a '+
         rec.w+'–'+rec.l+' start.',[team]));
       if(published.length>=3)break;
     }
   }
 const qb=s.players.filter(p=>p.team>=0&&p.pos==='QB')
   .sort((a,b)=>num(b.stats?.passYards)-num(a.stats?.passYards))[0];
 if(qb&&num(qb.stats?.passYards)>600&&s.week>2){
   const old=d.qbLeaders[s.year],changed=!old||String(old.playerId)!==String(qb.id);
   if(changed||s.week%CONFIG.story.qbPulseEveryWeeks===0)
     published.push(story(s,changed?'QB_LEADER_CHANGE':'QB_HEADLINE',
       qb.name+' leads the league passing race with '+
       Math.round(num(qb.stats.passYards))+' yards.',[qb.team]));
   d.qbLeaders[s.year]={playerId:qb.id,week:s.week};
 }
 d.processedWeeks.push(id);d.processedWeeks=d.processedWeeks.slice(-100);
 return published;
}
function ballot(s){
 const cfg=CONFIG.ballot,eligible=s.players.filter(p=>p.team>=0&&cfg.weights[p.pos]&&
   num(p.stats?.games)>=cfg.minGames);
 const byPosition={};for(const p of eligible)(byPosition[p.pos]??=[]).push(p);
 const scored=eligible.map(p=>{
   const list=byPosition[p.pos],weights=cfg.weights[p.pos],limit=cfg.allPro[p.pos]||1;
   let score=0,scale=0;
   for(const [k,weight] of Object.entries(weights)){
     const peak=Math.max(1,...list.map(q=>k==='rating'?num(q.rating):num(q.stats?.[k])));
     const raw=k==='rating'?num(p.rating):num(p.stats?.[k]);
     score+=weight>=0?weight*raw/peak:Math.abs(weight)*(1-raw/peak);
     scale+=Math.abs(weight);
   }
   const scarcity=Math.max(0,(list.length-limit)/Math.max(1,list.length));
   const success=teamRecord(s,p.team).pct;
   const total=100*(cfg.stats*score/Math.max(1,scale)+cfg.wins*success+cfg.scarcity*scarcity);
   return {id:p.id,name:p.name,pos:p.pos,team:p.team,rating:p.rating,age:p.age,
     rookie:!!(p.rookieDraft?p.rookieDraft.year===s.year:(p.rookie&&p.age<=23)),
     teamName:club(p.team),score:Math.round(total*10)/10,
     statsScore:Math.round(score/Math.max(1,scale)*100),teamPct:Math.round(success*100)};
 }).sort((a,b)=>b.score-a.score||String(a.id).localeCompare(String(b.id)));
 const select=(pool,counts)=>Object.entries(counts).flatMap(([pos,count])=>
   pool.filter(p=>p.pos===pos).slice(0,count));
 const conferences=[...new Set((root.TEAMS||[]).map(t=>String(t[2]).split(' ')[0]))];
 const proBowlByConference=conferences.map(conference=>({
   conference,players:select(scored.filter(p=>String(root.TEAMS[p.team]?.[2]||'')
     .startsWith(conference)),cfg.proBowl)
 }));
 return {year:s.year,mvp:scored.find(p=>['QB','RB','WR','TE'].includes(p.pos))||null,
   offense:scored.find(p=>['QB','RB','WR','TE','OL'].includes(p.pos))||null,
   defense:scored.find(p=>['DL','LB','CB','S'].includes(p.pos))||null,
   rookie:scored.find(p=>p.rookie)||null,
   allPro:select(scored,cfg.allPro),proBowlByConference,
   votes:scored.slice(0,100)};
}
function seasonEnd(s){
 const d=init(s),existing=d.honors.find(h=>h.year===s.year);
 if(existing)return existing;
 const result=ballot(s);
 const teams=root.TEAMS?.length||32;
 for(let t=0;t<teams;t++)
   teamMark(s,'SEASON_WINS',teamRecord(s,t).w,t,'most regular-season wins');
 result.champion=d.champions.find(x=>x.year===s.year)||null;
 result.teamRecords=Object.values(d.teamRecords).filter(x=>x.year===s.year);
 const awardTypes=[['MVP',result.mvp],['OFFENSIVE_PLAYER',result.offense],
   ['DEFENSIVE_PLAYER',result.defense],['ROOKIE_OF_THE_YEAR',result.rookie],
   ...result.allPro.map(p=>['ALL_PRO',p]),
   ...result.proBowlByConference.flatMap(c=>c.players.map(p=>['PRO_BOWL',p]))];
 for(const [kind,winner] of awardTypes){
   if(!winner)continue;
   const player=s.players.find(p=>String(p.id)===String(winner.id));
   if(!player)continue;
   player.careerHonors??=[];
   if(!player.careerHonors.some(h=>h.year===s.year&&h.kind===kind))
     player.careerHonors.push({year:s.year,kind,team:player.team,teamName:club(player.team)});
 }
 result.storylines=d.headlines.filter(x=>x.year===s.year).slice(0,20);
 result.records=[...Object.values(d.allTimeSeasonRecords).filter(x=>x.year===s.year),
   ...Object.values(d.seasonRecords).filter(x=>x.year===s.year)];
 d.honors.unshift(result);d.honors=d.honors.slice(0,40);
 if(result.mvp)s.news?.unshift('MVP VOTING: '+result.mvp.name+
   ' of '+club(result.mvp.team)+' wins on statistics and team success.');
 return result;
}

function awardsPage(s){
 const d=init(s),years=[s.year,...d.honors.map(x=>x.year)].filter((y,i,a)=>a.indexOf(y)===i);
 const recentlyCompleted=s.week<=1&&!((s.results||[]).some(g=>g.year===s.year));
 const defaultYear=recentlyCompleted&&d.honors.length?d.honors[0].year:s.year;
 const year=years.includes(Number(d.awardsViewYear))?Number(d.awardsViewYear):defaultYear;
 const final=d.honors.find(h=>h.year===year);
 const result=final||(year===s.year?ballot(s):null),status=final?'FINAL AWARDS':'LIVE AWARD WATCH';
 const choice=years.map(y=>'<option value="'+y+'"'+(year===y?' selected':'')+'>'+
   y+(d.honors.some(h=>h.year===y)?' · Final':' · In progress')+'</option>').join('');
 const winner=(label,p)=>'<div class="card"><div class="eyebrow">'+esc(label)+'</div>'+
   '<h2>'+esc(p?.name||'Not yet awarded')+'</h2>'+
   '<p class="muted">'+esc(p?.pos||'')+' · '+esc(p?.teamName||(
     p?.team!=null?club(p.team):''))+'</p>'+
   (p?'<p>Ballot '+Number(p.score||0).toFixed(1)+' / 100 · Stats '+
     Number(p.statsScore||0)+' · Team wins '+Number(p.teamPct||0)+'%</p>':'')+'</div>';
 const proBowl=(result?.proBowlByConference||[]).map(c=>
   '<div class="card"><h3>'+esc(c.conference)+' PRO BOWL</h3>'+
   (c.players||[]).map(p=>'<p>'+esc(p.pos)+' · '+esc(p.name)+' · '+
     esc(p.teamName||club(p.team))+'</p>').join('')+'</div>').join('');
 return '<div class="eyebrow">GRIDIRON HONORS · '+status+'</div>'+
   '<h1 class="heading">LEAGUE AWARDS</h1>'+
   '<p class="sub">Performance-based voting weights statistics, team success and positional competition. Awards become permanent after the championship.</p>'+
   '<label>Season <select onchange="gmSetLeagueAwardsYear(this.value)">'+choice+'</select></label>'+
   '<div class="grid two">'+[
     ['MOST VALUABLE PLAYER',result?.mvp],['OFFENSIVE PLAYER',result?.offense],
     ['DEFENSIVE PLAYER',result?.defense],['OFFENSIVE ROOKIE',result?.rookie]
   ].map(([label,p])=>winner(label,p)).join('')+'</div>'+
   '<h2>ALL-PRO FIRST TEAM</h2><div class="grid two">'+
   ((result?.allPro||[]).map(p=>'<div class="card"><b>'+esc(p.pos)+' · '+esc(p.name)+
     '</b><p>'+esc(p.teamName||club(p.team))+' · '+Number(p.score||0).toFixed(1)+
     ' vote points</p></div>').join('')||'<div class="card">Qualifying players appear after games are simulated.</div>')+
   '</div><h2>CONFERENCE PRO BOWL TEAMS</h2><div class="grid two">'+proBowl+'</div>'+
   '<h2>VOTING LEADERBOARD</h2><div class="card">'+
   ((result?.votes||[]).slice(0,25).map((p,i)=>
     '<p><b>#'+(i+1)+' '+esc(p.name)+'</b> · '+esc(p.pos)+' · '+
     esc(p.teamName||club(p.team))+' · '+Number(p.score||0).toFixed(1)+
     ' / 100</p>').join('')||'No votes yet.')+'</div>';
}
function historyPage(s){
 const d=init(s),years=[...new Set([...(s.history||[]).map(h=>h.year),
   ...d.honors.map(h=>h.year),...d.champions.map(c=>c.year)])].sort((a,b)=>b-a);
 const rows=years.map(year=>{
   const old=(s.history||[]).find(h=>h.year===year),c=d.champions.find(h=>h.year===year),
     honors=d.honors.find(h=>h.year===year);
   return '<div class="card"><div class="eyebrow">SEASON '+year+'</div>'+
     '<h3>CHAMPIONS · '+esc(c?.teamName||old?.champ||'Not recorded')+'</h3>'+
     '<p>Runner-up: '+esc(c?.runnerName||old?.runner||'—')+'</p>'+
     '<p>MVP: '+esc(honors?.mvp?.name||'—')+
     ' · Offensive Player: '+esc(honors?.offense?.name||'—')+
     ' · Defensive Player: '+esc(honors?.defense?.name||'—')+
     ' · Rookie: '+esc(honors?.rookie?.name||'—')+'</p>'+
     '<p class="muted">All-Pro selections: '+(honors?.allPro?.length||0)+
     ' · Pro Bowl selections: '+(honors?.proBowlByConference||[]).reduce((n,c)=>n+(c.players?.length||0),0)+'</p></div>';
 }).join('');
 // Group dynasties by stable team ID so relocation/name changes don't
 // split one franchise's historical championship total into multiple clubs.
 const byTeam={};
 for(const c of d.champions){
   const key=String(c.team);
   byTeam[key]??={name:c.teamName||club(c.team),count:0};
   byTeam[key].count++;
 }
 const dynasty=Object.values(byTeam).sort((a,b)=>b.count-a.count);
 const marked=Object.values(d.teamRecords).sort((a,b)=>b.year-a.year);
 return '<div class="eyebrow">GRIDIRON ARCHIVES</div><h1 class="heading">LEAGUE HISTORY</h1>'+
   '<p class="sub">Championships, annual honors, record seasons, and growing franchise dynasties.</p>'+
   '<div class="grid three"><div class="card"><h3>SEASONS COMPLETED</h3><h2>'+years.length+'</h2></div>'+
   '<div class="card"><h3>CHAMPIONS CROWNED</h3><h2>'+d.champions.length+'</h2></div>'+
   '<div class="card"><h3>HONORS ARCHIVED</h3><h2>'+d.honors.length+'</h2></div></div>'+
   '<h2>CHAMPIONSHIP & AWARD YEARBOOK</h2>'+
   (rows||'<div class="card">Complete a season to start your league history.</div>')+
   '<h2>DYNASTIES</h2><div class="card">'+
   (dynasty.map(c=>'<p><b>'+esc(c.name)+
     '</b> · '+c.count+' championship'+(c.count===1?'':'s')+'</p>').join('')||
     'Dynasties begin with the first championship.')+'</div>'+
   '<h2>TEAM RECORD BOOK</h2><div class="grid two">'+
   (marked.map(r=>'<div class="card"><h3>'+esc(r.kind)+'</h3><b>'+r.value+
     '</b> · '+esc(r.teamName||club(r.team))+' · '+r.year+'</div>').join('')||
     '<div class="card">Team records arrive after the first games.</div>')+'</div>';
}
function hallPage(s){
 const db=s.simPresentation||{},ballots=db.hallOfFameBallots||[],all=new Set(),
   classes=[];
 for(const b of ballots)for(const item of b.inductees||[]){
   const key=String(item.id);
   if(all.has(key))continue;
   all.add(key);classes.push({year:b.year,...item});
 }
 classes.sort((a,b)=>b.year-a.year||b.score-a.score);
 const recent=ballots[0],retired=s.retired||[];
 const playerSummary=item=>{
   const p=retired.find(p=>String(p.id)===String(item.id));
   return '<div class="card"><h3>'+esc(item.name)+'</h3>'+
     '<p>Class of '+item.year+' · Hall score '+Number(item.score||0)+'</p>'+
     (p?'<p>'+esc(p.pos)+' · Career passing '+num(p.careerStats?.passYards)+
       ' · Rushing '+num(p.careerStats?.rushYards)+
       ' · Receiving '+num(p.careerStats?.receivingYards)+
       ' · Honors '+(p.careerHonors||[]).length+'</p>':'')+'</div>';
 };
 return '<div class="eyebrow">GRIDIRON LEGENDS</div><h1 class="heading">HALL OF FAME</h1>'+
   '<p class="sub">Retired players become eligible for voting after two seasons. Only voted-in inductees receive a place in the Hall.</p>'+
   '<div class="grid three"><div class="card"><h3>INDUCTEES</h3><h2>'+classes.length+
     '</h2></div><div class="card"><h3>INDUCTION CLASSES</h3><h2>'+ballots.length+
     '</h2></div><div class="card"><h3>RETIRED PLAYERS</h3><h2>'+retired.length+'</h2></div></div>'+
   '<h2>INDUCTION WALL</h2><div class="grid two">'+
   (classes.map(playerSummary).join('')||'<div class="card">No players have been inducted yet.</div>')+'</div>'+
   '<h2>LATEST BALLOT</h2><div class="card">'+
   (recent?.candidates?.map(p=>'<p>'+esc(p.name)+' · Hall score '+p.score+
     ' · '+p.votes+'% ballots</p>').join('')||'Candidates appear after eligible retirements.')+'</div>';
}
function page(s){
 const d=init(s),latest=d.honors[0],
   top=(v,n=8)=>Object.values(v).slice().sort((a,b)=>b.value-a.value).slice(0,n),
   recordRow=r=>'<div class="card"><b>'+esc(r.name)+'</b> · '+esc(r.kind)+
     ' <strong>'+r.value+'</strong> · '+r.year+'</div>';
 return '<div class="eyebrow">GRIDIRON NETWORK</div><h1 class="heading">LEAGUE PULSE & RECORDS</h1>'+
   '<p class="sub">League-wide rivalries, quarterback stories, coaching hot seats and live records.</p>'+
   '<h2>LEAGUE HEADLINES</h2>'+
   (d.headlines.slice(0,20).map(h=>'<div class="card"><div class="eyebrow">'+h.year+' W'+h.week+
     ' · '+esc(h.kind)+'</div><p>'+esc(h.message)+'</p></div>').join('')||
     '<div class="card">The first headlines arrive after game results.</div>')+
   '<h2>AWARD VOTING & ALL-PRO</h2>'+
   (latest?'<div class="grid two">'+[['MVP',latest.mvp],['Offense',latest.offense],
       ['Defense',latest.defense],['Rookie',latest.rookie]]
      .map(([label,p])=>'<div class="card"><h3>'+label+'</h3><b>'+esc(p?.name||'—')+
        '</b><p>'+esc(p?club(p.team):'')+' · '+(p?.score??0)+' voting points</p></div>')
      .join('')+'</div><div class="card"><h3>ALL-PRO FIRST TEAM</h3>'+
      latest.allPro.map(p=>'<p>'+esc(p.pos)+' · '+esc(p.name)+' · '+
        esc(club(p.team))+' · '+p.score+'</p>').join('')+'</div>':
      '<div class="card">Awards voting is finalized at the end of the season.</div>')+
   '<h2>ALL-TIME SINGLE-SEASON RECORDS</h2>'+
   (top(d.allTimeSeasonRecords).map(recordRow).join('')||
     '<div class="card">No all-time records yet.</div>')+
   '<h2>THIS SEASON LEADERS</h2>'+(top(Object.fromEntries(
      Object.entries(d.seasonRecords).filter(([k,v])=>v.year===s.year)
   )).map(recordRow).join('')||
      '<div class="card">No records yet.</div>')+
   '<h2>CAREER LEADERS</h2>'+(top(d.careerRecords).map(recordRow).join('')||
      '<div class="card">No records yet.</div>')+
   '<h2>FRANCHISE RECORDS</h2>'+
    (top(Object.fromEntries(Object.entries(d.franchiseRecords)
      .filter(([key,r])=>r.team===s.team)),12).map(recordRow).join('')||
     '<div class="card">Your franchise records appear after games.</div>')+
   '<h2>ALL-TIME SINGLE-GAME RECORDS</h2>'+
   (top(d.gameRecords,10).map(recordRow).join('')||'<div class="card">Game records appear after games.</div>')+
   '<h2>TEAM RECORDS</h2>'+
   (top(d.teamRecords,8).map(r=>'<div class="card"><b>'+esc(r.teamName||club(r.team))+
     '</b> · '+esc(r.kind)+' <strong>'+r.value+'</strong> · '+r.year+'</div>').join('')||
     '<div class="card">Team records appear after games.</div>');
}
root.GMLeagueNarratives={CONFIG,init,snap,story,record,teamMark,championship,afterGame,teamRecord,
 weekly,ballot,seasonEnd,page,awardsPage,historyPage,hallPage};
root.gmSetLeagueAwardsYear=year=>{
 const d=init(state),candidate=Number(year);
 if(!Number.isInteger(candidate)||candidate<1900||candidate>2500)return;
 d.awardsViewYear=candidate;render();
};
root.Gridiron?.register?.('leagueNarratives',root.GMLeagueNarratives);
})(window);