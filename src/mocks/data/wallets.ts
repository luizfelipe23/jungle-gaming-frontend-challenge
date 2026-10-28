import type { Wallet } from '../../features/checkout/types/checkout'

export const walletsByUserId: Record<string, Wallet[]> = {
  'user-luna-001': [
    {
      id: 'wallet-luna-primary',
      name: 'Carteira principal',
      address: '0x0000000000000000000000000000000000009a42',
      networks: [
        { id: 'ethereum', name: 'Ethereum', currency: 'ETH' },
        { id: 'polygon', name: 'Polygon', currency: 'USD' },
      ],
    },
    {
      id: 'wallet-luna-vault',
      name: 'Cold vault',
      address: '0x000000000000000000000000000000000000034f',
      networks: [{ id: 'ethereum', name: 'Ethereum', currency: 'ETH' }],
    },
  ],
  'user-rafael-002': [
    {
      id: 'wallet-rafael-primary',
      name: 'Carteira principal',
      address: '0x00000000000000000000000000000000000017c8',
      networks: [
        { id: 'ethereum', name: 'Ethereum', currency: 'ETH' },
        { id: 'polygon', name: 'Polygon', currency: 'USD' },
      ],
    },
  ],
}
