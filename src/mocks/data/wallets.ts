import type { Wallet } from '../../features/checkout/types/checkout'

export const walletsByUserId: Record<string, Wallet[]> = {
  'user-luna-001': [
    {
      id: 'wallet-luna-primary',
      name: 'Carteira principal',
      address: '0x71C7...9A42',
      networks: [
        { id: 'ethereum', name: 'Ethereum', currency: 'ETH' },
        { id: 'polygon', name: 'Polygon', currency: 'USD' },
      ],
    },
    {
      id: 'wallet-luna-vault',
      name: 'Cold vault',
      address: '0xA2D1...034F',
      networks: [{ id: 'ethereum', name: 'Ethereum', currency: 'ETH' }],
    },
  ],
  'user-rafael-002': [
    {
      id: 'wallet-rafael-primary',
      name: 'Carteira principal',
      address: '0x39AB...17C8',
      networks: [
        { id: 'ethereum', name: 'Ethereum', currency: 'ETH' },
        { id: 'polygon', name: 'Polygon', currency: 'USD' },
      ],
    },
  ],
}
