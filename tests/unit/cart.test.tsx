import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAppRouter } from '../../src/app/router'
import { addCartItem, applyCartCoupon, getCart, quoteCart } from '../../src/features/cart/api/cartApi'
import { server } from '../../src/mocks/server'

const storageKey = 'frontend-challenge:cart:guest:v1'

function persistLegacyCart(itemIds: string[]) {
  window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, itemIds }))
}

function renderApp(initialUrl = '/cart') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const router = createAppRouter(createMemoryHistory({ initialEntries: [initialUrl] }), queryClient)
  const view = render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>)
  return { router, queryClient, ...view }
}

describe('Carrinho', () => {
  it('adiciona a quantidade escolhida e obtém preço pela cotação da API', async () => {
    renderApp('/nft/nft-001')
    fireEvent.change(await screen.findByRole('spinbutton', { name: 'Quantidade do NFT' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }))
    expect(await screen.findByText('2 unidade(s) adicionada(s) ao carrinho.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Abrir carrinho, 2 itens' }))
    expect(await screen.findByRole('heading', { name: /Carrinho \(2\)/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Quantidade de Crimson Ember')).toHaveTextContent('2')
    expect(await screen.findByText('3,7 ETH')).toBeInTheDocument()
    expect(screen.getByText('3,705 ETH')).toBeInTheDocument()
  })

  it('altera a quantidade e recalcula o resumo do pedido', async () => {
    persistLegacyCart(['nft-001'])
    renderApp('/cart')
    fireEvent.click(await screen.findByRole('button', { name: 'Aumentar quantidade de Crimson Ember' }))

    await waitFor(() => expect(screen.getByLabelText('Quantidade de Crimson Ember')).toHaveTextContent('2'))
    expect(await screen.findByText('3,7 ETH')).toBeInTheDocument()
    expect(screen.getByText('3,705 ETH')).toBeInTheDocument()
  })

  it('consolida a mesma edição e mantém edições diferentes em linhas distintas', async () => {
    renderApp('/nft/nft-001')
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar ao carrinho' }))
    await screen.findByText('1 unidade(s) adicionada(s) ao carrinho.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Edição do NFT' }), { target: { value: 'collector' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }))

    expect(await screen.findByText('1 unidade(s) adicionada(s) ao carrinho.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Abrir carrinho, 2 itens' }))
    await waitFor(() => expect(screen.getByText('2,125 ETH')).toBeInTheDocument(), { timeout: 3_000 })
    expect(await screen.findByText(/Edição padrão/)).toBeInTheDocument()
    expect(screen.getByText(/Edição de colecionador/)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Quantidade de Crimson Ember/)).toHaveLength(2)
  })

  it('migra o formato antigo e preserva os itens válidos', async () => {
    persistLegacyCart(['nft-001', 'nft-001', 'nft-008'])
    renderApp('/cart')
    expect(await screen.findByRole('heading', { name: /Carrinho \(3\)/ })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Crimson Ember' })).toBeInTheDocument()
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}').schemaVersion).toBe(2))
    const migrated = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')
    expect(migrated.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ nftId: 'nft-001', editionId: 'standard', quantity: 2 }),
      expect.objectContaining({ nftId: 'nft-008', editionId: null, quantity: 1 }),
    ]))
    expect(migrated.items[0]).not.toHaveProperty('price')
  })

  it('recusa quantidades acima do limite do contrato', async () => {
    await expect(addCartItem({ nftId: 'nft-001', editionId: 'standard', quantity: 4 })).rejects.toMatchObject({ response: { status: 409 } })
    expect((await getCart()).items).toHaveLength(0)
  })

  it('remove um item e apresenta o estado vazio', async () => {
    persistLegacyCart(['nft-001'])
    renderApp('/cart')
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Crimson Ember do carrinho' }))
    expect(await screen.findByRole('heading', { name: 'Seu carrinho está vazio' })).toBeInTheDocument()
  })

  it('aplica cupom válido e trata código inexistente e expirado sem remover itens', async () => {
    persistLegacyCart(['nft-001'])
    renderApp('/cart')
    const input = await screen.findByLabelText('Cupom de desconto')
    fireEvent.change(input, { target: { value: 'KURIO10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(await screen.findByText('Cupom KURIO10 aplicado (10% de desconto).')).toBeInTheDocument()
    expect(await screen.findByText(/0,185 ETH/)).toBeInTheDocument()
    expect(screen.getByText('1,67 ETH')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remover' }))
    fireEvent.change(await screen.findByLabelText('Cupom de desconto'), { target: { value: 'INVALIDO' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cupom não encontrado')
    expect(screen.getByRole('link', { name: 'Crimson Ember' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Cupom de desconto'), { target: { value: 'EXPIRED' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este cupom expirou')
  })

  it('calcula subtotal, desconto e taxas sem erro de ponto flutuante', async () => {
    await addCartItem({ nftId: 'nft-001', editionId: 'standard', quantity: 3 })
    await applyCartCoupon('KURIO10')
    const quote = await quoteCart()
    expect(quote.totals.find((total) => total.currency === 'ETH')).toMatchObject({
      subtotal: '5.55', discount: '0.555', networkFee: '0.005', total: '5',
    })
    expect(quote.canCheckout).toBe(true)
  })

  it('faz rollback da atualização otimista quando a API falha', async () => {
    persistLegacyCart(['nft-001'])
    server.use(http.patch('/api/cart/items/:itemId', () => HttpResponse.json({ message: 'Falha temporária.' }, { status: 503 })))
    renderApp('/cart')
    fireEvent.click(await screen.findByRole('button', { name: 'Aumentar quantidade de Crimson Ember' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária.')
    await waitFor(() => expect(screen.getByLabelText('Quantidade de Crimson Ember')).toHaveTextContent('1'))
  })

  it('mantém os itens quando a cotação falha e permite tentar novamente', async () => {
    persistLegacyCart(['nft-001'])
    server.use(http.post('/api/cart/quote', () => HttpResponse.error()))
    renderApp('/cart')
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar a cotação')
    expect(screen.getByRole('link', { name: 'Crimson Ember' })).toBeInTheDocument()

    server.resetHandlers()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('1,855 ETH')).toBeInTheDocument()
  })

  it('mantém o destino checkout protegido e o carrinho disponível', async () => {
    persistLegacyCart(['nft-001'])
    const { router } = renderApp('/cart')
    const checkoutLink = await screen.findByRole('link', { name: /prosseguir ao checkout/i })
    await screen.findByText('1,855 ETH')
    fireEvent.click(checkoutLink)
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search.returnTo).toBe('/checkout')
  })
})
