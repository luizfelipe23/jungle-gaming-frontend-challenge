import { spawn } from 'node:child_process'

const children = [
  spawn(process.execPath, ['scripts/mock-realtime-server.mjs'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '5173', '--strictPort'], { stdio: 'inherit' }),
]

let stopping = false

function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  setTimeout(() => process.exit(exitCode), 250).unref()
}

for (const child of children) {
  child.on('error', (error) => {
    console.error(error)
    stop(1)
  })
  child.on('exit', (code) => {
    if (!stopping && code !== 0) stop(code ?? 1)
  })
}

process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
