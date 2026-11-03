/* Priority 6: league stories, live records and performance-based awards.
   Script-tag module; single balance configuration, no dependencies. */
(function(root){
'use strict';
const CONFIG={
 story:{maxHeadlines:150,hotSeatEveryWeeks:4,hotSeatMinGames:6,hotSeatPct:.35,
   closeMargin:3,blowoutMargin:21,youngQB:26,veteranQB:31},
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
   seasonRecords:{},careerRecords:{},franchiseRecords:{},gameRecords:{},
   recordEvents:[],honors:[]};
 for(const key of ['headlines','processedGames','processedWeeks','recordEvents','honors'])d[key]??=[];
 for(const key of ['seasonRecords','careerRecords','franchiseRecords','gameRecords'])d[key]??={};
 return d;
}
function snap(s,g){
 const clubs=new Set([g.a,g.b]),out=new Map();
 for(const p of s.players)if(clubs.has(p.team))
   out.set(String(p.id),Object.fromEntries(CONFIG.record.keys.map(k=>[k,num(p.stats?.[k])])));
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
   team:p.team,pos:p.pos,kind};
 d[collection][key]=entry;
 if(previous){
   d.recordEvents.unshift({collection,key,...entry});
   d.recordEvents.length=Math.min(d.recordEvents.length,CONFIG.record.maxEvents);
   if(p.team===s.team)story(s,'RECORD',p.name+' breaks the '+kind+' record with '+value+'.',[p.team]);
 }
}
function afterGame(s,g,before){
 const d=init(s),id=[s.year,g.week,g.a,g.b].join(':');
 if(d.processedGames.includes(id))return false;
 const teams=new Set([g.a,g.b]);
 for(const p of s.players){
   if(!teams.has(p.team))continue;
   p.careerStats??={};
   const prev=before?.get(String(p.id))||{};
   for(const k of CONFIG.record.keys){
     const total=num(p.stats?.[k]),delta=Math.max(0,total-num(prev[k]));
     if(delta>0)p.careerStats[k]=num(p.careerStats[k])+delta;
     if(total>0){
       record(s,'seasonRecords',s.year+':'+k,total,p,'league season '+k);
       record(s,'franchiseRecords',p.team+':'+k,total,p,'franchise season '+k);
     }
     if(delta>0)record(s,'gameRecords',k,delta,p,'single-game '+k);
     const career=num(p.careerStats[k]);
     if(career>0)record(s,'careerRecords',k,career,p,'league career '+k);
   }
 }
 const winner=g.sa>g.sb?g.a:g.b,loser=winner===g.a?g.b:g.a,
   margin=Math.abs(g.sa-g.sb);
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
 if(qb&&num(qb.stats?.passYards)>600&&s.week>2)
   published.push(story(s,'QB_HEADLINE',qb.name+' leads the league passing race with '+
     Math.round(num(qb.stats.passYards))+' yards.',[qb.team]));
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
     rookie:!!(p.rookie||p.rookieDraft),score:Math.round(total*10)/10,
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
 result.storylines=d.headlines.filter(x=>x.year===s.year).slice(0,20);
 result.records=Object.values(d.seasonRecords).filter(x=>x.year===s.year);
 d.honors.unshift(result);d.honors=d.honors.slice(0,40);
 if(result.mvp)s.news?.unshift('MVP VOTING: '+result.mvp.name+
   ' of '+club(result.mvp.team)+' wins on statistics and team success.');
 return result;
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
   '<h2>SINGLE-SEASON RECORDS</h2>'+(top(d.seasonRecords).map(recordRow).join('')||
      '<div class="card">No records yet.</div>')+
   '<h2>CAREER LEADERS</h2>'+(top(d.careerRecords).map(recordRow).join('')||
      '<div class="card">No records yet.</div>')+
   '<h2>FRANCHISE RECORDS</h2>'+
    (top(Object.fromEntries(Object.entries(d.franchiseRecords)
      .filter(([key,r])=>r.team===s.team)),12).map(recordRow).join('')||
     '<div class="card">Your franchise records appear after games.</div>');
}
root.GMLeagueNarratives={CONFIG,init,snap,story,record,afterGame,teamRecord,
 weekly,ballot,seasonEnd,page};
root.Gridiron?.register?.('leagueNarratives',root.GMLeagueNarratives);
})(window);