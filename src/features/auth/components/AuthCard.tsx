import type { ReactNode } from 'react'

import { Card } from '../../../components/ui/card'

export function AuthCard({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section className="mx-auto w-full max-w-md space-y-5" aria-labelledby="auth-title">
    <div className="space-y-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E89B55]">{eyebrow}</p>
      <h1 id="auth-title" className="text-2xl font-bold text-[#F5F1EB] sm:text-3xl">{title}</h1>
      <p className="text-xs leading-5 text-[#CFB28C]">{description}</p>
    </div>
    <Card className="space-y-5 border-[#55321F] p-5 sm:p-7">{children}</Card>
  </section>
}
