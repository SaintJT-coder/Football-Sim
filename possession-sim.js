/* Clock-driven franchise games. Player references are read-only during a game. */
(function (root) {
'use strict';
const CONFIG = {
  quarter: 900, hurryWindow: 120, averageRunoff: 32, hurryRunoff: 14,
  passRate: .55, longDownBias: .21, latePassBias: .24, leadRunBias: .22,
  complete: .64, sack: .062, interception: .025, contactFumble: .007,
  runBase: 4.1, passBase: 12, explosiveRun: .075, explosivePass: .12,
  matchup: .004, backupRating: 49, standardRating: 74, fatigueCost: .10,
  snapWear: .075, contactWear: .18, injuryHazard: .000075,
  rotation: .19, limitedRotation: .45, questionableChance: .60,
  fieldGoalBase: .94, fieldGoalSlope: .014, range: 59, puntBase: 44,
  kickBlock: .013, returnTD: .0035, touchback: .65, pat: .945,
  playoffHome: 3.3, home: 2, formCap: 3, executionNoise: 5,
  lateRoundVariance: .82, weather: ['Clear','Clear','Clear','Rain','Wind','Snow','Extreme Cold']
};
const bound = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const sample = (a, rng) => a[Math.floor(rng()*a.length)];
function random(seed) {
  let n=seed>>>0;
  return () => { n=(Math.imul(1664525,n)+1013904223)>>>0; return n/4294967296; };
}
function passChance(plan, situation) {
  const {down,need,spot,margin,remaining,weather}=situation;
  let chance=plan.passRate;
  if(down>=3 && need>=5) chance+=CONFIG.longDownBias;
  if(need<=2) chance-=.13;
  if(remaining<=450) chance+=margin<0?CONFIG.latePassBias:margin>0?-CONFIG.leadRunBias:0;
  if(spot>=80) chance+=plan.redZone==='Pass'?.14:plan.redZone==='Run'?-.14:0;
  if(weather==='Wind'||weather==='Snow') chance-=.07;
  return bound(chance,.18,.88);
}
function simulate(input, rng=random(input.seed)) {
  const cfg=CONFIG, sides=input.teams, score=[0,0], quarters=[[0,0,0,0],[0,0,0,0]];
  const lines=sides.map(t=>({team:t.id,passYards:0,rushYards:0,sackLoss:0,turnovers:0,
    thirdDownAttempts:0,thirdDownConversions:0,plays:0,passes:0,drives:0}));
  const deltas=new Map(), removed=new Set(), drives=[], specials=[], scoring=[], injuries=[];
  const wet=['Rain','Snow'].includes(input.weather), wind=input.weather==='Wind';
  const opening=rng()<.5?0:1;
  let offense=opening, spot=30, down=1, need=10, period=1, clock=cfg.quarter;
  let playLabel='';
  let timeouts=[3,3], drive, pending, overtimeSeries=0, finished=false;
  const remaining=()=>period>4?clock:(4-period)*cfg.quarter+clock;
  function stats(p) {
    if(!deltas.has(p.id)) deltas.set(p.id,{snaps:0,contacts:0,stats:{}});
    return deltas.get(p.id);
  }
  function credit(p,key,n=1) {
    if(!p)return;
    const row=stats(p).stats; row[key]=(row[key]||0)+n;
  }
  function players(side,pos) {
    const list=(sides[side].depth[pos]||[]).filter(p=>!removed.has(p.id));
    // A cleared but limited starter rests on alternating series when depth permits.
    if(list.length>1 && list[0].limited && lines[side].drives%2===0)
      return [...list.slice(1),list[0]];
    return list;
  }
  function select(side,pos,rotate=false) {
    const list=players(side,pos);
    if(list.length>1 && rotate && rng()<(list[0].limited?cfg.limitedRotation:cfg.rotation))
      return list[1];
    return list[0];
  }
  function strength(p) {
    if(!p)return cfg.backupRating;
    return p.rating-(p.fatigue||0)*cfg.fatigueCost-(p.wear||0)*.04-
      (deltas.get(p.id)?.snaps||0)*.055-(p.limited?6:0);
  }
  function unit(group,count) {
    let sum=0; for(let i=0;i<count;i++)sum+=strength(group[i]); return sum/count;
  }
  function expose(p,contact) {
    if(!p)return;
    const row=stats(p); row.snaps++;row.contacts+=contact;
    const risk=cfg.injuryHazard*(1+contact*2)*(1+(p.wear||0)/65+row.snaps/110)*
      (p.conditioning||1)*(p.returnRisk||1);
    if(!removed.has(p.id)&&rng()<risk) {removed.add(p.id);injuries.push(p.id);}
  }
  function mark(side,points,label) {
    score[side]+=points;
    quarters[side][period-1]=(quarters[side][period-1]||0)+points;
    scoring.push({period,clock,team:sides[side].id,points,label});
  }
  function start(side,where) {
    offense=side;spot=bound(Math.round(where),1,99);down=1;need=Math.min(10,100-spot);
    drive={team:sides[side].id,start:spot,period,clock,plays:0};lines[side].drives++;
  }
  function end(label) {drive.end=spot;drive.outcome=label;drives.push(drive);drive=null;}
  function kicker(side,punt=false) {
    return (punt?select(side,'P'):null)||select(side,'K')||select(side,'QB');
  }
  function touchdown(side,kind) {
    mark(side,6,kind);
    const k=kicker(side);credit(k,'xpAttempts');
    if(rng()<bound(cfg.pat+(strength(k)-74)*.001-(wind?.025:0),.7,.995)){
      mark(side,1,'Extra point');credit(k,'extraPoints');
    }
  }
  function returnKick(kicking,kind,landing) {
    const specialist=kicker(kicking,kind==='punt');
    const power=(specialist?.power??cfg.standardRating)-cfg.standardRating;
    if(kind==='kickoff'){credit(specialist,'kickoffs');expose(specialist,0);}
    const receiving=1-kicking, ret=select(receiving,'CB',true)||select(receiving,'RB',true);
    const coverage=select(kicking,'LB',true), st=sides[receiving].special-sides[kicking].special;
    if(landing<=0 || (kind==='kickoff'&&rng()<bound(cfg.touchback+power*.008+sides[kicking].special*.02-(wind?.12:0),.2,.94))){
      specials.push({kind,outcome:'touchback'});return kind==='punt'?20:30;
    }
    if(kind==='punt'&&rng()<.30){specials.push({kind,outcome:'fair catch'});return landing;}
    const td=!!ret&&rng()<bound(cfg.returnTD*(1+(strength(ret)-strength(coverage)+st)/60),.0005,.015);
    const gain=td?100-landing:Math.min(99-landing,Math.max(0,Math.round((kind==='punt'?8:20)+(rng()-.5)*18+st)));
    credit(ret,'returnYards',gain);expose(ret,1);expose(coverage,.65);
    specials.push({kind,outcome:td?'return TD':'return',yards:gain});
    if(td){credit(ret,'returnTD');touchdown(receiving,'Return touchdown');return null;}
    return landing+gain;
  }
  function kickoff(receiving) {
    for(;;){
      const spot=returnKick(1-receiving,'kickoff',Math.round(rng()*7));
      if(spot!==null){start(receiving,spot);return;}
      receiving=1-receiving;
    }
  }
  function finishPossession(kind,next,where) {
    end(kind);
    if(period>4){overtimeSeries++;if(overtimeSeries>=2&&score[0]!==score[1]){finished=true;return;}}
    pending={next,where};
  }
  function kick(punt) {
    const side=offense,other=1-side,k=kicker(side,punt),distance=117-spot;
    const leg=strength(k)+((k?.accuracy??74)-74)*.30,st=sides[side].special;
    const blocked=rng()<bound(cfg.kickBlock-st*.001,.003,.035);
    expose(k,0);
    if(punt){
      const gross=Math.round(cfg.puntBase+((k?.power??leg)-74)*.24+st+(rng()-.5)*20-(wind?5:0));
      credit(k,'punts');credit(k,'puntYards',blocked?0:gross);
      if(blocked){specials.push({kind:'punt',outcome:'blocked'});finishPossession('Blocked punt',other,100-spot+5);return;}
      const startSpot=returnKick(side,'punt',100-spot-gross);
      finishPossession('Punt',startSpot===null?side:other,startSpot);return;
    }
    const pressure=period>=4&&clock<=120&&Math.abs(score[0]-score[1])<=3;
    const chance=bound(cfg.fieldGoalBase-Math.max(0,distance-32)*cfg.fieldGoalSlope+
      (leg-74)*.005+st*.012-(wind?.12:wet?.045:input.weather==='Extreme Cold'?.06:0)-(pressure?.045:0),.04,.99);
    const made=!blocked&&rng()<chance;
    credit(k,'fgAttempts');if(made){credit(k,'fieldGoals');mark(side,3,'Field goal');}
    specials.push({kind:'FG',distance,outcome:blocked?'blocked':made?'good':'missed'});
    finishPossession(made?'Field goal':blocked?'Blocked FG':'Missed FG',other,made?null:Math.max(20,107-spot));
  }
  function snap() {
    const side=offense,other=1-side,plan=sides[side],def=sides[other],line=lines[side];
    const margin=score[side]-score[other],time=remaining();
    const urgent=period<=4&&period%2===0&&clock<=cfg.hurryWindow&&(period===2||margin<=0);
    const distance=117-spot, range=cfg.range+(strength(kicker(side))-74)*.25-(wind?5:0);
    const needsTD=period===4&&time<140&&margin<=-4&&margin>=-8;
    const kickNow=period<=4&&period%2===0&&clock<=8&&distance<=range&&!needsTD;
    const go=needsTD||(need<=2&&spot>=47&&(plan.redZone==='Aggressive'||rng()<.48));
    if(kickNow||(down===4&&!go)){
      playLabel=distance>range?'Punt':'Field goal';kick(distance>range);return 7;
    }
    if(period===4&&margin>0&&clock<=36*(4-down)&&timeouts[other]===0){
      playLabel='Kneel';const qb=select(side,'QB');expose(qb,0);credit(qb,'rushYards',-1);credit(qb,'yards',-1);
      line.plays++;drive.plays++;line.rushYards--;spot--;need++;down++;
      if(spot<=0){mark(other,2,'Safety');finishPossession('Safety',other,null);}
      else if(down>4)finishPossession('Turnover on downs',other,100-spot);
      return 36;
    }
    const pass=rng()<passChance(plan,{down,need,spot,margin,remaining:time,weather:input.weather});
    const qb=select(side,'QB')||select(side,'RB')||select(side,'TE')||select(side,'WR');
    const rb=select(side,'RB',true)||qb||select(side,'OL');
    const wrs=players(side,'WR').slice(0,3),te=select(side,'TE');
    const targets=[...wrs,te].filter(Boolean),receiver=sample(targets,rng);
    const ol=players(side,'OL').slice(0,5),dl=players(other,'DL').slice(0,4);
    const lb=players(other,'LB').slice(0,3),db=[...players(other,'CB').slice(0,2),...players(other,'S').slice(0,2)];
    const tackler=sample([...dl,...lb,...db],rng),rusher=sample(dl.length?dl:lb,rng);
    const passing=pass&&!!qb&&!!receiver;
    const edge=plan.attack-def.defense+plan.edge-def.edge;
    const trench=unit(ol,5)-unit(dl,4)+edge;
    const pressure=bound(cfg.sack-trench*.0017+(def.blitz-35)*.00065,.015,.20);
    let gain=0,turnover=false,incomplete=false,sacked=false;
    const deep=passing&&rng()<(urgent?.30:.18)+(plan.redZone==='Aggressive'&&spot>=80?.10:0);
    if(passing){
      line.passes++;
      if(rng()<pressure){
        sacked=true;gain=-Math.min(spot,3+Math.floor(rng()*8));credit(rusher,'sacks');line.sackLoss-=gain;
      }else{
        credit(qb,'attempts');
        turnover=rng()<bound(cfg.interception+(deep?.012:0)+(wet?.004:0)-(strength(qb)-74)*.0004,.006,.09);
        if(turnover){credit(qb,'interceptions');credit(sample(db,rng),'defensiveINT');}
        else {
          const coverage=unit(db,4),adv=(strength(qb)+strength(receiver))/2-coverage+edge;
          const chance=bound(cfg.complete+adv*cfg.matchup-(deep?.16:0)-(wind?(deep?.15:.025):wet?.045:0)-(spot>=80?.04:0),.30,.84);
          incomplete=rng()>=chance;
          if(!incomplete){
            gain=Math.min(100-spot,Math.round(2+rng()*cfg.passBase+(deep?8:0)+(rng()<cfg.explosivePass?rng()*28:0)));
            credit(qb,'completions');credit(qb,'passYards',gain);credit(receiver,'receptions');credit(receiver,'receivingYards',gain);
            credit(qb,'yards',gain);credit(receiver,'yards',gain);line.passYards+=gain;
          }
        }
      }
    }else{
      gain=Math.round(cfg.runBase+(rng()+rng()-1)*8+(trench+strength(rb)-74)*.055+
        (rng()<cfg.explosiveRun?rng()*18:0)-(input.weather==='Snow'?.5:0));
      gain=bound(gain,-spot,100-spot);line.rushYards+=gain;credit(rb,'rushYards',gain);credit(rb,'yards',gain);
    }
    drive.plays++;line.plays++;
    if(down===3){line.thirdDownAttempts++;if(gain>=need)line.thirdDownConversions++;}
    if(!incomplete&&!turnover&&spot+gain<100)credit(tackler,'tackles');
    const handler=sacked?qb:passing?receiver:rb;
    const contact=!incomplete&&!turnover;
    for(const p of new Set([qb,rb,...wrs,te,...ol,...dl,...lb,...db])){
      if(p)expose(p,contact&&(p===handler||p===tackler)?1:ol.includes(p)||dl.includes(p)?.28:0);
    }
    spot+=gain;
    if(contact&&spot>0&&spot<100&&rng()<cfg.contactFumble*(wet?1.45:1)){
      turnover=true;credit(handler,'lostFumbles');
    }
    playLabel=turnover?'Turnover':sacked?'Sack':incomplete?'Incomplete pass':passing?'Completion':'Run';
    playLabel+=' ('+(gain>0?'+':'')+gain+' yd)';
    const stopped=incomplete||turnover||spot>=100||spot<=0;
    let elapsed=stopped?6:Math.round((urgent?cfg.hurryRunoff:cfg.averageRunoff)-plan.tempo+rng()*8);
    if(!stopped&&urgent&&clock<50&&timeouts[side]>0){timeouts[side]--;elapsed=7;}
    if(!stopped&&period===4&&margin>0&&clock<110&&timeouts[other]>0){timeouts[other]--;elapsed=7;}
    if(turnover){line.turnovers++;finishPossession('Turnover',other,100-spot);}
    else if(spot>=100){
      if(passing){credit(qb,'passTD');credit(qb,'td');credit(receiver,'recTD');credit(receiver,'td');}
      else {credit(rb,'rushTD');credit(rb,'td');}
      touchdown(side,passing?'Passing touchdown':'Rushing touchdown');finishPossession('Touchdown',other,null);
    }else if(spot<=0){mark(other,2,'Safety');finishPossession('Safety',other,null);}
    else if(gain>=need){down=1;need=Math.min(10,100-spot);}
    else if(down===4)finishPossession('Turnover on downs',other,100-spot);
    else {down++;need-=gain;}
    return elapsed;
  }
  kickoff(opening);
  for(let actions=0;!finished;actions++){
    if(actions>900)throw Error('Game clock did not resolve');
    const entry=input.onPlay?{period,clock,team:sides[offense].id,down,need,spot}:null;
    const prior=drives.length;
    clock=Math.max(0,clock-snap());
    if(entry){entry.description=playLabel+(drives.length>prior?' · '+drives[prior].outcome:'');
      entry.home=score[0];entry.away=score[1];input.onPlay(entry);
    }
    if(finished)break;
    if(clock===0){
      if(period===4&&score[0]!==score[1])break;
      if(period===2||period===4){
        if(drive)end('End of half');
        pending=null;period++;clock=cfg.quarter;timeouts=[3,3];kickoff(period===3?1-opening:(rng()<.5?0:1));
      }else {period++;clock=cfg.quarter;}
    }
    if(pending){const {next,where}=pending;pending=null;if(where===null)kickoff(next);else start(next,where);}
  }
  if(drive&&drive.plays)end('Final whistle');
  const periods=Math.max(4,period);
  for(const row of quarters)for(let q=0;q<periods;q++)row[q]??=0;
  for(const [i,line] of lines.entries()){
    line.points=score[i];line.totalYards=line.passYards+line.rushYards-line.sackLoss;
    line.passShare=line.passes/Math.max(1,line.plays);
    if(quarters[i].reduce((a,b)=>a+b,0)!==score[i])throw Error('Scoring ledger mismatch');
  }
  return {score,quarters,lines,deltas,injuries,drives,specials,scoring};
}
root.Gridiron.register('possessionSim',{CONFIG,random,passChance,simulate});
})(window);
