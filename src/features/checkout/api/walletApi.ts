import { http } from '../../../lib/api/http'
import type { Wallet } from '../types/checkout'

export type ManagedWalletInput = Omit<Wallet, 'id'> & { id?: string }

export async function getManagedWallets() {
  return (await http.get<Wallet[]>('/wallets')).data
}

export async function createManagedWallet(input: ManagedWalletInput) {
  return (await http.post<Wallet>('/wallets', input)).data
}

export async function updateManagedWallet(walletId: string, input: Partial<ManagedWalletInput>) {
  return (await http.patch<Wallet>(`/wallets/${encodeURIComponent(walletId)}`, input)).data
}
