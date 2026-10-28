import { io, type Socket } from 'socket.io-client'

import type { RealtimeUpdateEvent } from './types'

export class SocketClient {
  private socket: Socket | null = null
  private subscriptions = new Set<symbol>()

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
    this.subscriptions.clear()
  }

  onEvent<TPayload>(eventName: 'nft.updated' | 'order.updated', handler: (event: RealtimeUpdateEvent<TPayload>) => void) {
    const socket = this.connect()
    return this.subscribe(socket, (unsubscribe) => {
      socket.on(eventName, handler)
      unsubscribe(() => socket.off(eventName, handler))
    })
  }

  onConnection(handler: () => void) {
    const socket = this.connect()
    return this.subscribe(socket, (unsubscribe) => {
      socket.on('connect', handler)
      unsubscribe(() => socket.off('connect', handler))
    })
  }

  private subscribe(socket: Socket, register: (unsubscribe: (callback: () => void) => void) => void) {
    const id = Symbol('socket-subscription')
    this.subscriptions.add(id)
    let cleanup: () => void = () => {}
    register((callback) => { cleanup = callback })
    return () => {
      if (!this.subscriptions.delete(id)) return
      cleanup()
      if (this.subscriptions.size === 0 && this.socket === socket) this.disconnect()
    }
  }
}

export const realtimeClient = new SocketClient()
