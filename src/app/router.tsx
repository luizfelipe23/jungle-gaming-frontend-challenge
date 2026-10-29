import { createBrowserHistory, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter, lazyRouteComponent, Outlet, redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

import { appQueryClient } from './query-client'
import { AppLayout } from '../components/layout/AppLayout'
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
  component: lazyRouteComponent(() => import('../features/catalog/pages/CatalogPage'), 'CatalogPage'),
})

const nftDetailsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/nft/$nftId',
  component: lazyRouteComponent(() => import('../features/catalog/pages/NftDetailsPage'), 'NftDetailsPage'),
})

const cartRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/cart',
  component: lazyRouteComponent(() => import('../features/cart/pages/CartPage'), 'CartPage'),
})

const loginRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/login',
  validateSearch: validateLoginSearch,
  component: lazyRouteComponent(() => import('../features/auth/pages/LoginPage'), 'LoginPage'),
})

const registerRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/register',
  component: lazyRouteComponent(() => import('../features/auth/pages/RegisterPage'), 'RegisterPage'),
})

const checkoutRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/checkout',
  beforeLoad: requireSession,
  component: lazyRouteComponent(() => import('../features/checkout/pages/CheckoutPage'), 'CheckoutPage'),
})

const orderConfirmationRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/orders/$orderId/confirmation',
  beforeLoad: requireSession,
  component: lazyRouteComponent(() => import('../features/orders/pages/OrderConfirmationPage'), 'OrderConfirmationPage'),
})

const profileRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/profile',
  beforeLoad: requireSession,
  component: lazyRouteComponent(() => import('../features/profile/pages/ProfilePage'), 'ProfilePage'),
})
const walletsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/wallets',
  beforeLoad: requireSession,
  component: lazyRouteComponent(() => import('../features/wallets/pages/WalletsPage'), 'WalletsPage'),
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
