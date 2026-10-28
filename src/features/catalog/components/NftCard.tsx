import { ArrowUpRight, ImageOff } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Card } from '../../../components/ui/card'
import type { Nft } from '../../../types/nft'

const statusLabels: Record<Nft['status'], string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  sold: 'Vendido',
}

type NftCardProps = { nft: Nft }

export function NftCard({ nft }: NftCardProps) {
  const [imageUnavailable, setImageUnavailable] = useState(!nft.imageUrl)

  return (
    <Card data-testid="nft-card" className="group overflow-hidden rounded-xl border-[#3F2319] bg-[#241612] transition duration-300 hover:-translate-y-1 hover:border-[#D28A4C]/70 hover:shadow-xl hover:shadow-black/30">
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        aria-label={`Ver detalhes de ${nft.name}`}
        className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E89B55]"
      >
        <div className="relative aspect-[1.05/1] overflow-hidden bg-[#140D0A]">
          {!imageUnavailable && nft.imageUrl ? (
            <img
              src={nft.imageUrl}
              alt={`Arte de ${nft.name}`}
              loading="lazy"
              onError={() => setImageUnavailable(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div role="img" aria-label={`Imagem de ${nft.name} indisponível`} className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#CFB28C]">
              <ImageOff aria-hidden="true" className="h-8 w-8" />
              <span className="text-[10px] uppercase tracking-[0.16em]">Imagem indisponível</span>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#140D0A]/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E89B55]">
            {nft.rarity}
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-[#140D0A]/85 px-2.5 py-1 text-[10px] text-[#F5F1EB]">
            {statusLabels[nft.status]}
          </span>
        </div>

        <div className="space-y-4 p-3.5 sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-[#CFB28C]">{nft.collection}</p>
            <h3 className="mt-1 truncate text-sm font-bold text-[#F5F1EB] sm:text-base">{nft.name}</h3>
          </div>
          <div className="flex items-end justify-between gap-2 border-t border-[#3F2319] pt-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#B39483]">Preço atual</p>
              <p className="mt-1 text-sm font-bold text-[#E89B55] sm:text-base">
                {nft.price.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-[10px] text-[#CFB28C]">{nft.currency}</span>
              </p>
            </div>
            <span aria-hidden="true" className="mb-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#55321F] text-[#E89B55] transition group-hover:bg-[#D28A4C] group-hover:text-[#140D0A]">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    </Card>
  )
}
