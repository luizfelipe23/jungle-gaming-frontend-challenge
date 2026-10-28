import { beforeEach, describe, expect, it } from 'vitest'

import { addCartItem, applyCartCoupon, getCart, quoteCart, updateCartItem } from '../../src/features/cart/api/cartApi'
import { connectWallet, createOrder, disconnectWallet, getOrder, getOrderByAttempt, getWalletConnection, getWallets } from '../../src/features/orders/api/ordersApi'
import { quoteFingerprint } from '../../src/features/checkout/utils/quoteFingerprint'
import { loginUser } from '../../src/features/auth/api/authApi'
import { http } from '../../src/lib/api/http'
import { nftFixtures } from '../../src/mocks/data/nfts'
import type { CreateOrderInput } from '../../src/features/checkout/types/checkout'

const initialNfts = structuredClone(nftFixtures)

beforeEach(() => {
  nftFixtures.splice(0, nftFixtures.length, ...structuredClone(initialNfts))
})

async function prepareOrder(quantity = 1) {
  const user = await loginUser({ email: 'luna@demo.kurio', password: 'Luna@Kurio2026!' })
  await addCartItem({ nftId: 'nft-001', editionId: 'standard', quantity })
  const wallet = (await getWallets())[0]
  const network = wallet.networks[0]
  const connection = await connectWallet(wallet.id, network.id)
  const quote = await quoteCart()
  const input: CreateOrderInput = {
    quoteRevision: quoteFingerprint(quote),
    cartVersion: quote.cartVersion,
    walletId: wallet.id,
    networkId: network.id,
    connectionId: connection.connectionId!,
    collector: { name: user.name, email: user.email },
  }
  return { user, wallet, network, input }
}

async function configureScenario(scenario: Record<string, unknown>) {
  await http.post('/dev/scenarios/checkout', scenario)
}

describe('Pedidos e checkout', () => {
  it('retorna o mesmo pedido para a mesma chave e recusa a chave reutilizada com outro conteúdo', async () => {
    const { input } = await prepareOrder()
    const key = 'attempt-idempotency-same-content'
    const first = await createOrder(input, key)
    const repeated = await createOrder(input, key)

    expect(repeated.id).toBe(first.id)
    await expect(createOrder({ ...input, collector: { ...input.collector, name: 'Outro nome' } }, key)).rejects.toMatchObject({ response: { status: 409, data: { code: 'IDEMPOTENCY_CONFLICT' } } })
  })

  it('recupera o pedido criado quando a primeira resposta simula timeout', async () => {
    const { input } = await prepareOrder()
    const key = 'attempt-timeout-recovery'
    await configureScenario({ nextCreateFailure: 'timeout-after-create' })

    await expect(createOrder(input, key)).rejects.toMatchObject({ response: { status: 504 } })
    const recovered = await getOrderByAttempt(key)
    const retried = await createOrder(input, key)
    expect(recovered?.id).toBe(retried.id)
    expect((await getOrder(retried.id)).id).toBe(retried.id)
  })

  it('preserva o carrinho em falha transitória e permite repetir a mesma tentativa', async () => {
    const { input } = await prepareOrder()
    const key = 'attempt-transient-recovery'
    await configureScenario({ nextCreateFailure: 'transient' })

    await expect(createOrder(input, key)).rejects.toMatchObject({ response: { status: 503 } })
    expect((await getCart()).items[0].quantity).toBe(1)
    const order = await createOrder(input, key)
    expect((await getOrderByAttempt(key))?.id).toBe(order.id)
  })

  it('transiciona pedido pendente para confirmado e mantém o recibo imutável', async () => {
    const { input } = await prepareOrder()
    await configureScenario({ orderResult: 'pending' })
    const pending = await createOrder(input, 'attempt-pending')
    expect(pending.status).toBe('pending')

    const response = await http.post<{ order: { status: string }; event: { type: string; version: number } }>(`/dev/scenarios/orders/${pending.id}/status`, { status: 'confirmed' })
    expect(response.data.order.status).toBe('confirmed')
    expect(response.data.event).toMatchObject({ type: 'order.updated', version: 2 })
    const confirmed = await getOrder(pending.id)
    expect(confirmed.transactionReference).toMatch(/^SIM-/)

    nftFixtures[0].editions![0].price = '99'
    expect((await getOrder(pending.id)).items[0].unitPrice).toBe('1.85')
    await http.post(`/dev/scenarios/orders/${pending.id}/status`, { status: 'declined' })
    expect((await getOrder(pending.id)).status).toBe('confirmed')
  })

  it('remove somente a quantidade comprada do carrinho e torna o consumo idempotente', async () => {
    const { input } = await prepareOrder(2)
    const order = await createOrder(input, 'attempt-partial-cart-consume')
    await updateCartItem('nft-001::standard', 3)

    const { consumeOrderItems } = await import('../../src/features/cart/api/cartApi')
    const first = await consumeOrderItems(order.id)
    expect(first.cart.items).toEqual([expect.objectContaining({ nftId: 'nft-001', quantity: 1 })])
    const second = await consumeOrderItems(order.id)
    expect(second.cart.items[0].quantity).toBe(1)
  })

  it('isola pedidos e carteiras por usuário', async () => {
    const { input } = await prepareOrder()
    await configureScenario({ orderResult: 'pending' })
    const order = await createOrder(input, 'attempt-owner-isolation')
    await loginUser({ email: 'rafael@demo.kurio', password: 'Rafael@Kurio2026!' })

    await expect(getOrder(order.id)).rejects.toMatchObject({ response: { status: 404 } })
    expect((await getWallets()).map((wallet) => wallet.id)).toEqual(['wallet-rafael-primary'])
  })

  it('não trata recusa de carteira como conexão e bloqueia pedido após desconexão', async () => {
    const { input, wallet } = await prepareOrder()
    await configureScenario({ walletConnection: 'rejected' })
    await expect(connectWallet(wallet.id, 'ethereum')).rejects.toMatchObject({ response: { status: 409 } })
    await configureScenario({ walletConnection: 'success' })
    await disconnectWallet(wallet.id)

    await expect(getWalletConnection(wallet.id)).resolves.toMatchObject({ status: 'disconnected', connectionId: null })
    await expect(createOrder(input, 'attempt-disconnected-wallet')).rejects.toMatchObject({ response: { status: 409, data: { code: 'WALLET_DISCONNECTED' } } })
  })

  it('recusa uma cotação quando o cupom expira durante o checkout', async () => {
    await loginUser({ email: 'luna@demo.kurio', password: 'Luna@Kurio2026!' })
    await addCartItem({ nftId: 'nft-001', editionId: 'standard', quantity: 1 })
    await applyCartCoupon('KURIO10')
    await configureScenario({ expireCoupon: true })

    await expect(quoteCart()).rejects.toMatchObject({ response: { status: 422, data: { code: 'COUPON_EXPIRED' } } })
  })
})
