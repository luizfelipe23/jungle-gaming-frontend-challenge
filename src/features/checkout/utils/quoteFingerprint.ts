import type { CartQuote } from '../../cart/types/cart'

export function quoteFingerprint(quote: CartQuote): string {
  return JSON.stringify({
    cartVersion: quote.cartVersion,
    canCheckout: quote.canCheckout,
    coupon: quote.coupon,
    items: quote.items.map(({ itemId, nft, editionName, unitPrice, lineTotal, quantity, availableQuantity, maxPurchaseQuantity, accepted, issue }) => ({
      itemId,
      nftId: nft?.id ?? null,
      currency: nft?.currency ?? null,
      editionName,
      unitPrice,
      lineTotal,
      quantity,
      availableQuantity,
      maxPurchaseQuantity,
      accepted,
      issue: issue ?? null,
    })),
    totals: quote.totals.map(({ currency, subtotal, discount, networkFee, total }) => ({ currency, subtotal, discount, networkFee, total })),
  })
}
