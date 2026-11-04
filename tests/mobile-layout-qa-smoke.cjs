/* Responsive layout smoke using real headless Chromium + touch emulation.
 * Run: node tests/mobile-layout-qa-smoke.cjs */
'use strict';
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const sizes=[
  {name:'small iPhone',width:375,height:667},
  {name:'iPad portrait',width:820,height:1180}
 ];
 const results=[];
 try{
  for(const {name,width,height} of sizes){
   const context=await browser.newContext({
    viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2
   });
   const page=await context.newPage();
   page.setDefaultTimeout(120000);
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   try{
    await page.goto('file://'+process.cwd()+'/index.html',{waitUntil:'load'});
    await page.locator('#gm-menu').waitFor({state:'visible'});
    await page.locator('#gm-menu [data-action="main"]').first().click();
    let measurement=await page.evaluate(()=>({
      viewport:document.documentElement.clientWidth,
      scroll:document.documentElement.scrollWidth
    }));
    if(measurement.scroll>measurement.viewport+12)
      throw Error(name+' main menu overflows horizontally: '+JSON.stringify(measurement));
    await page.locator('#gm-menu [data-action="new"]').click();
    measurement=await page.evaluate(()=>({
      viewport:document.documentElement.clientWidth,
      scroll:document.documentElement.scrollWidth
    }));
    if(measurement.scroll>measurement.viewport+12)
      throw Error(name+' franchise creation overflows horizontally: '+JSON.stringify(measurement));
    await page.locator('#gm-menu #gm-franchise-name').fill(name+' QA Franchise');
    await page.locator('#gm-menu [data-action="start"]').click();
    await page.locator('#gm-menu').waitFor({state:'detached'});
    const tabNames=await page.evaluate(()=>pages.slice());
    const failures=[];
    for(const tab of tabNames){
     try{
      await page.evaluate(label=>{page=label;render()},tab);
      const overflow=await page.evaluate(()=>({
       width:document.documentElement.clientWidth,
       document:document.documentElement.scrollWidth,
       body:document.body.scrollWidth
      }));
      if(overflow.document>overflow.width+12)
       failures.push(tab+' width '+overflow.document+' > '+overflow.width);
      const content=(await page.locator('#app').innerText()).trim();
      if(!content)failures.push(tab+': empty');
     }catch(error){failures.push(tab+': '+error.message)}
     await page.evaluate(()=>{window.closeDraftIntro?.();window.closeDraftCelebration?.()});
    }
    if(failures.length)throw Error(name+' layout failures: '+failures.slice(0,15).join(' | '));
    if(errors.length)throw Error(name+' browser exceptions: '+errors.join(' | '));
    results.push(name+': '+tabNames.length+' tabs');
   }finally{await context.close()}
  }
  console.log('PASS responsive layout: '+results.join('; ')+' with no document overflow');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
