import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import Core from '../../src/banner-core.js';
import Prompt from '../../src/ai-prompt.js';

const token='unit-test-token-not-a-production-secret-0123456789';
const MAX_JSON_BYTES=8*1024*1024;
class MemoryR2{
  data=new Map();
  async put(key,body,options){const o={key,body,customMetadata:options.customMetadata,size:Buffer.byteLength(body),uploaded:new Date(),httpEtag:'"test-etag"'};this.data.set(key,o);return o;}
  async get(key){const o=this.data.get(key);return o?{...o,body:new Response(o.body).body}:null;}
  async delete(key){this.data.delete(key);}
  async list(options){assert.deepEqual(options.include,['customMetadata']);const all=[...this.data.values()].filter(o=>o.key.startsWith(options.prefix)).sort((a,b)=>a.key.localeCompare(b.key));const start=Number(options.cursor||0);const objects=all.slice(start,start+options.limit);return {objects,truncated:start+objects.length<all.length,cursor:String(start+objects.length)};}
}
function env(extra={}){return {BANNERS:new MemoryR2(),API_TOKEN:token,ALLOWED_ORIGINS:'http://localhost:8080',ALLOW_FILE_ORIGIN:'false',...extra};}
function request(path,method='GET',body,headers={}){return new Request('https://api.example.test/v1'+path,{method,headers:{Authorization:'Bearer '+token,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});}
test('POST e GET preservam o formato importável, imagens e ID; POST atualiza o mesmo objeto',async()=>{
  const e=env(),doc=Prompt.example(Core.blank());doc.id='banner_123';
  let res=await worker.fetch(request('/banners','POST',doc),e);assert.equal(res.status,200);assert.equal((await res.json()).id,doc.id);
  res=await worker.fetch(request('/banners/'+doc.id),e);assert.equal(res.status,200);const saved=await res.json();assert.deepEqual(Core.normalize(saved),saved);assert.deepEqual(saved.assets,doc.assets);assert.deepEqual(saved.blocks,doc.blocks);
  doc.title='Atualizado';await worker.fetch(request('/banners','POST',doc),e);assert.equal(e.BANNERS.data.size,1);assert.equal((await(await worker.fetch(request('/banners/'+doc.id),e)).json()).title,'Atualizado');
});
test('autenticação é obrigatória e falha fechada sem secret',async()=>{
  for(const authorization of ['', 'Bearer incorrect']){const e=env();const res=await worker.fetch(request('/banners','POST',Core.blank(),{Authorization:authorization}),e);assert.equal(res.status,401);assert.equal(e.BANNERS.data.size,0);}
  assert.equal((await worker.fetch(request('/banners'),env({API_TOKEN:undefined}))).status,503);
  assert.equal((await worker.fetch(request('/health','GET',undefined,{Authorization:''}),env())).status,200);
});
test('preflight permite origem configurada e Authorization; arquivo local exige opção explícita',async()=>{
  const headers={Origin:'http://localhost:8080','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type',Authorization:''};
  const e=env();let r=await worker.fetch(request('/banners','OPTIONS',undefined,headers),e);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),headers.Origin);
  r=await worker.fetch(request('/banners','GET',undefined,{Origin:'https://untrusted.example'}),e);assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
  assert.equal((await worker.fetch(request('/banners','GET',undefined,{Origin:'null'}),e)).status,403);
  r=await worker.fetch(request('/banners','GET',undefined,{Origin:'null'}),env({ALLOW_FILE_ORIGIN:'true'}));assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'null');
  r=await worker.fetch(request('/banners','GET',undefined,{Origin:headers.Origin,Authorization:''}),e);assert.equal(r.status,401);assert.equal(r.headers.get('Access-Control-Allow-Origin'),headers.Origin);
});
test('validação rejeita JSON malformado, MIME incorreto, IDs, tipos e imagens ausentes',async()=>{
  const e=env(),doc=Core.blank();assert.equal((await worker.fetch(request('/banners','POST','{bad'),e)).status,400);
  assert.equal((await worker.fetch(request('/banners','POST',doc,{'Content-Type':'text/plain'}),e)).status,415);
  const bad=[{...doc,id:'../escape'},{...doc,preset:'invalid'},{...doc,blocks:[{id:'b1',type:'script'}]},{...doc,blocks:[Core.block({type:'image',assetId:'constructor'})]},{...doc,assets:JSON.parse('{"__proto__":{}}')}];
  for(const raw of bad)assert.equal((await worker.fetch(request('/banners','POST',raw),e)).status,422);
  assert.equal(e.BANNERS.data.size,0);
  assert.equal((await worker.fetch(request('/banners/no-such-banner'),e)).status,404);
});
test('limite do corpo vale mesmo sem Content-Length',async()=>{
  const res=await worker.fetch(request('/banners','POST',' '.repeat(MAX_JSON_BYTES+1)),env());assert.equal(res.status,413);
});
test('listagem paginada e DELETE idempotente',async()=>{
  const e=env();for(const id of ['a','b','c'])await worker.fetch(request('/banners','POST',{...Core.blank(),id}),e);
  const first=await(await worker.fetch(request('/banners?limit=2'),e)).json();assert.equal(first.items.length,2);assert.ok(first.cursor);assert.equal(first.items[0].id,'a');
  const second=await(await worker.fetch(request('/banners?limit=2&cursor='+first.cursor),e)).json();assert.equal(second.items.length,1);assert.equal(second.cursor,null);
  assert.equal((await worker.fetch(request('/banners?limit=0'),e)).status,400);
  for(let i=0;i<2;i++)assert.equal((await worker.fetch(request('/banners/a','DELETE'),e)).status,204);
  assert.equal((await worker.fetch(request('/banners/a'),e)).status,404);
});
