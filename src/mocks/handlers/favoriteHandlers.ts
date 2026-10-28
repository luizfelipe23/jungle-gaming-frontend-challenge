import { http, HttpResponse } from 'msw'

import { readAccountScenario, readFavorites, saveFavorites } from '../data/accountStore'
import { nftFixtures } from '../data/nfts'
import { getMockUserFromRequest } from './authHandlers'

function denied() { return HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Entre novamente para continuar.' }, { status: 401 }) }

export const favoriteHandlers = [
  http.get('/api/favorites', ({ request }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return denied()
    return HttpResponse.json(readFavorites(user.id))
  }),
  http.put('/api/favorites/:nftId', ({ request, params }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return denied()
    const nftId = String(params.nftId)
    if (!nftFixtures.some((nft) => nft.id === nftId)) return HttpResponse.json({ code: 'NFT_NOT_FOUND', message: 'NFT não encontrado.' }, { status: 404 })
    const scenario = readAccountScenario()
    if (scenario.favoriteFailure === 'favorite') return HttpResponse.json({ code: 'TEMPORARY_FAILURE', message: 'Não foi possível adicionar aos favoritos.' }, { status: 503 })
    const ids = [...new Set([...readFavorites(user.id), nftId])]
    saveFavorites(user.id, ids)
    return HttpResponse.json(ids)
  }),
  http.delete('/api/favorites/:nftId', ({ request, params }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return denied()
    const scenario = readAccountScenario()
    if (scenario.favoriteFailure === 'unfavorite') return HttpResponse.json({ code: 'TEMPORARY_FAILURE', message: 'Não foi possível remover dos favoritos.' }, { status: 503 })
    const ids = readFavorites(user.id).filter((id) => id !== String(params.nftId))
    saveFavorites(user.id, ids)
    return HttpResponse.json(ids)
  }),
]
