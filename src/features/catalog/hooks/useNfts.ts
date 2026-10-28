import { useQuery } from '@tanstack/react-query'

import { getNftById, getNfts } from '../api/nftApi'

export function useNfts() {
  return useQuery({
    queryKey: ['nfts'],
    queryFn: getNfts,
  })
}

export function useNft(id: string) {
  return useQuery({
    queryKey: ['nft', id],
    queryFn: () => getNftById(id),
    enabled: Boolean(id),
  })
}
