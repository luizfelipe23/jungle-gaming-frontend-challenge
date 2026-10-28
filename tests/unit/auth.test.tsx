import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAppRouter } from '../../src/app/router'
import { sessionQueryKey } from '../../src/features/auth/hooks/useSession'
import { mockSessionsStorageKey } from '../../src/features/auth/types/session'
import { sessionTokenStorageKey } from '../../src/features/auth/session-token'
import { server } from '../../src/mocks/server'

const guestCartKey = 'frontend-challenge:cart:guest:v1'

function renderApp(initialUrl = '/login') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const router = createAppRouter(createMemoryHistory({ initialEntries: [initialUrl] }), queryClient)
  const view = render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>)
  return { router, queryClient, ...view }
}

async function signIn(email = 'luna@demo.kurio', password = 'Luna@Kurio2026!') {
  await screen.findByRole('heading', { name: 'Bem-vindo de volta' })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('Autenticação e sessão', () => {
  it('valida os campos de login antes da chamada da API', async () => {
    renderApp()
    await screen.findByRole('heading', { name: 'Bem-vindo de volta' })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'email-invalido' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
  })

  it('faz login via API e navega para o catálogo', async () => {
    renderApp()
    await signIn()

    expect(await screen.findByRole('heading', { name: 'NFTs em destaque' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Luna Alves' })).toBeInTheDocument()
    expect(window.localStorage.getItem(sessionTokenStorageKey)).toBeTruthy()
  })

  it('apresenta erro compreensível para credenciais inválidas', async () => {
    renderApp()
    await signIn('luna@demo.kurio', 'senha-errada-2026')

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(window.localStorage.getItem(sessionTokenStorageKey)).toBeNull()
  })

  it('cadastra uma nova conta e trata e-mail já cadastrado', async () => {
    renderApp('/register')
    await screen.findByRole('heading', { name: 'Criar sua conta' })
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nova Pessoa' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nova@example.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'NovaSenha2026' } })
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'NovaSenha2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('heading', { name: 'Conta criada com sucesso' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Ir para o login' }))
    await screen.findByRole('heading', { name: 'Bem-vindo de volta' })
    fireEvent.click(screen.getByRole('link', { name: 'Cadastre-se' }))
    await screen.findByRole('heading', { name: 'Criar sua conta' })
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Outra Pessoa' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nova@example.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'OutraSenha2026' } })
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'OutraSenha2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este e-mail já possui uma conta.')
  })

  it('protege checkout, preserva o destino e retorna após login', async () => {
    const { router } = renderApp('/checkout')
    await screen.findByRole('heading', { name: 'Bem-vindo de volta' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search.returnTo).toBe('/checkout')

    await signIn()
    expect(await screen.findByRole('heading', { name: 'Pagamento' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/checkout')
  })

  it('recupera a sessão após recriar a aplicação no mesmo navegador', async () => {
    const firstApp = renderApp()
    await signIn()
    await screen.findByRole('heading', { name: 'NFTs em destaque' })
    firstApp.unmount()

    const secondApp = renderApp('/profile')
    expect(await screen.findByRole('heading', { name: 'Perfil do colecionador' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Luna Alves' })).toBeInTheDocument()
    secondApp.unmount()
  })

  it('faz logout, limpa dados privados e preserva o carrinho do visitante', async () => {
    const { router, queryClient } = renderApp()
    await signIn()
    await screen.findByRole('heading', { name: 'NFTs em destaque' })
    queryClient.setQueryData(['private', 'user-luna-001', 'profile'], { secret: 'private-data' })
    window.localStorage.setItem(guestCartKey, JSON.stringify({ version: 1, itemIds: ['nft-001'] }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])
    await screen.findByRole('heading', { name: 'Bem-vindo de volta' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(window.localStorage.getItem(sessionTokenStorageKey)).toBeNull()
    expect(window.localStorage.getItem(guestCartKey)).toContain('nft-001')
    expect(queryClient.getQueryData(['private', 'user-luna-001', 'profile'])).toBeUndefined()
    expect(queryClient.getQueryData(sessionQueryKey)).toBeNull()
  })

  it('não expõe sessão de outro usuário após novo login', async () => {
    const { queryClient } = renderApp()
    await signIn()
    await screen.findByRole('heading', { name: 'NFTs em destaque' })
    queryClient.setQueryData(['private', 'user-luna-001', 'profile'], { name: 'Luna privada' })
    fireEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])
    await screen.findByRole('heading', { name: 'Bem-vindo de volta' })
    await signIn('rafael@demo.kurio', 'Rafael@Kurio2026!')

    expect(await screen.findByRole('link', { name: 'Rafael Costa' })).toBeInTheDocument()
    expect(queryClient.getQueryData(['private', 'user-luna-001', 'profile'])).toBeUndefined()
  })

  it('trata a sessão expirada durante acesso ao checkout e preserva o carrinho', async () => {
    const { router } = renderApp()
    await signIn()
    await screen.findByRole('heading', { name: 'NFTs em destaque' })
    const sessions = JSON.parse(window.localStorage.getItem(mockSessionsStorageKey) ?? '[]') as Array<{ token: string; expiresAt: number }>
    sessions[0].expiresAt = Date.now() - 1
    window.localStorage.setItem(mockSessionsStorageKey, JSON.stringify(sessions))
    const cartValue = JSON.stringify({ version: 1, itemIds: ['nft-001'] })
    window.localStorage.setItem(guestCartKey, cartValue)

    fireEvent.click(screen.getByRole('link', { name: 'Luna Alves' }))
    await screen.findByRole('heading', { name: 'Bem-vindo de volta' })
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível validar sua sessão anterior.')
    expect(router.state.location.pathname).toBe('/login')
    expect(window.localStorage.getItem(sessionTokenStorageKey)).toBeNull()
    const savedCart = JSON.parse(window.localStorage.getItem(guestCartKey) ?? '{}') as { schemaVersion: number; items: Array<{ nftId: string; quantity: number }> }
    expect(savedCart.schemaVersion).toBe(2)
    expect(savedCart.items).toContainEqual(expect.objectContaining({ nftId: 'nft-001', quantity: 1 }))
  })

  it('redireciona para uma rota pública diante de erro de comunicação na sessão', async () => {
    server.use(http.get('/api/auth/session', () => HttpResponse.error()))
    const { router } = renderApp('/profile')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível validar sua sessão anterior.')
    expect(router.state.location.pathname).toBe('/login')
  })
})
