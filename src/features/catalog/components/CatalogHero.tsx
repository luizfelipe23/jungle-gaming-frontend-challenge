import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'

import type { Nft } from '../../../types/nft'
import { formatDecimal } from '../../../lib/money'

type CatalogHeroProps = { featuredNft?: Nft }

export function CatalogHero({ featuredNft }: CatalogHeroProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false)
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative isolate grid min-h-[430px] overflow-hidden rounded-2xl border border-[#55321F] bg-[linear-gradient(115deg,#241612_0%,#1b110d_50%,#140d0a_100%)] md:grid-cols-[1fr_0.9fr]"
    >
      <div className="pointer-events-none absolute -left-24 -top-32 -z-10 h-80 w-80 rounded-full bg-[#D28A4C]/10 blur-3xl" />
      <div className="flex flex-col items-start justify-center gap-7 px-6 py-10 sm:px-10 md:px-12">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#CFB28C]">
          <span className="h-px w-7 bg-[#D28A4C]" /> Bem-vindo à Kurio
        </p>
        <div className="space-y-4">
          <h1 id="hero-title" className="max-w-xl text-3xl font-bold uppercase leading-tight text-[#F5F1EB] sm:text-4xl lg:text-[43px]">
            Own the future of digital art
          </h1>
          <p className="max-w-lg text-sm leading-7 text-[#CFB28C]">
            Descubra NFTs selecionados de criadores do mundo todo. Encontre sua próxima peça favorita.
          </p>
        </div>
        <a
          href="#catalogo"
          className="inline-flex min-h-11 items-center gap-3 rounded-md bg-[#D28A4C] px-6 font-bold text-[#140D0A] transition hover:bg-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1EB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140D0A]"
        >
          Explorar <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>

      <div className="relative flex min-h-[260px] items-center justify-center px-6 pb-8 md:min-h-full md:px-10 md:py-10">
        <div className="absolute right-10 top-5 h-48 w-48 rounded-full border border-[#D28A4C]/20 md:right-16 md:top-10 md:h-72 md:w-72" />
        <div className="absolute right-16 top-11 h-36 w-36 rounded-full border border-[#D28A4C]/10 md:right-24 md:top-20 md:h-56 md:w-56" />
        <div className="relative z-10 w-full max-w-[300px] rotate-2 rounded-xl border border-[#D28A4C]/30 bg-[#241612]/90 p-3 shadow-2xl shadow-black/50 md:ml-8">
          {featuredNft?.imageUrl && !imageUnavailable ? (
            <img
              src={featuredNft.imageUrl}
              alt={`Arte de ${featuredNft.name}`}
              className="aspect-[4/3] w-full rounded-lg object-cover"
              onError={() => setImageUnavailable(true)}
            />
          ) : (
            <div role="img" aria-label="Arte em destaque indisponível" className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[#140D0A] text-sm text-[#CFB28C]">
              Imagem indisponível
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-1 pt-3">
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
        <span className="absolute bottom-8 right-8 flex h-10 w-10 items-center justify-center rounded-full border border-[#D28A4C]/40 bg-[#140D0A] text-[#E89B55] md:bottom-12 md:right-14">
          <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
    </section>
  )
}
