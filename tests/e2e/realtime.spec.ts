import { expect, test } from '@playwright/test'

async function emitNftPriceUpdate(page: import('@playwright/test').Page, price: string) {
  const event = await page.evaluate(async (nextPrice) => {
    const response = await fetch('/api/dev/scenarios/nft-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nftId: 'nft-001', price: nextPrice, editionId: 'standard', editionPrice: nextPrice }),
    })
    return (await response.json() as { event: unknown }).event
  }, price)
  await page.request.post('http://127.0.0.1:3001/__test__/emit', { data: { event } })
  return event
}

async function connectOrderSocket(page: import('@playwright/test').Page) {
  await expect.poll(async () => (await (await page.request.get('http://127.0.0.1:3001/__test__/realtime-status')).json() as { connectedClients: number }).connectedClients).toBeGreaterThan(0)
}

test('nft.updated refreshes catalog and detail and ignores duplicate or older versions', async ({ page }) => {
  await page.goto('/')
  const card = page.getByTestId('nft-card').filter({ has: page.getByRole('heading', { name: 'Crimson Ember' }) })
  await expect(card).toContainText('1,85 ETH')
  await connectOrderSocket(page)

  const first = await emitNftPriceUpdate(page, '2.25')
  await expect(card).toContainText('2,25 ETH')
  const newest = await emitNftPriceUpdate(page, '2.5')
  await expect(card).toContainText('2,5 ETH')

  await page.request.post('http://127.0.0.1:3001/__test__/emit', { data: { event: newest } })
  await page.request.post('http://127.0.0.1:3001/__test__/emit', { data: { event: first } })
  await expect(card).toContainText('2,5 ETH')
  await expect(card).not.toContainText('2,25 ETH')

  await card.getByRole('link', { name: 'Ver detalhes de Crimson Ember' }).click()
  await expect(page.getByRole('heading', { name: 'Crimson Ember' })).toBeVisible()
  await expect(page.getByText('2,5 ETH', { exact: true }).first()).toBeVisible()
})

test('order.updated duplicates are ignored and a dropped socket recovers through REST on reconnect', async ({ page }) => {
  await page.goto('/nft/nft-001')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('1 unidade(s) adicionada(s) ao carrinho.')).toBeVisible()
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?.*returnTo=%2Fcheckout/)
  await page.getByLabel('E-mail').fill('luna@demo.kurio')
  await page.getByLabel('Senha').fill('Luna@Kurio2026!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('frontend-challenge:mock-checkout:scenario:v1', JSON.stringify({ orderResult: 'pending' })))
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText('Carteira conectada')).toBeVisible()
  await page.getByRole('button', { name: 'Revalidar cotação' }).click()
  await expect(page.getByRole('status')).toContainText('Cotação atual revisada')
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido pendente' })).toBeVisible()
  const orderText = await page.getByText(/Pedido order-/).textContent()
  const orderId = orderText!.replace('Pedido ', '')
  await connectOrderSocket(page)

  const dropped = await page.request.post('http://127.0.0.1:3001/__test__/drop-connections')
  expect((await dropped.json() as { dropped: number }).dropped).toBeGreaterThan(0)
  await expect.poll(async () => (await (await page.request.get('http://127.0.0.1:3001/__test__/realtime-status')).json() as { connectedClients: number }).connectedClients).toBe(0)

  const transition = await page.evaluate(async (id) => {
    const token = localStorage.getItem('frontend-challenge:auth:session:v1')
    const response = await fetch(`/api/dev/scenarios/orders/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    return await response.json() as { event: { version: number; resourceId: string; scopeId: string; type: string; updatedAt: string; payload: { status: string } } }
  }, orderId)
  expect(transition.event).toMatchObject({ type: 'order.updated', resourceId: orderId, scopeId: 'user-luna-001', version: 2, payload: { status: 'confirmed' } })

  await connectOrderSocket(page)
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
  const stale = { ...transition.event, version: 1, payload: { status: 'pending' } }
  await page.request.post('http://127.0.0.1:3001/__test__/emit', { data: { event: transition.event } })
  await page.request.post('http://127.0.0.1:3001/__test__/emit', { data: { event: stale } })
  await page.request.post('http://127.0.0.1:3001/__test__/emit', { data: { event: { ...transition.event, scopeId: 'user-rafael-002', version: 3, payload: { status: 'declined' } } } })
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
})
