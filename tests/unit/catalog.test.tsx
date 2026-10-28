import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAppRouter } from '../../src/app/router'
import { nftFixtures } from '../../src/mocks/data/nfts'
import { server } from '../../src/mocks/server'

function renderCatalog(initialUrl = '/') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] })
  const router = createAppRouter(history)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { router, ...view }
}

describe('Catálogo', () => {
  it('carrega os NFTs do endpoint simulado e exibe os cards', async () => {
    renderCatalog()

    expect(await screen.findByRole('heading', { name: 'NFTs em destaque' })).toBeInTheDocument()
    expect(await screen.findByText('Crimson Ember')).toBeInTheDocument()
    expect(screen.getByText('Moonlit Circuit')).toBeInTheDocument()
    expect(screen.getAllByTestId('nft-card')).toHaveLength(6)
  })

  it('sincroniza a busca com os resultados e a URL', async () => {
    const { router } = renderCatalog()
    const search = await screen.findByRole('searchbox', { name: /buscar NFTs/i })

    fireEvent.change(search, { target: { value: 'Moonlit' } })

    expect(await screen.findByText('Moonlit Circuit')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search.q).toBe('Moonlit'))
    expect(screen.queryByText('Crimson Ember')).not.toBeInTheDocument()
  })

  it('filtra por disponibilidade e por coleção', async () => {
    renderCatalog()
    await screen.findByText('Crimson Ember')

    fireEvent.change(screen.getByLabelText('Status do NFT'), { target: { value: 'reserved' } })
    expect(await screen.findByText('Prism Sanctuary')).toBeInTheDocument()
    expect(screen.getByText('Neon Vessel #552')).toBeInTheDocument()
    expect(screen.queryByText('Crimson Ember')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Coleção'), { target: { value: 'Echo Vault' } })
    expect(await screen.findByText('Obsidian Bloom #501')).toBeInTheDocument()
    expect(screen.queryByText('Neon Vessel #552')).not.toBeInTheDocument()
  })

  it('ordena por preço e pagina os resultados com o estado na URL', async () => {
    const { router } = renderCatalog()
    await screen.findByText('Crimson Ember')

    fireEvent.change(screen.getByLabelText('Ordenar NFTs'), { target: { value: 'price-asc' } })
    await waitFor(() => expect(within(screen.getAllByTestId('nft-card')[0]).getByRole('heading', { name: 'Golden Signal #160' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(await screen.findByText('Sage Nomad #009')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search.page).toBe(2))
  })

  it('mostra carregamento e trata erros da API', async () => {
    server.use(http.get('/api/nfts', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150))
      return HttpResponse.json(nftFixtures)
    }))
    const { unmount } = renderCatalog()
    expect(await screen.findByRole('status', { name: 'Carregando NFTs' })).toBeInTheDocument()
    expect(await screen.findByText('Crimson Ember')).toBeInTheDocument()
    unmount()

    server.use(http.get('/api/nfts', () => HttpResponse.json({ message: 'falha' }, { status: 500 })))
    renderCatalog()
    expect(await screen.findByText('Não foi possível carregar os NFTs.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('apresenta estado vazio e permite limpar a busca', async () => {
    renderCatalog()
    const search = await screen.findByRole('searchbox', { name: /buscar NFTs/i })

    fireEvent.change(search, { target: { value: 'obra que não existe' } })

    expect(await screen.findByText('Nenhum NFT encontrado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca e filtros' }))
    expect(await screen.findByText('Crimson Ember')).toBeInTheDocument()
  })

  it('navega do card para a rota de detalhes correspondente', async () => {
    renderCatalog()

    fireEvent.click(await screen.findByRole('link', { name: 'Ver detalhes de Crimson Ember' }))

    expect(await screen.findByRole('heading', { name: 'Detalhes do NFT' })).toBeInTheDocument()
  })

  it('mostra um estado alternativo quando a imagem do NFT está ausente', async () => {
    renderCatalog()
    await screen.findByText('Crimson Ember')
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))

    expect(await screen.findByRole('img', { name: 'Imagem de Obsidian Bloom #501 indisponível' })).toBeInTheDocument()
  })
})
