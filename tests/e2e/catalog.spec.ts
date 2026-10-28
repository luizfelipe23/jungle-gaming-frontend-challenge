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
  await expect(page.getByRole('heading', { name: 'Detalhes do NFT' })).toBeVisible()
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
