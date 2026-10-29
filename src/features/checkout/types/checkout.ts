export interface WalletNetwork {
  id: string
  name: string
  currency: 'ETH' | 'USD'
}

export interface Wallet {
  id: string
  name: string
  address: string
  networks: WalletNetwork[]
  nickname?: string
  secondaryAddress?: string
  walletType?: 'software' | 'hardware'
  profileName?: string
  ensName?: string
  email?: string
  referralCode?: string
  isPrimary?: boolean
}

export type WalletConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'rejected'

export interface WalletConnection {
  status: Exclude<WalletConnectionStatus, 'connecting' | 'rejected'>
  connectionId: string | null
  walletId: string
  networkId: string
}

export interface CollectorDetails {
  name: string
  email: string
}

export interface CreateOrderInput {
  quoteRevision: string
  cartVersion: number
  walletId: string
  networkId: string
  connectionId: string
  collector: CollectorDetails
}

export interface CheckoutApiError {
  code:
    | 'UNAUTHENTICATED'
    | 'WALLET_NOT_FOUND'
    | 'WALLET_DISCONNECTED'
    | 'QUOTE_CHANGED'
    | 'QUOTE_INVALID'
    | 'COUPON_EXPIRED'
    | 'IDEMPOTENCY_CONFLICT'
    | 'ORDER_NOT_FOUND'
    | 'FORBIDDEN'
    | 'TEMPORARY_FAILURE'
    | 'VALIDATION_ERROR'
  message: string
  quote?: import('../../cart/types/cart').CartQuote
}
