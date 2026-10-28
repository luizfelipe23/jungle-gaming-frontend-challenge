import { http, HttpResponse } from 'msw'

import { addDecimals, multiplyDecimal, percentageOf, subtractDecimals } from '../../lib/money'
import { nftFixtures } from '../data/nfts'
import { guestCartStorageKey, normalizeCartState, userCartStoragePrefix, writeGuestCart } from '../../features/cart/cart-storage'
import type { CartApiError, CartLine, CartLineInput, CartMergeResult, CartQuote, CartQuoteItem, CartState } from '../../features/cart/types/cart'
import type { MockSessionRecord } from '../../features/auth/types/session'
import { mockSessionsStorageKey } from '../../features/auth/types/session'

const couponOffers = {
  KURIO10: { discountBasisPoints: 1_000, validUntil: '2099-12-31T23:59:59.000Z' },
  EXPIRED: { discountBasisPoints: 2_000, validUntil: '2020-01-01T00:00:00.000Z' },
} as const

function readArray<T>(key: string): T[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value as T[] : []
  } catch {
    return []
  }
}

function requestToken(request: Request) {
  const authorization = request.headers.get('Authorization')
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
}

function ownerId(request: Request): { id: string | null; invalidSession: boolean } {
  const token = requestToken(request)
  if (!token) return { id: null, invalidSession: false }
  const session = readArray<MockSessionRecord>(mockSessionsStorageKey).find((item) => item.token === token && item.expiresAt > Date.now())
  return { id: session?.userId ?? null, invalidSession: !session }
}

function cartKey(userId: string) {
  return `${userCartStoragePrefix}${userId}:v1`
}

function readUserCart(userId: string): CartState {
  try {
    return normalizeCartState(JSON.parse(window.localStorage.getItem(cartKey(userId)) ?? 'null'))
  } catch {
    return { items: [], couponCode: null, version: 0 }
  }
}

function saveUserCart(userId: string, cart: CartState): CartState {
  window.localStorage.setItem(cartKey(userId), JSON.stringify(cart))
  return cart
}

function readCart(request: Request): CartState {
  const owner = ownerId(request)
  if (owner.invalidSession) throw new Error('UNAUTHENTICATED')
  if (owner.id) return readUserCart(owner.id)
  try {
    const serialized = window.localStorage.getItem(guestCartStorageKey)
    const parsed: unknown = JSON.parse(serialized ?? 'null')
    const cart = normalizeCartState(parsed)
    if (parsed && typeof parsed === 'object' && 'itemIds' in parsed) {
      cart.items = cart.items.map((line) => {
        const nft = nftFixtures.find((item) => item.id === line.nftId)
        const editionId = line.editionId ?? nft?.editions?.[0]?.id ?? null
        return { ...line, editionId, itemId: encodeItemId(line.nftId, editionId) }
      })
      writeGuestCart(cart)
    }
    return cart
  } catch {
    return { items: [], couponCode: null, version: 0 }
  }
}

function saveCart(request: Request, state: CartState): CartState {
  const cart = { ...state, version: state.version + 1 }
  const owner = ownerId(request)
  if (owner.invalidSession) throw new Error('UNAUTHENTICATED')
  if (owner.id) saveUserCart(owner.id, cart)
  else writeGuestCart(cart)
  return cart
}

function authRequired() {
  return HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Entre novamente para continuar.' }, { status: 401 })
}

function getNft(nftId: string) {
  return nftFixtures.find((nft) => nft.id === nftId)
}

function getLimits(nftId: string, editionId: string | null) {
  const nft = getNft(nftId)
  if (!nft) return { nft: undefined, edition: undefined, availableQuantity: 0, maxPurchaseQuantity: 0 }
  const edition = editionId ? nft.editions?.find((entry) => entry.id === editionId) : undefined
  if (nft.editions?.length && !edition) return { nft, edition: undefined, availableQuantity: 0, maxPurchaseQuantity: 0 }
  const availableQuantity = nft.status === 'available' ? edition?.availableQuantity ?? nft.availableQuantity : 0
  const maxPurchaseQuantity = Math.min(availableQuantity, edition?.maxPurchaseQuantity ?? nft.maxPurchaseQuantity ?? availableQuantity)
  return { nft, edition, availableQuantity, maxPurchaseQuantity }
}

function failure(code: CartApiError['code'], message: string, status = 400, acceptedQuantity?: number) {
  return HttpResponse.json<CartApiError>({ code, message, ...(acceptedQuantity === undefined ? {} : { acceptedQuantity }) }, { status })
}

function lineIdentity(line: CartLineInput) {
  return `${line.nftId}\u0000${line.editionId ?? ''}`
}

