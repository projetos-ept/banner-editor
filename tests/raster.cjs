const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage();await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
 const result=await page.evaluate(async()=>{
  const source=document.createElement('canvas');source.width=source.height=16;const sc=source.getContext('2d');sc.fillStyle='#00ff00';sc.fillRect(0,0,16,16);
  const d=BannerCore.blank();d.preset='60x90';d.assets.sample={data:source.toDataURL(),name:'Verde',width:16,height:16};
  d.blocks=[BannerCore.block({type:'shape',x:10,y:10,w:70,h:70,fill:'#0000ff',radius:0,border:0}),BannerCore.block({type:'image',assetId:'sample',x:20,y:20,w:40,h:40,fit:'fill',opacity:.5,fillOpacity:0,border:0,radius:0}),BannerCore.block({type:'shape',x:40,y:40,w:20,h:20,fill:'#ff0000',radius:0,border:0})];
  const blob=await BanerlabPDF.png(d,{dpi:36}),url=URL.createObjectURL(blob),im=new Image();im.src=url;await im.decode();
  const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;const ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);
  const samples=[[5,5],[15,15],[25,25],[45,45]].map(([x,y])=>Array.from(ctx.getImageData(Math.floor(x/100*canvas.width),Math.floor(y/100*canvas.height),1,1).data));
  URL.revokeObjectURL(url);const controller=new AbortController();controller.abort();let aborted=false;
  try{await BanerlabPDF.create([d],{signal:controller.signal});}catch(e){aborted=e.name==='AbortError';}
  return {samples,aborted};
 });
 const expected=[[255,255,255,255],[0,0,255,255],[0,128,127,255],[255,0,0,255]];
 result.samples.forEach((pixel,i)=>pixel.forEach((v,j)=>assert.ok(Math.abs(v-expected[i][j])<=3,`pixel ${i}, canal ${j}: ${v}`)));
 assert.equal(result.aborted,true);await browser.close();console.log('PASS: raster stacking, image opacity, background, and cancellation.');
})().catch(e=>{console.error(e);process.exit(1);});
