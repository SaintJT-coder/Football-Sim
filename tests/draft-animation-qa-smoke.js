/* Draft presentation smoke: source, animation iframe, first-pick hook.
   Run: node tests/draft-animation-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const broadcast=fs.readFileSync(path.join(root,'first-pick-broadcast.js'),'utf8');
const draftnight=fs.readFileSync(path.join(root,'draftnight.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
new vm.Script(broadcast,{filename:'first-pick-broadcast.js'});
new vm.Script(draftnight,{filename:'draftnight.js'});
assert.match(html,/onclick="window\.playDraftAnimationPreview\(\)"/,
 'Animation page must invoke the registered preview action');
assert.match(draftnight,/window\.showFirstPickBroadcast\(/,
 'The first overall pick must trigger the broadcast');
assert.doesNotMatch(draftnight,/12 FRANCHISES/,
 'The opening ceremony must not show an outdated league count');
assert.match(draftnight,/TEAMS\.length\+' FRANCHISES/,
 'The opening ceremony should use live team count');

const created=[],timers=[];
class Element {
 constructor(tag){
  this.tag=tag;this.children=[];this.style={};this.attributes={};
  this.textContent='';this.id='';this.innerHTML='';
 }
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(){}
 append(...parts){this.children.push(...parts)}
 appendChild(item){this.children.push(item)}
 remove(){this.removed=true}
}
const document={
 createElement:tag=>{const e=new Element(tag);created.push(e);return e},
 getElementById:()=>null,
 body:{appendChild(el){this.lastChild=el}}
};
const window={};
const scope={
 window,document,console,setTimeout:(cb,delay)=>{timers.push({cb,delay});return timers.length},
 clearTimeout:()=>{},
 alert:msg=>{throw Error('Unexpected alert '+msg)}
};
vm.createContext(scope);
new vm.Script(broadcast).runInContext(scope);
assert.equal(typeof window.playDraftAnimationPreview,'function');
assert.equal(typeof window.showFirstPickBroadcast,'function');

window.showFirstPickBroadcast(
 {name:'Jordan Sample',pos:'QB',rating:82},
 'Portland Wolves',2027,
 [{name:'Jordan Sample',drafted:true},{name:'Taylor Player',drafted:false}]
);
const overlay=document.body.lastChild;
assert.equal(overlay.id,'dn-first-pick-broadcast','Animation overlay missing');
assert.equal(overlay.children.length,4,'Expected iframe, status, close and replay controls');
const [frame,status,close,replay]=overlay.children;
assert.equal(status.attributes.role,'status');
assert.equal(replay.tag,'button');
assert.equal(typeof replay.onclick,'function');
assert.equal(frame.tag,'iframe');
assert.equal(frame.attributes.sandbox,'allow-scripts');
assert.match(frame.srcdoc,/id="c"/);
assert.match(frame.srcdoc,/requestAnimationFrame\(loopStep\)/);
assert.match(frame.srcdoc,/window\.DRAFT_PLAYER_NAME="Jordan Sample"/);
assert.match(frame.srcdoc,/window\.DRAFT_YEAR=2027/);
assert.match(frame.srcdoc,/window\.DRAFT_TEAM_LINE="Portland Wolves"/);
assert.equal(timers.at(-1).delay,24000);
assert.equal(typeof close.onclick,'function');
const htmlScripts=[...frame.srcdoc.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
assert.equal(htmlScripts.length,2,'Expected injected player data and canvas animation');
for(const script of htmlScripts)new vm.Script(script);
close.onclick();
assert.equal(overlay.removed,true,'Skip button failed to dismiss the broadcast');

// Verify the preview action works with a synthetic, newly created franchise.
scope.state={year:2028,frontOffice:{draftLog:[],prospects:[]}};
scope.TEAMS=[['POR','Portland Wolves','Union West']];
window.playDraftAnimationPreview();
assert.equal(document.body.lastChild.id,'dn-first-pick-broadcast');
assert.match(document.body.lastChild.children[0].srcdoc,/DRAFT_YEAR=2028/);
console.log('PASS: draft-night Play creates a working canvas iframe, injected stats parse, close works, and ceremony uses the live league size');