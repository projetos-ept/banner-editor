import Core from '../../src/banner-core.js';

const MAX_JSON_BYTES=8*1024*1024;
const ID=/^[A-Za-z0-9_-]{1,80}$/;
const RESERVED=new Set(['__proto__','constructor','prototype']);
const key=id=>'banners/'+id+'.json';
const encoder=new TextEncoder();
class APIError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
function fail(status,code,message){throw new APIError(status,code,message);}
function validId(id){return typeof id==='string'&&ID.test(id)&&!RESERVED.has(id);}

function corsOrigin(request,env){
  const origin=request.headers.get('Origin');
  if(!origin)return null;
  if(origin==='null'){
    if(env.ALLOW_FILE_ORIGIN==='true')return origin;
    fail(403,'ORIGIN_NOT_ALLOWED','A origem de arquivo local não está habilitada.');
  }
  const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!allowed.includes(origin))fail(403,'ORIGIN_NOT_ALLOWED','Origem não permitida.');
  return origin;
}
async function authenticate(request,env){
  if(typeof env.API_TOKEN!=='string'||env.API_TOKEN.length<32||env.API_TOKEN.length>512)
    fail(503,'NOT_CONFIGURED','Configure o secret API_TOKEN com 32 a 512 caracteres.');
  const header=request.headers.get('Authorization')||'';
  const token=header.match(/^Bearer ([^\s]+)$/i)?.[1];
  if(!token||token.length>512)fail(401,'UNAUTHORIZED','Token ausente ou inválido.');
  const hashes=await Promise.all([token,env.API_TOKEN].map(value=>crypto.subtle.digest('SHA-256',encoder.encode(value))));
  const a=new Uint8Array(hashes[0]),b=new Uint8Array(hashes[1]);let diff=0;
  for(let i=0;i<32;i++)diff|=a[i]^b[i];
  if(diff)fail(401,'UNAUTHORIZED','Token ausente ou inválido.');
}
async function readJSON(request){
  if((request.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase()!=='application/json')
    fail(415,'UNSUPPORTED_MEDIA_TYPE','Use Content-Type: application/json.');
  if(Number(request.headers.get('Content-Length'))>MAX_JSON_BYTES)fail(413,'PAYLOAD_TOO_LARGE','O JSON da API excede 8 MiB.');
  if(!request.body)fail(400,'INVALID_JSON','Envie um objeto JSON.');
  const reader=request.body.getReader(),chunks=[];let length=0;
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;
      if(length>MAX_JSON_BYTES){await reader.cancel();fail(413,'PAYLOAD_TOO_LARGE','O JSON da API excede 8 MiB.');}chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{fail(400,'INVALID_JSON','JSON malformado ou codificação diferente de UTF-8.');}
}
function normalizeDocument(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!validId(raw.id))fail(422,'INVALID_DOCUMENT','id deve conter 1 a 80 letras ASCII, números, hífens ou sublinhados.');
  if(!Object.hasOwn(Core.PRESETS,raw.preset))fail(422,'INVALID_DOCUMENT','Preset desconhecido.');
  if(!Array.isArray(raw.blocks)||raw.blocks.length>500)fail(422,'INVALID_DOCUMENT','blocks deve ser uma lista com até 500 blocos.');
  if(!raw.assets||typeof raw.assets!=='object'||Array.isArray(raw.assets))fail(422,'INVALID_DOCUMENT','assets deve ser um objeto.');
  if(Object.keys(raw.assets).some(id=>!validId(id)))fail(422,'INVALID_DOCUMENT','ID de imagem inválido.');
  const seen=new Set();
  for(const b of raw.blocks){
    if(!b||!validId(b.id)||seen.has(b.id)||!['text','section','shape','image'].includes(b.type))fail(422,'INVALID_DOCUMENT','Blocos exigem IDs únicos e tipos reconhecidos.');
    seen.add(b.id);
    if(b.type==='image'&&!Object.hasOwn(raw.assets,b.assetId))fail(422,'INVALID_DOCUMENT','Imagem referenciada ausente em assets.');
  }
  if(raw.background?.assetId&&!Object.hasOwn(raw.assets,raw.background.assetId))fail(422,'INVALID_DOCUMENT','Imagem de fundo ausente em assets.');
  try{const doc=Core.normalize(raw);doc.updatedAt=new Date().toISOString();return doc;}
  catch(e){fail(422,'INVALID_DOCUMENT',e.message);}
}

