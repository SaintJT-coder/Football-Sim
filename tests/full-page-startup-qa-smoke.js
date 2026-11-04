/* Whole-page startup and navigation regression using Node built-ins.
 * Loads the real HTML inline script plus every classic JS module in browser order.
 * A small synthetic DOM catches initialization crashes and missing UI routes.
 * Run: node tests/full-page-startup-qa-smoke.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,'index.html is missing its main inline game script');
const modules=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]);
assert.ok(modules.length>=30,'Expected the current multi-module app');

const nodes=new Map(),listeners=new Map();
class Element {
 constructor(tag,id=''){
   this.tagName=tag.toUpperCase();this.id=id;this.children=[];
   this.style={display:'',setProperty(){},removeProperty(){}};
   this.dataset={};this.attributes={};this.innerHTML='';this.textContent='';
   this.value='';this.checked=false;this.scrollTop=0;this.files=[];
   const active=new Set();
   this.classList={add:(...k)=>k.forEach(x=>active.add(x)),
     remove:(...k)=>k.forEach(x=>active.delete(x)),
     toggle:(k,on)=>{if(on??!active.has(k))active.add(k);else active.delete(k)},
     contains:k=>active.has(k)};
 }
 appendChild(node){this.children.push(node);if(node.id)nodes.set(node.id,node);return node}
 append(...args){args.forEach(x=>this.appendChild(x))}
 remove(){nodes.delete(this.id);this.removed=true}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='id'){this.id=String(v);nodes.set(this.id,this)}}
 addEventListener(){}
 removeEventListener(){}
 querySelector(){return new Element('div')}
 querySelectorAll(){return []}
 getBoundingClientRect(){return {width:360,height:640,left:0,top:0}}
 closest(){return null}
 focus(){}
 click(){}
}
for(const id of ['app','nav','sidebar','mobileSeason','primaryColor','accentColor'])
 nodes.set(id,new Element('div',id));
const document={
 readyState:'loading',
 head:new Element('head'),body:new Element('body'),
 documentElement:{style:{setProperty(){},removeProperty(){}}},
 getElementById:id=>nodes.get(id)||null,
 querySelector:()=>null,querySelectorAll:()=>[],
 createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),
 addEventListener:(name,fn)=>{const handlers=listeners.get(name)||[];
   handlers.push(fn);listeners.set(name,handlers)},
 removeEventListener:()=>{}
};
const store=new Map(),storage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k),
 clear:()=>store.clear()
};
const alerts=[],ctx={
 document,localStorage:storage,console,
 navigator:{userAgent:'Node integration harness'},
 location:{reload:()=>{}},innerWidth:1200,
 scrollTo:()=>{},addEventListener:()=>{},removeEventListener:()=>{},
 alert:message=>alerts.push(String(message)),confirm:()=>true,prompt:()=>null,
 setTimeout:()=>1,clearTimeout:()=>{},
 setInterval:()=>1,clearInterval:()=>{},
 requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},
 performance:{now:()=>0},
 URL,Blob,TextEncoder,Math,JSON
};
ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;
const sandbox=vm.createContext(ctx);
function run(source,filename){
 return new vm.Script(source,{filename}).runInContext(sandbox,{timeout:10000});
}
run(inline,'index.html:main');
for(const module of modules){
 const filename=path.join(root,module);
 assert.ok(fs.existsSync(filename),'Missing script referenced by HTML: '+module);
 run(fs.readFileSync(filename,'utf8'),module);
}
document.readyState='complete';
for(const fn of listeners.get('DOMContentLoaded')||[])fn();
assert.ok(nodes.get('gm-menu')?.innerHTML.includes('GRIDIRON'),
 'Main menu did not initialize after DOMContentLoaded');
const pages=run('pages.slice()','pages');
assert.ok(pages.includes('Dashboard')&&pages.includes('Save Manager')&&pages.includes('Animation'));
const failed=[];
for(const page of pages){
 try{
   run('page='+JSON.stringify(page)+';render()','route:'+page);
   const markup=nodes.get('app').innerHTML;
   if(typeof markup!=='string'||markup.length<35)failed.push(page+': empty view');
 }catch(e){failed.push(page+': '+e.stack)}
}
assert.deepEqual(failed,[],'Some game screens failed during render');
assert.equal(typeof ctx.playDraftAnimationPreview,'function');
ctx.playDraftAnimationPreview();
assert.ok(nodes.get('dn-first-pick-broadcast'),
 'Play Animation did not create the draft broadcast overlay');
ctx.closeFirstPickBroadcast();
assert.equal(nodes.get('dn-first-pick-broadcast'),undefined);
assert.deepEqual(alerts,[],'Unexpected alerts during startup and route rendering');
console.log('PASS: index.html and '+modules.length+' external scripts loaded; '+
 pages.length+' game screens rendered and draft animation opened/closed');