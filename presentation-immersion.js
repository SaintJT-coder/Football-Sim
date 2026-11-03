/* Gridiron GM — Priority 7: Presentation & Immersion.
 * Additive vanilla JS; loaded after existing modules and render wrappers.
 * All gameplay tuning lives in CONFIG. */
(function(root){
'use strict';
const CONFIG={
 press:{questions:3,archive:36,maxMedia:100,maxFan:100,maxSecurity:100,
  choices:{
   confidence:{fan:2,media:2,security:0,morale:1},
   accountability:{fan:1,media:-2,security:1,morale:0},
   support:{fan:2,media:-1,security:0,morale:2},
   challenge:{fan:-1,media:3,security:-1,morale:1},
   protect:{fan:1,media:-2,security:0,morale:1},
   transparency:{fan:1,media:1,security:1,morale:0},
   deflect:{fan:-2,media:3,security:-1,morale:-1},
   discipline:{fan:0,media:-1,security:1,morale:-1}
  }},
 depth:{positionGroups:{OFFENSE:['QB','RB','WR','TE','OL'],
   DEFENSE:['DL','LB','CB','S'],SPECIAL:['K']},visiblePerPosition:5},
 health:{questionableWeeks:1,returningWeeks:2},
 year:{maxSurprises:3}
};
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
const name=t=>root.TEAMS?.[t]?.[1]||'Team '+t;
const currentKey=s=>s.year+':'+s.week;
const btn=(label,action,classes='')=>'<button type="button" class="'+classes+'" onclick="'+action+'">'+label+'</button>';
const changeLabel=n=>(n>0?'+':'')+n;
function pressStore(s){
 const d=s.immersionPress??={version:1,active:null,history:[],processed:[]};
 d.history??=[];d.processed??=[];return d;
}
function teamGame(s,week){
 return (s.results||[]).find(g=>g.year===s.year&&g.week===week&&
   (g.a===s.team||g.b===s.team))||null;
}
function questionSet(s,g){
 const won=g?((g.sa>g.sb?g.a:g.b)===s.team):null;
 const opp=g?name(g.a===s.team?g.b:g.a):'the bye week';
 const base={
  id:'RESULT',title:'THE FINAL WHISTLE',
  text:!g?'How did the team approach a week without a game?':
   won?'You beat '+opp+'. What made the difference?':
   'After the result against '+opp+', what is your message to supporters?',
  options:[
   {id:'confidence',text:won?'We are building something special.':'This team will respond.'},
   {id:'accountability',text:'The responsibility starts with our coaching staff.'},
   {id:'deflect',text:'The media is making too much of one week.'}]
 };
 const qb=s.players.filter(p=>p.team===s.team&&p.pos==='QB')
   .sort((a,b)=>(b.rating||0)-(a.rating||0))[0];
 const q2={id:'LOCKER_ROOM',title:'INSIDE THE LOCKER ROOM',
   text:qb?'How are you handling '+qb.name+' and the leadership group?':
     'What is the message to the locker room this week?',
   playerId:qb?.id??null,
   options:[
     {id:'support',text:'We stand behind our players, publicly and privately.'},
     {id:'challenge',text:'Elite performances require higher standards.'},
     {id:'discipline',text:'Everyone has to earn their place on the field.'}]
 };
 const injured=s.players.filter(p=>p.team===s.team&&Number(p.injury||0)>0)
   .sort((a,b)=>(b.injury||0)-(a.injury||0))[0];
 const q3={id:'NEXT_WEEK',title:injured?'MEDICAL UPDATE':'THE LONG-TERM PLAN',
   text:injured?'Supporters want an update on '+injured.name+
     '. How much can you reveal about the recovery?':
     'The fan base wants a clear plan. What should they expect?',
   playerId:injured?.id??null,
   options:injured?[
     {id:'protect',text:'We will protect player privacy and prioritize health.'},
     {id:'transparency',text:'We will share medically confirmed updates.'},
     {id:'deflect',text:'The injury questions have become a distraction.'}]:[
     {id:'transparency',text:'We will be clear about our goals and progress.'},
     {id:'confidence',text:'The championship standard is the expectation.'},
     {id:'protect',text:'We will stay disciplined and develop the squad.'}]
 };
 return [base,q2,q3].slice(0,CONFIG.press.questions);
}
function openConference(s,week=s.week){
 const d=pressStore(s),key=s.year+':'+week;
 if(d.active?.key===key)return d.active;
 const complete=d.history.find(h=>h.key===key);
 if(complete)return complete;
 if(d.processed.includes(key))return null;
 const game=teamGame(s,week);
 const meeting={key,year:s.year,week,opponent:game?(game.a===s.team?game.b:game.a):null,
   result:game?((game.sa>game.sb?game.a:game.b)===s.team?'W':'L'):'BYE',
   questions:questionSet(s,game),answers:[],completed:false};
 d.active=meeting;d.processed.push(key);
 return meeting;
}
function afterWeek(s){
 if(s.week>18)return null;
 return openConference(s,s.week);
}
function respond(s,questionId,choiceId){
 const d=pressStore(s),meeting=d.active;
 if(!meeting||meeting.completed)return {ok:false,error:'No active conference'};
 const next=meeting.questions[meeting.answers.length];
 if(!next||next.id!==questionId)return {ok:false,error:'Questions must be answered in order'};
 const choice=next.options.find(o=>o.id===choiceId),impact=CONFIG.press.choices[choiceId];
 if(!choice||!impact)return {ok:false,error:'Invalid answer'};
 const owner=root.GMOwner?.init(s)||s.ownerFranchise;
 if(owner){
   owner.fanHappiness=clamp((owner.fanHappiness??65)+impact.fan,0,CONFIG.press.maxFan);
   owner.mediaHeat=clamp((owner.mediaHeat??25)+impact.media,0,CONFIG.press.maxMedia);
   owner.jobSecurity=clamp((owner.jobSecurity??70)+impact.security,0,CONFIG.press.maxSecurity);
 }
 if(next.playerId!=null){
   const p=s.players.find(p=>String(p.id)===String(next.playerId)&&p.team===s.team);
   if(p)p.morale=clamp((p.morale??65)+impact.morale,0,100);
 }
 meeting.answers.push({questionId,choiceId,statement:choice.text,impact:{...impact}});
 if(meeting.answers.length===meeting.questions.length){
   meeting.completed=true;
   d.history.unshift(meeting);d.history.length=Math.min(d.history.length,CONFIG.press.archive);
   d.active=null;
   s.expansion??={};
   s.expansion.press=(Number(s.expansion.press)||0)+1;
   s.expansion.achievements??=[];
   if(!s.expansion.achievements.includes('Meet the Press'))s.expansion.achievements.push('Meet the Press');
   s.news?.unshift('PRESS ROOM: Head coach answered '+meeting.answers.length+
     ' questions after Week '+meeting.week+'.');
 }
 return {ok:true,completed:meeting.completed,impact};
}
function pressPage(s){
 const d=pressStore(s),meeting=d.active,owner=s.ownerFranchise;
 const summary='<div class="gm-p7-metrics"><div><small>FAN HAPPINESS</small><strong>'+
   Math.round(owner?.fanHappiness??65)+'%</strong></div><div><small>MEDIA HEAT</small><strong>'+
   Math.round(owner?.mediaHeat??25)+'%</strong></div><div><small>JOB SECURITY</small><strong>'+
   Math.round(owner?.jobSecurity??70)+'%</strong></div></div>';
 const active=meeting?(()=>{
   const q=meeting.questions[meeting.answers.length];
   return '<div class="gm-p7-conference"><div class="gm-p7-eyebrow">LIVE PRESS CONFERENCE · '+
     meeting.year+' / WEEK '+meeting.week+'</div>'+
     '<div class="gm-p7-step">QUESTION '+(meeting.answers.length+1)+
     ' OF '+meeting.questions.length+'</div><h2>'+escape(q.title)+'</h2><p class="gm-p7-question">'+
     escape(q.text)+'</p><div class="gm-p7-responses">'+
     q.options.map(o=>{const effect=CONFIG.press.choices[o.id];
       return '<button class="gm-p7-answer" type="button" onclick="gmPressAnswer(\''+
         q.id+'\',\''+o.id+'\')"><span>'+escape(o.text)+'</span><small>'+
         'Fans '+changeLabel(effect.fan)+' · Media '+changeLabel(effect.media)+
         ' · Security '+changeLabel(effect.security)+'</small></button>';
     }).join('')+'</div></div>';
 })(): '<div class="gm-p7-empty"><div class="gm-p7-emblem">🎙</div><h2>THE MICROPHONES ARE OFF</h2>'+
   '<p>Simulate the next game week to unlock your next three-question conference.'+
   (d.history.length?' Your latest conference is archived below.':'')+'</p></div>';
 return '<section class="gm-p7"><div class="gm-p7-hero"><div class="gm-p7-eyebrow">GRIDIRON NETWORK • MEDIA ROOM</div>'+
   '<h1>THE PRESS ROOM</h1><p>Every answer matters. Shape supporters’ confidence, media pressure and locker-room morale.</p></div>'+
   summary+active+'<h2 class="gm-p7-heading">CONFERENCE ARCHIVE</h2>'+
   (d.history.slice(0,8).map(m=>'<div class="gm-p7-archive"><b>'+m.year+' • WEEK '+m.week+
     ' • '+escape(m.result)+'</b>'+m.answers.map(a=>'<p>“'+escape(a.statement)+'”</p>').join('')+
     '</div>').join('')||'<div class="card">No press conferences completed yet.</div>')+
   '</section>';
}
function status(p){
 if(p.rosterStatus==='IR'||p.rosterStatus==='PUP')return p.rosterStatus;
 if((p.injury||0)>CONFIG.health.returningWeeks)return 'OUT';
 if((p.injury||0)>CONFIG.health.questionableWeeks)return 'DOUBTFUL';
 if((p.injury||0)>0)return 'QUESTIONABLE';
 return 'AVAILABLE';
}
function depthData(s,pos){
 return root.GMRosterRules?.depth(s,s.team,pos)||
   s.players.filter(p=>p.team===s.team&&p.pos===pos).sort((a,b)=>b.rating-a.rating);
}
function setStarter(s,pos,id){
 if(!Object.values(CONFIG.depth.positionGroups).flat().includes(pos))
   return {ok:false,error:'Unknown position'};
 const all=s.players.filter(p=>p.team===s.team&&p.pos===pos);
 const selected=all.find(p=>String(p.id)===String(id));
 if(!selected||selected.rosterStatus==='IR'||selected.rosterStatus==='PUP'||
   selected.rosterStatus==='PRACTICE'||Number(selected.injury||0)>0)
   return {ok:false,error:'Choose a healthy active player'};
 const ordered=[selected.id,...all.filter(p=>p!==selected).sort((a,b)=>b.rating-a.rating).map(p=>p.id)];
 // Keep the rest of the existing depth order instead of re-sorting unrelated players.
 const prior=s.franchiseSystems?.depthCharts?.[s.team]?.[pos]||[];
 const saved=[String(selected.id),...prior.map(String).filter(id=>id!==String(selected.id))];
 const seen=new Set(saved);
 const complete=[...saved,...ordered.map(String).filter(id=>!seen.has(id))];
 const ids=complete.map(id=>all.find(p=>String(p.id)===id)?.id).filter(id=>id!==undefined);
 if(!root.GMFranchise?.setDepth(s,s.team,pos,ids))return {ok:false,error:'Depth assignment rejected'};
 selected.depthLocked=true;
 for(const p of all)if(p!==selected&&p.depthLocked)p.depthLocked=false;
 return {ok:true,starter:selected.name};
}
function depthPage(s){
 const groups=CONFIG.depth.positionGroups;
 const roster=s.players.filter(p=>p.team===s.team);
 const healthy=roster.filter(p=>Number(p.injury||0)<=0).length;
 return '<section class="gm-p7"><div class="gm-p7-hero"><div class="gm-p7-eyebrow">FRANCHISE OPERATIONS • PLAYER PERSONNEL</div>'+
   '<h1>DEPTH CHART</h1><p>Who takes the field? Set starters and track backup quality, health and availability.</p></div>'+
   '<div class="gm-p7-metrics"><div><small>ROSTERED</small><strong>'+roster.length+'</strong></div>'+
   '<div><small>AVAILABLE</small><strong>'+healthy+'</strong></div>'+
   '<div><small>STARTER POSITIONS</small><strong>'+Object.values(groups).flat().length+'</strong></div></div>'+
   Object.entries(groups).map(([group,positions])=>
     '<h2 class="gm-p7-heading">'+group+' UNIT</h2><div class="gm-p7-position-grid">'+
     positions.map(pos=>{
       const candidates=depthData(s,pos).slice(0,CONFIG.depth.visiblePerPosition);
       return '<article class="gm-p7-unit"><header><strong>'+escape(pos)+'</strong>'+
         '<span>'+candidates.length+' DEPTH</span></header>'+
         (candidates.map((p,i)=>{
           const condition=status(p),available=condition==='AVAILABLE',
             starter=i===0&&available;
           return '<div class="gm-p7-player '+(starter?'gm-p7-starter':'')+'">'+
             '<div class="gm-p7-ovr">'+Math.round(p.rating||0)+'</div>'+
             '<div class="gm-p7-player-name"><b>'+escape(p.name)+'</b><small>'+
             (i===0?'STARTER':'DEPTH '+(i+1))+' • '+escape(condition)+
             ' • '+Math.round(p.fatigue||0)+'% FATIGUE</small></div>'+
             (starter?'<span class="gm-p7-pin">STARTING</span>':
                available?btn('START','gmImmersionStarter(\''+pos+'\',\''+escape(p.id)+'\')',
                  'gm-p7-smallbutton'):'<span class="gm-p7-unavailable">OUT</span>')+
             '</div>';
         }).join('')||'<p class="muted" style="padding:16px">No eligible players at this position</p>')+
         '</article>';
     }).join('')+'</div>'
   ).join('')+'</section>';
}
function injuryPage(s){
 const league=!!root.gmImmersionInjuryAll,players=s.players.filter(p=>p.team>=0&&
   (league||p.team===s.team)&&((p.injury||0)>0||['IR','PUP'].includes(p.rosterStatus)));
 const counts={OUT:0,DOUBTFUL:0,QUESTIONABLE:0,IR:0,PUP:0};
 for(const p of players)counts[status(p)]=(counts[status(p)]||0)+1;
 return '<section class="gm-p7"><div class="gm-p7-hero"><div class="gm-p7-eyebrow">FRANCHISE MEDICAL • WEEK '+
   s.week+'</div><h1>INJURY REPORT</h1>'+
   '<p>Player availability, diagnoses, rehabilitation and return-to-play decisions in one view.</p></div>'+
   '<div class="gm-p7-metrics">'+
   [['OUT',counts.OUT+counts.IR+counts.PUP],['DOUBTFUL',counts.DOUBTFUL],
    ['QUESTIONABLE',counts.QUESTIONABLE]].map(([k,v])=>
     '<div><small>'+k+'</small><strong>'+v+'</strong></div>').join('')+
   '</div><div class="gm-p7-toolbar">'+
   btn('MY FRANCHISE','gmImmersionInjuryScope(false)',!league?'gm-p7-selected':'')+
   btn('ENTIRE LEAGUE','gmImmersionInjuryScope(true)',league?'gm-p7-selected':'')+
   '</div>'+
   (players.sort((a,b)=>(b.injury||0)-(a.injury||0)).map(p=>{
     const active=p.medical?.active,condition=status(p);
     const risk=Number(active?.risk||p.medical?.chronicRisk||0)*100;
     return '<article class="gm-p7-medical"><div class="gm-p7-medical-lead">'+
       '<div><div class="gm-p7-eyebrow">'+escape(root.TEAMS?.[p.team]?.[0]||'FA')+
       ' • '+escape(p.pos)+'</div><h3>'+escape(p.name)+'</h3><p>'+
       escape(active?.name||'Injury reported')+' • '+Math.ceil(p.injury||0)+
       ' estimated week(s) remaining</p></div>'+
       '<div class="gm-p7-medical-status gm-p7-'+condition.toLowerCase()+'">'+
       escape(condition)+'</div></div>'+
       '<div class="gm-p7-medical-detail"><span>TREATMENT <b>'+
       escape(active?.treatment||'NOT ASSIGNED')+'</b></span>'+
       '<span>RE-INJURY RISK <b>'+Math.round(risk)+'%</b></span>'+
       '<span>HISTORY <b>'+Number(p.injuryHistory?.length||0)+'</b></span></div>'+
       (p.team===s.team&&active?'<div class="gm-p7-toolbar">'+
         btn('CONSERVATIVE REHAB','gmTreatInjury('+JSON.stringify(p.id)+',\'CONSERVATIVE\')')+
         (root.GMInjuries?.TYPES?.[active.type]?.surgery?
           btn('SURGICAL ROUTE','gmTreatInjury('+JSON.stringify(p.id)+',\'SURGERY\')'):'')+
       '</div>':'')+'</article>';
   }).join('')||'<div class="gm-p7-empty"><h2>NO ACTIVE INJURIES</h2>'+
     '<p>Everyone currently listed in this scope is available.</p></div>')+'</section>';
}
function yearReview(s,rec,previous){
 const mine=rec.standings?.find(x=>x.team===rec.team)||{wins:0,losses:0};
 const prior=previous?.standings?.find(x=>x.team===rec.team);
 const diff=prior?mine.wins-prior.wins:null;
 const ranking=(rec.standings||[]).slice().sort((a,b)=>b.wins-a.wins||a.losses-b.losses);
 const seed=ranking.findIndex(x=>x.team===rec.team)+1;
 const championship=rec.playoffs?.some(g=>g.round==='Super Bowl'&&
   (g.sa>g.sb?g.a:g.b)===rec.team);
 const playoff=rec.playoffs?.some(g=>g.a===rec.team||g.b===rec.team);
 const winner=rec.playoffs?.find(g=>g.round==='Super Bowl');
 const champion=winner?(winner.sa>winner.sb?winner.a:winner.b):null;
 const allPro=(rec.allPro||[]).filter(p=>p.team===rec.team);
 const surprises=[];
 if(diff!=null&&diff>=3)surprises.push({
   type:'BREAKOUT SEASON',title:'The franchise takes a leap',
   detail:'Your club improved by '+diff+' win(s) compared with last season.'});
 else if(diff!=null&&diff<=-3)surprises.push({
   type:'THE SETBACK',title:'A challenging year',
   detail:'Your club won '+Math.abs(diff)+' fewer games than a season ago.'});
 if(champion!=null)surprises.push({
   type:'CHAMPIONSHIP STORY',title:name(champion)+' reaches the summit',
   detail:'The league title was decided in the championship game.'});
 if(rec.leaders?.length){
   const leaders=rec.leaders.flatMap(group=>group.leaders.slice(0,1).map(p=>({
     type:'STATEMENT SEASON',title:p.name+' sets the pace',
     detail:p.value+' '+group.label.toLowerCase()+' for '+name(p.team)+'.'})));
   surprises.push(...leaders.slice(0,CONFIG.year.maxSurprises));
 }
 const trajectory=championship?'DYNASTY BUILDING':
   diff!=null&&diff>=3?'ON THE RISE':diff!=null&&diff<=-3?'RETOOLING':
   playoff?'PLAYOFF CONTENDER':mine.wins>=10?'KNOCKING ON THE DOOR':'REBUILDING';
 const headline=championship?'The championship belongs to '+name(rec.team)+'.':
   playoff?'Postseason football returns to '+name(rec.team)+'.':
   diff!=null&&diff>=3?'A new era is emerging in '+name(rec.team)+'.':
   'The work continues for '+name(rec.team)+'.';
 return {year:rec.year,record:mine.wins+'–'+mine.losses,priorWins:prior?.wins??null,
   winsChange:diff,leagueRank:seed,championship,playoff,allPro:allPro.length,
   trajectory,headline,surprises:surprises.slice(0,CONFIG.year.maxSurprises)};
}
function yearPage(s,selected){
 const recaps=s.seasonRecaps||[];
 const r=recaps.find(x=>x.year===Number(selected))||recaps[0];
 if(!r)return '<section class="gm-p7"><div class="gm-p7-hero"><h1>YEAR IN REVIEW</h1>'+
   '<p>Your championship-era yearbook will be available after the first completed season.</p></div></section>';
 const i=recaps.indexOf(r),previous=recaps[i+1],review=r.yearInReview||yearReview(s,r,previous);
 const winner=r.playoffs?.find(x=>x.round==='Super Bowl');
 const mvp=(r.awards||[]).find(a=>a.year===r.year)?.mvp||'—';
 const honors=(r.allPro||[]).filter(p=>p.team===r.team);
 return '<section class="gm-p7"><div class="gm-p7-year-hero"><div class="gm-p7-eyebrow">THE GRIDIRON YEARBOOK</div>'+
   '<div class="gm-p7-year-number">'+r.year+'</div><h1>YEAR IN REVIEW</h1><p>'+
   escape(review.headline)+'</p><div class="gm-p7-year-badge">'+escape(review.trajectory)+'</div></div>'+
   '<div class="gm-p7-toolbar gm-p7-year-switch">'+
   recaps.slice(0,8).map(x=>btn(String(x.year),'gmImmersionYear('+x.year+')',
     (x.year===r.year?'gm-p7-selected':''))).join('')+'</div>'+
   '<div class="gm-p7-metrics"><div><small>SEASON RECORD</small><strong>'+
   escape(review.record)+'</strong></div><div><small>LEAGUE RANK</small><strong>#'+
   review.leagueRank+'</strong></div><div><small>ALL-PRO SELECTIONS</small><strong>'+
   review.allPro+'</strong></div></div>'+
   '<h2 class="gm-p7-heading">THE SEASON AT A GLANCE</h2>'+
   '<div class="gm-p7-review-grid">'+
   '<article class="gm-p7-review-card"><div class="gm-p7-eyebrow">FRANCHISE TRAJECTORY</div>'+
   '<h2>'+escape(review.trajectory)+'</h2><p>'+
   (review.winsChange==null?'First season on the yearbook.':
     (review.winsChange>=0?'+':'')+review.winsChange+' wins versus the prior year.')+
   '</p></article>'+
   '<article class="gm-p7-review-card"><div class="gm-p7-eyebrow">CHAMPIONSHIP RESULT</div>'+
   '<h2>'+escape(winner?name(winner.sa>winner.sb?winner.a:winner.b):'No result')+'</h2>'+
   '<p>'+escape(winner?name(winner.a)+' '+winner.sa+' — '+winner.sb+' '+
     name(winner.b):'No championship game recorded')+'</p></article></div>'+
   '<h2 class="gm-p7-heading">THE BIGGEST STORIES</h2>'+
   (review.surprises.map(x=>'<div class="gm-p7-story"><small>'+escape(x.type)+
     '</small><h3>'+escape(x.title)+'</h3><p>'+escape(x.detail)+'</p></div>').join('')||
     '<div class="card">No major statistical storylines recorded this season.</div>')+
   '<h2 class="gm-p7-heading">HONORS & AWARDS</h2>'+
   '<div class="gm-p7-review-grid"><div class="gm-p7-review-card"><small>LEAGUE MVP</small><h2>'+
     escape(mvp)+'</h2></div><div class="gm-p7-review-card"><small>YOUR ALL-PRO PLAYERS</small><h2>'+
     honors.length+'</h2><p>'+escape(honors.map(p=>p.name).join(' · ')||'No selections')+'</p></div></div>'+
   '<h2 class="gm-p7-heading">POSTSEASON JOURNEY</h2>'+
   (r.playoffs||[]).filter(g=>g.a===r.team||g.b===r.team||g.round==='Super Bowl').map(g=>
     '<div class="gm-p7-playoff"><span>'+escape(g.round)+'</span><b>'+
      escape(name(g.a))+' '+g.sa+' — '+g.sb+' '+escape(name(g.b))+'</b></div>'
   ).join('')+
   '<h2 class="gm-p7-heading">STAT LEADERS</h2><div class="gm-p7-review-grid">'+
   (r.leaders||[]).map(l=>'<div class="gm-p7-review-card"><small>'+escape(l.label)+'</small><h3>'+
     escape(l.leaders?.[0]?.name||'—')+'</h3><p>'+
     (l.leaders?.[0]?.value??0)+' · '+escape(l.leaders?.[0]?name(l.leaders[0].team):'')+
     '</p></div>').join('')+'</div>'+
   '<h2 class="gm-p7-heading">THE YEAR IN HEADLINES</h2>'+
   (r.leagueStories||[]).slice(0,6).map(x=>'<div class="gm-p7-story"><small>'+
     escape(x.kind)+'</small><p>'+escape(x.message)+'</p></div>').join('')+
   '</section>';
}
const api={CONFIG,pressStore,openConference,afterWeek,respond,pressPage,
 status,depthData,setStarter,depthPage,injuryPage,yearReview,yearPage};
root.GMImmersion=api;root.Gridiron?.register?.('presentationImmersion',api);
root.gmPressAnswer=(question,choice)=>{const result=respond(state,question,choice);
 if(!result.ok)alert(result.error);else{save();render()}};
root.gmImmersionStarter=(pos,id)=>{const result=setStarter(state,pos,id);
 if(!result.ok)alert(result.error);else{save();render()}};
root.gmImmersionInjuryAll=false;
root.gmImmersionInjuryScope=all=>{root.gmImmersionInjuryAll=!!all;render()};
root.gmImmersionYear=year=>{root.gmImmersionSelectedYear=year;render()};
root.pressConference=()=>{page='Press Room';render()};
const previousRender=render;
render=function(){
 if(page==='Press Room'||page==='Depth Chart'||page==='Injury Report'||
    page==='Season Recaps'){
   root.GMRelocation?.applyTeamIdentity(state);
   nav();$('mobileSeason').textContent=state.year+' W'+state.week;
   $('app').innerHTML=page==='Press Room'?pressPage(state):
     page==='Depth Chart'?depthPage(state):
     page==='Injury Report'?injuryPage(state):
     yearPage(state,root.gmImmersionSelectedYear);
   return;
 }
 previousRender();
};
})(window);