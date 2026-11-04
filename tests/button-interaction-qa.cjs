/* Audit visible interactive game controls in a real touch browser.
 * Run: node tests/button-interaction-qa.cjs (requires Playwright Chromium).
 * Diagnoses inline callback syntax (which page-render tests cannot detect),
 * disabled/covered buttons, and pointer-driven navigation.
 */
'use strict';
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({
   viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
 });
 const page=await context.newPage(),runtime=[];
 page.on('pageerror',e=>runtime.push(e.message));
 page.on('dialog',async d=>d.dismiss());
 try{
   await page.goto('file://'+process.cwd()+'/index.html',{waitUntil:'load'});
   await page.locator('#gm-menu [data-action="main"]').first().click();
   await page.locator('#gm-menu [data-action="new"]').click();
   await page.locator('#gm-franchise-name').fill('Control QA');
   await page.locator('#gm-menu [data-action="start"]').click();
   await page.locator('#gm-menu').waitFor({state:'detached',timeout:15000});
   const tabs=await page.evaluate(()=>pages.slice());
   const failures=[],counts={};
   for(const tab of tabs){
     const findings=await page.evaluate(label=>{
       page=label;render();
       const root=document.getElementById('app');
       const buttons=[...root.querySelectorAll('button')];
       return buttons.map(b=>{
         const code=b.getAttribute('onclick');
         let syntax=null,missingHandler=null;
         if(code){
           try{new Function('event',code)}catch(e){syntax=e.message}
           const call=code.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
           if(call&&typeof window[call[1]]!=='function')
             missingHandler=call[1];
           const qualified=code.match(/^\s*window\.([A-Za-z_$][\w$]*)\s*\(/);
           if(qualified&&typeof window[qualified[1]]!=='function')
             missingHandler='window.'+qualified[1];
         }
         const rect=b.getBoundingClientRect();
         const style=getComputedStyle(b);
         return {text:(b.innerText||b.textContent||'').trim().slice(0,60),
           code,syntax,missingHandler,disabled:b.disabled,zero:rect.width<1||rect.height<1,
           hidden:style.display==='none'||style.visibility==='hidden'};
       });
     },tab);
     counts[tab]=findings.length;
     for(const f of findings){
       if(f.syntax)failures.push(tab+': invalid onclick '+JSON.stringify(f));
       if(f.missingHandler)failures.push(tab+': missing handler '+JSON.stringify(f));
       if(!f.disabled&&f.zero)failures.push(tab+': zero-size button '+JSON.stringify(f));
     }
   }
   // Navigation uses actual taps instead of direct render calls.
   for(const tab of ['Dashboard','Roster','Schedule','Game Plan & Practice','Save Manager']){
     await page.evaluate(()=>{window.closeDraftIntro?.();window.closeDraftCelebration?.()});
     const button=page.locator('#nav button').filter({hasText:tab}).first();
     if(!await button.count()){failures.push('Missing navigation button: '+tab);continue}
     try{
       await page.locator('.mobilebar button').click();
       await button.click({timeout:5000});
       const actual=await page.evaluate(()=>page);
       if(actual!==tab)failures.push('Nav "'+tab+'" stays on "'+actual+'"');
     }catch(e){failures.push('Nav "'+tab+'": '+e.message)}
   }
   console.log('BUTTON COUNTS '+JSON.stringify(counts));
   console.log('CONTROL FAILURES '+JSON.stringify(failures.slice(0,100),null,2));
   console.log('RUNTIME EXCEPTIONS '+JSON.stringify(runtime.slice(0,30)));
   if(failures.length||runtime.length)
     throw Error(failures.length+' control errors, '+runtime.length+' runtime errors');
   console.log('PASS button syntax and touch-navigation coverage across '+tabs.length+' screens');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
