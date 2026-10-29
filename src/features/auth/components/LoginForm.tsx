import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'

import { Button } from '../../../components/ui/button'
import { useLogin } from '../hooks/useSession'
import type { AuthApiError, AuthUser, LoginInput } from '../types/auth'
import { validateLogin, type AuthFieldErrors } from '../validation'
import { AuthField } from './AuthField'

export function LoginForm({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [values, setValues] = useState<LoginInput>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [apiError, setApiError] = useState('')
  const login = useLogin()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateLogin(values)
    setFieldErrors(errors)
    setApiError('')
    if (Object.keys(errors).length) return

    try {
      const user = await login.mutateAsync({ email: values.email.trim(), password: values.password })
      onSuccess(user)
    } catch (error) {
      const response = isAxiosError<AuthApiError>(error) ? error.response?.data : undefined
      setFieldErrors((current) => ({ ...current, ...response?.fieldErrors }))
      setApiError(response?.message ?? 'Não foi possível entrar. Verifique sua conexão e tente novamente.')
    }
  }

  return <form onSubmit={(event) => void submit(event)} noValidate className="space-y-3 lg:space-y-5">
    <AuthField
      label="E-mail"
      name="email"
      type="email"
      autoComplete="email"
      placeholder="contato@email.com"
      required
      value={values.email}
      error={fieldErrors.email}
      onChange={(event) => {
        const email = event.currentTarget.value
        setValues((current) => ({ ...current, email }))
      }}
    />
    <AuthField
      label="Senha"
      name="password"
      type="password"
      autoComplete="current-password"
      required
      placeholder="Senha"
      value={values.password}
      error={fieldErrors.password}
      onChange={(event) => {
        const password = event.currentTarget.value
        setValues((current) => ({ ...current, password }))
      }}
    />
    <p className="-mt-1 text-right text-sm text-[#E89B55] lg:text-xs"><a href="#redefinir-senha">Esqueceu a senha?</a></p>

    {apiError && <p role="alert" className="rounded-md border border-red-400/30 bg-red-950/30 p-3 text-xs leading-5 text-red-200">{apiError}</p>}
    <div className="pt-6 lg:pt-0"><Button type="submit" size="lg" disabled={login.isPending} className="h-[60px] w-full rounded-[10px] text-base font-bold lg:h-11 lg:rounded-md">
      {login.isPending ? 'Entrando…' : 'Entrar'}
    </Button></div>
    <p className="hidden text-center text-xs text-[#CFB28C] lg:block">Ainda não tem uma conta? <Link to="/register" className="font-semibold text-[#E89B55] hover:underline">Cadastre-se</Link></p>
  </form>
}
