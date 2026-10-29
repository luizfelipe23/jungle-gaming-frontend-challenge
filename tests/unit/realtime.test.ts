import { beforeEach, describe, expect, it, vi } from 'vitest'

import { keepNewestNft, keepNewestNftList } from '../../src/lib/realtime/nft-version'
import { http } from '../../src/lib/api/http'
import type { Nft } from '../../src/types/nft'

const fakeSocket = vi.hoisted(() => ({
  connected: false,
  active: false,
  on: vi.fn(),
  off: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('socket.io-client', () => ({ io: vi.fn(() => fakeSocket) }))

import { SocketClient } from '../../src/lib/realtime/socket-client'

const baseNft: Nft = {
  id: 'nft-001',
  name: 'Crimson Ember',
  description: 'Demo NFT',
  price: '1.85',
  currency: 'ETH',
  status: 'available',
  availableQuantity: 4,
  collection: 'Kurio Genesis',
  rarity: 'Rare',
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('Realtime event reconciliation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the newest NFT when REST returns an older version', () => {
    const current = { ...baseNft, price: '2.5', version: 3 }
    const stale = { ...baseNft, price: '2.25', version: 2 }

    expect(keepNewestNft(current, stale)).toBe(current)
    expect(keepNewestNft(current, { ...baseNft, price: '3', version: 4 }).price).toBe('3')
  })

  it('keeps per-item versions when reconciling the catalog response', () => {
    const current = [{ ...baseNft, price: '2.5', version: 3 }]
    const response = [{ ...baseNft, price: '2.25', version: 2 }, { ...baseNft, id: 'nft-002', version: 1 }]

    expect(keepNewestNftList(current, response)).toMatchObject([
      { id: 'nft-001', price: '2.5', version: 3 },
      { id: 'nft-002', version: 1 },
    ])
  })

  it('returns complete, increasing event versions together with the REST fixture update', async () => {
    const first = await http.post<{ event: { resourceId: string; version: number; payload: { nft: Nft } } }>('/dev/scenarios/nft-update', { nftId: 'nft-001', price: '2.25' })
    const second = await http.post<{ event: { resourceId: string; version: number; payload: { nft: Nft } } }>('/dev/scenarios/nft-update', { nftId: 'nft-001', price: '2.5' })

    expect(first.data.event).toMatchObject({ resourceId: 'nft-001', payload: { nft: { price: '2.25' } } })
    expect(second.data.event.version).toBeGreaterThan(first.data.event.version)
    expect(second.data.event.payload.nft).toMatchObject({ price: '2.5', version: second.data.event.version })
  })

  it('removes event and reconnect listeners when the session socket is disconnected', () => {
    const client = new SocketClient()
    const eventHandler = vi.fn()
    const connectionHandler = vi.fn()

    client.onEvent('order.updated', eventHandler)
    client.onConnection(connectionHandler)
    client.disconnect()

    expect(fakeSocket.off).toHaveBeenCalledWith('order.updated', eventHandler)
    expect(fakeSocket.off).toHaveBeenCalledWith('connect', connectionHandler)
    expect(fakeSocket.disconnect).toHaveBeenCalledOnce()
  })
})
