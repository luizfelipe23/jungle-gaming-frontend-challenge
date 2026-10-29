import { http, HttpResponse } from 'msw'

import type { CreateOrderInput, WalletConnection } from '../../features/checkout/types/checkout'
import { quoteFingerprint } from '../../features/checkout/utils/quoteFingerprint'
import type { Order, OrderStatus } from '../../features/orders/types/order'
import { mockSessionsStorageKey, type MockSessionRecord } from '../../features/auth/types/session'
import { getWalletsForUser } from '../data/accountStore'
import { readCheckoutScenario, readOrders, readWalletConnections, saveOrders, saveWalletConnections, writeCheckoutScenario } from '../data/orderStore'
import { getOwnedCart, makeQuote, ownerId } from './cartHandlers'
import { nftFixtures } from '../data/nfts'

function error(code: string, message: string, status: number, extra: Record<string, unknown> = {}) {
  return HttpResponse.json({ code, message, ...extra }, { status })
}

function parseInput(value: unknown): CreateOrderInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Partial<CreateOrderInput>
  if (
    typeof input.quoteRevision !== 'string'
    || !Number.isSafeInteger(input.cartVersion)
    || typeof input.walletId !== 'string'
    || typeof input.networkId !== 'string'
    || typeof input.connectionId !== 'string'
    || typeof input.collector?.name !== 'string'
    || typeof input.collector.email !== 'string'
  ) return null
  return input as CreateOrderInput
}

function fingerprint(input: CreateOrderInput) {
  return JSON.stringify(input)
}

function getWalletConnection(request: Request, walletId: string) {
  const owner = ownerId(request)
  if (!owner.id) return null
  return readWalletConnections(owner.id)[walletId] ?? null
}

function moveInventory(order: Order) {
  for (const line of order.items) {
    const nft = nftFixtures.find((item) => item.id === line.nftId)
    if (!nft) continue
    const edition = line.editionId ? nft.editions?.find((item) => item.id === line.editionId) : undefined
    if (edition) edition.availableQuantity = Math.max(0, edition.availableQuantity - line.quantity)
    else nft.availableQuantity = Math.max(0, nft.availableQuantity - line.quantity)
    if (nft.availableQuantity === 0 && !nft.editions?.some((item) => item.availableQuantity > 0)) nft.status = 'reserved'
  }
}

