export interface Nft {
  id: string
  name: string
  description: string
  imageUrl?: string
  price: string
  currency: 'ETH' | 'USD'
  status: 'available' | 'sold' | 'reserved'
  availableQuantity: number
  maxPurchaseQuantity?: number
  editions?: NftEdition[]
  collection: string
  rarity: string
  createdAt: string
  creator?: {
    name: string
    handle: string
  }
  tokenId?: string
  attributes?: NftAttribute[]
}

export interface NftEdition {
  id: string
  name: string
  price: string
  availableQuantity: number
  maxPurchaseQuantity?: number
}

export interface NftAttribute {
  traitType: string
  value: string
}
