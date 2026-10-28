import { http } from '../../../lib/api/http'
import type { Nft } from '../../../types/nft'

export async function getNfts(): Promise<Nft[]> {
  const response = await http.get<Nft[]>('/nfts')
  return response.data
}

export async function getNftById(id: string): Promise<Nft> {
  const response = await http.get<Nft>(`/nfts/${id}`)
  return response.data
}
