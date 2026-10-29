import { io, type Socket } from 'socket.io-client'

import type { RealtimeUpdateEvent } from './types'

export class SocketClient {
  private socket: Socket | null = null
  private subscriptions = new Map<symbol, () => void>()
  private scopeId: string | null = null

  private get url() {
    return import.meta.env.VITE_SOCKET_URL
      ?? (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin)
  }

  setScope(scopeId: string | null) {
    if (scopeId === this.scopeId) return
    this.scopeId = scopeId

    if (this.socket) {
      this.socket.auth = { scopeId }
      if (this.socket.connected) this.socket.disconnect().connect()
    }
  }

  connect(url = this.url) {
    const socket = this.getSocket(url)
    if (!socket.connected && !socket.active) socket.connect()
    return socket
  }

  private getSocket(url: string) {
    if (this.socket) {
      return this.socket
    }

    this.socket = io(url, {
      autoConnect: false,
      auth: { scopeId: this.scopeId },
      reconnection: true,
      reconnectionAttempts: Infinity,
      transports: ['websocket'],
    })

    return this.socket
  }

  disconnect() {
    const socket = this.socket
    for (const cleanup of this.subscriptions.values()) cleanup()
    this.subscriptions.clear()
    this.socket = null
    socket?.disconnect()
  }

  onEvent<TPayload>(eventName: 'nft.updated' | 'order.updated', handler: (event: RealtimeUpdateEvent<TPayload>) => void) {
    const socket = this.getSocket(this.url)
    return this.subscribe(socket, (unsubscribe) => {
      socket.on(eventName, handler)
      unsubscribe(() => socket.off(eventName, handler))
    })
  }

  onConnection(handler: () => void) {
    const socket = this.getSocket(this.url)
    return this.subscribe(socket, (unsubscribe) => {
      socket.on('connect', handler)
      unsubscribe(() => socket.off('connect', handler))
    })
  }

  private subscribe(socket: Socket, register: (unsubscribe: (callback: () => void) => void) => void) {
    const id = Symbol('socket-subscription')
    let cleanup: () => void = () => {}
    register((callback) => { cleanup = callback })
    this.subscriptions.set(id, cleanup)
    if (!socket.connected && !socket.active) socket.connect()
    return () => {
      const registered = this.subscriptions.get(id)
      if (!registered) return
      this.subscriptions.delete(id)
      registered()
      if (this.subscriptions.size === 0 && this.socket === socket) this.disconnect()
    }
  }
}

export const realtimeClient = new SocketClient()
