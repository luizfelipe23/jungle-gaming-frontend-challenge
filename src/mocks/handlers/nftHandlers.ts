import { http, HttpResponse } from 'msw'

import { nftFixtures } from '../data/nfts'

export const nftHandlers = [
  http.get('/api/nfts', () => {
    return HttpResponse.json(nftFixtures)
  }),

  http.get('/api/nfts/:id', ({ params }) => {
    const nft = nftFixtures.find((item) => item.id === params.id)

    if (!nft) {
      return HttpResponse.json({ message: 'NFT not found' }, { status: 404 })
    }

    return HttpResponse.json(nft)
  }),
]
