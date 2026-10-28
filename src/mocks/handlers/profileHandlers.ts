import { http, HttpResponse } from 'msw'

import { hashMockPassword, getMockUserFromRequest, getMockUsers, saveMockUsers } from './authHandlers'
import type { CollectorProfile } from '../../features/profile/types/profile'
import { readAccountScenario, readProfile, saveProfile } from '../data/accountStore'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function authError() {
  return HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'Entre novamente para continuar.' }, { status: 401 })
}

export const profileHandlers = [
  http.get('/api/profile', ({ request }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return authError()
    if (readAccountScenario().profileReadFailure) return HttpResponse.json({ code: 'TEMPORARY_FAILURE', message: 'Não foi possível carregar seu perfil.' }, { status: 503 })
    return HttpResponse.json(readProfile(user))
  }),

  http.patch('/api/profile', async ({ request }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return authError()
    const body = await request.json().catch(() => null) as Partial<CollectorProfile> | null
    const fieldErrors: Record<string, string> = {}
    const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : ''
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const ensName = typeof body?.ensName === 'string' ? body.ensName.trim().toLowerCase() : ''
    const walletNickname = typeof body?.walletNickname === 'string' ? body.walletNickname.trim() : ''
    if (displayName.length < 2 || displayName.length > 64) fieldErrors.displayName = 'Use entre 2 e 64 caracteres.'
    if (!/^[a-z0-9_]{3,24}$/.test(username)) fieldErrors.username = 'Use 3 a 24 letras, números ou _.'
    if (!emailPattern.test(email)) fieldErrors.email = 'Informe um e-mail válido.'
    if (ensName && !/^[a-z0-9-]+\.eth$/.test(ensName)) fieldErrors.ensName = 'Informe um domínio .eth válido.'
    if (walletNickname.length < 2 || walletNickname.length > 32) fieldErrors.walletNickname = 'Use entre 2 e 32 caracteres.'
    if (Object.keys(fieldErrors).length) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Confira os campos destacados.', fieldErrors }, { status: 422 })
    if (readAccountScenario().profileUpdateFailure) return HttpResponse.json({ code: 'TEMPORARY_FAILURE', message: 'Não foi possível salvar o perfil. Suas alterações continuam no formulário.' }, { status: 503 })
    const users = getMockUsers()
    if (users.some((entry) => entry.id !== user.id && entry.email === email)) return HttpResponse.json({ code: 'EMAIL_EXISTS', message: 'Este e-mail já está associado a outra conta.', fieldErrors: { email: 'Este e-mail já está em uso.' } }, { status: 409 })
    if (users.some((entry) => entry.id !== user.id && readProfile(entry).username === username)) return HttpResponse.json({ code: 'USERNAME_TAKEN', message: 'Este nome de usuário já está em uso.', fieldErrors: { username: 'Este nome de usuário já está em uso.' } }, { status: 409 })
    const profile: CollectorProfile = { ...readProfile(user), displayName, username, email, ensName, walletNickname }
    saveProfile(profile)
    saveMockUsers(users.map((entry) => entry.id === user.id ? { ...entry, name: displayName, email } : entry))
    return HttpResponse.json(profile)
  }),

  http.post('/api/profile/avatar', async ({ request }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return authError()
    const body = await request.json().catch(() => null) as { avatarUrl?: unknown } | null
    const avatarUrl = typeof body?.avatarUrl === 'string' ? body.avatarUrl : ''
    if (avatarUrl && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarUrl) || avatarUrl.length > 1_500_000)) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Envie uma imagem PNG, JPEG ou WebP de até 1 MB.' }, { status: 422 })
    if (readAccountScenario().profileUpdateFailure) return HttpResponse.json({ code: 'TEMPORARY_FAILURE', message: 'Não foi possível atualizar o avatar.' }, { status: 503 })
    const profile = { ...readProfile(user), avatarUrl: avatarUrl || null }
    saveProfile(profile)
    return HttpResponse.json(profile)
  }),

  http.post('/api/profile/password', async ({ request }) => {
    const user = getMockUserFromRequest(request)
    if (!user) return authError()
    const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown } | null
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''
    const fieldErrors: Record<string, string> = {}
    if (!currentPassword) fieldErrors.currentPassword = 'Informe sua senha atual.'
    if (newPassword.length < 10 || !/\d/.test(newPassword)) fieldErrors.newPassword = 'Use ao menos 10 caracteres e inclua um número.'
    if (newPassword !== confirmPassword) fieldErrors.confirmPassword = 'As senhas não coincidem.'
    if (Object.keys(fieldErrors).length) return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Confira os campos destacados.', fieldErrors }, { status: 422 })
    if (readAccountScenario().passwordFailure) return HttpResponse.json({ code: 'TEMPORARY_FAILURE', message: 'Não foi possível alterar sua senha.' }, { status: 503 })
    if (await hashMockPassword(currentPassword, user.salt) !== user.passwordHash) return HttpResponse.json({ code: 'INVALID_CURRENT_PASSWORD', message: 'A senha atual está incorreta.', fieldErrors: { currentPassword: 'A senha atual está incorreta.' } }, { status: 422 })
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
    const passwordHash = await hashMockPassword(newPassword, salt)
    saveMockUsers(getMockUsers().map((entry) => entry.id === user.id ? { ...entry, salt, passwordHash } : entry))
    return HttpResponse.json({ message: 'Senha alterada com sucesso.' })
  }),
]
