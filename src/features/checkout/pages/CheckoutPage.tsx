import { useEffect, useRef, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { formatDecimal } from '../../../lib/money'
import { useSession } from '../../auth/hooks/useSession'
import { quoteCart } from '../../cart/api/cartApi'
import { consumeOrderItems } from '../../cart/api/cartApi'
import { useCart } from '../../cart/useCart'
import { quoteFingerprint } from '../utils/quoteFingerprint'
import type { CheckoutApiError, CollectorDetails, CreateOrderInput, Wallet, WalletConnection } from '../types/checkout'
import { connectWallet, createOrder, disconnectWallet, getOrderByAttempt, getWalletConnection, getWallets } from '../../orders/api/ordersApi'
import type { Order } from '../../orders/types/order'
import type { AuthUser } from '../../auth/types/auth'
import type { CartQuote } from '../../cart/types/cart'

interface SavedAttempt {
  key: string
  input: CreateOrderInput
  safeToReplace: boolean
}

function attemptStorageKey(userId: string) {
  return `frontend-challenge:checkout:attempt:${userId}:v1`
}

function readAttempt(userId: string): SavedAttempt | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(attemptStorageKey(userId)) ?? 'null') as Partial<SavedAttempt> | null
    return value && typeof value.key === 'string' && value.input ? value as SavedAttempt : null
  } catch {
    return null
  }
}

function writeAttempt(userId: string, attempt: SavedAttempt) {
  window.localStorage.setItem(attemptStorageKey(userId), JSON.stringify(attempt))
}

function clearAttempt(userId: string) {
  window.localStorage.removeItem(attemptStorageKey(userId))
}

function changesBetween(previous: CartQuote | undefined, current: CartQuote) {
  if (!previous) return ['A cotação foi atualizada. Revise os valores antes de confirmar.']
  const changes: string[] = []
  for (const item of current.items) {
    const old = previous.items.find((entry) => entry.itemId === item.itemId)
    if (!old) changes.push(`${item.nft?.name ?? 'Um NFT'} foi adicionado à cotação.`)
    else {
      if (old.unitPrice !== item.unitPrice) changes.push(`O preço de ${item.nft?.name ?? 'um NFT'} mudou de ${old.unitPrice} para ${item.unitPrice} ${item.nft?.currency ?? ''}.`)
      if (old.availableQuantity !== item.availableQuantity || old.accepted !== item.accepted) changes.push(`A disponibilidade de ${item.nft?.name ?? 'um NFT'} foi alterada.`)
    }
  }
  if (previous.coupon?.code !== current.coupon?.code || previous.coupon?.discountBasisPoints !== current.coupon?.discountBasisPoints) changes.push('O desconto do cupom foi alterado ou expirou.')
  for (const total of current.totals) {
    const old = previous.totals.find((entry) => entry.currency === total.currency)
    if (old && old.networkFee !== total.networkFee) changes.push(`A taxa de rede em ${total.currency} foi alterada.`)
    if (old && old.total !== total.total && !changes.some((change) => change.includes('preço') || change.includes('desconto') || change.includes('taxa'))) changes.push(`O total em ${total.currency} foi alterado.`)
  }
  return changes.length ? [...new Set(changes)] : ['A cotação foi atualizada. Revise os valores antes de confirmar.']
}

function errorMessage(error: unknown) {
  if (isAxiosError<CheckoutApiError>(error)) return error.response?.data.message ?? 'Não foi possível concluir esta etapa. Seus itens continuam no carrinho.'
  return 'Não foi possível concluir esta etapa. Verifique sua conexão e tente recuperar a mesma tentativa.'
}

function formatMoney(value: string, currency: 'ETH' | 'USD') {
  return `${formatDecimal(value, currency === 'ETH' ? 8 : 2)} ${currency}`
}

export function CheckoutPage() {
  const session = useSession()
  if (session.isLoading) return <Card role="status" aria-label="Validando sessão" className="mx-auto h-80 max-w-3xl animate-pulse border-[#55321F]" />
  return session.user ? <CheckoutForm key={session.user.id} user={session.user} /> : null
}

const emptyWallets: Wallet[] = []

