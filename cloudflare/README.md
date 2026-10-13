# banerlab API · Cloudflare Workers + R2

Implementação de referência e contrato da API 1.0.0 para o documento banerlab versão 2. O código está preparado para implantação, mas nenhum Worker ou bucket foi publicado na sua conta por esta entrega.

## O que está pronto

- Worker em `src/worker.mjs`, usando o mesmo validador `../src/banner-core.js` do editor.
- Configuração de implantação em `wrangler.jsonc` e dependências fixadas em `package-lock.json`.
- Contrato **OpenAPI 3.1** em [openapi.json](openapi.json), com todos os campos de documento, blocos e imagens e um exemplo importável. Pode ser importado no Postman ou em uma ferramenta compatível com OpenAPI 3.1.
- Token Bearer, CORS por origem, erros estruturados, limite de corpo e armazenamento R2.
- Campo **Token da API (Bearer)** no editor; o token não entra no JSON, no prompt IA nem no armazenamento local.

O desenho usa um bucket privado para armazenar cada projeto como `banners/{id}.json`, incluindo suas imagens base64. O navegador conversa somente com o Worker. A escolha evita separar imagens e documentos nesta primeira versão; o acesso ao R2 ocorre pelo binding `BANNERS`, conforme a [API oficial de bindings R2](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/).

## Contrato HTTP

URL base local: `http://localhost:8787/v1`.

URL de produção: `https://banerlab-api.SEU-SUBDOMINIO.workers.dev/v1` — substitua pela URL efetivamente informada pelo Wrangler.

| Método | Caminho relativo à base | Autenticação | Resultado |
| --- | --- | --- | --- |
| GET | `/health` | Não | 200: processo responde; não verifica acesso ao bucket |
| POST | `/banners` | Bearer | 200: cria ou substitui o documento com o mesmo `id` |
| GET | `/banners/{id}` | Bearer | 200: JSON completo, diretamente importável |
| GET | `/banners?limit=20&cursor=...` | Bearer | 200: metadados e cursor da próxima página |
| DELETE | `/banners/{id}` | Bearer | 204: excluído ou já ausente, sem corpo |
| OPTIONS | Qualquer rota acima | Não | 204: preflight de origem, método e cabeçalhos permitidos |

O editor usa POST e GET por ID. Listagem e exclusão estão disponíveis para clientes HTTP e integrações; ainda não há uma tela de biblioteca remota no editor. Para abrir um projeto de outro ID, baixe seu JSON pelo GET e importe no editor; então os botões passam a usar esse ID.

### Salvar

Headers:

```http
Authorization: Bearer SEU_TOKEN_DO_BANERLAB
Content-Type: application/json
```

O corpo é o documento JSON completo exportado pelo editor, sem envelope `data`. Consulte `../exemplos/scientific.json` ou o exemplo completo do OpenAPI. Raiz:

```json
{
  "schema": "banerlab",
  "version": 2,
  "id": "projeto_001",
  "title": "Minha pesquisa",
  "preset": "90x120",
  "background": { "color": "#ffffff", "assetId": "", "opacity": 0.2, "fit": "cover" },
  "assets": {},
  "blocks": [],
  "api": { "baseUrl": "", "path": "/banners" },
  "updatedAt": "2026-01-01T12:00:00.000Z"
}
```

Esse exemplo mínimo é válido, mas representa uma página em branco. Para um banner pronto, use os exemplos com blocos. Resposta da gravação:

```json
{ "id": "projeto_001", "updatedAt": "2026-01-01T12:01:00.000Z" }
```

O servidor define `updatedAt` em UTC e retorna `ETag`. O mesmo ID sempre aponta para um único objeto: **o último POST concluído substitui o anterior**. Não há histórico, recuperação de exclusão ou bloqueio de edição concorrente. Exporte JSON para manter versões.

### Carregar e listar

GET por ID retorna o próprio documento, sem `{ "data": ... }`, pois o editor chama diretamente `BannerCore.normalize(resposta)`.

A listagem retorna:

