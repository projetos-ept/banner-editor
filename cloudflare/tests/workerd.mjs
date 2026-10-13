/* Validate the built Worker with the real local workerd runtime and R2 emulator. */
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import Core from '../../src/banner-core.js';
const token='workerd-test-only-token-01234567890123456789';
const runtime=new Miniflare(convertV4MiniflareOptions({workers:[{name:'banerlab-api',modules:true,scriptPath:fileURLToPath(new URL('../dist/worker.js',import.meta.url)),compatibilityDate:'2026-10-07',r2Buckets:['BANNERS'],bindings:{API_TOKEN:token,ALLOWED_ORIGINS:'http://localhost:8080',ALLOW_FILE_ORIGIN:'false'}}]}));
try{
  const doc={...Core.blank(),id:'runtime_test',title:'Banner no R2 local'};
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:'http://localhost:8080'};
  let r=await runtime.dispatchFetch('https://local.test/v1/banners',{method:'POST',headers,body:JSON.stringify(doc)});assert.equal(r.status,200);
  r=await runtime.dispatchFetch('https://local.test/v1/banners/'+doc.id,{headers});assert.equal(r.status,200);const saved=await r.json();assert.equal(saved.title,doc.title);assert.deepEqual(Core.normalize(saved),saved);assert.ok(r.headers.get('ETag'));
  r=await runtime.dispatchFetch('https://local.test/v1/banners?limit=1',{headers});assert.equal((await r.json()).items[0].id,doc.id);
  r=await runtime.dispatchFetch('https://local.test/v1/banners',{headers:{Origin:'http://localhost:8080'}});assert.equal(r.status,401);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'http://localhost:8080');
  r=await runtime.dispatchFetch('https://local.test/v1/banners/'+doc.id,{method:'DELETE',headers});assert.equal(r.status,204);
  console.log('PASS: built Worker in workerd; R2 write/read/list/delete and auth/CORS.');
}finally{await runtime.dispose();}
