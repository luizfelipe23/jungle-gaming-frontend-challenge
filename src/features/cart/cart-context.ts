import { createContext } from 'react'

import type { Nft } from '../../types/nft'

export interface CartContextValue {
  itemIds: string[]
  items: CartEntry[]
  totalByCurrency: Record<Nft['currency'], number>
  isLoading: boolean
  hasErrors: boolean
  addItem: (nft: Nft) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

export interface CartEntry {
  id: string
  nft?: Nft
  isLoading: boolean
  hasError: boolean
}

export const CartContext = createContext<CartContextValue | null>(null)
