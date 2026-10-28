import { createBrowserHistory, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

import { appQueryClient } from './query-client'
import { AppLayout } from '../components/layout/AppLayout'
import { CatalogPage } from '../features/catalog/pages/CatalogPage'
import { NftDetailsPage } from '../features/catalog/pages/NftDetailsPage'
import { CartPage } from '../features/cart/pages/CartPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { sessionQueryOptions } from '../features/auth/hooks/useSession'
import { validateCatalogSearch } from '../features/catalog/types/catalogSearch'

interface RouterContext {
  queryClient: QueryClient
}

async function requireSession({ context, location }: { context: RouterContext; location: { href: string } }) {
  try {
    const user = await context.queryClient.fetchQuery({ ...sessionQueryOptions(context.queryClient), staleTime: 0 })
    if (user) return
  } catch {
    // A visitor can continue to the login page when session verification is unavailable.
  }

  throw redirect({ to: '/login', search: { returnTo: location.href, sessionError: true } })
}

function validateLoginSearch(search: Record<string, unknown>) {
  return {
    ...(typeof search.returnTo === 'string' ? { returnTo: search.returnTo } : {}),
    ...(search.registered === true || search.registered === 'true' ? { registered: true } : {}),
    ...(search.sessionError === true || search.sessionError === 'true' ? { sessionError: true } : {}),
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
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
  component: NftDetailsPage,
})

const cartRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/cart',
  component: CartPage,
})

const loginRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/login',
  validateSearch: validateLoginSearch,
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/register',
  component: RegisterPage,
})

const checkoutRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/checkout',
  beforeLoad: requireSession,
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
  beforeLoad: requireSession,
  component: () => (
    <section className="rounded-2xl border border-white/10 bg-[#241612] p-8 text-[#F5F1EB]">
      <h1 className="text-3xl font-semibold">Confirmação de pedido</h1>
      <p className="mt-3 text-[#CFB28C]">Página provisória em construção.</p>
    </section>
  ),
})

const profileRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/profile',
  beforeLoad: requireSession,
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
  beforeLoad: requireSession,
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
  queryClient: QueryClient = appQueryClient,
) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient },
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
