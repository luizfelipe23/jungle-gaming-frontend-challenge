import { ArrowRight, ArrowUpLeft, ShoppingBag } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Card } from '../../../components/ui/card'
import { useCart } from '../useCart'
import { CartItemRow } from '../components/CartItemRow'

function formatAmount(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function CartPage() {
  const { itemIds, items, totalByCurrency, isLoading, hasErrors, removeItem } = useCart()
  const isEmpty = itemIds.length === 0
  const checkoutDisabled = isEmpty || isLoading || hasErrors

  return <section className="mx-auto max-w-[1080px] space-y-7 sm:space-y-9" aria-labelledby="cart-title">
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E89B55]">Sua seleção</p>
      <h1 id="cart-title" className="text-2xl font-bold text-[#F5F1EB] sm:text-3xl">Carrinho <span className="text-base font-normal text-[#B39483]">({itemIds.length})</span></h1>
      <p className="text-xs leading-6 text-[#CFB28C] sm:text-sm">Revise as obras antes de continuar.</p>
    </div>

    {isEmpty ? <Card className="flex min-h-80 flex-col items-center justify-center gap-4 border-[#55321F] p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D28A4C]/10 text-[#E89B55]"><ShoppingBag aria-hidden="true" className="h-6 w-6" /></div>
      <div className="space-y-2"><h2 className="text-lg font-bold text-[#F5F1EB]">Seu carrinho está vazio</h2><p className="max-w-sm text-xs leading-5 text-[#CFB28C]">Explore o catálogo e adicione uma obra para vê-la aqui.</p></div>
      <Link to="/" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#D28A4C] px-4 text-sm font-semibold text-[#140D0A] transition hover:bg-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1EB]"><ArrowUpLeft aria-hidden="true" className="h-4 w-4" />Continuar comprando</Link>
    </Card> : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
      <Card className="border-[#55321F] px-4 sm:px-6">
        {isLoading && <p role="status" className="border-b border-[#3F2319] py-3 text-xs text-[#CFB28C]">Atualizando os dados das obras…</p>}
        <ul aria-label="NFTs no carrinho" className="divide-y-0">
          {items.map((item) => <CartItemRow key={item.id} item={item} onRemove={removeItem} />)}
        </ul>
      </Card>

      <Card className="space-y-5 border-[#55321F] p-5 sm:p-6">
        <h2 className="text-sm font-bold text-[#F5F1EB]">Resumo do pedido</h2>
        <div className="space-y-3 border-b border-[#3F2319] pb-4 text-xs text-[#CFB28C]">
          <div className="flex justify-between gap-4"><span>Obras</span><span>{itemIds.length}</span></div>
          {totalByCurrency.ETH > 0 && <div className="flex justify-between gap-4"><span>Subtotal ETH</span><span>{formatAmount(totalByCurrency.ETH)} ETH</span></div>}
          {totalByCurrency.USD > 0 && <div className="flex justify-between gap-4"><span>Subtotal USD</span><span>{formatAmount(totalByCurrency.USD)} USD</span></div>}
          {items.some((item) => !item.nft && !item.isLoading) && <p className="text-[10px] leading-5 text-[#B39483]">Itens sem preço carregado não entram no subtotal.</p>}
        </div>
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-[0.16em] text-[#B39483]">Total por moeda</p>
          {totalByCurrency.ETH > 0 && <p className="text-lg font-bold text-[#E89B55]">{formatAmount(totalByCurrency.ETH)} ETH</p>}
          {totalByCurrency.USD > 0 && <p className="text-lg font-bold text-[#E89B55]">{formatAmount(totalByCurrency.USD)} USD</p>}
          {isLoading && <p className="text-xs text-[#CFB28C]">Calculando…</p>}
          {!isLoading && totalByCurrency.ETH === 0 && totalByCurrency.USD === 0 && <p className="text-sm font-semibold text-[#E89B55]">—</p>}
        </div>
        {hasErrors && <p role="alert" className="text-[10px] leading-5 text-[#CFB28C]">Remova os itens cujos dados não puderam ser carregados antes de prosseguir.</p>}
        <Link to="/checkout" aria-disabled={checkoutDisabled} tabIndex={checkoutDisabled ? -1 : undefined} onClick={(event) => { if (checkoutDisabled) event.preventDefault() }} className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1EB] ${checkoutDisabled ? 'cursor-not-allowed bg-[#55321F] text-[#B39483]' : 'bg-[#D28A4C] text-[#140D0A] hover:bg-[#E89B55]'}`}>
          Prosseguir ao checkout<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Link to="/" className="block text-center text-xs text-[#CFB28C] transition hover:text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]">Continuar comprando</Link>
      </Card>
    </div>}

  </section>
}
