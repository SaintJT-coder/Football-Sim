/* QA regression for main-menu saves, legacy scouting and roster contract paths.
   Run: node tests/qa-menu-roster-scouting-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const base=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(base,'Main HTML has no inline script');
new vm.Script(base,{filename:'index.html inline script'});
const menu=fs.readFileSync(path.join(root,'menu.js'),'utf8');
const integration=fs.readFileSync(path.join(root,'franchise-integration.js'),'utf8');
new vm.Script(menu,{filename:'menu.js'});
new vm.Script(integration,{filename:'franchise-integration.js'});
assert.match(menu,/id="gm-franchise-name"/);
assert.doesNotMatch(menu.slice(menu.indexOf('function newGame()'),
 menu.indexOf('function legacy(')),/id="gm-slot"/,'New game must not display v2 slots');
assert.match(menu,/GMSaveManager\?\.create\(s,saveName\)/);

// Test the EXACT production index.html functions using a synthetic franchise.
function functionCode(src,start,end){
 const a=src.indexOf(start),b=src.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Cannot locate '+start);
 return src.slice(a,b);
}
const handlers=[
 functionCode(base,'function target(id)','function draft()'),
 functionCode(base,'function release(id)','function sign(id)'),
 functionCode(base,'function sign(id)','function office()')
].join('\n');
const players=[
 {id:100,team:0,name:'User QB',salary:8,years:3,target:false},
 {id:245,team:0,name:'User WR',salary:11,years:3,target:false},
 {id:950,team:-1,name:'Free Agent WR',salary:4,years:2,target:false}
];
const state={team:0,year:2026,players,cash:100,news:[]};
let released=0,registered=0,saves=0;
const scope={state,window:{
 GMContractsAdvanced:{release:(p,s)=>{released++;p.team=-1;return {ok:true,deadCap:11}}},
 GMContractEconomy:{registerSigning:(p,s,offer)=>{
   registered++;assert.equal(offer.years,2);assert.equal(offer.salary,4);return {ok:true};
 }}
},TEAMS:[['T','Team 0','Union North']],
 confirm:()=>true,capspace:()=>150,
 notice:message=>{throw Error(message)},
 save:()=>saves++,render:()=>{}};
const actions=vm.runInNewContext(handlers+';({target,release,sign})',scope);
actions.target(245);
assert.equal(players[1].target,true,'Target must resolve by player ID, not array index');
actions.release(100);
assert.equal(released,1,'Legacy Roster must call the contract accounting release API');
assert.equal(players[0].team,-1);
assert.match(state.news[0],/11M dead cap/);
actions.sign(950);
assert.equal(registered,1,'Legacy signing must register in advanced contract ledger');
assert.equal(players[2].team,0);
assert.equal(players[2].years,2);
assert.equal(saves,3);

// The older Combine view must NOT expose true pre-draft OVR or potential.
const oldCombine=functionCode(integration,'function scoutPage()','window.gmFocus=');
const prospect={id:'rookie-2026-19',name:'Hidden Talent',pos:'QB',
 rating:99,pot:99,projection:54,athletic:99,drafted:false};
const combineState={year:2026,team:0,
 frontOffice:{prospects:[prospect],scouted:{[prospect.id]:3}},
 staff:{headScout:{rating:78}},draftPolish:{focus:'ALL'},
 upgrades:{scoutPoints:8}};
const combineContext={state:combineState,
 window:{GMDraftRealism:{publicGrade:()=>({
   overall:55,margin:7,confidence:62,combine:null
 })}},
 init:()=>{},title:()=>'',POS:['QB','RB','WR','TE','OL','DL','LB','CB','S','K'],
 esc:x=>String(x),save:()=>{},render:()=>{}};
const scoutPage=vm.runInNewContext(oldCombine+';scoutPage',combineContext);
const markup=scoutPage();
assert.match(markup,/55 ± 7/);
assert.doesNotMatch(markup,/OVR 99|Potential 99|POT 99/);
assert.match(markup,/Exact OVR, ceiling and development trait remain unknown/);

console.log('PASS menu v3 named saves, ID-based target, dead-cap release, signing registration, and hidden prospect ratings');