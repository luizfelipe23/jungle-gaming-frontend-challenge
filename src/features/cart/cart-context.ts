import { createContext } from 'react'

import type { Nft } from '../../types/nft'
import type { CartLine, CartLineInput, CartQuote, CartQuoteItem, CartState } from './types/cart'

export type CartCacheKey = readonly ['cart', string]

export interface CartContextValue {
  itemIds: string[]
  itemCount: number
  items: CartEntry[]
  cart?: CartState
  quote?: CartQuote
  isLoading: boolean
  isQuoteLoading: boolean
  isSaving: boolean
  hasErrors: boolean
  errorMessage: string | null
  notice: string | null
  addItem: (item: CartLineInput) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  applyCoupon: (code: string) => Promise<void>
  removeCoupon: () => Promise<void>
  refreshQuote: () => Promise<void>
  dismissNotice: () => void
}

export interface CartEntry extends CartLine {
  nft?: Nft
  quoteItem?: CartQuoteItem
}

export const CartContext = createContext<CartContextValue | null>(null)
