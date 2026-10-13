# banerlab

Editor de banners offline, versão 2.1. Abra **index.html** no Chrome ou Edge. Não exige instalação, servidor, conta, CDN ou internet. O HTML contém código, biblioteca PDF e a imagem do modelo original.

## Novidades

- Galeria com seis modelos: original do anexo, Pesquisa em foco, Encontro criativo, Feito no território, Aprender e compartilhar e Ideias essenciais.
- Busca por nome/categoria e até 12 modelos pessoais salvos neste navegador.
- Quatro paletas aplicadas ao banner inteiro. As imagens conservam suas cores.
- Alinhamento nas seis posições da página, envio para frente/trás, ajustes de borda, raio, espaço interno e entrelinhas.
- Grade de 5%, encaixe opcional de 1% e guia de margem de 3%. As guias não são exportadas.
- Copiar/colar blocos, duplicar, histórico de movimento, redimensionamento e edição. Campos de texto mantêm o foco durante a digitação.
- Exportação direta PNG/PDF e revisão de textos cortados, textos de exemplo e imagens com baixa resolução.
- Lote com miniaturas, arrastar JSONs, incluir projeto aberto, ordenar por nome, aplicar tamanho a todas as páginas e nomear o arquivo final.
- Importação compatível com os JSONs antigos. A exportação usa o nome `banerlab` no schema.

## Começar

1. Clique em **Explorar modelos**, busque e selecione uma composição. A troca pode ser desfeita.
2. Escolha 60 × 90, 80 × 120, 90 × 120 ou 100 × 150 cm.
3. Selecione um bloco no banner ou na lista de camadas. Edite conteúdo, transparência, cor, posição, tamanho e fonte à direita.
4. Adicione imagens locais PNG, JPEG ou WebP na biblioteca e clique em uma imagem para inseri-la. PNG mantém a transparência.
5. Use **Revisar antes de imprimir**. Substitua os textos de demonstração e confira a composição.
6. **Exportar JSON** guarda uma cópia editável com todas as imagens. **Baixar HTML** cria uma versão independente para impressão.
7. Em **Exportar imagem e PDF**, escolha a qualidade e baixe PNG ou PDF diretamente.

O modelo do anexo conserva seu cabeçalho como imagem; os demais blocos são editáveis. A galeria de modelos pessoais guarda o documento completo, incluindo imagens. Projetos e modelos locais podem atingir a cota do navegador; o editor informa se não conseguir salvar. Mantenha backups em JSON.

## Copiar prompt IA

Clique em **Copiar prompt IA**, ao lado de **Importar JSON**. O editor copia um prompt em português com todas as regras do formato e um JSON completo e importável, com exemplos dos quatro tipos de bloco. O exemplo usa o título, a medida e a cor de fundo selecionados.

1. Cole o prompt na IA de sua preferência e preencha **MEU PEDIDO** com tema, objetivo e conteúdo.
2. Peça a resposta somente em JSON, salve como `.json` em UTF-8 e abra em **Importar JSON**.
3. Para editar a composição existente, marque **Incluir conteúdo e imagens do banner atual em vez do exemplo** e clique novamente em **Copiar prompt**. Imagens incorporadas podem tornar o prompt grande; o editor informa a quantidade de caracteres. A configuração da API fica vazia no prompt.

A janela permite visualizar o texto completo, copiar novamente ou baixar `.txt`. Se o navegador bloquear a cópia, o texto é selecionado para Ctrl+C/Cmd+C. O editor não envia dados automaticamente à IA. A imagem de 1 pixel do exemplo apenas demonstra a estrutura; o prompt orienta a removê-la quando não houver imagem real. Revise conteúdo e composição da resposta após importar.

## Atalhos

| Atalho | Ação |
| --- | --- |
| Ctrl/Cmd + Z | Desfazer |
| Ctrl/Cmd + Y ou Ctrl/Cmd + Shift + Z | Refazer |
| Ctrl/Cmd + D | Duplicar bloco |
| Ctrl/Cmd + C / V | Copiar/colar bloco dentro do editor |
| Ctrl/Cmd + S | Exportar JSON |
| Setas / Shift + setas | Mover 0,25% / 1% |
| Delete | Excluir bloco |

Os atalhos de edição de blocos ficam inativos dentro de campos de texto e diálogos. Desbloqueie uma camada na lista para poder modificá-la.

