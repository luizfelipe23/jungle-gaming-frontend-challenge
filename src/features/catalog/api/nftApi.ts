import { http } from '../../../lib/api/http'
import type { Nft } from '../../../types/nft'

const diagnosticsEnabled = import.meta.env.DEV || import.meta.env.VITE_DIAGNOSTICS === 'true'
let catalogResultLogged = false

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNft(value: unknown): value is Nft {
  if (!isRecord(value)) return false
  const nft = value
  const validEdition = (edition: unknown) => isRecord(edition)
    && typeof edition.id === 'string'
    && typeof edition.name === 'string'
    && typeof edition.price === 'string'
    && /^\d+(\.\d+)?$/.test(edition.price)
    && Number.isSafeInteger(edition.availableQuantity)
    && Number(edition.availableQuantity) >= 0
    && (edition.maxPurchaseQuantity === undefined || (Number.isSafeInteger(edition.maxPurchaseQuantity) && Number(edition.maxPurchaseQuantity) >= 0))
  const validAttribute = (attribute: unknown) => isRecord(attribute)
    && typeof attribute.traitType === 'string'
    && typeof attribute.value === 'string'

  return typeof nft.id === 'string'
    && typeof nft.name === 'string'
    && typeof nft.description === 'string'
    && (nft.imageUrl === undefined || typeof nft.imageUrl === 'string')
    && typeof nft.price === 'string'
    && /^\d+(\.\d+)?$/.test(nft.price)
    && (nft.currency === 'ETH' || nft.currency === 'USD')
    && (nft.status === 'available' || nft.status === 'sold' || nft.status === 'reserved')
    && Number.isSafeInteger(nft.availableQuantity)
    && Number(nft.availableQuantity) >= 0
    && (nft.maxPurchaseQuantity === undefined || (Number.isSafeInteger(nft.maxPurchaseQuantity) && Number(nft.maxPurchaseQuantity) >= 0))
    && typeof nft.collection === 'string'
    && typeof nft.rarity === 'string'
    && typeof nft.createdAt === 'string'
    && (nft.version === undefined || (Number.isSafeInteger(nft.version) && Number(nft.version) >= 1))
    && (nft.editions === undefined || (Array.isArray(nft.editions) && nft.editions.every(validEdition)))
    && (nft.attributes === undefined || (Array.isArray(nft.attributes) && nft.attributes.every(validAttribute)))
    && (nft.creator === undefined || (isRecord(nft.creator) && typeof nft.creator.name === 'string' && typeof nft.creator.handle === 'string'))
}

export async function getNfts(): Promise<Nft[]> {
  const response = await http.get<unknown>('/nfts')
  if (!Array.isArray(response.data) || !response.data.every(isNft)) {
    if (diagnosticsEnabled) console.error('[diagnostic] Catálogo: GET /api/nfts não retornou um array válido de NFTs.')
    throw new Error('Resposta inválida de GET /api/nfts: esperado um array válido de NFTs.')
  }
  if (diagnosticsEnabled && !catalogResultLogged) {
    catalogResultLogged = true
    console.info(`[diagnostic] Catálogo: array válido recebido (${response.data.length} NFTs).`)
  }
  return response.data
}

export async function getNftById(id: string): Promise<Nft> {
  const response = await http.get<Nft>(`/nfts/${id}`)
  return response.data
}
