import { isAxiosError } from 'axios'
import { ArrowLeft, ImageOff, ShoppingBag, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { useCart } from '../../cart/useCart'
import { useNft, useNfts } from '../hooks/useNfts'
import type { Nft } from '../../../types/nft'
import { formatDecimal } from '../../../lib/money'
import { FavoriteButton } from '../components/FavoriteButton'
import { Minus, Plus } from 'lucide-react'

const statusLabels: Record<Nft['status'], string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  sold: 'Vendido',
}

function formatPrice(nft: Nft) {
  return `${formatDecimal(nft.price, nft.currency === 'ETH' ? 8 : 2)} ${nft.currency}`
}

export function NftDetailsPage() {
  const { nftId } = useParams({ from: '/app/nft/$nftId' })
  const { data: nft, isLoading, isError, error, refetch } = useNft(nftId)
  const { data: catalogNfts = [] } = useNfts()
  const { items, addItem, isSaving, errorMessage } = useCart()
  const [imageUnavailableFor, setImageUnavailableFor] = useState<string | null>(null)
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [cartError, setCartError] = useState<string | null>(null)

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

  const selectedEdition = nft.editions?.find((edition) => edition.id === selectedEditionId) ?? nft.editions?.[0]
  const selectedVariantId = selectedEdition?.id ?? null
  const availableQuantity = selectedEdition?.availableQuantity ?? nft.availableQuantity
  const maximumQuantity = Math.min(availableQuantity, selectedEdition?.maxPurchaseQuantity ?? nft.maxPurchaseQuantity ?? availableQuantity)
  const alreadyInCart = items.some((item) => item.nftId === nft.id && item.editionId === selectedVariantId)
  const canAddToCart = nft.status === 'available' && availableQuantity > 0 && maximumQuantity > 0
  const displayedPrice = selectedEdition ? { ...nft, price: selectedEdition.price } : nft

  async function addSelectedEdition() {
    setCartError(null)
    setAdded(false)
    try {
      await addItem({ nftId, editionId: selectedVariantId, quantity })
      setAdded(true)
    } catch (error) {
      setCartError(errorMessage ?? (error instanceof Error ? error.message : 'Não foi possível adicionar este NFT.'))
    }
  }

  return <>
  <div className="lg:hidden">
    <header className="relative h-[506px] bg-gradient-to-br from-[#241612] to-[#2F1D15]">
      <Link to="/" aria-label="Voltar" className="absolute left-7 top-6 z-20 flex h-[35px] w-[35px] items-center justify-center rounded-full border border-[#3F2319] bg-[#2F1D15] text-[#B39463]"><ArrowLeft className="h-4 w-4"/></Link>
      <FavoriteButton nftId={nft.id} nftName={nft.name} compact className="absolute right-7 top-6 z-20 h-[35px] w-[35px] rounded-full border border-[#3F2319] bg-[#2F1D15] p-0 text-[#E89B55]" />
      <div className="absolute left-7 right-7 top-[66px] overflow-hidden rounded-[24px] bg-[#241612]"><img src={nft.imageUrl} alt={nft.name} onError={() => setImageUnavailableFor(nft.id)} className="aspect-square w-full object-cover"/></div>
      <div className="absolute bottom-[132px] left-1/2 flex -translate-x-1/2 gap-2 text-[8px] text-[#D28A4C]"><span>○</span><span>●</span><span>○</span><span>○</span></div>
    </header>
    <section className="relative z-10 -mt-[114px] min-h-[350px] rounded-t-[28px] bg-[#140D0A] px-6 pb-36 pt-7">
      <div className="flex items-center justify-between gap-3"><h1 className="text-[18px] font-bold">{nft.name}</h1><span className="rounded-full border border-[#D28A4C] px-2 py-1 text-xs text-[#F5F1EB]">★ 4.8 <span className="text-[#B39463]">(19)</span></span></div>
      <p className="mt-3 text-sm leading-6 text-[#CFB28C]">{nft.description}</p>
      <h2 className="mt-3 text-sm font-bold">Edição:</h2>
      <div className="mt-2 flex flex-wrap gap-2">{(nft.editions ?? []).map((edition) => <button key={edition.id} type="button" onClick={() => { setSelectedEditionId(edition.id); setQuantity(1); setAdded(false) }} className={`rounded-full border px-2 py-1 text-xs ${selectedVariantId === edition.id ? 'border-[#E89B55] text-[#E89B55]' : 'border-[#3F2319] text-[#B39463]'}`}>{edition.name}</button>)}<span className="rounded-full border border-[#3F2319] px-2 py-1 text-xs text-[#B39463]">ABERTA</span></div>
      {nft.tokenId && <p className="mt-3 text-sm text-[#B39463]">ID do token: #{nft.tokenId}</p>}
      <p className="mt-2 text-sm text-[#B39463]">Coleção: {nft.collection}</p>
      <p className="mt-2 text-sm text-[#B39463]">Atributos: {nft.attributes?.map((attribute) => attribute.value).join(', ') || nft.rarity}</p>
      {cartError && <p role="alert" className="mt-2 text-xs text-red-200">{cartError}</p>}{added && <p role="status" className="mt-2 text-xs text-[#E89B55]">Adicionado ao carrinho.</p>}
    </section>
    <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[30px] bg-[#1b100d] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_24px_rgba(10,6,4,.35)]">
      <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-[#CFB28C]">Qtd. <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="rounded-full bg-[#D28A4C] p-1 text-[#140D0A]"><Minus className="h-4 w-4"/></button><span className="w-4 text-center text-[#F5F1EB]">{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(maximumQuantity, quantity + 1))} className="rounded-full bg-[#D28A4C] p-1 text-[#140D0A]"><Plus className="h-4 w-4"/></button></div><strong className="text-lg text-[#E89B55]">{formatPrice(displayedPrice)}</strong></div>
      <div className="flex gap-3"><Button type="button" disabled={!canAddToCart || isSaving} onClick={() => void addSelectedEdition()} className="h-[60px] flex-1 rounded-full text-sm font-bold">{isSaving ? 'Adicionando…' : 'Comprar NFT'}</Button><Link to="/cart" aria-label="Abrir carrinho" className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#3F2319] bg-[#241612] text-[#D28A4C]"><ShoppingBag className="h-5 w-5"/></Link></div>
    </div>
  </div>
  <article className="mx-auto hidden max-w-[1200px] lg:block">
    <nav aria-label="Breadcrumb" className="mb-3 hidden text-sm font-bold lg:block"><Link to="/" className="hover:text-[#E89B55]">Início</Link><span className="px-2">/</span><Link to="/" className="hover:text-[#E89B55]">Mercado</Link></nav>
    <Link to="/" className="mb-6 inline-flex min-h-10 items-center gap-2 text-xs text-[#CFB28C] transition hover:text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55] lg:hidden"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Voltar ao catálogo</Link>

    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-12">
      <div className="overflow-hidden rounded-2xl border border-[#55321F] bg-[#241612]">
        <div className="relative aspect-square bg-[#100a08]">
          {nft.imageUrl && imageUnavailableFor !== nft.id ? <img src={nft.imageUrl} alt={`Arte de ${nft.name}`} onError={() => setImageUnavailableFor(nft.id)} fetchPriority="high" className="h-full w-full object-cover" /> : <div role="img" aria-label={`Imagem de ${nft.name} indisponível`} className="flex h-full flex-col items-center justify-center gap-3 text-[#CFB28C]"><ImageOff aria-hidden="true" className="h-10 w-10" /><span className="text-xs uppercase tracking-[0.16em]">Imagem indisponível</span></div>}
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
            <div><p className="text-[9px] uppercase tracking-[0.17em] text-[#B39483]">{canAddToCart ? 'Preço atual' : 'Último preço'}</p><p className="mt-2 text-2xl font-bold text-[#E89B55]">{formatPrice(displayedPrice)}</p></div>
            <span className="rounded-full border border-[#55321F] px-3 py-1 text-[10px] text-[#CFB28C]">{statusLabels[nft.status]}</span>
          </div>
          {nft.editions && nft.editions.length > 0 && <label className="block text-xs font-semibold text-[#CFB28C]">Edição
            <select aria-label="Edição do NFT" value={selectedVariantId ?? ''} onChange={(event) => { setSelectedEditionId(event.currentTarget.value); setQuantity(1); setAdded(false) }} className="mt-2 h-10 w-full rounded-md border border-[#55321F] bg-[#140D0A] px-3 text-sm text-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]">
              {nft.editions.map((edition) => <option key={edition.id} value={edition.id} disabled={edition.availableQuantity === 0}>{edition.name} — {formatDecimal(edition.price, nft.currency === 'ETH' ? 8 : 2)} {nft.currency} ({edition.availableQuantity} disponíveis)</option>)}
            </select>
          </label>}
          {canAddToCart && <label className="block text-xs font-semibold text-[#CFB28C]">Quantidade
            <input aria-label="Quantidade do NFT" type="number" min={1} max={maximumQuantity} step={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(maximumQuantity, Number(event.currentTarget.value) || 1)))} className="mt-2 h-10 w-full rounded-md border border-[#55321F] bg-[#140D0A] px-3 text-sm text-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]" />
            <span className="mt-1 block text-[10px] text-[#B39483]">Até {maximumQuantity} unidade(s) disponíveis nesta edição.</span>
          </label>}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Button type="button" size="lg" disabled={!canAddToCart || isSaving} onClick={() => void addSelectedEdition()} className="w-full gap-2 disabled:cursor-not-allowed disabled:bg-[#55321F] disabled:text-[#B39483]">
            <ShoppingBag aria-hidden="true" className="h-4 w-4" />{isSaving ? 'Adicionando…' : added ? 'Adicionado ao carrinho' : alreadyInCart ? 'Adicionar mais ao carrinho' : canAddToCart ? 'Adicionar ao carrinho' : nft.status === 'reserved' ? 'Obra reservada' : nft.status === 'sold' ? 'Obra vendida' : 'Edição esgotada'}
          </Button>
          <FavoriteButton nftId={nft.id} nftName={nft.name} />
          </div>
          {cartError && <p role="alert" className="text-center text-xs text-red-200">{cartError}</p>}
          {added && <p role="status" className="text-center text-xs text-[#E89B55]">{quantity} unidade(s) adicionada(s) ao carrinho.</p>}
          {alreadyInCart && !added && <p role="status" className="text-center text-xs text-[#E89B55]">Esta edição já está no seu carrinho; uma nova adição será consolidada na quantidade.</p>}
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
    <section className="mt-16 hidden lg:block">
      <div className="border-b border-[#55321F] pb-3 text-[15px] font-bold text-[#E89B55]">Detalhes do NFT <span className="ml-8 text-[#F5F1EB]">Avaliações de colecionadores (19)</span></div>
      <div className="space-y-5 py-4 text-[13px] leading-6 text-[#CFB28C]"><p>{nft.name} é uma obra digital finalizada à mão da coleção {nft.collection}. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.</p><p>A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Direitos autorais de 5% nas vendas secundárias apoiam novos trabalhos.</p><p><strong className="text-[#F5F1EB]">Rede:</strong><br/>Cunhado com procedência imutável e metadados armazenados no IPFS.</p><p><strong className="text-[#F5F1EB]">Contrato:</strong><br/>Direitos autorais do criador: 5% nas vendas secundárias.</p></div>
      <h2 className="mt-16 border-b border-[#55321F] pb-3 text-[15px] font-bold text-[#E89B55]">Mais desta coleção</h2>
      <div className="mt-7 grid grid-cols-5 gap-5">{catalogNfts.filter((item) => item.id !== nft.id).slice(0, 5).map((item) => <Link key={item.id} to="/nft/$nftId" params={{ nftId: item.id }} className="block"><div className="bg-[#241612] p-2"><img src={item.imageUrl} alt={item.name} className="aspect-square w-full rounded-xl object-cover"/></div><p className="mt-2 truncate text-sm">{item.name}</p><p className="font-bold text-[#E89B55]">{formatDecimal(item.price, item.currency === 'ETH' ? 8 : 2)} {item.currency}</p></Link>)}</div>
      <div className="mt-3 flex justify-center gap-2 text-[#D28A4C]"><span>○</span><span>●</span><span>○</span></div>
    </section>
  </article>
  </>
}

