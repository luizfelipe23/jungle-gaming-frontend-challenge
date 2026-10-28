import type { Wallet } from '../../features/checkout/types/checkout'
import type { CollectorProfile } from '../../features/profile/types/profile'
import { walletsByUserId } from './wallets'

export type FavoriteScenario = 'favorite' | 'unfavorite' | null
export interface AccountScenario {
  profileReadFailure: boolean
  profileUpdateFailure: boolean
  passwordFailure: boolean
  walletListFailure: boolean
  walletCreateFailure: boolean
  walletUpdateFailure: boolean
  favoriteFailure: FavoriteScenario
}

export const accountScenarioKey = 'frontend-challenge:mock-account:scenario:v1'
const profilePrefix = 'frontend-challenge:mock-profile:user:'
const walletPrefix = 'frontend-challenge:mock-wallets:user:'
const favoritePrefix = 'frontend-challenge:mock-favorites:user:'

export const defaultAccountScenario: AccountScenario = {
  profileReadFailure: false,
  profileUpdateFailure: false,
  passwordFailure: false,
  walletListFailure: false,
  walletCreateFailure: false,
  walletUpdateFailure: false,
  favoriteFailure: null,
}

export function readAccountScenario(): AccountScenario {
  try {
    return { ...defaultAccountScenario, ...JSON.parse(window.localStorage.getItem(accountScenarioKey) ?? '{}') }
  } catch {
    return { ...defaultAccountScenario }
  }
}

export function defaultProfile(user: { id: string; name: string; email: string }): CollectorProfile {
  const username = user.email.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase()
  return { id: user.id, displayName: user.name, username, email: user.email, ensName: '', walletNickname: 'Minha carteira', avatarUrl: null }
}

export function readProfile(user: { id: string; name: string; email: string }): CollectorProfile {
  try {
    const value = JSON.parse(window.localStorage.getItem(`${profilePrefix}${user.id}:v1`) ?? 'null') as CollectorProfile | null
    return value?.id === user.id ? value : defaultProfile(user)
  } catch {
    return defaultProfile(user)
  }
}

export function saveProfile(profile: CollectorProfile) {
  window.localStorage.setItem(`${profilePrefix}${profile.id}:v1`, JSON.stringify(profile))
}

function cloneWallets(wallets: Wallet[]) {
  return wallets.map((wallet, index) => ({ ...wallet, networks: wallet.networks.map((network) => ({ ...network })), nickname: wallet.nickname ?? wallet.name, walletType: wallet.walletType ?? 'software' as const, profileName: wallet.profileName ?? wallet.name, ensName: wallet.ensName ?? '', email: wallet.email ?? '', referralCode: wallet.referralCode ?? '', isPrimary: wallet.isPrimary ?? index === 0 }))
}

export function getWalletsForUser(userId: string): Wallet[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(`${walletPrefix}${userId}:v1`) ?? 'null') as Wallet[] | null
    if (Array.isArray(saved)) return cloneWallets(saved)
  } catch { /* use deterministic demo wallets */ }
  return cloneWallets(walletsByUserId[userId] ?? [])
}

export function saveWalletsForUser(userId: string, wallets: Wallet[]) {
  window.localStorage.setItem(`${walletPrefix}${userId}:v1`, JSON.stringify(cloneWallets(wallets)))
}

export function readFavorites(userId: string): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(`${favoritePrefix}${userId}:v1`) ?? '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : []
  } catch { return [] }
}

export function saveFavorites(userId: string, ids: string[]) {
  window.localStorage.setItem(`${favoritePrefix}${userId}:v1`, JSON.stringify([...new Set(ids)]))
}
