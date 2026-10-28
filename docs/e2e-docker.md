# Referência: testes E2E com Docker

## Fluxo

O serviço `e2e` do `compose.yaml` usa `mcr.microsoft.com/playwright:v1.64.1-jammy`, correspondente a `@playwright/test` `1.64.1` no `package-lock.json`. Ele monta o código-fonte e um volume `e2e_node_modules` próprio, executa `npm ci` e inicia `npm run test:e2e`.

O `playwright.config.ts` configura o projeto Chromium e declara `npm run dev:e2e` em `webServer`. Esse comando inicia o Vite e um servidor Socket.IO local usado pelo teste de atualização de preço/estoque. O Playwright espera `http://127.0.0.1:5173` responder antes dos testes e encerra os dois processos depois deles. Os servidores ficam dentro do container E2E, então não dependem do app de desenvolvimento nem da porta publicada no Windows.

## Executar

Na raiz do projeto, com Docker Desktop aberto:

```sh
docker compose run --rm e2e
```

O código de saída do comando reflete o resultado do Playwright. Para remover os volumes de dependências e reinstalá-las na próxima execução:

```sh
docker compose down --volumes
```

Isso também remove o volume `node_modules` do desenvolvimento; a próxima inicialização do serviço `app` o preencherá novamente.

## Manter versões compatíveis

Ao atualizar `@playwright/test`, atualize a tag da imagem `mcr.microsoft.com/playwright` em `compose.yaml` para a mesma versão e confirme a versão resolvida no lockfile. A imagem inclui uma versão específica do Chromium e das bibliotecas de sistema, por isso a versão da imagem precisa acompanhar a do pacote Playwright.

O servidor Vite de teste não publica portas no host. Para depurar em modo interativo, remova `--rm` do comando e use `docker compose run e2e`; os logs do Vite são encaminhados pelo Playwright.

## Antivírus ou proxy com inspeção HTTPS

Se `npm ci` falhar com `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, o container pode não confiar na CA usada pelo antivírus ou proxy para inspecionar TLS. Exporte a CA confiável do sistema em PEM e passe-a somente para a execução:

```powershell
$cert = Get-ChildItem Cert:\LocalMachine\Root,Cert:\CurrentUser\Root |
  Where-Object Subject -Match 'Avast Web/Mail Shield Root' |
  Select-Object -First 1
$caPath = Join-Path $env:TEMP 'frontend-challenge-ca.pem'
$pem = [Convert]::ToBase64String($cert.RawData, [Base64FormattingOptions]::InsertLineBreaks)
[IO.File]::WriteAllText($caPath, "-----BEGIN CERTIFICATE-----`n$pem`n-----END CERTIFICATE-----`n", [Text.Encoding]::ASCII)
docker compose run --rm --volume "${caPath}:/tmp/extra-ca.pem:ro" --env NODE_EXTRA_CA_CERTS=/tmp/extra-ca.pem e2e
Remove-Item -LiteralPath $caPath
```

Substitua o filtro pelo nome da CA confiável do seu ambiente, se necessário. Não desative a verificação TLS do npm.
