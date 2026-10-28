import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'

import { CartContext, type CartContextValue } from './cart-context'
import { getNftById } from '../catalog/api/nftApi'
import { readCartIds, writeCartIds } from './cart-storage'
import type { Nft } from '../../types/nft'

export function CartProvider({ children }: { children: ReactNode }) {
  const [itemIds, setItemIds] = useState(readCartIds)
  const queryClient = useQueryClient()
  const itemQueries = useQueries({
    queries: itemIds.map((id) => ({
      queryKey: ['nft', id],
      queryFn: () => getNftById(id),
      initialData: () => queryClient.getQueryData<Nft[]>(['nfts'])?.find((nft) => nft.id === id),
      initialDataUpdatedAt: () => queryClient.getQueryState(['nfts'])?.dataUpdatedAt,
    })),
  })

  useEffect(() => writeCartIds(itemIds), [itemIds])

  const addItem = useCallback((nft: Nft) => {
    queryClient.setQueryData(['nft', nft.id], nft)
    setItemIds((current) => current.includes(nft.id) ? current : [...current, nft.id])
  }, [queryClient])

  const removeItem = useCallback((id: string) => {
    setItemIds((current) => current.filter((itemId) => itemId !== id))
  }, [])

  const clearCart = useCallback(() => setItemIds([]), [])

  const items = useMemo(() => itemIds.map((id, index) => ({
    id,
    nft: itemQueries[index]?.data,
    isLoading: itemQueries[index]?.isLoading ?? false,
    hasError: itemQueries[index]?.isError ?? false,
  })), [itemIds, itemQueries])

  const totalByCurrency = useMemo(() => items.reduce((totals, item) => {
    if (item.nft) totals[item.nft.currency] += item.nft.price
    return totals
  }, { ETH: 0, USD: 0 }), [items])

  const value = useMemo<CartContextValue>(() => ({
    itemIds,
    items,
    totalByCurrency,
    isLoading: items.some((item) => item.isLoading),
    hasErrors: items.some((item) => item.hasError),
    addItem,
    removeItem,
    clearCart,
  }), [itemIds, items, totalByCurrency, addItem, removeItem, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
