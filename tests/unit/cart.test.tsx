import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createAppRouter } from '../../src/app/router'

const storageKey = 'frontend-challenge:cart:guest:v1'

function persistCart(itemIds: string[]) {
  window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, itemIds }))
}

function renderApp(initialUrl = '/cart') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const router = createAppRouter(createMemoryHistory({ initialEntries: [initialUrl] }), queryClient)
  const view = render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>)
  return { router, ...view }
}

describe('Carrinho', () => {
  it('adiciona um NFT, evita duplicatas e calcula o subtotal', async () => {
    renderApp('/nft/nft-001')
    const addButton = await screen.findByRole('button', { name: 'Adicionar ao carrinho' })
    fireEvent.click(addButton)
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionado ao carrinho' }))

    expect(await screen.findByRole('link', { name: 'Abrir carrinho, 1 item' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Abrir carrinho, 1 item' }))

    expect(await screen.findByRole('heading', { name: /Carrinho \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crimson Ember' })).toBeInTheDocument()
    const totals = screen.getByText('Total por moeda').parentElement
    expect(within(totals!).getByText('1,85 ETH')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}').itemIds).toEqual(['nft-001'])
  })

  it('remove um NFT e apresenta o estado vazio', async () => {
    persistCart(['nft-001'])
    renderApp('/cart')

    fireEvent.click(await screen.findByRole('button', { name: 'Remover Crimson Ember do carrinho' }))
    expect(await screen.findByRole('heading', { name: 'Seu carrinho está vazio' })).toBeInTheDocument()
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}').itemIds).toEqual([]))
  })

  it('restaura itens persistidos e mantém subtotais separados por moeda', async () => {
    persistCart(['nft-001', 'nft-008'])
    const firstRender = renderApp('/cart')

    expect(await screen.findByRole('link', { name: 'Crimson Ember' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Violet Nomad #314' })).toBeInTheDocument()
    expect(within(screen.getByText('Subtotal ETH').parentElement!).getByText('1,85 ETH')).toBeInTheDocument()
    expect(within(screen.getByText('Subtotal USD').parentElement!).getByText('1,39 USD')).toBeInTheDocument()
    firstRender.unmount()

    renderApp('/cart')
    expect(await screen.findByRole('heading', { name: /Carrinho \(2\)/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir carrinho, 2 itens' })).toBeInTheDocument()
  })

  it('ignora armazenamento inválido sem quebrar a aplicação', async () => {
    window.localStorage.setItem(storageKey, '{json inválido')
    renderApp('/cart')

    expect(await screen.findByRole('heading', { name: 'Seu carrinho está vazio' })).toBeInTheDocument()
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')).toEqual({ version: 1, itemIds: [] }))
  })

  it('navega para o checkout quando há itens', async () => {
    persistCart(['nft-001'])
    const { router } = renderApp('/cart')

    const checkoutLink = await screen.findByRole('link', { name: /prosseguir ao checkout/i })
    await screen.findByRole('link', { name: 'Crimson Ember' })
    await waitFor(() => expect(checkoutLink).not.toHaveAttribute('aria-disabled', 'true'))
    fireEvent.click(checkoutLink)
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search.returnTo).toBe('/checkout')
    expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
  })
})
