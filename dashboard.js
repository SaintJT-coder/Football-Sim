/* Franchise Command Center — original UI inspired by football management dashboards. */
(function(){
const style=document.createElement('style');style.textContent=`
:root{--gm-lime:#d7ff35;--gm-teal:#11c9c3;--gm-dark:#090e15}
.main:has(.command-center){max-width:none;padding:20px 24px 45px;background:radial-gradient(ellipse at 80% 0%,#132334 0%,#090e15 58%);min-height:100vh}
.command-center{color:#f3f7f8;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.cc-kicker{color:var(--gm-lime);font-weight:950;letter-spacing:4px;font-size:12px}
.cc-title{font-size:clamp(28px,3.4vw,52px);line-height:1.03;font-weight:950;letter-spacing:-2px;text-transform:uppercase;font-style:italic;margin:8px 0 18px}
.cc-top{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}
.cc-tabs{display:flex;gap:6px;overflow:auto;padding-bottom:12px}.cc-tabs button{border-radius:0;background:transparent;border-bottom:3px solid transparent;color:#a3afbb;font-weight:850;letter-spacing:1px}.cc-tabs button.active{border-color:var(--gm-lime);color:white}
.cc-timeline{display:flex;gap:8px;overflow-x:auto;padding:14px 0 19px;border-top:1px solid #34414d;scrollbar-width:thin}
.cc-week{min-width:112px;background:#111c28;border:1px solid #263645;padding:11px;border-radius:3px;text-align:left;color:#d7e0e9}.cc-week b{display:block;font-size:16px}.cc-week span{font-size:11px;color:#a4b2c0}.cc-week.now{border-bottom:4px solid var(--gm-lime);background:#1b2c36}
.cc-layout{display:grid;grid-template-columns:minmax(175px,.82fr) minmax(0,2.5fr) minmax(205px,1fr);gap:13px;align-items:start}
.cc-panel{background:linear-gradient(150deg,#152332,#0d151e);border:1px solid #263541;padding:16px;min-width:0}
.cc-panel h3,.cc-section{margin:0 0 13px;font-size:17px;font-weight:950;text-transform:uppercase;font-style:italic}
.cc-section{border-bottom:2px solid #c6ed32;padding-bottom:9px}
.cc-activity{display:block;width:100%;text-align:left;background:transparent;border-radius:0;border-bottom:1px solid #24313c;padding:12px 4px;font-weight:800;font-size:12px;letter-spacing:.2px;color:#e7eef3}
.cc-activity:hover{color:var(--gm-lime);background:#1d3035}
.cc-alert{color:var(--gm-lime);float:right}
.cc-hero{background:linear-gradient(115deg,var(--cc-team,#087d8d),#0b2632 70%);border:1px solid #477a81;position:relative;overflow:hidden;min-height:230px;padding:23px}
.cc-hero:after{content:"";position:absolute;width:230px;height:230px;border:30px solid #ffffff12;transform:rotate(35deg);right:-75px;top:10px;border-radius:40px;pointer-events:none}
.cc-hero-name{font-size:clamp(24px,3vw,42px);font-weight:950;font-style:italic;text-transform:uppercase;line-height:1}
.cc-hero-stats{display:flex;flex-wrap:wrap;gap:18px;margin:22px 0}.cc-gauge{width:68px;height:68px;border-radius:50%;background:conic-gradient(var(--gm-lime) calc(var(--score)*1%),#24414a 0);display:grid;place-items:center;position:relative;font-weight:950;font-size:23px}.cc-gauge:before{content:"";position:absolute;inset:7px;background:#13313c;border-radius:50%}.cc-gauge span{z-index:1}.cc-gauge-label{text-align:center;font-size:11px;color:#e7f5f8;margin-top:6px}
.cc-info{display:flex;gap:22px;flex-wrap:wrap;font-size:12px}.cc-info b{display:block;font-size:18px;color:white}
.cc-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:12px;margin-top:12px}
.cc-table{width:100%;border-collapse:collapse;font-size:12px}.cc-table td{padding:8px 2px;border-bottom:1px solid #293746}.cc-table td:last-child{text-align:right;font-weight:800}
.cc-ranking{color:var(--gm-lime);font-weight:900}
.cc-goal{padding:13px 0;border-bottom:1px solid #293746;font-size:12px}.cc-goal strong{display:block;margin-bottom:6px}.cc-goal .progress{margin-top:8px}.cc-goal .progress i{background:var(--gm-lime)}
.cc-main-action{background:var(--gm-lime);color:#111c15;border-radius:3px;font-weight:950;width:100%;padding:15px;margin-top:14px;text-transform:uppercase}
.cc-mini{font-size:11px;color:#a3b1be}.cc-badge{display:inline-block;background:#d7ff35;color:#0e1d1e;padding:5px 8px;font-size:11px;font-weight:950;margin-bottom:12px}
.cc-next{font-size:19px;font-weight:900}.cc-matchup{display:grid;grid-template-columns:1fr auto 1fr;gap:9px;align-items:center;text-align:center;margin:15px 0}.cc-matchup strong{font-size:22px}.cc-matchup em{color:var(--gm-lime);font-style:normal;font-weight:950}
.cc-spotlight{display:flex;align-items:center;gap:13px}.cc-avatar{width:54px;height:54px;background:#183b42;border-radius:50%;display:grid;place-items:center;font-size:25px}
.cc-note{color:#b8c8d1;font-size:12px;line-height:1.6}
@media(max-width:1200px){.cc-layout{grid-template-columns:minmax(0,1fr) minmax(0,2fr)}.cc-right{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cc-right .cc-panel{min-width:0}}
@media(max-width:700px){.main:has(.command-center){padding:15px 12px}.cc-layout{grid-template-columns:minmax(0,1fr)}.cc-right{grid-column:auto;display:block}.cc-right .cc-panel{margin-bottom:12px}.cc-grid{grid-template-columns:1fr}.cc-hero{min-height:0}.cc-title{letter-spacing:-1px}.cc-top{align-items:start}.cc-gauge{width:58px;height:58px;font-size:19px}.cc-week{min-width:102px}.cc-activity{padding:11px}.cc-info{gap:12px}}
`;document.head.appendChild(style);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avg=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:0;
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const goto=(name)=>{const i=pages.indexOf(name);if(i>=0)go(i);else {const j=extraPages.indexOf(name);if(j>=0)goExtra(j)}};
window.commandGo=goto;
let activeSection='HOME';
window.commandTab=(s)=>{activeSection=s;render()};
function activity(label,page,flag){return '<button class="cc-activity" onclick="commandGo(\''+page+'\')">'+safe(label)+(flag?'<span class="cc-alert">●</span>':'')+'</button>'}
function gauge(n,label){return '<div><div class="cc-gauge" style="--score:'+clip(Math.round(n),0,99)+'"><span>'+Math.round(n)+'</span></div><div class="cc-gauge-label">'+label+'</div></div>'}
function panel(title,content,extra=''){return '<section class="cc-panel '+extra+'"><h3>'+title+'</h3>'+content+'</section>'}
function getGoals(){
 const rec=record(state.team),e=extraStore(),r=roster(),week=state.week;
 return [{name:'Win 9 regular-season games',progress:rec.w,total:9},{name:'Develop three young players',progress:r.filter(p=>p.age<=25&&p.rating>=78).length,total:3},{name:'Maintain positive cap space',progress:capspace()>=0?1:0,total:1},{name:'Keep job security above 70',progress:e.jobSecurity||0,total:70}];
}
function commandDashboard(){
 const team=TEAMS[state.team],rec=record(state.team),r=roster(),f=state.frontOffice||{},e=extraStore(),eng=state.engine||{};
 const week=state.week,upcoming=(eng.schedule||[]).find(g=>g.week===week&&(g.a===state.team||g.b===state.team));
 const opponent=upcoming?(upcoming.a===state.team?upcoming.b:upcoming.a):null,home=upcoming?.a===state.team;
 const strengths={off:avg(r.filter(p=>['QB','RB','WR','TE','OL'].includes(p.pos)).map(p=>p.rating)),def:avg(r.filter(p=>['DL','LB','CB','S'].includes(p.pos)).map(p=>p.rating))};
 const overall=avg([strengths.off,strengths.def]),scout=state.upgrades?.scoutPoints??20;
 const timeline=Array.from({length:5},(_,i)=>{let w=clip(week+i-1,1,18),g=(eng.schedule||[]).find(x=>x.week===w&&(x.a===state.team||x.b===state.team)),opp=g?(g.a===state.team?g.b:g.a):null,done=state.results.find(x=>x.year===state.year&&x.week===w&&(x.a===state.team||x.b===state.team));return '<button class="cc-week '+(w===week?'now':'')+'" onclick="commandGo(\'Schedule\')"><b>WEEK '+w+'</b><span>'+(opp!==null?safe(TEAMS[opp][0]):'BYE')+' · '+(done?'FINAL '+(done.a===state.team?done.sa:done.sb)+'-'+(done.a===state.team?done.sb:done.sa):g?.a===state.team?'HOME':'AWAY')+'</span></button>'}).join('');
 const needs=[...POS].map(pos=>{let players=r.filter(p=>p.pos===pos),best=Math.max(0,...players.map(p=>p.rating)),wanted={QB:2,RB:3,WR:5,TE:2,OL:5,DL:4,LB:4,CB:4,S:3,K:1}[pos];return {pos,count:players.length,need:clip((wanted-players.length)*12+Math.max(0,80-best),0,100)}}).sort((a,b)=>b.need-a.need).slice(0,3);
 const top=r.slice().sort((a,b)=>b.rating-a.rating)[0],topProspects=(f.prospects||[]).filter(p=>!p.drafted).sort((a,b)=>b.projection-a.projection).slice(0,3);
 const division=TEAMS.map((t,i)=>({i,rec:record(i)})).filter(x=>TEAMS[x.i][2]===team[2]).sort((a,b)=>b.rec.w-a.rec.w||a.rec.l-b.rec.l);
 const activities=activeSection==='HOME'?[['PLAY / SIMULATE WEEK','Schedule',true],['VIEW PLAYOFF PICTURE','Playoff Picture',false],['SCOUT COLLEGE PLAYERS','Scouting',scout>0],['DRAFT CENTRAL','Fantasy Draft',false],['MANAGE STAFF','Staff & Owner',false],['PLAYER NEGOTIATIONS','Re-sign & Tags',false],['TRADE NEGOTIATIONS','Trade Center',false],['WEEKLY TRAINING','Training',false],['INJURY REPORT','Injury Report',r.some(p=>p.injury>0)],['MANAGE ROSTER','Roster',false],['ADVANCE WEEK','Schedule',false]]:activeSection==='NEWS'?[['LEAGUE HEADLINES','News & Rankings',true],['SOCIAL MEDIA','Social Media',false],['LEAGUE LEADERS','League Leaders',false],['AWARDS','Awards',false]]:activeSection==='LEAGUE'?[['STANDINGS','Standings',false],['PLAYOFF PICTURE','Playoff Picture',false],['SCHEDULE','Schedule',false],['DRAFT BOARD','Draft Board',false],['LEAGUE HISTORY','League History',false],['HALL OF FAME','Hall of Fame',false]]:[['FRONT OFFICE','Front Office',false],['SALARY CAP','Salary Cap',false],['TEAM FINANCES','Finances',false],['PLAYBOOK STUDIO','Playbook Studio',false],['DEPTH CHART','Depth Chart',false]];
 const goalMarkup=getGoals().map(g=>'<div class="cc-goal"><strong>'+safe(g.name)+'</strong><span class="cc-mini">'+g.progress+' / '+g.total+'</span><div class="progress"><i style="width:'+clip(g.progress/g.total*100,0,100)+'%"></i></div></div>').join('');
 return '<div class="command-center"><div class="cc-top"><div><div class="cc-kicker">GRIDIRON GM / FRANCHISE COMMAND</div><h1 class="cc-title">'+safe(team[1])+' · '+(week>18?'OFFSEASON':'WEEK '+week)+'</h1></div><div class="cc-mini">SEASON '+state.year+' · '+safe(team[2])+'<br>COACH SECURITY '+(e.jobSecurity||60)+'% · SCOUT POINTS '+scout+'</div></div>'
 +'<div class="cc-tabs">'+['HOME','NEWS','LEAGUE','OPTIONS'].map(x=>'<button class="'+(activeSection===x?'active':'')+'" onclick="commandTab(\''+x+'\')">'+x+'</button>').join('')+'</div>'
 +'<div class="cc-timeline">'+timeline+'</div>'
 +'<div class="cc-layout"><aside>'+panel('Activities',activities.map(x=>activity(...x)).join(''))+'</aside>'
 +'<div><div class="cc-hero" style="--cc-team:'+(state.primaryColor||'#0b7b87')+'"><div class="cc-hero-name">'+safe(team[1])+'</div><div class="cc-info"><div>AVAILABLE CAP<b>'+money(capspace())+'</b></div><div>ACTIVE ROSTER<b>'+r.length+' PLAYERS</b></div><div>SEASON RECORD<b>'+rec.w+'-'+rec.l+'</b></div></div><div class="cc-hero-stats">'+gauge(strengths.off,'OFFENSE')+gauge(strengths.def,'DEFENSE')+gauge(overall,'OVERALL')+'</div><div class="cc-mini">TOP TEAM NEEDS: '+needs.map(n=>n.pos+' ('+n.count+' ACTIVE)').join(' · ')+'</div></div>'
 +'<div class="cc-grid">'+panel('My Team Ranks','<table class="cc-table">'+[['OFFENSE OVR',strengths.off],['DEFENSE OVR',strengths.def],['TEAM OVR',overall],['PLAYER MORALE',avg(r.map(p=>p.morale||65))],['CONDITION',100-avg(r.map(p=>p.fatigue||0))]].map(x=>'<tr><td>'+x[0]+'</td><td>'+Math.round(x[1])+'</td></tr>').join('')+'</table>')
 +panel('Division Standings','<table class="cc-table">'+division.map((x,i)=>'<tr><td><span class="cc-ranking">'+(i+1)+'.</span> '+safe(TEAMS[x.i][0])+'</td><td>'+x.rec.w+'-'+x.rec.l+'</td></tr>').join('')+'</table><button class="cc-activity" onclick="commandGo(\'Standings\')">VIEW FULL STANDINGS ›</button>')+'</div>'
 +'<div class="cc-grid">'+panel('Top Player',top?'<div class="cc-spotlight"><div class="cc-avatar">🏈</div><div><b>'+safe(top.name)+'</b><div class="cc-mini">'+top.pos+' · '+top.rating+' OVR · '+top.age+' YEARS</div></div></div><p class="cc-note">Potential '+top.pot+' · '+(top.injury?'Injured '+top.injury+' weeks':'Available')+'</p><button class="cc-activity" onclick="commandGo(\'Roster\')">VIEW ROSTER ›</button>':'No players')
 +panel('Draft Central','<div class="cc-mini">TOP AVAILABLE PROSPECTS</div>'+topProspects.map(p=>'<div class="cc-goal"><b>'+safe(p.name)+'</b><div class="cc-mini">'+p.pos+' · PROJECTED '+p.projection+'</div></div>').join('')+'<button class="cc-activity" onclick="commandGo(\'Scouting\')">OPEN SCOUTING ›</button>')+'</div></div>'
 +'<aside class="cc-right">'+panel('Next Matchup','<div class="cc-badge">'+(week>18?'OFFSEASON':'WEEK '+week)+'</div>'+(opponent!==null?'<div class="cc-matchup"><strong>'+safe(team[0])+'</strong><em>VS</em><strong>'+safe(TEAMS[opponent][0])+'</strong></div><p class="cc-mini">'+(home?'HOME':'AWAY')+' · '+safe(TEAMS[opponent][1])+'</p>':'<p class="cc-next">Season complete</p>')+'<button class="cc-main-action" onclick="simulate()">'+(week>18?'ADVANCE TO NEXT SEASON':'SIMULATE WEEK '+week)+'</button>')
 +panel('Coach & Owner Goals',goalMarkup+'<button class="cc-activity" onclick="commandGo(\'Staff & Owner\')">VIEW STAFF & GOALS ›</button>')
 +panel('League Headlines',(state.news||[]).slice(0,4).map(n=>'<p class="cc-note">'+safe(typeof n==='string'?n:JSON.stringify(n))+'</p>').join('')+'<button class="cc-activity" onclick="commandGo(\'News & Rankings\')">MORE HEADLINES ›</button>')
 +panel('Quick Management','<button class="cc-activity" onclick="commandGo(\'Trade Center\')">TRADE CENTER ›</button><button class="cc-activity" onclick="commandGo(\'Salary Cap\')">SALARY CAP ›</button><button class="cc-activity" onclick="commandGo(\'Depth Chart\')">DEPTH CHART ›</button>')+'</aside></div></div>';
}
const oldRender=render;render=function(){if(page==='Dashboard'){if(typeof extraStore==='function')extraStore();if(state.engine&&state.frontOffice){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=commandDashboard();return}}oldRender()};
render();
})();