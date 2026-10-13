const test=require('node:test'),assert=require('node:assert/strict');
const Core=require('../src/banner-core.js'),Prompt=require('../src/ai-prompt.js');
const payload=s=>JSON.parse(s.split('\nJSON-BASE COMPLETO\n')[1]);
test('prompt contém exemplo importável com todos os campos e quatro tipos de bloco',()=>{
  const current=Core.blank();current.preset='60x90';current.title='Ciência "na escola"\nTema';current.background.color='#aabbcc';
  const base=payload(Prompt.build(current));
  assert.deepEqual(Core.normalize(base),base);assert.equal(base.preset,'60x90');assert.equal(base.title,current.title);assert.equal(base.background.color,'#aabbcc');
  assert.deepEqual(new Set(base.blocks.map(b=>b.type)),new Set(['shape','text','section','image']));
  assert.deepEqual(Object.keys(base).sort(),Object.keys(Core.blank()).sort());
  for(const b of base.blocks)assert.deepEqual(Object.keys(b).sort(),Object.keys(Core.block()).sort());
  const image=base.blocks.find(b=>b.type==='image');assert.ok(base.assets[image.assetId].data.startsWith('data:image/png;base64,'));
});
test('modo atual preserva conteúdo, imagens, ordem e bloqueios sem modificar o projeto',()=>{
  const current=Prompt.example(Core.blank());current.blocks[0].locked=true;current.blocks[2].text='Conteúdo real';current.api={baseUrl:'https://example.org/privado?token=123',path:'/secret'};
  const before=Core.clone(current),text=Prompt.build(current,{includeCurrent:true}),base=payload(text);
  assert.deepEqual(base.blocks,current.blocks);assert.deepEqual(base.assets,current.assets);assert.deepEqual(base.background,current.background);
  assert.equal(base.id,current.id);assert.deepEqual(base.api,{baseUrl:'',path:'/banners'});assert.ok(!text.includes('token=123'));assert.deepEqual(current,before);assert.deepEqual(Core.normalize(base),base);
});
test('regras acompanham todas as opções de preset/fonte e documentam transparência e assets',()=>{
  const prompt=Prompt.build(Core.blank());
  for(const option of [...Object.keys(Core.PRESETS),...Object.keys(Core.FONTS)])assert.ok(prompt.includes('"'+option+'"'));
  for(const field of Object.keys(Core.block()))assert.ok(prompt.includes(field));
  assert.match(prompt,/sem Markdown/i);assert.match(prompt,/assets: \{\}/);assert.match(prompt,/base64 inventado/);
});
