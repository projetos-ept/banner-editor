const test=require('node:test'),assert=require('node:assert/strict');
const Core=require('../src/banner-core.js'),Templates=require('../src/templates.js');
test('JSON legado é migrado sem perder conteúdo e dados perigosos são escapados',()=>{
 const d=Core.blank();d.schema='aquilombe-banner';d.blocks.push(Core.block({text:'<script>alert(1)</script>'}));
 const result=Core.normalize(d);assert.equal(result.schema,'banerlab');assert.equal(result.blocks[0].text,d.blocks[0].text);
 assert.match(Core.posterHTML(result),/&lt;script&gt;/);assert.throws(()=>Core.normalize({...d,assets:{bad:{data:'https://example.com/a.png'}}}));
});
test('todos os modelos permanecem dentro da página em todos os presets',()=>{
 for(const m of Templates.catalog)for(const preset of Object.keys(Core.PRESETS)){
  const d=Templates.create(m.id,preset);assert.ok(d.blocks.length>=7);assert.equal(d.preset,preset);
  for(const b of d.blocks){assert.ok(b.x+b.w<=100.001);assert.ok(b.y+b.h<=100.001);}
  assert.deepEqual(Core.normalize(JSON.parse(JSON.stringify(d))).blocks,d.blocks);
 }
});
test('ordem das camadas e alinhamento respeitam o bloqueio',()=>{
 const blocks=['a','b','c'].map(id=>Core.block({id}));Core.reorder(blocks,'a','front');assert.deepEqual(blocks.map(x=>x.id),['b','c','a']);
 Core.reorder(blocks,'a','back');assert.deepEqual(blocks.map(x=>x.id),['a','b','c']);
 Core.align(blocks[0],'right');assert.equal(blocks[0].x,100-blocks[0].w);blocks[0].locked=true;
 Core.align(blocks[0],'left');Core.reorder(blocks,'a','front');assert.equal(blocks[0].id,'a');assert.equal(blocks[0].x,60);
});
test('paletas preservam conteúdo e cores brancas de títulos em faixa',()=>{
 const d=Templates.create('scientific'),next=Templates.recolor(d,2);assert.equal(next.blocks[2].color,'#ffffff');
 assert.deepEqual(next.blocks.map(b=>b.text),d.blocks.map(b=>b.text));assert.notEqual(d.background.color,next.background.color);
});
test('HTML de lote preserva tamanhos mistos e uma página por projeto',()=>{
 const html=Core.printBatchHTML([Templates.create('event','60x90'),Templates.create('scientific','100x150')]);
 assert.equal((html.match(/class="batch-page"/g)||[]).length,2);assert.match(html,/@page page-60x90\{size:60cm 90cm/);assert.match(html,/@page page-100x150\{size:100cm 150cm/);
 assert.throws(()=>Core.printBatchHTML([]));
});
test('URL de API mantém barra e codifica ID; nome de arquivo é portátil',()=>{
 assert.equal(Core.apiURL('https://api.example.com/v1/','/banners','id x'),'https://api.example.com/v1/banners/id%20x');
 assert.throws(()=>Core.apiURL('javascript:alert(1)','/banners'));assert.equal(Core.filename('../Pesquisa & ação?'),'Pesquisa-acao');
});