export default {
  async fetch(request,env){
    const requestId=crypto.randomUUID();let origin=null;
    const headers=(extra={})=>new Headers({
      'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff','X-Request-Id':requestId,'Vary':'Origin',
      ...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Expose-Headers':'ETag, X-Request-Id'}:{}),...extra
    });
    const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:headers(extra)});
    try{
      origin=corsOrigin(request,env);
      const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
      const resource=path.match(/^\/v1\/banners\/([^/]+)$/);
      const collection=path==='/v1/banners',health=path==='/v1/health';
      if(!collection&&!resource&&!health)fail(404,'NOT_FOUND','Rota não encontrada.');
      const methods=health?['GET']:collection?['GET','POST']:['GET','DELETE'];
      if(request.method==='OPTIONS'){
        const requested=request.headers.get('Access-Control-Request-Method');
        const requestedHeaders=(request.headers.get('Access-Control-Request-Headers')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
        if(requested&&!methods.includes(requested))fail(405,'METHOD_NOT_ALLOWED','Método não permitido.');
        if(requestedHeaders.some(x=>!['authorization','content-type'].includes(x)))fail(403,'HEADERS_NOT_ALLOWED','Cabeçalho CORS não permitido.');
        return new Response(null,{status:204,headers:headers({'Access-Control-Allow-Methods':methods.join(', ')+', OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600','Vary':'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'})});
      }
      if(!methods.includes(request.method))return json({error:{code:'METHOD_NOT_ALLOWED',message:'Método não permitido.',requestId}},405,{Allow:methods.join(', ')+', OPTIONS'});
      if(health)return json({status:'ok',service:'banerlab',apiVersion:1});
      await authenticate(request,env);
      if(!env.BANNERS)fail(503,'NOT_CONFIGURED','Binding BANNERS não configurado.');
      if(collection&&request.method==='POST'){
        const doc=normalizeDocument(await readJSON(request)),body=JSON.stringify(doc);
        if(encoder.encode(body).byteLength>MAX_JSON_BYTES)fail(413,'PAYLOAD_TOO_LARGE','O documento normalizado excede 8 MiB.');
        const stored=await env.BANNERS.put(key(doc.id),body,{httpMetadata:{contentType:'application/json; charset=utf-8'},customMetadata:{title:doc.title,preset:doc.preset,updatedAt:doc.updatedAt}});
        return json({id:doc.id,updatedAt:doc.updatedAt},200,{ETag:stored.httpEtag});
      }
      if(collection){
        const rawLimit=url.searchParams.get('limit')||'20',limit=Number(rawLimit),cursor=url.searchParams.get('cursor')||undefined;
        if(!/^\d+$/.test(rawLimit)||!Number.isInteger(limit)||limit<1||limit>100||cursor?.length>4096)fail(400,'INVALID_QUERY','limit deve ser um inteiro entre 1 e 100; cursor deve ter até 4096 caracteres.');
        const result=await env.BANNERS.list({prefix:'banners/',limit,cursor,include:['customMetadata']});
        return json({items:result.objects.map(o=>({id:o.key.slice(8,-5),title:o.customMetadata?.title||'',preset:o.customMetadata?.preset||'',updatedAt:o.customMetadata?.updatedAt||o.uploaded.toISOString(),size:o.size})),cursor:result.truncated?result.cursor:null});
      }
      let id;try{id=decodeURIComponent(resource[1]);}catch{fail(400,'INVALID_ID','ID inválido.');}
      if(!validId(id))fail(400,'INVALID_ID','ID inválido.');
      if(request.method==='DELETE'){await env.BANNERS.delete(key(id));return new Response(null,{status:204,headers:headers()});}
      const object=await env.BANNERS.get(key(id));if(!object)fail(404,'NOT_FOUND','Banner não encontrado.');
      return new Response(object.body,{status:200,headers:headers({ETag:object.httpEtag})});
    }catch(e){
      if(!(e instanceof APIError))console.error(JSON.stringify({requestId,code:'INTERNAL_ERROR'}));
      return json({error:{code:e instanceof APIError?e.code:'INTERNAL_ERROR',message:e instanceof APIError?e.message:'Falha interna. Consulte os logs usando requestId.',requestId}},e instanceof APIError?e.status:500,e.status===401?{'WWW-Authenticate':'Bearer'}:{});
    }
  }
};
