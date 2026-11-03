/* Gridiron GM simulation engine v2 — fictional league, no licensed Madden assets. */
(function(){
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const avg=(xs)=>xs.length?xs.reduce((s,n)=>s+n,0)/xs.length:0;
const pick=(xs)=>xs[Math.floor(Math.random()*xs.length)];
const depth=(team,pos,n=1)=>roster(team).filter(p=>p.pos===pos&&!(Number(p.injury)>0)).sort((a,b)=>b.rating-a.rating).slice(0,n);
const scoreTeam=(team)=>{ if(window.GMFranchise){const x=GMFranchise.score(state,team);return {off:x.offense,def:x.defense,spec:x.special};}
 const unit=(positions)=>avg(positions.flatMap(([pos,n])=>depth(team,pos,n).map(p=>p.rating*(1-(p.fatigue||0)*.003)+((p.morale??65)-65)*.06)));
 const off=unit([['QB',1],['RB',1],['WR',3],['TE',1],['OL',5]]);
 const def=unit([['DL',3],['LB',3],['CB',2],['S',2]]);
 const spec=unit([['K',1]]);
 return {off:off||58,def:def||58,spec:spec||60};
};
const freshSchedule=()=>{
 const clubs=Array.from({length:TEAMS.length},(_,i)=>i),weeks=[];
 for(let w=0;w<18;w++){
  let pairs=[],used=new Set();
  for(let i=0;i<clubs.length;i++){
   if(used.has(i))continue;
   let choices=clubs.filter(j=>j!==i&&!used.has(j));
   choices.sort((a,b)=>{
    let count=x=>weeks.flat().filter(g=>(g.a===i&&g.b===x)||(g.a===x&&g.b===i)).length;
    return count(a)-count(b)+Math.random()-.5;
   });
   let j=choices[0];if(j===undefined)continue;
   used.add(i);used.add(j);pairs.push({a:w%2?j:i,b:w%2?i:j,week:w+1});
  }
  weeks.push(pairs);
 }
 return weeks.flat();
};
function setup(){
 window.GMFranchise?.init(state);
 state.engine??={version:2,season:state.year,schedule:freshSchedule(),career:{},awards:[],playoffs:[],log:[]};
 let e=state.engine;
 if(e.season!==state.year){e.season=state.year;e.schedule=freshSchedule()}
 for(const p of state.players){
  p.fatigue??=0;p.morale??=65;p.form??=0;p.development??=0;
  p.stats??={yards:0,td:0,tackles:0,sacks:0};
  p.stats.attempts??=0;p.stats.completions??=0;p.stats.interceptions??=0;
  p.stats.rushYards??=0;p.stats.receivingYards??=0;p.stats.receptions??=0;
  p.stats.passYards??=0;p.stats.rushTD??=0;p.stats.recTD??=0;
  p.stats.passTD??=0;p.stats.games??=0;
 }
 return e;
}
const noise=(m=1)=> (Math.random()+Math.random()+Math.random()-1.5)*m;
const points=(off,def,home)=>clamp(Math.round(23+(off-def)*.6+noise(17)+(home?1.5:0)),3,56);
const distribute=(players,total,field,weights)=>{
 if(!players.length)return;
 const ws=players.map(weights),sum=ws.reduce((a,b)=>a+b,0)||1;
 let allocated=0;
 players.forEach((p,i)=>{let n=i===players.length-1?total-allocated:Math.max(0,Math.round(total*ws[i]/sum));allocated+=n;p.stats[field]=(p.stats[field]||0)+n});
};
function game(g){
 const a=scoreTeam(g.a),b=scoreTeam(g.b);
 const sa=points(a.off,b.def,true),sb=points(b.off,a.def,false);
 g.sa=sa===sb?sa+3:sa;g.sb=sb;g.year=state.year;
 for(const [team,forPts,againstPts] of [[g.a,g.sa,g.sb],[g.b,g.sb,g.sa]]){
  const q=depth(team,'QB')[0],rbs=depth(team,'RB',3),receivers=[...depth(team,'WR',4),...depth(team,'TE',2)];
  const passShare=clamp(.53+(scoreTeam(team).off-scoreTeam(team).def)*.002+noise(.1),.37,.73);
  const totalYards=clamp(Math.round(290+(forPts-21)*5+noise(95)),120,590);
  const passYards=Math.round(totalYards*passShare),rushYards=totalYards-passYards;
  const tds=Math.min(7,Math.floor(forPts/7));
  if(q){let attempts=clamp(Math.round(30+noise(12)),16,52),completion=clamp(.49+(q.rating-60)*.004+noise(.12),.42,.79);
   q.stats.attempts+=attempts;q.stats.completions+=Math.round(attempts*completion);
   q.stats.passYards+=passYards;q.stats.passTD+=Math.max(0,Math.round(tds*passShare));
   q.stats.interceptions+=Math.random()<clamp(.2-(q.rating-70)*.003,.03,.24)?1:0;
   q.stats.yards+=passYards;q.stats.td+=Math.max(0,Math.round(tds*passShare));
  }
  distribute(rbs,rushYards,'rushYards',p=>Math.max(1,p.rating-48));
  distribute(receivers,passYards,'receivingYards',p=>Math.max(1,p.rating-48)*(p.pos==='WR'?1.2:.8));
  distribute(receivers,Math.round(passYards/12),'receptions',p=>Math.max(1,p.rating-48));
  distribute(rbs,Math.max(0,tds-Math.round(tds*passShare)),'rushTD',p=>Math.max(1,p.rating-48));
  for(const p of [...rbs,...receivers]){p.stats.yards=(p.stats.rushYards||0)+(p.stats.receivingYards||0);p.stats.td=(p.stats.rushTD||0)+(p.stats.recTD||0)}
  const defense=roster(team).filter(p=>['DL','LB','CB','S'].includes(p.pos)&&!p.injury);
  distribute(defense,clamp(Math.round(50+noise(14)),35,75),'tackles',p=>p.rating);
  distribute(defense.filter(p=>['DL','LB'].includes(p.pos)),clamp(Math.round((35-againstPts)/12+noise(2)),0,5),'sacks',p=>p.rating);
  for(const p of roster(team)){
   p.stats.games++;p.fatigue=clamp((p.fatigue||0)+rand(5,14),0,100);
   const injuryRisk=.003+Math.max(0,p.fatigue-45)*.00022+(p.age>31?.002:0);
   if(Number(p.injury)>0){p.injury--;continue}
   if(Math.random()<injuryRisk){p.injury=rand(1,5);state.news.unshift(p.name+' suffered an injury ('+p.injury+' weeks)')}
   p.morale=clamp(p.morale+(forPts>againstPts?rand(0,3):-rand(0,3)),15,100);
   p.development+=Math.max(0,(p.pot-p.rating))*Math.max(.05,(31-p.age)/100);
  }
 }
 return g;
}
function simulateV2(){
 setup();
 if(state.week>18){endSeasonV2();return}
 const games=state.engine.schedule.filter(g=>g.week===state.week);
 if(!games.length)return alert('No games scheduled for this week');
 const e=extraStore(),plan=e.plan||'Game Week',intensity=e.intensity||'Normal';
 for(const g of games){const result=game({...g});state.results.push(result)}
 for(const p of state.players){
  const recovery=plan==='Recovery'?18:plan==='Development'?7:12;
  p.fatigue=clamp(p.fatigue-recovery+(intensity==='High'?5:intensity==='Low'?-5:0),0,100);
  if(p.age<29&&p.rating<p.pot&&p.development>=5){p.rating++;p.development-=5}
 }
 e.trainingPoints=clamp((e.trainingPoints||0)+(plan==='Development'?5:plan==='Recovery'?2:3),0,30);
 const rec=record(state.team);e.jobSecurity=clamp((e.jobSecurity??60)+(rec.w>=rec.l?2:-2),0,100);
 state.cash+=rand(2,8);state.news.unshift('Week '+state.week+' complete: '+rec.w+'-'+rec.l+' season record');
 state.week++;selectedWeek=state.week;save();render();
}
function endSeasonV2(){
 setup();
 const standings=TEAMS.map((t,i)=>({i,rec:record(i),power:scoreTeam(i)}))
 .sort((a,b)=>b.rec.w-a.rec.w||((b.power.off+b.power.def)-(a.power.off+a.power.def)));
 const contenders=standings.slice(0,6),playoffs=[];
 while(contenders.length>1){let next=[];for(let i=0;i<contenders.length;i+=2){
  const a=contenders[i],b=contenders[i+1];if(!b){next.push(a);continue}
  const win=Math.random()<(0.5+(a.power.off+a.power.def-b.power.off-b.power.def)*.01)?a:b;
  playoffs.push({round:playoffs.length<3?'Wildcard / Divisional':'Championship',a:a.i,b:b.i,winner:win.i});
  next.push(win);
 }contenders.splice(0,contenders.length,...next)}
 const champ=contenders[0]?.i??standings[0].i,runner=playoffs.at(-1)?.a===champ?playoffs.at(-1)?.b:playoffs.at(-1)?.a;
 state.history.push({year:state.year,champ:TEAMS[champ][1],runner:TEAMS[runner??standings[1].i][1]});
 state.champions.push(champ);
 const mvp=[...state.players].filter(p=>p.pos==='QB').sort((a,b)=>(b.stats.passYards+b.stats.passTD*20-b.stats.interceptions*35)-(a.stats.passYards+a.stats.passTD*20-a.stats.interceptions*35))[0];
 state.awards.push({year:state.year,mvp:mvp?.name||'—'});
 state.engine.playoffs=playoffs;state.engine.awards.push(state.awards.at(-1));
 for(const p of state.players){
  p.age++;p.years--;p.fatigue=0;p.morale=clamp(p.morale+5,20,100);
  if(p.age>34&&Math.random()<clamp((p.age-33)*.09,0,.75)){state.retired.push({...p,retiredYear:state.year});p.team=-2}
  else if(p.years<=0){p.team=-1;p.years=1}
  p.rating=clamp(p.rating+(p.age<27?rand(0,2):p.age>31?rand(-3,0):rand(-1,1)),45,p.pot);
  p.stats={yards:0,td:0,tackles:0,sacks:0};
 }
 state.year++;state.week=1;state.results=[];state.cash+=35;
 state.engine.season=state.year;state.engine.schedule=freshSchedule();
 state.news.unshift(TEAMS[champ][1]+' won the '+(state.year-1)+' championship!');
 save();render();
}
function scheduleV2(){
 setup();
 const games=state.engine.schedule.filter(g=>g.week===selectedWeek);
 return title('Season Schedule',state.year+' · Week '+state.week+' of 18 · All matchups locked in before kickoff','LEAGUE SCHEDULE')
 +'<button class="primary" onclick="simulate()">Simulate Week '+state.week+'</button>'
 +'<div class="filters">'+Array.from({length:18},(_,i)=>'<button class="'+(selectedWeek===i+1?'selected':'')+'" onclick="selectedWeek='+(i+1)+';render()">W'+(i+1)+'</button>').join('')+'</div>'
 +'<div class="grid two">'+games.map(g=>{const result=state.results.find(x=>x.year===state.year&&x.week===selectedWeek&&x.a===g.a&&x.b===g.b);return '<div class="card"><div class="eyebrow">'+(result?'FINAL':'UPCOMING')+'</div><div class="row"><b>'+TEAMS[g.a][1]+'</b><b>'+(result?result.sa:'—')+'</b></div><div class="row"><b>'+TEAMS[g.b][1]+'</b><b>'+(result?result.sb:'—')+'</b></div></div>'}).join('')+'</div>';
}
function dashboardV2(){
 setup();const r=roster(),rec=record(state.team),power=scoreTeam(state.team);
 return title(TEAMS[state.team][1],TEAMS[state.team][2]+' · '+state.year+' · Week '+state.week,'FRANCHISE COMMAND CENTER')
 +'<div class="banner row"><div><h2>'+TEAMS[state.team][1]+'</h2><span class="muted">Build your dynasty</span></div><div><h2>'+rec.w+'-'+rec.l+'</h2><span class="muted">Season record</span></div></div>'
 +'<button class="primary wide" onclick="simulate()"> '+(state.week>18?'Advance to Offseason':'Simulate Week '+state.week)+'</button>'
 +'<div class="grid three">'+metric('Offense',Math.round(power.off))+metric('Defense',Math.round(power.def))+metric('Special Teams',Math.round(power.spec))+metric('Cap Room',money(capspace()))+metric('Cash',money(state.cash))+metric('Roster',r.length)+'</div>'
 +heading('PLAYER CONDITION')+'<div class="grid three">'+metric('Average morale',Math.round(avg(r.map(p=>p.morale||65))))+metric('Average fatigue',Math.round(avg(r.map(p=>p.fatigue||0)))+'%')+metric('Injuries',r.filter(p=>p.injury>0).length)+'</div>'
 +heading('TOP CONTRIBUTORS')+r.sort((a,b)=>b.rating-a.rating).slice(0,5).map(p=>playerRow(p)).join('')
 +heading('LATEST NEWS')+state.news.slice(0,6).map(n=>'<div class="card" style="margin:8px 0">'+xp(n)+'</div>').join('');
}
const priorRender=render;
render=function(){
 setup();
 if(page==='Dashboard'){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=dashboardV2();return}
 if(page==='Schedule'){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=scheduleV2();return}
 priorRender();
};
simulate=simulateV2;
endSeason=endSeasonV2;
setup();render();
})();