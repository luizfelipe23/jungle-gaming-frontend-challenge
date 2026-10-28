import { Home, LogOut, Search, ShoppingBag, UserRound } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useCart } from '../../features/cart/useCart'
import { useSession } from '../../features/auth/hooks/useSession'

export function MobileNavigation() {
  const { itemCount } = useCart()
  const { user, isLoading: sessionLoading, logout, isLoggingOut } = useSession()
  return (
    <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#55321F] bg-[#241612]/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(10,6,4,0.45)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-md items-center justify-around">
        <li><Link to="/" className="flex flex-col items-center gap-1 text-[9px] text-[#E89B55]"><Home aria-hidden="true" className="h-5 w-5" />Início</Link></li>
        <li><a href="#catalogo" className="flex flex-col items-center gap-1 text-[9px] text-[#CFB28C] transition hover:text-[#E89B55]"><Search aria-hidden="true" className="h-5 w-5" />Mercado</a></li>
        <li><Link to="/cart" aria-label={`Carrinho${itemCount ? `, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : ''}`} className="flex flex-col items-center gap-1 text-[9px] text-[#CFB28C] transition hover:text-[#E89B55]"><span className="relative"><ShoppingBag aria-hidden="true" className="h-5 w-5" />{itemCount > 0 && <span aria-hidden="true" className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#D28A4C] px-1 text-[8px] font-bold text-[#140D0A]">{itemCount}</span>}</span>Carrinho</Link></li>
        <li>{sessionLoading ? <span aria-label="Verificando sessão" className="flex h-9 w-14 animate-pulse rounded bg-[#3F2319]" /> : user ? <div className="flex items-center gap-2">
          <Link to="/profile" aria-label={`Conta de ${user.name}`} className="flex flex-col items-center gap-1 text-[9px] text-[#CFB28C] hover:text-[#E89B55]"><UserRound aria-hidden="true" className="h-5 w-5" />Conta</Link>
          <button type="button" disabled={isLoggingOut} onClick={() => void logout()} className="flex flex-col items-center gap-1 text-[9px] text-[#CFB28C] hover:text-[#E89B55] disabled:opacity-50"><LogOut aria-hidden="true" className="h-5 w-5" />Sair</button>
        </div> : <Link to="/login" className="flex flex-col items-center gap-1 text-[9px] text-[#CFB28C] hover:text-[#E89B55]"><UserRound aria-hidden="true" className="h-5 w-5" />Entrar</Link>}</li>
      </ul>
    </nav>
  )
}
