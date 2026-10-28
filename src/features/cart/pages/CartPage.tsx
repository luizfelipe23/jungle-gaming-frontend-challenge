import { ArrowRight, ArrowUpLeft, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { formatDecimal } from '../../../lib/money'
import { CartItemRow } from '../components/CartItemRow'
import { useCart } from '../useCart'

export function CartPage() {
  const { itemCount, items, cart, quote, isLoading, isQuoteLoading, isSaving, hasErrors, errorMessage, notice, updateQuantity, removeItem, clearCart, applyCoupon, removeCoupon, refreshQuote, dismissNotice } = useCart()
  const [couponCode, setCouponCode] = useState('')
  const isEmpty = itemCount === 0
  const totals = quote?.totals ?? []
  const checkoutDisabled = isEmpty || isLoading || isQuoteLoading || hasErrors || !quote?.canCheckout || isSaving

  function submitCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (couponCode.trim()) void applyCoupon(couponCode)
  }

  return <section className="mx-auto max-w-[1080px] space-y-7 sm:space-y-9" aria-labelledby="cart-title">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E89B55]">Sua seleção</p>
        <h1 id="cart-title" className="text-2xl font-bold text-[#F5F1EB] sm:text-3xl">Carrinho <span className="text-base font-normal text-[#B39483]">({itemCount})</span></h1>
        <p className="text-xs leading-6 text-[#CFB28C] sm:text-sm">Revise as obras antes de continuar.</p>
      </div>
      {!isEmpty && <Button type="button" variant="ghost" disabled={isSaving} onClick={() => void clearCart()} className="gap-2 text-xs text-[#CFB28C]"><Trash2 aria-hidden="true" className="h-4 w-4" />Limpar carrinho</Button>}
    </div>

    {notice && <p role="status" aria-live="polite" className="flex items-center justify-between gap-3 rounded-lg border border-[#D28A4C]/30 bg-[#241612] p-3 text-xs text-[#F5F1EB]">
      {notice}<button type="button" onClick={dismissNotice} className="shrink-0 text-[#E89B55] underline">Entendi</button>
    </p>}
    {errorMessage && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300/25 bg-red-950/25 p-3 text-xs text-red-100">
      <span>{errorMessage}</span>{hasErrors && <Button type="button" variant="outline" size="sm" onClick={() => void refreshQuote()} className="gap-2"><RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />Tentar novamente</Button>}
    </div>}

    {isLoading ? <div role="status" aria-label="Carregando carrinho" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-5 border-[#55321F] p-5"><div className="h-24 animate-pulse rounded bg-[#3F2319]" /><div className="h-24 animate-pulse rounded bg-[#3F2319]" /></Card>
      <Card className="h-64 animate-pulse border-[#55321F] bg-[#241612]" />
    </div> : isEmpty ? <Card className="flex min-h-80 flex-col items-center justify-center gap-4 border-[#55321F] p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D28A4C]/10 text-[#E89B55]"><ShoppingBag aria-hidden="true" className="h-6 w-6" /></div>
      <div className="space-y-2"><h2 className="text-lg font-bold text-[#F5F1EB]">Seu carrinho está vazio</h2><p className="max-w-sm text-xs leading-5 text-[#CFB28C]">Explore o catálogo e adicione uma obra para vê-la aqui.</p></div>
      <Link to="/" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#D28A4C] px-4 text-sm font-semibold text-[#140D0A] transition hover:bg-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1EB]"><ArrowUpLeft aria-hidden="true" className="h-4 w-4" />Continuar comprando</Link>
    </Card> : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <Card className="border-[#55321F] px-4 sm:px-6">
        {isQuoteLoading && <p role="status" className="border-b border-[#3F2319] py-3 text-xs text-[#CFB28C]">Atualizando a cotação…</p>}
        <ul aria-label="NFTs no carrinho" className="divide-y-0">
          {items.map((item) => <CartItemRow key={item.itemId} item={item} onRemove={(itemId) => void removeItem(itemId)} onQuantityChange={(itemId, quantity) => void updateQuantity(itemId, quantity)} isSaving={isSaving} isQuoteLoading={isQuoteLoading || hasErrors} />)}
        </ul>
      </Card>

      <Card className="space-y-5 border-[#55321F] p-5 sm:p-6">
        <h2 className="text-sm font-bold text-[#F5F1EB]">Resumo da cotação</h2>
        <form onSubmit={submitCoupon} className="space-y-2">
          <label htmlFor="cart-coupon" className="text-xs font-semibold text-[#CFB28C]">Cupom de desconto</label>
          {cart?.couponCode ? <div className="flex items-center justify-between gap-3 rounded-md border border-[#55321F] bg-[#140D0A] p-3 text-xs">
            <span className="text-[#F5F1EB]">{cart.couponCode}</span><Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={() => void removeCoupon()} className="h-8 px-2 text-[#E89B55]">Remover</Button>
          </div> : <div className="flex gap-2">
            <Input id="cart-coupon" value={couponCode} onChange={(event) => setCouponCode(event.currentTarget.value)} autoComplete="off" placeholder="Ex.: KURIO10" className="h-10 min-w-0 border-[#55321F] bg-[#140D0A] text-xs" />
            <Button type="submit" variant="outline" disabled={isSaving || !couponCode.trim()} className="shrink-0 px-3 text-xs">Aplicar</Button>
          </div>}
        </form>

        <div className="space-y-3 border-y border-[#3F2319] py-4 text-xs text-[#CFB28C]">
          {totals.filter((total) => total.subtotal !== '0').map((total) => <section key={total.currency} aria-label={`Resumo ${total.currency}`} className="space-y-2">
            <div className="flex justify-between gap-4"><span>Subtotal {total.currency}</span><span>{formatDecimal(total.subtotal, total.currency === 'ETH' ? 8 : 2)} {total.currency}</span></div>
            {total.discount !== '0' && <div className="flex justify-between gap-4 text-emerald-200"><span>Desconto</span><span>−{formatDecimal(total.discount, total.currency === 'ETH' ? 8 : 2)} {total.currency}</span></div>}
            <div className="flex justify-between gap-4"><span>Taxa de rede</span><span>{formatDecimal(total.networkFee, total.currency === 'ETH' ? 8 : 2)} {total.currency}</span></div>
            {!isQuoteLoading && !hasErrors && <div className="flex justify-between gap-4 border-t border-[#3F2319] pt-2 font-bold text-[#F5F1EB]"><span>Total</span><span>{formatDecimal(total.total, total.currency === 'ETH' ? 8 : 2)} {total.currency}</span></div>}
          </section>)}
          {!quote && <p className="text-[10px] leading-5">{hasErrors ? 'A cotação está indisponível. Atualize para tentar novamente.' : 'Calculando os valores atuais pela API…'}</p>}
          {quote && !quote.canCheckout && <p role="alert" className="text-[10px] leading-5 text-amber-200">Revise os itens indisponíveis ou com quantidade acima do estoque para continuar.</p>}
        </div>
        {quote?.coupon && <p className="text-[10px] text-emerald-200">Cupom {quote.coupon.code} aplicado ({quote.coupon.discountBasisPoints / 100}% de desconto).</p>}
        <p className="text-[9px] leading-4 text-[#B39483]">Cotação {quote?.quoteId ?? 'pendente'} · válida até {quote ? new Date(quote.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
        <Link to="/checkout" aria-disabled={checkoutDisabled} tabIndex={checkoutDisabled ? -1 : undefined} onClick={(event) => { if (checkoutDisabled) event.preventDefault() }} className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1EB] ${checkoutDisabled ? 'cursor-not-allowed bg-[#55321F] text-[#B39483]' : 'bg-[#D28A4C] text-[#140D0A] hover:bg-[#E89B55]'}`}>
          Prosseguir ao checkout<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Link to="/" className="block text-center text-xs text-[#CFB28C] transition hover:text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]">Continuar comprando</Link>
      </Card>
    </div>}
  </section>
}
