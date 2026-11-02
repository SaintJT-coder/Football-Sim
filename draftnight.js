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
 return '<div class="dn-page"><div class="dn-top"><strong>🏈 '+state.year+' ROOKIE DRAFT</strong><div class="dn-clock">ON THE CLOCK · '+(now?'RD '+now.round+' PK '+now.slot:'COMPLETE')+'</div><strong>YOUR NEXT PICK: '+(nextMine?'RD '+nextMine.round+' · PK '+nextMine.slot:'NONE')+'</strong></div><div class="dn-picks">'+strip+'</div><div class="dn-stage"><div class="dn-lights"></div><div class="dn-arch"><p>GRIDIRON GM · DRAFT NIGHT</p><h2>'+(now?TEAMS[now.owner][1].toUpperCase():'DRAFT COMPLETE')+'</h2><p>'+(now?'ON THE CLOCK':'ALL SELECTIONS FINAL')+'</p></div></div><div class="dn-actions"><button class="primary" onclick="window.advanceDraft()">SKIP TO MY NEXT PICK</button><button onclick="window.autoDraft()">SIMULATE REMAINING DRAFT</button><button onclick="window.draftShowBoard()">VIEW DRAFT BOARD</button><button onclick="window.showDraftIntro()">REPLAY OPENING</button></div><div class="dn-panel"><h3>PREVIOUS SELECTIONS</h3><div class="dn-recent">'+(recent.map(x=>'<div><b>RD '+x.round+' · '+TEAMS[x.team][0]+'</b><p>'+x.player+' · '+x.pos+' · '+x.overall+' OVR</p></div>').join('')||'<p>Waiting for the first selection</p>')+'</div></div></div>';
}

