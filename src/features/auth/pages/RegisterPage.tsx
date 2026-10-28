import { Link } from '@tanstack/react-router'

import { AuthCard } from '../components/AuthCard'
import { RegisterForm } from '../components/RegisterForm'

export function RegisterPage() {
  return <AuthCard eyebrow="Faça parte da comunidade" title="Criar sua conta" description="Cadastre-se para acompanhar suas obras e acessar sua conta.">
    <RegisterForm />
    <div className="text-center"><Link to="/" className="text-xs text-[#CFB28C] hover:text-[#E89B55]">Voltar ao catálogo</Link></div>
  </AuthCard>
}
