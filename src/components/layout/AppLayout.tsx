import { Outlet } from '@tanstack/react-router'

import { Footer } from './Footer'
import { Header } from './Header'
import { MobileNavigation } from './MobileNavigation'
import { CartProvider } from '../../features/cart/CartProvider'
import { SessionExpiryHandler } from '../../features/auth/components/SessionExpiryHandler'

export function AppLayout() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#140D0A] text-[#F5F1EB]">
        <SessionExpiryHandler />
        <Header />
        <main className="mx-auto w-full max-w-[1200px] px-0 pb-0 pt-0 lg:px-6 lg:pb-16 lg:pt-8 xl:px-0">
          <Outlet />
        </main>
        <Footer />
        <MobileNavigation />
      </div>
    </CartProvider>
  )
}
