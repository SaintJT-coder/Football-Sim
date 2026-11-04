/* Gridiron GM — draft presentation and storage-write regression.
 * Run: node tests/draft-presentation-qa-smoke.js
 * Uses Node built-ins only. No browser, npm packages, or network needed. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=['draft-scouting-advanced.js','draft-realism.js',
 'contracts-advanced.js','frontoffice.js','first-pick-broadcast.js','draftnight.js'];
const TEAMS=Array.from({length:32},(_,i)=>['T'+i,'Club '+i,
 (i<16?'Union':'Liberty')+' North']);
const POS=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
let id=0;
const state={year:2026,week:1,team:0,cash:180,cap:350,
 players:TEAMS.flatMap((_,t)=>Array.from({length:30},(_,j)=>({
  id:id++,name:'Test Player '+t+'-'+j,team:t,pos:POS[j%10],
  age:27,rating:70+j%15,pot:96,years:4,salary:4,
  injury:0,stats:{},rosterStatus:'ACTIVE'
 }))),upgrades:{scoutPoints:80},news:[],results:[]};
const elements=Object.create(null);
const elementsMade=[];
function createElement(tag){
 const el={
  tagName:tag,style:{},children:[],listeners:{},innerHTML:'',
  textContent:'',className:'',removed:false,attributes:{},value:'',
  setAttribute(k,v){this.attributes[k]=v},
  addEventListener(k,fn){this.listeners[k]=fn},
  append(...nodes){this.children.push(...nodes)},
  appendChild(node){this.append(node)},
  remove(){this.removed=true;if(this.id)delete elements[this.id]},
  classList:{add(){},remove(){}}
 };
 elementsMade.push(el);return el;
}
const document={
 createElement,head:{appendChild(){}},
 body:{appendChild(el){if(el.id)elements[el.id]=el}},
 getElementById:id=>elements[id]??null
};
elements.app=createElement('div');
elements.mobileSeason=createElement('div');
let saves=0,slot='franchise-1';
const scope={window:null,document,state,TEAMS,console,
 Math,JSON,Gridiron:{register(){}},page:'Dashboard',
 GMSaveManager:{activeId:()=>slot},
 rand:(a,b)=>a+Math.floor(Math.random()*(b-a+1)),
 roster:(t=state.team)=>state.players.filter(p=>p.team===t),
 capspace:()=>1000,
 save:()=>{saves++},render:()=>{},simulate:()=>{},nav:()=>{},
 $:id=>elements[id]??createElement('div'),
 title:()=>'',metric:()=>'',heading:()=>'',xp:x=>x,
 notice:message=>{throw Error(message)},
 alert:message=>{throw Error(message)},
 setInterval:()=>1,clearInterval:()=>{},
 setTimeout:()=>1,clearTimeout:()=>{}
};
scope.window=scope;
vm.createContext(scope);
for(const filename of files){
 const text=fs.readFileSync(path.join(root,filename),'utf8');
 new vm.Script(text,{filename}).runInContext(scope,{timeout:10000});
}
assert.equal(state.frontOffice.picks.length,224);
assert.ok(state.frontOffice.prospects.length>=224);

// Preview action must create an actual iframe document with a canvas animation.
scope.playDraftAnimationPreview();
let overlay=elements['dn-first-pick-broadcast'];
assert.ok(overlay,'Preview button created no visible overlay');
let iframe=overlay.children.find(x=>x.tagName==='iframe');
assert.ok(iframe,'No broadcast iframe was inserted');
assert.match(iframe.srcdoc,/requestAnimationFrame\(loopStep\)/);
assert.match(iframe.srcdoc,/<canvas id="c"><\/canvas>/);
assert.match(iframe.srcdoc,/Rookie Prospect/);
assert.ok(overlay.children.some(x=>x.textContent.includes('REPLAY BROADCAST')));
scope.closeFirstPickBroadcast();
assert.ok(overlay.removed,'Broadcast close did not clear overlay');

// The draft intro must occur once per franchise per draft year, not just once
// in the app's lifetime, and must display the actual 32-team league size.
scope.page='Draft Board';
scope.render();
assert.ok(elements['dn-intro'],'Draft board did not launch intro');
assert.match(elements['dn-intro'].innerHTML,/32 FRANCHISES/);
scope.closeDraftIntro();
scope.page='Dashboard';scope.render();
scope.page='Draft Board';scope.render();
assert.ok(!elements['dn-intro'],'Opening same year should not replay intro');
state.year=2027;scope.render();
assert.ok(elements['dn-intro'],'Next year did not receive its own intro');
scope.closeDraftIntro();
state.year=2026;
scope.render(); // Refresh the draft class after deliberately switching test seasons.

// A normal first overall pick must save exactly once and play its cutscene.
const before=saves;
const first=state.frontOffice.prospects[0];
scope.draftProspect(first.id);
assert.equal(state.frontOffice.draftLog.length,1);
assert.equal(saves-before,1,'User selection was not saved immediately');
overlay=elements['dn-first-pick-broadcast'];
assert.ok(overlay,'First overall selection did not trigger broadcast');
iframe=overlay.children.find(x=>x.tagName==='iframe');
assert.match(iframe.srcdoc,/DRAFT_PLAYER_NAME/);
assert.match(iframe.srcdoc,new RegExp(first.name));
scope.closeFirstPickBroadcast();

// Auto-draft should write one batch snapshot after the remaining 223 picks.
const beforeCpu=saves;
scope.autoDraft();
assert.equal(state.frontOffice.draftLog.length,224);
assert.equal(state.frontOffice.picks.filter(p=>p.used).length,224);
assert.equal(saves-beforeCpu,1,
 'Auto-draft must not make a costly localStorage write for every CPU pick');
assert.equal(state.players.filter(p=>p.rookieDraft?.year===2026).length,224);
assert.match(scope.render.toString(),/introShownFor/);

console.log('PASS: 32-team annual draft intro, first-pick canvas preview, open/close replay, one save per user pick, one save per full CPU draft');
