(function() {
  'use strict';
  const Core = window.BannerCore;
  if (!Core) throw new Error('BannerCore não carregou.');
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const STORAGE = 'aquilombe-banner-lab:document:v2';
  const PROJECTS = 'aquilombe-banner-lab:projects:v2';
  const REF = JSON.parse($('#referenceData').textContent || '{}');
  const colors = [{name:'Verde',value:'#124830'},{name:'Laranja',value:'#d27e14'},{name:'Terracota',value:'#ae3f22'},{name:'Papel',value:'#faf7ef'},{name:'Carvão',value:'#193627'}];
  let doc = null, selected = null, zoomMode = 'fit', preview = false, clipboard = null, exporting = false, editing = false;
  let undoStack = [], redoStack = [], drag = null, toastTimer = null;

  function deep(x){ return Core.clone(x); }
  function freshDoc(){ return Core.blank(); }
  function safeLoad(){ try { const raw=localStorage.getItem(STORAGE); if(!raw)return null; const loaded=Core.normalize(JSON.parse(raw)); if(/^aquilombe-se/i.test(loaded.title||''))loaded.title='banerlab'; return loaded; } catch(e){ console.warn(e); return null; } }
  function saveLocal(){ try { doc.updatedAt=new Date().toISOString(); localStorage.setItem(STORAGE, JSON.stringify(doc)); $('#saveStatus').textContent='salvo localmente · '+new Date(doc.updatedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); } catch(e){ $('#saveStatus').textContent='não foi possível salvar localmente'; } }
  function snapshot(){ return deep(doc); }
  function commit(next, description='alteração'){ const normalized=Core.normalize(next); remember(); doc=normalized; selected=selected && doc.blocks.some(b=>b.id===selected) ? selected : (doc.blocks[doc.blocks.length-1]?.id||null); render(); saveLocal(); }
  function mutate(fn, description='alteração'){ const next=snapshot(); fn(next); commit(next,description); }
  function undo(){ if(!undoStack.length)return; redoStack.push(snapshot()); doc=undoStack.pop(); selected=doc.blocks[doc.blocks.length-1]?.id||null; render(); saveLocal(); }
  function redo(){ if(!redoStack.length)return; undoStack.push(snapshot()); doc=redoStack.pop(); render(); saveLocal(); }
  function toast(message,error=false){ const el=$('#toast');el.textContent=message;el.className='toast'+(error?' error':'');el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3600); }
  function showDialog(title,html,actions=''){ $('#dialogTitle').textContent=title;$('#dialogBody').innerHTML=html;$('#dialogActions').innerHTML=actions;$('#messageDialog').showModal(); }
  function download(name,type,data){ const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1200); }
  function fmtDate(value){return new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});}
  function render(){ $('#undoBtn').disabled=!undoStack.length;$('#redoBtn').disabled=!redoStack.length;renderMeta();renderPresets();renderAssets();renderBg();renderLayers();renderProperties();renderPoster();renderProjects();renderAPI(); }
  function renderMeta(){ const p=Core.PRESETS[doc.preset];$('#documentName').value=doc.title;$('#sizeLabel').textContent=p.label;$('#apiId').textContent='ID local: '+doc.id; }
  function renderPresets(){ $('#presets').innerHTML=Object.entries(Core.PRESETS).map(([id,p])=>`<button class="preset ${doc.preset===id?'active':''}" data-preset="${id}"><strong>${p.label}</strong><small>proporção ${Math.round(p.width/p.height*100)}%</small></button>`).join('');$$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{ if(doc.preset===b.dataset.preset)return;mutate(d=>{d.preset=b.dataset.preset},'tamanho'); })); }
  function renderAssets(){ const items=Object.entries(doc.assets);$('#assets').innerHTML=items.length?items.map(([id,a])=>`<button class="asset" data-asset="${id}" title="Adicionar ${Core.esc(a.name)} ao banner"><img src="${a.data}" alt=""><span>${Core.esc(a.name)}</span></button>`).join(''):'<p class="help">Nenhuma imagem local adicionada.</p>';$$('[data-asset]').forEach(b=>b.addEventListener('click',()=>addImage(b.dataset.asset))); }
  function renderBg(){ $('#bgColor').value=doc.background.color;$('#bgHex').value=doc.background.color;$('#bgOpacity').value=Math.round(doc.background.opacity*100);$('#bgOpacityOut').textContent=Math.round(doc.background.opacity*100)+'%';$('#bgFit').value=doc.background.fit;const sel=$('#bgAsset');sel.innerHTML='<option value="">Sem imagem</option>'+Object.entries(doc.assets).map(([id,a])=>`<option value="${id}">${Core.esc(a.name)}</option>`).join('');sel.value=doc.background.assetId||''; }
  function icon(type){ return {text:'T',section:'▤',shape:'■',image:'▧'}[type]||'•'; }
  function renderLayers(){ const blocks=[...doc.blocks].reverse();$('#layerCount').textContent=blocks.length+' blocos';$('#layers').innerHTML=blocks.length?blocks.map(b=>`<div class="layer ${b.id===selected?'active':''}"><button class="layer-select" data-select="${b.id}" title="Selecionar ${Core.esc(b.name)}"><b>${icon(b.type)}</b>${Core.esc(b.name||'Sem nome')}</button><button class="mini" data-hide="${b.id}" title="${b.hidden?'Mostrar':'Ocultar'}">${b.hidden?'◌':'◉'}</button><button class="mini" data-lock="${b.id}" title="${b.locked?'Desbloquear':'Bloquear'}">${b.locked?'▣':'□'}</button></div>`).join(''):'<p class="empty">Adicione blocos pela biblioteca.</p>';$$('[data-select]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.select;render();}));$$('[data-hide]').forEach(b=>b.addEventListener('click',()=>{mutate(d=>{const x=d.blocks.find(x=>x.id===b.dataset.hide);if(x)x.hidden=!x.hidden},'visibilidade');}));$$('[data-lock]').forEach(b=>b.addEventListener('click',()=>{mutate(d=>{const x=d.blocks.find(x=>x.id===b.dataset.lock);if(x)x.locked=!x.locked},'bloqueio');})); }
  function input(label,key,value,extra=''){return `<label class="field"><span>${label}</span><input data-prop="${key}" value="${Core.esc(value??'')}" ${extra}></label>`;}
  function select(label,key,value,options){return `<label class="field"><span>${label}</span><select data-prop="${key}">${options.map(([v,t])=>`<option value="${v}" ${v===value?'selected':''}>${t}</option>`).join('')}</select></label>`;}
  function colorField(label,key,value){return `<label class="field"><span>${label}</span><div class="color-row"><input type="color" data-prop="${key}" value="${value||'#124830'}"><input class="text-input" data-prop="${key}Text" value="${value||'#124830'}" spellcheck="false"></div></label>`;}
  function range(label,key,value,max=100){return `<label class="field"><span>${label}</span><div class="range-row"><input type="range" data-prop="${key}" min="0" max="${max}" step="1" value="${Math.round(Number(value||0)*max)}"><output>${Math.round(Number(value||0)*100)}%</output></div></label>`;}
  function renderProperties(){ const b=doc.blocks.find(x=>x.id===selected);if(!b){$('#properties').innerHTML='<p class="empty">Selecione uma camada para editar conteúdo, transparência, cor e posição.</p>';$('#selectionName').textContent='Selecione um bloco';return; }$('#selectionName').textContent=b.name+' · '+b.type;let html='';html+=input('Nome da camada','name',b.name,'maxlength="120"');html+='<div class="cols">'+input('X (%)','x',b.x,'type="number" step=".1" min="0" max="100"')+input('Y (%)','y',b.y,'type="number" step=".1" min="0" max="100"')+'</div><div class="cols">'+input('Largura (%)','w',b.w,'type="number" step=".1" min=".1" max="100"')+input('Altura (%)','h',b.h,'type="number" step=".1" min=".1" max="100"')+'</div>';
    html+=range('Opacidade do bloco','opacity',b.opacity);html+=`<div class="props-actions"><button class="btn small" id="dupBlock">Duplicar</button><button class="btn small" id="frontBlock">Trazer para frente</button><button class="btn small danger" id="deleteBlock">Excluir</button></div>`;
    if(b.type==='text'){html+=`<label class="field"><span>Texto</span><textarea data-prop="text" maxlength="50000">${Core.esc(b.text)}</textarea></label>`;html+='<div class="cols">'+input('Tamanho (px)','fontSize',b.fontSize,'type="number" step="1" min="4" max="160"')+select('Fonte','font',b.font,Object.entries(Core.FONTS).map(([v])=>[v,v]))+'</div><div class="cols">'+select('Alinhamento','align',b.align,[['left','esquerda'],['center','centro'],['right','direita'],['justify','justificado']])+select('Vertical','valign',b.valign,[['top','topo'],['center','centro'],['bottom','base']])+'</div><div class="cols">'+select('Peso','bold',b.bold?'true':'false',[['false','normal'],['true','negrito']])+select('Itálico','italic',b.italic?'true':'false',[['false','regular'],['true','itálico']])+'</div>'+colorField('Cor do texto','color',b.color);}
    if(b.type==='section'){html+=input('Título da seção','heading',b.heading,'maxlength="250"');html+='<label class="field"><span>Conteúdo editável</span><textarea data-prop="text" maxlength="50000">'+Core.esc(b.text)+'</textarea></label>';html+='<div class="cols">'+input('Tamanho do texto','fontSize',b.fontSize,'type="number" step="1" min="4" max="100"')+input('Tamanho do título','headingSize',b.headingSize,'type="number" step="1" min="4" max="100"')+'</div><div class="cols">'+select('Fonte','font',b.font,Object.entries(Core.FONTS).map(([v])=>[v,v]))+select('Alinhamento','align',b.align,[['left','esquerda'],['center','centro'],['right','direita'],['justify','justificado']])+'</div>'+colorField('Cor da faixa','accent',b.accent)+colorField('Cor do título','headingColor',b.headingColor)+colorField('Fundo do conteúdo','fill',b.fill)+range('Opacidade do preenchimento','fillOpacity',b.fillOpacity);}
    if(b.type==='shape'){html+=colorField('Cor sólida','fill',b.fill)+range('Opacidade da cor','fillOpacity',b.fillOpacity)+input('Arredondamento (%)','radius',b.radius,'type="number" step="1" min="0" max="120"');}
    if(b.type==='image'){html+=`<label class="field"><span>Imagem da biblioteca</span><select data-prop="assetId"><option value="">Selecione uma imagem</option>${Object.entries(doc.assets).map(([id,a])=>`<option value="${id}" ${id===b.assetId?'selected':''}>${Core.esc(a.name)}</option>`).join('')}</select></label>`+select('Ajuste da imagem','fit',b.fit,[['contain','conter inteira'],['cover','preencher e recortar'],['fill','esticar']]);}
    html+='<div class="section"><h2>Alinhar na página</h2><div class="alignment-buttons">'+[['left','Esquerda'],['center','Centro ↔'],['right','Direita'],['top','Topo'],['middle','Centro ↕'],['bottom','Base']].map(([v,t])=>`<button class="btn" data-align="${v}">${t}</button>`).join('')+'</div><button class="btn small" id="backBlock">Enviar para trás</button></div>';
    if(['text','section'].includes(b.type))html+='<div class="cols">'+input('Entrelinhas','lineHeight',b.lineHeight,'type="number" step=".05" min=".8" max="3"')+input('Espaço interno','padding',b.padding,'type="number" step="1" min="0" max="100"')+'</div>';
    html+='<div class="cols">'+input('Borda','border',b.border,'type="number" min="0" max="20"')+input('Raio (px)','radius',b.radius,'type="number" min="0" max="120"')+'</div>'+colorField('Cor da borda','borderColor',b.borderColor);
    if(b.locked)html='<p class="locked-note">Camada bloqueada. Desbloqueie na lista de camadas para editar.</p>'+html;
    $('#properties').innerHTML=html;
    $$('#properties input,#properties textarea,#properties select,#properties button').forEach(el=>el.disabled=b.locked);
    $$('[data-align]').forEach(el=>el.onclick=()=>mutate(d=>Core.align(d.blocks.find(x=>x.id===b.id),el.dataset.align)));
    $('#backBlock').onclick=()=>mutate(d=>Core.reorder(d.blocks,b.id,'back'));
    $$('#properties [data-prop]').forEach(el=>{el.addEventListener('input',e=>propertyChanged(e,b));el.addEventListener('change',e=>propertyChanged(e,b));el.addEventListener('blur',()=>{editing=false;});});$('#dupBlock').addEventListener('click',()=>{mutate(d=>{const x=d.blocks.find(x=>x.id===b.id);const copy=Core.block({...x,id:undefined,name:x.name+' · cópia',x:Math.min(100-x.w,x.x+2),y:Math.min(100-x.h,x.y+2)});d.blocks.push(copy);selected=copy.id},'duplicação');});$('#frontBlock').addEventListener('click',()=>mutate(d=>{Core.reorder(d.blocks,b.id,'front')},'camada'));$('#deleteBlock').addEventListener('click',()=>{mutate(d=>{d.blocks=d.blocks.filter(x=>x.id!==b.id);selected=null},'exclusão');}); }
  function remember(){undoStack.push(snapshot());if(undoStack.length>60)undoStack.shift();redoStack=[];}
  function propertyChanged(e,b){
    if(b.locked)return;
    let key=e.target.dataset.prop,value=e.target.value;
    if(key.endsWith('Text')){key=key.slice(0,-4);if(!/^#[\da-f]{6}$/i.test(value))return;}
    if(e.target.type==='number'){if(value==='')return;value=Number(value);}
    if(e.target.type==='range'){value=Number(value)/100;e.target.nextElementSibling.textContent=Math.round(value*100)+'%';}
    if(key==='bold'||key==='italic')value=value==='true';
    if(key==='assetId'&&!value)return;
    const current=doc.blocks.find(x=>x.id===b.id);if(!current||current[key]===value)return;
    if(!editing){remember();editing=true;}
    const updated=Core.block({...current,[key]:value});Object.assign(current,updated);
    renderPoster();saveLocal();$('#undoBtn').disabled=!undoStack.length;$('#redoBtn').disabled=true;
    if(e.type==='change'){editing=false;renderLayers();}
  }
  function renderPoster(){ const p=Core.PRESETS[doc.preset];const shell=$('#posterShell'),poster=$('#poster');let ratio=p.width/p.height;let maxW=$('#viewport').clientWidth-52,maxH=$('#viewport').clientHeight-52;let w=0,h=0;if(zoomMode==='100'){w=p.width*10;h=p.height*10;}else if(zoomMode==='150'){w=p.width*15;h=p.height*15;}else if(zoomMode==='75'){w=p.width*7.5;h=p.height*7.5;}else if(zoomMode==='width'){w=Math.max(260,maxW);h=w/ratio;}else{w=Math.min(maxW,maxH*ratio);h=w/ratio;}if(!Number.isFinite(w)||w<30){w=360;h=w/ratio;}shell.style.width=w+'px';shell.style.height=h+'px';poster.style.background=doc.background.color;poster.className='poster'+(preview?'':' editing');poster.innerHTML=Core.posterHTML(doc);$('#canvasGuides').className='canvas-guides'+(!preview&&$('#gridToggle').checked?' grid':'')+(!preview&&$('#safeToggle').checked?' safe':'');$('#selection').hidden=!selected||preview;const b=doc.blocks.find(x=>x.id===selected);if(b&&!preview){const sel=$('#selection');sel.style.left=b.x+'%';sel.style.top=b.y+'%';sel.style.width=b.w+'%';sel.style.height=b.h+'%';}$$('#poster .art-block').forEach(el=>{el.classList.toggle('locked',!!doc.blocks.find(b=>b.id===el.dataset.block)?.locked);el.addEventListener('pointerdown',onBlockDown);el.addEventListener('dblclick',()=>{selected=el.dataset.block;render();if(doc.blocks.find(b=>b.id===selected)?.type==='text')$('#properties textarea')?.focus();});});$('#poster').setAttribute('aria-label',doc.title+' · '+p.label);}
  function onBlockDown(e){
    if(preview||e.button!==0)return;const id=e.currentTarget.dataset.block,b=doc.blocks.find(x=>x.id===id);if(!b)return;
    selected=id;render();if(b.locked)return;const rect=$('#poster').getBoundingClientRect();
    drag={kind:'move',id,startX:e.clientX,startY:e.clientY,x:b.x,y:b.y,rect,before:snapshot(),changed:false};e.preventDefault();
  }
  function renderAPI(){ $('#apiUrl').value=doc.api.baseUrl;$('#apiPath').value=doc.api.path; }
  function renderProjects(){ let list=[];try{list=JSON.parse(localStorage.getItem(PROJECTS)||'[]')}catch{};$('#projects').innerHTML=list.length?list.slice(0,12).map((p,i)=>`<div class="saved-project"><button data-project="${i}"><strong>${Core.esc(p.title)}</strong><small>${fmtDate(p.updatedAt)} · ${Core.PRESETS[p.preset].label}</small></button><button class="mini" data-project-delete="${i}" title="Excluir cópia">×</button></div>`).join(''):'<p class="help">Nenhuma cópia salva.</p>';$$('[data-project]').forEach(b=>b.addEventListener('click',()=>{const items=JSON.parse(localStorage.getItem(PROJECTS)||'[]');try{commit(Core.normalize(items[Number(b.dataset.project)]));toast('Projeto carregado.')}catch(e){toast(e.message,true)}}));$$('[data-project-delete]').forEach(b=>b.addEventListener('click',()=>{const items=JSON.parse(localStorage.getItem(PROJECTS)||'[]');items.splice(Number(b.dataset.project),1);localStorage.setItem(PROJECTS,JSON.stringify(items));renderProjects();})); }
  function addText(){mutate(d=>{const b=Core.block({type:'text',name:'Novo texto',text:'Digite seu texto',x:20,y:25,w:60,h:15,fontSize:24,color:'#124830',bold:true,align:'center',valign:'center'});d.blocks.push(b);selected=b.id},'bloco de texto');}
  function addSection(){mutate(d=>{const b=Core.block({type:'section',name:'Nova seção',heading:'NOVA SEÇÃO',text:'Insira o conteúdo aqui',x:12,y:35,w:76,h:22,fontSize:17,headingSize:13,accent:'#124830',fill:'#faf7ef',align:'left',valign:'top'});d.blocks.push(b);selected=b.id},'bloco de seção');}
  function addShape(){mutate(d=>{const b=Core.block({type:'shape',name:'Cor sólida',x:20,y:25,w:60,h:15,fill:'#d27e14',fillOpacity:.92,radius:2});d.blocks.push(b);selected=b.id},'bloco de cor');}
  function addImage(assetId){if(!assetId)return;mutate(d=>{const a=Core.block({type:'image',name:d.assets[assetId]?.name||'Imagem',assetId,x:10,y:25,w:80,h:30,fit:'contain'});d.blocks.push(a);selected=a.id},'bloco de imagem');}
  function uploadImages(files){Array.from(files||[]).forEach(file=>{if(file.size>20*1024*1024){toast(file.name+' excede 20 MB.',true);return;}const reader=new FileReader();reader.onload=()=>{const im=new Image();im.onload=()=>{mutate(d=>{let id='asset-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,5);d.assets[id]={name:file.name,data:reader.result,width:im.naturalWidth,height:im.naturalHeight};},'imagem adicionada');toast(file.name+' adicionada à biblioteca.');};im.src=reader.result;};reader.readAsDataURL(file);});}
  function applyModel(){if(!REF.data){toast('A imagem do modelo não foi carregada.',true);return;}mutate(d=>{const next=Core.model({name:'Cabeçalho do PPTX',data:REF.data,width:REF.width,height:REF.height});Object.assign(d,next);selected=d.blocks.find(b=>b.name==='TÍTULO DO PROJETO')?.id||d.blocks[0]?.id;},'modelo do anexo');toast('Composição do modelo aplicada.');}
  function exportJson(){download((doc.title||'banner').replace(/[^\wÀ-ÿ]+/g,'-').toLowerCase()+'.json','application/json;charset=utf-8',JSON.stringify({...doc,updatedAt:new Date().toISOString()},null,2));toast('JSON exportado.');}
  function makePrint(){try{return Core.printHTML(doc);}catch(e){toast(e.message,true);return null;}}
  function exportHtml(){const html=makePrint();if(html){download((doc.title||'banner').replace(/[^\wÀ-ÿ]+/g,'-').toLowerCase()+'.html','text/html;charset=utf-8',html);toast('HTML pronto para impressão baixado.');}}
  function openPrint(){const html=makePrint();if(!html)return;const win=window.open('','_blank');if(!win){toast('O navegador bloqueou a janela de impressão. Use Baixar HTML.',true);return;}win.document.open();win.document.write(html);win.document.close();}
  async function importJson(file){try{const value=JSON.parse(await file.text());const next=Core.normalize(value);commit(next);selected=doc.blocks[0]?.id||null;render();toast('JSON importado com sucesso.');}catch(e){toast(e.message,true);}}
  async function apiFetch(method){
    const base=doc.api.baseUrl.replace(/\/$/,'');if(!base){toast('Informe a URL base da API.',true);return;}
    $('#apiLoad').disabled=true;$('#apiSave').disabled=true;
    try{
      const url=Core.apiURL(base,doc.api.path,method==='GET'?doc.id:null),headers={'Content-Type':'application/json'};
      const token=$('#apiToken').value.trim();if(token)headers.Authorization='Bearer '+token;
      const res=await fetch(url,{method,headers,body:method==='GET'?undefined:JSON.stringify(doc),signal:AbortSignal.timeout(30000),redirect:'error'});
      if(!res.ok){let message='HTTP '+res.status;try{const problem=await res.json();if(problem.error?.message)message+=' · '+problem.error.message;}catch{}throw new Error(message);}
      if(method==='GET'){const next=Core.normalize(await res.json());next.api=deep(doc.api);commit(next);toast('Projeto carregado da API.');}
      else toast('Projeto enviado para a API.');
    }catch(e){toast('Falha na API: '+(e.name==='TimeoutError'?'tempo limite de 30 segundos.':e.message),true);}
    finally{$('#apiLoad').disabled=false;$('#apiSave').disabled=false;}
  }
  function bind(){
    $('#documentName').addEventListener('change',e=>{mutate(d=>{d.title=e.target.value.trim()||'banerlab'},'nome');});
    $('#newBtn').addEventListener('click',()=>{showDialog('Criar um banner novo','O novo documento começará em branco. Você pode desfazer essa ação com Ctrl+Z. Para manter uma cópia portátil, exporte o JSON.', '<button class="btn" data-dialog-cancel>Cancelar</button><button class="btn primary" data-new-confirm>Continuar</button>');$('#dialogActions [data-new-confirm]').addEventListener('click',()=>{$('#messageDialog').close();commit(freshDoc());selected=null;render();toast('Novo banner criado.');});$('#dialogActions [data-dialog-cancel]').addEventListener('click',()=>$('#messageDialog').close());});
    $('#applyModel').addEventListener('click',applyModel);$('#addText').addEventListener('click',addText);$('#addSection').addEventListener('click',addSection);$('#addShape').addEventListener('click',addShape);$('#addImage').addEventListener('click',()=>$('#imageFiles').click());$('#imageFiles').addEventListener('change',e=>{uploadImages(e.target.files);e.target.value='';});$('#libraryUpload').addEventListener('click',()=>$('#imageFiles').click());
    $('#bgColor').addEventListener('input',e=>{const v=e.target.value;mutate(d=>d.background.color=v,'fundo');});$('#bgHex').addEventListener('change',e=>{if(/^#[\da-f]{6}$/i.test(e.target.value)){mutate(d=>d.background.color=e.target.value,'fundo');}else e.target.value=doc.background.color;});$('#bgOpacity').addEventListener('input',e=>mutate(d=>d.background.opacity=Number(e.target.value)/100,'opacidade do fundo'));$('#bgAsset').addEventListener('change',e=>mutate(d=>d.background.assetId=e.target.value,'imagem de fundo'));$('#bgFit').addEventListener('change',e=>mutate(d=>d.background.fit=e.target.value,'ajuste de fundo'));
    $('#swatches').innerHTML=colors.map(c=>`<button class="swatch" title="Aplicar ${c.name}" style="background:${c.value}" data-color="${c.value}"></button>`).join('');$$('[data-color]').forEach(b=>b.addEventListener('click',()=>{const x=doc.blocks.find(x=>x.id===selected);if(!x){toast('Selecione uma seção ou uma cor sólida.',true);return;}mutate(d=>{const y=d.blocks.find(x=>x.id===selected);if(y.type==='section')y.accent=b.dataset.color;else if(y.type==='shape')y.fill=b.dataset.color;else y.color=b.dataset.color;},'cor do modelo');}));
    $('#exportBtn').addEventListener('click',exportJson);$('#htmlBtn').addEventListener('click',exportHtml);$('#printBtn').addEventListener('click',openPrint);$('#importBtn').addEventListener('click',()=>$('#jsonFile').click());$('#jsonFile').addEventListener('change',e=>{if(e.target.files[0])importJson(e.target.files[0]);e.target.value='';});$('#undoBtn').addEventListener('click',undo);$('#redoBtn').addEventListener('click',redo);$('#previewBtn').addEventListener('click',()=>{preview=!preview;$('#previewBtn').setAttribute('aria-pressed',String(preview));$('#previewBtn').textContent=preview?'Editar':'Prévia';renderPoster();});$('#zoom').addEventListener('change',e=>{zoomMode=e.target.value;renderPoster();});$('#helpBtn').addEventListener('click',()=>$('#helpDialog').showModal());$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
    
    $('#saveProject').addEventListener('click',()=>{let items=[];try{items=JSON.parse(localStorage.getItem(PROJECTS)||'[]')}catch{}items.unshift(deep(doc));try{localStorage.setItem(PROJECTS,JSON.stringify(items.slice(0,12)));renderProjects();toast('Cópia salva nos projetos offline.');}catch{toast('Armazenamento cheio. Exporte JSON para guardar o projeto.',true);}});$('#apiUrl').addEventListener('change',e=>{doc.api.baseUrl=e.target.value.trim();saveLocal();});$('#apiPath').addEventListener('change',e=>{doc.api.path=e.target.value.trim()||'/banners';saveLocal();});$('#apiLoad').addEventListener('click',()=>apiFetch('GET'));$('#apiSave').addEventListener('click',()=>apiFetch('POST'));
    window.addEventListener('resize',renderPoster);window.addEventListener('pointermove',onPointerMove);window.addEventListener('pointerup',onPointerUp);document.addEventListener('keydown',onKey);
  }
  function onPointerMove(e){
    if(!drag)return;const b=doc.blocks.find(x=>x.id===drag.id);if(!b)return;
    const dx=(e.clientX-drag.startX)/drag.rect.width*100,dy=(e.clientY-drag.startY)/drag.rect.height*100;
    const snap=v=>$('#snapToggle').checked?Math.round(v):v;
    if(drag.kind==='resize'){b.w=Math.max(1,Math.min(100-drag.x,snap(drag.w+dx)));b.h=Math.max(1,Math.min(100-drag.y,snap(drag.h+dy)));}
    else{b.x=Math.max(0,Math.min(100-b.w,snap(drag.x+dx)));b.y=Math.max(0,Math.min(100-b.h,snap(drag.y+dy)));}
    drag.changed=true;renderPoster();
  }
  function onPointerUp(){if(!drag)return;if(drag.changed){undoStack.push(drag.before);if(undoStack.length>60)undoStack.shift();redoStack=[];}drag=null;render();saveLocal();}
  function duplicate(){const b=doc.blocks.find(x=>x.id===selected);if(!b||b.locked)return;mutate(d=>{const c=Core.block({...b,id:Core.uid(),name:b.name+' · cópia',x:Math.min(100-b.w,b.x+2),y:Math.min(100-b.h,b.y+2)});d.blocks.push(c);selected=c.id;});}
  function onKey(e){
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.querySelector('dialog[open]')||location.hash.includes('lote'))return;
    const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
    if(mod&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(mod&&key==='y'){e.preventDefault();redo();return;}
    if(mod&&key==='s'){e.preventDefault();exportJson();return;}
    if(preview)return;
    const b=doc.blocks.find(x=>x.id===selected);
    if(mod&&key==='c'&&b){clipboard={block:deep(b),asset:deep(doc.assets[b.assetId]||null)};e.preventDefault();toast('Bloco copiado.');return;}
    if(mod&&key==='v'&&clipboard){e.preventDefault();mutate(d=>{const c=Core.block({...clipboard.block,id:Core.uid(),locked:false,x:Math.min(100-clipboard.block.w,clipboard.block.x+2),y:Math.min(100-clipboard.block.h,clipboard.block.y+2)});if(c.type==='image'){c.assetId=Core.uid();d.assets[c.assetId]=deep(clipboard.asset);}d.blocks.push(c);selected=c.id;});return;}
    if(!b||b.locked)return;
    if(mod&&key==='d'){e.preventDefault();duplicate();return;}
    if(e.key==='Delete'){e.preventDefault();mutate(d=>d.blocks=d.blocks.filter(x=>x.id!==selected));return;}
    const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},delta=dirs[e.key];
    if(delta){e.preventDefault();const step=e.shiftKey?1:.25;mutate(d=>{const x=d.blocks.find(x=>x.id===selected);x.x=Math.max(0,Math.min(100-x.w,x.x+delta[0]*step));x.y=Math.max(0,Math.min(100-x.h,x.y+delta[1]*step));});}
  }
  function bindResize(){ $('#resizeHandle').addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();const b=doc.blocks.find(x=>x.id===selected);if(!b||b.locked||preview)return;drag={kind:'resize',id:b.id,startX:e.clientX,startY:e.clientY,x:b.x,y:b.y,w:b.w,h:b.h,rect:$('#poster').getBoundingClientRect(),before:snapshot(),changed:false};}); }
  function savedTemplates(){try{return JSON.parse(localStorage.getItem('banerlab:templates')||'[]').map(Core.normalize);}catch{return [];}}
  function gallery(){
    const query=$('#templateSearch').value.toLocaleLowerCase('pt-BR');
    const options=window.BanerlabTemplates.catalog.map(m=>({...m,doc:window.BanerlabTemplates.create(m.id,doc.preset)}));
    if(REF.data)options.unshift({id:'reference',name:'Modelo do anexo',category:'Acadêmico',description:'Cabeçalho original e oito seções.',doc:Core.model(REF)});
    savedTemplates().forEach((d,i)=>options.push({id:'saved-'+i,name:d.title,category:'Meus modelos',description:'Composição salva neste navegador.',doc:d}));
    const shown=options.filter(m=>(m.name+' '+m.category).toLocaleLowerCase('pt-BR').includes(query));
    $('#templateGrid').innerHTML=shown.length?shown.map(m=>`<div><button class="template-choice" data-template="${m.id}"><div class="template-preview" style="aspect-ratio:${Core.PRESETS[m.doc.preset].width}/${Core.PRESETS[m.doc.preset].height}"><div class="poster" style="background:${m.doc.background.color}">${Core.posterHTML(m.doc)}</div></div><small>${Core.esc(m.category)}</small><strong>${Core.esc(m.name)}</strong><small>${Core.esc(m.description)}</small></button>${m.id.startsWith('saved-')?`<button class="btn small" data-remove-template="${m.id.slice(6)}">Excluir modelo</button>`:''}</div>`).join(''):'<p>Nenhum modelo encontrado.</p>';
    $$('[data-template]').forEach(el=>el.onclick=()=>{const next=deep(options.find(m=>m.id===el.dataset.template).doc);next.id=Core.uid();next.preset=doc.preset;commit(next);$('#templateDialog').close();toast('Modelo aplicado. Ctrl+Z restaura o anterior.');});
    $$('[data-remove-template]').forEach(el=>el.onclick=()=>{const all=savedTemplates();all.splice(Number(el.dataset.removeTemplate),1);try{localStorage.setItem('banerlab:templates',JSON.stringify(all));gallery();}catch{toast('Não foi possível atualizar os modelos.',true);}});
  }
  async function exportVisual(kind){
    if(exporting)return;exporting=true;$('#pdfBtn').disabled=true;$('#pngBtn').disabled=true;
    const current=snapshot(),dpi=Number($('#singleQuality').value),r=window.BanerlabPDF.resolution(current.preset,dpi);
    $('#exportStatus').textContent=`Preparando ${kind.toUpperCase()} a ${r.dpi} dpi…`;
    try{
      if(kind==='png'){const blob=await window.BanerlabPDF.png(current,{dpi});download(Core.filename(current.title)+'.png','image/png',blob);}
      else{const bytes=await window.BanerlabPDF.create([current],{dpi,title:current.title});download(Core.filename(current.title)+'.pdf','application/pdf',bytes);}
      $('#exportStatus').textContent=`${kind.toUpperCase()} gerado · ${r.width} × ${r.height} px · ${r.dpi} dpi.`;
    }catch(e){$('#exportStatus').textContent='Falha ao exportar: '+e.message;}
    finally{exporting=false;$('#pdfBtn').disabled=false;$('#pngBtn').disabled=false;}
  }
  function review(){
    const issues=Core.preflight(doc);
    $$('#poster .art-text').forEach(el=>{if(el.scrollHeight>el.parentElement.clientHeight+2){const b=doc.blocks.find(b=>b.id===el.closest('[data-block]').dataset.block);issues.push(`${b.name}: o texto ultrapassa a altura disponível. Reduza a fonte ou aumente o bloco.`);}});
    const r=window.BanerlabPDF.resolution(doc.preset,Number($('#singleQuality').value));
    showDialog('Revisão de impressão',`<p>${Core.PRESETS[doc.preset].label} · ${doc.blocks.filter(b=>!b.hidden).length} blocos visíveis.</p>${issues.length?`<ul class="check-list">${issues.map(x=>`<li>${Core.esc(x)}</li>`).join('')}</ul>`:'<p>Nenhum problema detectado nas verificações de conteúdo e resolução.</p>'}<p>PNG/PDF direto: ${r.width} × ${r.height} px, ${r.dpi} dpi efetivos. O HTML mantém o texto renderizado pelo navegador. Revise visualmente antes de imprimir.</p>`);
  }
  function bindFeatures(){
    const Templates=window.BanerlabTemplates;
    let promptDocument=null;
    const promptDialog=$('#aiPromptDialog'),promptText=$('#aiPromptText'),promptStatus=$('#aiPromptStatus');
    function preparePrompt(){
      promptText.value=window.BanerlabAIPrompt.build(promptDocument,{includeCurrent:$('#aiPromptCurrent').checked});
      $('#aiPromptSize').textContent=promptText.value.length.toLocaleString('pt-BR')+' caracteres'+(promptText.value.length>100000?' · As imagens tornam o prompt grande; desmarque a opção acima para copiar somente a estrutura de exemplo.':'');
      promptStatus.textContent='Prompt pronto. Clique em Copiar prompt para copiar esta versão.';
    }
    async function copyPrompt(){
      const value=promptText.value;let copied=false;
      $('#aiPromptCopy').disabled=true;$('#aiPromptCurrent').disabled=true;
      try{
        if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(value);copied=true;}catch{}}
        if(!copied){promptText.focus();promptText.select();try{copied=document.execCommand('copy');}catch{}}
        promptStatus.textContent=copied?'Prompt copiado! Cole na sua IA, preencha MEU PEDIDO e salve a resposta como .json para importar.':'O navegador não permitiu a cópia automática. O texto está selecionado: pressione Ctrl+C (ou Cmd+C) ou baixe o arquivo .txt.';
      }finally{$('#aiPromptCopy').disabled=false;$('#aiPromptCurrent').disabled=false;}
    }
    $('#aiPromptBtn').onclick=()=>{promptDocument=snapshot();$('#aiPromptCurrent').checked=false;preparePrompt();if(!promptDialog.open)promptDialog.showModal();copyPrompt();};
    $('#aiPromptCurrent').onchange=preparePrompt;
    $('#aiPromptCopy').onclick=copyPrompt;
    $('#aiPromptDownload').onclick=()=>download('banerlab-prompt-ia.txt','text/plain;charset=utf-8',promptText.value);
    $('#templatesBtn').onclick=()=>{gallery();$('#templateDialog').showModal();};$('#templateSearch').oninput=gallery;
    $('#saveTemplateBtn').onclick=()=>{
      if(!doc.blocks.length){toast('Adicione blocos antes de salvar um modelo.',true);return;}
      const all=savedTemplates();all.unshift(snapshot());
      try{localStorage.setItem('banerlab:templates',JSON.stringify(all.slice(0,12)));toast('Modelo salvo na galeria.');}catch{toast('Armazenamento cheio. Exporte o JSON para preservar o modelo.',true);}
    };
    $('#palettes').innerHTML=Templates.palettes.map((p,i)=>`<button class="palette-button" data-palette="${i}" title="Aplicar paleta ao banner inteiro">${p.colors.map(c=>`<span style="background:${c}"></span>`).join('')}<b>${p.name}</b></button>`).join('');
    $$('[data-palette]').forEach(el=>el.onclick=()=>{commit(Templates.recolor(doc,Number(el.dataset.palette)));toast('Paleta aplicada aos blocos. Imagens mantêm suas cores.');});
    ['gridToggle','safeToggle'].forEach(id=>$('#'+id).onchange=renderPoster);
    $('#pngBtn').onclick=()=>exportVisual('png');$('#pdfBtn').onclick=()=>exportVisual('pdf');$('#checkBtn').onclick=review;
    window.addEventListener('hashchange',()=>requestAnimationFrame(renderPoster));
    window.BanerlabEditor={getDocument:()=>snapshot()};
  }
  function load(){ const stored=safeLoad();doc=stored||freshDoc();selected=doc.blocks[0]?.id||null;$('#templateThumb').src=REF.data||'';$('#artStyles').textContent=Core.ART_CSS;bind();bindResize();bindFeatures();render();saveLocal(); }
  load();
})();



