import { ImageOff, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../../components/ui/button'
import type { CartEntry } from '../cart-context'

type CartItemRowProps = {
  item: CartEntry
  onRemove: (id: string) => void
}

function formatPrice(price: number, currency: 'ETH' | 'USD') {
  return `${price.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${currency}`
}

export function CartItemRow({ item, onRemove }: CartItemRowProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const nft = item.nft

  return <li className="grid gap-4 border-b border-[#3F2319] py-5 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
    <div className="aspect-square w-20 overflow-hidden rounded-lg border border-[#55321F] bg-[#140D0A] sm:w-[88px]">
      {nft?.imageUrl && !imageUnavailable ? <img src={nft.imageUrl} alt={`Arte de ${nft.name}`} onError={() => setImageUnavailable(true)} className="h-full w-full object-cover" /> : <div role="img" aria-label={`Imagem de ${nft?.name ?? 'NFT indisponível'} indisponível`} className="flex h-full w-full items-center justify-center text-[#CFB28C]"><ImageOff aria-hidden="true" className="h-6 w-6" /></div>}
    </div>

    <div className="min-w-0 space-y-1">
      {nft ? <>
        <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[#CFB28C]">{nft.collection}</p>
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block truncate text-sm font-bold text-[#F5F1EB] hover:text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]">{nft.name}</Link>
        <p className="text-[10px] text-[#B39483]">{nft.status === 'available' ? 'Disponível' : nft.status === 'reserved' ? 'Reservado' : 'Vendido'}</p>
      </> : item.isLoading ? <p role="status" className="text-xs text-[#CFB28C]">Carregando NFT…</p> : <>
        <p className="text-sm font-semibold text-[#F5F1EB]">NFT indisponível</p>
        <p className="text-[10px] text-[#B39483]">{item.hasError ? 'Não foi possível carregar os dados desta obra.' : `Identificador ${item.id}`}</p>
      </>}
    </div>

    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
      <p className="text-sm font-bold text-[#E89B55]">{nft ? formatPrice(nft.price, nft.currency) : '—'}</p>
      <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(item.id)} aria-label={`Remover ${nft?.name ?? 'NFT indisponível'} do carrinho`} className="gap-2 text-[#CFB28C] hover:text-[#F5F1EB]">
        <Trash2 aria-hidden="true" className="h-4 w-4" /><span>Remover</span>
      </Button>
    </div>
  </li>
}