```json
{
  "items": [
    { "id": "projeto_001", "title": "Minha pesquisa", "preset": "90x120", "updatedAt": "2026-01-01T12:01:00.000Z", "size": 8452 }
  ],
  "cursor": null
}
```

`size` é o tamanho do JSON em bytes. `limit` aceita de 1 a 100; o padrão é 20. A ordem é lexicográfica por ID. Use o cursor opaco recebido para continuar até `null`, mesmo se vierem menos itens que o limite; isso segue o [contrato de listagem do R2](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

### Validação e limites desta implementação

- Corpo HTTP e documento normalizado: **8 MiB = 8.388.608 bytes**, incluindo base64. É um limite definido pelo banerlab, inferior ao limite geral de requisição da plataforma.
- `schema`: `banerlab` ou legado `aquilombe-banner`; armazenamento normalizado como `banerlab`. `version`: 2.
- ID de projeto, bloco ou imagem: de 1 a 80 letras ASCII, números, `_` ou `-`. Nomes `__proto__`, `constructor` e `prototype` são rejeitados; IDs de blocos não podem se repetir.
- Presets: `60x90`, `80x120`, `90x120`, `100x150`. Tipos: `text`, `section`, `shape`, `image`.
- Até 500 blocos e 100 imagens. Imagens devem estar incorporadas em PNG/JPEG/WebP; referências usadas nos blocos ou no fundo precisam existir em `assets`.
- O validador compartilhado aplica defaults e limites aos estilos, posições e tamanhos; campos desconhecidos são descartados. Envie valores dentro das faixas documentadas no OpenAPI para evitar ajustes.
- O servidor valida a estrutura de dados e o formato da data URL; não decodifica pixels nem verifica se textos cabem nos blocos. Faça a revisão de impressão no editor.

Projetos maiores que 8 MiB continuam funcionando offline, mas recebem 413 nesta API. Aumentar esse limite exige avaliar memória e CPU do Worker, sobretudo com base64. Limites por plano são descritos na [documentação do Workers](https://developers.cloudflare.com/workers/platform/limits/); esta entrega não é um teste de carga ou uma garantia de capacidade por plano.

## Autenticação e CORS

`API_TOKEN` é um secret **deste aplicativo**, de 32 a 512 caracteres sem espaços. Gere um valor aleatório; ele não é o token administrativo da conta Cloudflare. É um modelo de acesso compartilhado: qualquer pessoa com esse token pode ler, gravar e excluir todos os projetos deste bucket. Não há contas, permissões por projeto ou isolamento entre usuários.

O secret é obrigatório: sem ele, operações sobre banners respondem 503. Não publique o token no HTML, em JSONs, em repositórios ou em parâmetros de URL. O campo do editor o mantém somente na página aberta; ao recarregar, cole-o novamente. A Cloudflare documenta `.dev.vars` para desenvolvimento e secrets para produção em [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

| Configuração | Função | Valor inicial |
| --- | --- | --- |
| `BANNERS` | Binding de bucket R2 privado | `banerlab-banners` |
| `API_TOKEN` | Secret Bearer, não colocar em `vars` | Precisa ser configurado |
| `ALLOWED_ORIGINS` | Origens exatas separadas por vírgula, sem caminho/barra final | `http://localhost:8080,http://127.0.0.1:8080` |
| `ALLOW_FILE_ORIGIN` | Autoriza `Origin: null` quando igual a `true` | `false` |

Para o editor hospedado, adicione a origem exata, por exemplo `https://banerlab.exemplo.com`. Não use `*`. O Worker responde ao preflight sem exigir token, permite `Authorization` e `Content-Type` e adiciona CORS também aos erros de uma origem permitida. Não usa cookies. Clientes sem `Origin`, como scripts, ainda precisam do Bearer: CORS não substitui autenticação. A [referência de CORS do Workers](https://developers.cloudflare.com/workers/examples/cors-header-proxy/) apresenta o tratamento de preflight e cabeçalhos.

### Abrir o HTML com file://

Arquivos locais podem enviar `Origin: null`. Para aceitar esse modo, configure `ALLOW_FILE_ORIGIN` como `"true"` no Wrangler antes de executar/publicar. Isso também aceita outros contextos de origem opaca, não somente seu arquivo; o token permanece obrigatório. Esse comportamento de origem é descrito pela [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin).

A alternativa é servir a pasta localmente, com a configuração CORS padrão. Na raiz do editor:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Abra `http://localhost:8080/index.html`. O armazenamento do navegador muda entre origens `file://` e `http://localhost`; use Exportar/Importar JSON para levar seu projeto entre elas.

## Instalar e desenvolver localmente

Pré-requisito do pacote: Node.js 22 ou superior compatível com a versão instalada do Wrangler. Mantenha a pasta `cloudflare` dentro do projeto: o Worker importa o validador em `../src`. O [guia do Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) descreve instalação e requisitos suportados.

Na pasta `cloudflare`:

```powershell
npm ci
if (!(Test-Path .dev.vars)) { Copy-Item .dev.vars.example .dev.vars }
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Se `.dev.vars` já existir, edite-o sem sobrescrever seu conteúdo. Copie o valor recém-gerado para `API_TOKEN=...` nesse arquivo. O valor `REPLACE_ME` do exemplo é propositalmente inválido. `.dev.vars` está no `.gitignore` e não está no pacote de distribuição.

```powershell
npm test
npm run check:bundle
npm run dev -- --local --ip 127.0.0.1 --port 8787
```

O desenvolvimento local usa R2 simulado e não grava no bucket de produção. A simulação local de bindings é descrita pela [Cloudflare](https://developers.cloudflare.com/workers/local-development/bindings-per-env/). `check:bundle` usa `wrangler deploy --dry-run`: prepara o pacote sem publicar.

No editor, abra **Integração com API** e preencha:

- URL base: `http://127.0.0.1:8787/v1`.
- Caminho dos projetos: `/banners`.
- Token: o mesmo valor de `API_TOKEN` em `.dev.vars`.

Clique **Enviar ID atual** e depois **Carregar ID atual**. O envio não é automático. As chamadas têm timeout de 30 segundos; o carregamento pode ser desfeito e preserva a configuração de conexão do editor.

Com Wrangler rodando, `node tests/smoke.mjs` verifica o serviço local. Esse teste cria um projeto com ID próprio, verifica gravação/leitura/listagem/autenticação e remove somente seu próprio projeto de teste ao terminar.

## Publicar na Cloudflare

Requer sua conta com Workers e R2 habilitados. Os comandos abaixo são os passos de publicação; não foram executados na sua conta nesta entrega.

1. Ajuste `ALLOWED_ORIGINS`, `ALLOW_FILE_ORIGIN` e, se necessário, `name` e `bucket_name` em `wrangler.jsonc`.
2. Autentique e crie o bucket se ainda não existir:

```powershell
npx wrangler login
npx wrangler r2 bucket create banerlab-banners
```

Use o mesmo nome em `r2_buckets[0].bucket_name`. Não habilite acesso público ao bucket. Esses comandos seguem o [guia de R2 pela CLI](https://developers.cloudflare.com/r2/get-started/cli/).

3. Publique e configure um token de produção diferente do token local:

```powershell
npm run deploy
npx wrangler secret put API_TOKEN
```

Cole o token quando o Wrangler solicitar. Entre o primeiro deploy e a configuração do secret, as rotas de banners retornam 503; não ficam abertas anonimamente. Guarde a URL mostrada no deploy.

4. No editor, troque a URL base para `https://SEU-WORKER.workers.dev/v1`, mantenha `/banners` e informe o token de produção. Se abrir por arquivo local, o Worker precisa estar publicado com `ALLOW_FILE_ORIGIN: "true"`.
5. Verifique `/v1/health` e faça uma gravação/leitura com um projeto de teste. O health sozinho não confirma R2 ou token. Para logs, use `npx wrangler tail`. O código registra apenas um identificador em erros internos, sem imprimir documento ou token.

Não são necessárias chaves S3 no editor ou no Worker: o acesso ao bucket é feito pelo binding. O host do editor pode ser independente da API; inclua sua origem em CORS.

## Exemplos de requisição em PowerShell 7

Execute de dentro de `cloudflare`, com o Worker local rodando:

```powershell
$base = 'http://127.0.0.1:8787/v1'
$token = Read-Host 'Token do banerlab' -MaskInput
$headers = @{ Authorization = "Bearer $token" }
$doc = Get-Content -Raw -Encoding utf8 '..\exemplos\scientific.json'
$saved = Invoke-RestMethod -Method Post -Uri "$base/banners" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($doc))
$id = $saved.id
Invoke-RestMethod -Uri "$base/banners/$id" -Headers $headers
Invoke-RestMethod -Uri "$base/banners?limit=20" -Headers $headers
```

Para excluir deliberadamente esse projeto:

```powershell
Invoke-RestMethod -Method Delete -Uri "$base/banners/$id" -Headers $headers
```

## Erros e diagnóstico

Formato uniforme:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Token ausente ou inválido.", "requestId": "00000000-0000-4000-8000-000000000000" } }
```

| Status / código | Ação |
| --- | --- |
| 400 `INVALID_JSON`, `INVALID_ID`, `INVALID_QUERY` | Verificar JSON UTF-8, ID e parâmetros |
| 401 `UNAUTHORIZED` | Conferir o Bearer e o secret do ambiente correto |
| 403 `ORIGIN_NOT_ALLOWED`, `HEADERS_NOT_ALLOWED` | Corrigir origem exata ou opção de arquivo local; conferir preflight |
| 404 `NOT_FOUND` | Conferir `/v1`, `/banners` e ID; o editor usa o ID do projeto aberto |
| 405 `METHOD_NOT_ALLOWED` | Usar os métodos da tabela de rotas |
| 413 `PAYLOAD_TOO_LARGE` | Reduzir o JSON/imagens abaixo de 8 MiB |
| 415 `UNSUPPORTED_MEDIA_TYPE` | Enviar `Content-Type: application/json` |
| 422 `INVALID_DOCUMENT` | Corrigir schema, preset, blocos ou referências de imagens |
| 503 `NOT_CONFIGURED` | Configurar API_TOKEN e binding BANNERS |
| 500 `INTERNAL_ERROR` | Consultar logs pelo requestId; verificar acesso ao R2 |

Se o navegador mostrar apenas erro de rede, confira HTTPS, URL, OPTIONS e CORS na aba Network; quando a origem é recusada, o navegador pode ocultar o corpo JSON do erro. Se `npm ci` encontrar erro de certificado, configure a cadeia de confiança/proxy de sua rede; não desative a verificação TLS. Node compatível pode usar `--use-system-ca` para consultar certificados do sistema.

## Limites funcionais

A rota `#lote` continua no navegador: ela gera PDF/HTML a partir de JSONs locais. Esta API **não renderiza PDF**, não chama IA e não executa tarefas de lote na nuvem. Para guardar vários banners, envie um POST por documento; para gerar o PDF, baixe os JSONs e use o lote do editor. Multiusuário, fila de renderização, versionamento e controle de conflitos exigem uma evolução separada.

Para atualizar o contrato após mudanças de campos, execute `node build-openapi.mjs` e `npm test`. Os testes unitários usam R2 em memória e não acessam sua conta. A validação do bundle é feita com Wrangler em modo dry-run; a validação de produção depende dos seus recursos e da publicação.

Validação desta entrega: sete testes de contrato/OpenAPI aprovados; build com Wrangler 4.148.0 em dry-run; execução do bundle no runtime workerd com R2 local (gravar, carregar, listar, excluir e autenticar); teste no navegador dos botões POST/GET, envio do Bearer e ausência do token no JSON/localStorage. O teste de runtime pode ser repetido após o build com `node tests/workerd.mjs`. Nenhum teste substitui a verificação após publicação na sua conta.
