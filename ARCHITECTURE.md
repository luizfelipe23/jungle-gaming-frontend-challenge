# Arquitetura atual e fluxos principais

## Camadas e responsabilidades

### Carregamento e bundle de producao

`src/app/router.tsx` declara cada pagina com `lazyRouteComponent`, separando os bundles de catalogo, detalhes, carrinho, checkout, conta e pedidos. O MSW entra no bundle quando `VITE_ENABLE_MOCKS=true`; sem essa opcao, sua importacao fica restrita ao desenvolvimento. A auditoria Lighthouse usa uma API HTTP e Socket.IO locais para fixtures.

O chunk principal medido no build atual tem aproximadamente 396 kB (126 kB gzip); a referencia antes da separacao de rotas e da exclusao do MSW era 1.053 kB (349 kB gzip). Os resultados Lighthouse para mobile e desktop estao em `reports/lighthouse/latest.json`, com tres repeticoes e medianas para catalogo e detalhes. Execute `docker compose run --rm lighthouse` para atualizar esse artefato.

### 1. App shell
A camada `src/app` centraliza a inicialização da aplicação:
- `providers.tsx`: monta o `QueryClientProvider` do TanStack Query.
- `router.tsx`: define a árvore de rotas com navegação por código e `Outlet`.
- `query-client.ts`: cria a instância global do cliente de consultas.

### 2. Componentes de aparência e layout
A pasta `src/components` guarda os blocos visuais reutilizáveis do shell e os primitives do design system.
- `layout/`: `AppLayout`, `Header` e `Footer` formam o scaffolding das páginas.
- `ui/`: componentes base do shadcn/ui-like (`Button`, `Card`, `Input`, `Skeleton`).

### 3. Features
Cada funcionalidade vai para sua pasta em `src/features` para manter o código acoplado ao domínio.
- `catalog`: API, hooks, página e componentes do catálogo, detalhes e favoritos.
- `checkout`, `orders`, `wallets`, `profile` e `auth`: fluxos de compra, pedidos, conta e sessão, cada um com seus tipos, APIs e componentes de interface.

### 4. Camada de dados e HTTP
A pasta `src/lib` separa infraestrutura técnica de UI.
- `api/http.ts`: instância central do Axios com `baseURL`, timeout e configurações globais.
- `realtime/`: cliente e tipos compartilhados para eventos Socket.IO de NFTs e pedidos.

### 5. Mocks
Em `src/mocks`, os dados simulados são separados por domínio.
- `browser.ts`: inicia o MSW em desenvolvimento.
- `handlers/`: define endpoints REST simulados.
- `data/`: fixtures determinísticas.

### 6. Tipos e estilos
- `src/types`: contratos do domínio.
- `src/index.css`: tokens globais e identidade visual.

## Fluxo de dados do catálogo

1. A rota `/` renderiza `CatalogPage`.
2. `CatalogPage` chama o hook `useNfts()`.
3. O hook usa `useQuery` com `queryKey: ['nfts']` e `queryFn: getNfts`.
4. `getNfts()` usa `http.get('/nfts')` e o axios centralizado monta a URL base configurada em `VITE_API_BASE_URL`.
5. O MSW intercepta a requisição em `/api/nfts` e devolve o array de NFTs simulados.
6. O React Query guarda os dados em cache e a página renderiza os cards com nome, imagem, preço e link para detalhes.

## TanStack Router e TanStack Query

### Router
- A árvore de rotas fica em `src/app/router.tsx`.
- Rotas iniciais já estão declaradas para `/`, `/nft/$nftId`, `/cart`, `/checkout`, `/orders/$orderId/confirmation`, `/login`, `/register`, `/profile` e `/wallets`.
- As rotas de conta e checkout são protegidas por sessão e carregam as páginas implementadas pelas respectivas features.

### Query
- O `QueryClientProvider` é aplicado globalmente em `AppProviders`.
- O cliente inclui retries mínimos e cache para reduzir repetição de requisições.
- O estado de loading, erro e sucesso fica centralizado no TanStack Query, deixando a UI focada na apresentação.

