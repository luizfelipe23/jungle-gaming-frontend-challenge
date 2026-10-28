# Frontend Challenge

Aplicação inicial do Frontend Challenge, construída com React, TypeScript e Vite. O ambiente de desenvolvimento usa Node 24 Alpine; os testes E2E usam uma imagem oficial do Playwright com navegador e dependências do sistema já instalados.

## Catálogo

A página inicial segue o layout responsivo da Kurio e carrega as obras pela API simulada do MSW. Busca, filtros por disponibilidade, coleção, raridade, moeda e faixa de preço, ordenação e paginação ficam sincronizados com a URL. Os cards levam à página de detalhes do NFT; carrinho, checkout e demais telas evoluem conforme as etapas do desafio.

## Detalhes do NFT

Abra uma obra pelo card do catálogo ou acesse diretamente `/nft/<id>` (por exemplo, `/nft/nft-001`). A página consulta `GET /api/nfts/:id`, exibe os detalhes disponíveis, trata carregamento, falhas, IDs inexistentes (404) e imagens ausentes, e funciona em telas pequenas e grandes. NFTs disponíveis podem ser adicionados ao carrinho, que mantém os IDs em armazenamento local versionado.

Os detalhes extras simulados (criador, token e atributos) são opcionais no tipo `Nft`, para que registros sem esses dados continuem válidos.

## Carrinho

Acesse `/cart` pelo cabeçalho. O visitante persiste linhas com identificador do NFT, edição opcional e quantidade inteira em `frontend-challenge:cart:guest:v1`; o formato antigo `{ version: 1, itemIds }` migra para o esquema 2 sem perder IDs válidos. Preços não são persistidos. Os endpoints `GET/POST /api/cart`, `POST /api/cart/items`, `PATCH/DELETE /api/cart/items/:itemId`, `DELETE /api/cart`, `POST/DELETE /api/cart/coupon`, `POST /api/cart/quote` e `POST /api/cart/merge` passam pelo Axios e são simulados no MSW.

O mock valida disponibilidade e limite por compra em cada inclusão/alteração. Linhas do mesmo NFT e edição são consolidadas; edições diferentes permanecem separadas. Cotações retornam quantidades aceitas, preço atual, subtotal, desconto, taxa de rede, total, moeda, versão e validade. Apenas `KURIO10` (10%) é válido; `EXPIRED` reproduz um cupom expirado e códigos desconhecidos retornam erro sem apagar os itens. As taxas simuladas são `0.005 ETH` e `0.50 USD` por moeda usada.

Preços ETH trafegam como strings decimais e são somados, multiplicados e descontados com `BigInt` em escala fixa; USD também usa aritmética decimal e arredondamento de centavos. ETH e USD permanecem separados. Uma cotação antiga não é apresentada como definitiva durante atualização ou falha, e o checkout fica desabilitado quando há item indisponível, falha ou cotação pendente/expirada.

Após login, `POST /api/cart/merge` consolida o carrinho de visitante com o carrinho associado ao usuário e limita quantidades ao estoque atual. Problemas parciais aparecem como aviso. Só depois da confirmação da API a chave de visitante é removida. Carrinhos simulados de usuários ficam isolados por identidade; logout e expiração mantêm a chave visitante intacta.

O checkout continua protegido e agora cria pedidos simulados com revalidacao obrigatoria da cotacao.

## Autenticacao simulada

As rotas `/login` e `/register` usam os endpoints MSW `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/session` e `POST /api/auth/logout`, chamados pela instancia Axios compartilhada. Para testar o login, use uma das contas:

| E-mail | Senha |
| --- | --- |
| `luna@demo.kurio` | `Luna@Kurio2026!` |
| `rafael@demo.kurio` | `Rafael@Kurio2026!` |

O cadastro aceita uma nova conta com senha de pelo menos 10 caracteres e um numero; a confirmacao tambem deve coincidir. E-mails existentes retornam conflito. Para repetir cenarios localmente, limpe os dados do site no navegador: contas criadas e sessoes simuladas ficam no armazenamento local.

