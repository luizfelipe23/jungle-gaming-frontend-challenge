import { http, HttpResponse } from 'msw'

import type { Wallet } from '../../features/checkout/types/checkout'
import { getWalletsForUser, readAccountScenario, saveWalletsForUser } from '../data/accountStore'
import { getMockUserFromRequest } from './authHandlers'

const validNetworkIds = ['ethereum', 'polygon']
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function error(code: string, message: string, status: number, fieldErrors?: Record<string, string>) {
  return HttpResponse.json({ code, message, ...(fieldErrors ? { fieldErrors } : {}) }, { status })
}

function validateWallet(input: Partial<Wallet>, requireAll = true) {
  const fields: Record<string, string> = {}
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const nickname = typeof input.nickname === 'string' ? input.nickname.trim() : ''
  const address = typeof input.address === 'string' ? input.address.trim() : ''
  const profileName = typeof input.profileName === 'string' ? input.profileName.trim() : ''
  const ensName = typeof input.ensName === 'string' ? input.ensName.trim().toLowerCase() : ''
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const referralCode = typeof input.referralCode === 'string' ? input.referralCode.trim() : ''
  if (name.length < 2 || name.length > 40) fields.name = 'Informe um nome de exibição entre 2 e 40 caracteres.'
  if (nickname.length < 2 || nickname.length > 32) fields.nickname = 'Informe um apelido entre 2 e 32 caracteres.'
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) fields.address = 'Informe um endereço Ethereum válido (0x seguido de 40 caracteres hexadecimais).'
  if (!input.networks?.length || input.networks.some((network) => !validNetworkIds.includes(network.id))) fields.networks = 'Selecione uma rede compatível.'
  if (input.walletType !== 'software' && input.walletType !== 'hardware') fields.walletType = 'Selecione um tipo de carteira.'
  if (profileName.length < 2 || profileName.length > 40) fields.profileName = 'Informe um nome de perfil entre 2 e 40 caracteres.'
  if (ensName && !/^[a-z0-9-]+\.eth$/.test(ensName)) fields.ensName = 'Informe um domínio .eth válido.'
  if (requireAll && !emailPattern.test(email)) fields.email = 'Informe um e-mail válido.'
  if (requireAll && !/^[a-z0-9-]{3,24}$/i.test(referralCode)) fields.referralCode = 'Informe um código de indicação válido.'
  return fields
}

export const walletHandlers = [
  http.get('/api/wallets', ({ request }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    if (readAccountScenario().walletListFailure) return error('TEMPORARY_FAILURE', 'Não foi possível carregar suas carteiras.', 503)
    return HttpResponse.json(getWalletsForUser(user.id))
  }),
  http.post('/api/wallets', async ({ request }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    const body = await request.json().catch(() => null) as Partial<Wallet> | null
    if (!body) return error('VALIDATION_ERROR', 'Confira os dados da carteira.', 422)
    const fields = validateWallet(body)
    if (Object.keys(fields).length) return error('VALIDATION_ERROR', 'Confira os campos destacados.', 422, fields)
    const scenario = readAccountScenario()
    if (scenario.walletCreateFailure) return error('TEMPORARY_FAILURE', 'Não foi possível cadastrar a carteira.', 503)
    const wallets = getWalletsForUser(user.id)
    const submittedAddress = body.address?.toLowerCase() ?? ''
    if (wallets.some((wallet) => wallet.address.toLowerCase() === submittedAddress)) return error('WALLET_EXISTS', 'Esta carteira já está cadastrada.', 409, { address: 'Esta carteira já está cadastrada.' })
    const primary = Boolean(body.isPrimary) || wallets.length === 0
    const wallet: Wallet = { ...body as Wallet, id: `wallet-${crypto.randomUUID()}`, networks: (body.networks ?? []).map((network) => ({ ...network })), isPrimary: primary }
    const next: Wallet[] = primary ? [...wallets.map((item) => ({ ...item, isPrimary: false })), wallet] : [...wallets, wallet]
    saveWalletsForUser(user.id, next)
    return HttpResponse.json(wallet, { status: 201 })
  }),
  http.patch('/api/wallets/:walletId', async ({ request, params }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return error('UNAUTHENTICATED', 'Entre novamente para continuar.', 401)
    const wallets = getWalletsForUser(user.id)
    const index = wallets.findIndex((wallet) => wallet.id === String(params.walletId))
    if (index < 0) return error('WALLET_NOT_FOUND', 'Carteira não encontrada.', 404)
    const body = await request.json().catch(() => null) as Partial<Wallet> | null
    if (!body) return error('VALIDATION_ERROR', 'Confira os dados da carteira.', 422)
    const fields = validateWallet({ ...wallets[index], ...body }, false)
    if (Object.keys(fields).length) return error('VALIDATION_ERROR', 'Confira os campos destacados.', 422, fields)
    if (readAccountScenario().walletUpdateFailure) return error('TEMPORARY_FAILURE', 'Não foi possível atualizar a carteira.', 503)
    const duplicate = wallets.some((wallet, current) => current !== index && wallet.address.toLowerCase() === (body.address ?? wallets[index].address).toLowerCase())
    if (duplicate) return error('WALLET_EXISTS', 'Esta carteira já está cadastrada.', 409, { address: 'Esta carteira já está cadastrada.' })
    const updated = { ...wallets[index], ...body, networks: (body.networks ?? wallets[index].networks).map((network) => ({ ...network })) }
    if (body.isPrimary) wallets.forEach((wallet) => { wallet.isPrimary = wallet.id === updated.id })
    else if (body.isPrimary === false && wallets[index].isPrimary) return error('PRIMARY_REQUIRED', 'Selecione outra carteira principal antes de alterar esta.', 409)
    wallets[index] = updated
    if (!wallets.some((wallet) => wallet.isPrimary) && wallets.length) wallets[0].isPrimary = true
    saveWalletsForUser(user.id, wallets)
    return HttpResponse.json(updated)
  }),
]
