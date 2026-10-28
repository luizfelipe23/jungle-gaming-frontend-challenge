import { isAxiosError } from 'axios'
import { ArrowLeft, ImageOff, ShoppingBag, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { useCart } from '../../cart/useCart'
import { useNft } from '../hooks/useNfts'
import type { Nft } from '../../../types/nft'

const statusLabels: Record<Nft['status'], string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  sold: 'Vendido',
}

function formatPrice(nft: Nft) {
  return `${nft.price.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${nft.currency}`
}

export function NftDetailsPage() {
  const { nftId } = useParams({ from: '/app/nft/$nftId' })
  const { data: nft, isLoading, isError, error, refetch } = useNft(nftId)
  const { itemIds, addItem } = useCart()
  const [imageUnavailableFor, setImageUnavailableFor] = useState<string | null>(null)

  if (isLoading) {
    return <div role="status" aria-label="Carregando detalhes do NFT" className="grid gap-8 lg:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-5 py-4"><Skeleton className="h-7 w-1/3" /><Skeleton className="h-12 w-3/4" /><Skeleton className="h-28 w-full" /><Skeleton className="h-12 w-1/2" /></div>
    </div>
  }

  if (isError || !nft) {
    const notFound = isAxiosError(error) && error.response?.status === 404
    return <Card className="mx-auto flex min-h-72 max-w-2xl flex-col items-center justify-center gap-4 border-[#55321F] p-8 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E89B55]">{notFound ? 'Obra não encontrada' : 'Não foi possível carregar'}</p>
      <h1 className="text-2xl font-bold text-[#F5F1EB]">{notFound ? 'Este NFT não existe.' : 'Ocorreu um erro ao carregar este NFT.'}</h1>
      <p className="max-w-md text-sm leading-6 text-[#CFB28C]">{notFound ? 'Confira o endereço ou volte ao catálogo para explorar outras obras.' : 'Verifique sua conexão e tente carregar as informações novamente.'}</p>
      {!notFound && <Button type="button" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>}
      <Link to="/" className="inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm text-[#E89B55] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Voltar ao catálogo</Link>
    </Card>
  }

  const alreadyInCart = itemIds.includes(nft.id)
  const canAddToCart = nft.status === 'available'

  return <article className="mx-auto max-w-[1120px]">
    <Link to="/" className="mb-6 inline-flex min-h-10 items-center gap-2 text-xs text-[#CFB28C] transition hover:text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Voltar ao catálogo</Link>

    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-12">
      <div className="overflow-hidden rounded-2xl border border-[#55321F] bg-[#241612]">
        <div className="relative aspect-square bg-[#100a08]">
          {nft.imageUrl && imageUnavailableFor !== nft.id ? <img src={nft.imageUrl} alt={`Arte de ${nft.name}`} onError={() => setImageUnavailableFor(nft.id)} className="h-full w-full object-cover" /> : <div role="img" aria-label={`Imagem de ${nft.name} indisponível`} className="flex h-full flex-col items-center justify-center gap-3 text-[#CFB28C]"><ImageOff aria-hidden="true" className="h-10 w-10" /><span className="text-xs uppercase tracking-[0.16em]">Imagem indisponível</span></div>}
          <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-[#140D0A]/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E89B55]">{nft.rarity}</span>
        </div>
      </div>

      <div className="space-y-6 lg:py-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#CFB28C]">
            <span>{nft.collection}</span><span aria-hidden="true" className="text-[#55321F]">/</span><span className={nft.status === 'available' ? 'text-[#E89B55]' : 'text-[#CFB28C]'}>{statusLabels[nft.status]}</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight text-[#F5F1EB] sm:text-4xl">{nft.name}</h1>
          {nft.tokenId && <p className="text-xs text-[#B39483]">Token #{nft.tokenId}</p>}
        </div>

        {nft.creator && <div className="flex items-center gap-3 rounded-xl border border-[#3F2319] bg-[#1b100d] p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D28A4C]/15 text-[#E89B55]"><Sparkles aria-hidden="true" className="h-4 w-4" /></div>
          <div><p className="text-[9px] uppercase tracking-[0.15em] text-[#B39483]">Criado por</p><p className="mt-1 text-sm font-semibold text-[#F5F1EB]">{nft.creator.name}</p></div>
          <span className="ml-auto text-xs text-[#CFB28C]">{nft.creator.handle}</span>
        </div>}

        <p className="text-sm leading-7 text-[#CFB28C]">{nft.description}</p>

        <Card className="space-y-4 border-[#55321F] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[9px] uppercase tracking-[0.17em] text-[#B39483]">{canAddToCart ? 'Preço atual' : 'Último preço'}</p><p className="mt-2 text-2xl font-bold text-[#E89B55]">{formatPrice(nft)}</p></div>
            <span className="rounded-full border border-[#55321F] px-3 py-1 text-[10px] text-[#CFB28C]">{statusLabels[nft.status]}</span>
          </div>
          <Button type="button" size="lg" disabled={!canAddToCart} onClick={() => addItem(nft)} className="w-full gap-2 disabled:cursor-not-allowed disabled:bg-[#55321F] disabled:text-[#B39483]">
            <ShoppingBag aria-hidden="true" className="h-4 w-4" />{alreadyInCart ? 'Adicionado ao carrinho' : canAddToCart ? 'Adicionar ao carrinho' : nft.status === 'reserved' ? 'Obra reservada' : 'Obra vendida'}
          </Button>
          {alreadyInCart && <p role="status" className="text-center text-xs text-[#E89B55]">Este NFT já está no seu carrinho.</p>}
          {!canAddToCart && <p className="text-center text-[10px] text-[#B39483]">Esta obra não está disponível para compra no momento.</p>}
        </Card>

        {nft.attributes && nft.attributes.length > 0 && <section aria-labelledby="attributes-title" className="space-y-3">
          <h2 id="attributes-title" className="text-xs font-bold uppercase tracking-[0.15em] text-[#F5F1EB]">Características</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {nft.attributes.map((attribute) => <div key={attribute.traitType} className="rounded-lg border border-[#55321F] bg-[#1b100d] p-3"><dt className="text-[9px] uppercase tracking-[0.12em] text-[#B39483]">{attribute.traitType}</dt><dd className="mt-2 text-xs font-semibold text-[#E89B55]">{attribute.value}</dd></div>)}
          </dl>
        </section>}
        <p className="text-[10px] text-[#8F7162]">Adicionado em {new Date(nft.createdAt).toLocaleDateString('pt-BR')}</p>
      </div>
    </div>
  </article>
}