const introStyle=document.createElement('style');introStyle.textContent=`
.dn-intro{position:fixed;inset:0;z-index:99998;background:radial-gradient(ellipse at center,#123947,#030811 74%);display:grid;place-items:center;color:white;overflow:hidden}
.dn-intro-stage{width:min(760px,95vw);min-height:370px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden;border-bottom:9px solid #1bb3c3}
.dn-intro-spot{position:absolute;top:-150px;width:150px;height:660px;background:linear-gradient(#92faff88,transparent);filter:blur(25px);transform-origin:top;animation:dn-sweep 3s ease-in-out infinite alternate}
.dn-intro-spot.left{left:15%;transform:rotate(27deg)}.dn-intro-spot.right{right:15%;animation-direction:alternate-reverse;transform:rotate(-27deg)}
.dn-intro-arch{position:relative;border:8px solid #35a8b4;border-bottom:0;border-radius:55% 55% 0 0;padding:50px 22px 15px;width:80%;max-width:490px;background:linear-gradient(145deg,#07505a,#071629);box-shadow:0 0 70px #17c5d344;animation:dn-intro-rise 1.3s both}
.dn-intro-title{font-size:clamp(30px,7vw,70px);font-weight:1000;font-style:italic;line-height:1;letter-spacing:-2px;text-shadow:0 0 24px #49e1e4}
.dn-intro-caption{font-size:12px;letter-spacing:5px;color:#d7ff35;margin:14px}
.dn-intro-crowd{position:absolute;bottom:-5px;left:0;width:100%;height:70px;background:repeating-radial-gradient(ellipse at 50% 100%,#020814 0 11px,transparent 12px 26px);opacity:.8}
.dn-intro-actions{position:relative;z-index:2;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:22px}
.dn-intro-actions button{padding:13px 20px;font-weight:950;background:#d7ff35;color:#081622;border:0}
.dn-intro-actions button.secondary{background:#253a4c;color:white}
@keyframes dn-sweep{0%{transform:rotate(-30deg)}100%{transform:rotate(30deg)}}
@keyframes dn-intro-rise{from{opacity:0;transform:translateY(100px) scale(.8)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.dn-intro-spot,.dn-intro-arch{animation:none!important}}
`;document.head.appendChild(introStyle);
let introShown=false;
window.closeDraftIntro=function(){document.getElementById('dn-intro')?.remove()};
window.showDraftIntro=function(){
 if(document.getElementById('dn-intro'))return;
 const el=document.createElement('div');el.id='dn-intro';el.className='dn-intro dn-cinematic';el.setAttribute('role','dialog');el.setAttribute('aria-label','Animated draft night opening ceremony');
 const year=state.year;
 el.innerHTML='<div class="dn-cinema-sky"><div class="dn-cinema-beam beam-one"></div><div class="dn-cinema-beam beam-two"></div><div class="dn-cinema-beam beam-three"></div><div class="dn-cinema-stars"></div></div><div class="dn-cinema-venue"><div class="dn-cinema-ticker">LIVE FROM THE GRIDIRON DRAFT • '+year+' • THE FUTURE IS ON THE CLOCK</div><div class="dn-cinema-screen"><div class="dn-cinema-kicker">WELCOME TO THE '+year+' DRAFT</div><div class="dn-cinema-logo">GRIDIRON <em>GM</em></div><div class="dn-cinema-title">DRAFT NIGHT</div><div class="dn-cinema-sub">12 FRANCHISES · 7 ROUNDS · ONE FUTURE</div><div class="dn-cinema-count" id="dn-cinema-count">03</div></div><div class="dn-cinema-stage"><div class="dn-cinema-podium">★ <span>GRIDIRON</span> ★</div></div><div class="dn-cinema-audience"></div><div class="dn-cinema-flash"></div></div><div class="dn-cinema-controls"><button class="dn-cinema-enter" onclick="closeDraftIntro()">ENTER DRAFT ROOM →</button><button class="dn-cinema-skip" onclick="closeDraftIntro();draftShowBoard()">VIEW DRAFT BOARD</button><button class="dn-cinema-replay" onclick="replayDraftIntro()">↻ REPLAY INTRO</button></div>';
 document.body.appendChild(el);
 window.dnIntroTimer&&clearInterval(window.dnIntroTimer);
 let tick=3;window.dnIntroTimer=setInterval(()=>{if(!document.getElementById('dn-intro')){clearInterval(window.dnIntroTimer);return}tick--;let count=document.getElementById('dn-cinema-count');if(count)count.textContent=tick>0?'0'+tick:'ON THE CLOCK';if(tick<=0){clearInterval(window.dnIntroTimer);el.classList.add('dn-cinema-ready')}},1000);
};
window.replayDraftIntro=function(){window.dnIntroTimer&&clearInterval(window.dnIntroTimer);document.getElementById('dn-intro')?.remove();window.showDraftIntro()};
const dnOldClose=window.closeDraftIntro;
window.closeDraftIntro=function(){window.dnIntroTimer&&clearInterval(window.dnIntroTimer);dnOldClose()};
const cinemaCss=document.createElement('style');cinemaCss.textContent=`
.dn-cinematic{position:fixed;inset:0;z-index:100001;overflow:hidden;background:#02050c;color:#fff;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif}
.dn-cinema-sky{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 60%,#103f5a 0%,#071225 46%,#02050c 100%)}
.dn-cinema-stars{position:absolute;inset:0;background-image:radial-gradient(#e7faff88 1px,transparent 2px);background-size:27px 31px;opacity:.2}
.dn-cinema-beam{position:absolute;bottom:5%;left:50%;width:22vw;height:120vh;transform-origin:bottom center;background:linear-gradient(0deg,#61f7ff66,transparent 85%);clip-path:polygon(48% 100%,52% 100%,100% 0,0 0);filter:blur(9px);animation:dn-sweep 5s ease-in-out infinite alternate}
.dn-cinema-beam.beam-one{left:12%;animation-delay:-1s}.dn-cinema-beam.beam-two{left:72%;animation-delay:-3s;animation-direction:alternate-reverse}.dn-cinema-beam.beam-three{left:48%;background:linear-gradient(0deg,#d7ff3766,transparent 85%);animation-delay:-2s}
.dn-cinema-venue{position:relative;width:min(1100px,100vw);height:min(82vh,720px);display:flex;align-items:center;flex-direction:column;justify-content:center;perspective:900px}
.dn-cinema-ticker{position:absolute;top:0;background:#b8ee31;color:#08131b;font-weight:950;letter-spacing:2px;text-align:center;width:100%;padding:11px 6px;font-size:clamp(9px,1.6vw,13px);animation:dn-drop .6s both}
.dn-cinema-screen{position:relative;z-index:2;width:min(90%,790px);min-height:48%;padding:clamp(20px,4vw,45px) 12px;text-align:center;border:4px solid #47dce7;box-shadow:0 0 45px #21cbd566,inset 0 0 50px #064e69;background:radial-gradient(ellipse,#154c68,#07172b 70%);transform:rotateX(8deg);animation:dn-screen-in 1.2s cubic-bezier(.2,.8,.2,1) both}
.dn-cinema-kicker{font-weight:900;letter-spacing:5px;font-size:clamp(9px,1.5vw,15px);color:#b3f6f5;animation:dn-drop 1s .4s both}
.dn-cinema-logo{font-weight:1000;letter-spacing:-3px;font-size:clamp(32px,7vw,82px);line-height:1.1;margin-top:12px;animation:dn-drop .9s .8s both}.dn-cinema-logo em{font-style:normal;color:#d7ff35}
.dn-cinema-title{font-weight:1000;letter-spacing:8px;color:#d7ff35;font-size:clamp(17px,3vw,35px);animation:dn-drop .8s 1.1s both}
.dn-cinema-sub{font-size:clamp(10px,1.5vw,15px);letter-spacing:2px;margin-top:12px;color:#cce7ec;animation:dn-drop .8s 1.4s both}
.dn-cinema-count{font-size:clamp(26px,5vw,55px);font-weight:1000;color:#fff;text-shadow:0 0 20px #d7ff35;margin-top:15px;animation:dn-pulse 1s infinite alternate}
.dn-cinema-stage{position:relative;width:88%;height:65px;background:linear-gradient(#163b51,#050a13);border-top:8px solid #52e0e4;transform:rotateX(35deg);box-shadow:0 10px 40px #000}.dn-cinema-podium{position:absolute;top:-32px;left:50%;transform:translateX(-50%);padding:15px 25px;background:linear-gradient(120deg,#152c40,#07121f);border:2px solid #6ce1e6;white-space:nowrap;font-weight:900;color:#d7ff35}.dn-cinema-podium span{color:#fff}
.dn-cinema-audience{position:absolute;bottom:0;width:100%;height:15%;background:repeating-linear-gradient(80deg,#01040a 0 14px,#132b38 15px 22px,#01040a 23px 34px);clip-path:polygon(0 30%,10% 0,25% 40%,40% 5%,60% 30%,80% 0,100% 30%,100% 100%,0 100%);animation:dn-crowd 1s infinite alternate}
.dn-cinema-controls{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));z-index:5;display:flex;justify-content:center;gap:9px;flex-wrap:wrap;padding:0 12px}.dn-cinema-controls button{font-weight:950;padding:12px 17px;border-radius:8px;cursor:pointer}.dn-cinema-enter{background:#d7ff35;color:#071323;border:0;box-shadow:0 0 25px #d7ff3566}.dn-cinema-skip,.dn-cinema-replay{background:#10283b;color:#fff;border:1px solid #68bac3}
.dn-cinema-flash{position:absolute;inset:0;background:#d7ff35;opacity:0;pointer-events:none}.dn-cinema-ready .dn-cinema-flash{animation:dn-camera-flash 1.5s 1}
@keyframes dn-sweep{from{transform:rotate(-30deg)}to{transform:rotate(40deg)}}@keyframes dn-drop{from{opacity:0;transform:translateY(-25px)}to{opacity:1;transform:translateY(0)}}@keyframes dn-screen-in{from{opacity:0;transform:translateY(120px) rotateX(35deg) scale(.65)}to{opacity:1;transform:rotateX(8deg) scale(1)}}@keyframes dn-pulse{to{opacity:.6;transform:scale(1.08)}}@keyframes dn-crowd{to{transform:translateY(6px)}}@keyframes dn-camera-flash{10%{opacity:.8}25%,100%{opacity:0}}
@media(max-width:650px){.dn-cinema-venue{height:74vh}.dn-cinema-screen{min-height:42%;padding:25px 9px}.dn-cinema-logo{letter-spacing:-1px}.dn-cinema-title{letter-spacing:3px}.dn-cinema-controls button{padding:10px 12px;font-size:11px}.dn-cinema-stage{height:42px}}
@media(prefers-reduced-motion:reduce){.dn-cinematic *{animation:none!important;transition:none!important}}
`;document.head.appendChild(cinemaCss);

let showBoard=true;
window.draftShowBoard=()=>{showBoard=!showBoard;render()};
const priorRender=render;
render=function(){
 priorRender();
 if(page==='Fantasy Draft'||page==='Draft Board'){
 const app=document.getElementById('app');if(!app)return;
 const current=app.innerHTML;
 if(!introShown){introShown=true;window.showDraftIntro()}
 app.innerHTML=draftStage()+(showBoard?'<div class="dn-panel"><h3>YOUR DRAFT BOARD</h3>'+current+'</div>':'');
 }
};
render();
})();