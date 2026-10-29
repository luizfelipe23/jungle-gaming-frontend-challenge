import type { Nft } from '../../types/nft'

export function keepNewestNft(previous: Nft | undefined, incoming: Nft): Nft {
  if (previous && typeof previous.version === 'number' && (incoming.version ?? 0) < previous.version) return previous
  return incoming
}

export function keepNewestNftList(previous: Nft[] | undefined, incoming: Nft[]): Nft[] {
  if (!previous) return incoming
  const previousById = new Map(previous.map((nft) => [nft.id, nft]))
  return incoming.map((nft) => keepNewestNft(previousById.get(nft.id), nft))
}
