/* Real Chromium QA for What If saves: create, diverge, reload, return, delete.
 * Run: node tests/branch-browser-qa-smoke.cjs (requires Playwright Chromium).
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
 });
 const page=await context.newPage();
 const errors=[];
 page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',async dialog=>{
  await dialog.accept(dialog.type()==='prompt'?'QA Alternate Timeline':undefined);
 });
 try{
  await page.goto('file://'+path.resolve(__dirname,'../index.html'),{waitUntil:'load'});
  await page.locator('#gm-menu').waitFor({state:'visible'});
  await page.locator('#gm-menu [data-action="main"]').first().click();
  await page.locator('#gm-menu [data-action="new"]').click();
  await page.locator('#gm-franchise-name').fill('QA Original Dynasty');
  await page.locator('#gm-menu [data-action="start"]').click();
  await page.locator('#gm-menu').waitFor({state:'detached'});
  const original=await page.evaluate(()=>({
    id:GMSaveManager.activeId(),team:state.team,year:state.year,week:state.week,
    playerCount:state.players.length
  }));
  assert.ok(original.id);
  assert.equal(original.week,1);

  await page.evaluate(()=>{page='Save Manager';render()});
  await page.locator('#app button[onclick="gmWhatIf()"]').click();
  const branch=await page.evaluate(()=>({
    id:GMSaveManager.activeId(),
    parent:GMSaveManager.index().find(x=>x.id===GMSaveManager.activeId())?.branchOf,
    index:GMSaveManager.index().map(x=>x.name)
  }));
  assert.notEqual(branch.id,original.id);
  assert.equal(branch.parent,original.id);
  assert.equal(branch.index.length,2);
  await page.locator('#app').getByText('ALTERNATE UNIVERSE ACTIVE').waitFor();
  await page.evaluate(()=>simulate());
  const branchNow=await page.evaluate(()=>({
    year:state.year,week:state.week,results:state.results.length,
    id:GMSaveManager.activeId()
  }));
  assert.equal(branchNow.id,branch.id);
  assert.equal(branchNow.week,2);
  assert.equal(branchNow.results,16);

  // Load original by clicking the visible parent-timeline button.
  await page.evaluate(()=>{page='Save Manager';render()});
  await page.locator('#app button[onclick="gmReturnToParent()"]').click();
  await page.locator('#gm-menu').waitFor({state:'visible'});
  let restored=await page.evaluate(()=>({
    id:GMSaveManager.activeId(),year:state.year,
    week:state.week,results:state.results.length,
    branchStored:GMSaveManager.index().find(x=>x.id!==GMSaveManager.activeId())?.id
  }));
  assert.equal(restored.id,original.id);
  assert.equal(restored.week,1,'Branch simulation changed original timeline');
  assert.equal(restored.results,0);
  assert.equal(restored.branchStored,branch.id);

  // Return from main menu, then load the divergent timeline again.
  await page.locator('#gm-menu [data-action="main"]').first().click();
  await page.locator('#gm-menu [data-action="continue"]').click();
  await page.locator('#gm-menu').waitFor({state:'detached'});
  await page.evaluate(()=>{page='Save Manager';render()});
  const branchCard=page.locator('#app .gm-save-card.gm-save-branch')
    .filter({hasText:'QA Alternate Timeline'});
  await branchCard.getByRole('button',{name:'LOAD SAVE'}).click();
  await page.locator('#gm-menu').waitFor({state:'visible'});
  const reopened=await page.evaluate(()=>({
    id:GMSaveManager.activeId(),year:state.year,
    week:state.week,results:state.results.length
  }));
  assert.equal(reopened.id,branch.id);
  assert.equal(reopened.week,2,'Branch progress lost on reload');
  assert.equal(reopened.results,16);
  // Confirm source save still exists and has its original progress.
  const originalSave=await page.evaluate(id=>JSON.parse(
    localStorage.getItem('gridiron-gm-slot-v3:'+id)),original.id);
  assert.equal(originalSave.week,1);
  assert.equal(originalSave.results.length,0);

  // Deleting just the active branch should automatically restore its parent.
  await page.locator('#gm-menu [data-action="main"]').first().click();
  await page.locator('#gm-menu [data-action="continue"]').click();
  await page.evaluate(()=>{page='Save Manager';render()});
  await page.locator('#app .gm-save-card.gm-save-branch')
    .getByRole('button',{name:'DELETE'}).click();
  await page.locator('#gm-menu').waitFor({state:'visible'});
  const afterDeletion=await page.evaluate(()=>({
    id:GMSaveManager.activeId(),year:state.year,week:state.week,
    slots:GMSaveManager.index().length,
    branchKey:localStorage.getItem('gridiron-gm-slot-v3:'+GMSaveManager.activeId())
  }));
  assert.equal(afterDeletion.id,original.id);
  assert.equal(afterDeletion.week,1);
  assert.equal(afterDeletion.slots,1);
  assert.ok(afterDeletion.branchKey);
  assert.deepEqual(errors,[],'Browser script errors');
  console.log('PASS real mobile Chromium What If lifecycle: branch, diverge, parent reload, branch reload, safe deletion');
 }finally{
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
