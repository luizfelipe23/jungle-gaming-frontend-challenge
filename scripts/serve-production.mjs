import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { basename, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createRealtimeServer } from './realtime-server.mjs'

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url))
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendFile(response, filePath) {
  const fileName = basename(filePath)
  const isHashedAsset = filePath.includes(`${sep}assets${sep}`) && /-[A-Za-z0-9_-]{8,}\./.test(fileName)
  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': fileName === 'index.html' || fileName === 'mockServiceWorker.js'
      ? 'no-cache'
      : isHashedAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  })
  createReadStream(filePath).pipe(response)
}

const httpServer = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost')
  if (requestUrl.pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' }).end('{"status":"ok"}')
    return
  }

  if (requestUrl.pathname === '/api' || requestUrl.pathname.startsWith('/api/')) {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      .end(JSON.stringify({ code: 'API_ROUTE_NOT_FOUND', message: 'Rota de API não encontrada. Verifique se o MSW está ativo.' }))
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end('Method not allowed')
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(requestUrl.pathname)
  } catch {
    response.writeHead(400).end('Invalid URL')
    return
  }

  const relativePath = normalize(pathname).replace(/^([/\\]|\.\.(?:[/\\]|$))+/, '')
  const requestedFile = join(distDirectory, relativePath)
  const isInsideDist = requestedFile.startsWith(distDirectory)
  const existsAsFile = isInsideDist && existsSync(requestedFile) && statSync(requestedFile).isFile()

  if (existsAsFile) {
    sendFile(response, requestedFile)
    return
  }

  if (extname(pathname)) {
    response.writeHead(404).end('Not found')
    return
  }

  sendFile(response, join(distDirectory, 'index.html'))
})

if (!existsSync(join(distDirectory, 'index.html'))) {
  throw new Error('Production build not found. Run npm run build before starting the server.')
}

const io = createRealtimeServer(httpServer)
const port = Number.parseInt(process.env.PORT ?? '4173', 10)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.')

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`[web] Frontend and Socket.IO listening on 0.0.0.0:${port}`)
})

function stop() {
  io.close(() => process.exit(0))
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
