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
  it('rejects a non-array success response and shows a recoverable catalog error', async () => {
    server.use(http.get('/api/nfts', () => HttpResponse.json({ data: nftFixtures })))
    const { container } = renderCatalog()

    expect(await screen.findAllByRole('button', { name: 'Tentar novamente' })).toHaveLength(2)
    const errorHeadings = [...container.querySelectorAll('h3')]
      .filter((heading) => heading.textContent?.includes('Não foi possível carregar os NFTs.'))
    expect(errorHeadings).toHaveLength(2)
  })

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
    const { router } = renderCatalog()

    fireEvent.click(await screen.findByRole('link', { name: 'Ver detalhes de Crimson Ember' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/nft/nft-001'))
    expect(await screen.findByRole('heading', { name: 'Crimson Ember' })).toBeInTheDocument()
    expect(screen.getByText('Mara Voss')).toBeInTheDocument()
  })

  it('carrega os detalhes completos pelo endpoint individual e adiciona o NFT ao carrinho', async () => {
    renderCatalog('/nft/nft-001')

    expect(await screen.findByRole('heading', { name: 'Crimson Ember' })).toBeInTheDocument()
    expect(screen.getByText('An emberborn masterpiece with volcanic reflections and a rare forged edge.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Características' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }))
    expect(await screen.findByText('1 unidade(s) adicionada(s) ao carrinho.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir carrinho, 1 item' })).toBeInTheDocument()
  })

  it('mostra o estado de carregamento dos detalhes enquanto consulta a API', async () => {
    server.use(http.get('/api/nfts/nft-001', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return HttpResponse.json(nftFixtures[0])
    }))
    renderCatalog('/nft/nft-001')

    expect(await screen.findByRole('status', { name: 'Carregando detalhes do NFT' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Crimson Ember' })).toBeInTheDocument()
  })

  it('trata NFT inexistente e erros da consulta de detalhes', async () => {
    renderCatalog('/nft/unknown-id')
    expect(await screen.findByRole('heading', { name: 'Este NFT não existe.' })).toBeInTheDocument()

    server.use(http.get('/api/nfts/nft-001', () => HttpResponse.json({ message: 'falha' }, { status: 503 })))
    renderCatalog('/nft/nft-001')
    expect(await screen.findByRole('heading', { name: 'Ocorreu um erro ao carregar este NFT.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('desabilita compra para itens indisponíveis e apresenta fallback sem imagem', async () => {
    renderCatalog('/nft/nft-012')
    expect(await screen.findByRole('img', { name: 'Imagem de Obsidian Bloom #501 indisponível' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Obra reservada' })).toBeDisabled()
  })

  it('mostra um estado alternativo quando a imagem do NFT está ausente', async () => {
    renderCatalog()
    await screen.findByText('Crimson Ember')
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }))

    expect(await screen.findByRole('img', { name: 'Imagem de Obsidian Bloom #501 indisponível' })).toBeInTheDocument()
  })
})
