/* BannerCore 2.0 — biblioteca local, sem dependências. */
(function(root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.BannerCore = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const VERSION = 2;
  const PRESETS = {
    '60x90': { width:60, height:90, label:'60 × 90 cm' },
    '80x120': { width:80, height:120, label:'80 × 120 cm' },
    '90x120': { width:90, height:120, label:'90 × 120 cm' },
    '100x150': { width:100, height:150, label:'100 × 150 cm' }
  };
  const FONTS = { Arial:'Arial, sans-serif', Georgia:'Georgia, serif', Verdana:'Verdana, sans-serif', Tahoma:'Tahoma, sans-serif', Mono:'"Courier New", monospace' };
  const num = (v, d, lo, hi) => Number.isFinite(Number(v)) ? Math.min(hi,Math.max(lo,Number(v))) : d;
  const text = (v,d='',limit=50000) => typeof v === 'string' ? v.slice(0,limit) : d;
  const color = (v,d='#124830') => /^#[\da-f]{6}$/i.test(v) ? v : d;
  const choice = (v,list,d) => list.includes(v) ? v : d;
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => 'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const clone = x => JSON.parse(JSON.stringify(x));
  function block(b={}) {
    const w=num(b.w,40,1,100), h=num(b.h,15,.1,100);
    return {
      id:/^[\w-]{1,80}$/.test(b.id) ? b.id : uid(), type:choice(b.type,['text','section','shape','image'],'text'),
      name:text(b.name,'Bloco',120), x:num(b.x,10,0,100-w), y:num(b.y,30,0,100-h), w,h,
      opacity:num(b.opacity,1,0,1), locked:!!b.locked, hidden:!!b.hidden,
      text:text(b.text), heading:text(b.heading,'SEÇÃO',250), fontSize:num(b.fontSize,20,4,160),
      headingSize:num(b.headingSize,13,4,100), font:choice(b.font,Object.keys(FONTS),'Arial'),
      bold:!!b.bold, italic:!!b.italic, align:choice(b.align,['left','center','right','justify'],'left'),
      valign:choice(b.valign,['top','center','bottom'],'top'), lineHeight:num(b.lineHeight,1.35,.8,3),
      color:color(b.color,'#173b2a'), fill:color(b.fill,'#faf7ef'), fillOpacity:num(b.fillOpacity,1,0,1),
      headingColor:color(b.headingColor,'#ffffff'), accent:color(b.accent,'#124830'),
      radius:num(b.radius,8,0,120), padding:num(b.padding,14,0,100), border:num(b.border,1,0,20), borderColor:color(b.borderColor,'#e8e0d1'),
      assetId:text(b.assetId,'',80), fit:choice(b.fit,['contain','cover','fill'],'contain')
    };
  }
  function normalize(input) {
    if (!input || typeof input!=='object' || !['banerlab','aquilombe-banner'].includes(input.schema) || input.version!==VERSION || !Array.isArray(input.blocks))
      throw new Error('Arquivo incompatível. Importe um JSON exportado pelo banerlab (versão 2).');
    if(input.blocks.length>500 || Object.keys(input.assets||{}).length>100) throw new Error('Limite: 500 blocos e 100 imagens por projeto.');
    const assets={};
    for(const [id,a] of Object.entries(input.assets||{})) {
      if(!/^[\w-]{1,80}$/.test(id) || !a || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(a.data||'')) throw new Error('O JSON contém uma imagem inválida. Use PNG, JPEG ou WebP incorporados.');
      if(a.data.length>28000000) throw new Error('Uma imagem excede o limite de 20 MB.');
      assets[id]={name:text(a.name,'Imagem',160),data:a.data,width:num(a.width,0,0,50000),height:num(a.height,0,0,50000)};
    }
    const blocks=input.blocks.map(block), seen=new Set();
    blocks.forEach(b=>{if(seen.has(b.id)) b.id=uid(); seen.add(b.id); if(b.type==='image'&&!assets[b.assetId])throw new Error('Uma imagem usada no projeto está ausente do JSON.');});
    const bg=input.background||{};
    if(bg.assetId&&!assets[bg.assetId]) throw new Error('A imagem de fundo está ausente do JSON.');
    return {
      schema:'banerlab',version:VERSION,id:text(input.id,uid(),80),title:text(input.title,'banerlab',160),
      preset:choice(input.preset,Object.keys(PRESETS),'90x120'),
      background:{color:color(bg.color,'#ffffff'),assetId:text(bg.assetId,'',80),opacity:num(bg.opacity,.2,0,1),fit:choice(bg.fit,['contain','cover','fill'],'cover')},
      assets, blocks,
      api:{baseUrl:text(input.api?.baseUrl,'',2048),path:text(input.api?.path,'/banners',200)},
      updatedAt:text(input.updatedAt,new Date().toISOString(),40)
    };
  }
  function blank() { return {schema:'banerlab',version:VERSION,id:uid(),title:'banerlab',preset:'90x120',background:{color:'#ffffff',assetId:'',opacity:.2,fit:'cover'},assets:{},blocks:[],api:{baseUrl:'',path:'/banners'},updatedAt:new Date().toISOString()}; }
  function model(reference) {
    const doc=blank();doc.title='banerlab';doc.assets={reference};
    doc.blocks.push(block({type:'image',name:'Cabeçalho original do PPTX',x:.37,y:0,w:99.63,h:19.48,assetId:'reference',fit:'fill',locked:true}));
    doc.blocks.push(block({type:'shape',name:'Linha do cabeçalho',x:3.95,y:19.43,w:92.1,h:.22,fill:'#d27e14',border:0,radius:0}));
    const sections=[
      ['TÍTULO DO PROJETO',4.37,20.55,91.25,7.25,'#124830',26],
      ['AUTORES(AS)',4.51,28.80,91.25,4.1,'#ae3f22',17],
      ['INTRODUÇÃO',4.37,35.44,44.57,15.63,'#124830',18],
      ['OBJETIVOS',51.19,35.44,44.57,15.77,'#d27e14',18],
      ['METODOLOGIA',4.5,52.86,44.57,14.69,'#ae3f22',18],
      ['RESULTADOS E DISCUSSÕES',51.19,52.86,44.57,14.69,'#124830',18],
      ['CONSIDERAÇÕES FINAIS',4.37,69.08,44.57,26.17,'#d27e14',18],
      ['REFERÊNCIAS BIBLIOGRÁFICAS',51.06,69.08,44.57,26.17,'#ae3f22',16]
    ];
    sections.forEach(([heading,x,y,w,h,accent,fontSize])=>doc.blocks.push(block({type:'section',name:heading,heading,x,y,w,h,accent,fontSize,headingSize:13,text:'INSIRA O CONTEÚDO AQUI',align:'center',valign:'center',bold:heading==='TÍTULO DO PROJETO',radius:10,padding:15})));
    doc.blocks.push(block({type:'text',name:'Rodapé',x:4.37,y:96.5,w:91.25,h:2,text:'◆    ◆    ◆    ◆    ◆    ◆    ◆    ◆    ◆    ◆    ◆    ◆',fontSize:12,color:'#ae3f22',align:'center',valign:'center',padding:0,border:0,fillOpacity:0}));
    return doc;
  }
  const cq = n => `${Number(n)/9}cqw`;
  const rgba=(hex,a)=>`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
  function blockHTML(b,assets) {
    if(b.hidden) return '';
    const outer=`left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;opacity:${b.opacity}`;
    const box=`background:${rgba(b.fill,b.fillOpacity)};border:${cq(b.border)} solid ${b.borderColor};border-radius:${cq(b.radius)}`;
    const typ=`font-family:${esc(FONTS[b.font])};font-size:${cq(b.fontSize)};font-weight:${b.bold?700:400};font-style:${b.italic?'italic':'normal'};line-height:${b.lineHeight};color:${b.color};text-align:${b.align};justify-content:${{top:'flex-start',center:'center',bottom:'flex-end'}[b.valign]};padding:${cq(b.padding)}`;
    let content='';
    if(b.type==='image') content=`<img src="${esc(assets[b.assetId]?.data||'')}" alt="${esc(b.name)}" draggable="false" style="object-fit:${b.fit};${box}">`;
    else if(b.type==='shape') content=`<div class="art-shape" style="${box}"></div>`;
    else if(b.type==='section') content=`<div class="art-section" style="${box}"><div class="art-heading" style="background:${b.accent};color:${b.headingColor};font-family:${esc(FONTS[b.font])};font-size:${cq(b.headingSize)};padding:${cq(5)} ${cq(12)}">${esc(b.heading)}</div><div class="art-body" style="${typ}"><div class="art-text">${esc(b.text)}</div></div></div>`;
    else content=`<div class="art-body" style="${box};${typ}"><div class="art-text">${esc(b.text)}</div></div>`;
    return `<div class="art-block" data-block="${b.id}" style="${outer}">${content}</div>`;
  }
  const ART_CSS=`.poster{position:relative;container-type:inline-size;overflow:hidden;isolation:isolate;box-sizing:border-box}.poster *{box-sizing:border-box}.art-bg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.art-block{position:absolute;box-sizing:border-box}.art-block>img{width:100%;height:100%;display:block;pointer-events:none}.art-shape,.art-section,.art-body{width:100%;height:100%}.art-section{display:flex;flex-direction:column;overflow:hidden}.art-heading{flex:none;font-weight:700;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.15;width:fit-content;max-width:100%;border-radius:0 0 .5cqw 0}.art-body{display:flex;flex-direction:column;min-height:0;overflow:hidden;flex:1}.art-text{flex:none;width:100%;white-space:pre-wrap;overflow-wrap:anywhere}.poster{-webkit-print-color-adjust:exact;print-color-adjust:exact}`;
  function posterHTML(doc) {
    const bg=doc.background,a=doc.assets[bg.assetId];
    return (a?`<img class="art-bg" src="${esc(a.data)}" alt="" style="object-fit:${bg.fit};opacity:${bg.opacity}">`:'')+doc.blocks.map(b=>blockHTML(b,doc.assets)).join('');
  }
  function printHTML(input) {
    const doc=normalize(input),p=PRESETS[doc.preset];
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.title)}</title><meta name="generator" content="banerlab offline 2.0"><style>${ART_CSS}
      @page{size:${p.width}cm ${p.height}cm;margin:0}html,body{margin:0;padding:0}body{background:#d9ddd8;font-family:Arial,sans-serif}.print-tools{max-width:900px;margin:24px auto;padding:16px;background:white;border-radius:8px;font-size:14px;line-height:1.5}.print-tools button{background:#124830;color:white;padding:12px 20px;border:0;border-radius:6px;font-weight:bold;cursor:pointer}.print-tools p{margin:10px 0 0}.poster{width:min(95vw,900px);aspect-ratio:${p.width}/${p.height};background:${doc.background.color};margin:20px auto;box-shadow:0 6px 30px #0002}
      @media print{html,body{width:${p.width}cm;height:${p.height}cm;background:white}.print-tools{display:none}.poster{margin:0;width:${p.width}cm;height:${p.height}cm;aspect-ratio:auto;box-shadow:none;break-inside:avoid}}</style></head><body><header class="print-tools"><button id="doPrint">Imprimir / salvar PDF</button><p><strong>${esc(doc.title)} · ${p.label}</strong><br>Use escala 100%, margens zero e gráficos de fundo ativados. Desative os cabeçalhos e rodapés do navegador. Para impressão física, selecione um equipamento que aceite ${p.label}.</p><p>Arquivo independente: todas as imagens estão incorporadas. O tamanho indicado em @page pode depender do navegador e do driver. Confira a dimensão do PDF antes de enviar à gráfica.</p></header><main class="poster">${posterHTML(doc)}</main><script>document.getElementById('doPrint').addEventListener('click',async()=>{await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})));window.print()})<\/script></body></html>`;
  }
  function printBatchHTML(inputs) {
    const docs = inputs.map(normalize);
    if (!docs.length) throw new Error('Adicione pelo menos um JSON ao lote.');
    const pageRules = docs.map(d => {
      const p = PRESETS[d.preset];
      return `@page page-${d.preset}{size:${p.width}cm ${p.height}cm;margin:0}`;
    }).filter((rule,i,all)=>all.indexOf(rule)===i).join('');
    const pages = docs.map((d,index) => {
      const p = PRESETS[d.preset];
      return `<section class="batch-page" style="page:page-${d.preset};width:${p.width}cm;height:${p.height}cm;background:${d.background.color}" data-page="${index+1}">${posterHTML(d)}</section>`;
    }).join('');
    const title = docs.length === 1 ? docs[0].title : `banerlab · lote com ${docs.length} páginas`;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="generator" content="banerlab offline 2.0"><style>${ART_CSS}
      ${pageRules}html,body{margin:0;padding:0;background:#d9ddd8;font-family:Arial,sans-serif}.batch-tools{max-width:920px;margin:24px auto;padding:18px;background:#fff;border-radius:8px;font-size:14px;line-height:1.5;box-shadow:0 5px 20px #0001}.batch-tools button{background:#124830;color:#fff;padding:11px 18px;border:0;border-radius:6px;font-weight:bold;cursor:pointer}.batch-tools p{margin:10px 0 0}.batch-page{position:relative;container-type:inline-size;overflow:hidden;page-break-after:always;break-after:page;box-shadow:0 6px 30px #0002;margin:20px auto}.batch-page:last-child{page-break-after:auto;break-after:auto}@media print{html,body{background:#fff}.batch-tools{display:none}.batch-page{margin:0;box-shadow:none}}
    </style></head><body><header class="batch-tools"><button id="doPrint">Imprimir / salvar PDF</button><p><strong>${esc(title)}</strong><br>${docs.length} JSON(s) processado(s). O lote usa uma página por projeto, preserva o tamanho de cada preset e inclui as imagens incorporadas.</p><p>Na impressão, use escala 100%, margens zero, gráficos de fundo ativados e cabeçalhos e rodapés desativados. Se o navegador pedir confirmação de tamanhos diferentes, aceite a configuração sugerida.</p></header><main>${pages}</main><script>document.getElementById('doPrint').addEventListener('click',async()=>{await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})));window.print()})<\/script></body></html>`;
  }
  function preflight(doc) {
    const p=PRESETS[doc.preset],issues=[];
    doc.blocks.filter(b=>!b.hidden&&b.opacity>0).forEach(b=>{
      if(/insira o conte[uú]do|digite seu texto/i.test(b.text))issues.push(`${b.name}: substitua o texto de exemplo antes de imprimir.`);
    });
    doc.blocks.filter(b=>!b.hidden&&b.opacity>0&&b.type==='image').forEach(b=>{
      const a=doc.assets[b.assetId];if(!a?.width)return;
      const dpi=b.fit==='contain'?Math.max(a.width/(p.width*b.w/100/2.54),a.height/(p.height*b.h/100/2.54)):Math.min(a.width/(p.width*b.w/100/2.54),a.height/(p.height*b.h/100/2.54));
      if(dpi<100)issues.push(`${b.name}: cerca de ${Math.round(dpi)} dpi neste tamanho. Uma imagem maior melhora a nitidez.`);
    });
    if(!doc.blocks.some(b=>!b.hidden))issues.push('O banner não contém blocos visíveis.');
    return issues;
  }
  function filename(title){return (String(title||'banerlab').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,100)||'banerlab');}
  function align(b,mode){
    if(b.locked)return;
    if(mode==='left')b.x=0;if(mode==='center')b.x=(100-b.w)/2;if(mode==='right')b.x=100-b.w;
    if(mode==='top')b.y=0;if(mode==='middle')b.y=(100-b.h)/2;if(mode==='bottom')b.y=100-b.h;
  }
  function reorder(blocks,id,direction){
    const i=blocks.findIndex(b=>b.id===id);if(i<0||blocks[i].locked)return;
    const target={front:blocks.length-1,back:0,up:Math.min(blocks.length-1,i+1),down:Math.max(0,i-1)}[direction];
    if(target===undefined)return;const [b]=blocks.splice(i,1);blocks.splice(target,0,b);
  }
  function apiURL(base,path,id){
    const url=new URL(base.replace(/\/+$/,'')+'/'+path.replace(/^\/+|\/+$/g,''));
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Use uma URL HTTP ou HTTPS sem credenciais.');
    if(id)url.pathname=url.pathname.replace(/\/$/,'')+'/'+encodeURIComponent(id);
    return url.href;
  }
  return {VERSION,PRESETS,FONTS,uid,clone,esc,block,normalize,blank,model,ART_CSS,posterHTML,printHTML,printBatchHTML,preflight,filename,align,reorder,apiURL};
});

