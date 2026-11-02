/* Gridiron GM — draft and trade front office v3. Fictional teams and players. */
(function(){
const c=(v,a,b)=>Math.max(a,Math.min(b,v)),cash=v=>'$'+Number(v).toFixed(1)+'M';
const allPos=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const need=(team,pos)=>{let r=roster(team).filter(p=>p.pos===pos).sort((a,b)=>b.rating-a.rating);const desired={QB:2,RB:3,WR:5,TE:3,OL:5,DL:4,LB:4,CB:4,S:3,K:1}[pos];return c((desired-r.length)*5+Math.max(0,78-(r[0]?.rating||55))*.5,-8,30)};
const talent=(p)=>p.rating*1.35+(p.pot-p.rating)*.8+(29-p.age)*.7+(p.years||1)*1.2;
const playerValue=(p,team)=>Math.max(3,talent(p)-55+need(team,p.pos)*.6-(p.salary||0)*.55-(p.injury||0)*2);
const pickValue=(p)=>Math.round(160*Math.pow(.69,p.round-1)*(1.18-(p.slot-1)/Math.max(1,TEAMS.length)*.36));
function init(){
 state.frontOffice??={season:state.year,prospects:[],picks:[],scouted:{},draftLog:[],tradeLog:[],offers:[],selectedOut:[],selectedIn:[],counter:null,round:1,clock:0,boardFilter:'ALL',tradeTab:'Players',draftStarted:false};
 const f=state.frontOffice;
 if(f.season!==state.year){f.season=state.year;f.prospects=[];f.picks=[];f.scouted={};f.draftLog=[];f.offers=[];f.selectedOut=[];f.selectedIn=[];f.round=1;f.clock=0;f.draftStarted=false}
 if(!f.picks.length&&!f.draftStarted){for(let round=1;round<=7;round++)for(let slot=1;slot<=TEAMS.length;slot++)f.picks.push({id:state.year+'-'+round+'-'+slot,round,slot,owner:slot-1,original:slot-1,used:false})}
 if(!f.prospects.length&&!f.draftStarted){
  let first=['Mason','Jalen','Eli','Tyrese','Andre','Malik','Carter','Devin','Noah','Darius','Cole','Bryce','Landon','Kendrick','Jordan','Micah','Dante','Trey'],last=['Holloway','Mercer','Bennett','Sullivan','Bishop','Jefferson','Coleman','Porter','Rivers','Hayes','McCall','Griffin','Walker','Fields','Brooks','King'];
  for(let i=0;i<130;i++){let pos=allPos[i%10],trueRating=rand(56,83),potential=c(trueRating+rand(3,17),60,99),id='rookie-'+state.year+'-'+i;f.prospects.push({id,name:first[rand(0,first.length-1)]+' '+last[rand(0,last.length-1)],pos,age:rand(20,23),rating:trueRating,pot:potential,athletic:rand(55,99),medical:rand(50,100),character:rand(50,100),dev:potential-trueRating>12?'Elite':potential-trueRating>7?'Star':'Normal',projection:Math.round(trueRating+rand(-13,13)),tier:c(Math.ceil((88-trueRating)/6),1,6)})}
 }
 return f;
}
const available=()=>init().picks.filter(p=>!p.used).sort((a,b)=>a.round-b.round||a.slot-b.slot);
const currentPick=()=>available()[0];
function scout(id){let f=init(),p=f.prospects.find(x=>x.id===id);if(!p)return;let s=f.scouted[id]||0;if(s>=3)return;let budget=state.upgrades.scoutPoints??20;if(budget<3)return notice('Need 3 scouting points');state.upgrades.scoutPoints=budget-3;f.scouted[id]=s+1;save();render()}
function grade(p){let s=init().scouted[p.id]||0;return s===0?'?':s===1?Math.round(p.rating/5)*5+' ± 8':s===2?p.rating+' ± 4':p.rating+' OVR'}
function prospectRows(list,action=true){return list.map(p=>'<div class="card" style="margin:8px 0"><div class="row" style="gap:12px;flex-wrap:wrap"><div><b>'+xp(p.name)+'</b> <span class="pill">'+p.pos+'</span><p class="muted small">Age '+p.age+' · Grade '+grade(p)+' · Projected '+p.projection+' · Athletic '+p.athletic+' · Scout '+(init().scouted[p.id]||0)+'/3</p></div><div><button onclick="scoutProspect(\''+p.id+'\')">Scout</button> '+(action?'<button class="primary" onclick="draftProspect(\''+p.id+'\')">Draft</button>':'')+'</div></div></div>').join('')}
function aiDraft(pick){const f=init(),pool=f.prospects.filter(p=>!p.drafted);if(!pool.length)return;pool.sort((a,b)=>(b.rating+b.pot*.2+need(pick.owner,b.pos)*.45)-(a.rating+a.pot*.2+need(pick.owner,a.pos)*.45));selectProspect(pool[0],pick)}
function selectProspect(p,pick){const f=init();if(!p||p.drafted||!pick||pick.used)return false;
 p.drafted=true;pick.used=true;
 const newId=Math.max(...state.players.map(x=>x.id))+1;
 const salary=+(Math.max(.7,5.2-pick.round*.57-pick.slot*.035)).toFixed(2);
 state.players.push({id:newId,name:p.name,pos:p.pos,age:p.age,rating:p.rating,pot:p.pot,salary,team:pick.owner,stats:{yards:0,td:0,tackles:0,sacks:0},injury:0,years:4,target:false,fatigue:0,morale:70,development:0,rookie:true,devTrait:p.dev});
 f.draftLog.push({pick:pick.id,team:pick.owner,player:p.name,pos:p.pos,overall:p.rating,round:pick.round});
 state.news.unshift('Draft: '+TEAMS[pick.owner][1]+' selected '+p.name+' ('+p.pos+')');
 save();return true}
function draftProspect(id){const f=init(),pick=currentPick();if(!pick)return notice('Draft complete');if(pick.owner!==state.team)return notice('AI team is on the clock. Advance to your pick.');let p=f.prospects.find(x=>x.id===id);if(!p||p.drafted)return;const projectedSalary=Math.max(.7,5.2-pick.round*.57-pick.slot*.035);if(capspace()<projectedSalary)return notice('Insufficient cap space for rookie contract');selectProspect(p,pick);render()}
function advanceDraft(){let f=init(),pick=currentPick();if(!pick)return notice('Draft complete');let count=0;while((pick=currentPick())&&pick.owner!==state.team&&count<84){aiDraft(pick);count++}save();render()}
function autoDraft(){let f=init(),count=0;while(currentPick()&&count<84){aiDraft(currentPick());count++}save();render()}
function draftPage(){let f=init(),pick=currentPick(),left=f.prospects.filter(p=>!p.drafted),mine=f.picks.filter(p=>p.owner===state.team&&!p.used);return title('NFL-Style Rookie Draft','Seven rounds · 12 fictional clubs · 84 picks · player development traits','DRAFT WAR ROOM')
 +'<div class="grid three">'+metric('On the clock',pick?TEAMS[pick.owner][0]:'Draft complete')+metric('Overall pick',pick?(pick.round-1)*12+pick.slot:'—')+metric('My remaining picks',mine.length)+metric('Scouting points',state.upgrades.scoutPoints??20)+metric('Prospects available',left.length)+metric('Round',pick?.round||7)+'</div>'
 +'<div class="card" style="margin:16px 0"><h3>Draft controls</h3><button class="primary" onclick="advanceDraft()">Advance to My Pick</button> <button onclick="autoDraft()" >Simulate Remaining Draft</button><p class="muted small">Drafting commits a four-year rookie contract. Scouting reveals ratings in stages. AI selects by talent and roster needs.</p></div>'
 +'<div class="filters">'+['ALL',...allPos].map(pos=>'<button class="'+(f.boardFilter===pos?'selected':'')+'" onclick="state.frontOffice.boardFilter=\''+pos+'\';render()">'+pos+'</button>').join('')+'</div>'
 +heading('PROSPECT BOARD')+prospectRows(left.filter(p=>f.boardFilter==='ALL'||p.pos===f.boardFilter).sort((a,b)=>b.projection-a.projection).slice(0,45))
 +heading('YOUR DRAFT PICKS')+'<div class="card">'+(mine.map(p=>'<p>Round '+p.round+' · Pick '+p.slot+' · Original: '+TEAMS[p.original][0]+'</p>').join('')||'No picks remaining')+'</div>'
 +heading('RECENT SELECTIONS')+'<div class="card">'+(f.draftLog.slice(-20).reverse().map(x=>'<p>R'+x.round+' · '+TEAMS[x.team][0]+' — '+xp(x.player)+' ('+x.pos+')</p>').join('')||'Draft has not started')+'</div>'}
function scoutingPage(){let f=init();return title('Scouting Department','Spend points on prospect reports. Ratings become more accurate with additional scouting.','COLLEGE SCOUTING')
 +'<div class="grid three">'+metric('Scout points',state.upgrades.scoutPoints??20)+metric('Prospects',f.prospects.length)+metric('Fully scouted',Object.values(f.scouted).filter(v=>v===3).length)+'</div>'
 +heading('TEAM NEEDS')+'<div class="grid three">'+allPos.map(pos=>metric(pos+' need',Math.round(need(state.team,pos)))).join('')+'</div>'
 +heading('SCOUTING REPORTS')+prospectRows(f.prospects.filter(p=>!p.drafted).sort((a,b)=>b.projection-a.projection).slice(0,50),false)}
const itemKey=(x)=>x.kind+':'+x.id;
const value=(x,team)=>x.kind==='pick'?pickValue(init().picks.find(p=>p.id===x.id)||{round:7,slot:12}):playerValue(state.players.find(p=>p.id===x.id),team);
function tradeItems(team){let f=init();return [...roster(team).map(p=>({kind:'player',id:p.id,name:p.name+' · '+p.pos+' · '+p.rating+' OVR · '+cash(p.salary),val:Math.round(playerValue(p,team))})),...f.picks.filter(p=>p.owner===team&&!p.used).map(p=>({kind:'pick',id:p.id,name:'R'+p.round+' Pick '+p.slot+' ('+p.id+')',val:pickValue(p)}))]}
function toggleAsset(side,kind,id){let f=init(),list=side==='out'?f.selectedOut:f.selectedIn,key=kind+':'+id,index=list.findIndex(x=>itemKey(x)===key);if(index<0){if(list.length>=6)return notice('Maximum six assets per side');list.push({kind,id})}else list.splice(index,1);f.counter=null;render()}
function tradeValue(items,recipient){return items.reduce((sum,x)=>sum+value(x,recipient),0)}
function tradeAssessment(){let f=init(),other=state.selectedTrade;let ours=tradeValue(f.selectedOut,other),theirs=tradeValue(f.selectedIn,state.team);
 const otherNeeds=f.selectedOut.filter(x=>x.kind==='player').reduce((s,x)=>s+need(other,state.players.find(p=>p.id===x.id)?.pos||'QB')*.5,0);
 const expected=theirs*(1.07+Math.max(0,record(other).l-record(other).w)*.008);
 return {ours,theirs,expected,otherNeeds,accepted:ours+otherNeeds>=expected}}
function propose(){let f=init(),other=state.selectedTrade;if(state.week>12)return notice('Trade deadline has passed');if(!f.selectedOut.length||!f.selectedIn.length)return notice('Select assets from both teams');
 const assess=tradeAssessment();if(!assess.accepted){f.counter={needed:Math.ceil(assess.expected-assess.ours-assess.otherNeeds)};save();render();return}
 const outgoing=f.selectedOut.filter(x=>x.kind==='player').map(x=>state.players.find(p=>p.id===x.id)),incoming=f.selectedIn.filter(x=>x.kind==='player').map(x=>state.players.find(p=>p.id===x.id));
 const myNewCap=capspace()+outgoing.reduce((s,p)=>s+p.salary,0)-incoming.reduce((s,p)=>s+p.salary,0);
 const otherNewCap=state.cap-payroll(other)+incoming.reduce((s,p)=>s+p.salary,0)-outgoing.reduce((s,p)=>s+p.salary,0);
 if(myNewCap<0||otherNewCap<0)return notice('Trade rejected: salary cap violation');
 for(let x of f.selectedOut){if(x.kind==='player')state.players.find(p=>p.id===x.id).team=other;else f.picks.find(p=>p.id===x.id).owner=other}
 for(let x of f.selectedIn){if(x.kind==='player')state.players.find(p=>p.id===x.id).team=state.team;else f.picks.find(p=>p.id===x.id).owner=state.team}
 f.tradeLog.unshift({year:state.year,week:state.week,other,ours:assess.ours,theirs:assess.theirs,assetsOut:f.selectedOut.map(x=>({...x})),assetsIn:f.selectedIn.map(x=>({...x}))});
 state.news.unshift('Trade completed with '+TEAMS[other][1]);f.selectedOut=[];f.selectedIn=[];f.counter=null;save();render()}
function tradePage(){let f=init(),other=state.selectedTrade===state.team?(state.team+1)%TEAMS.length:state.selectedTrade;state.selectedTrade=other;
 const assess=tradeAssessment();
 const side=(team,selected,which)=>'<div class="card"><h3>'+TEAMS[team][1]+'</h3><p class="muted">Select players and draft picks (up to six)</p><div style="max-height:520px;overflow:auto">'+tradeItems(team).map(x=>{let chosen=selected.some(y=>itemKey(y)===itemKey(x));return '<div class="row" style="padding:7px 0;border-bottom:1px solid #29303c;gap:8px"><span class="small">'+xp(x.name)+' <b>Value '+x.val+'</b></span><button class="'+(chosen?'primary':'')+'" onclick="toggleTradeAsset(\''+which+'\',\''+x.kind+'\',\''+x.id+'\')">'+(chosen?'✓':'Add')+'</button></div>'}).join('')+'</div></div>';
 return title('Trade Negotiation Center','Player-for-player, draft pick packages, roster needs, AI evaluation and salary-cap compliance.','GENERAL MANAGER')
 +'<div class="filters">'+TEAMS.map((t,i)=>i===state.team?'':'<button class="'+(other===i?'selected':'')+'" onclick="state.selectedTrade='+i+';state.frontOffice.selectedOut=[];state.frontOffice.selectedIn=[];render()">'+t[0]+'</button>').join('')+'</div>'
 +(state.week>12?'<div class="card">Trade deadline has passed for this season.</div>':'')
 +'<div class="grid two">'+side(state.team,f.selectedOut,'out')+side(other,f.selectedIn,'in')+'</div>'
 +'<div class="card" style="margin-top:14px"><h3>Trade evaluation</h3><div class="grid three">'+metric('You send',Math.round(assess.ours)) +metric('You receive',Math.round(assess.theirs))+metric('AI target',Math.round(assess.expected))+'</div><p class="muted">AI factors in talent, age, potential, contracts, positional needs and pick value. Final approval is never guaranteed until cap validation.</p>'
 +(f.counter?'<p class="notice">Counteroffer: Add approximately '+f.counter.needed+' value to your package.</p>':'')
 +'<button class="primary" onclick="proposeTrade()">Submit Trade Offer</button></div>'
 +heading('TRADE HISTORY')+'<div class="card">'+(f.tradeLog.slice(0,12).map(t=>'<p>'+t.year+' Week '+t.week+' · '+TEAMS[t.other][0]+' · Sent '+Math.round(t.ours)+' / Received '+Math.round(t.theirs)+'</p>').join('')||'No completed trades yet')+'</div>'}
const prevRender=render;
render=function(){init();if(page==='Fantasy Draft'||page==='Draft Board'||page==='Scouting'||page==='Trade Center'){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=page==='Trade Center'?tradePage():page==='Scouting'?scoutingPage():draftPage();return}prevRender()};
window.scoutProspect=scout;window.draftProspect=draftProspect;window.advanceDraft=advanceDraft;window.autoDraft=autoDraft;window.toggleTradeAsset=toggleAsset;window.proposeTrade=propose;
const prevSim=simulate;
simulate=function(){prevSim();const f=init();state.upgrades.scoutPoints=c((state.upgrades.scoutPoints??20)+2,0,50);save()};
init();render();
})();