function mergeLines(existingLines: CartLine[], incomingLines: CartLineInput[]) {
  const merged = new Map(existingLines.map((line) => [lineIdentity(line), { ...line }]))
  const issues: CartMergeResult['issues'] = []
  for (const incoming of incomingLines) {
    const identity = lineIdentity(incoming)
    const current = merged.get(identity)
    const requestedQuantity = (current?.quantity ?? 0) + incoming.quantity
    const limits = getLimits(incoming.nftId, incoming.editionId)
    const acceptedQuantity = Math.min(requestedQuantity, limits.maxPurchaseQuantity)
    if (acceptedQuantity < requestedQuantity) {
      issues.push({ nftId: incoming.nftId, editionId: incoming.editionId, requestedQuantity, acceptedQuantity, reason: acceptedQuantity === 0 ? 'unavailable' : 'quantity' })
    }
    if (acceptedQuantity > 0) {
      const itemId = current?.itemId ?? encodeItemId(incoming.nftId, incoming.editionId)
      merged.set(identity, { itemId, nftId: incoming.nftId, editionId: incoming.editionId, quantity: acceptedQuantity })
    } else merged.delete(identity)
  }
  return { items: [...merged.values()], issues }
}

function encodeItemId(nftId: string, editionId: string | null) {
  return `${encodeURIComponent(nftId)}::${encodeURIComponent(editionId ?? 'default')}`
}

function makeQuote(cart: CartState): CartQuote {
  const couponCode = cart.couponCode?.toUpperCase() as keyof typeof couponOffers | undefined
  const couponOffer = couponCode ? couponOffers[couponCode] : undefined
  const coupon = couponOffer && Date.parse(couponOffer.validUntil) > Date.now()
    ? { code: couponCode!, discountBasisPoints: couponOffer.discountBasisPoints }
    : null
  const items: CartQuoteItem[] = cart.items.map((line) => {
    const { nft, edition, availableQuantity, maxPurchaseQuantity } = getLimits(line.nftId, line.editionId)
    const accepted = Boolean(nft && nft.status === 'available' && line.quantity <= maxPurchaseQuantity)
    const unitPrice = edition?.price ?? nft?.price ?? '0'
    return {
      ...line,
      nft: nft ?? null,
      editionName: edition?.name ?? null,
      unitPrice,
      lineTotal: accepted ? multiplyDecimal(unitPrice, line.quantity) : '0',
      availableQuantity,
      maxPurchaseQuantity,
      accepted,
      ...(!accepted ? { issue: availableQuantity === 0 ? 'unavailable' as const : 'quantity' as const } : {}),
    }
  })
  const currencies: CartQuote['totals'] = (['ETH', 'USD'] as const).map((currency) => {
    const currencyItems = items.filter((item) => item.accepted && item.nft?.currency === currency)
    const subtotal = addDecimals(...currencyItems.map((item) => item.lineTotal))
    const fractionDigits = currency === 'ETH' ? 18 : 2
    const discount = coupon ? percentageOf(subtotal, coupon.discountBasisPoints, fractionDigits) : '0'
    const networkFee = currencyItems.length > 0 ? (currency === 'ETH' ? '0.005' : '0.50') : '0'
    const total = addDecimals(subtractDecimals(subtotal, discount), networkFee)
    return { currency, subtotal, discount, networkFee, total }
  })
  const createdAt = new Date().toISOString()
  return {
    quoteId: `quote-${cart.version}-${Date.now()}`,
    cartVersion: cart.version,
    createdAt,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    canCheckout: items.length > 0 && items.every((item) => item.accepted),
    coupon,
    items,
    totals: currencies,
  }
}

async function getOwnedCart(request: Request): Promise<CartState | Response> {
  try {
    return readCart(request)
  } catch {
    return authRequired()
  }
}

async function saveOwnedCart(request: Request, cart: CartState): Promise<CartState | Response> {
  try {
    return saveCart(request, cart)
  } catch {
    return authRequired()
  }
}

