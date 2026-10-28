import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { Check, Crown, Plus, WalletCards } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { useSession } from '../../auth/hooks/useSession'
import { createManagedWallet, getManagedWallets, updateManagedWallet, type ManagedWalletInput } from '../../checkout/api/walletApi'
import type { Wallet } from '../../checkout/types/checkout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const baseDraft: ManagedWalletInput = { id: '', name: '', nickname: '', address: '', networks: [{ id: 'ethereum', name: 'Ethereum', currency: 'ETH' }], walletType: 'software', profileName: '', ensName: '', email: '', referralCode: '', isPrimary: false }

function message(error: unknown) { return isAxiosError<{ message?: string }>(error) ? error.response?.data.message ?? 'Não foi possível concluir a operação.' : 'Falha de comunicação. Tente novamente.' }

function WalletForm({ initial, onCancel, onSave, busy }: { initial: ManagedWalletInput; onCancel: () => void; onSave: (input: ManagedWalletInput) => void; busy: boolean }) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const invalidCreateMetadata = !initial.id && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email ?? '') || !/^[a-z0-9-]{3,24}$/i.test(draft.referralCode ?? ''))
    if (draft.name.trim().length < 2 || (draft.nickname ?? '').trim().length < 2 || (draft.profileName ?? '').trim().length < 2 || !/^0x[a-fA-F0-9]{40}$/.test(draft.address.trim()) || !draft.networks.length || invalidCreateMetadata || (draft.ensName && !/^[a-z0-9-]+\.eth$/i.test(draft.ensName))) { setError('Preencha os campos obrigatórios. O endereço deve conter 40 caracteres hexadecimais após 0x.'); return }
    onSave({ ...draft, name: draft.name.trim(), nickname: (draft.nickname ?? '').trim(), profileName: (draft.profileName ?? '').trim(), address: draft.address.trim(), ensName: draft.ensName?.trim().toLowerCase(), email: draft.email?.trim().toLowerCase(), referralCode: draft.referralCode?.trim() })
  }
  return <form onSubmit={submit} noValidate className="space-y-5 rounded-lg border border-[#55321F] bg-[#1b100d] p-4 sm:p-5">
    <h3 className="font-bold">{initial.id ? 'Editar carteira' : 'Adicionar carteira'}</h3>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-xs">Nome de exibição *<Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.currentTarget.value })} /></label>
      <label className="space-y-2 text-xs">Apelido da carteira *<Input value={draft.nickname} onChange={(e) => setDraft({ ...draft, nickname: e.currentTarget.value })} /></label>
      <label className="space-y-2 text-xs">Rede *<select value={draft.networks[0]?.id ?? ''} onChange={(e) => setDraft({ ...draft, networks: e.currentTarget.value === 'polygon' ? [{ id: 'polygon', name: 'Polygon', currency: 'USD' }] : [{ id: 'ethereum', name: 'Ethereum', currency: 'ETH' }] })} className="h-10 w-full rounded-md border border-[#55321F] bg-[#140D0A] px-3 text-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]"><option value="ethereum">Ethereum</option><option value="polygon">Polygon</option></select></label>
      <label className="space-y-2 text-xs">Tipo de carteira *<select value={draft.walletType} onChange={(e) => setDraft({ ...draft, walletType: e.currentTarget.value as Wallet['walletType'] })} className="h-10 w-full rounded-md border border-[#55321F] bg-[#140D0A] px-3 text-[#F5F1EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]"><option value="software">Software</option><option value="hardware">Hardware</option></select></label>
      <label className="space-y-2 text-xs">Endereço da carteira *<Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.currentTarget.value })} placeholder="0x…" autoComplete="off" /></label>
      <label className="space-y-2 text-xs">Nome do perfil *<Input value={draft.profileName} onChange={(e) => setDraft({ ...draft, profileName: e.currentTarget.value })} /></label>
      <label className="space-y-2 text-xs">E-mail *<Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.currentTarget.value })} /></label>
      <label className="space-y-2 text-xs">Código de indicação *<Input value={draft.referralCode} onChange={(e) => setDraft({ ...draft, referralCode: e.currentTarget.value })} /></label>
      <label className="space-y-2 text-xs sm:col-span-2">Nome ENS (opcional)<Input value={draft.ensName} onChange={(e) => setDraft({ ...draft, ensName: e.currentTarget.value })} placeholder="nome.eth" /></label>
    </div>
    {error && <p role="alert" className="text-xs text-red-200">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? 'Salvando…' : initial.id ? 'Salvar alterações' : 'Salvar carteira'}</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button></div>
  </form>
}

