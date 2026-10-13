const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
 await page.locator('#templatesBtn').click();await page.locator('[data-template="event"]').click();
 const b=await page.evaluate(()=>BanerlabEditor.getDocument().blocks.find(x=>x.name==='Título'));
 const box=await page.locator('#poster [data-block="'+b.id+'"]').boundingBox();
 await page.mouse.move(box.x+30,box.y+20);await page.mouse.down();await page.mouse.move(box.x+70,box.y+50,{steps:4});await page.mouse.up();
 let moved=await page.evaluate(id=>BanerlabEditor.getDocument().blocks.find(x=>x.id===id),b.id);assert.ok(moved.x>b.x&&moved.y>b.y);
 await page.locator('#undoBtn').click();let undone=await page.evaluate(id=>BanerlabEditor.getDocument().blocks.find(x=>x.id===id),b.id);assert.equal(undone.x,b.x);assert.equal(undone.y,b.y);
 await page.locator('#templatesBtn').click();await page.locator('[data-template="reference"]').click();await page.locator('#singleQuality').selectOption('72');
 const downloading=page.waitForEvent('download',{timeout:60000});await page.locator('#pdfBtn').click();await(await downloading).saveAs(path.resolve(__dirname,'../tmp/qa/reference.pdf'));
 const overflows=[];
 for(const id of ['scientific','event','business','education','minimal']){
  await page.locator('#templatesBtn').click();await page.locator(`[data-template="${id}"]`).click();await page.locator('[data-preset="90x120"]').click();
  const list=await page.locator('#poster .art-text').evaluateAll(nodes=>nodes.filter(el=>el.scrollHeight>el.parentElement.clientHeight+2).map(el=>el.textContent));
  if(list.length)overflows.push({id,list});
 }
 assert.deepEqual(overflows,[]);await browser.close();console.log('PASS: drag undo, original model with embedded image PDF, all five templates without text overflow.');
})().catch(e=>{console.error(e);process.exit(1);});
