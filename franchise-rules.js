/* Shared, DOM-free rules used by the browser and node:test. */
(function(root){
'use strict';
const CONFIG={weeks:18,defaultMorale:65,low:40,high:75,maxPenalty:5,maxBoost:2};
function schedule(count=32){
  const ring=Array.from({length:count},(_,i)=>i),games=[];
  for(let week=1;week<=CONFIG.weeks;week++){
    for(let i=0;i<count/2;i++){
      const pair=[ring[i],ring[count-1-i]];
      if((week+i)%2)pair.reverse();
      games.push({a:pair[0],b:pair[1],week});
    }
    ring.splice(1,0,ring.pop());
  }
  // Each pair of rounds is a collection of cycles. Orient each cycle so every
  // club hosts once and travels once, without changing any opponent or week.
  for(let start=0;start<games.length;start+=count){
    const links=Array.from({length:count},()=>[]);
    for(const game of games.slice(start,start+count)){links[game.a].push(game);links[game.b].push(game);}
    const used=new Set();
    for(let team=0;team<count;team++){
      let current=team,edge;
      while((edge=links[current].find(game=>!used.has(game)))){
        used.add(edge);
        if(edge.a!==current)[edge.a,edge.b]=[edge.b,edge.a];
        current=edge.b;
      }
    }
  }
  return games;
}
function standings(teams,games){
  const rows=teams.map((t,i)=>({i,division:t[2],w:0,l:0,t:0,pf:0,pa:0,divPoints:0,divGames:0}));
  for(const g of games){
    if(!Number.isFinite(g.sa)||!Number.isFinite(g.sb))continue;
    for(const [id,opp,forPts,against] of [[g.a,g.b,g.sa,g.sb],[g.b,g.a,g.sb,g.sa]]){
      const r=rows[id],points=forPts>against?1:forPts===against?.5:0;
      r[points===1?'w':points===0?'l':'t']++;r.pf+=forPts;r.pa+=against;
      if(r.division===rows[opp].division){r.divGames++;r.divPoints+=points;}
    }
  }
  return rows.map(r=>({...r,pct:(r.w+r.t*.5)/Math.max(1,r.w+r.l+r.t),diff:r.pf-r.pa}));
}
// Rank whole tied groups; pairwise head-to-head comparisons can produce cycles.
function rank(rows,games){
  const groups=new Map();
  for(const row of rows){if(!groups.has(row.pct))groups.set(row.pct,[]);groups.get(row.pct).push(row);}
  return [...groups.keys()].sort((a,b)=>b-a).flatMap(pct=>{
    const tied=groups.get(pct),mini=new Map(tied.map(r=>[r.i,[0,0]]));
    for(const g of games){
      if(!Number.isFinite(g.sa)||!Number.isFinite(g.sb)||!mini.has(g.a)||!mini.has(g.b))continue;
      const home=mini.get(g.a),away=mini.get(g.b),v=g.sa>g.sb?1:g.sa===g.sb?.5:0;
      home[0]+=v;away[0]+=1-v;home[1]++;away[1]++;
    }
    const comparable=[...mini.values()].every(x=>x[1]>0);
    const h=id=>comparable?mini.get(id)[0]/mini.get(id)[1]:0;
    const div=r=>r.divGames?r.divPoints/r.divGames:.5;
    return tied.sort((a,b)=>h(b.i)-h(a.i)||div(b)-div(a)||b.diff-a.diff||a.i-b.i);
  });
}
function seeds(rows,games,conf){
  const members=rows.filter(r=>r.division.split(' ')[0]===conf);
  const winners=[...new Set(members.map(r=>r.division))].map(d=>rank(members.filter(r=>r.division===d),games)[0]);
  return [...rank(winners,games),...rank(members.filter(r=>!winners.includes(r)),games)]
    .map((r,i)=>({...r,seed:i+1,divisionWinner:winners.includes(r)}));
}
const draftOrder=(rows,games)=>rank(rows,games).reverse().map(r=>r.i);
const canAfford=(space,added,released=0)=>[space,added,released].every(Number.isFinite)&&added>=0&&released>=0&&
  Math.round(space*100)+Math.round(released*100)>=Math.round(added*100);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function moraleRating(value=65){
  return value<CONFIG.low?-CONFIG.maxPenalty*(CONFIG.low-clamp(value,0,40))/CONFIG.low:
    value>CONFIG.high?CONFIG.maxBoost*(clamp(value,75,100)-CONFIG.high)/(100-CONFIG.high):0;
}
function mood(player,snaps,won,market){
  const expected=player.rating>=80?30:10;
  return Math.round(10*clamp((player.morale??CONFIG.defaultMorale)+(won?1:-1)+(snaps>=expected?.5:-.6)+
    (player.salary<market*.75?-.6:player.salary>market*1.25?.3:0),0,100))/10;
}
const migrations=Object.create(null);
function register(from,transform){
  if(!Number.isInteger(from)||from<1||typeof transform!=='function'||migrations[from])throw Error('Invalid or duplicate save migration '+from);
  migrations[from]=transform;
}
register(1,s=>{
  const next={...s,players:s.players.map(p=>({...p,morale:clamp(Number.isFinite(p.morale)?p.morale:CONFIG.defaultMorale,0,100)}))};
  // The former 17-game scheduler left week 9 empty. Preserve previously played games.
  const old=s.engine?.schedule;
  if(old?.length===272&&s.week<=9&&!old.some(g=>g.week===9)){
    const extra=schedule().filter(g=>g.week===18).map(g=>({...g,week:9}));
    next.engine={...s.engine,schedule:[...old,...extra].sort((a,b)=>a.week-b.week)};
  }
  return next;
});
function migrate(raw){
  let value=JSON.parse(JSON.stringify(raw)),v=value.schemaVersion??1;
  const latest=Math.max(1,...Object.keys(migrations).map(Number))+1;
  if(!Number.isInteger(v)||v<1||v>latest)throw Error('Unsupported save version '+v);
  while(v<latest){if(!migrations[v])throw Error('Missing save migration '+v);
    value=migrations[v](value);value.schemaVersion=++v;
  }
  if(!Array.isArray(value.players)||!value.players.length||value.players.some(p=>!p||typeof p!=='object'))throw Error('Invalid player data');
  return value;
}
const recovered=new WeakSet();
function load(raw,fresh){
  if(recovered.has(raw))return raw;
  try{return migrate(raw);}catch(err){console.warn('Gridiron GM could not migrate this franchise.',err.message);const replacement=fresh();if(replacement&&typeof replacement==='object')recovered.add(replacement);return replacement;}
}
const api={CONFIG,schedule,standings,rank,seeds,draftOrder,canAfford,moraleRating,mood,migrations,register,migrate,load,recovered};
root.GMFranchiseRules=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
