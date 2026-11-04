/* Gridiron GM championship celebration */
(function(){
const style=document.createElement('style');style.textContent=`
.champ-overlay{position:fixed;inset:0;z-index:99999;background:#02060e;display:flex;align-items:center;justify-content:center;overflow:hidden;opacity:0;pointer-events:none;transition:opacity .5s ease}
.champ-overlay.active{opacity:1;pointer-events:auto}
.champ-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,#35516a 0%,#0b1930 43%,#02060e 85%);transform:scale(1.1);animation:champ-zoom 12s ease-out forwards}
.champ-bg:before{content:'🏆';position:absolute;top:12%;left:50%;transform:translateX(-50%);font-size:clamp(100px,25vw,220px);filter:drop-shadow(0 0 55px #e8b953)}
.champ-gradient{position:absolute;inset:0;background:linear-gradient(to top,#02060ef2,transparent 80%)}
.champ-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.champ-confetti i{position:absolute;top:-30px;width:9px;height:16px;animation:champ-fall linear forwards}
.champ-content{position:relative;z-index:5;text-align:center;color:white;padding:20px;max-width:900px;margin-top:clamp(90px,25vh,210px)}
.champ-kicker{font-size:13px;letter-spacing:5px;font-weight:900;color:#d7ff35}
.champ-title{font-size:clamp(38px,9vw,82px);font-weight:1000;font-style:italic;line-height:1;margin:12px 0;letter-spacing:-2px}
.champ-team{font-size:clamp(22px,5vw,38px);font-weight:900}
.champ-year{font-size:16px;color:#8ecccf;margin-top:8px;letter-spacing:2px}
.champ-message{margin:24px auto 0;max-width:430px;line-height:1.5;color:#e2f1f3}
.champ-btn{margin-top:26px;background:#d7ff35;color:#06120f;font-weight:950;font-size:15px;border:0;padding:15px 32px;border-radius:6px;cursor:pointer}.champ-btn:focus-visible{outline:3px solid #fff;outline-offset:4px}
.champ-kicker,.champ-title,.champ-team,.champ-year,.champ-message,.champ-btn{opacity:0;transform:translateY(20px);animation:champ-in .8s ease forwards}
.champ-title{animation-delay:.6s}.champ-team{animation-delay:1.1s}.champ-year{animation-delay:1.4s}.champ-message{animation-delay:2.3s}.champ-btn{animation-delay:3s}
@keyframes champ-in{to{opacity:1;transform:translateY(0)}}@keyframes champ-fall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}@keyframes champ-zoom{to{transform:scale(1)}}
@media(max-height:650px){.champ-content{margin-top:60px}.champ-message{margin-top:10px}.champ-btn{margin-top:12px}}@media(prefers-reduced-motion:reduce){.champ-bg,.champ-confetti i,.champ-kicker,.champ-title,.champ-team,.champ-year,.champ-message,.champ-btn{animation:none!important;opacity:1;transform:none}.champ-overlay{transition:none}}
`;document.head.appendChild(style);
let previousFocus=null;
let closeOnEscape=null;
function releaseKeyboard(){if(closeOnEscape){document.removeEventListener('keydown',closeOnEscape);closeOnEscape=null}}
window.launchChampionshipCelebration=function(teamName='Arcadia Sentinels',year=2026){
 releaseKeyboard();
 previousFocus=document.activeElement;
 document.getElementById('champ-overlay')?.remove();
 const overlay=document.createElement('div');overlay.id='champ-overlay';overlay.className='champ-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Gridiron champions celebration');
 overlay.innerHTML='<div class="champ-bg"></div><div class="champ-gradient"></div><div class="champ-confetti"></div><div class="champ-content"><div class="champ-kicker">GRIDIRON CHAMPIONS</div><div class="champ-title">CHAMPIONS</div><div class="champ-team"></div><div class="champ-year"></div><div class="champ-message">One title down. The legacy is just getting started.</div><button class="champ-btn" type="button">CONTINUE DYNASTY →</button></div>';
 overlay.querySelector('.champ-team').textContent=String(teamName).toUpperCase();
 overlay.querySelector('.champ-year').textContent=year+' • WORLD CHAMPIONS';
 overlay.querySelector('button').addEventListener('click',()=>window.closeChampionshipCelebration());
 closeOnEscape=event=>{if(event.key==='Escape'){event.preventDefault();window.closeChampionshipCelebration()}};
 document.addEventListener('keydown',closeOnEscape);
 document.body.appendChild(overlay);
 const confetti=overlay.querySelector('.champ-confetti'),colors=['#d7ff35','#17c8d5','#fff','#f59e0b','#34d399','#f472b6'];
 for(let i=0;i<90;i++){let p=document.createElement('i');p.style.left=Math.random()*100+'%';p.style.background=colors[i%colors.length];p.style.animationDuration=2.6+Math.random()*3+'s';p.style.animationDelay=Math.random()*3+'s';confetti.appendChild(p)}
 requestAnimationFrame(()=>{if(!overlay.isConnected)return;overlay.classList.add('active');overlay.querySelector('button')?.focus()});
};
window.closeChampionshipCelebration=function(){releaseKeyboard();const o=document.getElementById('champ-overlay');if(!o)return;o.classList.remove('active');const focus=previousFocus;previousFocus=null;setTimeout(()=>{o.remove();if(focus?.isConnected)focus.focus?.()},window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?0:500)};
})();
