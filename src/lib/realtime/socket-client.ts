import { io, type Socket } from 'socket.io-client'

import type { RealtimeUpdateEvent } from './types'

export class SocketClient {
  private socket: Socket | null = null

  connect(url = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001') {
    if (this.socket) {
      return this.socket
    }

    this.socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      transports: ['websocket'],
    })

    return this.socket
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  onEvent<TPayload>(eventName: 'nft.updated' | 'order.updated', handler: (event: RealtimeUpdateEvent<TPayload>) => void) {
    if (!this.socket) return () => undefined
    this.socket.on(eventName, handler)
    return () => this.socket?.off(eventName, handler)
  }
}

export const realtimeClient = new SocketClient()
