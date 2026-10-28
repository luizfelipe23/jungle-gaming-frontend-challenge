import { createContext } from 'react'

import type { Nft } from '../../types/nft'

export interface CartContextValue {
  itemIds: string[]
  addItem: (nft: Nft) => void
}

export const CartContext = createContext<CartContextValue | null>(null)