## Estratégia para evoluir
- Cada feature deve ter sua própria pasta com tipos, serviço, hooks e componentes locais.
- Novos mocks devem ser adicionados por domínio em `src/mocks/handlers` e `src/mocks/data` sem misturar regras de diferentes módulos.
- Novos eventos de Socket.IO entram em `src/lib/realtime` com contratos explícitos e versionamento por `version`.
- A base atual foi mantida simples para reduzir reestruturações futuras e permitir crescimento incremental.

## Socket.IO
O contrato em `src/lib/realtime/types.ts` define `type`, `resourceId`, `version`, `updatedAt` e `payload`. A versão é monotônica por recurso; o cliente ignora duplicatas e versões antigas. `nft.updated` carrega o NFT atualizado, atualiza o cache TanStack Query do catálogo/detalhe e invalida essas consultas para reconciliar REST. Quando o NFT está no carrinho, sua cotação também é invalidada. A reconciliação preserva dados com versão maior caso uma resposta REST atrasada chegue depois do evento.

`order.updated` inclui `scopeId` da conta dona do pedido e é filtrado por escopo, ID e versão maior que a última conhecida. A tela invalida a consulta privada e recupera o pedido pela API; pedidos pendentes também são consultados periodicamente. O cache impede regressão de versão e impede que estados terminais voltem para `pending`. O recibo continua baseado no snapshot imutável do pedido.

O cliente usa reconexão automática contínua. Ao conectar ou reconectar, invalida catálogo, detalhes, cotações e consultas de pedidos para recuperar o estado via REST. Os listeners são removidos no cleanup das subscriptions. Logout/401 limpa o escopo autenticado e reconecta como visitante sem destruir listeners; a troca de usuário atualiza o escopo e remove os caches privados. O cache e a chave do carrinho visitante permanecem fora da invalidação privada.

Para validar o fluxo sem backend, o Playwright inicia o servidor Socket.IO de teste em `scripts/mock-realtime-server.mjs` ao lado do Vite por `scripts/e2e-server.mjs`. O MSW altera os dados de cenário; o teste encaminha o evento retornado pelo mock ao servidor Socket.IO real. Os dois processos são encerrados junto com o ciclo do Playwright.

O endpoint de cenário `POST /api/dev/scenarios/nft-update` atualiza a fixture REST em memória, incrementa a versão do NFT e devolve o evento completo. O teste encaminha esse evento pelo endpoint auxiliar `/__test__/emit`; `/__test__/drop-connections` fecha os transports ativos para exercitar a reconexão. A simulação não publica eventos automaticamente a partir do MSW: o E2E faz o encaminhamento explícito ao servidor Socket.IO. O helper E2E transmite a todos os sockets conectados; a tela de pedido filtra por `scopeId`. Um backend real precisa autorizar o socket e restringir eventos privados à conta proprietária. Como a fixture NFT não é durável, o MSW pode reiniciá-la quando seu worker é encerrado; os testes de evento mantêm a página aberta para garantir que o estado REST e o evento compartilhem o mesmo worker.

## Cart state and persistence

