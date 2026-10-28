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
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:px-0 lg:pb-16">
          <Outlet />
        </main>
        <Footer />
        <MobileNavigation />
      </div>
    </CartProvider>
  )
}