## Lote: múltiplos JSONs → um PDF

Clique em **Processar lote**, abra **lote.html** ou acesse **index.html#lote**.

1. Adicione ou arraste vários JSONs. A pasta `exemplos` contém cinco arquivos prontos para experimentar.
2. Confira as miniaturas, os avisos e as medidas. Arquivos inválidos são identificados e excluídos da saída.
3. Ordene com as setas ou pelo nome. Escolha um tamanho por página ou aplique uma medida a todas.
4. Defina o nome e a qualidade. Clique em **Baixar PDF multipágina** ou **Baixar HTML multipágina**.

Cada JSON válido gera uma página. Os tamanhos físicos podem ser diferentes no mesmo PDF. Até 50 arquivos, 40 MB por arquivo e 150 MB no conjunto. A fila permanece apenas nesta sessão; recarregar/fechar a página a descarta. O projeto aberto não é alterado pelo lote.

## Qualidade e impressão

O PDF direto usa páginas rasterizadas em 72, 120, 150 ou 200 dpi, processadas em sequência. Para limitar memória, cada página tem no máximo 8.192 px por lado e 40 milhões de pixels; a interface mostra o DPI efetivo. PNG usa o mesmo renderizador. Aumentar DPI não recupera detalhes ausentes na imagem original.

O HTML de impressão mantém o texto do navegador. Use escala 100%, margens zero, gráficos de fundo ativados e cabeçalhos/rodapés desativados. `@page` define a medida física; o driver precisa suportá-la. Cores RGB, sem conversão CMYK, sangria ou marcas de corte automáticas.

## JSON e API

O formato atual contém `schema: "banerlab"` e `version: 2`. O schema legado `aquilombe-banner` também é aceito na importação. Imagens ficam em `assets` como `data:image/...;base64`; arquivos com imagens externas são rejeitados. Limites por documento: 500 blocos, 100 imagens, 20 MB por imagem.

No painel **Integração com API**, configure a URL base e o caminho, por exemplo `https://api.exemplo.com/v1` e `/banners`. **Enviar ID atual** faz POST do documento completo; **Carregar ID atual** faz GET em `/banners/{id}`. O campo **Token da API (Bearer)** envia o token no cabeçalho Authorization; ele permanece somente na página aberta e não é exportado ou salvo. O carregamento passa pela validação do editor e pode ser desfeito. As chamadas só ocorrem pelos botões e têm timeout de 30 segundos.

A pasta `cloudflare` contém o Worker de referência e o contrato para implantação com Cloudflare Workers + R2. Consulte o [guia completo da API e implantação](cloudflare/README.md) e o [contrato OpenAPI 3.1](cloudflare/openapi.json). O backend aplica limite de 8 MiB por documento, separado dos limites offline do editor. A implantação na sua conta ainda precisa ser realizada; nenhum serviço externo está configurado por padrão.

## Desenvolvimento

- `src/editor.html`: estrutura da interface.
- `src/editor.js`: edição, histórico, modelos pessoais, exportação individual e API.
- `src/banner-core.js`: validação, blocos, impressão, alinhamento e camadas.
- `src/templates.js`: modelos e paletas.
- `src/ai-prompt.js`: prompt completo para IA, exemplo importável e inclusão opcional do projeto atual.
- `src/features.css`: estilos das novas ferramentas.
- `src/batch.js`: fila e rota de processamento.
- `src/pdf-export.js`: PNG e PDF com pdf-lib local.
- `vendor/`: biblioteca PDF e licença.

Execute `node build.js` após modificar o código-fonte para reconstruir o HTML independente. `node --test tests/core.test.js` verifica os contratos de dados. Os testes de navegador em `tests/browser.cjs` e `tests/interaction.cjs` usam Playwright e Chrome apenas no ambiente de desenvolvimento.

Validação da versão 2.1: seis testes de núcleo; fluxo de galeria/edição/histórico/PNG/lote/HTML no Chrome em arquivo local; PDF de duas páginas com 90 × 120 e 60 × 90 cm; PDF do modelo original com imagem incorporada; verificação dos cinco novos modelos sem texto cortado; viewport móvel de 390 px sem rolagem horizontal.

O teste adicional em tests/raster.cjs verifica pixels de imagens com transparência e ordem das camadas, além do cancelamento de exportação.
