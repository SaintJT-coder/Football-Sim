/* Priority 6: stadium deals, relocation and owner/fan reactions.
   Root script, loaded after expansion.js and owner-franchise.js. */
(function(root){
'use strict';
const CONFIG={
 cities:[
  {key:'PORTLAND',city:'Portland',market:72,fanDelta:-9},
  {key:'SAN_DIEGO',city:'San Diego',market:83,fanDelta:-5},
  {key:'ST_LOUIS',city:'St. Louis',market:77,fanDelta:-7},
  {key:'AUSTIN',city:'Austin',market:88,fanDelta:-12},
  {key:'SALT_LAKE',city:'Salt Lake City',market:68,fanDelta:-6}
 ],
 proposal:{cost:5,fan:-4,media:9},
 relocation:{cost:42,minJobSecurity:35,ownerSecurity:-3,media:12},
 cancel:{fan:6,media:-8,ownerSecurity:1},
 deals:{
  RENOVATE:{label:'Renovate Current Stadium',cost:18,fan:5,media:-3,
    security:2,tier:1,description:'Lower expense; smaller facility upgrade'},
  PARTNERSHIP:{label:'Public-Private Stadium Partnership',cost:12,fan:2,
    media:10,security:-2,tier:1,description:'Cheaper but increases public scrutiny'},
  PRIVATE:{label:'Owner-Funded Stadium Project',cost:36,fan:9,
    media:-6,security:4,tier:2,description:'Expensive investment with stronger fan approval'}
 },
 facilityMax:5,logLimit:30
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ORIGINAL=(root.TEAMS||[]).map(team=>[...team]);
function init(s){
 const x=s.franchiseRelocation??={version:1,team:s.team,city:null,identity:null,
   proposal:null,history:[],lastDealYear:null};
 x.history??=[];return x;
}
function owner(s){return root.GMOwner?.init(s)||s.ownerFranchise||null}
function reaction(s,entry){
 const o=owner(s);if(o){
   o.fanHappiness=clamp((o.fanHappiness??65)+(entry.fan||0),0,100);
   o.mediaHeat=clamp((o.mediaHeat??25)+(entry.media||0),0,100);
   o.jobSecurity=clamp((o.jobSecurity??70)+(entry.security||0),0,100);
 }
 const x=init(s),result={year:s.year,week:s.week,...entry};
 x.history.unshift(result);x.history.length=Math.min(x.history.length,CONFIG.logLimit);
 s.news?.unshift('FRANCHISE OWNERSHIP: '+entry.message);
 return result;
}
function applyTeamIdentity(s){
 // Restore original team names so different save slots never contaminate each other.
 if(!root.TEAMS)return;
 for(let i=0;i<root.TEAMS.length;i++){
   if(ORIGINAL[i]){root.TEAMS[i][0]=ORIGINAL[i][0];
     root.TEAMS[i][1]=root.gmTeamPresetName?.(i)||ORIGINAL[i][1];}
 }
 const x=s.franchiseRelocation;
 if(x?.identity&&root.TEAMS[x.team]){
   root.TEAMS[x.team][0]=x.identity.abbreviation;
   root.TEAMS[x.team][1]=x.identity.name;
 }
}
function propose(s,cityKey){
 const x=init(s),city=CONFIG.cities.find(c=>c.key===cityKey);
 if(!city)return {ok:false,error:'Unknown market'};
 if(x.proposal)return {ok:false,error:'A relocation proposal is already pending'};
 if(s.cash<CONFIG.proposal.cost)return {ok:false,error:'Insufficient cash for a relocation feasibility study'};
 s.cash=Math.round((s.cash-CONFIG.proposal.cost)*100)/100;
 x.proposal={year:s.year,cityKey,originalTeam:root.TEAMS?.[s.team]?.[1]||'Your franchise'};
 reaction(s,{kind:'PROPOSAL',city:city.city,fan:CONFIG.proposal.fan,
   media:CONFIG.proposal.media,security:0,message:'Ownership begins studying a move to '+
     city.city+'. Supporters organize to keep the team at home.'});
 return {ok:true,proposal:x.proposal};
}
function decide(s,decision){
 const x=init(s),pending=x.proposal,city=CONFIG.cities.find(c=>c.key===pending?.cityKey);
 if(!city)return {ok:false,error:'No active relocation proposal'};
 if(!['STAY','MOVE'].includes(decision))return {ok:false,error:'Unknown relocation decision'};
 const o=owner(s);
 if(decision==='MOVE'){
   if(s.cash<CONFIG.relocation.cost)return {ok:false,error:'Insufficient relocation funding'};
   if(o&&o.jobSecurity<CONFIG.relocation.minJobSecurity)
     return {ok:false,error:'Owner will not authorize a move with job security this low'};
   s.cash=Math.round((s.cash-CONFIG.relocation.cost)*100)/100;
   const nickname=pending.originalTeam.split(' ').slice(-1)[0],
     abbreviation=city.city.toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
   x.city=city.city;
   x.identity={name:city.city+' '+nickname,abbreviation};
   applyTeamIdentity(s);
   reaction(s,{kind:'RELOCATION_APPROVED',city:city.city,
     fan:city.fanDelta,media:CONFIG.relocation.media,
     security:CONFIG.relocation.ownerSecurity,
     message:'Owner approves the move to '+city.city+
       '. Outgoing supporters protest; the new market embraces the franchise.'});
 }else{
   reaction(s,{kind:'RELOCATION_REJECTED',city:city.city,
     fan:CONFIG.cancel.fan,media:CONFIG.cancel.media,
     security:CONFIG.cancel.ownerSecurity,
     message:'Owner commits to remaining in the current market. Fan groups celebrate.'});
 }
 x.proposal=null;return {ok:true,decision,identity:x.identity};
}
function stadiumDeal(s,kind){
 const cfg=CONFIG.deals[kind],x=init(s);
 if(!cfg)return {ok:false,error:'Unknown stadium proposal'};
 if(x.lastDealYear===s.year)return {ok:false,error:'Already approved a stadium deal this season'};
 if(s.cash<cfg.cost)return {ok:false,error:'Insufficient franchise cash'};
 const o=owner(s);
 if(!o)return {ok:false,error:'Owner data unavailable'};
 const level=Number(o.facilities?.stadium||0);
 if(level>=CONFIG.facilityMax)return {ok:false,error:'Stadium is already at maximum tier'};
 s.cash=Math.round((s.cash-cfg.cost)*100)/100;
 o.facilities??={};
 const gained=Math.min(cfg.tier,CONFIG.facilityMax-level);
 o.facilities.stadium=level+gained;
 x.lastDealYear=s.year;
 reaction(s,{kind:'STADIUM_DEAL',deal:kind,fan:cfg.fan,
   media:cfg.media,security:cfg.security,
   message:cfg.label+' approved, upgrading stadium facilities by '+gained+
     ' tier(s). Reporters question how the project is financed.'});
 return {ok:true,deal:kind,cost:cfg.cost,newTier:o.facilities.stadium};
}
function page(s){
 const x=init(s),o=owner(s),pending=x.proposal;
 return '<div class="eyebrow">FRANCHISE OWNERSHIP</div>'+
   '<h1 class="heading">RELOCATION & STADIUM DEALS</h1>'+
   '<p class="sub">Balance local loyalty, stadium investment and new markets. Division membership stays unchanged after a move.</p>'+
   '<div class="grid three"><div class="card"><h3>HOME MARKET</h3><h2>'+
     esc(x.city||'Original city')+'</h2></div>'+
     '<div class="card"><h3>FAN APPROVAL</h3><h2>'+Math.round(o?.fanHappiness??65)+'%</h2></div>'+
     '<div class="card"><h3>STADIUM TIER</h3><h2>'+
       Number(o?.facilities?.stadium||0)+'/5</h2></div></div>'+
   '<h2>MARKET STUDY</h2>'+
   (pending?'<div class="card"><h3>PROPOSAL UNDER REVIEW</h3><p>Proposed destination: '+
      esc(CONFIG.cities.find(c=>c.key===pending.cityKey)?.city||'Unknown')+
      '</p><p>Relocation requires $'+CONFIG.relocation.cost+'M and at least '+
      CONFIG.relocation.minJobSecurity+'% owner security.</p>'+
      '<button onclick="gmRelocationDecide(\'MOVE\')">APPROVE RELOCATION</button> '+
      '<button onclick="gmRelocationDecide(\'STAY\')">REMAIN AT HOME</button></div>':
    '<div class="grid two">'+CONFIG.cities.map(city=>
     '<div class="card"><h3>'+esc(city.city)+'</h3><p>Market interest '+city.market+
       '/100 · Existing fan reaction '+city.fanDelta+'</p>'+
     '<button onclick="gmRelocationPropose(\''+city.key+'\')">STUDY MOVE · $'+
       CONFIG.proposal.cost+'M</button></div>').join('')+'</div>')+
   '<h2>STADIUM NEGOTIATIONS</h2><div class="grid three">'+
     Object.entries(CONFIG.deals).map(([key,deal])=>
       '<div class="card"><h3>'+esc(deal.label)+'</h3><p>'+esc(deal.description)+'</p>'+
         '<p>Cash cost $'+deal.cost+'M · Fan reaction '+(deal.fan>=0?'+':'')+
         deal.fan+' · Media '+(deal.media>=0?'+':'')+deal.media+'</p>'+
         '<button onclick="gmStadiumDeal(\''+key+'\')">NEGOTIATE DEAL</button></div>').join('')+'</div>'+
   '<h2>OWNER REACTIONS</h2>'+
   (x.history.slice(0,12).map(e=>
     '<div class="card"><div class="eyebrow">'+e.year+' · WEEK '+e.week+
       ' · '+esc(e.kind)+'</div><p>'+esc(e.message)+'</p>'+
       '<p class="muted">Fans '+(e.fan>=0?'+':'')+e.fan+
       ' · Media '+(e.media>=0?'+':'')+e.media+
       ' · Security '+(e.security>=0?'+':'')+e.security+'</p></div>').join('')||
     '<div class="card">No relocation or stadium proposals yet.</div>');
}
root.GMRelocation={CONFIG,init,owner,reaction,originalName:i=>ORIGINAL[i]?.[1],applyTeamIdentity,
 propose,decide,stadiumDeal,page};
root.Gridiron?.register?.('relocation',root.GMRelocation);
root.gmRelocationPropose=id=>{
 const result=root.GMRelocation.propose(state,id);
 if(!result.ok)alert(result.error);else{save();render()}
};
root.gmRelocationDecide=choice=>{
 if(!confirm('Confirm '+(choice==='MOVE'?'relocation approval':'staying in current market')+'?'))return;
 const result=root.GMRelocation.decide(state,choice);
 if(!result.ok)alert(result.error);else{save();render()}
};
root.gmStadiumDeal=id=>{
 const cfg=CONFIG.deals[id];if(!cfg)return;
 if(!confirm('Approve '+cfg.label+' for $'+cfg.cost+'M?'))return;
 const result=root.GMRelocation.stadiumDeal(state,id);
 if(!result.ok)alert(result.error);else{save();render()}
};
})(window);