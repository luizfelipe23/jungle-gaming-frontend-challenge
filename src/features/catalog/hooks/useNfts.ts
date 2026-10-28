import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Nft } from '../../../types/nft'

import { getNftById, getNfts } from '../api/nftApi'

export function useNfts() {
  return useQuery({
    queryKey: ['nfts'],
    queryFn: getNfts,
  })
}

export function useNft(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['nft', id],
    queryFn: () => getNftById(id),
    enabled: Boolean(id),
    initialData: () => queryClient.getQueryData<Nft[]>(['nfts'])?.find((nft) => nft.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(['nfts'])?.dataUpdatedAt,
  })
}
