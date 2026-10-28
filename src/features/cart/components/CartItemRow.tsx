import { ImageOff, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../../components/ui/button'
import { formatDecimal } from '../../../lib/money'
import type { CartEntry } from '../cart-context'

type CartItemRowProps = {
  item: CartEntry
  onRemove: (itemId: string) => void
  onQuantityChange: (itemId: string, quantity: number) => void
  isSaving: boolean
  isQuoteLoading: boolean
}

export function CartItemRow({ item, onRemove, onQuantityChange, isSaving, isQuoteLoading }: CartItemRowProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const nft = item.nft
  const quoteItem = item.quoteItem
  const edition = nft?.editions?.find((entry) => entry.id === item.editionId)
  const maximum = quoteItem?.maxPurchaseQuantity ?? edition?.maxPurchaseQuantity ?? edition?.availableQuantity ?? nft?.maxPurchaseQuantity ?? nft?.availableQuantity ?? 0
  const canChangeQuantity = Boolean(nft && nft.status === 'available' && maximum > 0)

  return <li className="grid gap-4 border-b border-[#3F2319] py-5 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
    <div className="aspect-square w-20 overflow-hidden rounded-lg border border-[#55321F] bg-[#140D0A] sm:w-[88px]">
      {nft?.imageUrl && !imageUnavailable ? <img src={nft.imageUrl} alt={`Arte de ${nft.name}`} onError={() => setImageUnavailable(true)} className="h-full w-full object-cover" /> : <div role="img" aria-label={`Imagem de ${nft?.name ?? 'NFT indisponível'} indisponível`} className="flex h-full w-full items-center justify-center text-[#CFB28C]"><ImageOff aria-hidden="true" className="h-6 w-6" /></div>}
    </div>

    <div className="min-w-0 space-y-1">
      {nft ? <>
        <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[#CFB28C]">{nft.collection}{quoteItem?.editionName ? ` · ${quoteItem.editionName}` : ''}</p>
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block truncate text-sm font-bold text-[#F5F1EB] hover:text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]">{nft.name}</Link>
        {quoteItem && !quoteItem.accepted ? <p role="alert" className="text-[10px] text-amber-200">{quoteItem.issue === 'unavailable' ? 'Indisponível no momento' : 'Quantidade acima do estoque atual'}</p> : quoteItem ? <p className="text-[10px] text-[#B39483]">{quoteItem.availableQuantity} disponíveis · limite de {quoteItem.maxPurchaseQuantity} por pedido</p> : <p className="text-[10px] text-[#B39483]">Validando preço e disponibilidade pela API…</p>}
      </> : <>
        <p className="text-sm font-semibold text-[#F5F1EB]">NFT indisponível</p>
        <p className="text-[10px] text-[#B39483]">O item não foi encontrado na API atual.</p>
      </>}
    </div>

    <div className="flex flex-col gap-3 sm:items-end">
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <p className="text-sm font-bold text-[#E89B55]" aria-label={isQuoteLoading ? 'Atualizando preço cotado' : undefined}>
          {isQuoteLoading ? 'Atualizando…' : quoteItem?.accepted ? `${formatDecimal(quoteItem.unitPrice, nft?.currency === 'ETH' ? 8 : 2)} ${nft?.currency}` : 'Sem cotação'}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(item.itemId)} disabled={isSaving} aria-label={`Remover ${nft?.name ?? 'NFT indisponível'} do carrinho`} className="gap-2 text-[#CFB28C] hover:text-[#F5F1EB]">
          <Trash2 aria-hidden="true" className="h-4 w-4" /><span>Remover</span>
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="text-[10px] text-[#B39483]">Quantidade</span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={!canChangeQuantity || isSaving || item.quantity <= 1} onClick={() => onQuantityChange(item.itemId, item.quantity - 1)} aria-label={`Diminuir quantidade de ${nft?.name ?? 'NFT'}`} className="h-8 w-8 px-0"><Minus aria-hidden="true" className="h-3 w-3" /></Button>
          <output aria-label={`Quantidade de ${nft?.name ?? 'NFT'}`} className="min-w-7 text-center text-sm font-semibold text-[#F5F1EB]">{item.quantity}</output>
          <Button type="button" variant="outline" disabled={!canChangeQuantity || isSaving || item.quantity >= maximum} onClick={() => onQuantityChange(item.itemId, item.quantity + 1)} aria-label={`Aumentar quantidade de ${nft?.name ?? 'NFT'}`} className="h-8 w-8 px-0"><Plus aria-hidden="true" className="h-3 w-3" /></Button>
        </div>
      </div>
      {quoteItem?.accepted && !isQuoteLoading && <p className="text-[10px] text-[#CFB28C]">Subtotal: {formatDecimal(quoteItem.lineTotal, nft?.currency === 'ETH' ? 8 : 2)} {nft?.currency}</p>}
    </div>
  </li>
}
