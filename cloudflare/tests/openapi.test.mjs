import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import Core from '../../src/banner-core.js';
const api=JSON.parse(readFileSync(new URL('../openapi.json',import.meta.url),'utf8'));
test('OpenAPI cobre todos os campos do editor e contém exemplo importável',()=>{
  assert.equal(api.openapi,'3.1.0');assert.deepEqual(Object.keys(api.components.schemas.Banner.properties).sort(),Object.keys(Core.blank()).sort());
  assert.deepEqual(Object.keys(api.components.schemas.Block.properties).sort(),Object.keys(Core.block()).sort());
  const example=api.paths['/banners'].post.requestBody.content['application/json'].example;assert.deepEqual(Core.normalize(example),example);
  const ids=new Set();
  for(const path of Object.values(api.paths))for(const [method,operation] of Object.entries(path)){if(method==='parameters')continue;assert.ok(operation.operationId&&!ids.has(operation.operationId));ids.add(operation.operationId);}
  function check(node){if(!node||typeof node!=='object')return;if(node.$ref){assert.ok(node.$ref.startsWith('#/'));let value=api;for(const part of node.$ref.slice(2).split('/'))value=value?.[part];assert.ok(value,'Referência ausente: '+node.$ref);}Object.values(node).forEach(check);}
  check(api);
});
