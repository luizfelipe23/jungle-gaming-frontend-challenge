const cartStorageKey = 'frontend-challenge:cart:guest:v1'

export function readCartIds(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const serializedCart = window.localStorage.getItem(cartStorageKey)
    if (!serializedCart) return []

    const storedCart: unknown = JSON.parse(serializedCart)
    if (!storedCart || typeof storedCart !== 'object' || !('version' in storedCart) || storedCart.version !== 1 || !('itemIds' in storedCart) || !Array.isArray(storedCart.itemIds)) {
      return []
    }

    const validIds = storedCart.itemIds
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim())
    return [...new Set(validIds)]
  } catch {
    return []
  }
}

export function writeCartIds(itemIds: string[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(cartStorageKey, JSON.stringify({ version: 1, itemIds }))
  } catch {
    // The in-memory cart remains usable when browser storage is unavailable.
  }
}
