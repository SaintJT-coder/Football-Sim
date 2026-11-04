/* Save manager: independent slots, import/export and experimental branches. */
(function(w){'use strict';
const KEY='gridiron-gm-save',INDEX='gridiron-gm-save-index-v3',PREFIX='gridiron-gm-slot-v3:',CURRENT='gridiron-gm-current-slot-v3',LEGACY='gridiron-gm-slots-v2',LEGACY_DONE='gridiron-gm-v2-imported-v3';
const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const clone=v=>JSON.parse(JSON.stringify(v));
const valid=s=>!!(s&&Number.isInteger(s.year)&&s.year>=1900&&s.year<=2500&&Number.isInteger(s.week)&&s.week>=1&&s.week<=30&&Array.isArray(s.players)&&s.players.length>0&&s.players.length<=10000&&Number.isInteger(s.team)&&s.team>=0&&s.team<(w.TEAMS?.length||32));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const index=()=>Array.isArray(read(INDEX))?read(INDEX):[];
const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const activeId=()=>localStorage.getItem(CURRENT);
function restore(){
 const slotId=activeId();
 if(!slotId||!index().some(x=>x.id===slotId))return null;
 const data=read(PREFIX+slotId);
 return valid(data)?clone(data):null;
}
const meta=(s,name,branchOf)=>({name:String(name||'Franchise').slice(0,80),year:s.year,week:s.week,team:s.team,lastPlayed:new Date().toISOString(),branchOf:branchOf||null});
function write(s,name,slotId,branchOf){if(!valid(s))throw Error('Invalid franchise state');const key=slotId||id(),entries=index(),previous=entries.find(x=>x.id===key);const info={id:key,...meta(s,name||previous?.name,branchOf===undefined?previous?.branchOf:branchOf)};localStorage.setItem(PREFIX+key,JSON.stringify(s));const updated=[info,...entries.filter(x=>x.id!==key)];localStorage.setItem(INDEX,JSON.stringify(updated));return info}
function snapshot(s){const key=activeId();if(!key)return;const info=index().find(x=>x.id===key);if(!info)return;write(s,info.name,key)}
function create(s,name){const info=write(s,name);localStorage.setItem(CURRENT,info.id);return info}
function activate(slotId){const entry=index().find(x=>x.id===slotId),data=read(PREFIX+slotId);if(!entry||!valid(data))throw Error('Save slot is missing or invalid');localStorage.setItem(CURRENT,slotId);localStorage.setItem(KEY,JSON.stringify(data));return clone(data)}
function branch(s,name){
 // Store the exact fork point in the parent before changing the active timeline.
 // A second save of the branch must never alter this parent snapshot.
 const parent=activeId(),parentEntry=index().find(x=>x.id===parent);
 if(parentEntry)write(clone(s),parentEntry.name,parent,parentEntry.branchOf);
 const info=write(clone(s),name||'What If: '+(parentEntry?.name||'Franchise'),undefined,parent||null);
 localStorage.setItem(CURRENT,info.id);
 localStorage.setItem(KEY,JSON.stringify(s));
 return info;
}
function remove(slotId){
 const entries=index(),target=entries.find(x=>x.id===slotId);
 if(!target)return false;
 const wasActive=activeId()===slotId,remaining=entries.filter(x=>x.id!==slotId);
 localStorage.removeItem(PREFIX+slotId);
 localStorage.setItem(INDEX,JSON.stringify(remaining));
 if(wasActive){
   localStorage.removeItem(CURRENT);
   // Prefer the original universe when deleting an active What If branch.
   const preferred=remaining.find(x=>x.id===target.branchOf&&valid(read(PREFIX+x.id)))||
     remaining.find(x=>valid(read(PREFIX+x.id)));
   if(preferred)activate(preferred.id);
   else localStorage.removeItem(KEY);
 }
 return true;
}
function rename(slotId,name){const entry=index().find(x=>x.id===slotId);if(!entry)throw Error('Save not found');return write(read(PREFIX+slotId),String(name||entry.name).trim(),slotId)}
function exportSave(slotId){const data=read(PREFIX+slotId),entry=index().find(x=>x.id===slotId);if(!valid(data)||!entry)throw Error('Save not found');const json=JSON.stringify({format:'gridiron-gm',version:3,metadata:entry,state:data},null,2);const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gridiron-'+entry.name.replace(/[^a-z0-9-]/gi,'-').slice(0,35)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function importSave(file){if(!file||file.size>20*1024*1024)throw Error('JSON file must be under 20 MB');const payload=JSON.parse(await file.text());if(payload.format!=='gridiron-gm'||!valid(payload.state)||payload.state.players.length>10000||payload.state.week<1||payload.state.week>30||payload.state.year<1900||payload.state.year>2500)throw Error('Unsupported or invalid Gridiron save');return write(payload.state,payload.metadata?.name||'Imported Franchise')}
function bootstrap(s){
 const current=activeId();
 if(current&&restore())return;
 const existing=index().find(x=>valid(read(PREFIX+x.id)));
 if(existing){
   localStorage.setItem(CURRENT,existing.id);
   const data=read(PREFIX+existing.id);
   localStorage.setItem(KEY,JSON.stringify(data));
   return;
 }
 if(!valid(s))return;
 const info=write(s,'Original Franchise');
 localStorage.setItem(CURRENT,info.id);
 localStorage.setItem(KEY,JSON.stringify(s));
}
function legacyPending(){
 const slots=read(LEGACY),done=read(LEGACY_DONE);
 if(!Array.isArray(slots))return [];
 const imported=Array.isArray(done)?done:[];
 return slots.slice(0,3).map((record,i)=>({record,i})).filter(({record,i})=>
   valid(record?.data)&&!imported.includes(i)&&
   !index().some(entry=>entry.id==='legacy-v2-'+(i+1)));
}
function importLegacySlots(){
 const pending=legacyPending(),done=read(LEGACY_DONE);
 const seen=Array.isArray(done)?done.slice():[],imported=[];
 for(const {record,i} of pending){
   const info=write(clone(record.data),'Legacy Slot '+(i+1)+' · '+
     (w.TEAMS?.[record.data.team]?.[1]||'Franchise'),'legacy-v2-'+(i+1),null);
   imported.push(info);
   seen.push(i);
   localStorage.setItem(LEGACY_DONE,JSON.stringify(seen));
 }
 return imported;
}
function compare(slotId){
 const item=index().find(x=>x.id===slotId);
 if(!item?.branchOf)return null;
 const parent=index().find(x=>x.id===item.branchOf),childData=read(PREFIX+slotId),
   parentData=read(PREFIX+item.branchOf);
 if(!parent||!valid(childData)||!valid(parentData))return null;
 const performance=s=>{
   const recent=(s.results||[]).filter(g=>g.year===s.year&&(g.a===s.team||g.b===s.team));
   const wins=recent.filter(g=>(g.sa>g.sb?g.a:g.b)===s.team).length;
   const active=s.players.filter(p=>p.team===s.team);
   const overall=active.length?Math.round(active.reduce((sum,p)=>sum+(p.rating||0),0)/active.length*10)/10:0;
   const injured=active.filter(p=>Number(p.injury||0)>0).length;
   const titles=(s.history||[]).filter(h=>h.year<=s.year&&h.champ===w.TEAMS?.[s.team]?.[1]).length;
   const championships=(s.leagueNarratives?.champions||[]).filter(h=>h.team===s.team).length;
   const security=s.ownerFranchise?.jobSecurity??s.engineExtra?.jobSecurity??null;
   const press=(s.immersionPress?.history||[]).filter(m=>m.completed).length;
   return {wins,losses:recent.length-wins,played:recent.length,roster:active.length,
     overall,injured,cap:Number(s.cap)||0,cash:Number(s.cash)||0,
     titles:championships||titles,security,press,
     events:(s.news||[]).length};
 };
 const child=performance(childData),original=performance(parentData);
 const difference=(a,b)=>Math.round(((Number(a)||0)-(Number(b)||0))*10)/10;
 const sameSeason=childData.year===parentData.year;
 return {parentName:parent.name,parentId:parent.id,branchName:item.name,
   yearDelta:childData.year-parentData.year,weekDelta:childData.week-parentData.week,
   cashDelta:difference(child.cash,original.cash),
   winsDelta:difference(child.wins,original.wins),
   recordDelta:child.played-original.played,
   titleDelta:child.titles-original.titles,
   overallDelta:difference(child.overall,original.overall),
   capDelta:difference(child.cap,original.cap),
   injuredDelta:child.injured-original.injured,
   securityDelta:child.security==null||original.security==null?null:difference(child.security,original.security),
   pressDelta:child.press-original.press,
   child,original,sameSeason,
   note:sameSeason?'Same-season win comparisons':'Different seasons: records reflect different schedules and are not directly comparable'};
}
function labPage(s){
 const entries=index(),active=activeId(),
   branches=entries.filter(e=>e.branchOf),main=entries.filter(e=>!e.branchOf),
   current=entries.find(e=>e.id===active),delta=current?.branchOf?compare(active):null;
 const metric=(label,value)=>'<div class="gm-save-stat"><small>'+esc(label)+'</small><strong>'+
   esc(String(value))+'</strong></div>';
 const sign=n=>(n==null?'—':(n>0?'+':'')+n);
 const compareCard=d=>'<div class="gm-save-compare">'+
   '<div class="gm-save-compare-head"><span>'+esc(d.parentName)+'</span><span>WHAT IF: '+esc(d.branchName)+'</span></div>'+
   '<div class="gm-save-metrics">'+metric('ORIGINAL RECORD',d.original.wins+'–'+d.original.losses)+
     metric('WHAT IF RECORD',d.child.wins+'–'+d.child.losses)+
     metric('CASH CHANGE',sign(d.cashDelta)+'M')+
     metric('ROSTER RATING',sign(d.overallDelta))+
     metric('INJURED PLAYERS',sign(d.injuredDelta))+
     metric('CHAMPIONSHIP CHANGE',sign(d.titleDelta))+
     metric('CAP CHANGE',sign(d.capDelta)+'M')+
     metric('JOB SECURITY',sign(d.securityDelta))+'</div>'+
   '<p class="muted">'+esc(d.note)+'</p></div>';
 const branchCard=e=>{
   const d=compare(e.id);
   return '<article class="gm-save-card '+(e.id===active?' gm-save-active':'')+'">'+
     '<div class="gm-save-tree">'+(e.id===active?'ACTIVE ALTERNATE':'ALTERNATE UNIVERSE')+'</div>'+
     '<h3>'+esc(e.name)+'</h3><p>Season '+e.year+' · Week '+e.week+'</p>'+
     (d?'<p>vs '+esc(d.parentName)+' · Cash '+sign(d.cashDelta)+'M · Titles '+sign(d.titleDelta)+
       ' · Rating '+sign(d.overallDelta)+'</p>':
       '<p class="muted">Original timeline unavailable for comparison.</p>')+
     '<button onclick="gmLoadSlot('+JSON.stringify(e.id).replace(/"/g,'&quot;')+
       ')"'+(e.id===active?' disabled':'')+'>'+(e.id===active?'CURRENT':'OPEN TIMELINE')+'</button></article>';
 };
 return '<section class="gm-p7"><div class="gm-p7-hero"><div class="gm-p7-eyebrow">GRIDIRON MULTIVERSE</div>'+
   '<h1>WHAT IF LAB</h1><p>Explore different drafts, trades, contracts, starting lineups and playoff futures without rewriting the original franchise.</p></div>'+
   '<div class="gm-save-hero"><div class="eyebrow">CREATE AN ALTERNATE FUTURE</div>'+
   '<h2>ONE DECISION. TWO DIFFERENT SEASONS.</h2>'+
   '<p>A What If timeline starts as an independent copy of the active franchise at this exact point. Each future save changes only its own timeline.</p>'+
   '<button class="primary" onclick="gmWhatIf()">CREATE WHAT IF BRANCH</button> '+
   (current?.branchOf?'<button onclick="gmReturnToParent()">RETURN TO PARENT TIMELINE</button>':'')+
   '</div>'+
   (delta?'<h2 class="gm-p7-heading">YOUR ACTIVE TIMELINE VS THE ORIGINAL</h2>'+compareCard(delta):
     '<div class="gm-save-archive-note">'+(current?.branchOf?'Your parent save could not be loaded.':
     'You are on a main timeline. Create a What If branch to compare futures.')+'</div>')+
   '<h2 class="gm-p7-heading">YOUR ALTERNATE UNIVERSES · '+branches.length+'</h2>'+
   '<div class="grid two">'+(branches.map(branchCard).join('')||
     '<div class="card">No What If branches yet.</div>')+'</div>'+
   '<h2 class="gm-p7-heading">ORIGINAL TIMELINES · '+main.length+'</h2>'+
   '<div class="grid two">'+main.map(e=>'<div class="gm-save-card"><h3>'+esc(e.name)+'</h3>'+
     '<p>Season '+e.year+' · Week '+e.week+'</p>'+
     '<button onclick="gmLoadSlot('+JSON.stringify(e.id).replace(/"/g,'&quot;')+
     ')"'+(e.id===active?' disabled':'')+'>'+(e.id===active?'CURRENT':'LOAD ORIGINAL')+'</button></div>').join('')+'</div>';
}
function page(s){
 // Do not create a phantom franchise just because an unsaved visitor opens Load Game.
 if(index().length||valid(read(KEY)))bootstrap(s);
 const entries=index(),current=activeId(),oldSaves=legacyPending();
 const active=entries.find(e=>e.id===current),parent=entries.find(e=>e.id===active?.branchOf);
 const branches=entries.filter(e=>e.branchOf),main=entries.filter(e=>!e.branchOf);
 const actions=e=>'<div class="gm-save-actions">'+
   '<button onclick="gmLoadSlot(\''+e.id+'\')"'+(e.id===current?' disabled':'')+'>'+
     (e.id===current?'CURRENT SAVE':'LOAD SAVE')+'</button>'+
   '<button onclick="gmRenameSlot(\''+e.id+'\')">RENAME</button>'+
   '<button onclick="gmExportSlot(\''+e.id+'\')">EXPORT JSON</button>'+
   '<button onclick="gmDeleteSlot(\''+e.id+'\')">DELETE</button></div>';
 const card=e=>{
   const rootEntry=entries.find(x=>x.id===e.branchOf),delta=compare(e.id);
   const comparison=delta?'<div class="gm-save-lineage">PARENT: '+
     esc(delta.parentName)+' · Cash '+(delta.cashDelta>=0?'+':'')+delta.cashDelta+
     'M · Wins '+(delta.winsDelta>=0?'+':'')+delta.winsDelta+
     ' · Titles '+(delta.titleDelta>=0?'+':'')+delta.titleDelta+
     ' · OVR '+(delta.overallDelta>=0?'+':'')+delta.overallDelta+
     ' · Year '+(delta.yearDelta>=0?'+':'')+delta.yearDelta+
     '<div class="muted small">'+esc(delta.note)+'</div></div>':
     (e.branchOf?'<div class="gm-save-lineage">Parent branch not found or deleted.</div>':'');
   return '<article class="gm-save-card '+(e.branchOf?'gm-save-branch':'')+
     (e.id===current?' gm-save-active':'')+'"><div class="gm-save-tree">'+
     (e.branchOf?'⤷ ALTERNATE UNIVERSE':'◆ MAIN TIMELINE')+
     (e.id===current?' · ACTIVE':'')+'</div><h3>'+esc(e.name)+'</h3>'+
     '<p class="muted">'+esc(String(e.year))+' · Week '+esc(String(e.week))+
     ' · '+esc(new Date(e.lastPlayed).toLocaleString())+'</p>'+
     (e.branchOf?'<span class="gm-save-label">WHAT IF</span>':'')+
     comparison+actions(e)+'</article>';
 };
 return '<div class="eyebrow">FRANCHISE SAVE VAULT</div><h1 class="heading">SAVE MANAGER</h1>'+
   '<p class="sub">Build alternate timelines without overwriting the original franchise. Each universe stores its own independent roster, results, contracts, decisions and league history.</p>'+
   '<div class="gm-save-hero"><div class="eyebrow">WHAT IF • PARALLEL UNIVERSES</div>'+
   '<h2>WHAT IF YOU COULD REWRITE THE SEASON?</h2>'+
   '<p>Branch the current save before a draft, trade, contract decision, or playoff game. Your original timeline stays intact, so you can compare outcomes later.</p>'+
   '<button onclick="gmWhatIf()">✦ CREATE NEW WHAT IF TIMELINE</button>'+
   (parent?'<button onclick="gmReturnToParent()">↶ RETURN TO ORIGINAL TIMELINE</button>':'')+
   '</div>'+
   (oldSaves.length?'<div class="card" style="border-color:#bdab4f"><h3>LEGACY FRANCHISES FOUND</h3>'+
     '<p>'+oldSaves.length+' old v2 franchise(s) are available. Importing creates independent v3 copies; the originals remain untouched.</p>'+
     '<button onclick="gmImportLegacy()">IMPORT OLD SAVES</button></div>':'')+
   '<div class="card"><button class="primary" onclick="gmSaveNew()">SAVE AS NEW SLOT</button> '+
     '<button onclick="gmSaveCurrent()">SAVE CURRENT</button> '+
     '<button onclick="document.getElementById(\'gm-import-json\').click()">IMPORT JSON</button>'+
     '<input id="gm-import-json" type="file" accept=".json,application/json" '+
       'style="display:none" onchange="gmImportSave(this.files[0])"></div>'+
   (active?.branchOf?'<div class="card" style="border-color:#44987b"><b>ALTERNATE UNIVERSE ACTIVE</b>'+
     '<p>You are in '+esc(active.name)+'. The parent timeline '+
     esc(parent?.name||'(parent deleted)')+' is saved separately.</p></div>':'')+
   '<h2 class="section">MAIN TIMELINES · '+main.length+'</h2>'+
   '<div class="grid two">'+main.map(card).join('')+'</div>'+
   '<h2 class="section">WHAT IF BRANCHES · '+branches.length+'</h2>'+
   (branches.length?'<div class="grid two">'+branches.map(card).join('')+'</div>':
     '<div class="card">No alternate timelines yet. Create a What If branch to explore a different outcome without replacing your main save.</div>');
}
const api={index,activeId,restore,bootstrap,legacyPending,importLegacySlots,snapshot,create,activate,branch,remove,rename,exportSave,importSave,compare,page,labPage};
w.Gridiron?.register('saves',api);w.GMSaveManager=api;
w.gmImportLegacy=()=>{
 const pending=legacyPending();
 if(!pending.length)return alert('No older franchises require importing.');
 if(!confirm('Import '+pending.length+' legacy franchise(s) into named saves? Original legacy data will be preserved.'))return;
 try{
   const imported=importLegacySlots();
   if(!imported.length)return alert('No franchises imported.');
   if(!activeId()){activate(imported[0].id);location.reload();return}
   render();
 }catch(e){alert('Import failed: '+e.message)}
};
w.gmSaveNew=()=>{const name=prompt('Name this franchise save:','My Franchise');if(!name)return;try{create(state,name);save();render()}catch(e){alert(e.message)}};
w.gmSaveCurrent=()=>{try{if(!activeId())create(state,'Franchise');else snapshot(state);save();render()}catch(e){alert(e.message)}};
w.gmWhatIf=()=>{const name=prompt('Name your alternate universe:','What If: '+(index().find(x=>x.id===activeId())?.name||'Franchise'));if(!name)return;try{branch(state,name);save();render()}catch(e){alert(e.message)}};
w.gmReturnToParent=()=>{const active=index().find(e=>e.id===activeId());if(!active?.branchOf)return alert('This is a main timeline');const parent=index().find(e=>e.id===active.branchOf);if(!parent)return alert('The original timeline no longer exists');w.gmLoadSlot(parent.id)};
w.gmLoadSlot=slotId=>{if(!confirm('Load this franchise? Unsaved changes to the current game may be lost.'))return;try{activate(slotId);location.reload()}catch(e){alert(e.message)}};
w.gmRenameSlot=slotId=>{const current=index().find(x=>x.id===slotId);if(!current)return;const name=prompt('Rename save:',current.name);if(name?.trim()){try{rename(slotId,name);render()}catch(e){alert(e.message)}}};
w.gmExportSlot=slotId=>{try{exportSave(slotId)}catch(e){alert(e.message)}};
w.gmDeleteSlot=slotId=>{if(!confirm('Permanently delete this save slot?'))return;const wasActive=activeId()===slotId;remove(slotId);if(wasActive){location.reload();return}render()};
w.gmImportSave=async file=>{try{const entry=await importSave(file);alert('Imported '+entry.name+'. Choose LOAD to open it.');render()}catch(e){alert(e.message)}};
})(window);