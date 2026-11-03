/* Free Agency Negotiation Hub */
(function(){
const css=document.createElement('style');css.textContent=`
.fa-shell{background:radial-gradient(ellipse at 65% 0%,#203148,#080e1b 72%);border:1px solid #34445e;border-radius:12px;padding:19px;color:#f1f6ff}
.fa-title{font-size:clamp(25px,3vw,40px);font-weight:950;font-style:italic;letter-spacing:-1px;margin:0 0 6px}
.fa-tabs{display:flex;gap:5px;overflow-x:auto;border-bottom:1px solid #354660;margin:12px 0 16px}
.fa-tabs button{background:transparent;border:0;border-bottom:3px solid transparent;border-radius:0;color:#abb9cf;white-space:nowrap;font-weight:800;font-size:11px;padding:12px 8px}.fa-tabs button.on{color:#d7ff35;border-color:#d7ff35}
.fa-layout{display:grid;grid-template-columns:minmax(190px,.85fr) minmax(0,2fr);gap:13px}
.fa-box{background:#111b2c;border:1px solid #30405a;padding:13px}
.fa-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:13px}
.fa-metric{background:#1a2940;padding:10px}.fa-metric small{display:block;color:#aabbd2;font-size:10px}.fa-metric b{font-size:20px}
.fa-filter{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0}.fa-filter button{font-size:11px;padding:7px 9px}
.fa-list{max-height:630px;overflow:auto}.fa-player{width:100%;text-align:left;display:flex;align-items:center;gap:9px;background:#131e30;border:1px solid #293953;margin-bottom:6px;padding:12px 8px;border-radius:3px;color:white}
.fa-player.selected{background:linear-gradient(90deg,#9c1730,#c02d3f);border-color:#e65e66}
.fa-ovr{font-size:20px;font-weight:950;min-width:36px}.fa-player-name{font-weight:900;font-size:13px}.fa-player-meta{font-size:10px;color:#becbdc}
.fa-head{display:flex;gap:16px;justify-content:space-between;align-items:center;border-bottom:1px solid #33435a;padding-bottom:15px}
.fa-head .fa-ovr{font-size:58px}.fa-name{font-size:clamp(20px,3vw,32px);font-weight:950}.fa-tag{color:#d7ff35;font-size:11px;font-weight:850}
.fa-offer-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:13px 0}
.fa-offer-grid .fa-metric b{font-size:17px}
.fa-section{font-size:12px;color:#a9c7e2;font-weight:950;border-bottom:1px solid #46627e;margin:14px 0 9px;padding-bottom:7px}
.fa-bars{display:grid;gap:9px}.fa-bar{display:grid;grid-template-columns:80px 1fr 48px;align-items:center;gap:9px;font-size:12px}.fa-bar-track{height:9px;background:#27374a;border-radius:2px;overflow:hidden}.fa-bar-track i{display:block;height:100%;background:#67e141}
.fa-bids{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fa-bid{background:#1b2940;padding:10px;border-left:3px solid #d7ff35;font-size:12px}
.fa-inputs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:13px 0}
.fa-inputs label{font-size:11px;color:#b3c6dc}.fa-inputs input{display:block;width:100%;margin-top:5px;background:#091627;color:white;border:1px solid #4d6885;border-radius:4px;padding:10px}
.fa-action{background:#d7ff35;color:#0c1920;font-weight:950;padding:13px;border:0;border-radius:3px;width:100%}
.fa-message{background:#203247;padding:10px;color:#d8e7f7;font-size:12px;margin:10px 0}
@media(max-width:780px){.fa-layout{grid-template-columns:1fr}.fa-list{max-height:235px}.fa-offer-grid{grid-template-columns:repeat(2,1fr)}.fa-metrics{grid-template-columns:repeat(3,1fr)}.fa-inputs{grid-template-columns:1fr 1fr}}
`;document.head.appendChild(css);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function fa(){state.freeAgency??={season:state.year,selected:null,tab:'AVAILABLE',filter:'ALL',sort:'OVR',bids:{},messages:[],week:1,history:[]};let f=state.freeAgency;if(f.season!==state.year){f.season=state.year;f.selected=null;f.tab='AVAILABLE';f.bids={};f.week=1}return f}
function pool(){return state.players.filter(p=>p.team===-1)}
function ensureMarket(){let f=fa();if(f.seeded===state.year)return;f.seeded=state.year;
 // A few established veterans enter the market when the initial fictional league has no free agents.
 if(!pool().length){const candidates=state.players.filter(p=>p.team!==state.team&&p.team>=0&&p.age>=27).sort((a,b)=>a.rating-b.rating).slice(0,12);for(let p of candidates){p.team=-1;p.years=0}}
}
function interest(p){let rating=p.rating,age=p.age;return clamp(Math.round(35+(rating-75)*2+(age<29?10:0)),10,98)}
function target(p){return {salary:+Math.max(.8,p.salary*.95).toFixed(1),bonus:+Math.max(.5,p.salary*.8).toFixed(1),years:clamp(p.age>=32?2:4,1,5)}}
function offerTotal(o){return +(o.salary*o.years+o.bonus).toFixed(1)}
function scoreOffer(p,o){let t=target(p),base=t.salary*t.years+t.bonus,raw=offerTotal(o)/Math.max(1,base),fit=roster().filter(x=>x.pos===p.pos).length,age=p.age;return clamp(Math.round(raw*73+Math.max(0,3-fit)*6+(age>32&&o.years>3?-13:0)),0,100)}
function bids(p){let f=fa(),own=f.bids[p.id],other=TEAMS.map((t,i)=>i).filter(i=>i!==state.team).slice(0,3).map((i,k)=>({team:i,score:clamp(interest(p)-k*11+(p.id%13),25,95),value:+(target(p).salary*(3+(k%2))+(k+1)*2).toFixed(1)}));if(own)other.push({team:state.team,score:own.score,value:offerTotal(own),mine:true});return other.sort((a,b)=>b.score-a.score)}
function select(id){fa().selected=id;save();render()}
function tab(t){fa().tab=t;render()}
function filter(pos){fa().filter=pos;render()}
function bid(id){let p=state.players.find(x=>x.id===id),f=fa();if(!p||p.team!==-1)return;let years=Number(document.getElementById('fa-years')?.value),salary=Number(document.getElementById('fa-salary')?.value),bonus=Number(document.getElementById('fa-bonus')?.value);
 if(!Number.isInteger(years)||years<1||years>5||!Number.isFinite(salary)||salary<=0||!Number.isFinite(bonus)||bonus<0)return notice('Enter valid years, annual salary and bonus');
 if(capspace()<salary+bonus/years)return notice('Not enough salary cap space for salary and prorated signing bonus');
 if(state.cash<bonus)return notice('Insufficient cash to fund signing bonus');
 let offer={years,salary,bonus,score:scoreOffer(p,{years,salary,bonus}),week:f.week};f.bids[id]=offer;f.messages.unshift('Offer submitted to '+p.name+': '+years+' years, $'+salary.toFixed(1)+'M/year, $'+bonus.toFixed(1)+'M bonus');save();render()}
function withdraw(id){let f=fa();delete f.bids[id];f.messages.unshift('Offer withdrawn');save();render()}
function resolve(){let f=fa();f.week++;for(const [id,o] of Object.entries(f.bids)){let p=state.players.find(x=>x.id===Number(id));if(!p||p.team!==-1){delete f.bids[id];continue}let best=bids(p)[0];if(best.mine&&o.score>=65){if(capspace()>=o.salary+o.bonus/Math.max(1,o.years)&&state.cash>=o.bonus){p.team=state.team;p.salary=o.salary;p.years=o.years;state.cash-=o.bonus;f.history.unshift({player:p.name,team:state.team,years:o.years,salary:o.salary,bonus:o.bonus});f.messages.unshift(p.name+' accepted your offer!');state.news.unshift(TEAMS[state.team][1]+' signed '+p.name);delete f.bids[id]}}else if(f.week>=3&&best.score>o.score+10){p.team=best.team;p.salary=+(best.value/4).toFixed(1);p.years=3;f.messages.unshift(p.name+' signed with '+TEAMS[best.team][1]);delete f.bids[id]}}
 save();render()}
function freeAgencyPage(){ensureMarket();let f=fa(),players=pool().filter(p=>f.filter==='ALL'||p.pos===f.filter).sort((a,b)=>b.rating-a.rating),selected=state.players.find(p=>p.id===f.selected&&p.team===-1)||players[0];if(selected)f.selected=selected.id;
 const available=players.filter(p=>f.tab==='AVAILABLE'||f.tab==='MY NEGOTIATIONS'&&f.bids[p.id]||f.tab==='MY SIGNINGS'&&false||f.tab==='LEAGUE SIGNINGS'&&false);
 const tabs=['AVAILABLE','MY NEGOTIATIONS','MY SIGNINGS','LEAGUE SIGNINGS'];
 const t=selected?target(selected):null,offers=selected?bids(selected):[],my=f.bids[selected?.id];
 let side= f.tab==='MY SIGNINGS'||f.tab==='LEAGUE SIGNINGS'?'<div class="fa-list">'+f.history.filter(x=>f.tab==='LEAGUE SIGNINGS'||x.team===state.team).map(x=>'<div class="fa-player">'+esc(x.player)+' · '+esc(TEAMS[x.team][0])+' · '+x.years+'YR · $'+x.salary+'M/YR</div>').join('')+'</div>':'<div class="fa-list">'+available.map(p=>'<button class="fa-player '+(selected?.id===p.id?'selected':'')+'" onclick="faSelect('+p.id+')"><span class="fa-ovr">'+p.rating+'</span><span><span class="fa-player-name">'+esc(p.name)+'</span><br><span class="fa-player-meta">'+p.pos+' · '+p.age+' YEARS · '+p.years+'YR EXP · '+bids(p).length+' OFFERS</span></span></button>').join('')+'</div>';
 let detail=selected?'<div class="fa-head"><div><span class="fa-tag">FREE AGENT · '+esc(selected.pos)+' · '+selected.age+' YEARS</span><div class="fa-name">'+esc(selected.name)+'</div><div class="fa-player-meta">POTENTIAL '+selected.pot+' · '+(selected.injury?'INJURED':'HEALTHY')+'</div></div><div class="fa-ovr">'+selected.rating+'<div class="fa-player-meta">OVERALL</div></div></div>'
 +'<div class="fa-section">YOUR BID / FAIR OFFER</div><div class="fa-offer-grid">'+[['Your offer',my?'$'+offerTotal(my).toFixed(1)+'M':'—'],['Fair total','$'+offerTotal(t).toFixed(1)+'M'],['Fair annual','$'+t.salary.toFixed(1)+'M'],['Fair bonus','$'+t.bonus.toFixed(1)+'M'],['Your cap room',money(capspace())],['Your funds',money(state.cash)]].map(x=>'<div class="fa-metric"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('')+'</div>'
 +'<div class="fa-section">YOUR DEPTH CHART · '+selected.pos+'</div>'+roster().filter(p=>p.pos===selected.pos).sort((a,b)=>b.rating-a.rating).slice(0,3).map(p=>'<div class="fa-player-meta" style="padding:5px">'+esc(p.name)+' · '+p.rating+' OVR · '+money(p.salary)+'</div>').join('')+'<div class="fa-section">TOP BIDS · '+offers.length+' OFFERS</div>'
 +'<div class="fa-bids">'+offers.slice(0,4).map((b,i)=>'<div class="fa-bid"><b>'+(i+1)+'. '+esc(TEAMS[b.team][0])+(b.mine?' (YOU)':'')+'</b><div class="fa-bar-track" style="margin:7px 0"><i style="display:block;width:'+b.score+'%;height:100%;background:#69dd4d"></i></div><span>'+b.score+' PTS · $'+b.value.toFixed(1)+'M</span></div>').join('')+'</div>'
 +'<div class="fa-section">MAKE A CONTRACT OFFER</div><div class="fa-inputs"><label>YEARS (1–5)<input id="fa-years" type="number" min="1" max="5" value="'+(my?.years||t.years)+'"></label><label>ANNUAL SALARY ($M)<input id="fa-salary" type="number" min=".1" step=".1" value="'+(my?.salary||t.salary)+'"></label><label>SIGNING BONUS ($M)<input id="fa-bonus" type="number" min="0" step=".1" value="'+(my?.bonus||t.bonus)+'"></label></div><button class="fa-action" onclick="faBid('+selected.id+')">'+(my?'UPDATE OFFER':'MAKE AN OFFER')+'</button>'+(my?'<button class="fa-activity" onclick="faWithdraw('+selected.id+')">WITHDRAW OFFER</button>':'')
 :'<p>No available players. Advance to the next season to replenish the market.</p>';
 return '<div class="fa-shell"><div class="fa-title">FREE AGENT OFFERS</div><div class="fa-player-meta">FREE AGENCY · OFFER PERIOD '+f.week+' · SIGNINGS ARE PROCESSED WHEN YOU ADVANCE NEGOTIATIONS</div><div class="fa-tabs">'+tabs.map(x=>'<button class="'+(f.tab===x?'on':'')+'" onclick="faTab(\''+x+'\')">'+x+'</button>').join('')+'</div><div class="fa-metrics"><div class="fa-metric"><small>CAP ROOM</small><b>'+money(capspace())+'</b></div><div class="fa-metric"><small>AVAILABLE FUNDS</small><b>'+money(state.cash)+'</b></div><div class="fa-metric"><small>OPEN OFFERS</small><b>'+Object.keys(f.bids).length+'</b></div></div><div class="fa-layout"><aside class="fa-box"><div class="fa-section">TOP FREE AGENTS</div><div class="fa-filter">'+['ALL',...POS].map(x=>'<button class="'+(f.filter===x?'primary':'')+'" onclick="faFilter(\''+x+'\')">'+x+'</button>').join('')+'</div>'+side+'</aside><main class="fa-box">'+detail+'<button class="fa-action" style="margin-top:13px;background:#28bed5" onclick="faAdvance()">ADVANCE NEGOTIATIONS →</button>'+(f.messages.length?'<div class="fa-message">'+esc(f.messages[0])+'</div>':'')+'</main></div></div>'}
const prior=render;render=function(){if(page==='Player Market'){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=freeAgencyPage();return}prior()};
window.faSelect=select;window.faTab=tab;window.faFilter=filter;window.faBid=bid;window.faWithdraw=withdraw;window.faAdvance=resolve;
render();
})();