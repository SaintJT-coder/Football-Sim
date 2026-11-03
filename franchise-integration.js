/* Franchise Integration: depth chart, coaching, scouting and draft helpers. */
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function init(){
 GMFranchise.init(state);
 state.staff??={headCoach:{name:'Head Coach',rating:state.coach||75},offensiveCoordinator:{name:'Offensive Coordinator',rating:70},defensiveCoordinator:{name:'Defensive Coordinator',rating:70},headScout:{name:'Head Scout',rating:70},strengthCoach:{name:'Strength Coach',rating:70}};
 state.draftPolish??={version:1,combine:{},reports:{},focus:'ALL'};
 state.simPresentation??={version:1,reports:[],rankings:[]};
}
function depthPage(){
 init();
 let f=state.franchiseSystems,schemes=f.schemes[state.team]||{};
 return title('Depth Chart & Schemes','Set starters, install schemes, and inspect position depth. Changes are saved with your franchise.','FOOTBALL OPERATIONS')
 +'<div class="grid two"><div class="card"><h3>Offensive scheme</h3><select class="input" onchange="gmSetScheme(\'offense\',this.value)">'+GMFranchise.OFF.map(x=>'<option '+((schemes.offense||'Balanced')===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div><div class="card"><h3>Defensive scheme</h3><select class="input" onchange="gmSetScheme(\'defense\',this.value)">'+GMFranchise.DEF.map(x=>'<option '+((schemes.defense||'Cover 3')===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div></div>'
 +POS.map(pos=>'<div class="card" style="margin:12px 0"><h3>'+pos+'</h3>'+GMFranchise.depth(state,state.team,pos).map((p,i,arr)=>'<div class="row" style="padding:8px 0;border-top:1px solid #29303c;flex-wrap:wrap"><span>'+(i===0?'STARTER':'DEPTH '+(i+1))+' · '+esc(p.name)+' · '+p.rating+' OVR · FIT '+GMFranchise.fit(p,GMFranchise.scheme(state,state.team,['DL','LB','CB','S'].includes(pos)?'defense':'offense'))+(Number(p.injury)>0?' · INJURED':'')+'</span><span><button '+(i===0?'disabled':'')+' onclick="gmMoveDepth(\''+pos+'\','+i+',-1)">↑</button> <button '+(i===arr.length-1?'disabled':'')+' onclick="gmMoveDepth(\''+pos+'\','+i+',1)">↓</button></span></div>').join('')+'</div>').join('');
}
window.gmMoveDepth=(pos,i,d)=>{let ids=GMFranchise.depth(state,state.team,pos).map(p=>p.id),j=i+d;if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];GMFranchise.setDepth(state,state.team,pos,ids);save();render()};
window.gmSetScheme=(side,value)=>{init();if(!(side==='offense'?GMFranchise.OFF:GMFranchise.DEF).includes(value))return;state.franchiseSystems.schemes[state.team]??={};state.franchiseSystems.schemes[state.team][side]=value;save();render()};
function staffPage(){
 init();const labels={headCoach:'Head Coach',offensiveCoordinator:'Offensive Coordinator',defensiveCoordinator:'Defensive Coordinator',headScout:'Head Scout',strengthCoach:'Strength Coach'};
 const money=state.staffBudget??18;
 return title('Coaching Staff','Hire staff, manage your budget and build a coaching tree. Coordinator ratings affect games.','FRONT OFFICE')
 +'<div class="grid three">'+metric('Available cash','$'+Number(state.cash).toFixed(1)+'M')+metric('Annual staff budget','$'+money.toFixed(1)+'M')+metric('Job security',(state.engineExtra?.jobSecurity??state.coach??75)+'/100')+'</div>'
 +'<div class="grid two">'+Object.entries(labels).map(([role,label])=>{const p=state.staff[role],salary=p.salary??+(p.rating*.032).toFixed(1);return '<div class="card"><h3>'+label+'</h3><b>'+esc(p.name)+'</b><p>Rating '+p.rating+'/99 · Salary $'+salary.toFixed(1)+'M</p><p class="muted small">'+(role==='offensiveCoordinator'?'Improves offensive efficiency':role==='defensiveCoordinator'?'Improves defensive efficiency':role==='headScout'?'Supports scouting and prospect evaluations':role==='strengthCoach'?'Improves recovery and conditioning':'Sets coaching culture and owner confidence')+'</p><button onclick="gmHireStaff(\''+role+'\')">Interview replacement</button></div>'}).join('')+'</div>';
}
window.gmHireStaff=role=>{
 init();if(!Object.hasOwn(state.staff,role))return;
 const current=state.staff[role],rating=clamp(Math.round(65+Math.random()*28),55,99),salary=+(rating*.032).toFixed(1),name=['Avery Brooks','Jordan Price','Morgan Carter','Taylor Ellis','Cameron Reed','Devin Hayes'][Math.floor(Math.random()*6)];
 const cost=+(salary*2).toFixed(1);
 if(state.cash<cost)return notice('Not enough cash to hire this coach. Signing cost: $'+cost.toFixed(1)+'M');
 if(!confirm('Hire '+name+' ('+rating+' OVR) as '+role.replace(/([A-Z])/g,' $1')+' for $'+salary+'M/year? $'+cost.toFixed(1)+'M due now.'))return;
 state.cash=+(state.cash-cost).toFixed(2);
 state.staffHistory??=[];state.staffHistory.unshift({year:state.year,role,previous:current.name,replacement:name,rating,salary});
 state.staff[role]={name,rating,salary,years:2};state.news.unshift(name+' hired as '+role.replace(/([A-Z])/g,' $1'));save();render();
};
function combine(p){
 init();let cache=state.draftPolish.combine;if(cache[p.id])return cache[p.id];
 const athletic=clamp(Number(p.athletic)||p.rating||65,35,99),n=(a,b)=>a+Math.random()*(b-a);
 const forty=+(5.45-(athletic-50)*.016+n(-.12,.12)).toFixed(2);
 return cache[p.id]={forty:clamp(forty,4.25,5.65),vertical:Math.round(clamp(25+(athletic-65)*.32+n(-4,4),20,46)),broad:Math.round(clamp(105+(athletic-65)*.4+n(-6,6),90,145)),threeCone:+clamp(7.55-(athletic-65)*.009+n(-.2,.2),6.4,8.2).toFixed(2),shuttle:+clamp(4.6-(athletic-65)*.007+n(-.12,.12),3.8,5.1).toFixed(2),bench:Math.round(clamp(16+(athletic-65)*.2+n(-7,7),5,40))};
}
function scoutPage(){
 init();
 const f=state.frontOffice;
 if(!f?.prospects?.length)return title('Scouting','Open the draft board to generate this year’s prospects.');
 const source=window.GMDraftRealism;
 return title('Scouting Combine','Published grades improve with scouting and review. True ratings remain hidden until drafted.','COLLEGE SCOUTING')
 +'<div class="card"><label>Position focus <select class="input" onchange="gmFocus(this.value)">'+['ALL',...POS].map(x=>'<option '+(state.draftPolish.focus===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><p class="muted small">Scout points: '+(state.upgrades.scoutPoints??20)+' · Head scout: '+state.staff.headScout.rating+'</p><button onclick="page=\'Draft Combine\';render()">OPEN COMBINE & PRO DAY</button></div>'
 +f.prospects.filter(p=>!p.drafted&&(state.draftPolish.focus==='ALL'||p.pos===state.draftPolish.focus))
   .slice().sort((a,b)=>b.projection-a.projection).slice(0,60).map(p=>{
     const level=f.scouted?.[p.id]||0,report=source?.publicGrade(p,state),
       combineReport=report?.combine||null;
     const grade=report?report.overall+' ± '+report.margin:p.projection+' ± 10';
     const confidence=report?report.confidence+'% confidence':'Unverified';
     const measurements=combineReport?
       '40: '+combineReport.forty+'s · Vertical: '+combineReport.vertical+
       '″ · Shuttle: '+combineReport.shuttle+'s · Bench: '+combineReport.bench:
       'Combine results not yet reviewed';
     return '<div class="card" style="margin:10px 0"><div class="row"><b>'+esc(p.name)+' · '+esc(p.pos)+
       '</b><span>SCOUT '+level+'/3</span></div><p class="muted small">'+
       'Projected grade '+esc(grade)+' · '+confidence+
       ' · '+esc(measurements)+'</p><p>'+
       (level>=2?'Detailed scout confidence available':'Scouting detail locked')+
       ' · Exact OVR, ceiling and development trait remain unknown until drafted.</p>'+
       '<button onclick="scoutProspect(\''+p.id+'\')" '+(level>=3?'disabled':'')+'>Scout prospect</button></div>';
   }).join('');
}
window.gmFocus=value=>{if(!['ALL',...POS].includes(value))return;state.draftPolish.focus=value;save();render()};
const oldRender=render;
render=function(){init();if(page==='Depth Chart'||page==='Combine'||page==='Coaching Staff'){nav();$('mobileSeason').textContent=state.year+' W'+state.week;$('app').innerHTML=page==='Depth Chart'?depthPage():page==='Coaching Staff'?staffPage():scoutPage();return}oldRender()};
const i=pages.indexOf('Roster');if(i>=0&&!pages.includes('Depth Chart'))pages.splice(i+1,0,'Depth Chart');
const o=pages.indexOf('Front Office');if(o>=0&&!pages.includes('Coaching Staff'))pages.splice(o+1,0,'Coaching Staff');
const s=pages.indexOf('Scouting');if(s>=0&&!pages.includes('Combine'))pages.splice(s+1,0,'Combine');
init();render();
})();