O identificador de sessao fica em `frontend-challenge:auth:session:v1`; o MSW persiste contas e sessoes simuladas em chaves `frontend-challenge:mock-auth:*`. A sessao e recuperada por `GET /api/auth/session` depois de atualizar a pagina e expira apos uma hora. Uma resposta `401` invalida dados privados do TanStack Query, encerra a conexao Socket.IO quando ativa e encaminha para o login preservando a rota local para retorno. `/checkout`, `/profile`, `/wallets` e `/orders/$orderId/confirmation` exigem sessao. Catalogo, detalhes e carrinho permanecem publicos. Logout remove sessao e cache privado sem apagar `frontend-challenge:cart:guest:v1`.

Esta autenticacao e uma simulacao no navegador: MSW, `localStorage` e hashes de senha nao constituem seguranca de producao. A aplicacao real deve usar backend, sessao controlada pelo servidor e cookies seguros. Nao reutilize credenciais demonstrativas.

## Desenvolvimento

Inicie a aplicação com Docker Compose:

```sh
docker compose up app
```

Acesse <http://localhost:5173>. O código do workspace é montado no container para habilitar o hot reload. Para instalar dependências novas, execute `docker compose exec app npm install nome-do-pacote`. Depois de alterar dependências, reconstrua ou reinicie os containers se necessário:

```sh
docker compose build app
docker compose up app
```

## Testes

Execute os testes E2E no container oficial do Playwright, sem instalar Node ou Chromium no Windows:

```sh
docker compose run --rm e2e
```

O container instala as dependências com `npm ci`, inicia seu próprio servidor Vite e um servidor Socket.IO de suporte ao E2E, executa os testes Chromium e encerra os dois processos ao final. O serviço de testes tem um volume de dependências separado do ambiente de desenvolvimento.

Se um antivírus ou proxy inspecionar HTTPS, consulte no guia E2E como fornecer a CA confiável ao container sem desativar a validação TLS.

Build, lint, verificação de tipos e testes unitários podem ser executados no container de desenvolvimento:

```sh
docker compose run --rm app npm run build
docker compose run --rm app npm run lint
docker compose run --rm app npm run typecheck
docker compose run --rm app npm test
```

Consulte [docs/e2e-docker.md](docs/e2e-docker.md) para detalhes sobre a configuração E2E e a atualização das versões compatíveis.

## Checkout e pedidos

O checkout em `/checkout` exige sessao e usa as carteiras ficticias devolvidas por `GET /api/wallets`. A conexao e a desconexao sao simuladas pela API. Antes de criar o pedido, a pagina solicita uma nova cotacao do carrinho e exige aceite explicito quando preco, disponibilidade, desconto ou taxa diferem da revisao apresentada. Valores no recibo sao calculados no mock a partir dessa cotacao; ETH permanece como string decimal.

`POST /api/orders` recebe os dados do colecionador, carteira/rede, conexao e revisao da cotacao. O cliente envia `Idempotency-Key`: a mesma chave e o mesmo conteudo retornam o mesmo pedido, enquanto conteudo diferente retorna conflito. Tentativas ficam salvas por usuario para recuperacao por `GET /api/orders/attempts/:key` depois de timeout ou refresh. `GET /api/orders/:orderId` e a fonte de recuperacao do estado.

Pedidos podem estar `pending`, `confirmed` ou `declined`; apenas pedidos pendentes podem transitar para um estado terminal. A confirmacao exibe os dados fotografados no pedido, inclusive itens, edicoes, quantidades, precos, descontos, taxas e totais. O snapshot nao depende do catalogo atual. O carrinho so e atualizado apos confirmacao e apenas as quantidades registradas no pedido sao consumidas; a operacao e idempotente por pedido.

Enquanto pendente, a tela consulta a API e invalida a consulta quando recebe `order.updated` via Socket.IO. A API REST recupera o pedido apos refresh/reconexao. Falha de comunicacao nao e tratada como recusa. No mock, pedidos e tentativas ficam em `localStorage` por usuario; isso permite exercitar o fluxo no navegador, mas nao substitui transacoes, idempotencia duravel ou controle concorrente de um backend real.

Para executar os cenarios de checkout, use `docker compose run --rm e2e`. A suite cobre confirmacao, recusa, pendencia, mudanca de cotacao, estoque, cupom expirado, taxas, carteira, falhas transitorias, timeout, recuperacao e expiracao de sessao.
