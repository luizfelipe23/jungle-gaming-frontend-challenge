import { Home, Search, ShoppingBag } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function MobileNavigation() {
  return (
    <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#55321F] bg-[#241612]/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(10,6,4,0.45)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-md items-center justify-around">
        <li><Link to="/" className="flex flex-col items-center gap-1 text-[9px] text-[#E89B55]"><Home aria-hidden="true" className="h-5 w-5" />Início</Link></li>
        <li><a href="#catalogo" className="flex flex-col items-center gap-1 text-[9px] text-[#CFB28C] transition hover:text-[#E89B55]"><Search aria-hidden="true" className="h-5 w-5" />Mercado</a></li>
        <li><Link to="/cart" className="flex flex-col items-center gap-1 text-[9px] text-[#CFB28C] transition hover:text-[#E89B55]"><ShoppingBag aria-hidden="true" className="h-5 w-5" />Carrinho</Link></li>
      </ul>
    </nav>
  )
}
