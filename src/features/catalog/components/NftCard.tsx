import { ArrowUpRight, ImageOff } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Card } from '../../../components/ui/card'
import type { Nft } from '../../../types/nft'
import { formatDecimal } from '../../../lib/money'
import { FavoriteButton } from './FavoriteButton'

const statusLabels: Record<Nft['status'], string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  sold: 'Vendido',
}

type NftCardProps = { nft: Nft }

export function NftCard({ nft }: NftCardProps) {
  const [imageUnavailable, setImageUnavailable] = useState(!nft.imageUrl)

  return (
    <Card data-testid="nft-card" className="group relative even:mt-5 overflow-hidden rounded-none border-0 bg-transparent shadow-none transition duration-300 hover:-translate-y-1 lg:mt-0 lg:rounded-xl lg:border-[#3F2319] lg:bg-[#241612] lg:hover:border-[#D28A4C]/70 lg:hover:shadow-xl lg:hover:shadow-black/30">
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        aria-label={`Ver detalhes de ${nft.name}`}
        className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E89B55]"
      >
        <div className="relative aspect-[.9/1] overflow-hidden rounded-[18px] bg-[#241612] p-1 lg:aspect-square lg:rounded-none lg:bg-[#140D0A] lg:p-0">
          {!imageUnavailable && nft.imageUrl ? (
            <img
              src={nft.imageUrl}
              alt={`Arte de ${nft.name}`}
              loading="lazy"
              onError={() => setImageUnavailable(true)}
              className="h-full w-full rounded-[15px] object-cover transition duration-500 group-hover:scale-105 lg:rounded-none"
            />
          ) : (
            <div role="img" aria-label={`Imagem de ${nft.name} indisponível`} className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#CFB28C]">
              <ImageOff aria-hidden="true" className="h-8 w-8" />
              <span className="text-[10px] uppercase tracking-[0.16em]">Imagem indisponível</span>
            </div>
          )}
          <span className="absolute left-3 top-3 hidden rounded-full border border-white/10 bg-[#140D0A]/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E89B55] lg:inline-flex">
            {nft.rarity}
          </span>
          <span className="absolute bottom-3 left-3 hidden rounded-full bg-[#140D0A]/85 px-2.5 py-1 text-[10px] text-[#F5F1EB] lg:inline-flex">
            {statusLabels[nft.status]}
          </span>
        </div>

        <div className="space-y-0 px-2 pb-1 pt-2 lg:space-y-4 lg:p-3.5 xl:p-4">
          <div className="min-w-0">
            <p className="hidden truncate text-[10px] uppercase tracking-[0.16em] text-[#CFB28C] lg:block">{nft.collection}</p>
            <h3 className="truncate text-[13px] font-medium leading-5 text-[#F5F1EB] lg:mt-1 lg:text-sm lg:font-bold xl:text-base">{nft.name}</h3>
          </div>
          <div className="flex items-end justify-between gap-2 pt-0 lg:border-t lg:border-[#3F2319] lg:pt-3">
            <div>
              <p className="hidden text-[9px] uppercase tracking-[0.16em] text-[#B39483] lg:block">Preço atual</p>
              <p className="text-[15px] font-bold text-[#E89B55] lg:mt-1 lg:text-sm xl:text-base">
                {formatDecimal(nft.price, nft.currency === 'ETH' ? 8 : 2)} <span className="text-[10px] text-[#CFB28C]">{nft.currency}</span>
              </p>
            </div>
            <span aria-hidden="true" className="mb-0.5 hidden h-8 w-8 items-center justify-center rounded-full border border-[#55321F] text-[#E89B55] transition group-hover:bg-[#D28A4C] group-hover:text-[#140D0A] lg:inline-flex">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
      <FavoriteButton nftId={nft.id} nftName={nft.name} compact className="absolute right-3 top-3 z-10 h-9 w-9 border-white/20 bg-[#140D0A]/90 p-0" />
    </Card>
  )
}
