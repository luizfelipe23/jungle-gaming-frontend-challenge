import { beforeEach, describe, expect, it } from 'vitest'

import { changePassword, getProfile, updateProfile } from '../../src/features/profile/api/profileApi'
import { addFavorite, getFavoriteNftIds, removeFavorite } from '../../src/features/catalog/api/favoritesApi'
import { createManagedWallet, getManagedWallets, updateManagedWallet } from '../../src/features/checkout/api/walletApi'
import { loginUser } from '../../src/features/auth/api/authApi'
import { accountScenarioKey } from '../../src/mocks/data/accountStore'

beforeEach(() => localStorage.clear())

async function loginLuna() { return loginUser({ email: 'luna@demo.kurio', password: 'Luna@Kurio2026!' }) }

describe('Perfil, carteiras e favoritos', () => {
  it('persiste perfil e atualiza os dados de sessão usados pela autenticação', async () => {
    const user = await loginLuna()
    const before = await getProfile()
    const updated = await updateProfile({ ...before, displayName: 'Luna Colecionadora', username: 'luna_coleciona', email: before.email, ensName: 'luna.eth', walletNickname: 'Minha Vault' })
    expect(updated.displayName).toBe('Luna Colecionadora')
    expect((await getProfile()).walletNickname).toBe('Minha Vault')
    expect((await loginUser({ email: updated.email, password: 'Luna@Kurio2026!' })).id).toBe(user.id)
  })

  it('preserva a senha anterior quando a senha atual informada está errada', async () => {
    await loginLuna()
    await expect(changePassword({ currentPassword: 'senha incorreta', newPassword: 'OutraSenha2026', confirmPassword: 'OutraSenha2026' })).rejects.toMatchObject({ response: { status: 422, data: { code: 'INVALID_CURRENT_PASSWORD' } } })
    await expect(loginUser({ email: 'luna@demo.kurio', password: 'Luna@Kurio2026!' })).resolves.toMatchObject({ id: 'user-luna-001' })
  })

  it('cadastra, atualiza e elege exatamente uma carteira principal', async () => {
    await loginLuna()
    const original = await getManagedWallets()
    expect(original.filter((wallet) => wallet.isPrimary)).toHaveLength(1)
    const created = await createManagedWallet({ name: 'Kurio Hardware', nickname: 'Vault', address: `0x${'1'.repeat(40)}`, networks: [{ id: 'ethereum', name: 'Ethereum', currency: 'ETH' }], walletType: 'hardware', profileName: 'Luna Vault', ensName: 'luna.eth', email: 'luna@demo.kurio', referralCode: 'KURIO42', isPrimary: false })
    await updateManagedWallet(created.id, { isPrimary: true, nickname: 'Vault Principal' })
    const saved = await getManagedWallets()
    expect(saved.find((wallet) => wallet.id === created.id)).toMatchObject({ isPrimary: true, nickname: 'Vault Principal' })
    expect(saved.filter((wallet) => wallet.isPrimary)).toHaveLength(1)
  })

  it('isola carteiras e favoritos entre contas', async () => {
    await loginLuna()
    const lunaWallets = await getManagedWallets()
    await addFavorite('nft-001')
    await loginUser({ email: 'rafael@demo.kurio', password: 'Rafael@Kurio2026!' })
    expect(await getManagedWallets()).not.toEqual(lunaWallets)
    expect(await getFavoriteNftIds()).toEqual([])
    await addFavorite('nft-002')
    expect(await getFavoriteNftIds()).toEqual(['nft-002'])
  })

  it('adiciona e remove favorito pela API mockada', async () => {
    await loginLuna()
    expect(await addFavorite('nft-001')).toContain('nft-001')
    expect(await getFavoriteNftIds()).toContain('nft-001')
    expect(await removeFavorite('nft-001')).not.toContain('nft-001')
  })

  it('retorna falha simulada de atualização sem confirmar a operação', async () => {
    await loginLuna()
    localStorage.setItem(accountScenarioKey, JSON.stringify({ profileUpdateFailure: true }))
    await expect(updateProfile({ ...(await getProfile()), displayName: 'Não salvo' })).rejects.toMatchObject({ response: { status: 503 } })
    expect((await getProfile()).displayName).toBe('Luna Alves')
  })
})
