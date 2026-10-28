# Frontend Challenge

Aplicação inicial do Frontend Challenge, construída com React, TypeScript e Vite. O ambiente de desenvolvimento usa Node 24 Alpine; os testes E2E usam uma imagem oficial do Playwright com navegador e dependências do sistema já instalados.

## Catálogo

A página inicial segue o layout responsivo da Kurio e carrega as obras pela API simulada do MSW. Busca, filtros por disponibilidade, coleção, raridade, moeda e faixa de preço, ordenação e paginação ficam sincronizados com a URL. Os cards levam à rota de detalhes já existente; carrinho e demais telas continuam como placeholders.

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
