import { http } from '../../../lib/api/http'

export async function getFavoriteNftIds() {
  return (await http.get<string[]>('/favorites')).data
}

export async function addFavorite(nftId: string) {
  return (await http.put<string[]>(`/favorites/${encodeURIComponent(nftId)}`)).data
}

export async function removeFavorite(nftId: string) {
  return (await http.delete<string[]>(`/favorites/${encodeURIComponent(nftId)}`)).data
}
