// Dependency-free syntax and integration smoke checks.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(x=>x[1]);
assert(scripts.length>20,'Expected franchise modules');
assert.equal(new Set(scripts).size,scripts.length,'Duplicate script includes');
for(const src of scripts){
 assert(!/^https?:|^\/|\.\./.test(src),'Unsafe script path: '+src);
 assert(fs.existsSync(path.join(root,src)),'Missing module: '+src);
 new vm.Script(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});
}
for(const [a,b] of [['gridiron-core.js','engine.js'],['roster-rules.js','weekly-gameplan.js'],['weekly-gameplan.js','engine.js'],['engine.js','menu.js'],['menu.js','championship.js']])
 assert(scripts.indexOf(a)>=0&&scripts.indexOf(b)>=0&&scripts.indexOf(a)<scripts.indexOf(b),'Module order: '+a+' before '+b);
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
inline.forEach((s,i)=>new vm.Script(s,{filename:'index.html:inline:'+i}));
console.log('PASS '+scripts.length+' external modules and '+inline.length+' inline scripts parse; dependency order valid');
