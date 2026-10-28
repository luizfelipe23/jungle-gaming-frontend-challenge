import { useRef, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { Camera, Eye, EyeOff, UserRound, WalletCards } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { useSession } from '../../auth/hooks/useSession'
import { useChangePassword, useProfile, useUpdateProfile, useUploadAvatar } from '../hooks/useProfile'
import type { ProfileApiError, UpdateProfileInput } from '../types/profile'

const emptyDraft: UpdateProfileInput = { displayName: '', username: '', email: '', ensName: '', walletNickname: '' }

function errorMessage(error: unknown) {
  return isAxiosError<ProfileApiError>(error) ? error.response?.data.message ?? 'Não foi possível concluir a operação.' : 'Falha de comunicação. Tente novamente.'
}

export function ProfilePage() {
  const { user } = useSession()
  const profileQuery = useProfile(user!.id)
  const saveMutation = useUpdateProfile(user!.id)
  const avatarMutation = useUploadAvatar(user!.id)
  const passwordMutation = useChangePassword()
  const fileRef = useRef<HTMLInputElement>(null)
  const [draftState, setDraftState] = useState<UpdateProfileInput | null>(null)
  const persistedDraft = profileQuery.data ? { displayName: profileQuery.data.displayName, username: profileQuery.data.username, email: profileQuery.data.email, ensName: profileQuery.data.ensName, walletNickname: profileQuery.data.walletNickname } : emptyDraft
  const draft = draftState ?? persistedDraft
  function setDraft(update: UpdateProfileInput | ((current: UpdateProfileInput) => UpdateProfileInput)) {
    setDraftState((current) => typeof update === 'function' ? update(current ?? persistedDraft) : update)
  }
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPasswords, setShowPasswords] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UpdateProfileInput, string>>>({})
  const passwordAlertMessage = passwordError || (passwordMutation.isError ? errorMessage(passwordMutation.error) : '')

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileNotice('')
    const errors: typeof fieldErrors = {}
    if (draft.displayName.trim().length < 2) errors.displayName = 'Informe seu nome de exibição.'
    if (!/^[a-z0-9_]{3,24}$/i.test(draft.username.trim())) errors.username = 'Use 3 a 24 letras, números ou _.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Informe um e-mail válido.'
    if (draft.ensName && !/^[a-z0-9-]+\.eth$/i.test(draft.ensName.trim())) errors.ensName = 'Informe um domínio .eth válido.'
    if (draft.walletNickname.trim().length < 2) errors.walletNickname = 'Informe o apelido da carteira.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    saveMutation.mutate({ ...draft, displayName: draft.displayName.trim(), username: draft.username.trim(), email: draft.email.trim(), ensName: draft.ensName.trim(), walletNickname: draft.walletNickname.trim() }, {
      onSuccess: (profile) => { setDraft({ displayName: profile.displayName, username: profile.username, email: profile.email, ensName: profile.ensName, walletNickname: profile.walletNickname }); setProfileNotice('Perfil salvo com sucesso.') },
      onError: (error) => {
        if (isAxiosError<ProfileApiError>(error) && error.response?.data.fieldErrors) {
          setFieldErrors(error.response.data.fieldErrors as typeof fieldErrors)
        }
      },
    })
  }

  function handleAvatar(file?: File) {
    setAvatarError('')
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1_000_000) { setAvatarError('Escolha uma imagem PNG, JPEG ou WebP de até 1 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') avatarMutation.mutate(reader.result, { onError: (error) => setAvatarError(errorMessage(error)) }) }
    reader.onerror = () => setAvatarError('Não foi possível ler esta imagem.')
    reader.readAsDataURL(file)
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordNotice('')
    setPasswordError('')
    if (!passwords.currentPassword || passwords.newPassword.length < 10 || !/\d/.test(passwords.newPassword) || passwords.newPassword !== passwords.confirmPassword) { setPasswordError('Confira a senha atual, use 10 caracteres e um número e confirme a nova senha.'); return }
    passwordMutation.mutate(passwords, { onSuccess: (response) => { setPasswordNotice(response.message); setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }) }, onError: (error) => setPasswordError(errorMessage(error)) })
  }

  if (profileQuery.isPending) return <Card role="status" aria-label="Carregando perfil" className="h-96 animate-pulse border-[#55321F]" />
  if (profileQuery.isError || !profileQuery.data) return <Card className="mx-auto max-w-3xl space-y-4 border-[#55321F] p-8"><h1 className="text-xl font-bold">Não foi possível carregar o perfil</h1><p role="alert" className="text-sm text-[#CFB28C]">{errorMessage(profileQuery.error)}</p><Button type="button" onClick={() => void profileQuery.refetch()}>Tentar novamente</Button></Card>
  const profile = profileQuery.data

  return <div className="mx-auto grid max-w-[1080px] gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7">
    <aside className="h-fit rounded-xl border border-[#3F2319] bg-[#241612] p-4 sm:p-5">
      <h1 className="px-2 text-lg font-bold">Meu perfil</h1>
      <nav aria-label="Seções da conta" className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
        <a href="#dados" className="flex min-h-11 items-center gap-3 border-l-2 border-[#D28A4C] px-3 text-sm text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]"><UserRound aria-hidden="true" className="h-4 w-4" />Dados do perfil</a>
        <Link to="/wallets" className="flex min-h-11 items-center gap-3 px-3 text-sm text-[#CFB28C] hover:text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]"><WalletCards aria-hidden="true" className="h-4 w-4" />Carteiras</Link>
      </nav>
      <div className="mt-4 hidden border-t border-[#55321F] pt-4 text-xs text-[#CFB28C] lg:block"><p>Conta</p><p className="mt-2 truncate text-[#F5F1EB]">{profile.email}</p></div>
    </aside>

    <div className="min-w-0 space-y-6">
      <Card id="dados" className="space-y-6 border-[#55321F] p-5 sm:p-7">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E89B55]">Conta</p><h2 className="mt-2 text-xl font-bold">Perfil do colecionador</h2><p className="mt-1 text-xs text-[#CFB28C]">Atualize suas informações pessoais e de exibição.</p></div>
        <div className="flex flex-wrap items-center gap-4 border-b border-[#3F2319] pb-5">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#55321F] bg-[#140D0A] text-[#E89B55]">{profile.avatarUrl ? <img src={profile.avatarUrl} alt={`Avatar de ${profile.displayName}`} className="h-full w-full object-cover" /> : <UserRound aria-hidden="true" className="h-7 w-7" />}</div>
          <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => fileRef.current?.click()} disabled={avatarMutation.isPending} className="gap-2"><Camera aria-hidden="true" className="h-4 w-4" />{avatarMutation.isPending ? 'Enviando…' : 'Alterar avatar'}</Button>{profile.avatarUrl && <Button type="button" variant="ghost" onClick={() => avatarMutation.mutate('', { onError: (error) => setAvatarError(errorMessage(error)) })}>Remover</Button>}<input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Selecionar avatar" onChange={(event) => handleAvatar(event.currentTarget.files?.[0])} /></div>
          {avatarError && <p role="alert" className="w-full text-xs text-red-200">{avatarError}</p>}
        </div>
        <form onSubmit={submitProfile} noValidate className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {([['displayName', 'Nome de exibição'], ['username', 'Nome de usuário'], ['email', 'E-mail'], ['ensName', 'Nome ENS'], ['walletNickname', 'Apelido da carteira']] as const).map(([key, label]) => <label key={key} className="block space-y-2 text-xs text-[#F5F1EB]">{label}{key !== 'ensName' && <span className="text-[#E89B55]"> *</span>}<Input aria-invalid={Boolean(fieldErrors[key])} value={draft[key]} onChange={(event) => { const value = event.currentTarget.value; setFieldErrors((current) => ({ ...current, [key]: undefined })); setDraft((current) => ({ ...current, [key]: value })) }} placeholder={key === 'ensName' ? 'nome.eth' : ''} />{fieldErrors[key] && <span className="block text-[11px] text-red-200">{fieldErrors[key]}</span>}</label>)}
          </div>
          {saveMutation.isError && <p role="alert" className="text-xs text-red-200">{errorMessage(saveMutation.error)}</p>}{profileNotice && <p role="status" className="text-xs text-emerald-200">{profileNotice}</p>}
          <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando…' : 'Salvar perfil'}</Button>
        </form>
      </Card>

      <Card className="space-y-5 border-[#55321F] p-5 sm:p-7">
        <div><h2 className="text-lg font-bold">Alterar senha</h2><p className="mt-1 text-xs text-[#CFB28C]">Use ao menos 10 caracteres e inclua um número.</p></div>
        <form onSubmit={submitPassword} noValidate className="max-w-xl space-y-4">
          {([['currentPassword', 'Senha atual'], ['newPassword', 'Nova senha'], ['confirmPassword', 'Confirmar nova senha']] as const).map(([key, label]) => {
            const fieldId = `password-${key}`
            return <div key={key} className="block space-y-2 text-xs text-[#F5F1EB]">
              <label htmlFor={fieldId} className="block text-xs text-[#F5F1EB]">{label}</label>
              <div className="relative">
                <Input
                  id={fieldId}
                  name={key}
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
                  value={passwords[key]}
                  onChange={(event) => { const v = event.currentTarget.value; setPasswords((current) => ({ ...current, [key]: v })) }}
                  className="pr-12"
                  aria-label={label}
                  aria-invalid={Boolean(passwordError && key === 'newPassword')}
                />
                <button
                  type="button"
                  aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
                  onClick={() => setShowPasswords((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#CFB28C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]"
                >
                  {showPasswords ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
            </div>
          })}
          {passwordAlertMessage && <p role="alert" className="text-xs text-red-200">{passwordAlertMessage}</p>}
          {passwordNotice && <p role="status" className="text-xs text-emerald-200">{passwordNotice}</p>}
          <Button type="submit" disabled={passwordMutation.isPending}>{passwordMutation.isPending ? 'Atualizando…' : 'Alterar senha'}</Button>
        </form>
        <p className="border-t border-[#3F2319] pt-4 text-[11px] leading-5 text-[#B39483]">Esta autenticação é simulada no navegador e não deve ser usada como mecanismo de segurança em produção.</p>
      </Card>
    </div>
  </div>
}
