import { http } from '../../../lib/api/http'
import type { CartLineInput, CartMergeResult, CartQuote, CartState } from '../types/cart'

export async function getCart() {
  return (await http.get<CartState>('/cart')).data
}

export async function addCartItem(item: CartLineInput) {
  return (await http.post<CartState>('/cart/items', item)).data
}

export async function updateCartItem(itemId: string, quantity: number) {
  return (await http.patch<CartState>(`/cart/items/${encodeURIComponent(itemId)}`, { quantity })).data
}

export async function removeCartItem(itemId: string) {
  return (await http.delete<CartState>(`/cart/items/${encodeURIComponent(itemId)}`)).data
}

export async function clearCartRequest() {
  return (await http.delete<CartState>('/cart')).data
}

export async function quoteCart() {
  return (await http.post<CartQuote>('/cart/quote')).data
}

export async function applyCartCoupon(code: string) {
  return (await http.post<CartState>('/cart/coupon', { code })).data
}

export async function removeCartCoupon() {
  return (await http.delete<CartState>('/cart/coupon')).data
}

export async function mergeGuestCart(items: CartLineInput[], mergeId: string) {
  return (await http.post<CartMergeResult>('/cart/merge', { items, mergeId })).data
}
