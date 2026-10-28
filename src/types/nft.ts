export interface Nft {
  id: string
  name: string
  description: string
  imageUrl?: string
  price: number
  currency: 'ETH' | 'USD'
  status: 'available' | 'sold' | 'reserved'
  collection: string
  rarity: string
  createdAt: string
}
