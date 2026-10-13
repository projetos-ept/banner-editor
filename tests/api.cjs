const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    const page=await browser.newPage(),calls=[],token='browser-test-token-not-a-real-credential';let stored;
    await page.route('https://api.banerlab.test/**',async route=>{
      const req=route.request();calls.push({method:req.method(),headers:req.headers(),body:req.postData()});
      const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
      if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
      if(req.method()==='POST'){stored=JSON.parse(req.postData());return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({id:stored.id})});}
      return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({...stored,title:'Carregado da API',api:{baseUrl:'https://old.test',path:'/old'}})});
    });
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.getByText('Integração com API',{exact:true}).click();await page.locator('#apiUrl').fill('https://api.banerlab.test/v1');await page.locator('#apiToken').fill(token);await page.locator('#apiSave').click();
    await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Projeto enviado para a API.');
    const sent=calls.find(r=>r.method==='POST');assert.equal(sent.headers.authorization,'Bearer '+token);assert.ok(!sent.body.includes(token));
    await page.locator('#apiLoad').click();await page.waitForFunction(()=>document.querySelector('#documentName').value==='Carregado da API');
    assert.equal(await page.locator('#apiUrl').inputValue(),'https://api.banerlab.test/v1');assert.equal(await page.locator('#apiToken').inputValue(),token);
    assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes(token));
    await page.reload();assert.equal(await page.locator('#apiToken').inputValue(),'');
    console.log('PASS: editor Bearer POST/GET, connection preserved, token excluded from document/storage and cleared on reload.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
