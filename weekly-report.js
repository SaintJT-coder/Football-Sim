/* Weekly franchise reports: read-only presentation; does not simulate games. */
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function rankings(){return TEAMS.map((t,i)=>{const r=record(i),power=window.GMFranchise?.score(state,i)||{overall:65};return {i,name:t[1],w:r.w,l:r.l,power:power.overall,score:r.w*9-r.l*2+power.overall*.6}}).sort((a,b)=>b.score-a.score)}
function awards(){const ps=state.players||[];const score=p=>(p.stats?.passYards||0)*.08+(p.stats?.passTD||0)*8-(p.stats?.interceptions||0)*6+(p.stats?.rushYards||0)*.11+(p.stats?.receivingYards||0)*.09+(p.stats?.td||0)*3;return {mvp:ps.filter(p=>p.pos==='QB').sort((a,b)=>score(b)-score(a))[0],offense:ps.filter(p=>['RB','WR','TE'].includes(p.pos)).sort((a,b)=>score(b)-score(a))[0],defense:ps.filter(p=>['DL','LB','CB','S'].includes(p.pos)).sort((a,b)=>(b.stats?.tackles||0)+(b.stats?.sacks||0)*8-(a.stats?.tackles||0)-(a.stats?.sacks||0)*8)[0]}}
function report(){
 const last=state.week-1,results=state.results.filter(g=>g.year===state.year&&g.week===last),ranks=rankings(),watch=awards(),inj=state.players.filter(p=>p.team>=0&&Number(p.injury)>0).slice(0,12);
 return title('League Weekly Report','Power rankings, award watch, results and injury news · '+state.year+' season','LEAGUE INSIDER')
 +'<div class="grid three">'+metric('Week completed',Math.max(0,last))+metric('Games played',results.length)+metric('Injured players',state.players.filter(p=>p.team>=0&&Number(p.injury)>0).length)+'</div>'
 +heading('LATEST SCORES')+'<div class="grid two">'+(results.length?results.map((g,i)=>'<div class="card"><b>'+esc(TEAMS[g.a]?.[0])+' '+g.sa+' — '+esc(TEAMS[g.b]?.[0])+' '+g.sb+'</b><p class="muted small">Week '+g.week+' · Final</p><button onclick="gmBoxScore('+i+')">Box score</button></div>').join(''):'<div class="card">Simulate a week to see results.</div>')+'</div>'
 +heading('POWER RANKINGS')+'<div class="card">'+ranks.map((x,i)=>'<div class="row" style="padding:9px 0;border-bottom:1px solid #29303c"><b>#'+(i+1)+' '+esc(x.name)+'</b><span>'+x.w+'-'+x.l+' · OVR '+x.power+'</span></div>').join('')+'</div>'
 +heading('AWARD WATCH')+'<div class="grid three">'+Object.entries(watch).map(([k,p])=>'<div class="card"><h3>'+({mvp:'MVP',offense:'Offensive Player',defense:'Defensive Player'}[k])+'</h3><b>'+esc(p?.name||'TBD')+'</b><p class="muted">'+esc(p?.pos||'')+'</p></div>').join('')+'</div>'
 +heading('INJURY REPORT')+'<div class="card">'+(inj.length?inj.map(p=>'<p>'+esc(p.name)+' · '+esc(TEAMS[p.team]?.[0])+' · '+p.injury+' weeks</p>').join(''):'No active injuries')+'</div>';
}
window.gmBoxScore=i=>{const last=state.week-1,g=state.results.filter(x=>x.year===state.year&&x.week===last)[i];if(!g)return;const r=g.report;const content=r?'<p>'+esc(r.summary)+'</p><p>Weather: '+esc(r.weather)+'</p><table class="table"><tr><th>Stat</th><th>'+esc(TEAMS[g.a][0])+'</th><th>'+esc(TEAMS[g.b][0])+'</th></tr>'+[['Points',g.sa,g.sb],['Total yards',r.teams[0]?.totalYards,r.teams[1]?.totalYards],['Pass yards',r.teams[0]?.passYards,r.teams[1]?.passYards],['Rush yards',r.teams[0]?.rushYards,r.teams[1]?.rushYards]].map(x=>'<tr><td>'+x[0]+'</td><td>'+x[1]+'</td><td>'+x[2]+'</td></tr>').join('')+'</table><p>Quarter scoring: '+r.quarters.home.join(' / ')+' vs '+r.quarters.away.join(' / ')+'</p>':'<p>This game predates detailed reporting.</p>';const el=document.createElement('div');el.style.cssText='position:fixed;inset:0;z-index:99999;background:#000d;overflow:auto;padding:5vh 5vw';el.innerHTML='<div class="card" style="max-width:760px;margin:auto"><button id="gm-close-box">Close</button><h2>Game Box Score</h2>'+content+'</div>';document.body.appendChild(el);el.querySelector('#gm-close-box').onclick=()=>el.remove()};
const prior=render;
render=function(){if(page==='Weekly Report'){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=report();return}prior()};
if(!pages.includes('Weekly Report'))pages.splice(pages.indexOf('Schedule')+1,0,'Weekly Report');
render();
})();
