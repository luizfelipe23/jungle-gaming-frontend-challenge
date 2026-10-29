import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const reportDirectory = resolve(projectRoot, 'reports/lighthouse')
const baseUrl = 'http://127.0.0.1:4173'
const lighthouseCli = resolve(projectRoot, 'node_modules/lighthouse/cli/index.js')
const previewCli = resolve(projectRoot, 'node_modules/vite/bin/vite.js')
const tscCli = resolve(projectRoot, 'node_modules/typescript/bin/tsc')
const realtimeServer = resolve(projectRoot, 'scripts/mock-realtime-server.mjs')
const fixturePath = resolve(projectRoot, 'src/mocks/data/nfts.ts')
process.env.VITE_API_BASE_URL ??= 'http://127.0.0.1:4174/api'
process.env.VITE_SOCKET_URL ??= 'http://127.0.0.1:3001'
const runCount = 3
const targetPages = [
  { name: 'catalog', path: '/' },
  { name: 'nft-details', path: '/nft/nft-001' },
]
const profiles = [
  { name: 'mobile', flags: [] },
  { name: 'desktop', flags: ['--preset=desktop'] },
]
const categoryIds = ['performance', 'accessibility', 'best-practices', 'seo']

function runNodeScript(script, args = []) {
  execFileSync(process.execPath, [script, ...args], { cwd: projectRoot, stdio: 'inherit' })
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function waitForPreview(preview) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited with code ${preview.exitCode}`)
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500))
  }
  throw new Error(`Vite preview did not become ready at ${baseUrl}`)
}

async function waitForRealtime(server) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Socket.IO audit server exited with code ${server.exitCode}`)
    try {
      const response = await fetch('http://127.0.0.1:3001/__test__/realtime-status')
      if (response.ok) return
    } catch {
      // The local Socket.IO server is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
  }
  throw new Error('Socket.IO audit server did not become ready on port 3001')
}

async function startFixtureApi() {
  const source = await readFile(fixturePath, 'utf8')
  const ts = await import('typescript')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  })
  const fixturesModule = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
  const nfts = fixturesModule.nftFixtures
  const server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end()
      return
    }

    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    const nftId = pathname.match(/^\/api\/nfts\/([^/]+)$/)?.[1]
    const nft = nftId ? nfts.find((item) => item.id === decodeURIComponent(nftId)) : null
    const route = pathname === '/api/nfts' ? nfts
      : nftId ? nft ?? { message: 'NFT not found' }
        : pathname === '/api/cart' ? { items: [], couponCode: null, version: 0 }
          : pathname === '/api/auth/session' ? { user: null }
            : { message: 'Not found' }
    const status = nftId && !nft ? 404 : route.message === 'Not found' ? 404 : 200
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(route))
  })
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(4174, '127.0.0.1', resolvePromise)
  })
  return server
}

async function runAudit(url, profile) {
  const args = [
    lighthouseCli,
    url,
    '--output=json',
    '--output-path=stdout',
    '--quiet',
    '--chrome-flags=--headless --no-sandbox',
    ...profile.flags,
  ]
  const output = execFileSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: process.env,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const report = JSON.parse(output)
  const score = (id) => Math.round((report.categories[id]?.score ?? 0) * 100)
  const metric = (id) => report.audits[id]?.numericValue ?? null

  return {
    scores: Object.fromEntries(categoryIds.map((id) => [id, score(id)])),
    metrics: {
      lcpMs: metric('largest-contentful-paint'),
      cls: metric('cumulative-layout-shift'),
      tbtMs: metric('total-blocking-time'),
    },
    failingAudits: Object.values(report.audits)
      .filter((audit) => audit.score !== null && audit.score !== undefined && audit.score < 1)
      .map(({ id, title, score: auditScore, displayValue, details }) => ({
        id,
        title,
        score: auditScore,
        displayValue,
        affectedElements: details?.items?.flatMap((item) => [...(item.nodes ?? []), ...(item.node ? [item.node] : [])])
          .map(({ selector, nodeLabel, explanation, snippet }) => ({ selector, nodeLabel, explanation, snippet }))
          .filter((item) => item.selector || item.nodeLabel || item.explanation || item.snippet)
          .slice(0, 10) ?? [],
      })),
    chromeVersion: report.userAgent,
  }
}

await mkdir(reportDirectory, { recursive: true })
runNodeScript(tscCli, ['-b'])
runNodeScript(previewCli, ['build'])

const chromePath = chromium.executablePath()
process.env.CHROME_PATH = chromePath
const fixtureApi = await startFixtureApi()
const realtime = spawn(process.execPath, [realtimeServer], { cwd: projectRoot, stdio: 'inherit' })
const preview = spawn(process.execPath, [previewCli, 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  cwd: projectRoot,
  stdio: 'inherit',
})

try {
  await waitForRealtime(realtime)
  await waitForPreview(preview)
  const results = []

  for (const profile of profiles) {
    for (const page of targetPages) {
      const runs = []
      for (let attempt = 1; attempt <= runCount; attempt += 1) {
        console.log(`Lighthouse ${profile.name} ${page.name}: ${attempt}/${runCount}`)
        runs.push(await runAudit(`${baseUrl}${page.path}`, profile))
      }
      const medians = {
        scores: Object.fromEntries(categoryIds.map((id) => [id, median(runs.map((run) => run.scores[id]))])),
        metrics: Object.fromEntries(['lcpMs', 'cls', 'tbtMs'].map((id) => [id, median(runs.map((run) => run.metrics[id]))])),
      }
      results.push({ profile: profile.name, page: page.name, path: page.path, runs, medians })
      console.log(`Completed ${profile.name} ${page.name}: ${JSON.stringify(medians)}`)
    }
  }

  const lighthousePackage = JSON.parse(await readFile(resolve(projectRoot, 'node_modules/lighthouse/package.json'), 'utf8'))
  const vitePackage = JSON.parse(await readFile(resolve(projectRoot, 'node_modules/vite/package.json'), 'utf8'))
  const playwrightPackage = JSON.parse(await readFile(resolve(projectRoot, 'node_modules/playwright/package.json'), 'utf8'))
  const summary = {
    generatedAt: new Date().toISOString(),
    environment: {
      node: process.version,
      lighthouse: lighthousePackage.version,
      vite: vitePackage.version,
      playwright: playwrightPackage.version,
      chromePath,
      dockerImage: 'mcr.microsoft.com/playwright:v1.64.1-jammy',
      url: baseUrl,
      auditBackend: 'Local fixture HTTP server using src/mocks/data/nfts.ts; local Socket.IO mock server',
      runsPerPageAndProfile: runCount,
    },
    results,
  }
  await writeFile(resolve(reportDirectory, 'latest.json'), `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`Saved Lighthouse medians to ${resolve(reportDirectory, 'latest.json')}`)
} finally {
  preview.kill('SIGTERM')
  realtime.kill('SIGTERM')
  fixtureApi.close()
}
