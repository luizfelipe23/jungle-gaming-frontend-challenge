import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { catalogRoute } from '../../../app/router'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import type { Nft } from '../../../types/nft'
import { useNfts } from '../hooks/useNfts'
import { CatalogFilterToggle, CatalogFilters } from '../components/CatalogFilters'
import { CatalogHero } from '../components/CatalogHero'
import { CatalogPagination } from '../components/CatalogPagination'
import { CatalogSearchInput } from '../components/CatalogSearchInput'
import { NftCard } from '../components/NftCard'
import { filterAndSortNfts, type CatalogSearch, type CatalogSort } from '../types/catalogSearch'
import { formatDecimal } from '../../../lib/money'
import { Link } from '@tanstack/react-router'

const pageSize = 6
const emptyNfts: Nft[] = []

export function CatalogPage() {
  const search = catalogRoute.useSearch()
  const navigate = catalogRoute.useNavigate()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState(0)
  const { data: nfts, isLoading, isError, refetch } = useNfts()
  const allNfts = nfts ?? emptyNfts
  const visibleNfts = useMemo(() => filterAndSortNfts(allNfts, search), [allNfts, search])
  const pageCount = Math.max(1, Math.ceil(visibleNfts.length / pageSize))
  const requestedPage = search.page ?? 1
  const currentPage = Math.min(requestedPage, pageCount)
  const pagedNfts = visibleNfts.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const featuredNft = allNfts.find((nft) => nft.status === 'available') ?? allNfts[0]

  useEffect(() => {
    if (requestedPage > pageCount) {
      void navigate({ search: (previous) => ({ ...previous, page: pageCount > 1 ? pageCount : undefined }), replace: true })
    }
  }, [navigate, pageCount, requestedPage])

  function updateSearch(patch: Partial<CatalogSearch>) {
    void navigate({
      search: (previous) => ({
        ...previous,
        ...patch,
        page: Object.hasOwn(patch, 'page') ? patch.page : undefined,
      }),
      replace: true,
    })
  }

  function resetFilters() {
    void navigate({ search: {}, replace: true })
  }

  return (
    <>
    <div className="space-y-4 px-6 pb-32 pt-10 lg:hidden">
      <div className="flex w-full max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <CatalogSearchInput value={search.q ?? ''} onChange={(value) => updateSearch({ q: value || undefined })} />
        </div>
        <CatalogFilterToggle mobileOpen={mobileFiltersOpen} onToggle={() => setMobileFiltersOpen((open) => !open)} />
      </div>
      <CatalogHero featuredNft={featuredNft} secondaryNft={allNfts.find((nft) => nft.id !== featuredNft?.id)} />

      <section id="catalogo" aria-labelledby="catalog-title" className="scroll-mt-28">
        <div className="mb-7 hidden flex-col gap-5 lg:mb-9 lg:flex lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E89B55]">Uma seleção para descobrir</p>
            <h2 id="catalog-title" className="mt-2 text-2xl font-bold text-[#F5F1EB] sm:text-3xl">NFTs em destaque</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-[#CFB28C] sm:text-sm">Explore obras digitais e encontre peças únicas de coleções independentes.</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <div id="colecoes" className="scroll-mt-28">
            <CatalogFilters nfts={allNfts} search={search} mobileOpen={mobileFiltersOpen} onChange={updateSearch} onReset={resetFilters} />
          </div>

          <div id="nft-list" className="min-w-0 scroll-mt-28">
            <div className="mb-3 flex flex-row items-center justify-between gap-2 border-0 pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Atalhos de disponibilidade">
                {['Todos os NFTs', 'Novos lançamentos', 'Em alta'].map((label, index) => {
                  const selected = activeMobileTab === index
                  return (
                    <button key={label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => { setActiveMobileTab(index); updateSearch(index === 2 ? { sort: 'price-desc', status: undefined } : { sort: 'newest', status: undefined }) }}
                      className={`shrink-0 border-b-2 px-0 py-2 pr-2 text-[12px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55] ${selected ? 'border-[#D28A4C] font-bold text-[#E89B55]' : 'border-transparent text-[#F5F1EB]'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <label className="hidden items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-[#CFB28C] lg:flex">
                Ordenar
                <select
                  aria-label="Ordenar NFTs"
                  value={search.sort ?? 'newest'}
                  onChange={(event) => updateSearch({ sort: event.currentTarget.value as CatalogSort })}
                  className="h-10 min-w-40 rounded-md border border-[#55321F] bg-[#241612] px-3 text-xs normal-case tracking-normal text-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]"
                >
                  <option value="newest">Mais recentes</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                  <option value="name">Nome A–Z</option>
                </select>
              </label>
            </div>

            {isError ? (
              <Card className="flex min-h-64 flex-col items-center justify-center gap-4 border-[#55321F] p-6 text-center">
                <AlertTriangle aria-hidden="true" className="h-8 w-8 text-[#E89B55]" />
                <div>
                  <h3 className="text-lg font-bold text-[#F5F1EB]">Não foi possível carregar os NFTs.</h3>
                  <p className="mt-2 text-xs leading-5 text-[#CFB28C]">Confira sua conexão e tente novamente.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>
              </Card>
            ) : isLoading ? (
              <div role="status" aria-label="Carregando NFTs" className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                {Array.from({ length: pageSize }, (_, index) => <Skeleton key={index} className="aspect-[0.73/1] rounded-xl" />)}
              </div>
            ) : pagedNfts.length ? (
              <>
                <p className="mb-4 hidden text-[10px] text-[#B39483] lg:block" aria-live="polite">
                  {visibleNfts.length} {visibleNfts.length === 1 ? 'obra encontrada' : 'obras encontradas'}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                  {pagedNfts.map((nft) => <NftCard key={nft.id} nft={nft} />)}
                </div>
                <CatalogPagination page={currentPage} pageCount={pageCount} onPageChange={(page) => updateSearch({ page })} />
              </>
            ) : (
              <Card className="flex min-h-64 flex-col items-center justify-center gap-3 border-[#55321F] p-6 text-center">
                <p className="text-lg font-bold text-[#F5F1EB]">Nenhum NFT encontrado</p>
                <p className="max-w-sm text-xs leading-5 text-[#CFB28C]">Tente mudar os termos da busca ou limpar os filtros para ver outras obras.</p>
                <Button type="button" variant="outline" onClick={resetFilters} className="mt-2 gap-2">
                  <RotateCcw aria-hidden="true" className="h-4 w-4" /> Limpar busca e filtros
                </Button>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
    <div className="hidden lg:-mt-8 lg:block">
      <section id="inicio" className="grid min-h-[450px] grid-cols-2 items-center gap-12">
        <div className="space-y-5 pl-9">
          <p className="text-sm font-semibold tracking-[0.12em] text-[#CFB28C]">Bem-vindo à Kurio</p>
          <h1 className="max-w-[560px] text-[40px] font-bold uppercase leading-[1.6]">Seja dono do futuro<br />da arte digital</h1>
          <p className="max-w-[520px] text-[13px] leading-6 text-[#CFB28C]">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
          <a href="#catalogo" className="inline-flex h-10 items-center rounded-md bg-[#D28A4C] px-6 text-sm font-bold text-[#140D0A]">EXPLORAR</a>
        </div>
        <div className="ml-auto h-[420px] w-[420px] overflow-hidden rounded-2xl bg-[#241612]">
          {featuredNft?.imageUrl && <img src={featuredNft.imageUrl} alt={featuredNft.name} className="h-full w-full object-cover" />}
        </div>
      </section>
      <section id="catalogo" className="mt-5 grid grid-cols-[260px_minmax(0,1fr)] gap-7 scroll-mt-24">
        <aside id="colecoes" className="space-y-6 self-start bg-[#241612] p-5">
          <h2 className="text-base font-bold">Coleções</h2>
          <ul className="space-y-3 text-sm text-[#CFB28C]">{Array.from(new Set(allNfts.map((nft) => nft.collection))).slice(0, 8).map((collection) => <li key={collection}><button type="button" onClick={() => updateSearch({ collection: search.collection === collection ? undefined : collection })} className={`flex w-full justify-between text-left ${search.collection === collection ? 'text-[#E89B55]' : ''}`}><span>{collection}</span><span>({allNfts.filter((nft) => nft.collection === collection).length})</span></button></li>)}</ul>
          <div><h3 className="mb-3 font-bold">Faixa de preço</h3><div className="h-1 rounded bg-[#D28A4C]" /><p className="mt-3 text-xs text-[#CFB28C]">Preço: 0,02 – 12,30 ETH</p><button type="button" onClick={resetFilters} className="mt-2 rounded bg-[#D28A4C] px-3 py-1.5 text-sm font-bold text-[#140D0A]">Aplicar</button></div>
          <div><h3 className="mb-3 font-bold">Rede</h3><ul className="space-y-3 text-sm text-[#CFB28C]"><li>Ethereum <span className="float-right">(119)</span></li><li>Polygon <span className="float-right">(78)</span></li><li>Solana <span className="float-right">(86)</span></li></ul></div>
          {featuredNft && <Link to="/nft/$nftId" params={{ nftId: featuredNft.id }} className="block bg-[#1b100d] p-3"><p className="mb-2 text-center font-bold text-[#E89B55]">NFT EM DESTAQUE</p><img src={featuredNft.imageUrl} alt={featuredNft.name} className="aspect-square w-full rounded-xl object-cover" /><p className="mt-2 text-center text-sm">OFERTA LIMITADA</p></Link>}
        </aside>
        <div className="min-w-0">
          <div className="mb-5 flex items-center justify-between border-b border-[#3F2319] pb-3"><div className="flex gap-5 text-sm"><button onClick={() => updateSearch({ status: undefined })} className="border-b-2 border-[#D28A4C] pb-2 text-[#E89B55]">Todos os NFTs</button><button onClick={() => updateSearch({ sort: 'newest' })}>Novos lançamentos</button><button onClick={() => updateSearch({ sort: 'price-desc' })}>Em alta</button></div><label className="text-sm">Ordenar por: <select aria-label="Ordenar por" value={search.sort ?? 'newest'} onChange={(e) => updateSearch({ sort: e.currentTarget.value as CatalogSort })} className="bg-transparent"><option value="newest">Listados recentemente</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></label></div>
          {isLoading ? <div className="grid grid-cols-3 gap-5">{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="aspect-[.8/1]" />)}</div> : <div className="grid grid-cols-3 gap-x-5 gap-y-9">{visibleNfts.slice(0, 9).map((nft) => <Link key={nft.id} to="/nft/$nftId" params={{ nftId: nft.id }} className="group block"><div className="bg-[#241612] p-2"><img src={nft.imageUrl} alt={nft.name} className="aspect-square w-full rounded-xl object-cover" /></div><p className="mt-2 truncate text-sm">{nft.name}</p><p className="text-base font-bold text-[#E89B55]">{formatDecimal(nft.price, nft.currency === 'ETH' ? 8 : 2)} {nft.currency}</p></Link>)}</div>}
          <div className="mt-8 flex justify-end gap-2">{Array.from({ length: Math.max(1, Math.ceil(visibleNfts.length / 9)) }, (_, i) => <button key={i} onClick={() => updateSearch({ page: i + 1 })} className="h-8 min-w-8 border border-[#55321F] px-2 text-xs">{i + 1}</button>)}</div>
        </div>
      </section>
      <section id="criadores" className="grid grid-cols-2 gap-5 pt-10">{allNfts.slice(0, 2).map((nft, i) => <Link key={nft.id} to="/nft/$nftId" params={{ nftId: nft.id }} className="grid grid-cols-2 items-center gap-5 bg-[#241612] p-4"><img src={nft.imageUrl} alt={nft.name} className="aspect-square rounded-xl object-cover" /><div><h2 className="text-lg font-bold">{i ? 'Arte digital selecionada e muito mais' : 'Lançamentos gênesis de edição limitada'}</h2><p className="mt-3 text-sm text-[#CFB28C]">Explore novos artistas, coleções verificadas e obras digitais.</p><span className="mt-3 inline-block rounded bg-[#D28A4C] px-4 py-2 text-sm font-bold text-[#140D0A]">Explorar →</span></div></Link>)}</section>
      <section id="aprenda" className="pt-8"><h2 className="text-center text-2xl font-bold">Diário da Cunhagem</h2><p className="mt-2 text-center text-sm text-[#CFB28C]">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p><div className="mt-7 grid grid-cols-4 gap-5">{allNfts.slice(0, 4).map((nft, i) => <article key={nft.id} className="overflow-hidden rounded-lg bg-[#241612]"><img src={nft.imageUrl} alt="" className="aspect-square w-full object-cover"/><div className="p-3"><p className="text-[10px] text-[#CFB28C]">15 de setembro&nbsp;&nbsp; | &nbsp;&nbsp;Leitura de 3 min</p><h3 className="mt-2 font-bold">{['Como funciona a propriedade de NFTs','10 artistas digitais para acompanhar','Raridade, atributos e procedência','Como proteger sua carteira'][i]}</h3><a href="#aprenda" className="mt-2 inline-block text-xs text-[#E89B55]">Ler mais →</a></div></article>)}</div></section>
    </div>
    </>
  )
}
