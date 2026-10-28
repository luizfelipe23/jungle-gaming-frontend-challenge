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
import { filterAndSortNfts, type CatalogSearch, type CatalogSort, type CatalogStatus } from '../types/catalogSearch'

const pageSize = 6
const emptyNfts: Nft[] = []

const statusTabs: Array<{ label: string; value: CatalogStatus }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Disponíveis', value: 'available' },
  { label: 'Reservados', value: 'reserved' },
]

export function CatalogPage() {
  const search = catalogRoute.useSearch()
  const navigate = catalogRoute.useNavigate()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
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
    <div className="space-y-14 sm:space-y-16 lg:space-y-20">
      <div className="flex w-full max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <CatalogSearchInput value={search.q ?? ''} onChange={(value) => updateSearch({ q: value || undefined })} />
        </div>
        <CatalogFilterToggle mobileOpen={mobileFiltersOpen} onToggle={() => setMobileFiltersOpen((open) => !open)} />
      </div>
      <CatalogHero featuredNft={featuredNft} />

      <section id="catalogo" aria-labelledby="catalog-title" className="scroll-mt-28">
        <div className="mb-7 flex flex-col gap-5 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
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
            <div className="mb-5 flex flex-col gap-4 border-b border-[#3F2319] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Atalhos de disponibilidade">
                {statusTabs.map((tab) => {
                  const selected = (search.status ?? 'all') === tab.value
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateSearch({ status: tab.value === 'all' ? undefined : tab.value })}
                      className={`shrink-0 border-b-2 px-3 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55] ${selected ? 'border-[#D28A4C] font-bold text-[#E89B55]' : 'border-transparent text-[#CFB28C] hover:text-[#F5F1EB]'}`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              <label className="flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-[#CFB28C]">
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
                <p className="mb-4 text-[10px] text-[#B39483]" aria-live="polite">
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
  )
}
