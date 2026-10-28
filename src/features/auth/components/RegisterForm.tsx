import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useMutation } from '@tanstack/react-query'

import { Button } from '../../../components/ui/button'
import { registerUser } from '../api/authApi'
import type { AuthApiError, RegisterInput } from '../types/auth'
import { validateRegistration, type AuthFieldErrors } from '../validation'
import { AuthField } from './AuthField'

export function RegisterForm() {
  const [values, setValues] = useState<RegisterInput>({ name: '', email: '', password: '', confirmPassword: '' })
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [registered, setRegistered] = useState(false)
  const registration = useMutation({ mutationFn: registerUser })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateRegistration(values)
    setFieldErrors(errors)
    setApiError('')
    if (Object.keys(errors).length) return

    try {
      await registration.mutateAsync({ name: values.name.trim(), email: values.email.trim(), password: values.password })
      setRegistered(true)
    } catch (error) {
      const response = isAxiosError<AuthApiError>(error) ? error.response?.data : undefined
      setFieldErrors((current) => ({ ...current, ...response?.fieldErrors }))
      setApiError(response?.message ?? 'Não foi possível criar sua conta. Verifique sua conexão e tente novamente.')
    }
  }

  if (registered) return <div role="status" className="space-y-4 rounded-lg border border-[#D28A4C]/30 bg-[#140D0A] p-5 text-center">
    <h2 className="text-base font-bold text-[#F5F1EB]">Conta criada com sucesso</h2>
    <p className="text-xs leading-5 text-[#CFB28C]">Agora entre com o e-mail e a senha que você cadastrou.</p>
    <Link to="/login" search={{ registered: true }} className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#D28A4C] px-4 text-sm font-semibold text-[#140D0A] hover:bg-[#E89B55]">Ir para o login</Link>
  </div>

  return <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
    <AuthField label="Nome completo" name="name" type="text" autoComplete="name" required value={values.name} error={fieldErrors.name} onChange={(event) => { const name = event.currentTarget.value; setValues((current) => ({ ...current, name })) }} />
    <AuthField label="E-mail" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" value={values.email} error={fieldErrors.email} onChange={(event) => { const email = event.currentTarget.value; setValues((current) => ({ ...current, email })) }} />
    <AuthField label="Senha" name="password" type="password" autoComplete="new-password" required value={values.password} error={fieldErrors.password} onChange={(event) => { const password = event.currentTarget.value; setValues((current) => ({ ...current, password })) }} />
    <p className="-mt-2 text-[10px] leading-5 text-[#B39483]">Use ao menos 10 caracteres e inclua um número.</p>
    <AuthField label="Confirmar senha" name="confirmPassword" type="password" autoComplete="new-password" required value={values.confirmPassword} error={fieldErrors.confirmPassword} onChange={(event) => { const confirmPassword = event.currentTarget.value; setValues((current) => ({ ...current, confirmPassword })) }} />
    {apiError && <p role="alert" className="rounded-md border border-red-400/30 bg-red-950/30 p-3 text-xs leading-5 text-red-200">{apiError}</p>}
    <Button type="submit" size="lg" disabled={registration.isPending} className="w-full">{registration.isPending ? 'Criando conta…' : 'Criar conta'}</Button>
    <p className="text-center text-xs text-[#CFB28C]">Já tem uma conta? <Link to="/login" className="font-semibold text-[#E89B55] hover:underline">Entrar</Link></p>
  </form>
}
