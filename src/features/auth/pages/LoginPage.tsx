import { useRouter, useSearch } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

import { AuthCard } from '../components/AuthCard'
import { LoginForm } from '../components/LoginForm'
import { useSession } from '../hooks/useSession'
import { safeReturnTo } from '../validation'

export function LoginPage() {
  const router = useRouter()
  const search = useSearch({ from: '/app/login' })
  const { user, isLoading, logout } = useSession()
  const returnTo = safeReturnTo(search.returnTo)

  function continueAfterLogin() {
    void router.navigate({ to: returnTo as never, replace: true })
  }

  return <AuthCard eyebrow="Acesse sua conta" title="Bem-vindo de volta" description="Entre para continuar explorando e gerenciando suas obras.">
    {search.registered && <p role="status" className="rounded-md border border-[#D28A4C]/30 bg-[#140D0A] p-3 text-xs text-[#CFB28C]">Cadastro concluído. Você já pode entrar.</p>}
    {search.sessionError && <p role="alert" className="rounded-md border border-amber-400/30 bg-amber-950/20 p-3 text-xs leading-5 text-amber-100">Não foi possível validar sua sessão anterior. Entre novamente para continuar com segurança.</p>}
    {user ? <div className="space-y-4 text-center">
      <p className="text-sm text-[#F5F1EB]">Você já está conectado como <strong>{user.name}</strong>.</p>
      <button type="button" onClick={continueAfterLogin} className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[#D28A4C] px-4 text-sm font-semibold text-[#140D0A] hover:bg-[#E89B55]">Continuar</button>
      <button type="button" onClick={() => void logout()} className="text-xs text-[#CFB28C] hover:text-[#E89B55]">Encerrar sessão</button>
    </div> : <>
      {isLoading && <p role="status" className="text-center text-[10px] text-[#B39483]">Verificando sessão…</p>}
      <LoginForm onSuccess={continueAfterLogin} />
      <p className="text-center text-[10px] text-[#8F7162]">Ao entrar, você concorda com os termos de uso da plataforma.</p>
    </>}
    <div className="text-center"><Link to="/" className="text-xs text-[#CFB28C] hover:text-[#E89B55]">Voltar ao catálogo</Link></div>
  </AuthCard>
}
