import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Nft } from '../../../types/nft'
import { keepNewestNft, keepNewestNftList } from '../../../lib/realtime/nft-version'

import { getNftById, getNfts } from '../api/nftApi'

export function useNfts() {
  return useQuery<Nft[]>({
    queryKey: ['nfts'],
    queryFn: getNfts,
    structuralSharing: (previous, incoming) => keepNewestNftList(previous as Nft[] | undefined, incoming as Nft[]),
  })
}

export function useNft(id: string) {
  const queryClient = useQueryClient()
  return useQuery<Nft>({
    queryKey: ['nft', id],
    queryFn: () => getNftById(id),
    enabled: Boolean(id),
    initialData: () => queryClient.getQueryData<Nft[]>(['nfts'])?.find((nft) => nft.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(['nfts'])?.dataUpdatedAt,
    structuralSharing: (previous, incoming) => keepNewestNft(previous as Nft | undefined, incoming as Nft),
  })
}