- `features/cart/CartProvider.tsx` is mounted once in `AppLayout`; TanStack Query owns API cart state under `['cart', 'guest']` or `['cart', 'user:<id>']`. Quotes use a user-scoped `cartQuote` key and are invalidated after changes.
- `features/cart/cart-storage.ts` stores only guest NFT IDs, optional edition IDs, quantities, coupon and a version. It migrates the legacy `{ version: 1, itemIds }` format to schema version 2; prices are never persisted.
- REST operations in `features/cart/api/cartApi.ts` use the shared Axios instance. `mocks/handlers/cartHandlers.ts` enforces inventory, purchase limits, coupons, merge rules and generates authoritative quotes. Mock authenticated carts are stored by user ID; the guest key is preserved on logout/expiry.
- Login merges guest lines into that account's mock cart using an idempotency key. Same NFT/edition lines consolidate and are clamped to current stock; unavailable or reduced quantities are reported in a notice before visitor data is removed.
- NFT prices and quote values are decimal strings. `lib/money.ts` uses fixed scale `BigInt` arithmetic; ETH is represented to 18 decimal places and USD discounts are rounded to cents. Currency totals remain separate.
- Quotes contain current item prices, accepted quantities, subtotal, discount, network fee, total, currency, cart version and expiry. Failed or stale quotes block the checkout link without deleting items.
- The app uses `socket.io-client` for versioned `nft.updated` events. Price/inventory events reconcile the catalog/detail cache and invalidate matching REST queries; cart quotes are invalidated when a listed NFT changes. Duplicate and older resource versions are ignored. Playwright starts `scripts/mock-realtime-server.mjs` beside Vite through `scripts/e2e-server.mjs`; the MSW scenario endpoint mutates the fixture and the E2E emits the returned event through the local Socket.IO server.
- `/cart` supports quantity controls, editions, removal/clear, coupons, quote retry, inventory errors, responsive totals and catalog navigation. `/checkout` is protected and validates a fresh quote before order creation.

## Autenticação simulada

- `features/auth/api/authApi.ts` concentra os quatro endpoints REST de autenticação e usa o cliente Axios compartilhado.
- `features/auth/hooks/useSession.ts` usa TanStack Query para recuperar e invalidar a sessão. O mesmo `QueryClient` é compartilhado com o contexto do TanStack Router.
- `features/auth/pages` e `components` apresentam login e cadastro; `validation.ts` concentra validação de campos e retorno seguro apenas para caminhos locais.
- `mocks/handlers/authHandlers.ts` simula cadastro, conflito de e-mail, login, sessão expirada e logout. Contas de demonstração armazenam hashes PBKDF2, nunca senhas em texto puro.
- `/checkout`, `/profile`, `/wallets` e `/orders/$orderId/confirmation` validam a sessão em `beforeLoad`; uma sessão inválida redireciona ao login preservando o destino local.
- Logout/401 invalidam token local e cache privado, limpam o escopo autenticado do Socket.IO e reconectam como visitante; a chave do carrinho visitante `frontend-challenge:cart:guest:v1` é preservada.
- Essa autenticação roda no cliente e é somente para desenvolvimento/testes. MSW e armazenamento local não oferecem proteção de produção.

## Publicação

`render.yaml` configura o Web Service do Render. `scripts/serve-production.mjs` serve a pasta `dist`, fornece fallback de `index.html` para rotas do TanStack Router e expõe `/health`; o mesmo servidor HTTP hospeda Socket.IO e usa `PORT` em `0.0.0.0`. O cliente usa `VITE_SOCKET_URL` quando definido, localhost no desenvolvimento e a origem atual na build de produção.

O deploy de demonstração define `VITE_ENABLE_MOCKS=true`. `src/main.tsx` importa e aguarda o worker MSW antes de montar a aplicação, e `public/mockServiceWorker.js` é copiado para a saída. Sem essa variável, o mock continua restrito ao desenvolvimento. O servidor Socket.IO compartilha a inicialização entre produção e `scripts/mock-realtime-server.mjs`; pedidos entram na sala indicada pelo `scopeId` de demonstração. Isso separa a entrega dos eventos por conta simulada, mas não substitui autenticação/autorização de um backend real.

## Simplificações desta etapa
- O catálogo inicial implementa busca, filtros, ordenação e paginação no cliente, com o estado persistido nos parâmetros da URL.
- Os filtros usam apenas campos já definidos no tipo `Nft`: status, coleção, raridade, moeda e preço.
- Checkout e pedidos agora estao implementados sobre as APIs MSW e a infraestrutura existente.
- O design system foi inicializado com tokens essenciais e UI mínima reutilizável.
- A arquitetura prioriza clareza e evolutividade em vez de abstrações desnecessárias.

