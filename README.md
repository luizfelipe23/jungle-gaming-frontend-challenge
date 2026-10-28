# Frontend Challenge

Aplicação inicial do Frontend Challenge, construída com React, TypeScript e Vite. O ambiente de desenvolvimento usa Node 24 Alpine; os testes E2E usam uma imagem oficial do Playwright com navegador e dependências do sistema já instalados.

## Catálogo

A página inicial segue o layout responsivo da Kurio e carrega as obras pela API simulada do MSW. Busca, filtros por disponibilidade, coleção, raridade, moeda e faixa de preço, ordenação e paginação ficam sincronizados com a URL. Os cards levam à página de detalhes do NFT; carrinho, checkout e demais telas evoluem conforme as etapas do desafio.

## Detalhes do NFT

Abra uma obra pelo card do catálogo ou acesse diretamente `/nft/<id>` (por exemplo, `/nft/nft-001`). A página consulta `GET /api/nfts/:id`, exibe os detalhes disponíveis, trata carregamento, falhas, IDs inexistentes (404) e imagens ausentes, e funciona em telas pequenas e grandes. NFTs disponíveis podem ser adicionados ao carrinho, que mantém os IDs em armazenamento local versionado.

Os detalhes extras simulados (criador, token e atributos) são opcionais no tipo `Nft`, para que registros sem esses dados continuem válidos.

## Carrinho

Acesse `/cart` pelo ícone do cabeçalho. Cada NFT é tratado como uma unidade única; o carrinho do visitante persiste IDs em `localStorage` e carrega os dados atuais pelo endpoint de detalhes. Os subtotais e o total são exibidos por moeda (ETH e USD) sem conversão entre elas. É possível remover itens, voltar ao catálogo ou prosseguir para `/checkout`, que permanece como placeholder. A validação final de preço e disponibilidade será feita na etapa de checkout.

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

O container instala as dependências com `npm ci`, inicia seu próprio servidor Vite e executa os testes Chromium. O Playwright aguarda o servidor ficar disponível e encerra o Vite ao final da execução. O serviço de testes tem um volume de dependências separado do ambiente de desenvolvimento.

Se um antivírus ou proxy inspecionar HTTPS, consulte no guia E2E como fornecer a CA confiável ao container sem desativar a validação TLS.

Build, lint, verificação de tipos e testes unitários podem ser executados no container de desenvolvimento:

```sh
docker compose run --rm app npm run build
docker compose run --rm app npm run lint
docker compose run --rm app npm run typecheck
docker compose run --rm app npm test
```

Consulte [docs/e2e-docker.md](docs/e2e-docker.md) para detalhes sobre a configuração E2E e a atualização das versões compatíveis.
