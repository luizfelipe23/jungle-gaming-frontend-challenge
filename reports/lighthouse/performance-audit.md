# Auditoria de performance e acessibilidade

Executada em 2026-10-29 com Lighthouse 13.6.0, Chrome do container Playwright `mcr.microsoft.com/playwright:v1.64.1-jammy` (Node 24.22.1). Cada página/perfil teve três execuções; a tabela usa a mediana. O build foi servido pelo Vite Preview na porta 4173, com fixtures de NFT servidas pelo harness HTTP local na porta 4174 e Socket.IO local na 3001. As imagens Unsplash e a folha do Google Fonts continuaram externas.

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | Catálogo | 98 | 100 | 100 | 100 | 1.531 ms | 0,00044 | 112 ms |
| Mobile | Detalhes do NFT | 79 | 100 | 100 | 100 | 3.492 ms | 0,10710 | 103 ms |
| Desktop | Catálogo | 100 | 100 | 100 | 100 | 539 ms | 0,00269 | 0 ms |
| Desktop | Detalhes do NFT | 95 | 100 | 100 | 100 | 885 ms | 0,06200 | 0 ms |

## Alterações realizadas

- Divisão sob demanda das páginas pelo TanStack Router; o chunk inicial caiu de 1.053,20 kB (348,83 kB gzip) para 396,28 kB (126,17 kB gzip), redução de 62,4% no arquivo e 63,8% no gzip.
- MSW passou a ser importado somente em desenvolvimento, sem o runtime de mocks no build de produção. O harness Lighthouse serve as fixtures de NFTs localmente.
- Imagens Unsplash dos fixtures passaram para 480 px/q65, adequadas à largura dos cards e da imagem de detalhes.
- Corrigido o contraste dos CTAs “Entrar” e “Explorar”; acessibilidade do catálogo passou de 96 para 100. Adicionado `robots.txt`, elevando SEO de 91 para 100.
- A folha de fonte usa `display=optional` para limitar deslocamentos por troca tardia em conexão lenta.
- Vitest atualizado para 4.1.12 e Lighthouse 13.6.0 adicionado como dependência de desenvolvimento. `npm audit` encontrou zero vulnerabilidades.

## Pontos para acompanhamento

O CLS ainda é elevado na rota de detalhes (0,107 mobile e 0,062 desktop); o Lighthouse apontou o rodapé e o item “Carrinho” da navegação fixa entre os elementos deslocados. O LCP mobile dos detalhes ficou em 3,49 s, sem melhora relevante após reduzir a imagem, indicando que a latência das fontes externas deve ser medida também no ambiente de produção. Catálogo e detalhes tiveram pontuação de acessibilidade 100 após corrigir o contraste; os demais audits não indicaram falhas nessas categorias.

O JSON com as 12 execuções e os elementos dos audits abaixo de 100 está em [`latest.json`](latest.json). Build, lint, typecheck e auditoria npm passaram. Foram executados 41 testes unitários de catálogo, carrinho, conta, pedidos e realtime; os testes de login foram omitidos conforme instrução.
