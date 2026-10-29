import { Heart, Home, ScanLine, ShoppingBag, UserRound } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useCart } from '../../features/cart/useCart'
import { useSession } from '../../features/auth/hooks/useSession'

export function MobileNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { itemCount } = useCart()
  const { user } = useSession()
  if (pathname !== '/') return null

  return <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-40 h-[94px] rounded-t-[32px] border-t border-[#3F2319] bg-[#241612] px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-7 lg:hidden">
    <ul className="mx-auto flex h-full max-w-[360px] items-center justify-between">
      <li><Link to="/" aria-label="Início" className="text-[#E89B55]"><Home aria-hidden="true" className="h-5 w-5 fill-current" /></Link></li>
      <li><Link to="/profile" hash="interesses" aria-label="Lista de interesse" className="text-[#CFB28C]"><Heart aria-hidden="true" className="h-5 w-5 fill-current" /></Link></li>
      <li><Link to="/" hash="catalogo" aria-label="Explorar" className="-mt-8 flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#140D0A] bg-[#D28A4C] text-[#F5F1EB] shadow-lg"><ScanLine aria-hidden="true" className="h-6 w-6" /></Link></li>
      <li><Link to="/cart" aria-label={`Carrinho${itemCount ? `, ${itemCount} itens` : ''}`} className="relative text-[#CFB28C]"><ShoppingBag aria-hidden="true" className="h-5 w-5 fill-current" />{itemCount > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-[#D28A4C] px-1 text-[9px] text-[#140D0A]">{itemCount}</span>}</Link></li>
      <li><Link to={user ? '/profile' : '/login'} aria-label={user ? `Perfil de ${user.name}` : 'Entrar'} className="text-[#CFB28C]"><UserRound aria-hidden="true" className="h-5 w-5 fill-current" /></Link></li>
    </ul>
  </nav>
}