export const cartHandlers = [
  http.get('/api/cart', async ({ request }) => {
    const cart = await getOwnedCart(request)
    return cart instanceof Response ? cart : HttpResponse.json(cart)
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const body = await request.json().catch(() => null) as Partial<CartLineInput> | null
    const nftId = typeof body?.nftId === 'string' ? body.nftId : ''
    const editionId = typeof body?.editionId === 'string' ? body.editionId : null
    const quantity = body?.quantity
    const cart = await getOwnedCart(request)
    if (cart instanceof Response) return cart
    if (!Number.isSafeInteger(quantity) || (quantity ?? 0) < 1) return failure('INVALID_QUANTITY', 'Informe uma quantidade inteira maior que zero.')
    const limits = getLimits(nftId, editionId)
    if (!limits.nft || limits.nft.status !== 'available' || limits.maxPurchaseQuantity < 1) return failure('UNAVAILABLE', 'Esta edição não está disponível para compra.', 409)
    const current = cart.items.find((line) => line.nftId === nftId && line.editionId === editionId)
    const desiredQuantity = (current?.quantity ?? 0) + quantity!
    if (desiredQuantity > limits.maxPurchaseQuantity) return failure('INVALID_QUANTITY', `O limite para esta edição é ${limits.maxPurchaseQuantity}.`, 409, limits.maxPurchaseQuantity)
    const item = { itemId: current?.itemId ?? encodeItemId(nftId, editionId), nftId, editionId, quantity: desiredQuantity }
    const items = current ? cart.items.map((line) => line.itemId === item.itemId ? item : line) : [...cart.items, item]
    const saved = await saveOwnedCart(request, { ...cart, items })
    return saved instanceof Response ? saved : HttpResponse.json(saved, { status: 201 })
  }),

  http.patch('/api/cart/items/:itemId', async ({ request, params }) => {
    const itemId = decodeURIComponent(String(params.itemId))
    const body = await request.json().catch(() => null) as { quantity?: unknown } | null
    const quantity = body?.quantity
    const cart = await getOwnedCart(request)
    if (cart instanceof Response) return cart
    const line = cart.items.find((entry) => entry.itemId === itemId)
    if (!line) return failure('NOT_FOUND', 'Este item não está mais no carrinho.', 404)
    if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1) return failure('INVALID_QUANTITY', 'Informe uma quantidade inteira maior que zero.')
    const limits = getLimits(line.nftId, line.editionId)
    if (!limits.nft || limits.nft.status !== 'available' || limits.maxPurchaseQuantity < 1) return failure('UNAVAILABLE', 'Esta edição não está disponível para compra.', 409)
    if ((quantity as number) > limits.maxPurchaseQuantity) return failure('INVALID_QUANTITY', `O limite para esta edição é ${limits.maxPurchaseQuantity}.`, 409, limits.maxPurchaseQuantity)
    const items = cart.items.map((entry) => entry.itemId === itemId ? { ...entry, quantity: quantity as number } : entry)
    const saved = await saveOwnedCart(request, { ...cart, items })
    return saved instanceof Response ? saved : HttpResponse.json(saved)
  }),

  http.delete('/api/cart/items/:itemId', async ({ request, params }) => {
    const itemId = decodeURIComponent(String(params.itemId))
    const cart = await getOwnedCart(request)
    if (cart instanceof Response) return cart
    const saved = await saveOwnedCart(request, { ...cart, items: cart.items.filter((item) => item.itemId !== itemId) })
    return saved instanceof Response ? saved : HttpResponse.json(saved)
  }),

  http.delete('/api/cart', async ({ request }) => {
    const cart = await getOwnedCart(request)
    if (cart instanceof Response) return cart
    const saved = await saveOwnedCart(request, { ...cart, items: [], couponCode: null })
    return saved instanceof Response ? saved : HttpResponse.json(saved)
  }),

  http.post('/api/cart/coupon', async ({ request }) => {
    const body = await request.json().catch(() => null) as { code?: unknown } | null
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
    const offer = couponOffers[code as keyof typeof couponOffers]
    if (!offer) return failure('COUPON_INVALID', 'Cupom não encontrado. Confira o código e tente novamente.', 422)
    if (Date.parse(offer.validUntil) <= Date.now()) return failure('COUPON_EXPIRED', 'Este cupom expirou e não pode ser aplicado.', 422)
    const cart = await getOwnedCart(request)
    if (cart instanceof Response) return cart
    const saved = await saveOwnedCart(request, { ...cart, couponCode: code })
    return saved instanceof Response ? saved : HttpResponse.json(saved)
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    const cart = await getOwnedCart(request)
    if (cart instanceof Response) return cart
    const saved = await saveOwnedCart(request, { ...cart, couponCode: null })
    return saved instanceof Response ? saved : HttpResponse.json(saved)
  }),

  http.post('/api/cart/quote', async ({ request }) => {
    const cart = await getOwnedCart(request)
    if (cart instanceof Response) return cart
    return HttpResponse.json(makeQuote(cart))
  }),

  http.post('/api/cart/merge', async ({ request }) => {
    const owner = ownerId(request)
    if (!owner.id) return authRequired()
    const body = await request.json().catch(() => null) as { items?: unknown; mergeId?: unknown } | null
    const mergeId = typeof body?.mergeId === 'string' ? body.mergeId : ''
    const appliedKey = `frontend-challenge:mock-cart:merge-ids:${owner.id}:v1`
    const appliedMerges = readArray<string>(appliedKey)
    if (mergeId && appliedMerges.includes(mergeId)) return HttpResponse.json({ cart: readUserCart(owner.id), issues: [] } satisfies CartMergeResult)
    const incoming = Array.isArray(body?.items) ? body.items.filter((item): item is CartLineInput => {
      if (!item || typeof item !== 'object') return false
      const line = item as Partial<CartLineInput>
      return typeof line.nftId === 'string' && (line.editionId === null || typeof line.editionId === 'string') && Number.isSafeInteger(line.quantity) && (line.quantity ?? 0) > 0
    }) : []
    const cart = readUserCart(owner.id)
    const merged = mergeLines(cart.items, incoming)
    const saved = saveUserCart(owner.id, { ...cart, items: merged.items, version: cart.version + 1 })
    if (mergeId) window.localStorage.setItem(appliedKey, JSON.stringify([...appliedMerges.slice(-19), mergeId]))
    const result: CartMergeResult = { cart: saved, issues: merged.issues }
    return HttpResponse.json(result)
  }),
]
