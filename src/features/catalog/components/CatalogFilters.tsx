import { Filter, RotateCcw } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import type { Nft } from '../../../types/nft'
import type { CatalogSearch } from '../types/catalogSearch'

type CatalogFiltersProps = {
  nfts: Nft[]
  search: CatalogSearch
  mobileOpen: boolean
  onChange: (patch: Partial<CatalogSearch>) => void
  onReset: () => void
}

const fieldClassName = 'mt-2 h-10 w-full rounded-md border border-[#55321F] bg-[#140D0A] px-3 text-sm text-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]'

export function CatalogFilterToggle({ mobileOpen, onToggle }: { mobileOpen: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-[45px] w-[45px] shrink-0 rounded-[14px] border-0 bg-gradient-to-br from-[#D28A4C]/50 to-[#D28A4C] p-0 text-[#140D0A] lg:hidden"
      aria-expanded={mobileOpen}
      aria-controls="catalog-filter-panel"
      onClick={onToggle}
    >
      <Filter aria-hidden="true" className="h-4 w-4" />
      <span className="sr-only">Filtros</span>
    </Button>
  )
}

export function CatalogFilters({ nfts, search, mobileOpen, onChange, onReset }: CatalogFiltersProps) {
  const collections = [...new Set(nfts.map((nft) => nft.collection))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const rarities = [...new Set(nfts.map((nft) => nft.rarity))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return (
    <>
      <aside
        id="catalog-filter-panel"
        aria-label="Filtros do catálogo"
        className={`${mobileOpen ? 'block' : 'hidden'} rounded-xl border border-[#3F2319] bg-[#241612] p-5 lg:block`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#CFB28C]">Refine a busca</p>
            <h2 className="mt-1 text-lg font-bold text-[#F5F1EB]">Filtros</h2>
          </div>
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs text-[#E89B55] hover:text-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]" aria-label="Limpar filtros">
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Limpar
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-xs font-semibold text-[#CFB28C]">
            Disponibilidade
            <select aria-label="Status do NFT" className={fieldClassName} value={search.status ?? 'all'} onChange={(event) => onChange({ status: event.currentTarget.value as CatalogSearch['status'] })}>
              <option value="all">Todas</option>
              <option value="available">Disponíveis</option>
              <option value="reserved">Reservados</option>
              <option value="sold">Vendidos</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-[#CFB28C]">
            Coleção
            <select className={fieldClassName} value={search.collection ?? 'all'} onChange={(event) => onChange({ collection: event.currentTarget.value })}>
              <option value="all">Todas as coleções</option>
              {collections.map((collection) => <option key={collection} value={collection}>{collection}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold text-[#CFB28C]">
            Raridade
            <select className={fieldClassName} value={search.rarity ?? 'all'} onChange={(event) => onChange({ rarity: event.currentTarget.value })}>
              <option value="all">Todas</option>
              {rarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold text-[#CFB28C]">
            Moeda
            <select className={fieldClassName} value={search.currency ?? 'all'} onChange={(event) => onChange({ currency: event.currentTarget.value as CatalogSearch['currency'] })}>
              <option value="all">Todas</option>
              <option value="ETH">ETH</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <fieldset>
            <legend className="text-xs font-semibold text-[#CFB28C]">Faixa de preço</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[10px] uppercase tracking-wide text-[#B39483]">
                Mínimo
                <Input aria-label="Preço mínimo" type="number" min="0" step="0.01" value={search.minPrice ?? ''} onChange={(event) => onChange({ minPrice: event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value) })} className="mt-1 h-10 border-[#55321F] bg-[#140D0A] text-sm" />
              </label>
              <label className="text-[10px] uppercase tracking-wide text-[#B39483]">
                Máximo
                <Input aria-label="Preço máximo" type="number" min="0" step="0.01" value={search.maxPrice ?? ''} onChange={(event) => onChange({ maxPrice: event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value) })} className="mt-1 h-10 border-[#55321F] bg-[#140D0A] text-sm" />
              </label>
            </div>
          </fieldset>
        </div>
      </aside>
    </>
  )
}
