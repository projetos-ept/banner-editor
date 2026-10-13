/* Local Wrangler integration test. Never targets a remote deployment. */
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import Core from '../../src/banner-core.js';
const token=readFileSync(new URL('../.dev.vars',import.meta.url),'utf8').match(/^API_TOKEN=(.+)$/m)?.[1].trim();
assert.ok(token,'Configure .dev.vars primeiro.');
const base='http://127.0.0.1:8787/v1',id='smoke_'+crypto.randomUUID().replaceAll('-','');
const headers={Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:'http://localhost:8080'};
const doc={...Core.blank(),id,title:'Teste local do banerlab'};
try{
  assert.equal((await fetch(base+'/health')).status,200);
  const pre=await fetch(base+'/banners',{method:'OPTIONS',headers:{Origin:headers.Origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(pre.status,204);
  assert.equal((await fetch(base+'/banners',{method:'POST',headers,body:JSON.stringify(doc)})).status,200);
  let res=await fetch(base+'/banners/'+id,{headers});assert.equal(res.status,200);const saved=await res.json();assert.equal(saved.title,doc.title);assert.deepEqual(Core.normalize(saved),saved);
  assert.equal((await fetch(base+'/banners/'+id)).status,401);
  res=await fetch(base+'/banners?limit=100',{headers});assert.equal(res.status,200);assert.ok((await res.json()).items.some(x=>x.id===id));
  console.log('PASS: Wrangler local, R2, CORS, POST, GET, list and authentication.');
}finally{const res=await fetch(base+'/banners/'+id,{method:'DELETE',headers});assert.equal(res.status,204);}
