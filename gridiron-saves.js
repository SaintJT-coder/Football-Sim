/* Save manager: independent slots, import/export and experimental branches. */
(function(w){'use strict';
const KEY='gridiron-gm-save',INDEX='gridiron-gm-save-index-v3',PREFIX='gridiron-gm-slot-v3:',CURRENT='gridiron-gm-current-slot-v3';
const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const clone=v=>JSON.parse(JSON.stringify(v));
const valid=s=>!!(s&&Number.isInteger(s.year)&&s.year>=1900&&s.year<=2500&&Number.isInteger(s.week)&&s.week>=1&&s.week<=30&&Array.isArray(s.players)&&s.players.length>0&&s.players.length<=10000&&Number.isInteger(s.team)&&s.team>=0&&s.team<(w.TEAMS?.length||32));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const index=()=>Array.isArray(read(INDEX))?read(INDEX):[];
const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const activeId=()=>localStorage.getItem(CURRENT);
const meta=(s,name,branchOf)=>({name:String(name||'Franchise').slice(0,80),year:s.year,week:s.week,team:s.team,lastPlayed:new Date().toISOString(),branchOf:branchOf||null});
function write(s,name,slotId,branchOf){if(!valid(s))throw Error('Invalid franchise state');const key=slotId||id(),entries=index(),previous=entries.find(x=>x.id===key);const info={id:key,...meta(s,name||previous?.name,branchOf===undefined?previous?.branchOf:branchOf)};localStorage.setItem(PREFIX+key,JSON.stringify(s));const updated=[info,...entries.filter(x=>x.id!==key)];localStorage.setItem(INDEX,JSON.stringify(updated));return info}
function snapshot(s){const key=activeId();if(!key)return;const info=index().find(x=>x.id===key);if(!info)return;write(s,info.name,key)}
function create(s,name){const info=write(s,name);localStorage.setItem(CURRENT,info.id);return info}
function activate(slotId){const entry=index().find(x=>x.id===slotId),data=read(PREFIX+slotId);if(!entry||!valid(data))throw Error('Save slot is missing or invalid');localStorage.setItem(CURRENT,slotId);localStorage.setItem(KEY,JSON.stringify(data));return clone(data)}
function branch(s,name){const parent=activeId();const info=write(clone(s),name||'What If: '+(index().find(x=>x.id===parent)?.name||'Franchise'),undefined,parent);localStorage.setItem(CURRENT,info.id);localStorage.setItem(KEY,JSON.stringify(s));return info}
function remove(slotId){const entries=index();if(!entries.some(x=>x.id===slotId))return;localStorage.removeItem(PREFIX+slotId);localStorage.setItem(INDEX,JSON.stringify(entries.filter(x=>x.id!==slotId)));if(activeId()===slotId){localStorage.removeItem(CURRENT);const remaining=entries.filter(x=>x.id!==slotId);if(remaining.length)activate(remaining[0].id);else localStorage.removeItem(KEY)}}
function rename(slotId,name){const entry=index().find(x=>x.id===slotId);if(!entry)throw Error('Save not found');return write(read(PREFIX+slotId),String(name||entry.name).trim(),slotId)}
function exportSave(slotId){const data=read(PREFIX+slotId),entry=index().find(x=>x.id===slotId);if(!valid(data)||!entry)throw Error('Save not found');const json=JSON.stringify({format:'gridiron-gm',version:3,metadata:entry,state:data},null,2);const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gridiron-'+entry.name.replace(/[^a-z0-9-]/gi,'-').slice(0,35)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function importSave(file){if(!file||file.size>20*1024*1024)throw Error('JSON file must be under 20 MB');const payload=JSON.parse(await file.text());if(payload.format!=='gridiron-gm'||!valid(payload.state)||payload.state.players.length>10000||payload.state.week<1||payload.state.week>30||payload.state.year<1900||payload.state.year>2500)throw Error('Unsupported or invalid Gridiron save');return write(payload.state,payload.metadata?.name||'Imported Franchise')}
function bootstrap(s){if(!valid(s))return;const current=activeId();if(current&&index().some(x=>x.id===current))return;const existing=index()[0];if(existing){localStorage.setItem(CURRENT,existing.id);return}const info=write(s,'Original Franchise');localStorage.setItem(CURRENT,info.id)}
function compare(slotId){
 const item=index().find(x=>x.id===slotId);if(!item?.branchOf)return null;
 const parent=index().find(x=>x.id===item.branchOf);
 const childData=read(PREFIX+slotId),parentData=read(PREFIX+item.branchOf);
 if(!parent||!valid(childData)||!valid(parentData))return null;
 const wins=(data)=>{
   const own=data.team,year=data.year;
   return (data.results||[]).filter(g=>g.year===year&&
     (g.a===own||g.b===own)&&((g.sa>g.sb?g.a:g.b)===own)).length;
 };
 return {parentName:parent.name,yearDelta:childData.year-parentData.year,
   weekDelta:childData.week-parentData.week,
   cashDelta:Math.round((childData.cash-parentData.cash)*10)/10,
   winsDelta:wins(childData)-wins(parentData),
   note:childData.year===parentData.year?'Same-season comparison':'Different seasons: win difference is not a like-for-like result'};
}
function page(s){
 bootstrap(s);
 const entries=index(),current=activeId();
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
const api={index,activeId,bootstrap,snapshot,create,activate,branch,remove,rename,exportSave,importSave,compare,page};
w.Gridiron?.register('saves',api);w.GMSaveManager=api;
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