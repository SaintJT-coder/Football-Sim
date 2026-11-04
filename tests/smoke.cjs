/* Gridiron GM mobile Chromium regression.
 * Uses the current 32-team game, named v3 save slots and new presentation modules.
 * Run: node tests/smoke.cjs (requires Playwright Chromium). */
'use strict';
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({
   viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
 });
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('dialog',async dialog=>{
   await dialog.accept(dialog.type()==='prompt'?'QA Alternate Timeline':undefined);
 });
 page.setDefaultTimeout(120000);
 try{
   await page.goto('file://'+process.cwd()+'/index.html',{waitUntil:'load'});
   await page.locator('#gm-menu').waitFor({state:'visible'});
   await page.locator('#gm-menu [data-action="main"]').first().click();
   if(await page.locator('#gm-menu [data-action="continue"]').count())
     throw Error('Continue shown on fresh installation');
   await page.locator('#gm-menu [data-action="new"]').click();
   await page.locator('#gm-menu #gm-franchise-name').fill('QA Alpha Dynasty');
   await page.locator('#gm-menu [data-action="start"]').click();
   await page.locator('#gm-menu').waitFor({state:'detached'});
   const initial=await page.evaluate(()=>({
     team:state.team,year:state.year,week:state.week,
     players:state.players.length,slot:GMSaveManager.activeId(),
     names:GMSaveManager.index().map(x=>x.name)
   }));
   if(initial.players<900||initial.team!==0||initial.names[0]!=='QA Alpha Dynasty')
     throw Error('New named franchise did not initialize: '+JSON.stringify(initial));

   // Inspect every built-in and dynamically registered tab using actual browser DOM.
   const tabs=await page.evaluate(()=>pages.slice());
   for(const tab of tabs){
     await page.evaluate(label=>{page=label;render()},tab);
     const content=(await page.locator('#app').innerText()).trim();
     if(!content)throw Error('Blank game tab: '+tab);
   }
   await page.evaluate(()=>{closeDraftIntro?.();closeDraftCelebration?.()});

   // Confirm the canvas-based first-pick preview actually animates in an iframe.
   await page.evaluate(()=>{page='Animation';render()});
   await page.locator('#app button[onclick*="playDraftAnimationPreview"]').click();
   const overlay=page.locator('#dn-first-pick-broadcast');
   await overlay.waitFor({state:'visible'});
   const frameHandle=await overlay.locator('iframe').elementHandle();
   const frame=await frameHandle.contentFrame();
   if(!frame)throw Error('Draft broadcast iframe did not initialize');
   await frame.locator('#c').waitFor({state:'visible'});
   const started=await frame.waitForFunction(
     ()=>typeof cycle==='number'&&cycle>0.08,null,{timeout:8000}
   ).then(()=>true).catch(()=>false);
   if(!started)throw Error('Draft canvas was visible but its frame clock did not advance');
   await overlay.getByRole('button',{name:/CONTINUE DRAFT/}).click();
   await overlay.waitFor({state:'detached'});

   // The simulation now plays sixteen games per week across 32 teams.
   await page.evaluate(()=>{page='Dashboard';render()});
   const before=await page.evaluate(()=>({week:state.week,results:state.results.length}));
   await page.evaluate(()=>simulate());
   const after=await page.evaluate(()=>({
     week:state.week,results:state.results.length,
     press:state.immersionPress?.active?.questions?.length,
     gameReports:state.simPresentation?.gameReports?.length||0
   }));
   if(after.week!==before.week+1||after.results!==before.results+16)
     throw Error('32-team week did not simulate correctly: '+JSON.stringify({before,after}));
   if(after.press!==3||after.gameReports<16)
     throw Error('Postgame reports or press conference missing: '+JSON.stringify(after));

   await page.evaluate(()=>{page='Press Room';render()});
   for(let i=0;i<3;i++){
     const answer=page.locator('#app .gm-p7-answer').first();
     await answer.waitFor({state:'visible'});
     await answer.click();
   }
   const press=await page.evaluate(()=>state.immersionPress.history[0]?.answers?.length);
   if(press!==3)throw Error('Three press questions were not recorded');

   await page.evaluate(()=>{page='Game Reports & Media';render()});
   const mediaText=await page.locator('#app').innerText();
   if(!mediaText.includes('GAME REPORTS & MEDIA'))
     throw Error('Game Reports page did not render after simulation');

   // Starter changes must change the actual lineup while preserving save state.
   await page.evaluate(()=>{page='Depth Chart';render()});
   const qbs=await page.evaluate(()=>GMRosterRules.depth(state,state.team,'QB').map(p=>p.id));
   if(qbs.length>1){
     const changed=await page.evaluate(id=>GMImmersion.setStarter(state,'QB',id),qbs[1]);
     if(!changed.ok)throw Error('Healthy quarterback could not be moved to starter');
     const leader=await page.evaluate(()=>GMRosterRules.depth(state,state.team,'QB')[0].id);
     if(String(leader)!==String(qbs[1]))throw Error('Starter change not reflected in depth order');
     await page.evaluate(()=>save());
   }

   // Named franchise slots must be isolated after the application reloads.
   await page.evaluate(()=>openGridironMenu());
   await page.locator('#gm-menu [data-action="new"]').click();
   await page.locator('#gm-menu [data-team="1"]').click();
   await page.locator('#gm-menu #gm-franchise-name').fill('QA Beta Dynasty');
   await page.locator('#gm-menu [data-action="start"]').click();
   await page.locator('#gm-menu').waitFor({state:'detached'});
   const second=await page.evaluate(()=>({
     team:state.team,names:GMSaveManager.index().map(x=>x.name)
   }));
   if(second.team!==1||second.names.length!==2)
     throw Error('Second named franchise failed: '+JSON.stringify(second));

   await page.evaluate(()=>openGridironMenu());
   await page.locator('#gm-menu [data-action="load"]').click();
   await page.locator('#gm-menu').waitFor({state:'detached'});
   const alphaButton=page.locator('#app button[onclick="gmLoadSlot(\''+initial.slot+'\')"]');
   await alphaButton.click();
   // Inspect the restored state after the slot load/reload and surface actionable
   // diagnostics instead of hanging on a particular menu overlay.
   await page.waitForLoadState('load');
   await page.waitForTimeout(400);
   const restoredDebug=await page.evaluate(()=>({
     team:typeof state==='undefined'?null:state.team,
     year:typeof state==='undefined'?null:state.year,
     week:typeof state==='undefined'?null:state.week,
     slot:window.GMSaveManager?.activeId()||null,
     storedSlot:localStorage.getItem('gridiron-gm-current-slot-v3'),
     menuVisible:!!document.getElementById('gm-menu'),
     savedNames:window.GMSaveManager?.index?.().map(x=>x.name)||[]
   }));
   console.log('Reloaded slot diagnostics:',JSON.stringify(restoredDebug));
   const loaded=await page.evaluate(()=>({
     team:state.team,year:state.year,week:state.week,results:state.results.length,
     slot:GMSaveManager.activeId()
   }));
   if(loaded.team!==0||loaded.week!==2||loaded.results!==16||loaded.slot!==initial.slot)
     throw Error('Reload restored the wrong franchise: '+JSON.stringify(loaded));

   if(errors.length)throw Error('Browser script exceptions: '+errors.join(' | '));
   console.log('PASS mobile browser: '+tabs.length+
     ' tabs, animated draft canvas, 16-game simulation, reports, 3-question press room, depth chart and independent saves');
 }finally{
   await browser.close();
 }
})().catch(error=>{console.error(error);process.exit(1)});
