import { createServer } from 'node:http'
import { createRealtimeServer, emitRealtimeEvent } from './realtime-server.mjs'

const httpServer = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (request.method === 'OPTIONS') {
    response.writeHead(204).end()
    return
  }

  if (request.method === 'GET' && request.url === '/__test__/realtime-status') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ connectedClients: io.engine.clientsCount }))
    return
  }

  if (request.method === 'POST' && request.url === '/__test__/drop-connections') {
    const dropped = io.sockets.sockets.size
    for (const socket of io.sockets.sockets.values()) socket.conn.close()
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ dropped }))
    return
  }

  if (request.method === 'POST' && request.url === '/__test__/emit') {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => {
      try {
        const { event } = JSON.parse(body)
        if (!emitRealtimeEvent(io, event)) {
          response.writeHead(400).end('Invalid event')
          return
        }
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ delivered: io.engine.clientsCount }))
      } catch {
        response.writeHead(400).end('Invalid JSON')
      }
    })
    return
  }

  response.writeHead(404).end('Not found')
})

const io = createRealtimeServer(httpServer, { cors: { origin: '*' } })

httpServer.listen(3001, '0.0.0.0', () => console.log('[realtime] Mock Socket.IO server listening on :3001'))

function stop() {
  io.close(() => process.exit(0))
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
