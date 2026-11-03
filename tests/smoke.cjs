const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+process.cwd()+'/index.html',{waitUntil:'load'});
 await page.waitForTimeout(800);
 const boot=await page.evaluate(()=>({year:state.year,week:state.week,nav:pages.slice(),players:state.players.length}));
 if(boot.players<100)throw Error('Players not initialized');
 for(const tab of ['Dashboard','Roster','Depth Chart','Combine','Coaching Staff','Salary Cap','Schedule','Weekly Report','Draft Board','Player Market','Trade Center','Animation']){
  await page.evaluate(tab=>{page=tab;render()},tab);
  await page.waitForTimeout(60);
  const html=await page.locator('#app').innerText();
  if(!html.trim())throw Error('Empty page: '+tab);
 }
 await page.evaluate(()=>{page='Schedule';render()});
 const initial=await page.evaluate(()=>({week:state.week,results:state.results.length}));
 await page.evaluate(()=>simulate());
 const after=await page.evaluate(()=>({week:state.week,results:state.results.length,schedule:state.engine.schedule.length,report:state.results.at(-1)?.report}));
 if(after.week!==initial.week+1)throw Error('Week did not advance exactly once');
 if(after.results!==initial.results+6)throw Error('Expected 6 games per week, got '+(after.results-initial.results));
 if(after.schedule!==108)throw Error('Expected 108 scheduled games, got '+after.schedule);
 if(!after.report?.quarters)throw Error('Missing game report');
 await page.evaluate(()=>{page='Salary Cap';render()});
 const beforeContract=await page.evaluate(()=>({cash:state.cash,years:roster()[0].years,id:roster()[0].id}));
 await page.evaluate(id=>gmNegotiate(id),beforeContract.id);
 const afterContract=await page.evaluate(id=>({cash:state.cash,years:state.players.find(p=>p.id===id).years}),beforeContract.id);
 if(afterContract.years<beforeContract.years)throw Error('Contract extension corrupted years');
 await page.evaluate(()=>{page='Combine';render()});
 await page.evaluate(()=>{page='Coaching Staff';render()});
 const staffCount=await page.locator('#app button[onclick^="gmHireStaff"]').count();
 if(staffCount<3)throw Error('Coaching staff hiring buttons missing');
 await page.evaluate(()=>{page='Depth Chart';render()});
 const rosterBefore=await page.evaluate(()=>GMFranchise.depth(state,state.team,'QB').map(p=>p.id));
 if(rosterBefore.length>1){
  await page.evaluate(()=>gmMoveDepth('QB',1,-1));
  const rosterAfter=await page.evaluate(()=>GMFranchise.depth(state,state.team,'QB').map(p=>p.id));
  if(String(rosterAfter[0])!==String(rosterBefore[1]))throw Error('Depth reorder not persisted');
 }
 await page.reload({waitUntil:'load'});
 const saved=await page.evaluate(()=>({week:state.week,results:state.results.length}));
 if(saved.week!==after.week||saved.results!==after.results)throw Error('Save failed to persist');
 await page.evaluate(()=>{page='Weekly Report';render();gmBoxScore(0)});
 if(await page.locator('#gm-close-box').count()!==1)throw Error('Box score modal did not open');
 await page.locator('#gm-close-box').click();
 await page.evaluate(()=>{page='Depth Chart';render()});
 const count=await page.locator('#app button[onclick^="gmMoveDepth"]').count();
 if(count<2)throw Error('Depth chart buttons missing');
 if(errors.length)throw Error('Browser exceptions: '+errors.join(' | '));
 console.log('PASS mobile navigation, 6-game simulation, reports, saves, depth chart and box scores');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