function transitionOrder(order: Order, status: OrderStatus): Order {
  if (order.status !== 'pending' || status === 'pending') return order
  const updated: Order = { ...order, status, version: order.version + 1, updatedAt: new Date().toISOString() }
  if (status === 'confirmed') {
    updated.transactionReference = `SIM-${order.id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    moveInventory(updated)
  }
  return updated
}

export const orderHandlers = [
  http.get('/api/wallets/:walletId/connection', ({ request, params }) => {
    const owner = ownerId(request)
    if (!owner.id) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    const walletId = String(params.walletId)
    const wallet = getWalletsForUser(owner.id).find((item) => item.id === walletId)
    if (!wallet) return error('WALLET_NOT_FOUND', 'Carteira não encontrada.', 404)
    const connection = readWalletConnections(owner.id)[walletId]
    return HttpResponse.json<WalletConnection>({ status: connection ? 'connected' : 'disconnected', connectionId: connection?.connectionId ?? null, walletId, networkId: connection?.networkId ?? '' })
  }),

  http.post('/api/wallets/:walletId/connect', async ({ request, params }) => {
    const owner = ownerId(request)
    if (!owner.id) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    const walletId = String(params.walletId)
    const wallet = getWalletsForUser(owner.id).find((item) => item.id === walletId)
    if (!wallet) return error('WALLET_NOT_FOUND', 'Carteira não encontrada.', 404)
    const body = await request.json().catch(() => null) as { networkId?: unknown } | null
    const networkId = typeof body?.networkId === 'string' ? body.networkId : ''
    if (!wallet.networks.some((network) => network.id === networkId)) return error('VALIDATION_ERROR', 'Selecione uma rede compatível com esta carteira.', 422)
    if (readCheckoutScenario().walletConnection === 'rejected') return error('WALLET_CONNECTION_REJECTED', 'A conexão foi recusada pela carteira simulada.', 409)
    const connections = readWalletConnections(owner.id)
    const connection = { connectionId: `conn-${crypto.randomUUID()}`, networkId }
    saveWalletConnections(owner.id, { ...connections, [walletId]: connection })
    return HttpResponse.json<WalletConnection>({ status: 'connected', walletId, ...connection })
  }),

  http.post('/api/wallets/:walletId/disconnect', ({ request, params }) => {
    const owner = ownerId(request)
    if (!owner.id) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    const walletId = String(params.walletId)
    const connections = readWalletConnections(owner.id)
    delete connections[walletId]
    saveWalletConnections(owner.id, connections)
    return HttpResponse.json<WalletConnection>({ status: 'disconnected', walletId, networkId: '', connectionId: null })
  }),

  http.post('/api/orders', async ({ request }) => {
    const owner = ownerId(request)
    if (!owner.id) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? ''
    if (!idempotencyKey || idempotencyKey.length > 160) return error('VALIDATION_ERROR', 'A chave de idempotência é obrigatória.', 400)
    const input = parseInput(await request.json().catch(() => null))
    if (!input || input.collector.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.collector.email)) return error('VALIDATION_ERROR', 'Confira os dados do colecionador.', 422)

    const requestFingerprint = fingerprint(input)
    const orders = readOrders(owner.id)
    const existing = orders.find((item) => item.idempotencyKey === idempotencyKey)
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) return error('IDEMPOTENCY_CONFLICT', 'Esta chave já foi usada com dados diferentes.', 409)
      return HttpResponse.json(existing)
    }

    const scenario = readCheckoutScenario()
    if (scenario.nextCreateFailure === 'session-expired') {
      const sessions = JSON.parse(window.localStorage.getItem(mockSessionsStorageKey) ?? '[]') as MockSessionRecord[]
      window.localStorage.setItem(mockSessionsStorageKey, JSON.stringify(sessions.filter((session) => session.userId !== owner.id)))
      writeCheckoutScenario({ ...scenario, nextCreateFailure: null })
      return error('SESSION_EXPIRED', 'Sua sessão expirou durante o checkout.', 401)
    }
    if (scenario.nextCreateFailure === 'transient') {
      writeCheckoutScenario({ ...scenario, nextCreateFailure: null })
      return error('TEMPORARY_FAILURE', 'Falha temporária ao processar o pedido. Tente recuperar a mesma tentativa.', 503)
    }

    const cart = await getOwnedCart(request)
    if (cart instanceof Response) return cart
    const currentQuote = makeQuote(cart)
    if (cart.version !== input.cartVersion || !currentQuote.canCheckout || quoteFingerprint(currentQuote) !== input.quoteRevision) {
      return error('QUOTE_CHANGED', 'Os valores ou a disponibilidade mudaram. Revise a cotação atualizada antes de continuar.', 409, { quote: currentQuote })
    }
    if (scenario.expireCoupon && cart.couponCode) return error('QUOTE_CHANGED', 'O cupom expirou durante o checkout. Revise a cotação atualizada.', 409, { quote: makeQuote({ ...cart, couponCode: null }) })
    const wallet = getWalletsForUser(owner.id).find((item) => item.id === input.walletId)
    const network = wallet?.networks.find((item) => item.id === input.networkId)
    if (!wallet || !network) return error('WALLET_NOT_FOUND', 'A carteira ou rede selecionada não está disponível.', 404)
    const connection = getWalletConnection(request, wallet.id)
    if (!connection || connection.connectionId !== input.connectionId || connection.networkId !== input.networkId) return error('WALLET_DISCONNECTED', 'Conecte novamente a carteira antes de confirmar.', 409)
    const timeoutAfterCreate = scenario.nextCreateFailure === 'timeout-after-create'
    if (timeoutAfterCreate) writeCheckoutScenario({ ...scenario, nextCreateFailure: null })

    const id = `order-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const status = scenario.orderResult
    const order: Order = {
      id,
      userId: owner.id,
      idempotencyKey,
      requestFingerprint,
      status,
      version: 1,
      createdAt: now,
      updatedAt: now,
      collector: { name: input.collector.name.trim(), email: input.collector.email.trim().toLowerCase() },
      wallet: { id: wallet.id, name: wallet.name, address: wallet.address, networkId: network.id, networkName: network.name },
      cartVersion: cart.version,
      items: currentQuote.items.map((item) => ({
        itemId: item.itemId,
        nftId: item.nftId,
        nftName: item.nft?.name ?? 'NFT indisponível',
        collection: item.nft?.collection ?? 'Coleção indisponível',
        imageUrl: item.nft?.imageUrl ?? '',
        editionId: item.editionId,
        editionName: item.editionName,
        quantity: item.quantity,
        currency: item.nft?.currency ?? 'ETH',
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      totals: currentQuote.totals.filter((total) => total.subtotal !== '0'),
      transactionReference: status === 'confirmed' ? `SIM-${id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}` : null,
    }
    if (status === 'confirmed') moveInventory(order)
    saveOrders(owner.id, [...orders, order])
    if (timeoutAfterCreate) return error('TEMPORARY_FAILURE', 'A resposta do pedido não chegou. Recupere a mesma tentativa para verificar o resultado.', 504)
    return HttpResponse.json(order, { status: 201 })
  }),

  http.get('/api/orders/attempt/:idempotencyKey', ({ request, params }) => {
    const owner = ownerId(request)
    if (!owner.id) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    if (readCheckoutScenario().failOrderLookup) return error('TEMPORARY_FAILURE', 'Não foi possível consultar a tentativa agora.', 503)
    const order = readOrders(owner.id).find((item) => item.idempotencyKey === String(params.idempotencyKey))
    return order ? HttpResponse.json(order) : HttpResponse.json(null)
  }),

  http.get('/api/orders/:orderId', ({ request, params }) => {
    const owner = ownerId(request)
    if (!owner.id) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    if (readCheckoutScenario().failOrderLookup) return error('TEMPORARY_FAILURE', 'Não foi possível consultar o pedido agora.', 503)
    const order = readOrders(owner.id).find((item) => item.id === String(params.orderId))
    if (!order) return error('ORDER_NOT_FOUND', 'Este pedido não foi encontrado.', 404)
    return HttpResponse.json(order)
  }),

  http.post('/api/dev/scenarios/orders/:orderId/status', ({ request, params }) => {
    const owner = ownerId(request)
    if (!owner.id) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    const body = request.json() as Promise<{ status?: unknown }>
    return body.then((value) => {
      const nextStatus = value?.status
      if (nextStatus !== 'pending' && nextStatus !== 'confirmed' && nextStatus !== 'declined') return error('VALIDATION_ERROR', 'Estado do pedido inválido.', 422)
      const orders = readOrders(owner.id!)
      const index = orders.findIndex((item) => item.id === String(params.orderId))
      if (index < 0) return error('ORDER_NOT_FOUND', 'Este pedido não foi encontrado.', 404)
      const updated = transitionOrder(orders[index], nextStatus)
      orders[index] = updated
      saveOrders(owner.id!, orders)
      return HttpResponse.json({ order: updated, event: { type: 'order.updated', resourceId: updated.id, scopeId: owner.id, version: updated.version, updatedAt: updated.updatedAt, payload: { status: updated.status } } })
    })
  }),
]
