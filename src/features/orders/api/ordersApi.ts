import { http } from '../../../lib/api/http'
import type { CreateOrderInput, Wallet, WalletConnection } from '../../checkout/types/checkout'
import type { Order } from '../types/order'

export async function getWallets() {
  return (await http.get<Wallet[]>('/wallets')).data
}

export async function getWalletConnection(walletId: string) {
  return (await http.get<WalletConnection>(`/wallets/${encodeURIComponent(walletId)}/connection`)).data
}

export async function connectWallet(walletId: string, networkId: string) {
  return (await http.post<WalletConnection>(`/wallets/${encodeURIComponent(walletId)}/connect`, { networkId })).data
}

export async function disconnectWallet(walletId: string) {
  return (await http.post<WalletConnection>(`/wallets/${encodeURIComponent(walletId)}/disconnect`)).data
}

export async function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  return (await http.post<Order>('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })).data
}

export async function getOrder(orderId: string) {
  return (await http.get<Order>(`/orders/${encodeURIComponent(orderId)}`)).data
}

export async function getOrderByAttempt(idempotencyKey: string) {
  return (await http.get<Order | null>(`/orders/attempt/${encodeURIComponent(idempotencyKey)}`)).data
}
