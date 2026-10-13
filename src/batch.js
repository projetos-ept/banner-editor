/* Local hash route. Queue state does not mutate or overwrite the editor. */
(function(){
  'use strict';
  const Core=window.BannerCore,$=s=>document.querySelector(s);
  const MAX_FILES=50,MAX_BYTES=150*1024*1024,MAX_FILE=40*1024*1024;
  let items=[],busy=false,controller=null,resultURL=null,onReturn=()=>{};
  const route=()=>['#lote','#/lote'].includes(location.hash);
  const valid=()=>items.filter(x=>x.doc);
  function invalidate(){if(resultURL)URL.revokeObjectURL(resultURL);resultURL=null;$('#batchResult').hidden=true;}
  function showRoute(){
    $('.app').hidden=route();$('#batchRoute').hidden=!route();
    document.title=route()?'banerlab · lote':'banerlab';
    if(route())render();else requestAnimationFrame(onReturn);
  }
  function progress(message){$('#batchProgress').textContent=message;}
  function statusControls(){
    const ready=valid().length>0&&!busy;
    ['batchPdfBtn','batchPdfBtn2','batchHtmlBtn','batchHtmlBtn2'].forEach(id=>$('#'+id).disabled=!ready);
    ['batchAddBtn','batchClearBtn','batchQuality','batchCurrentBtn','batchSortBtn','batchAllPreset','batchName'].forEach(id=>$('#'+id).disabled=busy);
    $('#batchCancelBtn').hidden=!controller;
  }
  function render(){
    const docs=valid(),rejected=items.length-docs.length,sizes={};
    docs.forEach(i=>sizes[i.doc.preset]=(sizes[i.doc.preset]||0)+1);
    $('#batchCount').textContent=docs.length;
    $('#batchSummary').innerHTML=docs.length?`<strong>${docs.length} ${docs.length===1?'página válida':'páginas válidas'}</strong>${Object.entries(sizes).map(([id,n])=>`${n} × ${Core.PRESETS[id].label}`).join('<br>')}`:'Aguardando arquivos JSON.';
    $('#batchErrors').hidden=!rejected;
    $('#batchErrors').textContent=`${rejected} arquivo(s) inválido(s) não serão incluídos no PDF. Veja os motivos na fila.`;
    let page=0;
    $('#batchList').innerHTML=items.length?items.map((item,index)=>{
      const good=!!item.doc,p=good?Core.PRESETS[item.doc.preset]:null;
      if(good)page++;
      const output=good?window.BanerlabPDF.resolution(item.doc.preset,Number($('#batchQuality').value)):null;
      return `<article class="batch-row ${good?'':'invalid'}" data-batch-row="${index}">
        <div class="batch-index">${good?String(page).padStart(2,'0'):'!'}</div>
        <div class="batch-preview" ${good?`style="height:${78*p.height/p.width}px"`:''}>${good?`<div class="poster" style="background:${item.doc.background.color}">${Core.posterHTML(item.doc)}</div>`:''}</div>
        <div class="batch-description"><strong>${Core.esc(good?item.doc.title:item.fileName)}</strong><small>${Core.esc(item.fileName)}</small>${good?`<small>${p.label} · ${item.doc.blocks.length} blocos · PDF a ${output.dpi} dpi</small>`:`<p class="batch-error">${Core.esc(item.error)}</p>`}
        ${good&&item.issues.length?`<details><summary>Avisos (${item.issues.length})</summary><ul>${item.issues.map(v=>`<li>${Core.esc(v)}</li>`).join('')}</ul></details>`:''}</div>
        <div class="batch-row-actions">${good?`<label><span class="help">Medida da página</span><select data-action="preset" data-index="${index}" aria-label="Medida da página ${page}" ${busy?'disabled':''}>${Object.entries(Core.PRESETS).map(([id,p])=>`<option value="${id}" ${item.doc.preset===id?'selected':''}>${p.label}</option>`).join('')}</select></label>`:''}<div class="batch-tools"><button data-action="up" data-index="${index}" aria-label="Subir ${Core.esc(item.fileName)}" ${index===0||busy?'disabled':''}>↑</button><button data-action="down" data-index="${index}" aria-label="Descer ${Core.esc(item.fileName)}" ${index===items.length-1||busy?'disabled':''}>↓</button><button data-action="remove" data-index="${index}" aria-label="Remover ${Core.esc(item.fileName)}" ${busy?'disabled':''}>×</button></div></div></article>`;
    }).join(''):'<div class="batch-empty"><strong>Sua fila começa aqui</strong><p>Adicione vários JSONs de uma vez.<br>A ordem da lista será a ordem das páginas no PDF.</p></div>';
    statusControls();
  }
  async function addFiles(files){
    if(busy)return;
    busy=true;invalidate();render();let added=0;
    try{
      let bytes=items.reduce((n,x)=>n+x.bytes,0);
      for(const file of Array.from(files)) {
        if(items.length>=MAX_FILES){progress(`Limite de ${MAX_FILES} arquivos atingido. Os demais não foram adicionados.`);break;}
        const item={fileName:file.name,bytes:0,doc:null,issues:[],error:''};
        try{
          if(file.size>MAX_FILE)throw new Error('Arquivo maior que 40 MB.');
          if(bytes+file.size>MAX_BYTES)throw new Error('O lote excede 150 MB. Remova arquivos antes de adicioná-lo.');
          const raw=JSON.parse(await file.text());
          if(!Core.PRESETS[raw.preset])throw new Error('Medida de banner desconhecida. Abra o projeto no editor e exporte novamente.');
          item.doc=Core.normalize(raw);item.issues=Core.preflight(item.doc);item.bytes=file.size;bytes+=file.size;added++;
        }catch(e){item.error=e instanceof SyntaxError?'JSON malformado: confira o arquivo de origem.':e.message;}
        items.push(item);render();
      }
      if(items.length<MAX_FILES)progress(`${added} projeto(s) adicionado(s). A fila permanece nesta sessão até recarregar ou fechar a página.`);
    }finally{busy=false;render();}
  }
  function result(blob,name,message){
    invalidate();resultURL=URL.createObjectURL(blob);
    const link=$('#batchDownload');link.href=resultURL;link.download=name;link.textContent='Baixar '+name;
    $('#batchResult').hidden=false;progress(message);link.click();
  }
  async function pdf(){
    if(busy||!valid().length)return;
    invalidate();busy=true;controller=new AbortController();render();
    try {
      const dpi=Number($('#batchQuality').value),docs=valid().map(x=>x.doc);
      const bytes=await window.BanerlabPDF.create(docs,{dpi,signal:controller.signal,onProgress:(n,total,title)=>{
        $('#batchMeter').max=total;$('#batchMeter').value=n;
        progress(n<total?`Gerando página ${n+1} de ${total}: ${title}`:'Concluindo o arquivo PDF…');
      }});
      if(controller.signal.aborted)throw new DOMException('Cancelado','AbortError');
      result(new Blob([bytes],{type:'application/pdf'}),Core.filename($('#batchName').value)+'.pdf',`PDF pronto: ${docs.length} páginas na ordem da fila.`);
    }catch(e){progress(e.name==='AbortError'?'Geração cancelada. Nenhum PDF parcial foi baixado.':`Não foi possível gerar o PDF: ${e.message}`);}
    finally{controller=null;busy=false;render();}
  }
  function html(){
    if(busy||!valid().length)return;
    try{result(new Blob([Core.printBatchHTML(valid().map(x=>x.doc))],{type:'text/html;charset=utf-8'}),Core.filename($('#batchName').value)+'.html','HTML multipágina pronto. Abra-o para imprimir ou salvar como PDF pelo navegador.');}
    catch(e){progress(e.message);}
  }
  function init(options={}){
    onReturn=options.onReturn||(()=>{});
    $('#batchBtn').onclick=()=>{location.hash='/lote';showRoute();};
    $('#backEditorBtn').onclick=()=>{location.hash='/editor';showRoute();};
    $('#batchAddBtn').onclick=()=>$('#batchFiles').click();
    $('#batchFiles').onchange=e=>{const files=Array.from(e.target.files);e.target.value='';addFiles(files);};
    $('#batchClearBtn').onclick=()=>{if(busy)return;items=[];invalidate();progress('Fila limpa.');render();};
    $('#batchPdfBtn').onclick=pdf;$('#batchPdfBtn2').onclick=pdf;$('#batchHtmlBtn').onclick=html;$('#batchHtmlBtn2').onclick=html;
    $('#batchCancelBtn').onclick=()=>{controller?.abort();progress('Cancelando após concluir a operação atual…');};
    $('#batchQuality').onchange=()=>{invalidate();render();};
    $('#batchName').onchange=invalidate;
    $('#batchCurrentBtn').onclick=()=>{if(busy)return;const doc=window.BanerlabEditor.getDocument();addFiles([new File([JSON.stringify(doc)],Core.filename(doc.title)+'.json',{type:'application/json'})]);};
    $('#batchSortBtn').onclick=()=>{if(busy)return;items.sort((a,b)=>(a.doc?.title||a.fileName).localeCompare(b.doc?.title||b.fileName,'pt-BR',{numeric:true}));invalidate();render();};
    $('#batchAllPreset').onchange=e=>{if(busy||!Core.PRESETS[e.target.value])return;valid().forEach(item=>{item.doc.preset=e.target.value;item.issues=Core.preflight(item.doc);});e.target.value='';invalidate();render();};
    const drop=$('#batchDrop');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover');});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');addFiles(e.dataTransfer.files);});
    $('#batchList').addEventListener('click',e=>{
      const button=e.target.closest('button[data-action]');if(!button||busy)return;
      const i=Number(button.dataset.index),action=button.dataset.action;
      if(action==='remove')items.splice(i,1);
      if(action==='up'&&i>0)[items[i-1],items[i]]=[items[i],items[i-1]];
      if(action==='down'&&i<items.length-1)[items[i+1],items[i]]=[items[i],items[i+1]];
      invalidate();render();
    });
    $('#batchList').addEventListener('change',e=>{
      if(!e.target.matches('[data-action="preset"]')||busy)return;
      const item=items[Number(e.target.dataset.index)];item.doc.preset=e.target.value;item.issues=Core.preflight(item.doc);invalidate();render();
    });
    window.addEventListener('hashchange',showRoute);
    window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
    showRoute();
  }
  window.BanerlabBatch={init};
  init();
})();