function CheckoutForm({ user }: { user: AuthUser }) {
  const cart = useCart()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [collector, setCollector] = useState<CollectorDetails>(() => ({ name: user.name, email: user.email }))
  const [collectorErrors, setCollectorErrors] = useState<Partial<Record<keyof CollectorDetails, string>>>({})
  const [walletId, setWalletId] = useState('')
  const [selectedConnector, setSelectedConnector] = useState('Coinbase Wallet')
  const [networkId, setNetworkId] = useState('')
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [reviewQuote, setReviewQuote] = useState<CartQuote | undefined>()
  const [acceptedFingerprint, setAcceptedFingerprint] = useState<string | null>(null)
  const [quoteChanges, setQuoteChanges] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedAttempt, setSavedAttempt] = useState<SavedAttempt | null>(() => readAttempt(user.id))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const operationPending = useRef(false)

  const walletsQuery = useQuery({
    queryKey: ['private', user.id, 'wallets'],
    queryFn: getWallets,
  })
  const wallets = walletsQuery.data ?? emptyWallets
  const selectedWallet: Wallet | undefined = wallets.find((wallet) => wallet.id === walletId) ?? wallets[0]
  const selectedNetwork = selectedWallet?.networks.find((network) => network.id === networkId) ?? selectedWallet?.networks[0]
  const connectionQuery = useQuery({
    queryKey: ['private', user.id, 'walletConnection', selectedWallet?.id],
    queryFn: () => getWalletConnection(selectedWallet!.id),
    enabled: Boolean(selectedWallet),
  })
  const liveConnection = connection ?? connectionQuery.data ?? null
  const isConnected = Boolean(liveConnection?.status === 'connected' && selectedWallet && selectedNetwork && liveConnection.walletId === selectedWallet.id && liveConnection.networkId === selectedNetwork.id)
  const currentQuote = reviewQuote ?? cart.quote
  const hasUnacceptedChanges = quoteChanges.length > 0
  const validQuote = Boolean(currentQuote?.canCheckout && currentQuote.expiresAt)

  const savedAttemptQuery = useQuery({
    queryKey: ['private', user.id, 'orderAttempt', savedAttempt?.key],
    queryFn: () => getOrderByAttempt(savedAttempt!.key),
    enabled: Boolean(savedAttempt),
    retry: false,
  })

  useEffect(() => {
    const recovered = savedAttemptQuery.data
    if (!recovered) return
    void navigate({ to: '/orders/$orderId/confirmation', params: { orderId: recovered.id } })
  }, [navigate, savedAttemptQuery.data])

  const walletMutation = useMutation({
    mutationFn: () => connectWallet(selectedWallet!.id, selectedNetwork!.id),
    onSuccess: (result) => {
      setConnection(result)
      setConnectionError(null)
      void queryClient.invalidateQueries({ queryKey: ['private', user.id, 'walletConnection', selectedWallet?.id] })
    },
    onError: (reason) => {
      setConnection({ status: 'disconnected', walletId: selectedWallet!.id, networkId: selectedNetwork!.id, connectionId: null })
      setConnectionError(errorMessage(reason))
    },
  })
  const disconnectMutation = useMutation({
    mutationFn: () => disconnectWallet(selectedWallet!.id),
    onSuccess: (result) => setConnection(result),
    onError: (reason) => setConnectionError(errorMessage(reason)),
  })
  const quoteMutation = useMutation({ mutationFn: quoteCart })
  const consumeMutation = useMutation({
    mutationFn: (orderId: string) => consumeOrderItems(orderId),
    onSuccess: ({ cart: updatedCart }) => {
      queryClient.setQueryData(['cart', `user:${user.id}`], updatedCart)
      void queryClient.invalidateQueries({ queryKey: ['cartQuote', `user:${user.id}`] })
    },
  })

  async function navigateToOrder(order: Order) {
    if (order.status === 'confirmed' && !consumeMutation.isPending) {
      try { await consumeMutation.mutateAsync(order.id) } catch { /* Order receipts remain authoritative and the cart can be retried later. */ }
    }
    await navigate({ to: '/orders/$orderId/confirmation', params: { orderId: order.id } })
  }

  function validateCollector() {
    const next: Partial<Record<keyof CollectorDetails, string>> = {}
    if (collector.name.trim().length < 2) next.name = 'Informe seu nome completo.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collector.email.trim())) next.email = 'Informe um e-mail válido.'
    setCollectorErrors(next)
    return Object.keys(next).length === 0
  }

  async function revalidateQuote() {
    setError(null)
    if (!validateCollector()) return
    try {
      const fresh = await quoteMutation.mutateAsync()
      const previous = currentQuote
      setReviewQuote(fresh)
      if (!fresh.canCheckout) {
        setAcceptedFingerprint(null)
        setQuoteChanges(['Há itens indisponíveis ou com quantidade acima do estoque. Ajuste o carrinho antes de continuar.'])
        return
      }
      if (previous && quoteFingerprint(previous) !== quoteFingerprint(fresh)) {
        setAcceptedFingerprint(null)
        setQuoteChanges(changesBetween(previous, fresh))
      } else {
        setAcceptedFingerprint(quoteFingerprint(fresh))
        setQuoteChanges([])
      }
    } catch (reason) {
      setAcceptedFingerprint(null)
      setError(errorMessage(reason))
    }
  }

  function acceptUpdatedQuote() {
    if (!reviewQuote?.canCheckout) return
    setAcceptedFingerprint(quoteFingerprint(reviewQuote))
    setQuoteChanges([])
  }

  async function startOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (operationPending.current || !validateCollector()) return
    if (savedAttempt && !savedAttempt.safeToReplace) {
      setError('Existe uma tentativa anterior cujo resultado ainda não foi esclarecido. Recupere essa tentativa antes de iniciar outra compra.')
      return
    }
    if (!isConnected || !liveConnection?.connectionId || !selectedWallet || !selectedNetwork) {
      setConnectionError('Conecte a carteira selecionada antes de confirmar o pedido.')
      return
    }
    if (!acceptedFingerprint || hasUnacceptedChanges) {
      setError('Revalide e confirme explicitamente os valores atuais antes de continuar.')
      return
    }

    operationPending.current = true
    setIsSubmitting(true)
    setError(null)
    let activeAttempt: SavedAttempt | null = null
    try {
      const fresh = await quoteCart()
      if (!fresh.canCheckout) {
        setReviewQuote(fresh)
        setQuoteChanges(['Há itens indisponíveis ou com quantidade acima do estoque. Ajuste o carrinho antes de continuar.'])
        setAcceptedFingerprint(null)
        return
      }
      if (quoteFingerprint(fresh) !== acceptedFingerprint) {
        setReviewQuote(fresh)
        setQuoteChanges(changesBetween(reviewQuote ?? cart.quote, fresh))
        setAcceptedFingerprint(null)
        return
      }

      const input: CreateOrderInput = {
        quoteRevision: acceptedFingerprint,
        cartVersion: fresh.cartVersion,
        walletId: selectedWallet.id,
        networkId: selectedNetwork.id,
        connectionId: liveConnection.connectionId,
        collector: { name: collector.name.trim(), email: collector.email.trim() },
      }
      const attempt: SavedAttempt = savedAttempt?.safeToReplace
        ? { key: crypto.randomUUID(), input, safeToReplace: false }
        : savedAttempt ?? { key: crypto.randomUUID(), input, safeToReplace: false }
      activeAttempt = attempt
      if (!savedAttempt || savedAttempt.safeToReplace) setSavedAttempt(attempt)
      writeAttempt(user.id, attempt)
      const order = await createOrder(attempt.input, attempt.key)
      await navigateToOrder(order)
    } catch (reason) {
      if (isAxiosError<CheckoutApiError>(reason)) {
        const latestQuote = reason.response?.data.quote
        if (latestQuote) {
          setReviewQuote(latestQuote)
          setQuoteChanges(changesBetween(reviewQuote ?? cart.quote, latestQuote))
          setAcceptedFingerprint(null)
          const previousAttempt = activeAttempt ?? savedAttempt
          if (previousAttempt) {
            const obsoleteAttempt = { ...previousAttempt, safeToReplace: true }
            setSavedAttempt(obsoleteAttempt)
            writeAttempt(user.id, obsoleteAttempt)
          }
        } else if (['WALLET_DISCONNECTED', 'WALLET_NOT_FOUND', 'VALIDATION_ERROR'].includes(reason.response?.data.code ?? '')) {
          const rejectedAttempt = activeAttempt ? { ...activeAttempt, safeToReplace: true } : savedAttempt ? { ...savedAttempt, safeToReplace: true } : null
          if (rejectedAttempt) {
            setSavedAttempt(rejectedAttempt)
            writeAttempt(user.id, rejectedAttempt)
          }
          setConnection(null)
          void connectionQuery.refetch()
        }
      }
      setError(errorMessage(reason))
    } finally {
      operationPending.current = false
      setIsSubmitting(false)
    }
  }

  async function recoverAttempt() {
    if (!savedAttempt || operationPending.current) return
    operationPending.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      const order = await getOrderByAttempt(savedAttempt.key)
      if (order) {
        await navigateToOrder(order)
        return
      }
      if (savedAttempt.safeToReplace) {
        clearAttempt(user.id)
        setSavedAttempt(null)
        setError('A tentativa anterior não criou um pedido. Revise novamente a cotação e inicie uma nova tentativa.')
        return
      }
      const repeated = await createOrder(savedAttempt.input, savedAttempt.key)
      await navigateToOrder(repeated)
    } catch (reason) {
      setError(`Não foi possível esclarecer o resultado da tentativa. A chave foi preservada para repetir a recuperação. ${errorMessage(reason)}`)
    } finally {
      operationPending.current = false
      setIsSubmitting(false)
    }
  }

  const formSubmitBlocked = cart.isLoading || cart.isQuoteLoading || !validQuote || !isConnected || walletMutation.isPending || disconnectMutation.isPending || quoteMutation.isPending || Boolean(savedAttempt && !savedAttempt.safeToReplace)
  const totals = currentQuote?.totals ?? []

  return <>
  <form onSubmit={(event) => void startOrder(event)} className="flex min-h-[100dvh] flex-col justify-between bg-[#140D0A] px-7 pb-8 pt-8 lg:hidden">
    <div>
      <header className="relative mb-7 flex h-10 items-center justify-center"><Link to="/cart" aria-label="Voltar ao carrinho" className="absolute left-0 flex h-[35px] w-[35px] items-center justify-center rounded-full border border-[#3F2319] bg-[#2F1D15] text-[#B39463]"><ArrowLeft className="h-4 w-4"/></Link><h1 className="text-[18px] font-bold">Pagamento com carteira</h1></header>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-[15px] font-bold">Carteira conectada</h2><Link to="/wallets" className="text-sm font-bold text-[#E89B55]">Trocar carteira</Link></div>
      <div className="space-y-5">{wallets.slice(0, 2).map((wallet, index) => <button key={wallet.id} type="button" onClick={() => { setWalletId(wallet.id); setNetworkId(''); setConnection(null) }} className="flex min-h-[93px] w-full items-center gap-4 rounded-[18px] bg-[#241612] px-5 text-left"><span className={`h-4 w-4 rounded-full border-2 ${selectedWallet?.id === wallet.id ? 'border-[#D28A4C] after:ml-[3px] after:mt-[3px] after:block after:h-1.5 after:w-1.5 after:rounded-full after:bg-[#D28A4C]' : 'border-[#55321F]'}`}/><span className="min-w-0 flex-1"><strong className="block text-[15px]">{index === 0 ? 'Reserva' : 'Principal'}</strong><span className="mt-1 block truncate text-sm text-[#B39463]">{wallet.ensName || wallet.address}</span><span className="mt-1 block text-sm text-[#B39463]">Rede {wallet.networks[0]?.name}</span></span><span className="text-xl text-[#B39463]">⋮</span></button>)}</div>
      {!wallets.length && <p className="rounded-xl bg-[#241612] p-5 text-sm text-[#CFB28C]">Adicione uma carteira ao seu perfil para pagar.</p>}
      <h2 className="mb-3 mt-4 text-[15px] font-bold">Carteira e rede</h2>
      <div className="space-y-4">{['WalletConnect', 'MetaMask', 'Coinbase Wallet'].map((provider) => <button key={provider} type="button" onClick={() => { setSelectedConnector(provider); if (!isConnected && selectedWallet && selectedNetwork) walletMutation.mutate() }} className="flex h-[65px] w-full items-center gap-3 rounded-[18px] bg-[#241612] px-4 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3F2319] bg-[#2F1D15] text-xs text-[#D28A4C]">{provider[0]}</span><span className="flex-1 text-sm">{provider}</span><span className={`h-4 w-4 rounded-full border-2 ${selectedConnector === provider ? 'border-[#D28A4C] after:ml-[3px] after:mt-[3px] after:block after:h-1.5 after:w-1.5 after:rounded-full after:bg-[#D28A4C]' : 'border-[#55321F]'}`}/></button>)}</div>
      {connectionError && <p role="alert" className="mt-3 text-xs text-red-200">{connectionError}</p>}{error && <p role="alert" className="mt-3 text-xs text-red-200">{error}</p>}
      <div className="mt-4 flex justify-end gap-3 text-[16px] font-bold">Total: <strong className="text-[#E89B55]">{totals[0] ? formatMoney(totals[0].total, totals[0].currency) : '—'}</strong></div>
    </div>
    <Button type={isConnected && acceptedFingerprint ? 'submit' : 'button'} onClick={() => { if (!isConnected && selectedWallet && selectedNetwork) walletMutation.mutate(); else if (!acceptedFingerprint) void revalidateQuote() }} disabled={isSubmitting || quoteMutation.isPending || !selectedWallet || Boolean(savedAttempt && !savedAttempt.safeToReplace)} className="h-[60px] w-full rounded-full text-sm font-bold">{isSubmitting ? 'Enviando…' : !isConnected ? walletMutation.isPending ? 'Conectando…' : 'Confirmar compra' : !acceptedFingerprint ? quoteMutation.isPending ? 'Atualizando…' : 'Confirmar compra' : 'Confirmar compra'}</Button>
  </form>
  <section className="mx-auto hidden max-w-[1200px] space-y-7 sm:space-y-9 lg:block" aria-labelledby="checkout-title">
    <nav aria-label="Breadcrumb" className="mb-3 hidden text-sm font-bold lg:block"><Link to="/" className="hover:text-[#E89B55]">Início</Link><span className="px-2">/</span><Link to="/" className="hover:text-[#E89B55]">Mercado</Link><span className="px-2">/</span><span>Pagamento</span></nav>
    <header className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E89B55] lg:hidden">Finalização segura</p>
      <h1 id="checkout-title" className="text-2xl font-bold text-[#F5F1EB] sm:text-3xl lg:hidden">Pagamento</h1>
      <p className="text-xs leading-6 text-[#CFB28C] lg:hidden">Confira seus dados, conecte uma carteira simulada e revise a cotação antes de enviar o pedido.</p>
    </header>

    {savedAttempt && <Card className="space-y-3 border-amber-300/30 p-4" role="status">
      <p className="text-sm font-semibold text-amber-100">Há uma tentativa de compra que ainda precisa ser recuperada.</p>
      <p className="text-xs leading-5 text-[#CFB28C]">A mesma chave será reutilizada para consultar ou repetir a operação com segurança. Nenhum item foi removido do carrinho.</p>
      {savedAttemptQuery.isError && <p role="alert" className="text-xs text-red-200">A consulta da tentativa falhou; os dados foram preservados.</p>}
      <Button type="button" onClick={() => void recoverAttempt()} disabled={savedAttemptQuery.isFetching || isSubmitting} className="min-h-10">{savedAttemptQuery.isFetching ? 'Consultando tentativa…' : 'Recuperar tentativa anterior'}</Button>
    </Card>}

    {error && <div role="alert" className="rounded-lg border border-red-300/30 bg-red-950/30 p-4 text-sm text-red-100">{error}</div>}
    {quoteMutation.isError && isAxiosError<CheckoutApiError>(quoteMutation.error) && quoteMutation.error.response?.data.code === 'COUPON_EXPIRED' && <Card className="space-y-3 border-amber-300/30 p-4" role="alert">
      <p className="text-sm text-amber-100">O cupom expirou durante a revisão. Remova o cupom do carrinho para consultar uma nova cotação.</p>
      <Button type="button" variant="outline" onClick={() => void cart.removeCoupon()}>Remover cupom expirado</Button>
    </Card>}

    {cart.isLoading || walletsQuery.isLoading ? <Card role="status" aria-label="Carregando checkout" className="h-96 animate-pulse border-[#55321F]" /> : cart.itemCount === 0 ? <Card className="space-y-4 p-8 text-center">
      <h2 className="text-lg font-bold">Seu carrinho está vazio</h2><p className="text-sm text-[#CFB28C]">Adicione uma obra antes de iniciar o checkout.</p><Link to="/" className="text-sm text-[#E89B55] underline">Voltar ao catálogo</Link>
    </Card> : <form onSubmit={(event) => void startOrder(event)} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_405px] lg:gap-8">
      <div className="space-y-5">
        <Card className="space-y-5 border-[#55321F] p-5 sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E89B55]">01 · Colecionador</p><h2 className="mt-2 text-lg font-bold">Seus dados</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><label htmlFor="collector-name" className="text-xs font-semibold text-[#CFB28C]">Nome completo</label><Input id="collector-name" autoComplete="name" value={collector.name} onChange={(event) => { const name = event.currentTarget.value; setCollector((value) => ({ ...value, name })) }} aria-invalid={Boolean(collectorErrors.name)} aria-describedby={collectorErrors.name ? 'collector-name-error' : undefined} className="border-[#55321F]" />{collectorErrors.name && <p id="collector-name-error" className="text-xs text-red-200">{collectorErrors.name}</p>}</div>
            <div className="space-y-2"><label htmlFor="collector-email" className="text-xs font-semibold text-[#CFB28C]">E-mail do recibo</label><Input id="collector-email" type="email" autoComplete="email" value={collector.email} onChange={(event) => { const email = event.currentTarget.value; setCollector((value) => ({ ...value, email })) }} aria-invalid={Boolean(collectorErrors.email)} aria-describedby={collectorErrors.email ? 'collector-email-error' : undefined} className="border-[#55321F]" />{collectorErrors.email && <p id="collector-email-error" className="text-xs text-red-200">{collectorErrors.email}</p>}</div>
          </div>
        </Card>

        <Card className="space-y-5 border-[#55321F] p-5 sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E89B55]">02 · Carteira</p><h2 className="mt-2 text-lg font-bold">Selecione como pagar</h2><p className="mt-1 text-xs text-[#CFB28C]">A conexão é simulada e não solicita acesso a extensões ou serviços externos.</p></div>
          {walletsQuery.isError ? <div role="alert" className="space-y-3 text-sm text-red-200"><p>Não foi possível carregar suas carteiras.</p><Button type="button" variant="outline" onClick={() => void walletsQuery.refetch()}>Tentar novamente</Button></div> : wallets.length === 0 ? <p className="text-sm text-amber-100">Sua conta ainda não tem uma carteira disponível para o checkout.</p> : <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><label htmlFor="checkout-wallet" className="text-xs font-semibold text-[#CFB28C]">Carteira</label><select id="checkout-wallet" value={selectedWallet?.id ?? ''} onChange={(event) => { setWalletId(event.currentTarget.value); setConnection(null); setConnectionError(null); setNetworkId('') }} className="h-11 w-full rounded-md border border-[#55321F] bg-[#140D0A] px-3 text-sm text-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]">{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} · {wallet.address}</option>)}</select></div>
            <div className="space-y-2"><label htmlFor="checkout-network" className="text-xs font-semibold text-[#CFB28C]">Rede</label><select id="checkout-network" value={selectedNetwork?.id ?? ''} onChange={(event) => { setNetworkId(event.currentTarget.value); setConnection(null); setConnectionError(null) }} className="h-11 w-full rounded-md border border-[#55321F] bg-[#140D0A] px-3 text-sm text-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]">{selectedWallet?.networks.map((network) => <option key={network.id} value={network.id}>{network.name} · {network.currency}</option>)}</select></div>
          </div>}
          {selectedWallet && selectedNetwork && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#55321F] bg-[#140D0A] p-4">
            <div><p className="text-xs font-semibold text-[#F5F1EB]">{isConnected ? 'Carteira conectada' : walletMutation.isPending ? 'Conectando carteira…' : 'Carteira desconectada'}</p><p className="mt-1 text-[10px] text-[#CFB28C]">{selectedWallet.address} · {selectedNetwork.name}</p></div>
            {isConnected ? <Button type="button" variant="outline" disabled={disconnectMutation.isPending} onClick={() => { setConnection(null); disconnectMutation.mutate() }}>Desconectar</Button> : <Button type="button" disabled={walletMutation.isPending || !selectedNetwork} onClick={() => { setConnectionError(null); walletMutation.mutate() }}>{walletMutation.isPending ? 'Conectando…' : 'Conectar carteira'}</Button>}
          </div>}
          {connectionError && <p role="alert" className="text-xs text-red-200">{connectionError}</p>}
        </Card>

        <Card className="space-y-4 border-[#55321F] p-5 sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E89B55]">03 · Revisão</p><h2 className="mt-2 text-lg font-bold">Itens desta compra</h2></div>
          <ul aria-label="Itens da compra" className="divide-y divide-[#3F2319]">{currentQuote?.items.map((item) => <li key={item.itemId} className="flex items-center gap-3 py-3">
            {item.nft?.imageUrl && <img src={item.nft.imageUrl} alt="" className="h-14 w-14 rounded-md object-cover" />}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.nft?.name ?? 'NFT indisponível'}</p><p className="mt-1 text-[10px] text-[#CFB28C]">{item.editionName ?? item.nft?.collection} · quantidade {item.quantity}</p></div>
            <p className="text-right text-xs font-semibold text-[#E89B55]">{formatMoney(item.lineTotal, item.nft?.currency ?? 'ETH')}</p>
          </li>)}</ul>
        </Card>
      </div>

      <Card className="space-y-5 border-[#55321F] p-5 sm:p-6 lg:sticky lg:top-24 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E89B55]">Resumo final</p><h2 className="mt-2 text-lg font-bold">Cotação atual</h2></div>
        {totals.length ? <div className="space-y-4 border-y border-[#3F2319] py-4 text-xs text-[#CFB28C]">{totals.filter((total) => total.subtotal !== '0').map((total) => <section key={total.currency} aria-label={`Resumo ${total.currency}`} className="space-y-2">
          <div className="flex justify-between gap-3"><span>Subtotal</span><span>{formatMoney(total.subtotal, total.currency)}</span></div>
          {total.discount !== '0' && <div className="flex justify-between gap-3"><span>Desconto</span><span>−{formatMoney(total.discount, total.currency)}</span></div>}
          <div className="flex justify-between gap-3"><span>Taxas de rede</span><span>{formatMoney(total.networkFee, total.currency)}</span></div>
          <div className="flex justify-between gap-3 border-t border-[#3F2319] pt-2 text-sm font-bold text-[#F5F1EB]"><span>Total</span><span>{formatMoney(total.total, total.currency)}</span></div>
        </section>)}</div> : <p role="status" className="text-xs text-[#CFB28C]">A cotação será consultada pela API.</p>}
        {currentQuote?.coupon && <p className="text-xs text-emerald-200">Cupom {currentQuote.coupon.code} aplicado.</p>}
        {quoteChanges.length > 0 && <div role="alert" className="space-y-2 rounded-lg border border-amber-300/30 bg-amber-950/20 p-3 text-xs text-amber-100"><p className="font-semibold">A cotação mudou. Confira e aceite os valores atualizados:</p><ul className="list-disc space-y-1 pl-4">{quoteChanges.map((change) => <li key={change}>{change}</li>)}</ul></div>}
        {acceptedFingerprint && <p role="status" className="text-xs text-emerald-200">Cotação atual revisada. Ela será validada novamente ao enviar o pedido.</p>}
        <Button type="button" variant="outline" className="w-full" disabled={!isConnected || quoteMutation.isPending || cart.isLoading} onClick={() => void revalidateQuote()}>{quoteMutation.isPending ? 'Atualizando cotação…' : 'Revalidar cotação'}</Button>
        {hasUnacceptedChanges && <Button type="button" className="w-full" disabled={!reviewQuote?.canCheckout} onClick={acceptUpdatedQuote}>Aceitar cotação atualizada</Button>}
        <Button type="submit" className="w-full" disabled={formSubmitBlocked || hasUnacceptedChanges || !acceptedFingerprint || isSubmitting}>{isSubmitting ? 'Enviando pedido…' : 'Confirmar pedido'}</Button>
        <p className="text-[10px] leading-5 text-[#B39483]">Ao confirmar, a API revalida valores e estoque. A compra só será apresentada como concluída depois que o pedido retornar confirmado.</p>
        <Link to="/cart" className="block text-center text-xs text-[#CFB28C] underline">Voltar ao carrinho</Link>
      </Card>
    </form>}
  </section>
  </>
}
