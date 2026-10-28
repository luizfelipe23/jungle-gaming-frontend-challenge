import type { Nft } from '../../../types/nft'
import { compareDecimals } from '../../../lib/money'

export type CatalogSort = 'newest' | 'price-asc' | 'price-desc' | 'name'
export type CatalogStatus = Nft['status'] | 'all'

export type CatalogSearch = {
  q?: string
  status?: CatalogStatus
  collection?: string
  rarity?: string
  currency?: Nft['currency'] | 'all'
  minPrice?: number
  maxPrice?: number
  sort?: CatalogSort
  page?: number
}

const statuses: CatalogStatus[] = ['all', 'available', 'reserved', 'sold']
const currencies: Array<Nft['currency'] | 'all'> = ['all', 'ETH', 'USD']
const sorts: CatalogSort[] = ['newest', 'price-asc', 'price-desc', 'name']

function numericParam(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

export function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const page = Math.floor(Number(search.page))

  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    status: statuses.includes(search.status as CatalogStatus)
      ? (search.status as CatalogStatus)
      : undefined,
    collection: typeof search.collection === 'string' && search.collection !== 'all'
      ? search.collection
      : undefined,
    rarity: typeof search.rarity === 'string' && search.rarity !== 'all' ? search.rarity : undefined,
    currency: currencies.includes(search.currency as Nft['currency'] | 'all')
      ? (search.currency as Nft['currency'] | 'all')
      : undefined,
    minPrice: numericParam(search.minPrice),
    maxPrice: numericParam(search.maxPrice),
    sort: sorts.includes(search.sort as CatalogSort) ? (search.sort as CatalogSort) : undefined,
    page: Number.isFinite(page) && page > 1 ? page : undefined,
  }
}

export function filterAndSortNfts(nfts: Nft[], search: CatalogSearch): Nft[] {
  const query = search.q?.trim().toLocaleLowerCase('pt-BR')
  const result = nfts.filter((nft) => {
    const matchesQuery = !query || [nft.name, nft.collection, nft.description, nft.rarity, nft.id]
      .some((value) => value.toLocaleLowerCase('pt-BR').includes(query))
    const matchesStatus = !search.status || search.status === 'all' || nft.status === search.status
    const matchesCollection = !search.collection || nft.collection === search.collection
    const matchesRarity = !search.rarity || nft.rarity === search.rarity
    const matchesCurrency = !search.currency || search.currency === 'all' || nft.currency === search.currency
    const matchesMinPrice = search.minPrice === undefined || compareDecimals(nft.price, String(search.minPrice)) >= 0
    const matchesMaxPrice = search.maxPrice === undefined || compareDecimals(nft.price, String(search.maxPrice)) <= 0

    return matchesQuery && matchesStatus && matchesCollection && matchesRarity && matchesCurrency && matchesMinPrice && matchesMaxPrice
  })

  switch (search.sort ?? 'newest') {
    case 'price-asc':
      return result.sort((a, b) => compareDecimals(a.price, b.price))
    case 'price-desc':
      return result.sort((a, b) => compareDecimals(b.price, a.price))
    case 'name':
      return result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    case 'newest':
    default:
      return result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }
}
