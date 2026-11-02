/* Dynamic postseason race and visual bracket for the fictional 12-team league. */
(function(){
const css=document.createElement('style');css.textContent=`
.pb-wrap{background:radial-gradient(ellipse at 50% 30%,#122a51,#070d24 72%);border:1px solid #263b69;border-radius:12px;padding:22px;color:#eaf1ff;overflow:hidden}
.pb-heading{text-align:center;font-size:clamp(27px,4vw,45px);font-weight:950;font-style:italic;letter-spacing:-1px;margin:0}
.pb-sub{text-align:center;color:#92a9c7;font-size:12px;margin:8px 0 25px}
.pb-conferences{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.pb-conference{min-width:0}.pb-conf-title{color:#d6ff38;text-align:center;font-weight:900;letter-spacing:2px;border-bottom:2px solid #61799a;padding:9px}
.pb-rounds{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.pb-round-label{font-size:11px;letter-spacing:1px;color:#9ab5d9;text-transform:uppercase;font-weight:800;margin-bottom:10px}
.pb-game{background:#0c1934;border:1px solid #36547c;box-shadow:inset 3px 0 #20c8e0;margin:0 0 10px;min-height:88px}
.pb-team{display:flex;align-items:center;gap:7px;padding:10px 9px;border-bottom:1px solid #253a58;font-size:12px}
.pb-team:last-child{border:0}.pb-seed{color:#d6ff38;font-weight:950;min-width:18px}.pb-code{font-weight:900}.pb-record{margin-left:auto;color:#92a9c7;font-size:10px;white-space:nowrap}
.pb-bye{padding:10px;background:#1b2741;border:1px solid #3d5275;color:#d6ff38;font-size:12px;font-weight:800;margin-bottom:12px}
.pb-arrow{text-align:center;color:#9eb5d4;font-size:21px;padding:13px 0}
.pb-final{margin:20px auto 0;max-width:460px;border:1px solid #b8da4c;background:linear-gradient(110deg,#0c2c38,#172242);padding:18px;text-align:center}
.pb-final h3{font-size:22px;margin:0 0 10px;color:#d6ff38}
.pb-legend{font-size:11px;color:#9db0c8;margin-top:15px;line-height:1.6}
.pb-race{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}
.pb-table{width:100%;border-collapse:collapse;font-size:12px}.pb-table td,.pb-table th{padding:9px 6px;border-bottom:1px solid #263956;text-align:left}.pb-table th{color:#a4b9d5}.pb-table .in{color:#d6ff38}
@media(max-width:850px){.pb-conferences,.pb-race{grid-template-columns:1fr}.pb-wrap{padding:13px}.pb-rounds{gap:7px}.pb-team{font-size:11px;padding:8px 5px}.pb-record{font-size:9px}}
`;document.head.appendChild(css);
const conferences=[...new Set(TEAMS.map(t=>t[2].split(' ')[0]))];
const games=()=>state.results.filter(g=>g.year===state.year&&Number.isFinite(g.sa)&&Number.isFinite(g.sb));
function stat(i){let g=games().filter(x=>x.a===i||x.b===i),w=0,l=0,t=0,pf=0,pa=0;for(let x of g){let own=x.a===i?x.sa:x.sb,opp=x.a===i?x.sb:x.sa;pf+=own;pa+=opp;if(own>opp)w++;else if(own<opp)l++;else t++}return {i,w,l,t,pf,pa,pct:(w+t*.5)/Math.max(1,g.length),diff:pf-pa,played:g.length}}
function compare(a,b){return b.pct-a.pct||b.w-a.w||b.diff-a.diff||b.pf-a.pf||a.i-b.i}
function seeded(conf){let members=TEAMS.map((t,i)=>stat(i)).filter(x=>TEAMS[x.i][2].startsWith(conf));let divisions=[...new Set(members.map(x=>TEAMS[x.i][2]))],winners=divisions.map(d=>members.filter(x=>TEAMS[x.i][2]===d).sort(compare)[0]).filter(Boolean).sort(compare);let wild=members.filter(x=>!winners.includes(x)).sort(compare);return [...winners,...wild].map((x,j)=>({...x,seed:j+1,divisionWinner:j<winners.length}));}
function badge(x){if(!x)return '<div class="pb-team"><span class="pb-seed">–</span><span class="pb-code">TBD</span></div>';return '<div class="pb-team"><span class="pb-seed">'+x.seed+'</span><span class="pb-code">'+TEAMS[x.i][0]+'</span><span class="pb-record">'+x.w+'-'+x.l+(x.t?'-'+x.t:'')+'</span></div>'}
function matchup(a,b){return '<div class="pb-game">'+badge(a)+badge(b)+'</div>'}
function conferenceMarkup(conf){let a=seeded(conf),count=a.length,qualifiers=Math.min(3,count),first=a.slice(0,qualifiers);return '<section class="pb-conference"><div class="pb-conf-title">'+conf.toUpperCase()+' CONFERENCE</div><div class="pb-rounds"><div><div class="pb-round-label">Wild Card</div>'+matchup(first[1],first[2])+'<div class="pb-bye">#1 '+TEAMS[first[0].i][0]+' · FIRST-ROUND BYE</div></div><div><div class="pb-round-label">Conference Final</div>'+matchup(first[0],null)+'<div class="pb-arrow">↑ WILD CARD WINNER</div></div></div></section>'}
function race(conf){let a=seeded(conf),cut=Math.min(3,a.length);return '<section class="cc-panel"><h3>'+conf+' SEEDING PROJECTION</h3><table class="pb-table"><tr><th>Seed</th><th>Team</th><th>W-L</th><th>PF</th><th>PA</th><th>Diff</th></tr>'+a.map((x,j)=>'<tr><td class="'+(j<cut?'in':'')+'">'+(j+1)+(j===0?' ★':'')+'</td><td>'+TEAMS[x.i][0]+'</td><td>'+x.w+'-'+x.l+'</td><td>'+x.pf+'</td><td>'+x.pa+'</td><td>'+(x.diff>0?'+':'')+x.diff+'</td></tr>').join('')+'</table></section>'}
function bracket(){let conf=conferences;return '<div class="pb-wrap"><h1 class="pb-heading">LEAGUE PLAYOFFS</h1><div class="pb-sub">'+state.year+' · WEEK '+Math.min(state.week,18)+' · '+(state.week<=18?'LIVE PROJECTED SEEDS':'REGULAR SEASON FINAL SEEDS')+'</div><div class="pb-conferences">'+conf.map(conferenceMarkup).join('')+'</div><div class="pb-final"><h3>🏆 CHAMPIONSHIP</h3><div class="pb-game">'+badge(null)+badge(null)+'</div><div class="pb-sub">Conference winners advance to the championship</div></div><div class="pb-legend">★ Conference #1 seed receives a bye. This fictional league has 12 teams, so the bracket currently uses three playoff teams per conference rather than the NFL’s seven. Division winners receive the highest seeds; remaining places are wild cards. Rankings update from completed games every week. Tiebreakers: win percentage, wins, point differential, points scored. NFL head-to-head and strength-of-victory tiebreakers are not yet implemented.</div></div><div class="pb-race">'+conf.map(race).join('')+'</div>'}
const old=render;render=function(){if(page==='Playoff Picture'){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=bracket();return}old()};
render();
})();