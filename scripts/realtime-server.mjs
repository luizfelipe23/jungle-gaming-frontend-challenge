import { Server } from 'socket.io'

export function createRealtimeServer(httpServer, options = {}) {
  const io = new Server(httpServer, options)

  io.on('connection', (socket) => {
    const { scopeId } = socket.handshake.auth ?? {}
    if (typeof scopeId === 'string' && scopeId.length > 0) {
      socket.join(`user:${scopeId}`)
    }
    console.log(`[realtime] Socket.IO client connected: ${socket.id}`)
  })

  return io
}

export function emitRealtimeEvent(io, event) {
  if (
    !['nft.updated', 'order.updated'].includes(event?.type)
    || typeof event.resourceId !== 'string'
    || !event.resourceId
    || !Number.isSafeInteger(event.version)
    || event.version < 1
    || typeof event.updatedAt !== 'string'
    || !event.payload
    || typeof event.payload !== 'object'
    || (event.type === 'order.updated' && (typeof event.scopeId !== 'string' || !event.scopeId))
  ) return false

  if (event.type === 'order.updated') io.to(`user:${event.scopeId}`).emit(event.type, event)
  else io.emit(event.type, event)
  return true
}