export function WalletsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const queryKey = ['private', user!.id, 'wallets'] as const
  const walletsQuery = useQuery({ queryKey, queryFn: getManagedWallets })
  const [editing, setEditing] = useState<ManagedWalletInput | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const saveMutation = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ManagedWalletInput }) => id ? updateManagedWallet(id, input) : createManagedWallet(input),
    onSuccess: async () => { setEditing(null); setError(''); setNotice('Carteira salva com sucesso.'); await queryClient.invalidateQueries({ queryKey }) },
    onError: (reason) => { setNotice(''); setError(message(reason)) },
  })
  const primaryMutation = useMutation({ mutationFn: (wallet: Wallet) => updateManagedWallet(wallet.id, { isPrimary: true }), onSuccess: async () => { setNotice('Carteira principal atualizada.'); setError(''); await queryClient.invalidateQueries({ queryKey }) }, onError: (reason) => setError(message(reason)) })
  const wallets = walletsQuery.data ?? []

  return <div className="mx-auto max-w-[1080px] space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E89B55]">Conta</p><h1 className="mt-2 text-2xl font-bold">Carteiras</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#CFB28C]">As carteiras cadastradas ficam disponíveis durante o pagamento e para receber NFTs comprados.</p></div><Button type="button" onClick={() => { setEditing({ ...baseDraft, networks: [...baseDraft.networks] }); setError(''); setNotice('') }} className="gap-2"><Plus aria-hidden="true" className="h-4 w-4" />Adicionar</Button></header>
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-950/20 p-3 text-sm text-red-200">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-200">{notice}</p>}
    {walletsQuery.isPending ? <Card role="status" aria-label="Carregando carteiras" className="h-48 animate-pulse border-[#55321F]" /> : walletsQuery.isError ? <Card className="space-y-4 border-[#55321F] p-6"><p>Não foi possível carregar suas carteiras.</p><Button type="button" onClick={() => void walletsQuery.refetch()}>Tentar novamente</Button></Card> : <div className="space-y-5">
      {wallets.length === 0 && <Card className="border-[#55321F] p-6 text-sm text-[#CFB28C]">Você ainda não cadastrou uma carteira.</Card>}
      <section aria-labelledby="primary-wallet-title" className="space-y-3"><h2 id="primary-wallet-title" className="flex items-center gap-2 text-lg font-bold"><Crown aria-hidden="true" className="h-4 w-4 text-[#E89B55]" />Carteira principal</h2><div className="grid gap-4 md:grid-cols-2">{wallets.filter((wallet) => wallet.isPrimary).map((wallet) => <WalletCard key={wallet.id} wallet={wallet} onEdit={() => setEditing(toInput(wallet))} onMakePrimary={() => void primaryMutation.mutate(wallet)} busy={primaryMutation.isPending} />)}</div></section>
      <section aria-labelledby="secondary-wallet-title" className="space-y-3"><div className="flex items-center justify-between gap-4"><h2 id="secondary-wallet-title" className="text-lg font-bold">Carteiras secundárias</h2><span className="text-xs text-[#CFB28C]">{wallets.filter((wallet) => !wallet.isPrimary).length}</span></div>{wallets.filter((wallet) => !wallet.isPrimary).length ? <div className="grid gap-4 md:grid-cols-2">{wallets.filter((wallet) => !wallet.isPrimary).map((wallet) => <WalletCard key={wallet.id} wallet={wallet} onEdit={() => setEditing(toInput(wallet))} onMakePrimary={() => void primaryMutation.mutate(wallet)} busy={primaryMutation.isPending} />)}</div> : <Card className="border-[#55321F] p-5 text-sm text-[#B39483]">Você ainda não adicionou uma carteira secundária.</Card>}</section>
      {editing && <WalletForm key={editing.id || 'new'} initial={editing} onCancel={() => setEditing(null)} busy={saveMutation.isPending} onSave={(input) => { setError(''); setNotice(''); saveMutation.mutate({ ...(editing.id ? { id: editing.id } : {}), input }) }} />}
    </div>}
  </div>
}

function toInput(wallet: Wallet): ManagedWalletInput { return { id: wallet.id, name: wallet.name, nickname: wallet.nickname ?? wallet.name, address: wallet.address, networks: wallet.networks, walletType: wallet.walletType ?? 'software', profileName: wallet.profileName ?? wallet.name, ensName: wallet.ensName ?? '', email: wallet.email ?? '', referralCode: wallet.referralCode ?? '', isPrimary: Boolean(wallet.isPrimary) } }

function WalletCard({ wallet, onEdit, onMakePrimary, busy }: { wallet: Wallet; onEdit: () => void; onMakePrimary: () => void; busy: boolean }) {
  return <Card className="space-y-4 border-[#55321F] p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D28A4C]/15 text-[#E89B55]"><WalletCards aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate font-bold">{wallet.name}</h3><p className="truncate text-xs text-[#CFB28C]">{wallet.nickname}</p></div></div>{wallet.isPrimary && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#D28A4C]/40 px-2 py-1 text-[10px] text-[#E89B55]"><Check aria-hidden="true" className="h-3 w-3" />Principal</span>}</div><dl className="space-y-2 text-xs"><div><dt className="text-[#B39483]">Endereço</dt><dd className="mt-1 break-all font-mono text-[#F5F1EB]">{wallet.address}</dd></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-[#CFB28C]"><span>{wallet.networks.map((network) => network.name).join(', ')}</span><span>{wallet.walletType === 'hardware' ? 'Hardware' : 'Software'}</span>{wallet.ensName && <span>{wallet.ensName}</span>}</div></dl><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={onEdit}>Editar</Button>{!wallet.isPrimary && <Button type="button" variant="ghost" onClick={onMakePrimary} disabled={busy}>Tornar principal</Button>}</div></Card>
}
