import { expect, test } from '@playwright/test'

test('catalog loads mocked NFTs on first render', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /NFTs em destaque/i })).toBeVisible()
  await expect(page.getByText('Crimson Ember')).toBeVisible()
  await expect(page.getByText('Moonlit Circuit')).toBeVisible()
})

test('search filters NFTs and writes its value to the URL', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: /buscar NFTs/i }).fill('Moonlit')

  await expect(page.getByText('Moonlit Circuit')).toBeVisible()
  await expect(page.getByText('Crimson Ember')).toHaveCount(0)
  await expect(page).toHaveURL(/q=Moonlit/)
})

test('filters, sorts, and paginates catalog results', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Status do NFT').selectOption('available')
  await page.getByLabel('Ordenar NFTs').selectOption('price-asc')

  await expect(page.getByText('Golden Signal #160')).toBeVisible()
  await page.getByRole('button', { name: 'Página 2' }).click()

  await expect(page.getByText('Sage Nomad #009')).toBeVisible()
  await expect(page).toHaveURL(/page=2/)
})

test('shows an empty result and can clear the search', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: /buscar NFTs/i }).fill('obra inexistente')
  await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()

  await page.getByRole('button', { name: 'Limpar busca e filtros' }).click()
  await expect(page.getByText('Crimson Ember')).toBeVisible()
})

test('opens the matching details route from a card', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Ver detalhes de Crimson Ember' }).click()

  await expect(page).toHaveURL(/\/nft\/nft-001$/)
  await expect(page.getByRole('heading', { name: 'Crimson Ember' })).toBeVisible()
  await expect(page.getByText('Mara Voss')).toBeVisible()
})

test('adds an available NFT to the shared cart', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()

  await expect(page.getByRole('button', { name: 'Adicionado ao carrinho' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir carrinho, 1 item' })).toBeVisible()
})

test('shows a not found state for an unknown NFT and remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/nft/unknown-id')
  await expect(page.getByRole('heading', { name: 'Este NFT não existe.' })).toBeVisible()
  await page.getByRole('link', { name: /voltar ao catálogo/i }).click()
  await page.getByRole('link', { name: 'Ver detalhes de Crimson Ember' }).click()
  await expect(page.getByRole('heading', { name: 'Crimson Ember' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
})

test('persists NFTs in the cart, removes them, and returns to the catalog on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/nft/nft-001')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Abrir carrinho, 1 item' }).click()

  await expect(page.getByRole('heading', { name: /Carrinho \(1\)/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Crimson Ember' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Crimson Ember' })).toBeVisible()
  await page.getByRole('button', { name: 'Remover Crimson Ember do carrinho' }).click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  await page.getByRole('link', { name: 'Continuar comprando' }).click()
  await expect(page.getByRole('heading', { name: 'NFTs em destaque' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
})

test('redirects a guest from the cart to login before checkout', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Abrir carrinho, 1 item' }).click()
  await page.getByRole('link', { name: /prosseguir ao checkout/i }).click()

  await expect(page).toHaveURL(/\/login\?.*returnTo=%2Fcheckout/)
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible()
})

test('requires login for checkout and returns to the requested route', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?.*returnTo=%2Fcheckout/)
  await page.getByLabel('E-mail').fill('luna@demo.kurio')
  await page.getByLabel('Senha').fill('Luna@Kurio2026!')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible()
})

test('restores the session after refresh and logout preserves the guest cart', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Entrar' }).click()
  await page.getByLabel('E-mail').fill('luna@demo.kurio')
  await page.getByLabel('Senha').fill('Luna@Kurio2026!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('link', { name: 'Luna Alves' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('link', { name: 'Luna Alves' })).toBeVisible()
  const cartBeforeLogout = await page.evaluate(() => localStorage.getItem('frontend-challenge:cart:guest:v1'))
  await page.getByRole('button', { name: 'Sair' }).first().click()
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('frontend-challenge:cart:guest:v1'))).toBe(cartBeforeLogout)
})

test('expires the session during checkout and preserves the guest cart', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('rafael@demo.kurio')
  await page.getByLabel('Senha').fill('Rafael@Kurio2026!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('link', { name: 'Rafael Costa' })).toBeVisible()
  await page.evaluate(() => {
    localStorage.setItem('frontend-challenge:cart:guest:v1', JSON.stringify({ version: 1, itemIds: ['nft-001'] }))
    const key = 'frontend-challenge:mock-auth:sessions:v1'
    const sessions = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ expiresAt: number }>
    sessions[0].expiresAt = Date.now() - 1
    localStorage.setItem(key, JSON.stringify(sessions))
  })

  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?.*returnTo=%2Fcheckout.*sessionError=true/)
  await expect(page.getByRole('alert')).toContainText('Entre novamente para continuar')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('frontend-challenge:cart:guest:v1'))).toContain('nft-001')
})

