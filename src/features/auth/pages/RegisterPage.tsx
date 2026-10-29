import { Link } from '@tanstack/react-router'

import { AuthCard } from '../components/AuthCard'
import { RegisterForm } from '../components/RegisterForm'

export function RegisterPage() {
  return <AuthCard eyebrow="Faça parte da comunidade" title="Criar perfil de colecionador" description="Crie seu perfil de colecionador e conecte uma carteira quando quiser.">
    <RegisterForm />
    <div className="hidden text-center lg:block"><Link to="/" className="text-xs text-[#CFB28C] hover:text-[#E89B55]">Voltar ao catálogo</Link></div>
  </AuthCard>
}
