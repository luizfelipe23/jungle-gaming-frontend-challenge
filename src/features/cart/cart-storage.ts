import type { CartLine, CartState } from './types/cart'

export const guestCartStorageKey = 'frontend-challenge:cart:guest:v1'
export const userCartStoragePrefix = 'frontend-challenge:mock-cart:user:'
export const guestCartSchemaVersion = 2

export function createCartItemId(nftId: string, editionId: string | null) {
  return `${encodeURIComponent(nftId)}::${encodeURIComponent(editionId ?? 'default')}`
}

function normalizeLines(lines: unknown[]): CartLine[] {
  const unique = new Map<string, CartLine>()
  for (const value of lines) {
    if (!value || typeof value !== 'object') continue
    const line = value as Partial<CartLine>
    const nftId = typeof line.nftId === 'string' ? line.nftId.trim() : ''
    const editionId = typeof line.editionId === 'string' && line.editionId ? line.editionId : null
    const quantity = line.quantity
    if (!nftId || !Number.isSafeInteger(quantity) || (quantity ?? 0) < 1) continue
    const itemId = createCartItemId(nftId, editionId)
    const existing = unique.get(itemId)
    unique.set(itemId, { itemId, nftId, editionId, quantity: (existing?.quantity ?? 0) + quantity! })
  }
  return [...unique.values()]
}

export function normalizeCartState(value: unknown): CartState {
  if (!value || typeof value !== 'object') return { items: [], couponCode: null, version: 0 }
  const stored = value as { version?: unknown; schemaVersion?: unknown; items?: unknown; itemIds?: unknown; couponCode?: unknown }
  if (stored.version === 1 && Array.isArray(stored.itemIds)) {
    const items = normalizeLines(stored.itemIds.map((nftId) => ({ nftId, editionId: null, quantity: 1 })))
    return { items, couponCode: null, version: 1 }
  }
  if ((stored.schemaVersion !== guestCartSchemaVersion && stored.itemIds !== undefined) || !Array.isArray(stored.items)) {
    return { items: [], couponCode: null, version: 0 }
  }
  return {
    items: normalizeLines(stored.items),
    couponCode: typeof stored.couponCode === 'string' ? stored.couponCode : null,
    version: Number.isSafeInteger(stored.version) ? Number(stored.version) : 0,
  }
}

export function readGuestCart(): CartState {
  if (typeof window === 'undefined') return { items: [], couponCode: null, version: 0 }
  try {
    const raw = window.localStorage.getItem(guestCartStorageKey)
    if (!raw) return { items: [], couponCode: null, version: 0 }
    const parsed: unknown = JSON.parse(raw)
    const cart = normalizeCartState(parsed)
    if (parsed && typeof parsed === 'object' && (parsed as { version?: unknown }).version === 1) {
      writeGuestCart(cart)
    }
    return cart
  } catch {
    return { items: [], couponCode: null, version: 0 }
  }
}

export function writeGuestCart(cart: CartState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(guestCartStorageKey, JSON.stringify({
      schemaVersion: guestCartSchemaVersion,
      items: cart.items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity })),
      couponCode: cart.couponCode,
      version: cart.version,
    }))
  } catch {
    // Keep the in-memory cart usable if browser storage is unavailable.
  }
}

export function clearGuestCart() {
  try {
    window.localStorage.removeItem(guestCartStorageKey)
  } catch {
    // The guest cache can be retried after storage becomes available.
  }
}

export function readCartIds(): string[] {
  return readGuestCart().items.map((item) => item.nftId)
}

export function writeCartIds(itemIds: string[]) {
  const items = normalizeLines(itemIds.map((nftId) => ({ nftId, editionId: null, quantity: 1 })))
  writeGuestCart({ items, couponCode: null, version: 1 })
}
