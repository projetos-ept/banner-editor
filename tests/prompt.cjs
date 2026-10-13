const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    // Exercise clipboard calls without replacing the user's operating-system clipboard.
    await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedPrompt=text;}}}));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.locator('#aiPromptBtn').click();await page.waitForFunction(()=>document.querySelector('#aiPromptStatus').textContent.startsWith('Prompt copiado!'));
    const prompt=await page.locator('#aiPromptText').inputValue();assert.equal(await page.evaluate(()=>window.copiedPrompt),prompt);
    const base=JSON.parse(prompt.split('\nJSON-BASE COMPLETO\n')[1]);assert.equal(base.blocks.length,4);
    await page.evaluate(async data=>{const im=new Image();im.src=data;await im.decode();},base.assets.imagem_exemplo.data);
    const ready=page.waitForEvent('download');await page.locator('#aiPromptDownload').click();const download=await ready;
    assert.equal(download.suggestedFilename(),'banerlab-prompt-ia.txt');const tmp=await download.path();assert.equal(fs.readFileSync(tmp,'utf8'),prompt);
    await page.locator('#aiPromptDialog [aria-label="Fechar prompt IA"]').click();
    await page.locator('#jsonFile').setInputFiles({name:'gerado.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(base))});
    await page.waitForFunction(()=>BanerlabEditor.getDocument().blocks.length===4);
    await page.locator('#aiPromptBtn').click();await page.locator('#aiPromptCurrent').check();await page.locator('#aiPromptCopy').click();
    await page.waitForFunction(()=>document.querySelector('#aiPromptStatus').textContent.startsWith('Prompt copiado!'));
    const copied=JSON.parse((await page.evaluate(()=>window.copiedPrompt)).split('\nJSON-BASE COMPLETO\n')[1]);assert.deepEqual(copied,await page.evaluate(()=>BanerlabEditor.getDocument()));
    // Legacy clipboard fallback and manual fallback must never report false success.
    await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('blocked');};document.execCommand=()=>{window.legacyCopied=document.querySelector('#aiPromptText').value;return true;};});
    await page.locator('#aiPromptCopy').click();await page.waitForFunction(()=>!!window.legacyCopied);assert.equal(await page.evaluate(()=>window.legacyCopied),await page.locator('#aiPromptText').inputValue());
    await page.evaluate(()=>document.execCommand=()=>false);await page.locator('#aiPromptCopy').click();await page.waitForFunction(()=>document.querySelector('#aiPromptStatus').textContent.includes('não permitiu'));
    assert.equal(await page.locator('#aiPromptText').evaluate(el=>el.selectionEnd-el.selectionStart), (await page.locator('#aiPromptText').inputValue()).length);
    const out=path.resolve(__dirname,'../tmp/qa');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'prompt-ia.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
    console.log('PASS: prompt button, clipboard calls and fallbacks, TXT, example image, JSON import, current document and mobile.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
