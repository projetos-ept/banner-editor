/* Offline raster export: HTML text/shapes + native canvas images in layer order. */
(function(){
  'use strict';
  const Core=window.BannerCore;
  const abortIfNeeded=signal=>{if(signal?.aborted)throw new DOMException('Geração cancelada.','AbortError');};
  const idle=()=>new Promise(resolve=>setTimeout(resolve,0));
  function resolution(preset,dpi){
    const p=Core.PRESETS[preset],safeDpi=Math.max(36,Math.min(300,Number(dpi)||150));
    const w=p.width/2.54*safeDpi,h=p.height/2.54*safeDpi;
    const factor=Math.min(1,8192/w,8192/h,Math.sqrt(40000000/(w*h)));
    return {width:Math.round(w*factor),height:Math.round(h*factor),dpi:Math.round(safeDpi*factor)};
  }
  async function loadAssets(doc,signal){
    const images={};
    for(const [id,asset] of Object.entries(doc.assets)){
      abortIfNeeded(signal);const image=new Image();image.src=asset.data;
      try{await image.decode();}catch{throw new Error(`${doc.title}: imagem inválida (${asset.name}).`);}
      images[id]=image;
    }
    return images;
  }
  function drawFitted(ctx,image,x,y,w,h,fit){
    if(w<=0||h<=0)return;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    let dw=w,dh=h;
    if(fit!=='fill'){
      const scale=(fit==='cover'?Math.max:Math.min)(w/image.naturalWidth,h/image.naturalHeight);
      dw=image.naturalWidth*scale;dh=image.naturalHeight*scale;
    }
    ctx.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore();
  }
  function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));}
  function drawImageBlock(ctx,b,image,height){
    const x=b.x*9,y=b.y*height/100,w=b.w*9,h=b.h*height/100,border=Math.min(b.border,w/2,h/2);
    ctx.save();ctx.globalAlpha=b.opacity;rounded(ctx,x,y,w,h,b.radius);ctx.clip();
    ctx.fillStyle=b.fill;ctx.globalAlpha=b.opacity*b.fillOpacity;ctx.fillRect(x,y,w,h);ctx.globalAlpha=b.opacity;
    drawFitted(ctx,image,x+border,y+border,w-2*border,h-2*border,b.fit);
    if(border){ctx.strokeStyle=b.borderColor;ctx.lineWidth=border;rounded(ctx,x+border/2,y+border/2,w-border,h-border,Math.max(0,b.radius-border/2));ctx.stroke();}
    ctx.restore();
  }
  async function drawHTML(ctx,doc,blocks,height,r,signal){
    if(!blocks.length)return;
    const units=s=>s.replace(/([\d.]+)cqw/g,(_,v)=>`${Number(v)*9}px`);
    const root=document.createElement('div');root.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
    const subset={...doc,blocks,background:{...doc.background,assetId:''}};
    root.innerHTML=`<style>${units(Core.ART_CSS)}</style><div class="poster" style="width:900px;height:${height}px;font-family:Arial,sans-serif">${units(Core.posterHTML(subset))}</div>`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}" height="${r.height}" viewBox="0 0 900 ${height}"><foreignObject x="0" y="0" width="900" height="${height}">${new XMLSerializer().serializeToString(root)}</foreignObject></svg>`;
    const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));});
    const image=new Image();image.src=url;await image.decode();abortIfNeeded(signal);ctx.drawImage(image,0,0,900,height);image.src='';
  }
  async function pageImage(doc,dpi,signal,type='image/jpeg'){
    const p=Core.PRESETS[doc.preset],r=resolution(doc.preset,dpi),height=900*p.height/p.width;
    const images=await loadAssets(doc,signal),canvas=document.createElement('canvas');canvas.width=r.width;canvas.height=r.height;
    try{
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Não foi possível preparar a página. Tente 72 dpi.');
      ctx.scale(r.width/900,r.height/height);ctx.fillStyle=doc.background.color;ctx.fillRect(0,0,900,height);
      const bg=doc.background;if(images[bg.assetId]){ctx.save();ctx.globalAlpha=bg.opacity;drawFitted(ctx,images[bg.assetId],0,0,900,height,bg.fit);ctx.restore();}
      let group=[];
      // Keep the exact stacking order while avoiding nested PNG decoding inside SVG.
      for(const b of doc.blocks){
        abortIfNeeded(signal);if(b.hidden||b.opacity===0)continue;
        if(b.type==='image'){await drawHTML(ctx,doc,group,height,r,signal);group=[];drawImageBlock(ctx,b,images[b.assetId],height);}
        else group.push(b);
      }
      await drawHTML(ctx,doc,group,height,r,signal);abortIfNeeded(signal);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,.98));if(!blob)throw new Error('Não foi possível renderizar. Reduza a qualidade.');return blob;
    }finally{canvas.width=1;canvas.height=1;Object.values(images).forEach(i=>i.src='');}
  }
  async function png(input,{dpi=150,signal}={}){return pageImage(Core.normalize(input),dpi,signal,'image/png');}
  async function create(inputs,{dpi=150,signal,onProgress=()=>{},title='banerlab · lote'}={}){
    if(!inputs.length)throw new Error('Adicione pelo menos um JSON válido.');
    if(!window.PDFLib)throw new Error('Biblioteca PDF ausente. Abra o HTML completo do banerlab.');
    const pdf=await PDFLib.PDFDocument.create();pdf.setTitle(title);pdf.setCreator('banerlab');pdf.setProducer('banerlab / pdf-lib');pdf.setLanguage('pt-BR');
    pdf.catalog.getOrCreateViewerPreferences().setPrintScaling(PDFLib.PrintScaling.None);
    for(let i=0;i<inputs.length;i++){
      abortIfNeeded(signal);const doc=Core.normalize(inputs[i]),p=Core.PRESETS[doc.preset];onProgress(i,inputs.length,doc.title);await idle();
      const jpg=new Uint8Array(await(await pageImage(doc,dpi,signal)).arrayBuffer());abortIfNeeded(signal);
      const image=await pdf.embedJpg(jpg),width=p.width*72/2.54,height=p.height*72/2.54;
      pdf.addPage([width,height]).drawImage(image,{x:0,y:0,width,height});await pdf.flush();onProgress(i+1,inputs.length,doc.title);await idle();
    }
    abortIfNeeded(signal);return pdf.save();
  }
  window.BanerlabPDF={create,resolution,png};
})();
