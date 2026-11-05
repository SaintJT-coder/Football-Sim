/* Agent contract terms and signing presentation, additive to existing free agency. */
(function(){
const styles=document.createElement('style');
styles.textContent=`
.signing-overlay{position:fixed;inset:0;z-index:99999;background:radial-gradient(ellipse at 50% 25%,#5c1927,#160b17 65%,#070b13);color:white;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
.signing-card{width:min(900px,100%);animation:sign-arrive .7s ease-out;text-align:center}
.signing-title{font-size:clamp(30px,6vw,62px);font-weight:950;font-style:italic;margin:0 0 24px}
.signing-facts{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;background:#ffffff19;border-top:2px solid #ac5161;border-bottom:2px solid #ac5161;padding:18px}
.signing-facts b{display:block;font-size:clamp(16px,2.4vw,27px)}.signing-facts small{font-size:10px;color:#cbbac4}
.signing-bottom{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0;text-align:left;background:#ffffff0d;padding:16px}
.signing-signature{font:italic clamp(27px,5vw,50px) cursive;margin:30px 0;transform:rotate(-4deg)}
.signing-confirm{background:#d7ff35;color:#07121d;border:0;font-weight:950;padding:14px 32px}
.agent-controls{background:#182a40;border:1px solid #3d536e;padding:12px;margin:12px 0}
.agent-controls label{display:inline-block;font-size:11px;margin:6px}.agent-controls input,.agent-controls select{display:block;background:#081627;color:white;padding:9px;border:1px solid #58708d;max-width:160px}
@keyframes sign-arrive{from{opacity:0;transform:translateY(30px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(max-width:650px){.signing-facts{grid-template-columns:repeat(2,1fr)}.signing-bottom{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.signing-card{animation:none}}
`;
document.head.appendChild(styles);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function agent(p){return window.GMContractEconomy?.agent(p)||{name:'Franchise Representation',style:'Balanced',persona:'Patient'}}
function show(c){document.getElementById('signing-overlay')?.remove();let el=document.createElement('div');el.id='signing-overlay';el.className='signing-overlay';el.setAttribute('role','dialog');el.setAttribute('aria-label','Contract signed');
const facts=[['LENGTH',c.years+' YRS'],['TOTAL SALARY','$'+(c.salary*c.years).toFixed(1)+'M'],['AVG YEARLY','$'+c.salary.toFixed(1)+'M'],['BONUS','$'+c.bonus.toFixed(1)+'M'],['GUARANTEED','$'+(c.guaranteed||0).toFixed(1)+'M']];
el.innerHTML='<div class="signing-card"><h1 class="signing-title">CONTRACT SIGNED</h1><h2>'+esc(c.player)+'</h2><p>'+esc(TEAMS[c.team][1])+'</p><div class="signing-facts">'+facts.map(x=>'<div><b>'+x[1]+'</b><small>'+x[0]+'</small></div>').join('')+'</div><div class="signing-bottom"><section><h3>CONTRACT CLAUSES</h3><p>'+esc((c.clause||'NONE').replace(/_/g,' '))+'</p><p>Performance incentives: $'+Number(c.incentive||0).toFixed(1)+'M</p></section><section><h3>AGENT & PLAYER PERSONA</h3><p>Agent: '+esc(c.agent?.name)+'</p><p>Focus: '+esc(c.agent?.style)+'</p><p>Mindset: '+esc(c.agent?.persona)+'</p></section></div><p>PLAYER SIGNATURE</p><div class="signing-signature">'+esc(c.player)+'</div><button class="signing-confirm" onclick="document.getElementById(\'signing-overlay\').remove()">CONFIRM SIGNING →</button></div>';document.body.appendChild(el)}
function inputs(){let f=state.freeAgency,p=state.players.find(x=>x.id===f?.selected&&x.team===-1);if(!p)return;let area=document.getElementById('fa-agent-controls');if(!area){const btn=document.querySelector('[onclick^="faBid("]');if(!btn)return;area=document.createElement('div');area.id='fa-agent-controls';area.className='agent-controls';btn.parentNode.insertBefore(area,btn)}let a=agent(p),o=f.bids[p.id];area.innerHTML='<b>AGENT: '+esc(a.name)+'</b><p>Negotiation style: '+a.style+' · '+a.persona+'</p><label>GUARANTEED ($M)<input id="agent-guaranteed" type="number" min="0" step=".1" value="'+(o?.guaranteed||0)+'"></label><label>INCENTIVE ($M)<input id="agent-incentive" type="number" min="0" step=".1" value="'+(o?.incentive||0)+'"></label><label>CLAUSE<select id="agent-clause"><option value="NONE">None</option>'+['NO_TRADE','NO_TAG','PLAYER_OPTION','TEAM_OPTION'].map(v=>'<option value="'+v+'" '+(o?.clause===v?'selected':'')+'>'+v.replace('_',' ')+'</option>').join('')+'</select></label>'}
const oldBid=window.faBid;window.faBid=function(id){let f=state.freeAgency,p=state.players.find(x=>x.id===id);if(!p)return;let prev=f.bids[id];if(!prev&&Object.keys(f.bids).length>=5){notice('Maximum five active negotiations');return}let guaranteed=Math.max(0,Number(document.getElementById('agent-guaranteed')?.value)||0),incentive=Math.max(0,Number(document.getElementById('agent-incentive')?.value)||0),clause=document.getElementById('agent-clause')?.value||'NONE';oldBid(id);let o=f.bids[id];if(!o)return;o.guaranteed=Math.min(guaranteed,o.salary*o.years);o.incentive=incentive;o.clause=clause;o.agent=agent(p);o.score=Math.max(0,Math.min(100,o.score+Math.round(o.guaranteed/Math.max(1,o.salary*o.years)*8)+(clause==='NO_TRADE'||clause==='NO_TAG'?4:0)+(window.GMContractEconomy?.freeAgentScoreModifier(p,o)||0)));save();inputs()};
const oldAdvance=window.faAdvance;
window.faAdvance=function(){
 const f=state.freeAgency,before=f.history.length,pending={...f.bids};
 oldAdvance();
 const signed=f.history.slice(0,Math.max(0,f.history.length-before))
   .filter(x=>x.team===state.team);
 if(!signed.length)return;
 let display=null;
 for(const signing of signed){
   const p=state.players.find(x=>x.name===signing.player&&x.team===state.team);
   if(!p)continue;
   const offer=pending[p.id]||{};
   p.contract={...offer,signedYear:state.year};
   // Free agency books the complete contract before the next bid resolves.
   display={...signing,guaranteed:offer.guaranteed||0,incentive:offer.incentive||0,
      clause:offer.clause||'NONE',agent:offer.agent||agent(p)};
 }
 if(display)show(display);
 save();
};
const previousRender=render;render=function(){previousRender();if(page==='Player Market')inputs()};
render();
})();
