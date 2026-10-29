# Jungle Gaming Frontend Challenge

Marketplace responsivo de NFTs construído como desafio frontend da Jungle Gaming. Inclui catálogo, busca e filtros, detalhes, favoritos, carrinho, checkout, pedidos, autenticação simulada, perfil e carteiras. A interface usa React, TypeScript e Vite; TanStack Router/Query gerenciam rotas e dados, Axios chama a API simulada via MSW e Socket.IO mantém os eventos de atualização.

- Repositório: [luizfelipe23/jungle-gaming-frontend-challenge](https://github.com/luizfelipe23/jungle-gaming-frontend-challenge)
- Demonstração pública: ainda não publicada.

O projeto inclui `ARCHITECTURE.md` com a organização e as decisões técnicas.

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

## Publicação no Render

O arquivo [`render.yaml`](render.yaml) configura um Web Service Node no Render. O servidor de produção serve `dist`, responde `GET /health`, devolve `index.html` para rotas da aplicação e hospeda Socket.IO no mesmo servidor HTTP. Quando o site é aberto por HTTPS, o Socket.IO usa a mesma origem e estabelece a conexão segura por WSS. A porta vem de `PORT` e o processo escuta em `0.0.0.0`.

Para publicar:

1. Versione e envie para o GitHub os commits e as alterações que devem compor a entrega.
2. No Render, escolha **New > Blueprint**, conecte o GitHub e selecione este repositório e a branch `main`.
3. Revise o serviço `jungle-gaming-frontend` detectado pelo `render.yaml` e aplique o Blueprint. O comando de build é `npm ci && npm run build`; o de inicialização é `npm start`.
4. Confirme que `VITE_ENABLE_MOCKS=true`, `VITE_API_BASE_URL=/api` e `VITE_API_TIMEOUT=15000` estão definidos. Essas variáveis são públicas e não contêm segredos. Não configure `VITE_SOCKET_URL`: a conexão usa a origem do site.
5. Inicie o deploy e acompanhe **Events** e **Logs** do serviço. Em **Settings**, o Render mostra o domínio `*.onrender.com`; abra-o e confira `/health` (deve responder `{"status":"ok"}`).

O deploy não foi iniciado por este workspace: o branch local ainda tem commits e alterações sem enviar ao GitHub, e a conta do Render exige a seleção do repositório no painel. Atualize o link de demonstração acima depois de confirmar a URL real.

### Mocks e limites da demonstração

O Blueprint ativa o MSW na build com `VITE_ENABLE_MOCKS=true`; o worker `public/mockServiceWorker.js` intercepta as rotas `/api` antes de montar a aplicação. Os dados de autenticação, perfil, carteiras, favoritos, carrinho e pedidos são simulados no navegador e ficam no armazenamento local, por isso não sincronizam entre dispositivos. Use apenas as contas fictícias da seção de autenticação. Esta demonstração não é um serviço de carteira, autenticação ou compra real.

O servidor Socket.IO aceita conexões no mesmo serviço e entrega `order.updated` apenas à sala da conta informada pelo cliente; `nft.updated` é um evento público. A identificação é simulada e não equivale a autorização de servidor. O servidor de produção oferece transporte e reconexão, mas não há backend real publicando mudanças de pedidos ou NFTs. Não considere a entrega de atualizações em tempo real validada até verificar uma publicação real.
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

## Tempo real

O contrato compartilhado em `src/lib/realtime/types.ts` usa `type`, `resourceId`, `version`, `updatedAt` e `payload`. Cada recurso deve aumentar sua versão monotonicamente. Clientes descartam versões repetidas ou mais antigas. `nft.updated` carrega o NFT atualizado; a aplicação reconcilia o cache do catálogo e dos detalhes com o payload e invalida as consultas REST. Se o NFT estiver no carrinho, a cotação correspondente também é invalidada antes de permitir uma confirmação.

`order.updated` sinaliza o pedido e sua nova versão/estado dentro de `scopeId`, que identifica a conta proprietária. A tela ignora eventos de outra conta e versões antigas, invalida a consulta privada e mantém a API REST como fonte de recuperação. O cache não aceita regressão de versão nem retorno de um estado terminal para `pending`; recibos continuam usando o snapshot imutável do pedido. Enquanto pendente, o pedido também é consultado periodicamente.

O cliente Socket.IO tenta reconectar continuamente. Ao conectar ou reconectar, as consultas de NFTs, cotações e pedidos são reconciliadas com REST. Logout/expiração encerra o socket e remove seus listeners; a troca de usuário invalida os caches privados, mantendo o carrinho de visitante. O servidor de apoio E2E encaminha os eventos via Socket.IO real e oferece `/__test__/drop-connections` para simular uma queda de transporte. O MSW atualiza o fixture REST e devolve o evento versionado; ele não publica o evento sozinho, então o teste o encaminha ao servidor de apoio. O helper E2E transmite eventos a todos os sockets conectados; consumidores de pedidos validam `scopeId`. Um backend real deve autorizar a sessão e entregar eventos privados somente ao canal da conta proprietária.

O cenário `nft-update` altera a fixture em memória do worker MSW. A alteração é lida pelas chamadas REST enquanto esse worker permanece ativo, mas pode se perder se o navegador reiniciar o worker; isso limita testes de atualização de NFT após refresh, não a reconciliação REST após uma queda/reconexão do socket na mesma página.

## Perfil, carteiras e favoritos

As rotas privadas `/profile` e `/wallets` permitem editar dados do colecionador, avatar, senha e carteiras simuladas. Perfil usa `GET/PATCH /api/profile`, `POST /api/profile/avatar` e `POST /api/profile/password`; as carteiras usam `GET/POST /api/wallets` e `PATCH /api/wallets/:walletId`. Senhas nunca sao armazenadas em texto claro: o mock verifica e atualiza hashes PBKDF2. Avatar aceita PNG, JPEG ou WebP de ate 1 MB e fica associado ao perfil local simulado.

Carteiras e favoritos sao identificados por usuario no armazenamento do MSW. Uma conta mantem exatamente uma carteira principal; cadastros, edicoes e selecao da principal passam pela API e atualizam a mesma consulta usada no checkout. Favoritos usam `GET /api/favorites`, `PUT /api/favorites/:nftId` e `DELETE /api/favorites/:nftId`; os botoes aparecem no catalogo e nos detalhes. A mutation do favorito atualiza o cache de forma otimista e reverte em falha.

O mock persiste os dados no navegador para demonstrar refresh e isolamento entre contas; isso nao oferece garantias de seguranca, durabilidade ou sincronizacao entre dispositivos. O perfil, carteiras e favoritos nao devem ser considerados dados reais de producao. Execute `docker compose run --rm e2e` para validar os fluxos de conta junto com a regressao do catalogo, carrinho e checkout.

## Performance, dependencias e acessibilidade

As paginas sao carregadas sob demanda pelo TanStack Router com `lazyRouteComponent`; o carregamento inicial de producao nao inclui os chunks das outras rotas nem o runtime MSW. No build da auditoria, o chunk principal ficou em cerca de 396 kB (126 kB gzip), ante 1.053 kB (349 kB gzip) antes da separacao e da remocao do MSW de producao. As imagens de fixture usam URLs Unsplash limitadas a 480 px e qualidade 65. O Google Fonts usa `display=optional` para evitar troca tardia da fonte em conexoes lentas.

`vitest` foi atualizado para 4.1.12 e `lighthouse` 13.6.0 foi adicionado como dependencia de desenvolvimento. Para executar a medicao reproduzivel em Node 24 e Chrome do container Playwright, rode `docker compose run --rm lighthouse`. O comando gera tres auditorias por perfil (mobile/desktop) e pagina (catalogo/detalhes), calcula medianas das categorias Lighthouse, LCP, CLS e TBT, e salva as execucoes completas em [`reports/lighthouse/latest.json`](reports/lighthouse/latest.json). A API de fixtures e o servidor Socket.IO usados nesse build sao locais ao harness; as imagens e fontes permanecem hospedadas externamente.

As medianas desta rodada e as principais mudancas estao resumidas em [`reports/lighthouse/performance-audit.md`](reports/lighthouse/performance-audit.md).

As notas e audits podem variar entre execucoes por conta de rede, Chrome e conteudo remoto. Consulte o JSON para os elementos associados a falhas de contraste e estabilidade visual. As medições não substituem uma auditoria com backend, imagens e fontes hospedados na infraestrutura de produção.
