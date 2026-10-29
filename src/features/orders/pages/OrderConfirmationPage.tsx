import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { formatDecimal } from '../../../lib/money'
import { realtimeClient } from '../../../lib/realtime/socket-client'
import { useSession } from '../../auth/hooks/useSession'
import { consumeOrderItems } from '../../cart/api/cartApi'
import type { CartState } from '../../cart/types/cart'
import { getOrder } from '../api/ordersApi'
import type { Order } from '../types/order'

function attemptStorageKey(userId: string) {
  return `frontend-challenge:checkout:attempt:${userId}:v1`
}

function money(value: string, currency: 'ETH' | 'USD') {
  return `${formatDecimal(value, currency === 'ETH' ? 8 : 2)} ${currency}`
}

const statusLabel = { pending: 'Pedido pendente', confirmed: 'Compra confirmada', declined: 'Pagamento recusado' } as const

export function OrderConfirmationPage() {
  const { orderId } = useParams({ from: '/app/orders/$orderId/confirmation' })
  const session = useSession()
  const queryClient = useQueryClient()
  const lastVersion = useRef({ orderId, version: 0 })
  const consumeStarted = useRef<string | null>(null)
  const orderQuery = useQuery<Order>({
    queryKey: ['private', session.user?.id, 'orders', orderId],
    queryFn: () => getOrder(orderId),
    enabled: Boolean(session.user),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => query.state.data?.status === 'pending' ? 2500 : false,
    structuralSharing: (previous, incoming) => {
      const previousOrder = previous as Order | undefined
      const incomingOrder = incoming as Order
      if (!previousOrder) return incomingOrder
      if (previousOrder.status !== 'pending') return previousOrder
      return incomingOrder.version < previousOrder.version ? previousOrder : incomingOrder
    },
  })
  const consumeMutation = useMutation({
    mutationFn: consumeOrderItems,
    retry: 1,
    onSuccess: ({ cart }) => {
      if (session.user) queryClient.setQueryData<CartState>(['cart', `user:${session.user.id}`], cart)
      void queryClient.invalidateQueries({ queryKey: ['cartQuote', `user:${session.user?.id}`] })
    },
  })

  useEffect(() => {
    if (lastVersion.current.orderId !== orderId) lastVersion.current = { orderId, version: 0 }
    if (orderQuery.data) lastVersion.current.version = Math.max(lastVersion.current.version, orderQuery.data.version)
  }, [orderId, orderQuery.data])

  useEffect(() => {
    const invalidate = (event: { type: string; resourceId: string; scopeId?: string; version: number }) => {
      if (event.type !== 'order.updated' || event.scopeId !== session.user?.id || event.resourceId !== orderId || !Number.isSafeInteger(event.version) || event.version <= lastVersion.current.version) return
      lastVersion.current.version = event.version
      void queryClient.invalidateQueries({ queryKey: ['private', session.user?.id, 'orders', orderId] })
    }
    const unsubscribeEvent = realtimeClient.onEvent<{ status: Order['status'] }>('order.updated', invalidate)
    const unsubscribeConnection = realtimeClient.onConnection(() => {
      void queryClient.invalidateQueries({ queryKey: ['private', session.user?.id, 'orders', orderId] })
    })
    return () => {
      unsubscribeEvent()
      unsubscribeConnection()
    }
  }, [orderId, queryClient, session.user?.id])

  useEffect(() => {
    const order = orderQuery.data
    if (!order || !session.user || order.status === 'pending') return
    try {
      const storageKey = attemptStorageKey(session.user.id)
      const attempt = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null') as { key?: string } | null
      if (attempt?.key === order.idempotencyKey) window.localStorage.removeItem(storageKey)
    } catch {
      // Persisted recovery data is optional once the REST API reports a terminal order state.
    }
    if (order.status === 'confirmed' && consumeStarted.current !== order.id) {
      consumeStarted.current = order.id
      consumeMutation.mutate(order.id)
    }
  }, [consumeMutation, orderQuery.data, session.user])

  if (orderQuery.isPending) return <Card role="status" aria-label="Carregando pedido" className="mx-auto h-80 max-w-3xl animate-pulse border-[#55321F]" />
  if (orderQuery.isError) return <section className="mx-auto max-w-3xl space-y-5" aria-labelledby="order-error-title">
    <Card className="space-y-4 border-[#55321F] p-6 sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E89B55]">Consulta do pedido</p>
      <h1 id="order-error-title" className="text-2xl font-bold">Não foi possível consultar este pedido</h1>
      <p role="alert" className="text-sm leading-6 text-[#CFB28C]">Não é possível concluir que a compra foi recusada por causa de uma falha de comunicação. O carrinho permanece preservado.</p>
      <div className="flex flex-wrap gap-3"><Button type="button" onClick={() => void orderQuery.refetch()}>Tentar novamente</Button><Link to="/cart" className="inline-flex min-h-10 items-center text-sm text-[#E89B55] underline">Voltar ao carrinho</Link></div>
    </Card>
  </section>

  const order = orderQuery.data
  if (!order) return <Card role="alert" className="mx-auto max-w-3xl space-y-4 border-[#55321F] p-8"><h1 className="text-2xl font-bold">Pedido não encontrado</h1><p className="text-sm text-[#CFB28C]">O pedido não existe ou não está disponível para esta conta.</p><Link to="/cart" className="text-sm text-[#E89B55] underline">Voltar ao carrinho</Link></Card>

  const isConfirmed = order.status === 'confirmed'
  const isDeclined = order.status === 'declined'

  return <section className="mx-auto max-w-4xl space-y-6 lg:fixed lg:inset-0 lg:z-50 lg:flex lg:items-center lg:justify-center lg:overflow-y-auto lg:bg-[#140D0A] lg:px-4 lg:py-8" aria-labelledby="order-title">
    <div className="w-full space-y-6 lg:max-w-[578px] lg:space-y-0 lg:bg-[#241612] lg:shadow-none">
    <Card className="space-y-5 border-[#55321F] p-5 sm:p-8 lg:space-y-4 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-b-[#D28A4C] lg:bg-transparent lg:px-11 lg:pb-4 lg:pt-7 lg:shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E89B55]">{isConfirmed ? 'Recibo digital' : isDeclined ? 'Resultado do pagamento' : 'Acompanhamento'}</p><h1 id="order-title" className="text-2xl font-bold sm:text-3xl">{statusLabel[order.status]}</h1><p className="text-sm text-[#CFB28C]">Pedido <span className="font-mono text-[#F5F1EB]">{order.id}</span></p></div>
        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${isConfirmed ? 'border-emerald-300/30 text-emerald-200' : isDeclined ? 'border-red-300/30 text-red-200' : 'border-amber-300/30 text-amber-100'}`}>{statusLabel[order.status]}</span>
      </div>
      {order.status === 'pending' && <p role="status" aria-live="polite" className="rounded-lg border border-amber-300/25 bg-amber-950/15 p-4 text-sm leading-6 text-amber-100">O pagamento ainda está sendo processado. Esta página consulta a API periodicamente e também acompanha atualizações Socket.IO. Você pode sair e voltar depois; o estado será recuperado pelo pedido.</p>}
      {isDeclined && <p role="alert" className="rounded-lg border border-red-300/25 bg-red-950/20 p-4 text-sm leading-6 text-red-100">O pagamento foi recusado pela simulação. Seus itens continuam no carrinho e você pode revisar o pedido e tentar novamente.</p>}
      {isConfirmed && <p role="status" className="rounded-lg border border-emerald-300/25 bg-emerald-950/15 p-4 text-sm leading-6 text-emerald-100">A API confirmou esta compra. O recibo abaixo registra os valores aceitos no momento do pedido.</p>}
      <dl className="grid gap-3 text-xs sm:grid-cols-2"><div className="rounded-lg border border-[#3F2319] bg-[#140D0A] p-3"><dt className="text-[#CFB28C]">Data do pedido</dt><dd className="mt-1 text-[#F5F1EB]">{new Date(order.createdAt).toLocaleString('pt-BR')}</dd></div><div className="rounded-lg border border-[#3F2319] bg-[#140D0A] p-3"><dt className="text-[#CFB28C]">Carteira e rede</dt><dd className="mt-1 text-[#F5F1EB]">{order.wallet.name} · {order.wallet.networkName} · {order.wallet.address}</dd></div><div className="rounded-lg border border-[#3F2319] bg-[#140D0A] p-3"><dt className="text-[#CFB28C]">Colecionador</dt><dd className="mt-1 text-[#F5F1EB]">{order.collector.name} · {order.collector.email}</dd></div>{order.transactionReference && <div className="rounded-lg border border-[#3F2319] bg-[#140D0A] p-3"><dt className="text-[#CFB28C]">Referência de transação simulada</dt><dd className="mt-1 break-all font-mono text-[#E89B55]">{order.transactionReference}</dd></div>}</dl>
    </Card>

    <Card className="space-y-4 border-[#55321F] p-5 sm:p-7 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-11 lg:pb-12 lg:pt-5 lg:shadow-none">
      <h2 className="text-lg font-bold">Itens registrados no pedido</h2>
      <ul aria-label="Itens registrados no pedido" className="divide-y divide-[#3F2319]">{order.items.map((item) => <li key={item.itemId} className="flex items-center gap-3 py-4">
        {item.imageUrl && <img src={item.imageUrl} alt={`Arte de ${item.nftName}`} className="h-16 w-16 rounded-md object-cover" />}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.nftName}</p><p className="mt-1 text-[10px] text-[#CFB28C]">{item.collection}{item.editionName ? ` · ${item.editionName}` : ''} · quantidade {item.quantity}</p><p className="mt-1 text-[10px] text-[#B39483]">{money(item.unitPrice, item.currency)} por unidade</p></div>
        <p className="text-right text-xs font-semibold text-[#E89B55]">{money(item.lineTotal, item.currency)}</p>
      </li>)}</ul>
      <div className="space-y-4 border-t border-[#3F2319] pt-4">{order.totals.map((total) => <section key={total.currency} aria-label={`Total do pedido em ${total.currency}`} className="space-y-2 text-xs text-[#CFB28C]">
        <div className="flex justify-between gap-3"><span>Subtotal</span><span>{money(total.subtotal, total.currency)}</span></div>
        {total.discount !== '0' && <div className="flex justify-between gap-3"><span>Desconto</span><span>−{money(total.discount, total.currency)}</span></div>}
        <div className="flex justify-between gap-3"><span>Taxa de rede</span><span>{money(total.networkFee, total.currency)}</span></div>
        <div className="flex justify-between gap-3 border-t border-[#3F2319] pt-2 text-sm font-bold text-[#F5F1EB]"><span>Total registrado</span><span>{money(total.total, total.currency)}</span></div>
      </section>)}</div>
      {consumeMutation.isError && isConfirmed && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/25 bg-amber-950/20 p-3 text-xs text-amber-100"><span>Compra confirmada. Não foi possível atualizar o carrinho automaticamente.</span><Button type="button" variant="outline" onClick={() => consumeMutation.mutate(order.id)}>Tentar atualizar carrinho</Button></div>}
      {consumeMutation.isPending && <p role="status" className="text-xs text-[#CFB28C]">Atualizando somente as quantidades compradas no carrinho…</p>}
      <div className="flex flex-wrap gap-3 pt-2"><Link to="/" className="inline-flex min-h-10 items-center rounded-md bg-[#D28A4C] px-4 text-sm font-semibold text-[#140D0A]">Voltar ao catálogo</Link>{(isDeclined || consumeMutation.isError) && <Link to="/cart" className="inline-flex min-h-10 items-center rounded-md border border-[#D28A4C]/70 px-4 text-sm font-semibold text-[#F5F1EB]">Revisar carrinho</Link>}</div>
    </Card>
    </div>
  </section>
}
