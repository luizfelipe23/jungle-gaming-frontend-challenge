import { createBrowserHistory, createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'

import { AppLayout } from '../components/layout/AppLayout'
import { CatalogPage } from '../features/catalog/pages/CatalogPage'
import { validateCatalogSearch } from '../features/catalog/types/catalogSearch'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
    </>
  ),
})

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppLayout,
})

export const catalogRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  validateSearch: validateCatalogSearch,
  component: CatalogPage,
})

const nftDetailsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/nft/$nftId',
  component: () => (
    <section className="rounded-2xl border border-white/10 bg-[#241612] p-8 text-[#F5F1EB]">
      <h1 className="text-3xl font-semibold">Detalhes do NFT</h1>
      <p className="mt-3 text-[#CFB28C]">Esta rota ainda será implementada na próxima etapa.</p>
    </section>
  ),
})

const cartRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/cart',
  component: () => (
    <section className="rounded-2xl border border-white/10 bg-[#241612] p-8 text-[#F5F1EB]">
      <h1 className="text-3xl font-semibold">Carrinho</h1>
      <p className="mt-3 text-[#CFB28C]">Página provisória em construção.</p>
    </section>
  ),
})

const checkoutRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/checkout',
  component: () => (
    <section className="rounded-2xl border border-white/10 bg-[#241612] p-8 text-[#F5F1EB]">
      <h1 className="text-3xl font-semibold">Pagamento</h1>
      <p className="mt-3 text-[#CFB28C]">Página provisória em construção.</p>
    </section>
  ),
})

const orderConfirmationRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/orders/$orderId/confirmation',
  component: () => (
    <section className="rounded-2xl border border-white/10 bg-[#241612] p-8 text-[#F5F1EB]">
      <h1 className="text-3xl font-semibold">Confirmação de pedido</h1>
      <p className="mt-3 text-[#CFB28C]">Página provisória em construção.</p>
    </section>
  ),
})

const loginRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/login',
  component: () => (
    <section className="rounded-2xl border border-white/10 bg-[#241612] p-8 text-[#F5F1EB]">
      <h1 className="text-3xl font-semibold">Login</h1>
      <p className="mt-3 text-[#CFB28C]">Página provisória em construção.</p>
    </section>
  ),
})

const registerRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/register',
  component: () => (
    <section className="rounded-2xl border border-white/10 bg-[#241612] p-8 text-[#F5F1EB]">
      <h1 className="text-3xl font-semibold">Cadastro</h1>
      <p className="mt-3 text-[#CFB28C]">Página provisória em construção.</p>
    </section>
  ),
})

const profileRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/profile',
  component: () => (
    <section className="rounded-2xl border border-white/10 bg-[#241612] p-8 text-[#F5F1EB]">
      <h1 className="text-3xl font-semibold">Perfil do colecionador</h1>
      <p className="mt-3 text-[#CFB28C]">Página provisória em construção.</p>
    </section>
  ),
})

const walletsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/wallets',
  component: () => (
    <section className="rounded-2xl border border-white/10 bg-[#241612] p-8 text-[#F5F1EB]">
      <h1 className="text-3xl font-semibold">Carteiras</h1>
      <p className="mt-3 text-[#CFB28C]">Página provisória em construção.</p>
    </section>
  ),
})

export const routeTree = rootRoute.addChildren([
  appLayoutRoute.addChildren([
    catalogRoute,
    nftDetailsRoute,
    cartRoute,
    checkoutRoute,
    orderConfirmationRoute,
    loginRoute,
    registerRoute,
    profileRoute,
    walletsRoute,
  ]),
])

export function createAppRouter(
  history: ReturnType<typeof createBrowserHistory> | ReturnType<typeof createMemoryHistory> = createBrowserHistory(),
) {
  return createRouter({
    routeTree,
    history,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })
}

export const router = createAppRouter()

export type RouterType = typeof router

declare module '@tanstack/react-router' {
  interface Register {
    router: RouterType
  }
}
