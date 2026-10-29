import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'

import type { Nft } from '../../../types/nft'
import { formatDecimal } from '../../../lib/money'

type CatalogHeroProps = { featuredNft?: Nft; secondaryNft?: Nft }

export function CatalogHero({ featuredNft, secondaryNft }: CatalogHeroProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false)
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative grid h-[190px] grid-cols-1 items-center overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4a2a19] via-[#3b2418] to-[#241612] px-4 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] md:px-0"
    >
      <div className="relative z-10 flex max-w-[190px] flex-col items-start justify-center gap-2">
        <p className="text-[12px] font-medium leading-4 text-[#F5F1EB]">
          Bem-vindo à Kurio
        </p>
        <div className="space-y-1">
          <h1 id="hero-title" className="max-w-[190px] text-[18px] font-bold uppercase leading-[29px] text-[#F5F1EB]">
            Seja dono da cultura digital
          </h1>
          <p className="max-w-[190px] text-[12px] leading-[18px] text-[#CFB28C]">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
        </div>
        <a
          href="#catalogo"
          style={{ color: '#E89B55' }}
          className="inline-flex min-h-4 items-center gap-2 text-xs font-bold uppercase text-[#E89B55] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1EB]"
        >
          Explorar <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>

      <div className="absolute inset-y-0 right-3 flex w-[138px] items-start justify-center pt-2 md:relative md:inset-auto md:flex md:min-h-full md:w-auto md:items-center md:pt-0">
        <div className="relative z-10 w-[138px] overflow-visible md:ml-auto md:w-full md:max-w-[360px] md:overflow-hidden md:rounded-2xl md:bg-[#241612]">
          {featuredNft?.imageUrl && !imageUnavailable ? (
            <img
              src={featuredNft.imageUrl}
              alt={`Arte de ${featuredNft.name}`}
              className="aspect-square w-full rounded-2xl object-cover md:rounded-none"
              fetchPriority="high"
              onError={() => setImageUnavailable(true)}
            />
          ) : (
            <div role="img" aria-label="Arte em destaque indisponível" className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[#140D0A] text-sm text-[#CFB28C]">
              Imagem indisponível
            </div>
          )}
          <div className="hidden items-center justify-between gap-3 px-1 pt-3 md:flex">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#CFB28C]">NFT em destaque</p>
              <p className="mt-1 truncate text-sm font-semibold text-[#F5F1EB]">Novas obras toda semana</p>
            </div>
            {featuredNft && (
              <span className="shrink-0 text-sm font-semibold text-[#E89B55]">
                {formatDecimal(featuredNft.price, featuredNft.currency === 'ETH' ? 8 : 2)} {featuredNft.currency}
              </span>
            )}
          </div>
        </div>
        {secondaryNft?.imageUrl && <img src={secondaryNft.imageUrl} alt="" className="absolute -bottom-1 left-[14px] z-20 h-[58px] w-[58px] rounded-2xl border-2 border-[#2F1D15] object-cover md:hidden" />}
        <span className="absolute bottom-8 right-8 hidden h-10 w-10 items-center justify-center rounded-full border border-[#D28A4C]/40 bg-[#140D0A] text-[#E89B55] md:flex"><ArrowUpRight aria-hidden="true" className="h-5 w-5" /></span>
      </div>
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 text-[8px] text-[#D28A4C]"><span>●</span><span>●</span><span>●</span></div>
    </section>
  )
}