## Checkout e ciclo de vida dos pedidos

- `features/checkout` owns collector validation, wallet/network selection, simulated wallet connection, quote review and idempotent submission. `features/orders/api/ordersApi.ts` uses the shared Axios client for wallet and order REST calls.
- The UI requests a fresh cart quote before submission. It compares a stable fingerprint of accepted items, quantities, prices, coupon, fees and totals. Any changed quote requires separate user confirmation; unavailable quantities block submission. The order handler calculates its immutable receipt snapshot from its own fresh quote rather than trusting client totals.
- `POST /api/orders` accepts an `Idempotency-Key`. The mock stores the request fingerprint and order per user. The same key and body return the same order; a different body conflicts. The checkout attempt is persisted per user so timeout and refresh recovery reuse the original key via `GET /api/orders/attempts/:key`.
- `GET /api/orders/:orderId` is the source of truth after navigation, refresh or reconnect. Order state is `pending`, `confirmed` or `declined`; only a pending order can transition to a terminal state. The confirmation page polls while pending and invalidates its query on versioned `order.updated` Socket.IO events.
- Receipt items and totals are stored in the order snapshot, including NFT/edition labels, quantities, unit/line prices, discounts, network fees and currency totals. Later catalog edits do not alter the receipt.
- Cart consumption happens only after REST reports `confirmed`. The API removes only quantities present in that order from the current cart, preserves later/additional lines, and tracks consumed order IDs so a refresh does not consume twice. Pending, declined and unknown outcomes preserve the cart.
- MSW scenario storage supports pending/confirmed/declined outcomes, changed fees, expired coupons, wallet rejection/disconnect, transient errors, timeout after persistence, session expiry and lookup failure. Browser E2E tests configure deterministic values in the same local storage read by handlers.
- This is a browser simulation: `localStorage` cannot provide durable cross-device idempotency, database transactions, atomic stock reservation, authorization guarantees or payment settlement. A production service must own those guarantees server-side.

## Perfil, carteiras e favoritos

- `features/profile` consulta e salva o perfil por `GET/PATCH /api/profile`, atualiza o avatar por `POST /api/profile/avatar` e altera a senha por `POST /api/profile/password`. A resposta confirmada atualiza o cache privado e os campos de sessao exibidos no app. O mock valida a senha atual e persiste apenas salt/hash PBKDF2; a estrategia segue sendo uma simulacao de desenvolvimento.
- `features/wallets` usa a API `GET/POST /api/wallets` e `PATCH /api/wallets/:walletId`. Os dados incluem rede(s), endereco, nome, apelido, tipo, perfil ENS/email/referral conforme o formulario de referencia e `isPrimary`. O mock garante que exista uma carteira principal e que carteiras sejam isoladas por usuario. Checkout consulta a mesma lista via chave privada `['private', userId, 'wallets']`.
- Carteiras, perfil e favoritos sao persistidos no armazenamento local do MSW sob chaves distintas por identidade. A troca de conta invalida as consultas privadas pelo mecanismo de sessao existente; a chave do carrinho visitante permanece fora desse fluxo.
- `features/catalog/api/favoritesApi.ts` usa `GET /api/favorites`, `PUT /api/favorites/:nftId` e `DELETE /api/favorites/:nftId`. Catalogo e detalhes compartilham a consulta de favoritos por usuario. A mutation atualiza o TanStack Query otimisticamente, restaura o snapshot anterior em erro e invalida a consulta depois da resposta.
- O estado de teste `frontend-challenge:mock-account:scenario:v1` pode simular falha de leitura/salvamento do perfil, senha, lista/cadastro/edicao de carteiras e adicao/retirada de favorito. Os testes E2E alteram esse estado de maneira deterministica.
- Avatares e dados da conta ficam em `localStorage` somente para a simulacao. Uma aplicacao real deve validar imagens e credenciais no servidor, aplicar autorizacao por conta e persistir a carteira/favorito em banco de dados.
