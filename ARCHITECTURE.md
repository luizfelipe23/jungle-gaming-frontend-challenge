# Arquitetura inicial

## Camadas e responsabilidades

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
- `catalog`: API, hooks, página, e dados de domínio do catálogo inicial.
- Futuras features como `checkout`, `wallets`, `profile` e `auth` seguem o mesmo padrão: serviço, hooks, tipos e parte visual específica.

### 4. Camada de dados e HTTP
A pasta `src/lib` separa infraestrutura técnica de UI.
- `api/http.ts`: instância central do Axios com `baseURL`, timeout e configurações globais.
- `realtime/`: cliente e tipos para preparação da integração com Socket.IO.

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
- As páginas ainda não implementadas aparecem como placeholders identificados para não falsificar funcionalidades prontas.

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
O cliente em `src/lib/realtime/socket-client.ts` consome eventos tipados de `src/lib/realtime/types.ts`, incluindo `nft.updated` e `order.updated`. No carrinho, eventos versionados `nft.updated` atualizam a cotação e a disponibilidade pelo TanStack Query.

Para validar o fluxo sem backend, o Playwright inicia o servidor Socket.IO de teste em `scripts/mock-realtime-server.mjs` ao lado do Vite por `scripts/e2e-server.mjs`. O MSW altera os dados de cenário; o teste encaminha o evento retornado pelo mock ao servidor Socket.IO real. Os dois processos são encerrados junto com o ciclo do Playwright.

## Cart state and persistence

- `features/cart/CartProvider.tsx` is mounted once in `AppLayout`; TanStack Query owns API cart state under `['cart', 'guest']` or `['cart', 'user:<id>']`. Quotes use a user-scoped `cartQuote` key and are invalidated after changes.
- `features/cart/cart-storage.ts` stores only guest NFT IDs, optional edition IDs, quantities, coupon and a version. It migrates the legacy `{ version: 1, itemIds }` format to schema version 2; prices are never persisted.
- REST operations in `features/cart/api/cartApi.ts` use the shared Axios instance. `mocks/handlers/cartHandlers.ts` enforces inventory, purchase limits, coupons, merge rules and generates authoritative quotes. Mock authenticated carts are stored by user ID; the guest key is preserved on logout/expiry.
- Login merges guest lines into that account's mock cart using an idempotency key. Same NFT/edition lines consolidate and are clamped to current stock; unavailable or reduced quantities are reported in a notice before visitor data is removed.
- NFT prices and quote values are decimal strings. `lib/money.ts` uses fixed scale `BigInt` arithmetic; ETH is represented to 18 decimal places and USD discounts are rounded to cents. Currency totals remain separate.
- Quotes contain current item prices, accepted quantities, subtotal, discount, network fee, total, currency, cart version and expiry. Failed or stale quotes block the checkout link without deleting items.
- The app uses `socket.io-client` for versioned `nft.updated` events. Price/inventory events invalidate NFT and quote queries. Playwright starts `scripts/mock-realtime-server.mjs` beside Vite through `scripts/e2e-server.mjs`; the MSW scenario endpoint mutates the fixture and the E2E emits the returned event through the local Socket.IO server.
- `/cart` supports quantity controls, editions, removal/clear, coupons, quote retry, inventory errors, responsive totals and catalog navigation. `/checkout` remains a protected placeholder.

## Autenticação simulada

- `features/auth/api/authApi.ts` concentra os quatro endpoints REST de autenticação e usa o cliente Axios compartilhado.
- `features/auth/hooks/useSession.ts` usa TanStack Query para recuperar e invalidar a sessão. O mesmo `QueryClient` é compartilhado com o contexto do TanStack Router.
- `features/auth/pages` e `components` apresentam login e cadastro; `validation.ts` concentra validação de campos e retorno seguro apenas para caminhos locais.
- `mocks/handlers/authHandlers.ts` simula cadastro, conflito de e-mail, login, sessão expirada e logout. Contas de demonstração armazenam hashes PBKDF2, nunca senhas em texto puro.
- `/checkout`, `/profile`, `/wallets` e `/orders/$orderId/confirmation` validam a sessão em `beforeLoad`; uma sessão inválida redireciona ao login preservando o destino local.
- Logout/401 invalidam token local, cache privado e conexões realtime; a chave do carrinho visitante `frontend-challenge:cart:guest:v1` é preservada.
- Essa autenticação roda no cliente e é somente para desenvolvimento/testes. MSW e armazenamento local não oferecem proteção de produção.

## Simplificações desta etapa
- O catálogo inicial implementa busca, filtros, ordenação e paginação no cliente, com o estado persistido nos parâmetros da URL.
- Os filtros usam apenas campos já definidos no tipo `Nft`: status, coleção, raridade, moeda e preço.
- Carrinho, autenticação, catálogo e detalhes são funcionais com MSW; checkout, perfil e demais telas seguem como placeholders.
- O design system foi inicializado com tokens essenciais e UI mínima reutilizável.
- A arquitetura prioriza clareza e evolutividade em vez de abstrações desnecessárias.
