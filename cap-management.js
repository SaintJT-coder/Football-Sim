/* Gridiron GM — salary-cap compatibility bridge.
   The Contract Economy and Advanced Contracts modules own all contract accounting.
   Keep legacy gmNegotiate / gmRestructure / gmCut entry points. */
(function(root){
'use strict';
const n=x=>Number(x)||0;
const money=x=>Math.round(n(x)*100)/100;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function capSheet(){
 const active=state.players.filter(p=>p.team===state.team),
   sheet=root.GMContractEconomy?.sheet(state);
 if(sheet)return {base:sheet.contracts,dead:sheet.dead,total:money(sheet.contracts+sheet.dead),
   space:sheet.space,limit:sheet.limit,carryover:sheet.carryover,penalty:sheet.penalty,
   top:active.slice().sort((a,b)=>b.salary-a.salary)};
 const base=active.reduce((sum,p)=>sum+n(p.salary),0),dead=n(state.deadCap);
 return {base:money(base),dead:money(dead),total:money(base+dead),
   space:money(n(state.cap)-base-dead),limit:n(state.cap),carryover:0,penalty:0,
   top:active.slice().sort((a,b)=>b.salary-a.salary)};
}
function fallbackPage(){
 const c=capSheet();
 return '<div class="eyebrow">FINANCIAL CONTROL</div><h1 class="heading">SALARY CAP & CONTRACTS</h1>'+
 '<div class="grid three">'+[
   ['League cap',c.limit],['Active payroll',c.base],['Dead cap',c.dead],
   ['Cap room',c.space],['Carryover',c.carryover],['Penalties',c.penalty]
 ].map(([name,value])=>'<div class="card"><h3>'+esc(name)+'</h3><h2>$'+money(value).toFixed(2)+'M</h2></div>').join('')+'</div>'+
 c.top.map(p=>'<div class="card"><b>'+esc(p.name)+'</b> · '+esc(p.pos)+' · $'+money(p.salary)+
 'M/year <button onclick="gmNegotiate('+Number(p.id)+')">EXTEND</button> '+
 '<button onclick="gmRestructure('+Number(p.id)+')">RESTRUCTURE</button> '+
 '<button onclick="gmCut('+Number(p.id)+')">RELEASE</button></div>').join('');
}
root.gmNegotiate=id=>{
 if(root.GMContractEconomy)return root.gmEconomyNegotiate?.(id);
 alert('Contract negotiation module is not loaded');
};
root.gmRestructure=id=>{
 const p=state.players.find(x=>String(x.id)===String(id));
 if(!p||p.team!==state.team)return;
 const result=root.GMContractsAdvanced?.restructure(p,state,money(Math.max(1,(p.salary||1)*.25)));
 if(!result?.ok)alert(result?.error||'Unable to restructure');
 else{save();render()}
};
root.gmCut=id=>{
 const p=state.players.find(x=>String(x.id)===String(id));
 if(!p||p.team!==state.team)return;
 if(!confirm('Release '+p.name+' and incur any dead cap?'))return;
 const result=root.GMContractsAdvanced?.release(p,state);
 if(!result?.ok)alert(result?.error||'Unable to release');
 else{save();render()}
};
// The classic simulator still calls global capspace() in trades and signings.
capspace=function(){return capSheet().space};
const previous=render;
render=function(){
 if(page==='Salary Cap'){
   nav();
   $('mobileSeason').textContent=state.year+' W'+state.week;
   $('app').innerHTML=root.GMContractEconomy?
     root.GMContractEconomy.page(state)+(root.GMContractsAdvanced?.view(state)||''):fallbackPage();
   return;
 }
 previous();
};
root.GMCapSheet={sheet:capSheet,page:fallbackPage};
render();
})(window);
