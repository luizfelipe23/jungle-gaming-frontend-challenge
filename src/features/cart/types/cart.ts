import type { Nft } from '../../../types/nft'

export interface CartLineInput {
  nftId: string
  editionId: string | null
  quantity: number
}

export interface CartLine extends CartLineInput {
  itemId: string
}

export interface CartState {
  items: CartLine[]
  couponCode: string | null
  version: number
}

export interface CartQuoteItem extends CartLine {
  nft: Nft | null
  editionName: string | null
  unitPrice: string
  lineTotal: string
  availableQuantity: number
  maxPurchaseQuantity: number
  accepted: boolean
  issue?: 'unavailable' | 'quantity'
}

export interface CartCurrencyTotals {
  currency: Nft['currency']
  subtotal: string
  discount: string
  networkFee: string
  total: string
}

export interface CartQuote {
  quoteId: string
  cartVersion: number
  createdAt: string
  expiresAt: string
  canCheckout: boolean
  coupon: { code: string; discountBasisPoints: number } | null
  items: CartQuoteItem[]
  totals: CartCurrencyTotals[]
}

export interface CartApiError {
  code: 'INVALID_QUANTITY' | 'UNAVAILABLE' | 'COUPON_INVALID' | 'COUPON_EXPIRED' | 'NOT_FOUND' | 'MERGE_PARTIAL' | 'TEMPORARY_FAILURE'
  message: string
  acceptedQuantity?: number
}

export interface CartMergeResult {
  cart: CartState
  issues: Array<{ nftId: string; editionId: string | null; requestedQuantity: number; acceptedQuantity: number; reason: 'unavailable' | 'quantity' }>
}
