import type { Order, OrderStatus } from '../../features/orders/types/order'

export type CheckoutScenario = {
  orderResult: OrderStatus
  nextCreateFailure: 'transient' | 'timeout-after-create' | 'session-expired' | null
  walletConnection: 'success' | 'rejected'
  fees: Partial<Record<'ETH' | 'USD', string>>
  expireCoupon: boolean
  failOrderLookup: boolean
}

export const checkoutScenarioStorageKey = 'frontend-challenge:mock-checkout:scenario:v1'
export const walletConnectionsStoragePrefix = 'frontend-challenge:mock-wallet:connections:'
const ordersStoragePrefix = 'frontend-challenge:mock-orders:user:'

export const defaultCheckoutScenario: CheckoutScenario = {
  orderResult: 'confirmed',
  nextCreateFailure: null,
  walletConnection: 'success',
  fees: {},
  expireCoupon: false,
  failOrderLookup: false,
}

export function readCheckoutScenario(): CheckoutScenario {
  try {
    return { ...defaultCheckoutScenario, ...JSON.parse(window.localStorage.getItem(checkoutScenarioStorageKey) ?? '{}') }
  } catch {
    return { ...defaultCheckoutScenario }
  }
}

export function writeCheckoutScenario(scenario: CheckoutScenario) {
  window.localStorage.setItem(checkoutScenarioStorageKey, JSON.stringify(scenario))
}

export function readOrders(userId: string): Order[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(`${ordersStoragePrefix}${userId}:v1`) ?? '[]')
    return Array.isArray(value) ? value as Order[] : []
  } catch {
    return []
  }
}

export function saveOrders(userId: string, orders: Order[]) {
  window.localStorage.setItem(`${ordersStoragePrefix}${userId}:v1`, JSON.stringify(orders))
}

export function readWalletConnections(userId: string): Record<string, { connectionId: string; networkId: string }> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(`${walletConnectionsStoragePrefix}${userId}:v1`) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, { connectionId: string; networkId: string }> : {}
  } catch {
    return {}
  }
}

export function saveWalletConnections(userId: string, connections: Record<string, { connectionId: string; networkId: string }>) {
  window.localStorage.setItem(`${walletConnectionsStoragePrefix}${userId}:v1`, JSON.stringify(connections))
}
