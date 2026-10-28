import type { CartCurrencyTotals, CartLine } from '../../cart/types/cart'
import type { CollectorDetails } from '../../checkout/types/checkout'

export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export interface OrderItemSnapshot extends CartLine {
  nftName: string
  collection: string
  imageUrl: string
  editionName: string | null
  currency: 'ETH' | 'USD'
  unitPrice: string
  lineTotal: string
}

export interface Order {
  id: string
  userId: string
  idempotencyKey: string
  requestFingerprint: string
  status: OrderStatus
  version: number
  createdAt: string
  updatedAt: string
  collector: CollectorDetails
  wallet: { id: string; name: string; address: string; networkId: string; networkName: string }
  cartVersion: number
  items: OrderItemSnapshot[]
  totals: CartCurrencyTotals[]
  transactionReference: string | null
}
