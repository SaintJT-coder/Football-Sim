/* Gridiron Core: additive event bus and module registry. Load before engine. */
(function(w){'use strict';
const modules=new Map(),listeners=new Map();
const Gridiron=w.Gridiron||{};
Gridiron.register=(name,api)=>{if(modules.has(name))console.warn('Gridiron module replaced:',name);modules.set(name,api);Gridiron[name]=api;return api};
Gridiron.on=(event,fn)=>{if(typeof fn!=='function')throw Error('Handler must be a function');const set=listeners.get(event)||new Set();set.add(fn);listeners.set(event,set);return ()=>set.delete(fn)};
Gridiron.emit=(event,detail)=>{for(const fn of listeners.get(event)||[])try{fn(detail)}catch(error){console.error('Gridiron event '+event,error)}};
Gridiron.getState=()=>typeof state!=='undefined'?state:null;
Gridiron.clone=value=>JSON.parse(JSON.stringify(value));
Gridiron.version='2.0';
w.Gridiron=Gridiron;
})(window);