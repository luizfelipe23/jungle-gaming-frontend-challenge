import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { realtimeClient } from '../../lib/realtime/socket-client'
import { getNftById } from '../catalog/api/nftApi'
import type { RealtimeUpdateEvent } from '../../lib/realtime/types'
import type { Nft } from '../../types/nft'
import { useSession } from '../auth/hooks/useSession'
import { CartContext, type CartCacheKey, type CartContextValue } from './cart-context'
import { addCartItem, applyCartCoupon, clearCartRequest, getCart, mergeGuestCart, quoteCart, removeCartCoupon, removeCartItem, updateCartItem } from './api/cartApi'
import { clearGuestCart, readGuestCart } from './cart-storage'
import type { CartApiError, CartLineInput, CartQuote, CartState } from './types/cart'
import { keepNewestNft } from '../../lib/realtime/nft-version'

function getErrorMessage(error: unknown) {
  if (isAxiosError<CartApiError>(error)) return error.response?.data.message ?? 'Não foi possível atualizar o carrinho. Tente novamente.'
  return 'Não foi possível atualizar o carrinho. Verifique sua conexão e tente novamente.'
}

function optimisticCartMutationOptions<TVariables>(
  queryClient: ReturnType<typeof useQueryClient>,
  cartKey: CartCacheKey,
  update: (cart: CartState, variables: TVariables) => CartState,
  setError: (message: string | null) => void,
): UseMutationOptions<CartState, unknown, TVariables, CartState | undefined> {
  return {
    onMutate: async (variables) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: cartKey })
      const previous = queryClient.getQueryData<CartState>(cartKey)
      if (previous) queryClient.setQueryData(cartKey, update(previous, variables))
      return previous
    },
    onError: (error, _variables, previous) => {
      if (previous) queryClient.setQueryData(cartKey, previous)
      setError(getErrorMessage(error))
    },
    onSuccess: (cart) => {
      setError(null)
      queryClient.setQueryData(cartKey, cart)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cartQuote', cartKey[1]] })
    },
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const session = useSession()
  const ownerKey = session.user ? `user:${session.user.id}` : 'guest'
  const cartKey: CartCacheKey = ['cart', ownerKey]
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const mergingRef = useRef(new Set<string>())
  const lastVersionsRef = useRef(new Map<string, number>())
  const cartQuery = useQuery({
    queryKey: cartKey,
    queryFn: getCart,
    enabled: !session.isLoading,
    retry: false,
  })
  const cart = cartQuery.data ?? { items: [], couponCode: null, version: 0 }
  const realtimeContextRef = useRef({ ownerKey, nftIds: new Set<string>() })
  useEffect(() => {
    realtimeContextRef.current = { ownerKey, nftIds: new Set(cart.items.map((item) => item.nftId)) }
  }, [cart.items, ownerKey])
  const nftIds = useMemo(() => [...new Set(cart.items.map((line) => line.nftId))], [cart.items])
  const nftQueries = useQueries({
    queries: nftIds.map((nftId) => ({
      queryKey: ['nft', nftId],
      queryFn: () => getNftById(nftId),
    })),
  })
  const quoteQuery = useQuery<CartQuote>({
    queryKey: ['cartQuote', ownerKey, cart.version] as const,
    queryFn: quoteCart,
    enabled: !session.isLoading && !cartQuery.isError && cart.items.length > 0,
    retry: false,
  })
  const quote = quoteQuery.data

  useEffect(() => {
    if (!quote) return
    const delay = Math.max(0, Date.parse(quote.expiresAt) - Date.now())
    const timer = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ['cartQuote', ownerKey] })
    }, delay)
    return () => window.clearTimeout(timer)
  }, [ownerKey, queryClient, quote])

  const addMutation = useMutation({
    mutationFn: (item: CartLineInput) => addCartItem(item),
    ...optimisticCartMutationOptions(queryClient, cartKey, (current, item) => {
      const existing = current.items.find((line) => line.nftId === item.nftId && line.editionId === item.editionId)
      const items = existing
        ? current.items.map((line) => line.itemId === existing.itemId ? { ...line, quantity: line.quantity + item.quantity } : line)
        : [...current.items, { ...item, itemId: `${encodeURIComponent(item.nftId)}::${encodeURIComponent(item.editionId ?? 'default')}` }]
      return { ...current, items, version: current.version + 1 }
    }, setErrorMessage),
  })
  const quantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => updateCartItem(itemId, quantity),
    ...optimisticCartMutationOptions(queryClient, cartKey, (current, { itemId, quantity }) => ({
      ...current, version: current.version + 1,
      items: current.items.map((line) => line.itemId === itemId ? { ...line, quantity } : line),
    }), setErrorMessage),
  })
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    ...optimisticCartMutationOptions(queryClient, cartKey, (current, itemId) => ({
      ...current, version: current.version + 1, items: current.items.filter((line) => line.itemId !== itemId),
    }), setErrorMessage),
  })
  const clearMutation = useMutation({
    mutationFn: clearCartRequest,
    ...optimisticCartMutationOptions(queryClient, cartKey, (current) => ({ ...current, items: [], couponCode: null, version: current.version + 1 }), setErrorMessage),
  })
  const applyCouponMutation = useMutation<CartState, unknown, string, CartState | undefined>({
    mutationFn: applyCartCoupon,
    ...optimisticCartMutationOptions(queryClient, cartKey, (current, code) => ({ ...current, couponCode: code.trim().toUpperCase(), version: current.version + 1 }), setErrorMessage),
  })
  const removeCouponMutation = useMutation({
    mutationFn: removeCartCoupon,
    ...optimisticCartMutationOptions(queryClient, cartKey, (current) => ({ ...current, couponCode: null, version: current.version + 1 }), setErrorMessage),
  })

  useEffect(() => {
    if (session.isLoading || !session.user) return
    const guestCart = readGuestCart()
    if (!guestCart.items.length) return
    const mergeId = `${session.user.id}:${guestCart.version}:${guestCart.items.map((line) => `${line.nftId}:${line.editionId ?? ''}:${line.quantity}`).join('|')}`
    if (mergingRef.current.has(mergeId)) return
    mergingRef.current.add(mergeId)
    void mergeGuestCart(guestCart.items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity })), mergeId)
      .then((result) => {
        clearGuestCart()
        queryClient.setQueryData<CartState>(['cart', `user:${session.user!.id}`], result.cart)
        queryClient.setQueryData<CartState>(['cart', 'guest'], { items: [], couponCode: null, version: guestCart.version + 1 })
        if (result.issues.length) {
          const unavailable = result.issues.filter((issue) => issue.reason === 'unavailable').length
          const limited = result.issues.filter((issue) => issue.reason === 'quantity').length
          setNotice(`Carrinho mesclado com ajustes: ${unavailable} item(ns) indisponível(is) e ${limited} quantidade(s) limitada(s).`)
        } else setNotice('Os itens do seu carrinho de visitante foram mesclados à sua conta.')
      })
      .catch(() => {
        mergingRef.current.delete(mergeId)
        setErrorMessage('Não foi possível mesclar o carrinho agora. Os itens de visitante continuam salvos neste navegador.')
      })
  }, [queryClient, session.isLoading, session.user])

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    realtimeClient.setScope(session.user?.id ?? null)
    const unsubscribe = realtimeClient.onEvent<{ nft: Nft }>('nft.updated', (event: RealtimeUpdateEvent<{ nft: Nft }>) => {
      if (!event || event.type !== 'nft.updated' || typeof event.resourceId !== 'string' || !Number.isSafeInteger(event.version) || event.version < 1 || !event.payload?.nft || event.payload.nft.id !== event.resourceId) return
      const cachedNftVersion = Math.max(
        queryClient.getQueryData<Nft>(['nft', event.resourceId])?.version ?? 0,
        queryClient.getQueryData<Nft[]>(['nfts'])?.find((nft) => nft.id === event.resourceId)?.version ?? 0,
      )
      const previousVersion = Math.max(lastVersionsRef.current.get(event.resourceId) ?? 0, cachedNftVersion)
      if (event.version <= previousVersion) return
      lastVersionsRef.current.set(event.resourceId, event.version)
      const changedNft = event.payload.nft
      queryClient.setQueryData<Nft[]>(['nfts'], (previous) => previous?.map((nft) => nft.id === changedNft.id ? keepNewestNft(nft, changedNft) : nft))
      queryClient.setQueryData<Nft>(['nft', event.resourceId], (previous) => keepNewestNft(previous, changedNft))
      queryClient.invalidateQueries({ queryKey: ['nft', event.resourceId] })
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      if (realtimeContextRef.current.nftIds.has(event.resourceId)) {
        setNotice('O preço ou a disponibilidade de um NFT mudou. A cotação está sendo atualizada.')
        queryClient.invalidateQueries({ queryKey: ['cartQuote', realtimeContextRef.current.ownerKey] })
      }
    })
    const unsubscribeConnection = realtimeClient.onConnection(() => {
      void queryClient.invalidateQueries({ queryKey: ['nfts'] })
      void queryClient.invalidateQueries({ queryKey: ['nft'] })
      void queryClient.invalidateQueries({ queryKey: ['cartQuote'] })
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'private' && query.queryKey[2] === 'orders' })
    })
    return () => {
      unsubscribe()
      unsubscribeConnection()
    }
  }, [ownerKey, queryClient, session.isLoading])

  const addItem = useCallback(async (item: CartLineInput) => { await addMutation.mutateAsync(item) }, [addMutation])
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => { try { await quantityMutation.mutateAsync({ itemId, quantity }) } catch { /* Reported through context errorMessage. */ } }, [quantityMutation])
  const removeItem = useCallback(async (itemId: string) => { try { await removeMutation.mutateAsync(itemId) } catch { /* Reported through context errorMessage. */ } }, [removeMutation])
  const clearCart = useCallback(async () => { try { await clearMutation.mutateAsync() } catch { /* Reported through context errorMessage. */ } }, [clearMutation])
  const applyCoupon = useCallback(async (code: string) => { try { await applyCouponMutation.mutateAsync(code) } catch { /* Reported through context errorMessage. */ } }, [applyCouponMutation])
  const removeCoupon = useCallback(async () => { try { await removeCouponMutation.mutateAsync() } catch { /* Reported through context errorMessage. */ } }, [removeCouponMutation])
  const refreshQuote = useCallback(async () => { await quoteQuery.refetch() }, [quoteQuery])

  const quoteByLine = useMemo(() => new Map(quote?.items.map((item) => [item.itemId, item]) ?? []), [quote])
  const nftsById = useMemo(() => new Map(nftIds.map((nftId, index) => [nftId, nftQueries[index]?.data])), [nftIds, nftQueries])
  const items = useMemo(() => cart.items.map((line) => {
    const quoteItem = quoteByLine.get(line.itemId)
    const nft = quoteItem?.nft ?? nftsById.get(line.nftId)
    return { ...line, ...(nft ? { nft } : {}), ...(quoteItem ? { quoteItem } : {}) }
  }), [cart.items, nftsById, quoteByLine])
  const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0)
  const isSaving = addMutation.isPending || quantityMutation.isPending || removeMutation.isPending || clearMutation.isPending || applyCouponMutation.isPending || removeCouponMutation.isPending
  const value: CartContextValue = {
    itemIds: cart.items.map((item) => item.nftId),
    itemCount,
    items,
    cart: cartQuery.data,
    quote,
    isLoading: session.isLoading || cartQuery.isLoading,
    isQuoteLoading: quoteQuery.isFetching,
    isSaving,
    hasErrors: cartQuery.isError || quoteQuery.isError,
    errorMessage: errorMessage ?? (cartQuery.isError ? 'Não foi possível carregar seu carrinho. Tente novamente.' : quoteQuery.isError ? 'Não foi possível atualizar a cotação. Seus itens foram preservados.' : null),
    notice,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    refreshQuote,
    dismissNotice: () => setNotice(null),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
