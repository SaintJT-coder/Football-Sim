/* Draft-night presentation layer. Uses original animations, no third-party likenesses. */
(function(){
const css=document.createElement('style');
css.textContent=`
.dn-page{background:radial-gradient(ellipse at 65% 15%,#124a54 0%,#081324 48%,#060b16 100%);border:1px solid #35526b;border-radius:12px;padding:18px;overflow:hidden;color:#edfaff}
.dn-top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#e9f1f4;color:#101c29;padding:12px;margin:-18px -18px 18px}
.dn-top strong{font-size:17px}.dn-clock{background:#177f91;color:white;padding:8px 16px;font-weight:900}.dn-picks{display:flex;gap:7px;overflow-x:auto;margin-bottom:16px}.dn-pick{flex:0 0 90px;background:#182b40;border:1px solid #36536e;padding:8px;font-size:11px}.dn-pick.current{border-color:#d6ff36;color:#d6ff36}
.dn-stage{min-height:275px;position:relative;background:radial-gradient(ellipse at 50% 100%,#1eafbb55,transparent 60%),linear-gradient(135deg,#0e3341,#091324);border:2px solid #256d7b;display:grid;place-items:center;text-align:center;overflow:hidden}
.dn-stage:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(110deg,transparent 0 55px,#ffffff06 57px 60px);pointer-events:none}
.dn-arch{border:9px solid #6fcbd0;border-bottom:0;border-radius:55% 55% 0 0;width:min(420px,90%);height:230px;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(#124451,#071b30);box-shadow:0 0 50px #17d6d333;position:relative}
.dn-arch h2{font-size:clamp(22px,4vw,42px);font-weight:950;font-style:italic;margin:5px}.dn-arch p{font-size:12px;color:#b8eced}.dn-lights{position:absolute;top:0;width:100%;height:30px;background:repeating-linear-gradient(90deg,#b2ffff 0 4px,transparent 5px 40px);filter:drop-shadow(0 0 10px #55ffff)}
.dn-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.dn-actions button{font-weight:900}
.dn-panel{background:#101f32;border:1px solid #34465b;padding:12px;margin:12px 0}
.dn-recent{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.dn-recent div{background:#17283c;padding:11px;border-left:3px solid #d6ff36;font-size:12px}
.dn-overlay{position:fixed;inset:0;background:#030a16eF;z-index:99999;display:flex;justify-content:center;align-items:center;flex-direction:column;overflow:hidden;text-align:center;color:white;padding:20px}
.dn-overlay:before{content:"";position:absolute;inset:-50%;background:conic-gradient(from 0deg,transparent,#13c8ce33,transparent,#d7ff3544,transparent);animation:dn-spin 7s linear infinite}
.dn-overlay-content{position:relative;z-index:2;width:min(540px,94vw)}
.dn-flash{font-size:13px;letter-spacing:4px;font-weight:950;color:#d7ff35;animation:dn-rise .55s both}
.dn-announcement{font-size:clamp(24px,6vw,54px);font-weight:1000;line-height:1.1;font-style:italic;margin:16px 0;animation:dn-rise .8s both}
.dn-player{font-size:clamp(22px,5vw,40px);font-weight:950;animation:dn-rise 1s both}
.dn-dancer{font-size:76px;display:block;margin:20px;transform-origin:50% 90%}
.dn-dancer.shuffle{animation:dn-shuffle .65s ease-in-out infinite alternate}
.dn-dancer.spin{animation:dn-dance-spin 1.1s ease-in-out infinite}
.dn-dancer.bounce{animation:dn-bounce .5s ease-in-out infinite alternate}
.dn-dancer.wave{animation:dn-wave .7s ease-in-out infinite alternate}
.dn-confetti{position:absolute;top:-12vh;left:var(--left);width:9px;height:17px;background:var(--color);transform:rotate(var(--rotate));animation:dn-fall var(--duration) linear var(--delay) infinite;z-index:1}
.dn-overlay button{margin-top:20px;background:#d7ff35;color:#0c1823;font-weight:950}
@keyframes dn-spin{to{transform:rotate(360deg)}}@keyframes dn-rise{from{opacity:0;transform:translateY(35px)}to{opacity:1;transform:translateY(0)}}@keyframes dn-fall{to{top:110vh;transform:translateX(50px) rotate(850deg)}}@keyframes dn-shuffle{to{transform:translateX(28px) rotate(15deg)}}@keyframes dn-dance-spin{50%{transform:rotate(28deg) scale(1.14)}100%{transform:rotate(-20deg)}}@keyframes dn-bounce{to{transform:translateY(-30px) scale(1.08)}}@keyframes dn-wave{to{transform:rotate(20deg) translateY(-10px)}}
@media(prefers-reduced-motion:reduce){.dn-overlay:before,.dn-dancer,.dn-confetti,.dn-announcement,.dn-player,.dn-flash{animation:none!important}}
@media(max-width:650px){.dn-page{padding:11px}.dn-top{margin:-11px -11px 12px}.dn-stage{min-height:220px}.dn-arch{height:185px}.dn-actions button{flex:1 1 120px}}
`;
document.head.appendChild(css);
const oldDraft=window.draftProspect,oldAdvance=window.advanceDraft,oldAuto=window.autoDraft;
let overlay=null;
function close(){if(overlay){overlay.remove();overlay=null}}
function celebrate(p,team,pick){
 close();
 const dances=['shuffle','spin','bounce','wave'],dance=dances[Math.floor(Math.random()*dances.length)];
 overlay=document.createElement('div');overlay.className='dn-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Draft pick announcement');
 let confetti=Array.from({length:42},(_,i)=>'<i class="dn-confetti" style="--left:'+(i*37%100)+'%;--color:'+['#d7ff35','#17c8d5','#fff','#e9ac47'][i%4]+';--rotate:'+(i*43)+'deg;--delay:'+(i%8*.13)+'s;--duration:'+(2+i%5*.4)+'s"></i>').join('');
 overlay.innerHTML=confetti+'<div class="dn-overlay-content"><div class="dn-flash">THE PICK IS IN · ROUND '+pick.round+' · PICK '+pick.slot+'</div><div class="dn-announcement">'+TEAMS[team][1].toUpperCase()+' SELECT</div><div class="dn-player">'+p.name+'</div><div style="color:#b2e8e8">'+p.pos+' · '+p.rating+' OVR · '+p.dev+' DEVELOPMENT</div><span class="dn-dancer '+dance+'" aria-hidden="true">🕺</span><div style="font-size:12px;color:#a7bbcf">ROOKIE CELEBRATION · '+dance.toUpperCase()+'</div><button onclick="window.closeDraftCelebration()">CONTINUE DRAFT →</button></div>';
 document.body.appendChild(overlay);
}
window.closeDraftCelebration=close;
window.draftProspect=function(id){
 const f=state.frontOffice,pick=f.picks.filter(x=>!x.used).sort((a,b)=>a.round-b.round||a.slot-b.slot)[0],p=f.prospects.find(x=>x.id===id);
 const before=f.draftLog.length;oldDraft(id);
 if(pick&&p&&f.draftLog.length>before)celebrate(p,pick.owner,pick);
};
window.advanceDraft=function(){
 const f=state.frontOffice,before=f.draftLog.length;oldAdvance();
 if(f.draftLog.length>before){const last=f.draftLog[f.draftLog.length-1],p=f.prospects.find(x=>x.name===last.player);if(p)celebrate(p,last.team,{round:last.round,slot:Number(last.pick.split('-').pop())})}
};
window.autoDraft=function(){close();oldAuto()};
function draftStage(){
 const f=state.frontOffice,picks=f.picks.filter(p=>!p.used).sort((a,b)=>a.round-b.round||a.slot-b.slot),now=picks[0],nextMine=picks.find(p=>p.owner===state.team),recent=f.draftLog.slice(-5).reverse();
 const strip=picks.slice(0,9).map((p,i)=>'<div class="dn-pick '+(!i?'current':'')+'">RD '+p.round+' · PK '+p.slot+'<br><b>'+TEAMS[p.owner][0]+'</b></div>').join('');
 return '<div class="dn-page"><div class="dn-top"><strong>🏈 '+state.year+' ROOKIE DRAFT</strong><div class="dn-clock">ON THE CLOCK · '+(now?'RD '+now.round+' PK '+now.slot:'COMPLETE')+'</div><strong>YOUR NEXT PICK: '+(nextMine?'RD '+nextMine.round+' · PK '+nextMine.slot:'NONE')+'</strong></div><div class="dn-picks">'+strip+'</div><div class="dn-stage"><div class="dn-lights"></div><div class="dn-arch"><p>GRIDIRON GM · DRAFT NIGHT</p><h2>'+(now?TEAMS[now.owner][1].toUpperCase():'DRAFT COMPLETE')+'</h2><p>'+(now?'ON THE CLOCK':'ALL SELECTIONS FINAL')+'</p></div></div><div class="dn-actions"><button class="primary" onclick="window.advanceDraft()">SKIP TO MY NEXT PICK</button><button onclick="window.autoDraft()">SIMULATE REMAINING DRAFT</button><button onclick="window.draftShowBoard()">VIEW DRAFT BOARD</button></div><div class="dn-panel"><h3>PREVIOUS SELECTIONS</h3><div class="dn-recent">'+(recent.map(x=>'<div><b>RD '+x.round+' · '+TEAMS[x.team][0]+'</b><p>'+x.player+' · '+x.pos+' · '+x.overall+' OVR</p></div>').join('')||'<p>Waiting for the first selection</p>')+'</div></div></div>';
}
let showBoard=true;
window.draftShowBoard=()=>{showBoard=!showBoard;render()};
const priorRender=render;
render=function(){
 priorRender();
 if(page==='Fantasy Draft'||page==='Draft Board'){
 const app=document.getElementById('app');if(!app)return;
 const current=app.innerHTML;
 app.innerHTML=draftStage()+(showBoard?'<div class="dn-panel"><h3>YOUR DRAFT BOARD</h3>'+current+'</div>':'');
 }
};
render();
})();