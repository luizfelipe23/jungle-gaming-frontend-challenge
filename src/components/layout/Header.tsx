import { Search, ShoppingBag } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useCart } from '../../features/cart/useCart'
import { useSession } from '../../features/auth/hooks/useSession'

export function Header() {
  const { itemCount } = useCart()
  const { user, isLoading: sessionLoading, logout, isLoggingOut } = useSession()
  return (
    <header className="sticky top-0 z-40 border-b border-[#D28A4C]/30 bg-[#140D0A]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[84px] lg:px-0">
        <Link to="/" className="shrink-0 text-lg font-bold tracking-[0.12em] text-[#F5F1EB]" aria-label="KURIO — início">
          KURIO<span className="text-[#D28A4C]">.</span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-8 lg:flex">
          <a href="#inicio" className="border-b-2 border-[#D28A4C] py-7 text-sm font-bold text-[#E89B55]">Início</a>
          <a href="#catalogo" className="py-7 text-sm text-[#F5F1EB] transition hover:text-[#E89B55]">Mercado</a>
          <a href="#colecoes" className="py-7 text-sm text-[#F5F1EB] transition hover:text-[#E89B55]">Coleções</a>
          <a href="#rodape" className="py-7 text-sm text-[#F5F1EB] transition hover:text-[#E89B55]">Sobre</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <a href="#catalog-search" aria-label="Buscar NFTs" className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#F5F1EB] transition hover:bg-[#241612] hover:text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]">
            <Search aria-hidden="true" className="h-5 w-5" />
          </a>
          <Link to="/cart" aria-label={`Abrir carrinho${itemCount ? `, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : ''}`} className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-[#F5F1EB] transition hover:bg-[#241612] hover:text-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55]">
            <ShoppingBag aria-hidden="true" className="h-5 w-5" />
            {itemCount > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D28A4C] px-1 text-[9px] font-bold text-[#140D0A]">{itemCount}</span>}
          </Link>
          {sessionLoading ? <span aria-label="Verificando sessão" className="hidden h-8 w-16 animate-pulse rounded bg-[#241612] sm:block" /> : user ? <div className="hidden items-center gap-3 sm:flex">
            <Link to="/profile" className="max-w-28 truncate text-xs text-[#CFB28C] hover:text-[#E89B55]">{user.name}</Link>
            <button type="button" disabled={isLoggingOut} onClick={() => void logout()} className="text-xs font-semibold text-[#E89B55] hover:text-[#F5F1EB] disabled:opacity-50">{isLoggingOut ? 'Saindo…' : 'Sair'}</button>
          </div> : <div className="hidden items-center gap-2 sm:flex">
            <Link to="/login" className="inline-flex min-h-9 items-center justify-center rounded-md bg-[#D28A4C] px-4 text-xs font-semibold text-[#140D0A] transition hover:bg-[#E89B55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1EB]">Entrar</Link>
            <Link to="/register" className="hidden min-h-9 items-center justify-center rounded-md border border-[#55321F] px-3 text-xs text-[#CFB28C] transition hover:border-[#D28A4C] hover:text-[#F5F1EB] lg:inline-flex">Criar conta</Link>
          </div>}
        </div>
      </div>
    </header>
  )
}
