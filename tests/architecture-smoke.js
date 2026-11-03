/* Optional Node smoke tests. Run: node tests/architecture-smoke.js
   No npm install, bundler or browser required. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=new Map(),localStorage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
const window={localStorage,TEAMS:[['A','Alpha','East'],['B','Beta','West']]};
const sandbox={window,localStorage,console,Date,Math,JSON,setTimeout:()=>{},alert:()=>{},confirm:()=>true,prompt:()=>null,document:{},state:null};
function load(file){vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file,timeout:2000})}
load('gridiron-core.js');load('gridiron-saves.js');load('season-recap.js');
const saves=window.GMSaveManager,recap=window.GMSeasonRecap;
const sample={year:2026,week:1,team:0,players:[{id:1,name:'Test QB',team:0,pos:'QB',rating:88,stats:{passYards:4000,passTD:32}},{id:2,name:'Test RB',team:1,pos:'RB',rating:80,stats:{rushYards:1300}}],results:[],news:[]};
const first=saves.create(sample,'Main');assert.equal(saves.index().length,1);assert.equal(saves.activeId(),first.id);
const branch=saves.branch(sample,'What If');assert.notEqual(branch.id,first.id);assert.equal(branch.branchOf,first.id);
sample.week=8;saves.snapshot(sample);assert.equal(saves.activate(first.id).week,1);assert.equal(saves.activate(branch.id).week,8);
saves.rename(branch.id,'Alternate');assert.equal(saves.index().find(x=>x.id===branch.id).name,'Alternate');
saves.remove(branch.id);assert.equal(saves.index().length,1);
const standings=[{i:0,rec:{w:10,l:7}},{i:1,rec:{w:8,l:9}}],playoffs=[{a:0,b:1,sa:31,sb:24,round:'Final'}];
const summary=recap.generate(sample,standings,playoffs,[{mvp:'Test QB'}]);
assert.equal(summary.year,2026);assert.equal(summary.playoffs.length,1);assert.equal(summary.leaders[0].leaders[0].name,'Test QB');
assert.equal(recap.generate(sample,standings,playoffs,[]),summary);
console.log('PASS: module registration, slots, branches, isolation, rename, delete and season recaps');
