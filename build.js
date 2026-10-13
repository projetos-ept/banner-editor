/* Run with: node build.js. No install or network required. */
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const read = p => fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
const png=fs.readFileSync(path.join(root,'assets/modelo-aquilombe.png'));
const reference={name:'Cabeçalho do modelo',data:'data:image/png;base64,'+png.toString('base64'),width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
const parts={REFERENCE_DATA:JSON.stringify(reference),PDF_LIB:read('vendor/pdf-lib-1.17.1.min.js'),CORE_JS:read('src/banner-core.js'),TEMPLATES_JS:read('src/templates.js'),AI_PROMPT_JS:read('src/ai-prompt.js'),PDF_EXPORT_JS:read('src/pdf-export.js'),BATCH_JS:read('src/batch.js'),APP_JS:read('src/editor.js'),EXTRA_CSS:read('src/features.css')};
let html=read('src/editor.html');
for(const [key,value] of Object.entries(parts)) html=html.replace('/*'+key+'*/',()=>value);
fs.writeFileSync(path.join(root,'index.html'),html);
console.log('banerlab: index.html atualizado ('+Buffer.byteLength(html)+' bytes).');