test('edits quantity, applies a coupon, refreshes and keeps the API quote in sync', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await page.getByLabel('Quantidade do NFT').fill('2')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Abrir carrinho, 2 itens' }).click()
  await expect(page.getByRole('status', { name: 'Quantidade de Crimson Ember' })).toHaveText('2')
  await page.getByRole('button', { name: 'Aumentar quantidade de Crimson Ember' }).click()
  await expect(page.getByRole('status', { name: 'Quantidade de Crimson Ember' })).toHaveText('3')

  await page.getByLabel('Cupom de desconto').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom KURIO10 aplicado (10% de desconto).')).toBeVisible()
  await expect(page.getByText('0,555 ETH')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('status', { name: 'Quantidade de Crimson Ember' })).toHaveText('3')
  await expect(page.getByText('Cupom KURIO10 aplicado (10% de desconto).')).toBeVisible()
  await expect(page.getByText('5 ETH', { exact: true })).toBeVisible()
})

test('merges the visitor cart on login and isolates carts between accounts', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await page.getByLabel('Quantidade do NFT').fill('2')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Entrar' }).click()
  await page.getByLabel('E-mail').fill('luna@demo.kurio')
  await page.getByLabel('Senha').fill('Luna@Kurio2026!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('link', { name: 'Luna Alves' })).toBeVisible()
  await page.getByRole('link', { name: 'Abrir carrinho, 2 itens' }).click()
  await expect(page.getByRole('status', { name: 'Quantidade de Crimson Ember' })).toHaveText('2')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('frontend-challenge:cart:guest:v1'))).toBeNull()

  await page.getByRole('button', { name: 'Sair' }).first().click()
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
  await page.getByRole('link', { name: 'Entrar' }).first().click()
  await page.getByLabel('E-mail').fill('rafael@demo.kurio')
  await page.getByLabel('Senha').fill('Rafael@Kurio2026!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('link', { name: 'Rafael Costa' })).toBeVisible()
  await page.getByRole('link', { name: 'Abrir carrinho' }).click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('requotes changed price and blocks an edition after a Socket.IO inventory update', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Abrir carrinho, 1 item' }).click()
  await expect(page.getByText('1,855 ETH')).toBeVisible()

  await expect.poll(async () => {
    const response = await page.request.get('http://127.0.0.1:3001/__test__/realtime-status')
    return (await response.json() as { connectedClients: number }).connectedClients
  }).toBeGreaterThan(0)

  const priceUpdate = await page.evaluate(async () => {
    const response = await fetch('/api/dev/scenarios/nft-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'nft-001', price: '2.25', status: 'available', availableQuantity: 4, editionId: 'standard', editionPrice: '2.25' }),
    })
    return (await response.json() as { event: unknown }).event
  })
  await page.request.post('http://127.0.0.1:3001/__test__/emit', { data: { event: priceUpdate } })
  await expect(page.getByRole('status').filter({ hasText: 'O preço ou a disponibilidade' })).toBeVisible()
  await expect(page.getByText('2,25 ETH', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('2,255 ETH', { exact: true })).toBeVisible()

  const stockUpdate = await page.evaluate(async () => {
    const response = await fetch('/api/dev/scenarios/nft-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'nft-001', status: 'reserved', availableQuantity: 0, editionId: 'standard', editionAvailableQuantity: 0 }),
    })
    return (await response.json() as { event: unknown }).event
  })
  await page.request.post('http://127.0.0.1:3001/__test__/emit', { data: { event: stockUpdate } })
  await expect(page.getByText('Indisponível no momento')).toBeVisible()
  await expect(page.getByRole('link', { name: /prosseguir ao checkout/i })).toHaveAttribute('aria-disabled', 'true')
})

test('keeps search, filters, cards, and bottom navigation usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('searchbox', { name: /buscar NFTs/i })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navegação rápida' })).toBeVisible()
  await page.getByRole('button', { name: /filtros/i }).click()
  await expect(page.getByLabel('Status do NFT')).toBeVisible()
  await expect(page.getByText('Crimson Ember')).toBeVisible()
})
