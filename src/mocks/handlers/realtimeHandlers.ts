import { http, HttpResponse } from 'msw'

import { nftFixtures } from '../data/nfts'
import type { RealtimeUpdateEvent } from '../../lib/realtime/types'

const versions = new Map<string, number>()

export const realtimeHandlers = [
  http.post('/api/dev/scenarios/nft-update', async ({ request }) => {
    const body = await request.json().catch(() => null) as {
      nftId?: unknown
      price?: unknown
      status?: unknown
      availableQuantity?: unknown
      editionId?: unknown
      editionPrice?: unknown
      editionAvailableQuantity?: unknown
    } | null
    if (!body) return HttpResponse.json({ message: 'Cenário inválido.' }, { status: 400 })
    const nftId = typeof body.nftId === 'string' ? body.nftId : ''
    const nft = nftFixtures.find((entry) => entry.id === nftId)
    if (!nft) return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })

    if (typeof body.price === 'string' && /^\d+(\.\d{1,18})?$/.test(body.price)) nft.price = body.price
    if (typeof body.status === 'string' && ['available', 'reserved', 'sold'].includes(body.status)) nft.status = body.status as typeof nft.status
    if (Number.isSafeInteger(body.availableQuantity) && (body.availableQuantity as number) >= 0) nft.availableQuantity = body.availableQuantity as number
    if (typeof body.editionId === 'string') {
      const edition = nft.editions?.find((entry) => entry.id === body.editionId)
      if (edition) {
        if (typeof body.editionPrice === 'string' && /^\d+(\.\d{1,18})?$/.test(body.editionPrice)) edition.price = body.editionPrice
        if (Number.isSafeInteger(body.editionAvailableQuantity) && (body.editionAvailableQuantity as number) >= 0) edition.availableQuantity = body.editionAvailableQuantity as number
      }
    }
    if (nft.availableQuantity === 0 && !nft.editions?.some((edition) => edition.availableQuantity > 0)) nft.status = 'reserved'

    const version = (versions.get(nft.id) ?? 0) + 1
    versions.set(nft.id, version)
    const event: RealtimeUpdateEvent<{ price: string; status: typeof nft.status; availableQuantity: number }> = {
      type: 'nft.updated',
      resourceId: nft.id,
      version,
      updatedAt: new Date().toISOString(),
      payload: { price: nft.price, status: nft.status, availableQuantity: nft.availableQuantity },
    }
    return HttpResponse.json({ event })
  }),
]
