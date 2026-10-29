import { Activity, AlertTriangle, BadgePercent, Heart, LogOut, UserRound, WalletCards, Download } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { useSession } from '../../features/auth/hooks/useSession'

const accountItems = [
  { label: 'Dados do perfil', icon: UserRound, href: '/profile', key: 'profile' },
  { label: 'Carteiras', icon: WalletCards, href: '/wallets', key: 'wallets' },
  { label: 'Atividade', icon: Activity, href: '/profile#atividade', key: 'activity' },
  { label: 'Lista de interesse', icon: Heart, href: '/profile#interesses', key: 'favorites' },
  { label: 'Ofertas', icon: BadgePercent, href: '/profile#ofertas', key: 'offers' },
  { label: 'Arquivos baixados', icon: Download, href: '/profile#downloads', key: 'downloads' },
  { label: 'Suporte', icon: AlertTriangle, href: '/profile#suporte', key: 'support' },
]

export function AccountSidebar({ active }: { active: 'profile' | 'wallets' }) {
  const { logout, isLoggingOut } = useSession()

  return <aside className="hidden h-fit min-h-[407px] w-[310px] bg-[#241612] p-0 lg:block">
    <h1 className="px-3 pb-2 pt-4 text-[17px] font-bold text-[#F5F1EB]">Meu perfil</h1>
    <nav aria-label="Navegação do perfil" className="flex flex-col">
      {accountItems.map(({ label, icon: Icon, href, key }) => <Link key={key} to={href as never} className={`flex h-[45px] items-center gap-3 border-l-[6px] px-2.5 text-[15px] ${active === key ? 'border-[#D28A4C] text-[#E89B55]' : 'border-transparent text-[#E89B55] hover:bg-[#2B1913]'}`}>
        <Icon aria-hidden="true" className="h-[18px] w-[18px] text-[#CFB28C]" />{label}
      </Link>)}
      <button type="button" onClick={() => void logout()} disabled={isLoggingOut} className="flex h-[49px] items-center gap-3 border-t border-[#55321F] px-3 text-left text-[15px] font-bold text-[#E89B55] hover:bg-[#2B1913]">
        <LogOut aria-hidden="true" className="h-[18px] w-[18px]" />Sair
      </button>
    </nav>
  </aside>
}
