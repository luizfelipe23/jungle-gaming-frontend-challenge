import { useMemo, useState, type ReactNode } from 'react'

import { CartContext, type CartContextValue } from './cart-context'

export function CartProvider({ children }: { children: ReactNode }) {
  const [itemIds, setItemIds] = useState<string[]>([])
  const value = useMemo<CartContextValue>(() => ({
    itemIds,
    addItem: (nft) => setItemIds((current) => current.includes(nft.id) ? current : [...current, nft.id]),
  }), [itemIds])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
