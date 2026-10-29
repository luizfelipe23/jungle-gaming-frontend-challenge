import { io, type Socket } from 'socket.io-client'

import type { RealtimeUpdateEvent } from './types'

export class SocketClient {
  private socket: Socket | null = null
  private subscriptions = new Map<symbol, () => void>()
  private scopeId: string | null = null
  private scopeIdAtHandshake: string | null = null

  private get diagnosticsEnabled() {
    return import.meta.env.DEV || import.meta.env.VITE_DIAGNOSTICS === 'true'
  }

  private get url() {
    return import.meta.env.VITE_SOCKET_URL
      ?? (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin)
  }

  setScope(scopeId: string | null) {
    if (scopeId === this.scopeId) return
    this.scopeId = scopeId

    if (this.socket) {
      if (this.socket.connected) {
        this.socket.disconnect()
        this.socket.connect()
      }
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
      auth: (callback) => {
        this.scopeIdAtHandshake = this.scopeId
        callback({ scopeId: this.scopeIdAtHandshake })
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      transports: ['websocket'],
    })

    this.socket.on('connect', () => {
      if (this.diagnosticsEnabled) console.info('[diagnostic] Socket.IO conectado.')
      if (this.scopeIdAtHandshake !== this.scopeId) {
        this.socket?.disconnect()
        this.socket?.connect()
      }
    })
    this.socket.on('connect_error', (error: Error) => {
      if (this.diagnosticsEnabled) console.error(`[diagnostic] Socket.IO falhou ao conectar: ${error.message}`)
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
